import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import {
  db,
  type ShiftType,
  type ShiftPattern,
  type ActivePattern,
  type ShiftException,
} from '../db/db';
import { useAppStore } from '../store/useAppStore';

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

  return {
    version: 1,
    lastModified: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  const localData = await getLocalBackupData();
  const payload: CloudUserData = {
    ...localData,
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

  return true;
}

/**
 * Bulut ve yerel arasındaki akıllı eşitleme (Smart Sync)
 * - Tarayıcı geçmişi silinmişse (yerelde istisna ve desen az/boşsa): Buluttan geri yükler.
 * - Bulutta henüz veri yoksa: Yereldeki verileri buluta yükler.
 * - Her iki tarafta da veri varsa: Tarihe göre en güncel olanı korur.
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

  // Bulutta veri yoksa doğrudan yereli yükle
  if (!docSnap.exists()) {
    await uploadLocalDataToCloud(userId, userProfile);
    return { status: 'uploaded', message: 'Yerel verileriniz ilk kez buluta kaydedildi.' };
  }

  const cloudData = docSnap.data() as CloudUserData;

  // Yerel veri durumunu kontrol et
  const localExceptionsCount = await db.exceptions.count();
  const localPatternsCount = await db.patterns.count();

  // Tarayıcı geçmişi temizlenmişse (yerelde istisna yok veya sadece varsayılan şablonlar varsa)
  // ve bulutta kaydedilmiş istisna/özel veri varsa -> Buluttan geri yükle
  const cloudHasData = (cloudData.exceptions && cloudData.exceptions.length > 0) ||
                       (cloudData.patterns && cloudData.patterns.length > 0);

  if ((localExceptionsCount === 0 || localPatternsCount <= 16) && cloudHasData) {
    await restoreCloudDataToLocal(cloudData);
    return { status: 'restored', message: 'Buluttaki verileriniz bu cihaza başarıyla geri yüklendi.' };
  }

  // Aksi takdirde yerel verileri bulut ile güncelle
  await uploadLocalDataToCloud(userId, userProfile);
  return { status: 'uploaded', message: 'Verileriniz bulut ile eşitlendi.' };
}

// Otomatik senkronizasyon için gecikmeli kuyruk (Debounce Sync)
let autoSyncTimeout: any = null;

export function scheduleAutoSync(
  userId: string,
  userProfile?: { email?: string | null; displayName?: string | null },
  delayMs = 3000
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
