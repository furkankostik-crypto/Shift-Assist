import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Sun,
  Moon,
  Monitor,
  Palette,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_PATTERN_START_DATE } from '../db/db';
import {
  CALENDAR_THEMES,
  SHIFT_DISPLAY_MODES,
} from '../utils/calendarThemes';
import { ThemeMiniPreview } from './CalendarThemeModal';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

const TEAM_GROUPS = [
  {
    id: 'A',
    label: 'A Ekibi',
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    tag: 'Grup A',
  },
  {
    id: 'B',
    label: 'B Ekibi',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    tag: 'Grup B',
  },
  {
    id: 'C',
    label: 'C Ekibi',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    tag: 'Grup C',
  },
  {
    id: 'D',
    label: 'D Ekibi',
    color: 'from-purple-500 to-violet-600',
    border: 'border-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    tag: 'Grup D',
  },
] as const;

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const {
    theme,
    setTheme,
    calendarTheme,
    setCalendarTheme,
    shiftDisplayMode,
    setShiftDisplayMode,
    setHasCompletedSetup,
    setIsSetupModalOpen,
  } = useAppStore();

  const {
    user,
    openAuthModal,
    loginWithGoogle,
  } = useAuthStore();

  // 1: Team & Subteam, 2: Theme, 3: Calendar View, 4: User Login/Cloud, 5: Ready/Summary
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Track active pattern from Dexie DB
  const activePatterns = useLiveQuery(() => db.activePatterns.toArray(), []);
  const patterns = useLiveQuery(() => db.patterns.toArray(), []);

  const activePattern = activePatterns?.[0];

  // Selected Team & Subteam state
  const [selectedGroup, setSelectedGroup] = useState<string>('D');
  const [selectedSubteam, setSelectedSubteam] = useState<string>('1');
  const [isApplyingTeam, setIsApplyingTeam] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync initial selected team from existing active pattern
  useEffect(() => {
    if (activePattern?.patternId) {
      const match = activePattern.patternId.match(/^pattern-([a-d])([1-4])$/i);
      if (match) {
        setSelectedGroup(match[1].toUpperCase());
        setSelectedSubteam(match[2]);
      }
    }
  }, [activePattern?.patternId]);

  const currentSelectedTeamCode = `${selectedGroup}${selectedSubteam}`;
  const currentSelectedPattern = patterns?.find(
    (p) => p.id === `pattern-${currentSelectedTeamCode.toLowerCase()}`
  );

  // Apply chosen team to Dexie DB
  const handleSelectTeam = async (group: string, sub: string) => {
    setSelectedGroup(group);
    setSelectedSubteam(sub);
    const patternId = `pattern-${group.toLowerCase()}${sub}`;

    setIsApplyingTeam(true);
    try {
      await db.activePatterns.clear();
      await db.activePatterns.add({
        id: crypto.randomUUID(),
        patternId,
        startDate: DEFAULT_PATTERN_START_DATE,
      });
    } catch (err) {
      console.error('Error setting team pattern in onboarding:', err);
    } finally {
      setIsApplyingTeam(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    setHasCompletedSetup(true);
    setIsSetupModalOpen(false);
    if (onComplete) onComplete();
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google girişi sırasında bir hata oluştu.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const currentThemeDef = CALENDAR_THEMES.find((ct) => ct.id === calendarTheme) || CALENDAR_THEMES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pt-[calc(var(--sat)+1rem)] pb-[calc(var(--sab)+1rem)] px-3 sm:px-6 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-xl bg-card rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[calc(100dvh-var(--sat)-var(--sab)-2rem)] overflow-hidden my-auto text-foreground"
      >
        {/* Header with Step indicator and Skip button */}
        <div className="px-4 pt-3 pb-2 sm:px-5 sm:pt-4 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary-100/90 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black text-xs shadow-2xs">
              {currentStep}/{totalSteps}
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{t('onboarding_title', 'Hoş Geldiniz!')}</span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300">
                  {currentStep === 1 && t('onboarding_step_team', 'Ekip')}
                  {currentStep === 2 && t('onboarding_step_theme', 'Tema')}
                  {currentStep === 3 && t('onboarding_step_calendar', 'Görünüm')}
                  {currentStep === 4 && t('onboarding_step_auth', 'Hesap')}
                  {currentStep === 5 && t('onboarding_step_finish', 'Tamam')}
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {currentStep === 1 && t('onboarding_step_team_desc', 'Çalıştığınız ana grup ve alt ekibi seçin.')}
                {currentStep === 2 && t('onboarding_step_theme_desc', 'Gözlerinize en uygun arayüz modunu belirleyin.')}
                {currentStep === 3 && t('onboarding_step_calendar_desc', 'Takvim düzeninizi ve hücre biçimini kişiselleştirin.')}
                {currentStep === 4 && t('onboarding_step_auth_desc', 'Verilerinizi buluta yedekleyin veya cihazınızda saklayın.')}
                {currentStep === 5 && t('onboarding_step_finish_desc', 'Tebrikler! Kurulum başarıyla tamamlandı.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            title={t('onboarding_skip', 'Şimdilik Geç')}
          >
            <span className="hidden xs:inline">{t('onboarding_skip', 'Şimdilik Geç')}</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 relative overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-indigo-500"
            initial={false}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Dynamic Step Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* STEP 1: TEAM & SUBTEAM SELECTION */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5 px-0.5">
                    1. Ana Ekip Grubunuzu Seçin
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {TEAM_GROUPS.map((group) => {
                      const isSelected = selectedGroup === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleSelectTeam(group.id, selectedSubteam)}
                          className={`relative p-2 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between h-18 sm:h-20 select-none touch-manipulation ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/50 shadow-sm shadow-primary-500/15 ring-2 ring-primary-400/30 scale-[1.02]'
                              : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${group.badgeBg}`}>
                              {group.tag}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 block">
                              {group.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5 px-0.5">
                    2. {selectedGroup} Ekibi için Alt Ekibinizi Seçin
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {(['1', '2', '3', '4'] as const).map((num) => {
                      const teamCode = `${selectedGroup}${num}`;
                      const isSelected = selectedSubteam === num;

                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSelectTeam(selectedGroup, num)}
                          className={`py-2 px-1 rounded-xl text-center font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 touch-manipulation ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/25 ring-2 ring-primary-400/40 scale-[1.03]'
                              : 'bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-700/80'
                          }`}
                        >
                          <span className="text-sm font-black tracking-wide">{teamCode}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isSelected ? '✓ Seçili' : 'Seç'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live mini preview of chosen team cycle */}
                {currentSelectedPattern && (
                  <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs px-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-primary-500" />
                        <span>{currentSelectedTeamCode} Ekibi (32 Günlük Döngü)</span>
                      </div>
                      <span className="text-[9px] bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold px-2 py-0.5 rounded-full">
                        {isApplyingTeam ? 'Uygulanıyor...' : 'Takvimde Aktif'}
                      </span>
                    </div>

                    {/* First 8 days preview */}
                    <div className="grid grid-cols-8 gap-1">
                      {currentSelectedPattern.days.slice(0, 8).map((day, idx) => (
                        <div
                          key={day.id || idx}
                          className="rounded-lg p-0.5 text-center select-none text-white flex flex-col justify-between aspect-square"
                          style={{ backgroundColor: day.color }}
                          title={`${idx + 1}. Gün: ${day.name} (${day.startTime || 'Off'})`}
                        >
                          <span className="text-[7px] font-bold opacity-80 leading-none">{idx + 1}</span>
                          <span className="text-[8px] font-black leading-tight truncate px-0.5">
                            {day.name}
                          </span>
                          <span className="text-[6px] font-mono opacity-85 truncate leading-none">
                            {day.type === 'WORK' && day.startTime ? day.startTime.slice(0, 5) : 'Off'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: THEME SELECTION */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="text-center pb-0.5">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {t('theme', 'Uygulama Teması')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Bir seçenek belirleyin, arayüz anında dönüşsün.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Light Theme */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between h-24 sm:h-28 relative select-none touch-manipulation ${
                      theme === 'light'
                        ? 'border-primary-500 bg-primary-50/80 text-primary-800 shadow-sm shadow-primary-500/10 ring-2 ring-primary-300/50'
                        : 'border-slate-200/90 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs mb-1">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900 leading-tight">
                        {t('theme_light', 'Açık Tema')}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 block truncate max-w-full">
                        Aydınlık
                      </span>
                    </div>
                    {theme === 'light' && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />
                      </div>
                    )}
                  </button>

                  {/* Dark Theme */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between h-24 sm:h-28 relative select-none touch-manipulation ${
                      theme === 'dark'
                        ? 'border-primary-500 bg-primary-950/50 text-primary-300 shadow-sm shadow-primary-500/20 ring-2 ring-primary-400/40'
                        : 'border-slate-200/90 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center shadow-2xs mb-1">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-100 leading-tight">
                        {t('theme_dark', 'Koyu Tema')}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 block truncate max-w-full">
                        OLED Siyah
                      </span>
                    </div>
                    {theme === 'dark' && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />
                      </div>
                    )}
                  </button>

                  {/* System Theme */}
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between h-24 sm:h-28 relative select-none touch-manipulation ${
                      theme === 'system'
                        ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 shadow-sm shadow-primary-500/10 ring-2 ring-primary-300/40'
                        : 'border-slate-200/90 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-2xs mb-1">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900 dark:text-slate-100 leading-tight">
                        {t('theme_system', 'Sistem')}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 block truncate max-w-full">
                        Otomatik
                      </span>
                    </div>
                    {theme === 'system' && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                  </button>
                </div>

                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    💡 Temanızı daha sonra dilediğiniz an Ayarlar menüsünden değiştirebilirsiniz.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 3: CALENDAR VIEW & SHIFT STYLE */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* 1. CANLI İNTERAKTİF TAKVİM ÖNİZLEMESİ (EN ÜSTTE) */}
                <div className="bg-slate-100/80 dark:bg-slate-900/70 rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Palette className="w-3.5 h-3.5 text-primary-500" />
                      <span className="font-black text-slate-800 dark:text-slate-100">Canlı Takvim Önizlemesi</span>
                    </span>
                    <span className="text-[10px] text-primary-600 dark:text-primary-300 font-extrabold bg-primary-50 dark:bg-primary-950/70 px-2 py-0.5 rounded-full border border-primary-200/50 dark:border-primary-800/60">
                      {currentThemeDef.nameFallback}
                    </span>
                  </div>

                  {/* Official Theme-Accurate Mini Preview */}
                  <div className={`${currentThemeDef.containerBgClass} rounded-xl p-0.5`}>
                    <ThemeMiniPreview themeId={calendarTheme} displayMode={shiftDisplayMode} />
                  </div>
                </div>

                {/* 2. TAKVİM KART DÜZENİ (KOMPAKT 5 SEÇENEK) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Takvim Düzeni
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {currentThemeDef.tagFallback}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {CALENDAR_THEMES.map((th) => {
                      const isSelected = calendarTheme === th.id;
                      const IconComp = th.icon;

                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setCalendarTheme(th.id)}
                          className={`p-1.5 sm:p-2 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative select-none touch-manipulation ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/50 text-primary-800 dark:text-primary-300 shadow-xs ring-1 ring-primary-400/40 font-bold scale-[1.02]'
                              : 'border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 ${
                            isSelected
                              ? 'bg-primary-500 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-extrabold leading-tight block truncate max-w-full">
                            {t(th.tagKey, th.tagFallback)}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle2 className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. HÜCRE İÇİ VARDIYA BİÇİMİ (KOMPAKT 4 SEÇENEK - TEK SATIR) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Hücre İçi Vardiya Biçimi
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t(SHIFT_DISPLAY_MODES.find(m => m.id === shiftDisplayMode)?.labelKey || '', 'Yazı + Simge')}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {SHIFT_DISPLAY_MODES.map((mode) => {
                      const isSelected = shiftDisplayMode === mode.id;
                      const ModeIcon = mode.icon;

                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setShiftDisplayMode(mode.id)}
                          className={`p-1.5 sm:p-2 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative select-none touch-manipulation ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold shadow-xs ring-1 ring-primary-400/40 scale-[1.02]'
                              : 'border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 ${
                            isSelected
                              ? 'bg-primary-500 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <ModeIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-extrabold leading-tight block truncate max-w-full">
                            {t(mode.labelKey, mode.labelFallback)}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle2 className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: USER LOGIN & CLOUD SYNC */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center pb-1">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 mx-auto flex items-center justify-center mb-2 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Hesabınızı Bağlayın
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Vardiya düzenleriniz ve izin planlarınız tüm cihazlarınızda anlık eşitlensin, veri kaybı yaşamayın.
                  </p>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900/50">
                    {authError}
                  </div>
                )}

                {/* If user is already logged in */}
                {user ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                        {user.displayName ? user.displayName.slice(0, 1).toUpperCase() : '✓'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {user.displayName || 'Kullanıcı'}
                          </span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                            Hesap Bağlı
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      Verileriniz güvenle bulut hesabınıza eşitlenmektedir.
                    </p>
                  </div>
                ) : (
                  /* Auth Action Buttons */
                  <div className="space-y-2.5">
                    {/* Google Login Button */}
                    <button
                      type="button"
                      disabled={isGoogleLoading}
                      onClick={handleGoogleSignIn}
                      className="w-full py-3 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-sm flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      {/* Google G logo */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>{isGoogleLoading ? 'Giriş Yapılıyor...' : 'Google ile Hızlı Giriş Yap'}</span>
                    </button>

                    {/* Email / Password button */}
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-slate-500" />
                      <span>E-posta ve Şifre ile Giriş / Kayıt Ol</span>
                    </button>
                  </div>
                )}

                {/* Guest option */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                      i
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('onboarding_guest_continue', 'Giriş Yapmadan Devam Edebilirsiniz')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('onboarding_guest_notice', 'Verileriniz tarayıcınızın güvenli yerel hafızasında saklanır. İstediğiniz zaman Ayarlar menüsünden Google hesabınızı bağlayabilirsiniz.')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: READY & SUMMARY */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-center"
              >
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Rocket className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Harika, Vardiya Takviminiz Hazır!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Tercihleriniz uygulandı. Artık vardiyalarınızı, resmi tatilleri ve yıllık izin fırsatlarınızı tek ekranda takip edebilirsiniz.
                  </p>
                </div>

                {/* Configuration Summary Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-left space-y-2.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Kurulum Özeti
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                        Seçilen Ekip
                      </span>
                      <span className="font-black text-primary-600 dark:text-primary-400 text-sm">
                        {currentSelectedTeamCode} Ekibi
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                        Uygulama Teması
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm capitalize">
                        {theme === 'system' ? 'Sistem (Otomatik)' : theme === 'dark' ? 'Koyu Tema' : 'Açık Tema'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                        Takvim Görünümü
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-xs">
                        {currentThemeDef.nameFallback}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                        Hesap Durumu
                      </span>
                      <span className="font-black text-xs text-slate-800 dark:text-slate-200 truncate block">
                        {user ? 'Bulut Eşitlemesi Aktif' : 'Cihazda Yerel Saklama'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>{t('onboarding_finish_btn', 'Vardiya Takvimimi Aç 🚀')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Bottom Footer Navigation (Steps 1 to 4) */}
        {currentStep < 5 && (
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t('onboarding_back', 'Geri')}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black shadow-md shadow-primary-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <span>{t('onboarding_next', 'Devam Et')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
export default OnboardingWizard;
