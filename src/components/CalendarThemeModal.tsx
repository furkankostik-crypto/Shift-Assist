import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Palette,
  CalendarHeart,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  CALENDAR_THEMES,
  SHIFT_DISPLAY_MODES,
  type CalendarThemeId,
  type ShiftDisplayMode,
} from '../utils/calendarThemes';

interface CalendarThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample mini days for preview
const PREVIEW_DAYS = [
  { day: 17, name: 'Sabah', time: '08:00', color: '#3b82f6', icon: Sun, type: 'WORK' },
  { day: 18, name: 'Öğle', time: '16:00', color: '#f59e0b', icon: Sunset, type: 'WORK' },
  { day: 19, name: 'Gece', time: '00:00', color: '#8b5cf6', icon: Moon, type: 'WORK', holiday: '29 Ekim' },
  { day: 20, name: 'Off', time: 'İzin', color: '#10b981', icon: Coffee, type: 'REST' },
];

const THEME_SHORT_NAMES: Record<CalendarThemeId, string> = {
  'seamless': 'Blok',
  'modern-rounded': 'Oval',
  'minimal-capsule': 'Kapsül',
  'glass-glow': 'Neon',
  'compact-bar': 'Çizgili',
};

export const CalendarThemeModal: React.FC<CalendarThemeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    calendarTheme,
    setCalendarTheme,
    shiftDisplayMode,
    setShiftDisplayMode,
  } = useAppStore();

  if (!isOpen) return null;

  const activeThemeDef = CALENDAR_THEMES.find((t) => t.id === calendarTheme) || CALENDAR_THEMES[0];
  const activeModeDef = SHIFT_DISPLAY_MODES.find((m) => m.id === shiftDisplayMode) || SHIFT_DISPLAY_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop click */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className="relative bg-card w-full max-w-md sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col z-10 overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header - Compact */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2 sm:px-5 sm:pt-4 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-100/80 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-2xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
                {t('calendar_view_options', 'Takvim Görünümü')}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                {t('calendar_view_subtitle', 'Görünüm ve vardiya gösterim biçimi')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Compact single-screen layout */}
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* 1. ÜSTTE TEK CANLI ÖNİZLEME */}
          <div className="bg-slate-100/80 dark:bg-slate-900/70 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Canlı Önizleme
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/70 px-2 py-0.5 rounded-full border border-primary-200/60 dark:border-primary-800/60">
                {t(activeThemeDef.nameKey, activeThemeDef.nameFallback)}
              </span>
            </div>

            {/* Rendered Live Preview with active theme container background */}
            <div className={`${activeThemeDef.containerBgClass} rounded-xl p-0.5 transition-colors`}>
              <ThemeMiniPreview themeId={calendarTheme} displayMode={shiftDisplayMode} />
            </div>
          </div>

          {/* 2. TAKVİM HÜCRE TEMASI - KOMPAKT VE YANYANA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('calendar_view_themes_title', 'Takvim Hücre Teması')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {t(activeThemeDef.tagKey, activeThemeDef.tagFallback)}
              </span>
            </div>

            {/* 5 Themes Grid - Side-by-Side in 1 row */}
            <div className="grid grid-cols-5 gap-1.5">
              {CALENDAR_THEMES.map((theme) => {
                const isSelected = calendarTheme === theme.id;
                const ThemeIcon = theme.icon;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCalendarTheme(theme.id)}
                    className={`p-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative select-none touch-manipulation ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-black shadow-xs ring-1 ring-primary-500/30 scale-[1.02]'
                        : 'border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 transition-colors ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <ThemeIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-extrabold leading-tight block truncate max-w-full">
                      {THEME_SHORT_NAMES[theme.id] || t(theme.tagKey, theme.tagFallback)}
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
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 px-1 truncate">
              {t(activeThemeDef.descKey, activeThemeDef.descFallback)}
            </p>
          </div>

          {/* 3. VARDIYA GÖSTERİM ŞEKLİ - KOMPAKT VE YANYANA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('calendar_view_display_title', 'Vardiya Gösterim Şekli')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {t(activeModeDef.labelKey, activeModeDef.labelFallback)}
              </span>
            </div>

            {/* 4 Shift Display Modes - Side-by-Side in 1 row */}
            <div className="grid grid-cols-4 gap-1.5">
              {SHIFT_DISPLAY_MODES.map((mode) => {
                const isSelected = shiftDisplayMode === mode.id;
                const ModeIcon = mode.icon;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setShiftDisplayMode(mode.id)}
                    className={`p-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative select-none touch-manipulation ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-black shadow-xs ring-1 ring-primary-500/30 scale-[1.02]'
                        : 'border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 transition-colors ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
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
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 px-1 truncate">
              {t(activeModeDef.descKey, activeModeDef.descFallback)}
            </p>
          </div>
        </div>

        {/* Modal Footer - Compact */}
        <div className="px-3.5 pb-3.5 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-black text-xs sm:text-sm shadow-sm shadow-primary-500/25 active:scale-98 transition-all cursor-pointer"
          >
            {t('close', 'Kapat')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Mini preview component rendering the specific visual layout
export interface ThemeMiniPreviewProps {
  themeId: CalendarThemeId;
  displayMode: ShiftDisplayMode;
}

export const ThemeMiniPreview: React.FC<ThemeMiniPreviewProps> = ({ themeId, displayMode }) => {
  switch (themeId) {
    case 'seamless':
      // 1. Seamless / Block Grid
      return (
        <div className="grid grid-cols-4 gap-0 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
          {PREVIEW_DAYS.map((d, i) => {
            const IconComp = d.icon;
            const hasHoliday = Boolean((d as any).holiday);
            return (
              <div
                key={i}
                style={{ backgroundColor: d.color }}
                className="p-1 sm:p-1.5 flex flex-col items-center justify-center h-12 border-r last:border-r-0 border-black/10 dark:border-white/10 text-white relative overflow-hidden"
              >
                <div className="absolute top-1 left-1 right-1 flex justify-between items-center text-[10px] font-black">
                  <span>{d.day}</span>
                  {hasHoliday ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-black/30 text-white flex items-center justify-center shadow-2xs ring-1 ring-white/40 shrink-0">
                      <CalendarHeart className="w-2 h-2 text-white shrink-0" />
                    </span>
                  ) : null}
                </div>

                <div className="w-full text-center px-0.5 mt-2">
                  {displayMode === 'both' && (
                    <div className="font-black text-[8.5px] truncate w-full text-center drop-shadow-2xs leading-tight flex items-center justify-center gap-0.5">
                      <IconComp className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </div>
                  )}
                  {displayMode === 'text' && (
                    <span className="font-black text-[9px] truncate w-full text-center drop-shadow-2xs leading-tight block">
                      {d.name}
                    </span>
                  )}
                  {displayMode === 'icon' && (
                    <div className="flex items-center justify-center">
                      <IconComp className="w-4 h-4 opacity-95 drop-shadow-xs" />
                    </div>
                  )}
                  {displayMode === 'none' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 mx-auto" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );

    case 'modern-rounded':
      // 2. Modern Rounded Cards (Tinted & Balanced)
      return (
        <div className="grid grid-cols-4 gap-1.5 p-0.5">
          {PREVIEW_DAYS.map((d, i) => {
            const IconComp = d.icon;
            const hasHoliday = Boolean((d as any).holiday);
            return (
              <div
                key={i}
                style={{
                  backgroundColor: `${d.color}20`,
                  borderColor: `${d.color}45`,
                }}
                className="p-1 sm:p-1.5 rounded-xl border flex flex-col items-center justify-center h-12 relative overflow-hidden shadow-2xs"
              >
                <div className="absolute top-1 left-1.5 right-1.5 flex justify-between items-center text-[10px] font-black text-slate-800 dark:text-slate-100">
                  <span>{d.day}</span>
                  {hasHoliday ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <CalendarHeart className="w-2 h-2 text-white shrink-0" />
                    </span>
                  ) : null}
                </div>

                <div className="w-full text-center px-0.5 mt-2">
                  {displayMode === 'both' && (
                    <div
                      style={{ color: d.color }}
                      className="font-extrabold text-[8.5px] truncate w-full text-center leading-tight flex items-center justify-center gap-0.5"
                    >
                      <IconComp className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </div>
                  )}
                  {displayMode === 'text' && (
                    <span
                      style={{ color: d.color }}
                      className="font-extrabold text-[9px] truncate w-full text-center leading-tight block"
                    >
                      {d.name}
                    </span>
                  )}
                  {displayMode === 'icon' && (
                    <div style={{ color: d.color }} className="flex items-center justify-center">
                      <IconComp className="w-4 h-4" />
                    </div>
                  )}
                  {displayMode === 'none' && (
                    <div
                      style={{ backgroundColor: d.color }}
                      className="w-2 h-2 rounded-full mx-auto opacity-80"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );

    case 'minimal-capsule':
      // 3. Minimalist Capsule Badges
      return (
        <div className="grid grid-cols-4 gap-1.5 p-0.5">
          {PREVIEW_DAYS.map((d, i) => {
            const IconComp = d.icon;
            const hasHoliday = Boolean((d as any).holiday);
            return (
              <div
                key={i}
                className="p-1 rounded-xl bg-card border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center h-12 shadow-2xs relative"
              >
                <div className="absolute top-1 left-1.5 right-1.5 flex justify-between items-center text-[10px] font-black text-slate-800 dark:text-slate-200">
                  <span>{d.day}</span>
                  {hasHoliday ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <CalendarHeart className="w-2 h-2 text-white shrink-0" />
                    </span>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  )}
                </div>

                <div className="w-full px-0.5 mt-2">
                  {displayMode === 'both' && (
                    <div
                      style={{ backgroundColor: d.color }}
                      className="w-full py-0.5 px-0.5 rounded-full text-white text-[7.5px] font-extrabold text-center truncate shadow-2xs flex items-center justify-center gap-0.5"
                    >
                      <IconComp className="w-2 h-2 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </div>
                  )}
                  {displayMode === 'text' && (
                    <div
                      style={{ backgroundColor: d.color }}
                      className="w-full py-0.5 px-0.5 rounded-full text-white text-[7.5px] font-extrabold text-center truncate shadow-2xs"
                    >
                      {d.name}
                    </div>
                  )}
                  {displayMode === 'icon' && (
                    <div
                      style={{ backgroundColor: d.color }}
                      className="py-0.5 px-1.5 rounded-full text-white shadow-2xs flex items-center justify-center mx-auto w-fit"
                    >
                      <IconComp className="w-2.5 h-2.5 shrink-0" />
                    </div>
                  )}
                  {displayMode === 'none' && (
                    <div
                      style={{ backgroundColor: d.color }}
                      className="w-4 h-1 rounded-full shadow-2xs mx-auto opacity-80"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );

    case 'glass-glow':
      // 4. Neon Glass (High-Performance CSS)
      return (
        <div className="grid grid-cols-4 gap-1.5 p-0.5">
          {PREVIEW_DAYS.map((d, i) => {
            const IconComp = d.icon;
            const hasHoliday = Boolean((d as any).holiday);
            return (
              <div
                key={i}
                style={{
                  borderColor: `${d.color}75`,
                  backgroundColor: `${d.color}14`,
                }}
                className="p-1 sm:p-1.5 rounded-xl border flex flex-col items-center justify-center h-12 shadow-2xs relative overflow-hidden"
              >
                <div className="absolute top-1 left-1.5 right-1.5 flex justify-between items-center text-[10px] font-black text-slate-900 dark:text-slate-100 z-10">
                  <span>{d.day}</span>
                  {hasHoliday ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <CalendarHeart className="w-2 h-2" />
                    </span>
                  ) : (
                    <div
                      className="w-1.5 h-1.5 rounded-full ring-2"
                      style={{
                        backgroundColor: d.color,
                        boxShadow: `0 0 0 2px ${d.color}40`,
                      }}
                    />
                  )}
                </div>

                <div className="w-full text-center px-0.5 mt-2 z-10">
                  {displayMode === 'both' && (
                    <span
                      style={{ color: d.color }}
                      className="font-black text-[8.5px] truncate w-full text-center leading-tight flex items-center justify-center gap-0.5"
                    >
                      <IconComp className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </span>
                  )}
                  {displayMode === 'text' && (
                    <span
                      style={{ color: d.color }}
                      className="font-black text-[9px] truncate w-full text-center leading-tight block"
                    >
                      {d.name}
                    </span>
                  )}
                  {displayMode === 'icon' && (
                    <div style={{ color: d.color }} className="flex items-center justify-center">
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  )}
                  {displayMode === 'none' && (
                    <div
                      style={{ backgroundColor: d.color }}
                      className="w-4 h-1 rounded-full opacity-80 mx-auto"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );

    case 'compact-bar':
      // 5. Left Accent Bar
      return (
        <div className="grid grid-cols-4 gap-1 p-0.5">
          {PREVIEW_DAYS.map((d, i) => {
            const IconComp = d.icon;
            const hasHoliday = Boolean((d as any).holiday);
            return (
              <div
                key={i}
                className="p-1 rounded-lg bg-card border border-slate-200/80 dark:border-slate-800 flex flex-col justify-center h-12 shadow-2xs relative pl-2 overflow-hidden"
              >
                {/* Colored Left Accent Bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-sm"
                  style={{ backgroundColor: d.color }}
                />
                <div className="absolute top-1 left-2 right-1.5 flex justify-between items-center text-[10px] font-black text-slate-800 dark:text-slate-200">
                  <span>{d.day}</span>
                  {hasHoliday ? (
                    <span className="w-3 h-3 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <CalendarHeart className="w-1.5 h-1.5 text-white shrink-0" />
                    </span>
                  ) : displayMode === 'both' ? (
                    <IconComp className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  ) : null}
                </div>

                <div className="mt-2">
                  {displayMode === 'both' && (
                    <div
                      style={{ color: d.color }}
                      className="font-extrabold text-[8px] truncate leading-tight flex items-center gap-0.5"
                    >
                      <IconComp className="w-2 h-2 shrink-0 opacity-85" />
                      <span className="truncate">{d.name}</span>
                    </div>
                  )}
                  {displayMode === 'text' && (
                    <span
                      style={{ color: d.color }}
                      className="font-extrabold text-[8px] truncate block leading-tight"
                    >
                      {d.name}
                    </span>
                  )}
                  {displayMode === 'icon' && (
                    <div style={{ color: d.color }} className="flex items-center">
                      <IconComp className="w-3 h-3 shrink-0" />
                    </div>
                  )}
                  {displayMode === 'none' && null}
                </div>
              </div>
            );
          })}
        </div>
      );

    default:
      return null;
  }
};

