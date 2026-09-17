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
  };
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

  // 5. Ayarları Zustand store'a aktar
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
  }

  // Senkronize edilen zaman damgasını yerelde sakla
  const synctimestamp = cloudData.updatedAt || cloudData.lastModified || new Date().toISOString();
  markLocalModified(synctimestamp);

  return true;
}

/**
 * Bulut ve yerel arasındaki akıllı eşitleme (Smart Sync)
 * - Bulutta henüz veri yoksa: Yerel verileri buluta yükler.
 * - Kullanıcı bu tarayıcıda/cihazda ilk defa oturum açmışsa (yerel değişiklik geçmişi yoksa): Buluttan geri yükler.
 * - Her iki tarafta da kayıt varsa: Tarihe göre (updatedAt / lastModified) en güncel olanı korur.
 *   Asla izin sayısı sıfır diye kullanıcının seçtiği ekip ve tema ezilmez!
 */
export async function smartSync(
  userId: string,
  userProfile?: { email?: string | null; displayName?: string | null }
): Promise<{ status: 'uploaded' | 'restored' | 'up_to_date'; message?: string }> {
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

  // 1. Cihazda yerel değişiklik geçmişi yoksa (yeni cihaz / tarayıcı verileri sıfırlanmış):
  // Buluttaki verileri cihaza geri yükle
  if (!localModified) {
    const cloudHasContent =
      (cloudData.activePatterns && cloudData.activePatterns.length > 0) ||
      (cloudData.exceptions && cloudData.exceptions.length > 0) ||
      cloudData.appSettings;

    if (cloudHasContent) {
      await restoreCloudDataToLocal(cloudData);
      return { status: 'restored', message: 'Buluttaki verileriniz bu cihaza başarıyla geri yüklendi.' };
    }
  }

  // 2. Zaman damgası karşılaştırması:
  const localTime = localModified ? new Date(localModified).getTime() : 0;
  const cloudTime = cloudModified ? new Date(cloudModified).getTime() : 0;

  // Buluttaki veri yerelden belirgin şekilde daha yeniyse (> 2 saniye fark), başka cihazda yapılmış yeni değişiklikleri al
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

export function scheduleAutoSync(
  userId: string,
  userProfile?: { email?: string | null; displayName?: string | null },
  delayMs = 2000
) {
  if (autoSyncTimeout) {
    clearTimeout(autoSyncTimeout);
  }

  autoSyncTimeout = setTimeout(async () => {
    try {
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
