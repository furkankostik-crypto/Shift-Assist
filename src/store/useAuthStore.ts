import { create } from 'zustand';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import {
  smartSync,
  uploadLocalDataToCloud,
  restoreCloudDataToLocal,
  type CloudUserData,
} from '../services/syncService';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase';

export type AuthModalView = 'login' | 'register' | 'forgot_password';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AuthState {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  lastSyncedAt: string | null;

  // Modal State
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;

  // Auth Actions
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;

  // Sync Actions
  syncNow: () => Promise<void>;
  restoreNow: () => Promise<void>;
}

export const getTurkishAuthError = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/unauthorized-domain':
      return 'Bu IP veya alan adı Firebase tarafından yetkilendirilmemiş. Firebase Console > Authentication > Settings > Authorized domains listesine bağlandığınız adresi (Örn: 192.168.1.11) eklemelisiniz.';
    case 'auth/popup-blocked':
      return 'Tarayıcınız açılır pencereyi engelledi. Lütfen pop-up pencerelere izin verin.';
    case 'auth/operation-not-allowed':
      return 'Bu giriş yöntemi Firebase Console üzerinde henüz etkinleştirilmemiş (Authentication > Sign-in method kontrol edin).';
    case 'auth/invalid-email':
      return 'Geçerli bir e-posta adresi giriniz.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmıştır.';
    case 'auth/user-not-found':
      return 'Bu e-posta adresine ait bir hesap bulunamadı. Hesabınız yoksa lütfen aşağıdaki "Hemen Ücretsiz Kayıt Olun" bağlantısını kullanın.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı. (Henüz hesabınız yoksa lütfen aşağıdaki "Hemen Ücretsiz Kayıt Olun" seçeneğini kullanın).';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresiyle kayıtlı bir hesap zaten var. Lütfen "Giriş Yap" seçeneğini kullanın.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. En az 6 karakter olmalıdır.';
    case 'auth/popup-closed-by-user':
      return 'Google giriş penceresi kapatıldı.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantınızı kontrol edin.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
    default:
      return errorCode
        ? `İşlem hatası [${errorCode}]. Lütfen tekrar deneyin.`
        : 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.';
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  const configured = isFirebaseConfigured();

  // Oturum durumu dinleyicisi başlat
  if (configured && auth) {
    // Mobil yönlendirme sonucunu kontrol et
    getRedirectResult(auth).catch((err) => {
      console.warn('Redirect auth result error:', err);
    });

    onAuthStateChanged(auth, async (currentUser) => {
      set({ user: currentUser, loading: false });

      if (currentUser) {
        // Oturum açıldığında veya sayfa yenilendiğinde akıllı eşitlemeyi çalıştır
        set({ syncStatus: 'syncing', syncMessage: 'Veriler eşitleniyor...' });
        try {
          const res = await smartSync(currentUser.uid, {
            email: currentUser.email,
            displayName: currentUser.displayName,
          });
          set({
            syncStatus: 'synced',
            syncMessage: res.message || 'Senkronize edildi',
            lastSyncedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          });
        } catch (err: any) {
          console.error('İlk eşitleme hatası:', err);
          set({ syncStatus: 'error', syncMessage: 'Eşitleme yapılamadı' });
        }
      } else {
        set({ syncStatus: 'idle', syncMessage: null, lastSyncedAt: null });
      }
    });
  } else {
    // Firebase ayarlı değilse loading'i hemen kapat
    setTimeout(() => {
      set({ loading: false });
    }, 0);
  }

  return {
    user: null,
    loading: configured,
    isConfigured: configured,
    syncStatus: 'idle',
    syncMessage: null,
    lastSyncedAt: null,

    isAuthModalOpen: false,
    authModalView: 'login',

    openAuthModal: (view = 'login') => set({ isAuthModalOpen: true, authModalView: view }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),
    setAuthModalView: (authModalView) => set({ authModalView }),

    loginWithGoogle: async () => {
      if (!configured || !auth) {
        throw new Error('Firebase henüz yapılandırılmamış. Lütfen .env dosyasını kontrol edin.');
      }
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        set({ isAuthModalOpen: false, syncStatus: 'syncing', syncMessage: 'Veriler eşitleniyor...' });

        // Akıllı eşitleme
        const res = await smartSync(user.uid, {
          email: user.email,
          displayName: user.displayName,
        });

        set({
          syncStatus: 'synced',
          syncMessage: res.message || 'Senkronize edildi',
          lastSyncedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (error: any) {
        console.error('Google login error:', error);
        // Mobilde popup engellendiğinde redirect dene
        if (error.code === 'auth/popup-blocked' && auth) {
          try {
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (redErr: any) {
            throw new Error(getTurkishAuthError(redErr.code || ''));
          }
        }
        throw new Error(getTurkishAuthError(error.code || ''));
      }
    },

    loginWithEmail: async (email: string, pass: string) => {
      if (!configured || !auth) {
        throw new Error('Firebase henüz yapılandırılmamış. Lütfen .env dosyasını kontrol edin.');
      }
      try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        const user = result.user;
        set({ isAuthModalOpen: false, syncStatus: 'syncing', syncMessage: 'Veriler eşitleniyor...' });

        const res = await smartSync(user.uid, {
          email: user.email,
          displayName: user.displayName,
        });

        set({
          syncStatus: 'synced',
          syncMessage: res.message || 'Senkronize edildi',
          lastSyncedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (error: any) {
        throw new Error(getTurkishAuthError(error.code || ''));
      }
    },

    registerWithEmail: async (email: string, pass: string, name?: string) => {
      if (!configured || !auth) {
        throw new Error('Firebase henüz yapılandırılmamış. Lütfen .env dosyasını kontrol edin.');
      }
      try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        const user = result.user;

        if (name && name.trim()) {
          await updateProfile(user, { displayName: name.trim() });
        }

        set({ isAuthModalOpen: false, syncStatus: 'syncing', syncMessage: 'Veriler buluta aktarılıyor...' });

        // Yeni kayıt olan kullanıcının mevcut yerel verilerini doğrudan buluta aktar
        await uploadLocalDataToCloud(user.uid, {
          email: user.email,
          displayName: name || user.displayName,
        });

        set({
          syncStatus: 'synced',
          syncMessage: 'Tüm verileriniz yeni hesabınıza yedeklendi.',
          lastSyncedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (error: any) {
        throw new Error(getTurkishAuthError(error.code || ''));
      }
    },

    resetPassword: async (email: string) => {
      if (!configured || !auth) {
        throw new Error('Firebase henüz yapılandırılmamış. Lütfen .env dosyasını kontrol edin.');
      }
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error: any) {
        throw new Error(getTurkishAuthError(error.code || ''));
      }
    },

    logout: async () => {
      if (auth) {
        await signOut(auth);
      }
      set({
        user: null,
        syncStatus: 'idle',
        syncMessage: null,
        lastSyncedAt: null,
      });
    },

    syncNow: async () => {
      const user = get().user;
      if (!user) return;

      set({ syncStatus: 'syncing', syncMessage: 'Buluta yedekleniyor...' });
      try {
        await uploadLocalDataToCloud(user.uid, {
          email: user.email,
          displayName: user.displayName,
        });
        set({
          syncStatus: 'synced',
          syncMessage: 'Bulut yedeği güncellendi',
          lastSyncedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (err) {
        console.error('Manuel eşitleme hatası:', err);
        set({ syncStatus: 'error', syncMessage: 'Yedekleme başarısız oldu' });
      }
    },

    restoreNow: async () => {
      const user = get().user;
      if (!user || !firestore) return;

      set({ syncStatus: 'syncing', syncMessage: 'Buluttan geri yükleniyor...' });
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          await restoreCloudDataToLocal(docSnap.data() as CloudUserData);
          set({
            syncStatus: 'synced',
            syncMessage: 'Bulut verileri başarıyla geri yüklendi',
            lastSyncedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          });
          // Sayfayı veya görünümü tazelemek için bildirim veya reload
        } else {
          set({ syncStatus: 'error', syncMessage: 'Bulutta kayıtlı veri bulunamadı' });
        }
      } catch (err) {
        console.error('Geri yükleme hatası:', err);
        set({ syncStatus: 'error', syncMessage: 'Geri yükleme başarısız' });
      }
    },
  };
});
