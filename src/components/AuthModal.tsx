import { useState } from 'react';
import { useAuthStore, type AuthModalView } from '../store/useAuthStore';
import {
  X,
  Cloud,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalView,
    setAuthModalView,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    isConfigured,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
    setGoogleLoading(false);
  };

  const switchView = (view: AuthModalView) => {
    resetFormState();
    setAuthModalView(view);
  };

  const handleGoogleLogin = async () => {
    resetFormState();
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google ile giriş başarısız oldu.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.trim()) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }

    setLoading(true);
    try {
      if (authModalView === 'login') {
        if (!password) {
          setError('Lütfen şifrenizi girin.');
          setLoading(false);
          return;
        }
        await loginWithEmail(email.trim(), password);
      } else if (authModalView === 'register') {
        if (!password || password.length < 6) {
          setError('Şifreniz en az 6 karakter olmalıdır.');
          setLoading(false);
          return;
        }
        await registerWithEmail(email.trim(), password, name.trim());
      } else if (authModalView === 'forgot_password') {
        await resetPassword(email.trim());
        setSuccessMsg('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      }
    } catch (err: any) {
      setError(err.message || 'İşlem başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pt-[calc(var(--sat)+1rem)] pb-[calc(var(--sab)+1rem)] px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 max-h-[calc(100dvh-var(--sat)-var(--sab)-2rem)] overflow-y-auto my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Başlık ve İkon */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-3 shadow-xs border border-primary-100 dark:border-primary-900/40">
            <Cloud className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">
            {authModalView === 'login' && 'Hesabınıza Giriş Yapın'}
            {authModalView === 'register' && 'Ücretsiz Hesap Oluşturun'}
            {authModalView === 'forgot_password' && 'Şifrenizi mi Unuttunuz?'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
            {authModalView === 'forgot_password'
              ? 'Kayıtlı e-posta adresinizi girin, size şifre sıfırlama linki gönderelim.'
              : 'Verileriniz buluta yedeklensin, tarayıcı geçmişi silinse bile asla kaybolmasın.'}
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Firebase Henüz Bağlanmadı</span>
              Canlı oturum ve senkronizasyon için <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> dosyasına Firebase bilgilerinizi eklemeniz yeterlidir.
            </div>
          </div>
        )}

        {/* Hata Bildirimi */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Başarı Bildirimi */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {authModalView !== 'forgot_password' && (
          <>
            {/* Google ile Giriş Butonu */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-semibold text-sm flex items-center justify-center space-x-3 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Google ile Devam Et</span>
            </button>

            {/* Çizgi / Veya */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-card px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider absolute">
                veya e-posta ile
              </span>
            </div>
          </>
        )}

        {/* E-posta Formu */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalView === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                İsim / Takma Ad (İsteğe bağlı)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
              />
            </div>
          </div>

          {authModalView !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Şifre
                </label>
                {authModalView === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchView('forgot_password')}
                    className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Şifremi unuttum?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {authModalView === 'login' && 'Giriş Yap'}
              {authModalView === 'register' && 'Hesap Oluştur ve Eşitle'}
              {authModalView === 'forgot_password' && 'Sıfırlama Bağlantısı Gönder'}
            </span>
          </button>
        </form>

        {/* Görünüm Değiştirme Butonları (Login / Register / Forgot Password) */}
        <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          {authModalView === 'login' && (
            <div>
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
              >
                Hemen Ücretsiz Kayıt Olun
              </button>
            </div>
          )}

          {authModalView === 'register' && (
            <div>
              Zaten bir hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
              >
                Giriş Yapın
              </button>
            </div>
          )}

          {authModalView === 'forgot_password' && (
            <div>
              Giriş ekranına geri dön:{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
              >
                Giriş Yap
              </button>
            </div>
          )}
        </div>

        {/* Bilgilendirme Alt Metni */}
        <div className="mt-4 flex items-center justify-center space-x-1 text-[11px] text-slate-400 dark:text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Mevcut vardiya düzenleriniz kaybolmadan hesabınıza aktarılır.</span>
        </div>
      </div>
    </div>
  );
};
