import { isAppStandalone, isAppleDevice, isIosSafari } from './pwa';

export const APP_NAME = 'Shift Assist';
export const APP_VERSION = '1.4.2';
export const APP_BUILD_DATE = '17.09.2026';

export const CURRENT_RELEASE_HIGHLIGHTS: string[] = [
  'Takvimde "Bugün" butonuna basıldığında ilgili aya hedeflenen akıcı ve hatasız kaydırma sağlandı.',
  'Gün detay kartı kapatıldığında takvimin alakasız bir aya atlama sorunu ResizeObserver re-anchoring ile kalıcı olarak giderildi.',
  'Sol üstteki Ay & Yıl Seçici yenilendi; dinamik yıl aralığı, yerelleştirilmiş ay isimleri ve pürüzsüz geçiş getirildi.',
  'Ay seçildiğinde istenmeyen gün detay kartının açılması engellendi, doğrudan hedeflenen aya geçiş sağlandı.',
  'Ay ve hafta satırlarının esnek yükseklik senkronizasyonu ve CSS geçişleri optimize edildi.',
  'Bulut Hesabı & Gerçek Zamanlı Eşitleme ve Akıllı Koruma Kalkanı (Smart Guard) kararlılığı korundu.',
];

export interface VersionInfo {
  version: string;
  buildDate?: string;
  minSupportedVersion?: string;
  features?: string[];
}

export const STORAGE_KEY_LAST_CHECK = 'shift_assist_last_update_check';

/**
 * Semver comparison:
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Fetch remote version.json bypassing caches
 */
export async function fetchRemoteVersion(): Promise<VersionInfo | null> {
  try {
    const timestamp = Date.now();
    const res = await fetch(`/version.json?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as VersionInfo;
    return data;
  } catch (err) {
    console.warn('[VersionCheck] Failed to fetch remote version.json:', err);
    return null;
  }
}

/**
 * Trigger Service Worker update check if supported
 */
export async function triggerServiceWorkerUpdate(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      if (registration.waiting || registration.installing) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('[VersionCheck] Service worker update check failed:', err);
    return false;
  }
}

/**
 * Force-reloads the application and activates waiting service worker
 */
export async function forceAppReload(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch {}

  // Reload window without cache
  window.location.reload();
}

/**
 * Get human readable runtime mode
 */
export function getRuntimeEnvironment(): {
  modeLabel: string;
  isStandalone: boolean;
  platform: string;
} {
  const isStandalone = isAppStandalone();
  const isApple = isAppleDevice();
  const isSafari = isIosSafari();

  let modeLabel = 'Web Tarayıcısı';
  if (isStandalone) {
    modeLabel = 'PWA (Tam Ekran / Kurulu)';
  } else if (isSafari) {
    modeLabel = 'iOS Safari';
  } else if (isApple) {
    modeLabel = 'Apple Cihazı';
  }

  const platform = typeof navigator !== 'undefined' ? navigator.platform || 'Bilinmiyor' : 'Bilinmiyor';

  return {
    modeLabel,
    isStandalone,
    platform,
  };
}

/**
 * Format timestamp into user-friendly Turkish time
 */
export function formatLastCheckedTime(timestamp: number | null): string {
  if (!timestamp) return 'Henüz denetlenmedi';

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 30) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;

  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${date.getFullYear()} ${hours}:${minutes}`;
}
