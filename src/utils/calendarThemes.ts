import {
  Grid,
  Layers,
  Sparkles,
  LayoutGrid,
  SquareDashedBottomCode,
  Type,
  Smile,
  Minus,
  type LucideIcon,
} from 'lucide-react';

export type CalendarThemeId =
  | 'seamless'
  | 'modern-rounded'
  | 'minimal-capsule'
  | 'glass-glow'
  | 'compact-bar';

export type ShiftDisplayMode = 'both' | 'text' | 'icon' | 'none';

export interface ShiftDisplayModeDefinition {
  id: ShiftDisplayMode;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  icon: LucideIcon;
}

export const SHIFT_DISPLAY_MODES: ShiftDisplayModeDefinition[] = [
  {
    id: 'both',
    labelKey: 'display_mode_both',
    labelFallback: 'Yazı + Simge',
    descKey: 'display_mode_both_desc',
    descFallback: 'İsim ve simge birlikte',
    icon: Layers,
  },
  {
    id: 'text',
    labelKey: 'display_mode_text',
    labelFallback: 'Sadece Yazı',
    descKey: 'display_mode_text_desc',
    descFallback: 'Yalnızca vardiya adı',
    icon: Type,
  },
  {
    id: 'icon',
    labelKey: 'display_mode_icon',
    labelFallback: 'Sadece Simge',
    descKey: 'display_mode_icon_desc',
    descFallback: 'Yalnızca simge odaklı',
    icon: Smile,
  },
  {
    id: 'none',
    labelKey: 'display_mode_none',
    labelFallback: 'Sadece Renk (Boş)',
    descKey: 'display_mode_none_desc',
    descFallback: 'Yazısız ve simgesiz sade renk',
    icon: Minus,
  },
];

export const DEFAULT_SHIFT_DISPLAY_MODE: ShiftDisplayMode = 'both';

export interface CalendarThemeDefinition {
  id: CalendarThemeId;
  nameKey: string;
  nameFallback: string;
  descKey: string;
  descFallback: string;
  tagKey: string;
  tagFallback: string;
  icon: LucideIcon;
  gapClass: string;
  rowPaddingClass: string;
  containerBgClass: string;
}

export const CALENDAR_THEMES: CalendarThemeDefinition[] = [
  {
    id: 'seamless',
    nameKey: 'theme_seamless_name',
    nameFallback: 'Bitişik / Blok',
    descKey: 'theme_seamless_desc',
    descFallback: 'Boşluksuz tam dolgu, kesintisiz ve net akış.',
    tagKey: 'theme_seamless_tag',
    tagFallback: 'Klasik Blok',
    icon: Grid,
    gapClass: 'gap-0',
    rowPaddingClass: 'px-0 py-0',
    containerBgClass: 'bg-transparent',
  },
  {
    id: 'modern-rounded',
    nameKey: 'theme_rounded_name',
    nameFallback: 'Oval Modern Kartlar',
    descKey: 'theme_rounded_desc',
    descFallback: 'Günler arası boşluklu, yuvarlak köşeli ferah kartlar.',
    tagKey: 'theme_rounded_tag',
    tagFallback: 'Oval & Ferah',
    icon: Layers,
    gapClass: 'gap-1.5 sm:gap-2',
    rowPaddingClass: 'px-2 py-1',
    containerBgClass: 'bg-slate-100/40 dark:bg-slate-900/30',
  },
  {
    id: 'minimal-capsule',
    nameKey: 'theme_capsule_name',
    nameFallback: 'Kapsül & Minimal',
    descKey: 'theme_capsule_desc',
    descFallback: 'Nötr zemin üzerine renkli hap rozetler ve ikonlar.',
    tagKey: 'theme_capsule_tag',
    tagFallback: 'Zarif & Sade',
    icon: Sparkles,
    gapClass: 'gap-1.5 sm:gap-2',
    rowPaddingClass: 'px-2 py-1',
    containerBgClass: 'bg-slate-100/50 dark:bg-slate-900/40',
  },
  {
    id: 'glass-glow',
    nameKey: 'theme_glass_name',
    nameFallback: 'Neon Cam (Glass)',
    descKey: 'theme_glass_desc',
    descFallback: 'Buzlu cam dokusu ve vardiya rengi neon kenarlıklar.',
    tagKey: 'theme_glass_tag',
    tagFallback: 'Neon & OLED',
    icon: LayoutGrid,
    gapClass: 'gap-1.5 sm:gap-2',
    rowPaddingClass: 'px-2 py-1',
    containerBgClass: 'bg-slate-950/20 dark:bg-black/30',
  },
  {
    id: 'compact-bar',
    nameKey: 'theme_bar_name',
    nameFallback: 'Sol Çizgili / Vurgulu',
    descKey: 'theme_bar_desc',
    descFallback: 'Sol kenarda vardiya renk çizgisi ve net tipografi.',
    tagKey: 'theme_bar_tag',
    tagFallback: 'Net & Odaklı',
    icon: SquareDashedBottomCode,
    gapClass: 'gap-1 sm:gap-1.5',
    rowPaddingClass: 'px-1.5 py-0.5',
    containerBgClass: 'bg-slate-100/30 dark:bg-slate-900/20',
  },
];

export const DEFAULT_CALENDAR_THEME: CalendarThemeId = 'seamless';

export function getCalendarThemeDefinition(id?: CalendarThemeId): CalendarThemeDefinition {
  const found = CALENDAR_THEMES.find((t) => t.id === id);
  return found || CALENDAR_THEMES[0];
}

