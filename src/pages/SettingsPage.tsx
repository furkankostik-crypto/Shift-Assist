import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import {
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  Upload,
  Download,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { getLocalBackupData, restoreCloudDataToLocal, type CloudUserData } from '../services/syncService';
import { usePwa } from '../utils/pwa';
import { APP_VERSION, APP_BUILD_DATE } from '../utils/version';
import { useUpdateCheck } from '../utils/useUpdateCheck';

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const {
    theme,
    setTheme,
    setIsSetupModalOpen,
    setIsUpdateModalOpen,
  } = useAppStore();

  const { status: updateStatus } = useUpdateCheck();
  const hasUpdate = updateStatus === 'update-available';


  const [jsonBackupStatus, setJsonBackupStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isInstalled, isStandalone, openGuide, isApple } = usePwa();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleExportJson = async () => {
    try {
      const data = await getLocalBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vardiya-takip-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setJsonBackupStatus('Yedek dosyası başarıyla indirildi.');
      setTimeout(() => setJsonBackupStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setJsonBackupStatus('Yedek indirilirken bir hata oluştu.');
      setTimeout(() => setJsonBackupStatus(null), 3000);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CloudUserData;
      if (!parsed.shiftTypes || !parsed.patterns) {
        throw new Error('Geçersiz yedek dosyası.');
      }
      await restoreCloudDataToLocal(parsed);
      setJsonBackupStatus('Yedek başarıyla geri yüklendi!');
      setTimeout(() => {
        setJsonBackupStatus(null);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setJsonBackupStatus(err.message || 'Yedek yüklenemedi. Dosyayı kontrol edin.');
      setTimeout(() => setJsonBackupStatus(null), 4000);
    } finally {
      if (e.target) e.target.value = '';
    }
  };



  return (
    <div className="pt-4 px-4 pb-[calc(5rem+var(--sab))] animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto space-y-4">
      {/* Top Quick Back Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all text-xs font-bold active:scale-95 group cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Takvime Dön</span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{t('settings')}</h1>

      <div className="space-y-6">
        {/* Compact Setup Wizard & PWA Launcher Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Setup Wizard Re-run Card */}
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="bg-gradient-to-br from-primary-500/10 via-indigo-500/10 to-purple-500/10 dark:from-primary-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 rounded-2xl p-3 sm:p-4 border border-primary-200/80 dark:border-primary-800/60 shadow-xs flex flex-col justify-between text-left hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-primary-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 flex items-center group-hover:translate-x-0.5 transition-transform">
                Başlat <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Kurulum Sihirbazı
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                Vardiya ve tema tercihlerini baştan yapılandırın.
              </p>
            </div>
          </button>

          {/* Mobile PWA Installation Guide / Status Card */}
          {isStandalone || isInstalled ? (
            <button
              type="button"
              onClick={() => openGuide()}
              className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 rounded-2xl p-3 sm:p-4 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col justify-between text-left hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                  Yüklü
                </span>
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                  Uygulama Hazır
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                  Çevrimdışı ve tam ekran olarak çalışıyor.
                </p>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openGuide()}
              className="bg-gradient-to-br from-blue-500/10 via-sky-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:via-sky-950/40 dark:to-indigo-950/40 rounded-2xl p-3 sm:p-4 border border-blue-200/80 dark:border-blue-800/60 shadow-xs flex flex-col justify-between text-left hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center group-hover:translate-x-0.5 transition-transform">
                  Rehber <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                  {isApple ? "iPhone'a Yükle" : "Telefona Yükle"}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                  Ana ekrana ekleyip internetsiz tam ekran kullanın.
                </p>
              </div>
            </button>
          )}
        </div>


        {/* Personnel Info Settings */}
        <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {t('personnel_info', 'Personel Bilgileri')}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              İzin haklarınızın doğru hesaplanması için işe giriş tarihinizi ve yıllık izin hakkınızı belirtin.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                İşe Giriş Tarihiniz
              </label>
              <input
                type="date"
                value={useAppStore(s => s.employmentStartDate) || ''}
                onChange={(e) => useAppStore.getState().setEmploymentStartDate(e.target.value || null)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 truncate" title="Bu Yılki Senelik İzin Hakkınız (Gün)">
                Bu Yılki İzin (Gün)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={useAppStore(s => s.annualLeaveEntitlement)}
                onChange={(e) => useAppStore.getState().setAnnualLeaveEntitlement(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* App Theme Settings */}
          <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Tema</h2>
            <div className="grid grid-cols-3 gap-2">
              <ThemeOption 
                active={theme === 'light'} 
                onClick={() => setTheme('light')} 
                icon={<Sun className="w-4 h-4" />} 
                label={t('theme_light')} 
              />
              <ThemeOption 
                active={theme === 'dark'} 
                onClick={() => setTheme('dark')} 
                icon={<Moon className="w-4 h-4" />} 
                label={t('theme_dark')} 
              />
              <ThemeOption 
                active={theme === 'system'} 
                onClick={() => setTheme('system')} 
                icon={<Monitor className="w-4 h-4" />} 
                label={t('theme_system')} 
              />
            </div>
          </section>

          {/* Language Settings */}
          <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('language')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLanguageChange('tr')}
                className={`group relative flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold transition-all duration-150 cursor-pointer select-none active:scale-95 text-[11px] sm:text-xs ${
                  i18n.language.startsWith('tr') 
                    ? 'bg-primary-600 text-white border-2 border-primary-500 shadow-md shadow-primary-500/25 ring-2 ring-primary-500/20' 
                    : 'bg-slate-100/90 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                }`}
              >
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider transition-colors ${
                    i18n.language.startsWith('tr')
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                  }`}
                >
                  TR
                </span>
                <span>Türkçe</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`group relative flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold transition-all duration-150 cursor-pointer select-none active:scale-95 text-[11px] sm:text-xs ${
                  i18n.language.startsWith('en') 
                    ? 'bg-primary-600 text-white border-2 border-primary-500 shadow-md shadow-primary-500/25 ring-2 ring-primary-500/20' 
                    : 'bg-slate-100/90 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                }`}
              >
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider transition-colors ${
                    i18n.language.startsWith('en')
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                  }`}
                >
                  EN
                </span>
                <span>English</span>
              </button>
            </div>
          </section>
        </div>

        {/* Local File Backup & Restore (JSON) */}
        <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <FileJson className="w-4 h-4 text-primary-500" />
              <span>Çevrimdışı Dosya Yedeği (JSON)</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              İnternet bağlantınız olmasa bile verilerinizi tek tıkla dosya olarak bilgisayarınıza/telefonunuza indirebilir ve geri yükleyebilirsiniz.
            </p>
          </div>

          {jsonBackupStatus && (
            <div className="mb-3 p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-xs font-medium animate-in fade-in">
              {jsonBackupStatus}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-900/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Yedek İndir (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-900/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Yedek Yükle</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>
        </section>

        {/* App Version & Updates Section */}
        <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                <RefreshCw className={`w-4 h-4 text-primary-500 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                <span>Sürüm ve Güncellemeler</span>
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Shift Assist sürüm durumunu kontrol edin ve en yeni özellikleri kullanın.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
              hasUpdate
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            }`}>
              {hasUpdate ? 'Yeni Sürüm Var' : `v${APP_VERSION}`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Mevcut Sürüm: v{APP_VERSION}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Son Güncelleme Paketi: {APP_BUILD_DATE}
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {hasUpdate ? 'Güncelleme Bekliyor' : 'En Son Sürüm'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsUpdateModalOpen(true)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Güncellemeleri Denetle</span>
          </button>
        </section>
      </div>

      {/* Mobile Bottom Navigation Safe Clearance */}
      <div className="h-8 md:hidden pointer-events-none" aria-hidden="true" />


    </div>
  );
};

interface ThemeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ThemeOption = ({ active, onClick, icon, label }: ThemeOptionProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-xl font-bold transition-all duration-150 cursor-pointer select-none active:scale-95 text-[11px] sm:text-xs ${
        active 
          ? 'bg-primary-600 text-white border-2 border-primary-500 shadow-md shadow-primary-500/25 ring-2 ring-primary-500/20' 
          : 'bg-slate-100/90 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white shadow-2xs'
      }`}
    >
      <span
        className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
          active ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
        }`}
      >
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
};

export default SettingsPage;


