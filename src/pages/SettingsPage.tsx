import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import {
  Moon,
  Sun,
  Monitor,
  Palette,
  CheckCircle2,
  Upload,
  Download,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  SHIFT_DISPLAY_MODES,
  CALENDAR_THEMES,
} from '../utils/calendarThemes';
import { CalendarThemeModal } from '../components/CalendarThemeModal';
import { getLocalBackupData, restoreCloudDataToLocal, type CloudUserData } from '../services/syncService';
import { usePwa } from '../utils/pwa';

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const {
    theme,
    setTheme,
    shiftDisplayMode,
    setShiftDisplayMode,
    calendarTheme,
    setIsSetupModalOpen,
  } = useAppStore();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
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

  const activeThemeDef = CALENDAR_THEMES.find((ct) => ct.id === calendarTheme) || CALENDAR_THEMES[0];

  return (
    <div className="pt-4 px-4 pb-6 sm:pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto space-y-4">
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
        {/* Setup Wizard Re-run Card */}
        <section className="bg-gradient-to-r from-primary-500/10 via-indigo-500/10 to-purple-500/10 dark:from-primary-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 rounded-2xl p-4 sm:p-5 border border-primary-200/80 dark:border-primary-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-primary-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                {t('onboarding_reopen_btn', 'İlk Kurulum Sihirbazı')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('onboarding_reopen_desc', 'Ekip, tema ve takvim tercihlerinizi adımlarla baştan yapılandırın.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-black text-xs shadow-sm shadow-primary-500/25 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <span>Sihirbazı Başlat</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>

        {/* Mobile PWA Installation Guide / Status Card */}
        {isStandalone || isInstalled ? (
          <section className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Uygulama Cihazınızda Yüklü
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                    Aktif PWA
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Shift Assist ana ekranınıza eklenmiş durumda, çevrimdışı ve tam ekran olarak çalışıyor.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openGuide()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <span>Yükleme Bilgisi</span>
            </button>
          </section>
        ) : (
          <section className="bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:via-sky-950/40 dark:to-indigo-950/40 rounded-2xl p-4 sm:p-5 border border-blue-200/80 dark:border-blue-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {isApple ? "Uygulamayı iPhone'a Yükle (PWA)" : "Uygulamayı Telefona Yükle (PWA)"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isApple
                    ? "Safari ile ana ekrana ekleyerek gerçek bir iOS uygulaması gibi tam ekran kullanın."
                    : "Android veya Apple cihazınıza ana ekrana ekleyerek internetsiz ve tam ekran kullanın."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openGuide()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-sm shadow-blue-500/25 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <span>Yükleme Rehberi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* Shift Display Mode Settings */}
        <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {t('calendar_view_display_title', 'Vardiya Gösterim Şekli')}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {t('shift_display_mode_desc', 'Gün hücrelerinde vardiyaların nasıl gösterileceğini seçin.')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SHIFT_DISPLAY_MODES.map((mode) => {
              const isSelected = shiftDisplayMode === mode.id;
              const ModeIcon = mode.icon;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setShiftDisplayMode(mode.id)}
                  className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <ModeIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold truncate">
                      {t(mode.labelKey, mode.labelFallback)}
                    </div>
                    <div className="text-[10px] opacity-75 truncate">
                      {t(mode.descKey, mode.descFallback)}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Theme Quick Launcher */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {t('calendar_view_options', 'Takvim Görünümü')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t(activeThemeDef.nameKey, activeThemeDef.nameFallback)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 transition-colors"
            >
              {t('edit', 'Değiştir')}
            </button>
          </div>
        </section>

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
          
          <div className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bu Yılki Senelik İzin Hakkınız (Gün)
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

        {/* App Theme Settings */}
        <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tema</h2>
          <div className="flex flex-col space-y-2">
            <ThemeOption 
              active={theme === 'light'} 
              onClick={() => setTheme('light')} 
              icon={<Sun className="w-5 h-5" />} 
              label={t('theme_light')} 
            />
            <ThemeOption 
              active={theme === 'dark'} 
              onClick={() => setTheme('dark')} 
              icon={<Moon className="w-5 h-5" />} 
              label={t('theme_dark')} 
            />
            <ThemeOption 
              active={theme === 'system'} 
              onClick={() => setTheme('system')} 
              icon={<Monitor className="w-5 h-5" />} 
              label={t('theme_system')} 
            />
          </div>
        </section>

        {/* Language Settings */}
        <section className="bg-card rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('language')}</h2>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleLanguageChange('tr')}
              className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${
                i18n.language.startsWith('tr') ? 'bg-primary-50 text-primary-600 dark:bg-primary-600/10 dark:text-primary-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="font-medium">Türkçe</span>
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${
                i18n.language.startsWith('en') ? 'bg-primary-50 text-primary-600 dark:bg-primary-600/10 dark:text-primary-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="font-medium">English</span>
            </button>
          </div>
        </section>

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
              className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Yedek İndir (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
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
      </div>

      {/* Mobile Bottom Navigation Safe Clearance */}
      <div className="h-8 md:hidden pointer-events-none" aria-hidden="true" />

      <CalendarThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
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
      onClick={onClick}
      className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-colors ${
        active 
          ? 'bg-primary-50 text-primary-600 dark:bg-primary-600/10 dark:text-primary-400' 
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default SettingsPage;


