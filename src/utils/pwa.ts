import { useState, useEffect } from 'react';
import { hapticTap, hapticSuccess } from './haptics';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  isStandalone: boolean;
  isInstalled: boolean;
  canInstallAndroid: boolean;
  isApple: boolean;
  isIosSafari: boolean;
  isInAppBrowser: boolean;
  isInstallGuideOpen: boolean;
}

const STORAGE_KEY_INSTALLED = 'shift_assist_pwa_installed';

// Detect whether running in standalone / PWA mode
export function isAppStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;

  const isIosStandalone = Boolean(
    (window.navigator as unknown as { standalone?: boolean }).standalone
  );

  const isTwa =
    typeof document !== 'undefined' &&
    document.referrer.startsWith('android-app://');

  return isStandaloneMedia || isIosStandalone || isTwa;
}

// Detect Apple devices (iPhone, iPad, iPod, iPadOS)
export function isAppleDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const platform = window.navigator.platform || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

// Detect In-App browsers (Instagram, WhatsApp, Telegram, Facebook, etc.)
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line|Twitter|Telegram|WhatsApp|BytedanceWebview|musical_ly|Snapchat|MicroMessenger/i.test(
    ua
  );
}

// Detect whether on iOS Safari specifically (the only iOS browser that natively supports PWA Home Screen install with full offline/standalone)
export function isIosSafari(): boolean {
  if (!isAppleDevice()) return false;
  const ua = window.navigator.userAgent || '';
  const isWebkit = /WebKit/i.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);
  return isWebkit && !isOtherBrowser && !isInAppBrowser();
}

// Check if localStorage says installed, verified against standalone
function getInitialInstalled(): boolean {
  if (isAppStandalone()) return true;
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

let currentState: PwaState = {
  isStandalone: isAppStandalone(),
  isInstalled: getInitialInstalled(),
  canInstallAndroid: false,
  isApple: isAppleDevice(),
  isIosSafari: isIosSafari(),
  isInAppBrowser: isInAppBrowser(),
  isInstallGuideOpen: false,
};

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function updateState(partial: Partial<PwaState>) {
  currentState = { ...currentState, ...partial };
  notifyListeners();
}

// Initialize listeners once
let isInitialized = false;

export function initPwaListeners() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Re-check initial state
  const standalone = isAppStandalone();
  const installed = standalone || getInitialInstalled();

  updateState({
    isStandalone: standalone,
    isInstalled: installed,
    isApple: isAppleDevice(),
    isIosSafari: isIosSafari(),
    isInAppBrowser: isInAppBrowser(),
  });

  // Check getInstalledRelatedApps in supported Chromium browsers
  if ('getInstalledRelatedApps' in navigator) {
    try {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((apps: unknown[]) => {
          if (Array.isArray(apps) && apps.length > 0) {
            updateState({ isInstalled: true });
            try {
              localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
            } catch {}
          }
        })
        .catch(() => {});
    } catch {}
  }

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    // If beforeinstallprompt fires, the browser offers install, so it's not currently installed
    if (!isAppStandalone()) {
      try {
        localStorage.removeItem(STORAGE_KEY_INSTALLED);
      } catch {}
      updateState({ canInstallAndroid: true, isInstalled: false });
    } else {
      updateState({ canInstallAndroid: true });
    }
  });

  // Listen for appinstalled
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    try {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
    } catch {}
    updateState({
      isInstalled: true,
      isStandalone: true,
      canInstallAndroid: false,
    });
    hapticSuccess();
  });

  // Listen for standalone display-mode changes
  try {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', (e) => {
      const isStandaloneNow = e.matches;
      if (isStandaloneNow) {
        try {
          localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
        } catch {}
      }
      updateState({
        isStandalone: isStandaloneNow,
        isInstalled: isStandaloneNow || currentState.isInstalled,
      });
    });
  } catch {}
}

// Public API helpers
export function openPwaInstallGuide() {
  hapticTap();
  updateState({ isInstallGuideOpen: true });
}

export function closePwaInstallGuide() {
  updateState({ isInstallGuideOpen: false });
}

export async function promptPwaInstall(): Promise<boolean> {
  if (deferredPrompt) {
    hapticTap();
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      hapticSuccess();
      try {
        localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      } catch {}
      deferredPrompt = null;
      updateState({
        canInstallAndroid: false,
        isInstalled: true,
      });
      return true;
    }
    return false;
  } else {
    // If cannot prompt natively, open visual guide
    openPwaInstallGuide();
    return false;
  }
}

export function getPwaState(): PwaState {
  return currentState;
}

// React Hook
export function usePwa() {
  const [state, setState] = useState<PwaState>(currentState);

  useEffect(() => {
    initPwaListeners();
    setState(currentState);

    const handleChange = () => setState(currentState);
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return {
    ...state,
    openGuide: openPwaInstallGuide,
    closeGuide: closePwaInstallGuide,
    promptInstall: promptPwaInstall,
  };
}
