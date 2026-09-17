import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore, auth } from './firebase';
import {
  db,
  type ShiftType,
  type ShiftPattern,
  type ActivePattern,
  type ShiftException,
} from '../db/db';
import { useAppStore } from '../store/useAppStore';

export const LOCAL_MODIFIED_KEY = 'vardiya_last_local_modified';

let isRestoring = false;

/**
 * Geri yükleme işlemi sırasında otomatik arka plan senkronizasyonunun
 * kısır döngüye girmesini önlemek için durum kontrolü.
 */
export function getIsRestoring(): boolean {
  return isRestoring;
}

/**
 * Yerel veritabanında veya ayarlarda bir değişiklik yapıldığında yerel zaman damgasını günceller.
 */
export function markLocalModified(timestamp = new Date().toISOString()): string {
  try {
    localStorage.setItem(LOCAL_MODIFIED_KEY, timestamp);
  } catch (e) {
    console.warn('Could not save local modified timestamp:', e);
  }
  return timestamp;
}

export function getLocalLastModified(): string | null {
  try {
    return localStorage.getItem(LOCAL_MODIFIED_KEY);
  } catch {
    return null;
  }
}

export interface CloudUserData {
  version: number;
  lastModified: string;
  updatedAt: string;
  email?: string | null;
  displayName?: string | null;
  shiftTypes: ShiftType[];
  patterns: ShiftPattern[];
  activePatterns: ActivePattern[];
  exceptions: ShiftException[];
  appSettings: {
    theme: 'light' | 'dark' | 'system';
    calendarTheme: string;
    shiftDisplayMode: string;
    employmentStartDate: string | null;
    annualLeaveEntitlement: number;
    hasCompletedSetup?: boolean;
  };
}

/**
 * İki cihaz arasındaki istisnaları (izin, rapor vb.) tarihlerine göre kayıpsız birleştirir.
 */
export function mergeExceptions(local: ShiftException[], cloud: ShiftException[]): ShiftException[] {
  const map = new Map<string, ShiftException>();
  for (const item of cloud) {
    if (item && item.date) {
      map.set(item.date, item);
    }
  }
  for (const item of local) {
    if (item && item.date) {
      map.set(item.date, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Özel vardiya şablonlarını kimliklerine göre birleştirir.
 */
export function mergePatterns(local: ShiftPattern[], cloud: ShiftPattern[]): ShiftPattern[] {
  const map = new Map<string, ShiftPattern>();
  for (const p of cloud) {
    if (p && p.id) map.set(p.id, p);
  }
  for (const p of local) {
    if (p && p.id) map.set(p.id, p);
  }
  return Array.from(map.values());
}

/**
 * Vardiya tiplerini kimliklerine göre birleştirir.
 */
export function mergeShiftTypes(local: ShiftType[], cloud: ShiftType[]): ShiftType[] {
  const map = new Map<string, ShiftType>();
  for (const st of cloud) {
    if (st && st.id) map.set(st.id, st);
  }
  for (const st of local) {
    if (st && st.id) map.set(st.id, st);
  }
  return Array.from(map.values());
}

/**
 * Toplu yerel verileri okur ve bir veri nesnesi oluşturur
 */
export async function getLocalBackupData(): Promise<Omit<CloudUserData, 'email' | 'displayName'>> {
  const [shiftTypes, patterns, activePatterns, exceptions] = await Promise.all([
    db.shiftTypes.toArray(),
    db.patterns.toArray(),
    db.activePatterns.toArray(),
    db.exceptions.toArray(),
  ]);

  const appState = useAppStore.getState();
  const now = new Date().toISOString();
  const lastMod = getLocalLastModified() || now;

  return {
    version: 1,
    lastModified: lastMod,
    updatedAt: now,
    shiftTypes,
    patterns,
    activePatterns,
    exceptions,
    appSettings: {
      theme: appState.theme,
      calendarTheme: appState.calendarTheme,
      shiftDisplayMode: appState.shiftDisplayMode,
      employmentStartDate: appState.employmentStartDate,
      annualLeaveEntitlement: appState.annualLeaveEntitlement,
      hasCompletedSetup: appState.hasCompletedSetup,
    },
  };
}

/**
 * Yereldeki tüm verileri Firestore bulutuna yükler
 */
export async function uploadLocalDataToCloud(
  userId: string,
  userProfile?: { email?: string | null; displayName?: string | null }
): Promise<boolean> {
  if (!firestore) return false;

  const now = new Date().toISOString();
  markLocalModified(now);

  const localData = await getLocalBackupData();
  const payload: CloudUserData = {
    ...localData,
    lastModified: now,
    updatedAt: now,
    email: userProfile?.email || null,
    displayName: userProfile?.displayName || null,
  };

  const userDocRef = doc(firestore, 'users', userId);
  await setDoc(userDocRef, payload, { merge: true });
  return true;
}

/**
 * Buluttaki verileri indirip yerel Dexie veritabanına ve Zustand store'a geri yükler
 */
export async function restoreCloudDataToLocal(cloudData: CloudUserData): Promise<boolean> {
  cancelAutoSync();
  isRestoring = true;

  try {
    await db.transaction('rw', [db.shiftTypes, db.patterns, db.activePatterns, db.exceptions], async () => {
      // 1. Shift Types
      if (cloudData.shiftTypes && cloudData.shiftTypes.length > 0) {
        await db.shiftTypes.clear();
        await db.shiftTypes.bulkAdd(cloudData.shiftTypes);
      }

      // 2. Patterns
      if (cloudData.patterns && cloudData.patterns.length > 0) {
        await db.patterns.clear();
        await db.patterns.bulkAdd(cloudData.patterns);
      }

      // 3. Active Patterns
      if (cloudData.activePatterns && cloudData.activePatterns.length > 0) {
        await db.activePatterns.clear();
        await db.activePatterns.bulkAdd(cloudData.activePatterns);
      }

      // 4. Exceptions (İzinler, Raporlar, Vardiya Değişiklikleri)
      if (cloudData.exceptions) {
        await db.exceptions.clear();
        if (cloudData.exceptions.length > 0) {
          await db.exceptions.bulkAdd(cloudData.exceptions);
        }
      }
    });

    // 5. Ayarları Zustand store'a aktar (isRestoring aktif olduğu için triggerAutoSync tetiklenmez)
    if (cloudData.appSettings) {
      const store = useAppStore.getState();
      if (cloudData.appSettings.theme) {
        store.setTheme(cloudData.appSettings.theme);
      }
      if (cloudData.appSettings.calendarTheme) {
        store.setCalendarTheme(cloudData.appSettings.calendarTheme as any);
      }
      if (cloudData.appSettings.shiftDisplayMode) {
        store.setShiftDisplayMode(cloudData.appSettings.shiftDisplayMode as any);
      }
      if (cloudData.appSettings.employmentStartDate !== undefined) {
        store.setEmploymentStartDate(cloudData.appSettings.employmentStartDate);
      }
      if (typeof cloudData.appSettings.annualLeaveEntitlement === 'number') {
        store.setAnnualLeaveEntitlement(cloudData.appSettings.annualLeaveEntitlement);
      }
      if (cloudData.appSettings.hasCompletedSetup !== undefined) {
        store.setHasCompletedSetup(cloudData.appSettings.hasCompletedSetup);
      } else if (
        (cloudData.exceptions && cloudData.exceptions.length > 0) ||
        (cloudData.activePatterns && cloudData.activePatterns.length > 0)
      ) {
        store.setHasCompletedSetup(true);
      }
    }

    // Senkronize edilen zaman damgasını yerelde sakla
    const synctimestamp = cloudData.updatedAt || cloudData.lastModified || new Date().toISOString();
    markLocalModified(synctimestamp);

    return true;
  } finally {
    isRestoring = false;
  }
}

/**
 * Bulut ve yerel arasındaki akıllı eşitleme (Smart Sync)
 * 1. Bulutta henüz veri yoksa: Yerel verileri buluta yükler.
 * 2. Akıllı Koruma Kalkanı (Smart Guard):
 *    - Eğer yerel cihaz boş/varsayılan durumdaysa (izin yok, varsayılan şablonlar) ve bulutta dolu veri varsa;
 *      yerel cihazdaki zaman damgasına BAKILMAKSIZIN bulut verisi geri yüklenir!
 *      (Böylece yeni cihazda onboarding tıklaması buluttaki izinleri asla silemez!)
 * 3. Akıllı Birleştirme (Smart Merge):
 *    - Her iki tarafta da kayıtlı izinler varsa, iki taraf kayıpsız birleştirilir.
 * 4. Zaman damgası karşılaştırması:
 *    - Tek taraflı güncellemelerde en güncel olan korunur.
 */
export async function smartSync(
  userId: string,
  userProfile?: { email?: string | null; displayName?: string | null }
): Promise<{ status: 'uploaded' | 'restored' | 'synced' | 'up_to_date'; message?: string }> {
  if (!firestore) {
    return { status: 'up_to_date', message: 'Firebase yapılandırılmamış.' };
  }

  const userDocRef = doc(firestore, 'users', userId);
  const docSnap = await getDoc(userDocRef);

  // Bulutta henüz veri yoksa doğrudan yerel verileri buluta yükle
  if (!docSnap.exists()) {
    await uploadLocalDataToCloud(userId, userProfile);
    return { status: 'uploaded', message: 'Yerel verileriniz ilk kez buluta kaydedildi.' };
  }

  const cloudData = docSnap.data() as CloudUserData;
  const localModified = getLocalLastModified();
  const cloudModified = cloudData.updatedAt || cloudData.lastModified;

  const [localExceptions, localPatterns, localActivePatterns, localShiftTypes] = await Promise.all([
    db.exceptions.toArray(),
    db.patterns.toArray(),
    db.activePatterns.toArray(),
    db.shiftTypes.toArray(),
  ]);

  const cloudExceptions = cloudData.exceptions || [];
  const cloudPatterns = cloudData.patterns || [];
  const cloudActivePatterns = cloudData.activePatterns || [];
  const cloudShiftTypes = cloudData.shiftTypes || [];

  // Bulutta gerçek kullanıcı verisi var mı?
  const cloudHasRichData =
    cloudExceptions.length > 0 ||
    cloudPatterns.length > 16 ||
    (cloudActivePatterns.length > 0 && cloudActivePatterns[0]?.patternId !== 'pattern-d1') ||
    Boolean(cloudData.appSettings?.employmentStartDate);

  // Yerel cihaz henüz taze/varsayılan kurulum durumunda mı?
  const localIsFreshDefault =
    localExceptions.length === 0 &&
    localPatterns.length <= 16;

  // --- KRİTİK KORUMA KALKANI (SMART GUARD) ---
  // Yerel boş ve bulutta veri varsa: Yerel saat yeni bile olsa ASLA bulutu ezme, buluttan geri yükle!
  if (localIsFreshDefault && cloudHasRichData) {
    await restoreCloudDataToLocal(cloudData);
    return { status: 'restored', message: 'Buluttaki kayıtlı verileriniz bu cihaza başarıyla aktarıldı.' };
  }

  // --- AKILLI BİRLEŞTİRME (SMART MERGE) ---
  // Her iki tarafta da izinler veya özel veriler varsa: Çakışmaları kayıpsız birleştir!
  if (localExceptions.length > 0 && cloudExceptions.length > 0) {
    const mergedExceptions = mergeExceptions(localExceptions, cloudExceptions);
    const mergedPatterns = mergePatterns(localPatterns, cloudPatterns);
    const mergedShiftTypes = mergeShiftTypes(localShiftTypes, cloudShiftTypes);

    const localTime = localModified ? new Date(localModified).getTime() : 0;
    const cloudTime = cloudModified ? new Date(cloudModified).getTime() : 0;
    const preferCloudSettings = cloudTime > localTime;

    const now = new Date().toISOString();
    const mergedData: CloudUserData = {
      version: 1,
      lastModified: now,
      updatedAt: now,
      email: userProfile?.email || cloudData.email || null,
      displayName: userProfile?.displayName || cloudData.displayName || null,
      shiftTypes: mergedShiftTypes,
      patterns: mergedPatterns,
      activePatterns: preferCloudSettings ? (cloudActivePatterns.length > 0 ? cloudActivePatterns : localActivePatterns) : localActivePatterns,
      exceptions: mergedExceptions,
      appSettings: preferCloudSettings ? (cloudData.appSettings || (await getLocalBackupData()).appSettings) : (await getLocalBackupData()).appSettings,
    };

    await restoreCloudDataToLocal(mergedData);
    await setDoc(userDocRef, mergedData, { merge: true });
    return { status: 'synced', message: 'Cihazınızdaki ve buluttaki verileriniz eksiksiz birleştirildi.' };
  }

  // 1. Cihazda yerel değişiklik geçmişi yoksa: Buluttaki verileri cihaza geri yükle
  if (!localModified) {
    const cloudHasContent =
      cloudActivePatterns.length > 0 ||
      cloudExceptions.length > 0 ||
      Boolean(cloudData.appSettings);

    if (cloudHasContent) {
      await restoreCloudDataToLocal(cloudData);
      return { status: 'restored', message: 'Buluttaki verileriniz bu cihaza başarıyla geri yüklendi.' };
    }
  }

  // 2. Zaman damgası karşılaştırması:
  const localTime = localModified ? new Date(localModified).getTime() : 0;
  const cloudTime = cloudModified ? new Date(cloudModified).getTime() : 0;

  // Buluttaki veri yerelden belirgin şekilde daha yeniyse (> 2 saniye fark)
  if (cloudTime > localTime + 2000) {
    await restoreCloudDataToLocal(cloudData);
    return { status: 'restored', message: 'Buluttaki güncel verileriniz bu cihaza aktarıldı.' };
  }

  // Yereldeki veri daha güncel veya eşitse, yereli buluta aktar
  await uploadLocalDataToCloud(userId, userProfile);
  return { status: 'uploaded', message: 'Verileriniz bulut ile eşitlendi.' };
}

// Otomatik senkronizasyon için gecikmeli kuyruk (Debounce Sync)
let autoSyncTimeout: any = null;

export function cancelAutoSync() {
  if (autoSyncTimeout) {
    clearTimeout(autoSyncTimeout);
    autoSyncTimeout = null;
  }
}

export function scheduleAutoSync(
  userId: string,
  userProfile?: { email?: string | null; displayName?: string | null },
  delayMs = 2000
) {
  cancelAutoSync();

  autoSyncTimeout = setTimeout(async () => {
    try {
      if (isRestoring) return;
      await uploadLocalDataToCloud(userId, userProfile);
      console.log('Otomatik bulut senkronizasyonu tamamlandı.');
    } catch (err) {
      console.warn('Otomatik senkronizasyon başarısız oldu:', err);
    }
  }, delayMs);
}

/**
 * Oturum açmış kullanıcı varsa veri değişikliklerinde (ekip, tema, izin vb.)
 * otomatik arka plan eşitlemesini sessizce tetikler.
 */
export function triggerAutoSync(delayMs = 1500) {
  if (isRestoring) return;
  markLocalModified();
  if (!auth || !auth.currentUser) return;
  scheduleAutoSync(
    auth.currentUser.uid,
    {
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
    },
    delayMs
  );
}
