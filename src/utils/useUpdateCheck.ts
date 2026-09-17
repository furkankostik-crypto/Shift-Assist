import { useState, useEffect, useCallback } from 'react';
import {
  APP_VERSION,
  STORAGE_KEY_LAST_CHECK,
  compareVersions,
  fetchRemoteVersion,
  triggerServiceWorkerUpdate,
  forceAppReload,
  CURRENT_RELEASE_HIGHLIGHTS,
} from './version';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'offline'
  | 'error';

export interface UpdateCheckResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  lastCheckedTime: number | null;
  newFeatures: string[];
  errorMessage: string | null;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  applyUpdate: () => Promise<void>;
}

// Global update listeners so all components stay in sync
type Listener = () => void;
const listeners = new Set<Listener>();

let globalStatus: UpdateStatus = 'idle';
let globalLatestVersion: string = APP_VERSION;
let globalNewFeatures: string[] = CURRENT_RELEASE_HIGHLIGHTS;
let globalErrorMessage: string | null = null;
let globalLastCheckedTime: number | null = (() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_CHECK);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  }
  return null;
})();

function notify() {
  listeners.forEach((l) => l());
}

export function notifyUpdateAvailable(newVersion?: string) {
  globalStatus = 'update-available';
  if (newVersion) {
    globalLatestVersion = newVersion;
  }
  notify();
}

export function useUpdateCheck(): UpdateCheckResult {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const checkForUpdates = useCallback(async (manual: boolean = true) => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      globalStatus = 'offline';
      globalErrorMessage = 'İnternet bağlantısı yok. Güncellemeler denetlenemedi.';
      notify();
      return;
    }

    globalStatus = 'checking';
    globalErrorMessage = null;
    notify();

    // Minimum delay for better UI perception if manually triggered
    const delayPromise = manual ? new Promise((r) => setTimeout(r, 650)) : Promise.resolve();

    try {
      // 1. Check Service Worker for updates
      const swHasUpdate = await triggerServiceWorkerUpdate();

      // 2. Fetch remote version.json
      const remoteInfo = await fetchRemoteVersion();

      await delayPromise;

      const now = Date.now();
      globalLastCheckedTime = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_CHECK, String(now));
      } catch {}

      let isNewerAvailable = false;
      let targetVersion = APP_VERSION;

      if (remoteInfo?.version) {
        targetVersion = remoteInfo.version;
        if (compareVersions(remoteInfo.version, APP_VERSION) > 0) {
          isNewerAvailable = true;
          if (remoteInfo.features && remoteInfo.features.length > 0) {
            globalNewFeatures = remoteInfo.features;
          }
        }
      }

      if (swHasUpdate) {
        isNewerAvailable = true;
      }

      globalLatestVersion = targetVersion;

      if (isNewerAvailable) {
        globalStatus = 'update-available';
      } else {
        globalStatus = 'up-to-date';
      }
    } catch (err: any) {
      console.error('[useUpdateCheck] Error checking for updates:', err);
      globalStatus = 'error';
      globalErrorMessage = err?.message || 'Güncellemeler denetlenirken bir sorun oluştu.';
    } finally {
      notify();
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    await forceAppReload();
  }, []);

  // Listen for SW waiting/installed messages if virtual:pwa-register fires them
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (globalStatus === 'offline') {
        globalStatus = 'idle';
        notify();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return {
    status: globalStatus,
    currentVersion: APP_VERSION,
    latestVersion: globalLatestVersion,
    lastCheckedTime: globalLastCheckedTime,
    newFeatures: globalNewFeatures,
    errorMessage: globalErrorMessage,
    checkForUpdates,
    applyUpdate,
  };
}
