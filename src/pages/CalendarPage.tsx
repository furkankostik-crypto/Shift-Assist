import React, { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isSunday,
} from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  Clock,
  Coffee,
  Briefcase,
  HeartPulse,
  Sparkles,
  Palette,
  X,
  CheckCircle2,
  Trash2,
  CalendarDays,
  CalendarCheck,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  hapticTap,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '../utils/haptics';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ShiftException, type ShiftDay, type ShiftType } from '../db/db';
import { getShiftForDate, resolveShiftDayWithTypes } from '../utils/shiftLogic';
import {
  getHolidayDetail,
  getHolidayBadgeColors,
  formatToFullDateFast,
  type HolidayDetail,
  type HolidayBadgeColors,
} from '../utils/holidays';
import {
  applyLeaveOpportunityToCalendar,
  isOfficialHoliday,
  findPrecedingOffDays,
  findSucceedingOffDays,
} from '../utils/leavePlanner';
import { getShiftIconComponent, ShiftIcon } from '../utils/shiftIcons';
import { type CalendarThemeId, type ShiftDisplayMode } from '../utils/calendarThemes';
import { CalendarThemeModal } from '../components/CalendarThemeModal';
import { QuickTeamSelectorSheet } from '../components/QuickTeamSelectorSheet';
import { triggerAutoSync } from '../services/syncService';

export type LeaveDayRole =
  | 'LEAVE'
  | 'SUNDAY'
  | 'HOLIDAY'
  | 'PRECEDING_OFF'
  | 'SUCCEEDING_OFF'
  | 'IN_BETWEEN_OFF';

export interface LeaveRangeVisualInfo {
  type: 'PREVIEW' | 'SAVED';
  role: LeaveDayRole;
  isVacationStart: boolean; // First day of entire vacation span
  isVacationEnd: boolean;   // Last day of entire vacation span
  isFormalStart: boolean;   // First day of formal annual leave
  isFormalEnd: boolean;     // Last day of formal annual leave
  isRowStart: boolean;      // Monday or vacation start
  isRowEnd: boolean;        // Sunday or vacation end
  dayIndex?: number;
  totalDays?: number;
  formalDaysCount?: number;
  title?: string;
  startDateStr: string;
  endDateStr: string;
  formalStartDateStr: string;
  formalEndDateStr: string;
}

// Helper to determine the best matching visual icon for a shift or exception
function getShiftVisualProps(
  shiftName?: string,
  shiftType?: 'WORK' | 'REST',
  exceptionType?: string,
  shiftIcon?: string,
  customVacationIcon?: string,
  customSickIcon?: string
) {
  if (exceptionType === 'VACATION') {
    return {
      icon: getShiftIconComponent(customVacationIcon || 'Palmtree', 'REST', 'Yıllık İzin'),
      isRest: true,
      label: 'Yıllık İzin',
    };
  }
  if (exceptionType === 'SICK') {
    return {
      icon: getShiftIconComponent(customSickIcon || 'HeartPulse', 'REST', 'Rapor'),
      isRest: true,
      label: 'Rapor',
    };
  }
  if (exceptionType === 'DUTY') {
    return { icon: Briefcase, isRest: false, label: 'Görev' };
  }
  if (exceptionType === 'OTHER') {
    return { icon: Sparkles, isRest: false, label: 'Özel' };
  }

  const iconComp = getShiftIconComponent(shiftIcon, shiftType, shiftName);
  return {
    icon: iconComp,
    isRest: shiftType === 'REST',
    label: shiftName || (shiftType === 'REST' ? 'Off' : 'Vardiya'),
  };
}

// ---------------------------------------------------------------------------
// LeaveFrameOverlay: Outer border / frame component for seamless & other themes
// ---------------------------------------------------------------------------
const LeaveFrameOverlay: React.FC<{
  visual: LeaveRangeVisualInfo;
  vacationColor: string;
}> = ({ visual, vacationColor }) => {
  const isPreview = visual.type === 'PREVIEW';

  return (
    <div
      style={{
        borderColor: vacationColor,
        boxShadow: isPreview
          ? `inset 0 0 8px ${vacationColor}55`
          : `inset 0 0 4px ${vacationColor}35`,
      }}
      className={`absolute inset-0 pointer-events-none z-20 transition-all border-2 ${
        visual.isRowStart ? 'border-l-3 sm:border-l-4 rounded-l-xs' : 'border-l-0'
      } ${
        visual.isRowEnd ? 'border-r-3 sm:border-r-4 rounded-r-xs' : 'border-r-0'
      } border-t-2 border-b-2`}
    >
      {/* Corner Badges ONLY on true start and end days */}
      {visual.isVacationStart ? (
        <span
          style={{ backgroundColor: vacationColor }}
          className="absolute -top-1.5 left-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[7px] sm:text-[7.5px] leading-tight tracking-tight shadow-2xs uppercase"
        >
          Tatil Başı
        </span>
      ) : visual.isFormalStart ? (
        <span
          style={{ backgroundColor: vacationColor }}
          className="absolute -top-1.5 left-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[7px] sm:text-[7.5px] leading-tight tracking-tight shadow-2xs uppercase"
        >
          İzin Başla
        </span>
      ) : null}

      {visual.isVacationEnd ? (
        <span
          style={{ backgroundColor: vacationColor }}
          className="absolute -bottom-1.5 right-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[7px] sm:text-[7.5px] leading-tight tracking-tight shadow-2xs uppercase"
        >
          Tatil Sonu
        </span>
      ) : visual.isFormalEnd ? (
        <span
          style={{ backgroundColor: vacationColor }}
          className="absolute -bottom-1.5 right-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[7px] sm:text-[7.5px] leading-tight tracking-tight shadow-2xs uppercase"
        >
          İzin Bitiş
        </span>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// DayCell Component: Ultra-fast individual day renderer with leave frame
// ---------------------------------------------------------------------------
interface DayCellProps {
  day: Date;
  dayStr: string;
  dayNumber: string;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  calendarTheme: CalendarThemeId;
  shiftDisplayMode: ShiftDisplayMode;
  shiftDay: ShiftDay | null;
  exception: ShiftException | undefined;
  holidayDetail: HolidayDetail | null;
  holidayColors: HolidayBadgeColors | null;
  leaveVisual: LeaveRangeVisualInfo | null;
  customVacationColor: string;
  customVacationIcon: string;
  customVacationName: string;
  customHolidayColor: string;
  customHolidayIcon: string;
  customHolidayName: string;
  isLoading?: boolean;
  onSelectDate: (date: Date) => void;
}

const areDayCellPropsEqual = (prev: DayCellProps, next: DayCellProps): boolean => {
  return (
    prev.isLoading === next.isLoading &&
    prev.isSelected === next.isSelected &&
    prev.isToday === next.isToday &&
    prev.isCurrentMonth === next.isCurrentMonth &&
    prev.dayStr === next.dayStr &&
    prev.dayNumber === next.dayNumber &&
    prev.calendarTheme === next.calendarTheme &&
    prev.shiftDisplayMode === next.shiftDisplayMode &&
    prev.shiftDay === next.shiftDay &&
    prev.exception === next.exception &&
    prev.holidayDetail === next.holidayDetail &&
    prev.holidayColors === next.holidayColors &&
    prev.customVacationColor === next.customVacationColor &&
    prev.customVacationIcon === next.customVacationIcon &&
    prev.customVacationName === next.customVacationName &&
    prev.customHolidayColor === next.customHolidayColor &&
    prev.customHolidayIcon === next.customHolidayIcon &&
    prev.customHolidayName === next.customHolidayName &&
    prev.leaveVisual?.type === next.leaveVisual?.type &&
    prev.leaveVisual?.role === next.leaveVisual?.role &&
    prev.leaveVisual?.isVacationStart === next.leaveVisual?.isVacationStart &&
    prev.leaveVisual?.isVacationEnd === next.leaveVisual?.isVacationEnd &&
    prev.leaveVisual?.isFormalStart === next.leaveVisual?.isFormalStart &&
    prev.leaveVisual?.isFormalEnd === next.leaveVisual?.isFormalEnd &&
    prev.leaveVisual?.isRowStart === next.leaveVisual?.isRowStart &&
    prev.leaveVisual?.isRowEnd === next.leaveVisual?.isRowEnd &&
    prev.onSelectDate === next.onSelectDate
  );
};

const DayCell = React.memo(
  ({
    day,
    dayNumber,
    isSelected,
    isToday,
    isCurrentMonth,
    calendarTheme,
    shiftDisplayMode,
    shiftDay,
    exception,
    holidayDetail,
    holidayColors,
    leaveVisual,
    customVacationColor,
    customVacationIcon,
    customVacationName,
    customHolidayColor,
    customHolidayIcon,
    customHolidayName,
    isLoading = false,
    onSelectDate,
  }: DayCellProps) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const isHoliday = Boolean(holidayDetail);
    const isDirectVacation = exception?.type === 'VACATION';

    // All days inside the uninterrupted vacation span (preceding off, leave, sunday, holiday, succeeding off)
    // are displayed with the unified Annual Leave / Vacation visual style!
    const isVacation = isDirectVacation || Boolean(leaveVisual);
    const isLeavePreview = leaveVisual?.type === 'PREVIEW';
    const hasLeaveVisual = Boolean(leaveVisual);

    // Color resolution with custom system types support
    const baseDisplayColor = isVacation
      ? customVacationColor
      : exception
      ? exception.color
      : shiftDay?.color || undefined;

    const isRestShift =
      isVacation || exception?.type === 'SICK' || shiftDay?.type === 'REST';
    const shiftColor = baseDisplayColor || (isRestShift ? '#10b981' : undefined);

    const hasShift = Boolean(shiftColor) || hasLeaveVisual;
    const cellBg = isVacation
      ? customVacationColor
      : shiftColor || (isHoliday ? customHolidayColor || holidayColors?.accentColor || '#e11d48' : undefined);

    const shiftIconName = isVacation
      ? customVacationIcon
      : shiftDay?.icon;

    const activeShiftName = isVacation
      ? leaveVisual?.role === 'PRECEDING_OFF'
        ? 'Tatil Başı Off'
        : leaveVisual?.role === 'SUCCEEDING_OFF'
        ? 'Tatil Sonu Off'
        : leaveVisual?.role === 'SUNDAY'
        ? 'Pazar Tatili'
        : leaveVisual?.role === 'HOLIDAY'
        ? 'Resmi Tatil'
        : isLeavePreview
        ? 'İzin Önizleme'
        : customVacationName
      : exception?.name || shiftDay?.name;

    const holidayTooltip = holidayDetail
      ? `${holidayDetail.name} • ${
          holidayDetail.isHalfDay
            ? 'Yarım Gün Tatil'
            : holidayDetail.isOfficial
            ? customHolidayName || 'Resmi Tatil'
            : 'Özel Gün'
        }`
      : undefined;

    const handleClick = useCallback(() => {
      hapticTap();
      onSelectDate(day);
    }, [day, onSelectDate]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick]
    );

    const cellAriaLabel = `${dayStr}${shiftDay?.name ? ' - ' + shiftDay.name : ''}${holidayDetail ? ' - ' + holidayDetail.name : ''}`;

    // THEME 1: SEAMLESS (Bitişik / Blok)
    if (calendarTheme === 'seamless') {
      return (
        <div
          role="button"
          tabIndex={0}
          data-date={dayStr}
          aria-label={cellAriaLabel}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          style={{
            backgroundColor: !isLoading && (hasShift || isHoliday) ? cellBg : undefined,
          }}
          className={`
            relative p-1 border-r border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-center cursor-pointer transition-colors duration-75 overflow-hidden select-none touch-manipulation
            ${
              isLoading || (!hasShift && !isHoliday)
                ? !isCurrentMonth
                  ? 'bg-card/40 opacity-35 hover:opacity-70'
                  : 'bg-card opacity-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                : !isCurrentMonth
                ? 'opacity-40 hover:opacity-75'
                : 'opacity-100 hover:brightness-105 active:scale-[0.98]'
            }
            ${
              isSelected
                ? !isLoading && (hasShift || isHoliday)
                  ? 'ring-2.5 ring-inset ring-white z-30 shadow-md !opacity-100'
                  : 'ring-2.5 ring-inset ring-primary-500 dark:ring-primary-400 z-30 shadow-md !opacity-100'
                : ''
            }
          `}
        >
          {/* Today Frame Overlay */}
          {isToday && (
            <div className="absolute inset-0 border-[3px] border-slate-900 dark:border-white pointer-events-none z-0" />
          )}

          {/* Leave Outer Frame Overlay */}
          {hasLeaveVisual && leaveVisual && (
            <LeaveFrameOverlay visual={leaveVisual} vacationColor={customVacationColor} />
          )}

          {/* Top Row */}
          <div className={`absolute w-full flex items-center justify-between z-10 leading-none ${isToday ? 'top-[5px] px-[5px]' : 'top-0.5 px-0.5'}`}>
            <span
              className={`transition-colors duration-75 ${
                isToday
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-md text-[10px] sm:text-xs font-black ring-2 ring-white/50 dark:ring-black/50'
                  : !isLoading && (hasShift || isHoliday)
                  ? 'text-white font-black text-xs sm:text-sm drop-shadow-2xs'
                  : !isCurrentMonth
                  ? 'text-slate-400 dark:text-slate-600 font-bold text-xs sm:text-sm'
                  : 'text-slate-800 dark:text-slate-100 font-black text-xs sm:text-sm'
              }`}
            >
              {dayNumber}
            </span>

            {!isLoading && isHoliday ? (
              <span
                className={`flex items-center justify-center p-0.5 rounded-full shadow-2xs shrink-0 ${
                  hasShift
                    ? 'bg-black/30 text-white ring-1 ring-white/40'
                    : 'bg-white text-rose-600 ring-1 ring-black/10'
                }`}
                title={holidayTooltip}
              >
                <ShiftIcon icon={customHolidayIcon} className="w-2.5 h-2.5 shrink-0" />
              </span>
            ) : !isLoading && isVacation ? (
              <span
                className="flex items-center justify-center p-0.5 rounded-full bg-white/90 text-slate-900 shadow-2xs"
                title={isLeavePreview ? 'İzin Önizleme' : customVacationName}
              >
                <ShiftIcon icon={customVacationIcon} className="w-2.5 h-2.5 shrink-0 text-amber-600" />
              </span>
            ) : !isLoading && exception ? (
              <span
                className="w-2 h-2 rounded-full bg-white ring-1 ring-black/20 shadow-2xs"
                title={exception.name}
              />
            ) : null}
          </div>

          {/* Middle Row */}
          <div className="w-full text-center px-0.5 z-10">
            {isLoading ? (
              <div className="w-6 sm:w-8 h-1.5 sm:h-2 bg-slate-300/40 dark:bg-slate-700/50 rounded-full mx-auto animate-pulse" />
            ) : hasShift ? (
              shiftDisplayMode === 'both' ? (
                <div className="font-black text-[9.5px] sm:text-[11px] text-white truncate leading-tight drop-shadow-2xs flex items-center justify-center gap-0.5 max-w-full">
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  />
                  <span className="truncate">{activeShiftName}</span>
                </div>
              ) : shiftDisplayMode === 'text' ? (
                <div className="font-black text-[10px] sm:text-xs text-white truncate leading-tight drop-shadow-2xs">
                  {activeShiftName}
                </div>
              ) : shiftDisplayMode === 'icon' ? (
                <div className="flex items-center justify-center text-white opacity-95 drop-shadow-xs">
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-white/70 mx-auto shadow-2xs" />
              )
            ) : isHoliday ? (
              <div className="font-black text-[9px] sm:text-[10px] text-white leading-tight line-clamp-2 drop-shadow-2xs px-0.5">
                {holidayDetail?.shortName}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    // THEME 2: MODERN ROUNDED (Oval Modern Kartlar) - High Contrast & Continuous Border
    if (calendarTheme === 'modern-rounded') {
      const cardBorderColor = isVacation
        ? customVacationColor
        : hasShift
        ? `${shiftColor}60`
        : isHoliday
        ? `${customHolidayColor}60`
        : undefined;

      const cardBgColor = isVacation
        ? `${customVacationColor}28` // High-contrast rich tint
        : hasShift
        ? `${shiftColor}20`
        : isHoliday
        ? `${customHolidayColor}20`
        : undefined;

      return (
        <div
          role="button"
          tabIndex={0}
          data-date={dayStr}
          aria-label={cellAriaLabel}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          style={{
            backgroundColor: !isLoading ? cardBgColor : undefined,
            borderColor: !isLoading ? cardBorderColor : undefined,
          }}
          className={`
            relative p-1 sm:p-1.5 border flex flex-col items-center justify-center cursor-pointer transition-colors duration-75 overflow-hidden select-none shadow-2xs touch-manipulation
            ${hasLeaveVisual && leaveVisual?.isRowStart ? 'rounded-l-2xl' : 'rounded-l-lg sm:rounded-l-xl'}
            ${hasLeaveVisual && leaveVisual?.isRowEnd ? 'rounded-r-2xl' : 'rounded-r-lg sm:rounded-r-xl'}
            ${
              isVacation
                ? 'border-2 ring-2 shadow-md'
                : ''
            }
            ${
              isLoading || (!hasShift && !isHoliday)
                ? !isCurrentMonth
                  ? 'bg-card/40 border-slate-200/40 dark:border-slate-800/40 opacity-35 hover:opacity-70'
                  : 'bg-card border-slate-200/80 dark:border-slate-800 opacity-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                : !isCurrentMonth
                ? 'opacity-40 hover:opacity-75'
                : 'opacity-100 hover:brightness-105 active:scale-[0.97]'
            }
            ${
              isSelected
                ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-1 dark:ring-offset-slate-950 z-30 shadow-md scale-[0.98] !opacity-100'
                : ''
            }
          `}
        >
          {/* Today Frame Overlay */}
          {isToday && (
            <div className={`absolute inset-0 border-[3px] border-slate-900 dark:border-white pointer-events-none z-0 ${hasLeaveVisual && leaveVisual?.isRowStart ? 'rounded-l-2xl' : 'rounded-l-lg sm:rounded-l-xl'} ${hasLeaveVisual && leaveVisual?.isRowEnd ? 'rounded-r-2xl' : 'rounded-r-lg sm:rounded-r-xl'}`} />
          )}

          {/* Precise Corner Badges ONLY on exact start and end dates */}
          {leaveVisual?.isVacationStart ? (
            <span
              style={{ backgroundColor: customVacationColor }}
              className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[6px] sm:text-[7px] uppercase shadow-2xs"
            >
              Tatil Başı
            </span>
          ) : leaveVisual?.isFormalStart ? (
            <span
              style={{ backgroundColor: customVacationColor }}
              className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[6px] sm:text-[7px] uppercase shadow-2xs"
            >
              İzin Başla
            </span>
          ) : null}

          {leaveVisual?.isVacationEnd ? (
            <span
              style={{ backgroundColor: customVacationColor }}
              className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[6px] sm:text-[7px] uppercase shadow-2xs"
            >
              Tatil Sonu
            </span>
          ) : leaveVisual?.isFormalEnd ? (
            <span
              style={{ backgroundColor: customVacationColor }}
              className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded-xs text-slate-950 font-black text-[6px] sm:text-[7px] uppercase shadow-2xs"
            >
              İzin Bitiş
            </span>
          ) : null}

          {/* Top Row */}
          <div className="absolute top-1 w-full flex items-center justify-between px-0.5 z-10 leading-none">
            <span
              className={`transition-colors duration-75 ${
                isToday
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs font-black ring-2 ring-white/50 dark:ring-black/50'
                  : !isLoading && isHoliday && !hasShift
                  ? 'font-black text-xs sm:text-sm'
                  : !isCurrentMonth
                  ? 'text-slate-400 dark:text-slate-600 font-bold text-xs sm:text-sm'
                  : 'text-slate-800 dark:text-slate-100 font-black text-xs sm:text-sm'
              }`}
              style={{
                color: !isLoading && isHoliday && !hasShift && !isToday ? customHolidayColor : undefined,
              }}
            >
              {dayNumber}
            </span>

            {!isLoading && isHoliday ? (
              <span
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-white shadow-2xs shrink-0"
                style={{ backgroundColor: customHolidayColor }}
                title={holidayTooltip}
              >
                <ShiftIcon icon={customHolidayIcon} className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
              </span>
            ) : !isLoading && isVacation ? (
              <span
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center text-white shadow-2xs shrink-0"
                style={{ backgroundColor: customVacationColor }}
                title={isLeavePreview ? 'İzin Önizleme' : customVacationName}
              >
                <ShiftIcon icon={customVacationIcon} className="w-2 h-2 shrink-0 text-white" />
              </span>
            ) : null}
          </div>

          {/* Middle Row */}
          <div className="w-full text-center px-0.5 z-10">
            {isLoading ? (
              <div className="w-6 sm:w-8 h-1.5 sm:h-2 bg-slate-300/40 dark:bg-slate-700/50 rounded-full mx-auto animate-pulse" />
            ) : hasShift ? (
              shiftDisplayMode === 'both' ? (
                <div
                  style={{ color: shiftColor }}
                  className="font-extrabold text-[9.5px] sm:text-[11px] truncate leading-tight flex items-center justify-center gap-0.5 max-w-full"
                >
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  />
                  <span className="truncate">{activeShiftName}</span>
                </div>
              ) : shiftDisplayMode === 'text' ? (
                <div
                  style={{ color: shiftColor }}
                  className="font-extrabold text-[10px] sm:text-xs truncate leading-tight"
                >
                  {activeShiftName}
                </div>
              ) : shiftDisplayMode === 'icon' ? (
                <div style={{ color: shiftColor }} className="flex items-center justify-center">
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: shiftColor }}
                  className="w-2 h-2 rounded-full mx-auto opacity-80"
                />
              )
            ) : isHoliday ? (
              <div
                style={{ color: customHolidayColor }}
                className="font-extrabold text-[9px] sm:text-[10px] leading-tight line-clamp-2 px-0.5"
              >
                {holidayDetail?.shortName}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    // THEME 4: GLASS GLOW (Neon Cam)
    if (calendarTheme === 'glass-glow') {
      const neonBorder = isVacation
        ? customVacationColor
        : !isLoading && hasShift
        ? `${shiftColor}75`
        : isHoliday
        ? customHolidayColor
        : undefined;

      const neonBg = isVacation
        ? `${customVacationColor}25`
        : !isLoading && hasShift
        ? `${shiftColor}14`
        : isHoliday
        ? `${customHolidayColor}14`
        : undefined;

      const neonGlow = isVacation
        ? `0 0 14px ${customVacationColor}80`
        : isHoliday
        ? `0 0 12px ${customHolidayColor}60`
        : undefined;

      return (
        <div
          role="button"
          tabIndex={0}
          data-date={dayStr}
          aria-label={cellAriaLabel}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          style={{
            borderColor: !isLoading ? neonBorder : undefined,
            backgroundColor: !isLoading ? neonBg : undefined,
            boxShadow: !isLoading ? neonGlow : undefined,
          }}
          className={`
            relative p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-colors duration-75 overflow-hidden select-none shadow-2xs touch-manipulation
            ${hasLeaveVisual && leaveVisual?.isRowStart ? 'border-l-3' : ''}
            ${hasLeaveVisual && leaveVisual?.isRowEnd ? 'border-r-3' : ''}
            ${
              isLoading || (!hasShift && !isHoliday)
                ? !isCurrentMonth
                  ? 'bg-card/40 border-slate-200/40 dark:border-slate-800/40 opacity-35 hover:opacity-70'
                  : 'bg-card border-slate-200/80 dark:border-slate-800 opacity-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                : !isCurrentMonth
                ? 'opacity-40 hover:opacity-75'
                : 'opacity-100 hover:brightness-105 active:scale-[0.97]'
            }
            ${
              isSelected
                ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-1 dark:ring-offset-slate-950 z-30 shadow-md scale-[0.98] !opacity-100'
                : ''
            }
          `}
        >
          {/* Today Frame Overlay */}
          {isToday && (
            <div className="absolute inset-0 border-[3px] border-slate-900 dark:border-white pointer-events-none z-0 rounded-xl sm:rounded-2xl" />
          )}

          {/* Top Row */}
          <div className="absolute top-1 w-full flex items-center justify-between px-0.5 z-10 leading-none">
            <span
              className={`transition-colors duration-75 ${
                isToday
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs font-black ring-2 ring-white/50 dark:ring-black/50'
                  : !isCurrentMonth
                  ? 'text-slate-400 dark:text-slate-600 font-bold text-xs sm:text-sm'
                  : 'text-slate-800 dark:text-slate-100 font-black text-xs sm:text-sm'
              }`}
            >
              {dayNumber}
            </span>

            {!isLoading && isHoliday ? (
              <span
                style={{ backgroundColor: customHolidayColor }}
                className="w-3.5 h-3.5 rounded-full text-white flex items-center justify-center shadow-2xs shrink-0"
                title={holidayTooltip}
              >
                <ShiftIcon icon={customHolidayIcon} className="w-2 h-2 shrink-0" />
              </span>
            ) : !isLoading && isVacation ? (
              <span
                style={{ backgroundColor: customVacationColor }}
                className="w-2.5 h-2.5 rounded-full text-white flex items-center justify-center shadow-2xs"
                title={customVacationName}
              >
                <ShiftIcon icon={customVacationIcon} className="w-2 h-2 shrink-0 text-white" />
              </span>
            ) : !isLoading && exception ? (
              <span
                className="w-2 h-2 rounded-full ring-1 ring-black/10 shadow-2xs"
                style={{ backgroundColor: exception.color }}
                title={exception.name}
              />
            ) : null}
          </div>

          {/* Middle Row */}
          <div className="w-full text-center px-0.5 z-10">
            {isLoading ? (
              <div className="w-6 sm:w-8 h-1.5 sm:h-2 bg-slate-300/40 dark:bg-slate-700/50 rounded-full mx-auto animate-pulse" />
            ) : hasShift ? (
              shiftDisplayMode === 'both' ? (
                <div
                  style={{ color: shiftColor }}
                  className="font-black text-[9.5px] sm:text-[11px] truncate leading-tight flex items-center justify-center gap-0.5 max-w-full"
                >
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  />
                  <span className="truncate">{activeShiftName}</span>
                </div>
              ) : shiftDisplayMode === 'text' ? (
                <div
                  style={{ color: shiftColor }}
                  className="font-black text-[10px] sm:text-xs truncate leading-tight"
                >
                  {activeShiftName}
                </div>
              ) : shiftDisplayMode === 'icon' ? (
                <div style={{ color: shiftColor }} className="flex items-center justify-center">
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: shiftColor }}
                  className="w-4 h-1 rounded-full opacity-80 mx-auto"
                />
              )
            ) : isHoliday ? (
              <div
                style={{ color: customHolidayColor }}
                className="font-extrabold text-[9px] sm:text-[10px] leading-tight line-clamp-2 px-0.5"
              >
                {holidayDetail?.shortName}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    // THEME 5: COMPACT BAR (Sol Çizgili / Vurgulu)
    if (calendarTheme === 'compact-bar') {
      return (
        <div
          role="button"
          tabIndex={0}
          data-date={dayStr}
          aria-label={cellAriaLabel}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          style={{
            borderColor: isVacation ? customVacationColor : undefined,
          }}
          className={`
            relative p-1 sm:p-1.5 pl-2 sm:pl-2.5 rounded-xl border bg-card flex flex-col items-center justify-center cursor-pointer transition-colors duration-75 overflow-hidden select-none shadow-2xs touch-manipulation
            ${
              isVacation
                ? 'border-y-2 bg-amber-500/10'
                : ''
            }
            ${hasLeaveVisual && leaveVisual?.isRowEnd ? 'border-r-2' : ''}
            ${
              !isLoading && isHoliday && !hasShift
                ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
                : !isCurrentMonth
                ? 'opacity-35 border-slate-200/40 dark:border-slate-800/40 hover:opacity-70'
                : 'opacity-100 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 active:scale-[0.97]'
            }
            ${
              isSelected
                ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-1 dark:ring-offset-slate-950 z-30 shadow-md !opacity-100'
                : ''
            }
          `}
        >
          {/* Today Frame Overlay */}
          {isToday && (
            <div className="absolute inset-0 border-[3px] border-slate-900 dark:border-white pointer-events-none z-0 rounded-xl" />
          )}

          {/* Left Vertical Accent Bar */}
          {!isLoading && (hasShift || hasLeaveVisual) && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 rounded-l-xs"
              style={{ backgroundColor: isVacation ? customVacationColor : shiftColor }}
            />
          )}

          {/* Top Row */}
          <div className="absolute top-1 w-full flex items-center justify-between px-0.5 pl-1.5 leading-none z-10">
            <span
              className={`transition-all ${
                isToday
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-5 h-5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs font-black ring-2 ring-white/50 dark:ring-black/50'
                  : !isCurrentMonth
                  ? 'text-slate-400 dark:text-slate-600 font-bold text-xs sm:text-sm'
                  : 'text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm'
              }`}
            >
              {dayNumber}
            </span>

            {!isLoading && isHoliday ? (
              <span
                style={{ backgroundColor: customHolidayColor }}
                className="w-3.5 h-3.5 rounded-full text-white flex items-center justify-center shadow-2xs shrink-0"
                title={holidayTooltip}
              >
                <ShiftIcon icon={customHolidayIcon} className="w-2 h-2 shrink-0" />
              </span>
            ) : !isLoading && isVacation ? (
              <span
                style={{ backgroundColor: customVacationColor }}
                className="w-2.5 h-2.5 rounded-full text-white flex items-center justify-center shadow-2xs"
                title={isLeavePreview ? 'İzin Önizleme' : customVacationName}
              >
                <ShiftIcon icon={customVacationIcon} className="w-2 h-2 shrink-0 text-white" />
              </span>
            ) : null}
          </div>

          {/* Middle Row */}
          <div className="w-full pl-1.5 px-0.5 z-10 text-center">
            {isLoading ? (
              <div className="w-6 sm:w-8 h-1.5 sm:h-2 bg-slate-300/40 dark:bg-slate-700/50 rounded-full mx-auto animate-pulse" />
            ) : hasShift ? (
              shiftDisplayMode === 'both' ? (
                <div
                  style={{ color: shiftColor }}
                  className="font-extrabold text-[9px] sm:text-[10px] truncate leading-tight flex items-center justify-center gap-0.5"
                >
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-3 h-3 shrink-0 opacity-90"
                  />
                  <span className="truncate">{activeShiftName}</span>
                </div>
              ) : shiftDisplayMode === 'text' ? (
                <div
                  style={{ color: shiftColor }}
                  className="font-extrabold text-[9px] sm:text-[10px] truncate leading-tight"
                >
                  {activeShiftName}
                </div>
              ) : shiftDisplayMode === 'icon' ? (
                <div style={{ color: shiftColor }} className="flex items-center justify-center">
                  <ShiftIcon
                    icon={shiftIconName}
                    type={shiftDay?.type}
                    name={activeShiftName}
                    className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                  />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: shiftColor }}
                  className="w-3.5 h-1 rounded-full mx-auto opacity-80"
                />
              )
            ) : isHoliday ? (
              <div
                style={{ color: customHolidayColor }}
                className="font-extrabold text-[8.5px] sm:text-[9.5px] leading-tight line-clamp-2 px-0.5"
              >
                {holidayDetail?.shortName}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    // THEME 3: MINIMAL CAPSULE (Kapsül & Minimal) - Default Fallback
    return (
      <div
        role="button"
        tabIndex={0}
        data-date={dayStr}
        aria-label={cellAriaLabel}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        style={{
          borderColor: isVacation ? customVacationColor : undefined,
        }}
        className={`
          relative p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-card border flex flex-col items-center justify-center cursor-pointer transition-colors duration-75 overflow-hidden select-none shadow-2xs touch-manipulation
          ${
            isVacation
              ? isLeavePreview
                ? 'border-2 ring-2 shadow-sm'
                : 'border-2'
              : ''
          }
          ${hasLeaveVisual && leaveVisual?.isRowStart ? 'rounded-l-2xl' : ''}
          ${hasLeaveVisual && leaveVisual?.isRowEnd ? 'rounded-r-2xl' : ''}
          ${
            !isLoading && isHoliday && !hasShift
              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
              : !isCurrentMonth
              ? 'opacity-35 border-slate-200/40 dark:border-slate-800/40 hover:opacity-70'
              : 'opacity-100 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 active:scale-[0.97]'
          }
          ${
            isSelected
              ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-1 dark:ring-offset-slate-950 z-30 shadow-md !opacity-100'
              : ''
          }
        `}
      >
        {/* Top Row */}
        <div className="absolute top-1 w-full flex items-center justify-between px-0.5 leading-none z-10">
          <span
            className={`transition-colors duration-75 ${
              isToday
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-5 h-5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs font-black ring-2 ring-white/50 dark:ring-black/50'
                : !isCurrentMonth
                ? 'text-slate-400 dark:text-slate-600 font-bold text-xs sm:text-sm'
                : 'text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm'
            }`}
            style={{
              color: !isLoading && isHoliday && !hasShift && !isToday ? customHolidayColor : undefined,
            }}
          >
            {dayNumber}
          </span>

          {!isLoading && isHoliday ? (
            <span
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shadow-2xs shrink-0"
              style={{ backgroundColor: customHolidayColor }}
              title={holidayTooltip}
            >
              <ShiftIcon icon={customHolidayIcon} className="w-2 h-2 text-white shrink-0" />
            </span>
          ) : !isLoading && isVacation ? (
            <span
              className="w-2.5 h-2.5 rounded-full text-white flex items-center justify-center shadow-2xs"
              style={{ backgroundColor: customVacationColor }}
              title={isLeavePreview ? 'İzin Önizleme' : customVacationName}
            >
              <ShiftIcon icon={customVacationIcon} className="w-2 h-2 shrink-0 text-white" />
            </span>
          ) : !isLoading && hasShift ? (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: shiftColor }}
            />
          ) : null}
        </div>

        {/* Middle Row */}
        <div className="w-full px-0.5 z-10">
          {isLoading ? (
            <div className="w-6 sm:w-8 h-1.5 sm:h-2 bg-slate-300/40 dark:bg-slate-700/50 rounded-full mx-auto animate-pulse" />
          ) : hasShift ? (
            shiftDisplayMode === 'both' ? (
              <div
                style={{ backgroundColor: shiftColor }}
                className="py-0.5 px-1 rounded-full text-white font-extrabold text-[8px] sm:text-[9px] text-center truncate shadow-2xs flex items-center justify-center gap-0.5"
              >
                <ShiftIcon
                  icon={shiftIconName}
                  type={shiftDay?.type}
                  name={activeShiftName}
                  className="w-2.5 h-2.5 shrink-0 opacity-90"
                />
                <span className="truncate">{activeShiftName}</span>
              </div>
            ) : shiftDisplayMode === 'text' ? (
              <div
                style={{ backgroundColor: shiftColor }}
                className="py-0.5 px-1 rounded-full text-white font-extrabold text-[8px] sm:text-[9px] text-center truncate shadow-2xs"
              >
                {activeShiftName}
              </div>
            ) : shiftDisplayMode === 'icon' ? (
              <div
                style={{ backgroundColor: shiftColor }}
                className="py-0.5 px-1.5 rounded-full text-white shadow-2xs flex items-center justify-center mx-auto w-fit"
              >
                <ShiftIcon
                  icon={shiftIconName}
                  type={shiftDay?.type}
                  name={activeShiftName}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                />
              </div>
            ) : (
              <div
                style={{ backgroundColor: shiftColor }}
                className="w-5 sm:w-6 h-1 sm:h-1.5 rounded-full mx-auto shadow-2xs opacity-85"
              />
            )
          ) : isHoliday ? (
            <div
              style={{ backgroundColor: customHolidayColor }}
              className="py-0.5 px-1.5 rounded-full text-white font-extrabold text-[7.5px] sm:text-[8.5px] text-center truncate shadow-2xs flex items-center justify-center gap-0.5"
            >
              <ShiftIcon icon={customHolidayIcon} className="w-2 h-2 text-white shrink-0" />
              <span className="truncate">{holidayDetail?.shortName}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
  areDayCellPropsEqual
);
DayCell.displayName = 'DayCell';

// ---------------------------------------------------------------------------
// WeekRow Component: Highly optimized 7-day row with CSS containment
// ---------------------------------------------------------------------------
export interface WeekDayItem {
  day: Date;
  dayStr: string;
  dayNumber: string;
  exception: ShiftException | undefined;
  shiftDay: ShiftDay | null;
  holidayDetail: HolidayDetail | null;
  holidayColors: HolidayBadgeColors | null;
  leaveVisual: LeaveRangeVisualInfo | null;
}

interface WeekRowProps {
  week: WeekDayItem[];
  wIdx: number;
  monthIdx?: number;
  isSnapTarget: boolean;
  gapClass: string;
  selectedDateStr: string;
  todayStr: string;
  currentVisibleMonth: Date;
  calendarTheme: CalendarThemeId;
  shiftDisplayMode: ShiftDisplayMode;
  customVacationColor: string;
  customVacationIcon: string;
  customVacationName: string;
  customHolidayColor: string;
  customHolidayIcon: string;
  customHolidayName: string;
  isLoadingData: boolean;
  onSelectDate: (date: Date) => void;
}

const areWeekRowPropsEqual = (prev: WeekRowProps, next: WeekRowProps): boolean => {
  if (
    prev.gapClass !== next.gapClass ||
    prev.calendarTheme !== next.calendarTheme ||
    prev.shiftDisplayMode !== next.shiftDisplayMode ||
    prev.isLoadingData !== next.isLoadingData ||
    prev.customVacationColor !== next.customVacationColor ||
    prev.customVacationIcon !== next.customVacationIcon ||
    prev.customVacationName !== next.customVacationName ||
    prev.customHolidayColor !== next.customHolidayColor ||
    prev.customHolidayIcon !== next.customHolidayIcon ||
    prev.customHolidayName !== next.customHolidayName ||
    prev.onSelectDate !== next.onSelectDate ||
    prev.isSnapTarget !== next.isSnapTarget ||
    prev.monthIdx !== next.monthIdx ||
    prev.todayStr !== next.todayStr ||
    prev.week !== next.week
  ) {
    return false;
  }

  // Check if selected date is relevant to this week in either prev or next render
  const prevContainsSelected = prev.week.some((d) => d.dayStr === prev.selectedDateStr);
  const nextContainsSelected = next.week.some((d) => d.dayStr === next.selectedDateStr);
  if (prevContainsSelected || nextContainsSelected) {
    if (prev.selectedDateStr !== next.selectedDateStr) {
      return false;
    }
  }

  // Check if the currentVisibleMonth change alters `isCurrentMonth` for any day in this week
  if (prev.currentVisibleMonth !== next.currentVisibleMonth) {
    for (let i = 0; i < prev.week.length; i++) {
      const day = prev.week[i].day;
      const wasSame = isSameMonth(day, prev.currentVisibleMonth);
      const isNowSame = isSameMonth(day, next.currentVisibleMonth);
      if (wasSame !== isNowSame) {
        return false;
      }
    }
  }

  return true;
};

const WeekRow = React.memo(
  ({
    week,
    monthIdx,
    isSnapTarget,
    gapClass,
    selectedDateStr,
    todayStr,
    currentVisibleMonth,
    calendarTheme,
    shiftDisplayMode,
    customVacationColor,
    customVacationIcon,
    customVacationName,
    customHolidayColor,
    customHolidayIcon,
    customHolidayName,
    isLoadingData,
    onSelectDate,
  }: WeekRowProps) => {
    return (
      <div
        data-month-anchor={monthIdx}
        className={`grid grid-cols-7 ${gapClass} h-[calc(100%/6)] min-h-0 overflow-hidden shrink-0 contain-week-row ${
          isSnapTarget ? 'snap-start snap-always' : ''
        }`}
      >
        {week.map((item) => (
          <DayCell
            key={item.dayStr}
            day={item.day}
            dayStr={item.dayStr}
            dayNumber={item.dayNumber}
            isSelected={item.dayStr === selectedDateStr}
            isToday={item.dayStr === todayStr}
            isCurrentMonth={isSameMonth(item.day, currentVisibleMonth)}
            calendarTheme={calendarTheme}
            shiftDisplayMode={shiftDisplayMode}
            shiftDay={item.shiftDay}
            exception={item.exception}
            holidayDetail={item.holidayDetail}
            holidayColors={item.holidayColors}
            leaveVisual={item.leaveVisual}
            customVacationColor={customVacationColor}
            customVacationIcon={customVacationIcon}
            customVacationName={customVacationName}
            customHolidayColor={customHolidayColor}
            customHolidayIcon={customHolidayIcon}
            customHolidayName={customHolidayName}
            isLoading={isLoadingData}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>
    );
  },
  areWeekRowPropsEqual
);
WeekRow.displayName = 'WeekRow';

interface SelectedDayDetailCardProps {
  selectedDate: Date;
  selectedShift: ShiftDay | null;
  selectedException: ShiftException | undefined;
  selectedHolidayDetail: HolidayDetail | null;
  selectedVisualProps: ReturnType<typeof getShiftVisualProps> | null;
  isSelectedRest: boolean;
  leaveVisual: LeaveRangeVisualInfo | null;
  customVacationColor: string;
  customVacationIcon: string;
  customVacationName: string;
  customHolidayColor: string;
  customHolidayIcon: string;
  customSickIcon?: string;
  isOpen: boolean;
  dateLocale: any;
  t: any;
  onClose: () => void;
  onGoToToday?: () => void;
  onAddQuickException: (type: 'VACATION' | 'SICK' | 'OTHER' | 'EXCUSE', weight?: number) => void;
  onRemoveQuickException: () => void;
}

const SelectedDayDetailCard = React.memo(
  ({
    selectedDate,
    selectedShift,
    selectedException,
    selectedHolidayDetail,
    selectedVisualProps,
    isSelectedRest,
    leaveVisual,
    customVacationColor,
    customVacationIcon,
    customVacationName,
    customHolidayColor,
    customHolidayIcon,
    customSickIcon,
    isOpen,
    dateLocale,
    t,
    onClose,
    onGoToToday,
    onAddQuickException,
    onRemoveQuickException,
  }: SelectedDayDetailCardProps) => {
    const isToday = isSameDay(selectedDate, new Date());
    const holidayColors = selectedHolidayDetail
      ? getHolidayBadgeColors(selectedHolidayDetail.type)
      : null;

    const [showExcuseOptions, setShowExcuseOptions] = React.useState(false);

    // Reset excuse options when modal closes or date changes
    React.useEffect(() => {
      if (!isOpen) setShowExcuseOptions(false);
    }, [isOpen, selectedDate]);

    const cardTouchStartY = React.useRef<number | null>(null);

    const handleCardTouchStart = (e: React.TouchEvent) => {
      cardTouchStartY.current = e.touches[0].clientY;
    };

    const handleCardTouchEnd = (e: React.TouchEvent) => {
      if (cardTouchStartY.current === null) return;
      const deltaY = e.changedTouches[0].clientY - cardTouchStartY.current;
      cardTouchStartY.current = null;
      if (deltaY > 45) {
        hapticTap();
        onClose();
      }
    };

    return (
      <div
        className={`shrink-0 px-3 transition-[opacity,transform] duration-200 ease-out ${
          isOpen ? 'opacity-100 translate-y-0 pb-[calc(0.5rem+var(--sab))]' : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'
        }`}
      >
        <div className="overflow-visible min-h-0">
          <div>
            {/* Regular Day Detail Card */}
            <div
              onTouchStart={handleCardTouchStart}
              onTouchEnd={handleCardTouchEnd}
              className="mt-2.5 bg-card rounded-3xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800"
            >
              {/* Drag Handle for Mobile Touch Devices */}
              <div className="w-full pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Header Row: Title & Action/Close Buttons */}
              <div className="flex justify-between items-center mb-2.5 gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">
                  {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: dateLocale })}
                </h3>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {isToday ? (
                    <span className="bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400 text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase">
                      Bugün
                    </span>
                  ) : onGoToToday ? (
                    <button
                      type="button"
                      onClick={onGoToToday}
                      className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 text-[10.5px] font-black px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all active:scale-95 cursor-pointer touch-manipulation"
                      title={t('go_to_today', 'Bugüne Git')}
                    >
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      <span>{t('go_to_today', 'Bugüne Git')}</span>
                    </button>
                  ) : null}
                  <button
                    onClick={onClose}
                    title="Kapat"
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90 cursor-pointer touch-manipulation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Vacation / Leave Info Banner if selected day is inside a continuous vacation block */}
              {leaveVisual && (
                <div
                  style={{
                    borderColor: `${customVacationColor}80`,
                    background: `linear-gradient(to right, ${customVacationColor}25, ${customVacationColor}10, transparent)`,
                  }}
                  className="my-2 p-3 rounded-2xl border flex items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div
                      style={{ backgroundColor: customVacationColor }}
                      className="w-9 h-9 rounded-2xl text-white flex items-center justify-center shadow-xs shrink-0"
                    >
                      <ShiftIcon icon={customVacationIcon} className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        style={{ color: customVacationColor }}
                        className="text-xs sm:text-sm font-black truncate"
                      >
                        {leaveVisual.role === 'PRECEDING_OFF'
                          ? '☕ Tatil Öncesi İstirahat (Off)'
                          : leaveVisual.role === 'SUCCEEDING_OFF'
                          ? '☕ Tatil Sonrası İstirahat (Off)'
                          : leaveVisual.role === 'SUNDAY'
                          ? '🌴 Pazar Tatili (Yıllık İzin Kapsamında)'
                          : leaveVisual.role === 'HOLIDAY'
                          ? '🌴 Resmi Tatil (İzin Kapsamında)'
                          : `🌴 ${customVacationName} (Dilekçe İzni)`}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {leaveVisual.totalDays
                          ? `Toplam ${leaveVisual.totalDays} Günlük Kesintisiz Tatil Bloğunun Parçasıdır`
                          : 'Planlanmış Yıllık İzin'}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      backgroundColor: `${customVacationColor}20`,
                      color: customVacationColor,
                      borderColor: `${customVacationColor}60`,
                    }}
                    className="text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full border shadow-2xs whitespace-nowrap"
                  >
                    🌴 Tatil Bloğu
                  </span>
                </div>
              )}

              {/* Holiday Banner */}
              {selectedHolidayDetail && holidayColors && (
                <div
                  style={{
                    borderColor: `${customHolidayColor}60`,
                    background: `linear-gradient(to right, ${customHolidayColor}20, ${customHolidayColor}08, transparent)`,
                  }}
                  className="my-2.5 p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                    <div
                      style={{ backgroundColor: customHolidayColor }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl text-white flex items-center justify-center shadow-xs shrink-0"
                    >
                      <ShiftIcon icon={customHolidayIcon} className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        style={{ color: customHolidayColor }}
                        className="text-xs sm:text-sm font-black truncate"
                      >
                        {selectedHolidayDetail.name}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {selectedHolidayDetail.description ||
                          (selectedHolidayDetail.isHalfDay
                            ? 'Arife Günü • Yarım Gün Tatil (13:00 Sonrası)'
                            : selectedHolidayDetail.type === 'religious'
                            ? 'Dini Bayram • Resmi Tatil'
                            : selectedHolidayDetail.type === 'national'
                            ? 'Milli Bayram • Resmi Tatil'
                            : 'Özel Gün / Anma')}
                      </p>
                    </div>
                  </div>
                  {selectedShift?.type === 'WORK' ? (
                    <div className="flex flex-col items-end shrink-0 pl-1">
                      <span className="text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs whitespace-nowrap">
                        🔴 Tatil Mesaisi
                      </span>
                      <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Çalışma
                      </span>
                    </div>
                  ) : isSelectedRest || !selectedShift ? (
                    <div className="flex flex-col items-end shrink-0 pl-1">
                      <span className="text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs whitespace-nowrap">
                        🟢 Tatil İstirahatı
                      </span>
                      <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        İzin / Tatil
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Shift or Exception details */}
              <div className="space-y-3">
                {selectedException ? (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0"
                        style={{ backgroundColor: selectedException.color }}
                      >
                        {selectedException.type === 'VACATION' ? (
                          <ShiftIcon icon={customVacationIcon} className="w-4 h-4 text-white" />
                        ) : selectedException.type === 'SICK' ? (
                          <ShiftIcon icon={customSickIcon || 'HeartPulse'} className="w-4 h-4 text-white" />
                        ) : selectedException.type === 'DUTY' ? (
                          <Briefcase className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            {selectedException.name}
                          </h4>
                          <span
                            className="text-[9.5px] px-2 py-0.2 rounded-full font-extrabold"
                            style={{
                              backgroundColor: `${selectedException.color}20`,
                              color: selectedException.color,
                            }}
                          >
                            Özel Kayıt
                          </span>
                        </div>
                        <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                          Bu gün için özel durum/izin kaydınız tanımlıdır.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={onRemoveQuickException}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 flex items-center space-x-1 text-xs font-bold cursor-pointer touch-manipulation active:scale-95"
                      title="İstisnayı Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Kaldır</span>
                    </button>
                  </div>
                ) : selectedShift ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: selectedShift.color }}
                        />
                        <span
                          className="font-extrabold text-sm sm:text-base truncate"
                          style={{ color: selectedShift.color }}
                        >
                          {selectedShift.name}
                        </span>
                        <span
                          className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0"
                          style={{
                            backgroundColor: `${selectedShift.color}18`,
                            color: selectedShift.color,
                          }}
                        >
                          {selectedVisualProps?.icon && (
                            <selectedVisualProps.icon className="w-3 h-3 shrink-0" />
                          )}
                          <span>
                            {selectedShift.type === 'WORK'
                              ? t('work', 'Çalışma')
                              : t('rest', 'İstirahat')}
                          </span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {selectedShift.type === 'WORK' && selectedShift.startTime ? (
                          <span className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span>
                              {selectedShift.startTime} - {selectedShift.endTime}
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <Coffee className="w-3.5 h-3.5 shrink-0" />
                            <span>İstirahat Günü</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span className="italic">{t('no_shift_defined', 'Vardiya tanımlı değil')}</span>
                  </div>
                )}

                {/* Global Action Buttons for Days without Exceptions */}
                {!selectedException && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onAddQuickException('VACATION')}
                      style={{
                        backgroundColor: `${customVacationColor}15`,
                        color: customVacationColor,
                        borderColor: `${customVacationColor}40`,
                      }}
                      className="px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer touch-manipulation"
                      title="Bu güne senelik izin ekle"
                    >
                      <ShiftIcon icon={customVacationIcon} className="w-3.5 h-3.5" />
                      <span>+ İzin</span>
                    </button>

                    <button
                      onClick={() => onAddQuickException('SICK')}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-800 text-[11px] font-extrabold transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer touch-manipulation"
                      title="Bu güne rapor ekle"
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>+ Rapor</span>
                    </button>

                    <button
                      onClick={() => onAddQuickException('OTHER')}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200/80 dark:border-purple-800 text-[11px] font-extrabold transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer touch-manipulation"
                      title="Bu güne özel gün / yıldönümü ekle"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ Özel Gün</span>
                    </button>

                    {showExcuseOptions ? (
                      <div className="flex items-center space-x-1 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800 rounded-xl p-0.5 animate-in slide-in-from-right-4">
                        <button
                          onClick={() => { onAddQuickException('EXCUSE', 1); setShowExcuseOptions(false); }}
                          className="px-2 py-1 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer touch-manipulation"
                        >
                          Tam Gün
                        </button>
                        <div className="w-px h-3 bg-cyan-200 dark:bg-cyan-800" />
                        <button
                          onClick={() => { onAddQuickException('EXCUSE', 0.5); setShowExcuseOptions(false); }}
                          className="px-2 py-1 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer touch-manipulation"
                        >
                          Yarım
                        </button>
                        <div className="w-px h-3 bg-cyan-200 dark:bg-cyan-800" />
                        <button
                          onClick={() => { onAddQuickException('EXCUSE', 0.25); setShowExcuseOptions(false); }}
                          className="px-2 py-1 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer touch-manipulation"
                        >
                          Saatlik
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowExcuseOptions(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 border border-cyan-200/80 dark:border-cyan-800 text-[11px] font-extrabold transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer touch-manipulation"
                        title="Bu güne mazeret izni ekle"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>+ Mazeret</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
SelectedDayDetailCard.displayName = 'SelectedDayDetailCard';

// ---------------------------------------------------------------------------
// CalendarPage Main Component: Continuous Stream of Unique Weeks
// ---------------------------------------------------------------------------
const PAST_MONTHS = 12;
const FUTURE_MONTHS = 36;

export const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const {
    calendarTheme,
    shiftDisplayMode,
    selectedDate,
    setSelectedDate,
    leavePreview,
    clearLeavePreview,
    isDayDetailOpen,
    setIsDayDetailOpen,
    isLeavePlanningOpen,
    isLeavePlanningMinimized,
    restoreLeavePlanning,
    closeLeavePlanning,
  } = useAppStore();

  const [currentMonthIndex, setCurrentMonthIndex] = useState(PAST_MONTHS);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dateLocale = i18n.language.startsWith('tr') ? tr : enUS;
  const containerRef = useRef<HTMLDivElement>(null);
  const currentMonthIndexRef = useRef(currentMonthIndex);
  currentMonthIndexRef.current = currentMonthIndex;

  const isProgrammaticScroll = useRef(false);
  const scrollTimer = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Generate continuous list of months around base month
  const baseMonth = useMemo(() => startOfMonth(new Date()), []);
  const months = useMemo(() => {
    const list: Date[] = [];
    for (let i = -PAST_MONTHS; i <= FUTURE_MONTHS; i++) {
      list.push(addMonths(baseMonth, i));
    }
    return list;
  }, [baseMonth]);

  const currentVisibleMonth = months[currentMonthIndex] || baseMonth;

  // Dynamically compute available years based on the continuous month stream
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    months.forEach((m) => set.add(m.getFullYear()));
    return Array.from(set).sort((a, b) => a - b);
  }, [months]);

  // Localized month names (Ocak/January..Aralık/December) for month picker
  const monthPickerNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      format(new Date(2026, i, 1), 'MMMM', { locale: dateLocale })
    );
  }, [dateLocale]);

  // Generate continuous stream of unique weeks (every date appears EXACTLY ONCE!)
  const { allWeeks, monthWeekIndexMap, weekToMonthMap } = useMemo(() => {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];

    const rangeStart = startOfWeek(startOfMonth(firstMonth), { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(endOfMonth(lastMonth), { weekStartsOn: 1 });

    const totalDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    const weeks: Date[][] = [];
    for (let i = 0; i < totalDays.length; i += 7) {
      weeks.push(totalDays.slice(i, i + 7));
    }

    const mWeekMap = new Map<number, number>();
    const wMonthMap = new Map<number, number>();

    months.forEach((m, mIdx) => {
      const mStart = startOfMonth(m);
      const mStartWeekTime = startOfWeek(mStart, { weekStartsOn: 1 }).getTime();
      const wIdx = weeks.findIndex((w) => w[0].getTime() === mStartWeekTime);
      if (wIdx !== -1) {
        mWeekMap.set(mIdx, wIdx);
        wMonthMap.set(wIdx, mIdx);
      }
    });

    return { allWeeks: weeks, monthWeekIndexMap: mWeekMap, weekToMonthMap: wMonthMap };
  }, [months]);

  // Batched Live Query for all DB entities including Shift Types
  const dbData = useLiveQuery(async () => {
    const [activePatterns, patterns, exceptions, shiftTypes] = await Promise.all([
      db.activePatterns.toArray(),
      db.patterns.toArray(),
      db.exceptions.toArray(),
      db.shiftTypes.toArray(),
    ]);
    return { activePatterns, patterns, exceptions, shiftTypes };
  }, []);

  const isLoadingData = dbData === undefined;
  const activePatterns = dbData?.activePatterns;
  const patterns = dbData?.patterns;
  const exceptions = dbData?.exceptions;
  const shiftTypes = dbData?.shiftTypes;

  // O(1) Lookup Map for all user-customized Shift Types
  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, ShiftType>();
    if (shiftTypes) {
      for (const st of shiftTypes) {
        map.set(st.id, st);
      }
    }
    return map;
  }, [shiftTypes]);

  // User-customized Vacation & Holiday System Types
  const vacationShiftType = useMemo(
    () =>
      shiftTypes?.find(
        (st) => st.systemCategory === 'VACATION' || st.id === 'st-vacation' || st.id === 'st-leave'
      ),
    [shiftTypes]
  );

  const holidayShiftType = useMemo(
    () =>
      shiftTypes?.find(
        (st) => st.systemCategory === 'HOLIDAY' || st.id === 'st-holiday'
      ),
    [shiftTypes]
  );

  const sickShiftType = useMemo(
    () =>
      shiftTypes?.find(
        (st) => st.id === 'st-sick' || st.name.toLowerCase().includes('rapor')
      ),
    [shiftTypes]
  );

  const excuseShiftType = useMemo(
    () =>
      shiftTypes?.find(
        (st) => st.id === 'st-excuse' || st.name.toLowerCase().includes('mazeret')
      ),
    [shiftTypes]
  );

  const customVacationColor = vacationShiftType?.color || '#f59e0b';
  const customVacationIcon = vacationShiftType?.icon || 'Palmtree';
  const customVacationName = vacationShiftType?.name || 'Yıllık İzin';

  const customHolidayColor = holidayShiftType?.color || '#e11d48';
  const customHolidayIcon = holidayShiftType?.icon || 'CalendarHeart';
  const customHolidayName = holidayShiftType?.name || 'Resmi Tatil';

  const customSickColor = sickShiftType?.color || '#ef4444';
  const customSickIcon = sickShiftType?.icon || 'HeartPulse';
  const customSickName = sickShiftType?.name || 'Rapor';

  const customExcuseColor = excuseShiftType?.color || '#06b6d4';
  const customExcuseName = excuseShiftType?.name || 'Mazeret';

  const activePatternObj = activePatterns?.[0];
  const currentPattern = useMemo(
    () => patterns?.find((p) => p.id === activePatternObj?.patternId),
    [patterns, activePatternObj?.patternId]
  );

  const exceptionsMap = useMemo(() => {
    const map = new Map<string, ShiftException>();
    if (exceptions) {
      for (const ex of exceptions) {
        map.set(ex.date, ex);
      }
    }
    return map;
  }, [exceptions]);

  // Contiguous saved vacations mapping (groups multi-day vacation records, bridges Sundays & includes Preceding/Succeeding Offs)
  const savedVacationsMap = useMemo(() => {
    const map = new Map<string, LeaveRangeVisualInfo>();
    if (!exceptions) return map;

    const vacationExceptions = exceptions
      .filter((e) => e.type === 'VACATION')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (vacationExceptions.length === 0) return map;

    // 1. Group contiguous vacation days bridging over Sundays and Official Holidays
    const groups: { formalStartDateStr: string; formalEndDateStr: string; exceptionDates: string[] }[] = [];
    let currentGroup: string[] = [];

    for (let i = 0; i < vacationExceptions.length; i++) {
      const currStr = vacationExceptions[i].date;
      if (currentGroup.length === 0) {
        currentGroup.push(currStr);
      } else {
        const prevDate = parseISO(currentGroup[currentGroup.length - 1]);
        const currDate = parseISO(currStr);

        let isBridge = true;
        let checkDate = addDays(prevDate, 1);
        while (checkDate < currDate) {
          if (!isSunday(checkDate) && !isOfficialHoliday(checkDate)) {
            isBridge = false;
            break;
          }
          checkDate = addDays(checkDate, 1);
        }

        if (isBridge) {
          currentGroup.push(currStr);
        } else {
          groups.push({
            formalStartDateStr: currentGroup[0],
            formalEndDateStr: currentGroup[currentGroup.length - 1],
            exceptionDates: [...currentGroup],
          });
          currentGroup = [currStr];
        }
      }
    }

    if (currentGroup.length > 0) {
      groups.push({
        formalStartDateStr: currentGroup[0],
        formalEndDateStr: currentGroup[currentGroup.length - 1],
        exceptionDates: [...currentGroup],
      });
    }

    // 2. For each formal group, extend with Preceding & Succeeding Offs and populate all days
    for (const grp of groups) {
      const formalStart = parseISO(grp.formalStartDateStr);
      const formalEnd = parseISO(grp.formalEndDateStr);

      const precedingOffs =
        currentPattern && activePatternObj
          ? findPrecedingOffDays(formalStart, currentPattern as any, activePatternObj.startDate)
          : [];
      const succeedingOffs =
        currentPattern && activePatternObj
          ? findSucceedingOffDays(formalEnd, currentPattern as any, activePatternObj.startDate)
          : [];

      const vacationStart = precedingOffs.length > 0 ? precedingOffs[0] : formalStart;
      const vacationEnd =
        succeedingOffs.length > 0 ? succeedingOffs[succeedingOffs.length - 1] : formalEnd;

      const vacationStartDateStr = formatToFullDateFast(vacationStart);
      const vacationEndDateStr = formatToFullDateFast(vacationEnd);

      const allDaysInBlock = eachDayOfInterval({ start: vacationStart, end: vacationEnd });
      const totalDays = allDaysInBlock.length;

      allDaysInBlock.forEach((d, idx) => {
        const dStr = formatToFullDateFast(d);
        const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday

        let role: LeaveDayRole;
        if (d < formalStart) {
          role = 'PRECEDING_OFF';
        } else if (d > formalEnd) {
          role = 'SUCCEEDING_OFF';
        } else if (isSunday(d)) {
          role = 'SUNDAY';
        } else if (isOfficialHoliday(d)) {
          role = 'HOLIDAY';
        } else {
          role = 'LEAVE';
        }

        map.set(dStr, {
          type: 'SAVED',
          role,
          isVacationStart: dStr === vacationStartDateStr,
          isVacationEnd: dStr === vacationEndDateStr,
          isFormalStart: dStr === grp.formalStartDateStr,
          isFormalEnd: dStr === grp.formalEndDateStr,
          isRowStart: dayOfWeek === 1 || dStr === vacationStartDateStr,
          isRowEnd: dayOfWeek === 0 || dStr === vacationEndDateStr,
          dayIndex: idx + 1,
          totalDays,
          formalDaysCount: grp.exceptionDates.length,
          title: customVacationName,
          startDateStr: vacationStartDateStr,
          endDateStr: vacationEndDateStr,
          formalStartDateStr: grp.formalStartDateStr,
          formalEndDateStr: grp.formalEndDateStr,
        });
      });
    }

    return map;
  }, [exceptions, currentPattern, activePatternObj, customVacationName]);

  // Preview days mapping (when leavePreview is active)
  const previewDaysMap = useMemo(() => {
    const map = new Map<string, LeaveRangeVisualInfo>();
    if (!leavePreview) return map;

    try {
      const vacationStart = parseISO(leavePreview.startDateStr);
      const vacationEnd = parseISO(leavePreview.endDateStr);
      const formalStart = parseISO(leavePreview.formalStartDateStr);
      const formalEnd = parseISO(leavePreview.formalEndDateStr);

      if (
        isNaN(vacationStart.getTime()) ||
        isNaN(vacationEnd.getTime()) ||
        vacationStart > vacationEnd
      ) {
        return map;
      }

      const allDaysInBlock = eachDayOfInterval({ start: vacationStart, end: vacationEnd });
      const totalDays = allDaysInBlock.length;

      allDaysInBlock.forEach((d, idx) => {
        const dStr = formatToFullDateFast(d);
        const dayOfWeek = d.getDay();

        let role: LeaveDayRole;
        if (d < formalStart) {
          role = 'PRECEDING_OFF';
        } else if (d > formalEnd) {
          role = 'SUCCEEDING_OFF';
        } else if (isSunday(d)) {
          role = 'SUNDAY';
        } else if (isOfficialHoliday(d)) {
          role = 'HOLIDAY';
        } else {
          role = 'LEAVE';
        }

        map.set(dStr, {
          type: 'PREVIEW',
          role,
          isVacationStart: dStr === leavePreview.startDateStr,
          isVacationEnd: dStr === leavePreview.endDateStr,
          isFormalStart: dStr === leavePreview.formalStartDateStr,
          isFormalEnd: dStr === leavePreview.formalEndDateStr,
          isRowStart: dayOfWeek === 1 || dStr === leavePreview.startDateStr,
          isRowEnd: dayOfWeek === 0 || dStr === leavePreview.endDateStr,
          dayIndex: idx + 1,
          totalDays,
          formalDaysCount: leavePreview.leaveDaysSpent,
          title: leavePreview.title || customVacationName,
          startDateStr: leavePreview.startDateStr,
          endDateStr: leavePreview.endDateStr,
          formalStartDateStr: leavePreview.formalStartDateStr,
          formalEndDateStr: leavePreview.formalEndDateStr,
        });
      });
    } catch (err) {
      console.error(err);
    }

    return map;
  }, [leavePreview, customVacationName]);

  // Pre-calculate shift, holiday, and leave data for all unique weeks in window
  const weeksData = useMemo(() => {
    return allWeeks.map((week) => {
      return week.map((day) => {
        const dayStr = formatToFullDateFast(day);
        const dayNumber = String(day.getDate());
        const exception = exceptionsMap.get(dayStr);
        const rawShiftDay =
          activePatternObj && currentPattern
            ? getShiftForDate(day, currentPattern as any, activePatternObj.startDate)
            : null;
        const shiftDay = resolveShiftDayWithTypes(rawShiftDay, shiftTypesMap);
        const holidayDetail = getHolidayDetail(day);
        const holidayColors = holidayDetail ? getHolidayBadgeColors(holidayDetail.type) : null;
        const leaveVisual = previewDaysMap.get(dayStr) || savedVacationsMap.get(dayStr) || null;

        return {
          day,
          dayStr,
          dayNumber,
          exception,
          shiftDay,
          holidayDetail,
          holidayColors,
          leaveVisual,
        };
      });
    });
  }, [allWeeks, activePatternObj, currentPattern, exceptionsMap, previewDaysMap, savedVacationsMap, shiftTypesMap]);

  const todayStr = useMemo(() => formatToFullDateFast(new Date()), []);
  const selectedDateStr = formatToFullDateFast(selectedDate);

  // Compute active month from container scroll position (zero layout thrash)
  const updateActiveMonthFromScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight || 1;
    const rowHeight = clientHeight / 6;

    let bestIdx = currentMonthIndexRef.current;
    let minDiff = Infinity;

    for (let i = 0; i < months.length; i++) {
      const wIdx = monthWeekIndexMap.get(i);
      if (wIdx !== undefined) {
        const targetTop = Math.round(wIdx * rowHeight);
        const diff = Math.abs(targetTop - scrollTop);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      }
    }

    if (bestIdx !== currentMonthIndexRef.current) {
      currentMonthIndexRef.current = bestIdx;
      setCurrentMonthIndex(bestIdx);
    }
  }, [monthWeekIndexMap, months.length]);

  // Initial scroll position pin on current month
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetWeekIdx = monthWeekIndexMap.get(PAST_MONTHS);
    if (targetWeekIdx !== undefined && container.clientHeight > 0) {
      const targetElement = container.children[targetWeekIdx] as HTMLElement | undefined;
      container.scrollTop = targetElement
        ? targetElement.offsetTop
        : Math.round(targetWeekIdx * (container.clientHeight / 6));
    }
  }, [monthWeekIndexMap]);

  // Safety timer for initial scroll positioning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetWeekIdx = monthWeekIndexMap.get(PAST_MONTHS);
    if (targetWeekIdx !== undefined) {
      const timer = setTimeout(() => {
        if (container && container.clientHeight > 0) {
          const targetElement = container.children[targetWeekIdx] as HTMLElement | undefined;
          container.scrollTop = targetElement
            ? targetElement.offsetTop
            : Math.round(targetWeekIdx * (container.clientHeight / 6));
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [monthWeekIndexMap]);

  // Stable re-anchoring when container height changes (detail card open/close, screen resize, orientation)
  const lastObservedHeightRef = useRef<number>(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = Math.round(entry.contentRect.height);
        if (newHeight <= 0) continue;

        const prevHeight = lastObservedHeightRef.current;
        lastObservedHeightRef.current = newHeight;

        // Skip initial zero measurement
        if (prevHeight === 0) continue;

        // Only handle meaningful height changes (e.g. card toggling or window resize)
        if (Math.abs(prevHeight - newHeight) > 2) {
          if (isProgrammaticScroll.current) return;

          const activeIdx = currentMonthIndexRef.current;
          const targetWeekIdx = monthWeekIndexMap.get(activeIdx);
          if (targetWeekIdx !== undefined) {
            isProgrammaticScroll.current = true;
            container.style.scrollSnapType = 'none';

            const targetElement = container.children[targetWeekIdx] as HTMLElement | undefined;
            const targetTop = targetElement
              ? targetElement.offsetTop
              : Math.round(targetWeekIdx * (newHeight / 6));

            container.scrollTop = targetTop;

            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.style.scrollSnapType = 'y mandatory';
              }
              isProgrammaticScroll.current = false;
            }, 60);
          }
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [monthWeekIndexMap]);

  // Automatic smart scrolling when leavePreview is set
  useEffect(() => {
    if (!leavePreview) return;
    const container = containerRef.current;
    if (!container) return;

    const targetWeekIdx = allWeeks.findIndex((week) =>
      week.some((d) => formatToFullDateFast(d) === leavePreview.startDateStr)
    );

    if (targetWeekIdx !== -1) {
      const timer = setTimeout(() => {
        if (container) {
          const targetElement = container.children[targetWeekIdx] as HTMLElement | undefined;
          if (targetElement) {
            isProgrammaticScroll.current = true;
            container.scrollTo({
              top: targetElement.offsetTop,
              behavior: 'smooth',
            });
            setTimeout(() => {
              isProgrammaticScroll.current = false;
              updateActiveMonthFromScroll();
            }, 400);
          }
        }
      }, 60);

      return () => clearTimeout(timer);
    }
  }, [leavePreview, allWeeks, updateActiveMonthFromScroll]);

  // Handle active month synchronization on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

      if (scrollTimer.current !== null) {
        clearTimeout(scrollTimer.current);
      }
      scrollTimer.current = window.setTimeout(() => {
        if (!isProgrammaticScroll.current) {
          updateActiveMonthFromScroll();
        }
      }, 50);
    };

    const handleInteraction = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.style.scrollSnapType = 'y mandatory';
      }
      isProgrammaticScroll.current = false;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('touchstart', handleInteraction, { passive: true });
    container.addEventListener('wheel', handleInteraction, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleInteraction);
      container.removeEventListener('wheel', handleInteraction);
      if (scrollTimer.current !== null) {
        clearTimeout(scrollTimer.current);
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateActiveMonthFromScroll]);

  // Smooth programmatic scroll to month with fluid gliding animation
  const scrollToMonth = useCallback(
    (index: number, smooth: boolean = true) => {
      if (index < 0 || index >= months.length) return;
      const container = containerRef.current;
      if (!container) return;

      const targetWeekIdx = monthWeekIndexMap.get(index);
      if (targetWeekIdx === undefined) return;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (scrollTimer.current !== null) {
        clearTimeout(scrollTimer.current);
        scrollTimer.current = null;
      }

      isProgrammaticScroll.current = true;
      currentMonthIndexRef.current = index;
      setCurrentMonthIndex(index);

      const getTargetScrollTop = () => {
        const targetElement = container.children[targetWeekIdx] as HTMLElement | undefined;
        return targetElement
          ? targetElement.offsetTop
          : Math.round(targetWeekIdx * (container.clientHeight / 6));
      };

      const targetScrollTop = getTargetScrollTop();

      if (!smooth) {
        container.style.scrollSnapType = 'none';
        container.scrollTop = targetScrollTop;
        container.style.scrollSnapType = 'y mandatory';
        isProgrammaticScroll.current = false;
        return;
      }

      container.style.scrollSnapType = 'none';
      const startScrollTop = container.scrollTop;
      const initialDistance = targetScrollTop - startScrollTop;

      if (Math.abs(initialDistance) < 2) {
        container.scrollTop = targetScrollTop;
        container.style.scrollSnapType = 'y mandatory';
        isProgrammaticScroll.current = false;
        return;
      }

      const duration = 320;
      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = easeOutCubic(progress);

        container.scrollTop = Math.round(startScrollTop + initialDistance * ease);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          container.scrollTop = targetScrollTop;
          container.style.scrollSnapType = 'y mandatory';
          animationFrameRef.current = null;
          setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 80);
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [months.length, monthWeekIndexMap]
  );

  const handleOpenDetail = useCallback(() => {
    if (!isDayDetailOpen) {
      setIsDayDetailOpen(true);
    }
  }, [isDayDetailOpen, setIsDayDetailOpen]);

  const handleCloseDetail = useCallback(() => {
    if (isDayDetailOpen) {
      setIsDayDetailOpen(false);
    }
  }, [isDayDetailOpen, setIsDayDetailOpen]);

  const goToToday = useCallback(() => {
    hapticSelection();
    const today = new Date();
    setSelectedDate(today);
    isProgrammaticScroll.current = true;
    handleOpenDetail();
    requestAnimationFrame(() => {
      scrollToMonth(PAST_MONTHS, true);
    });
  }, [handleOpenDetail, scrollToMonth, setSelectedDate]);

  const goToPreviousMonth = useCallback(() => {
    if (currentMonthIndex > 0) {
      hapticSelection();
      scrollToMonth(currentMonthIndex - 1, true);
    }
  }, [currentMonthIndex, scrollToMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonthIndex < months.length - 1) {
      hapticSelection();
      scrollToMonth(currentMonthIndex + 1, true);
    }
  }, [currentMonthIndex, months.length, scrollToMonth]);

  // Horizontal Touch Swipe Handling for Month Navigation
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  const handleCalendarTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchStartTimeRef.current = Date.now();
    }
  };

  const handleCalendarTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;
    const elapsedTime = Date.now() - touchStartTimeRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (
      elapsedTime < 500 &&
      Math.abs(deltaX) > 60 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4
    ) {
      if (deltaX < 0) {
        goToNextMonth();
      } else {
        goToPreviousMonth();
      }
    }
  };

  const handleSelectDate = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      handleOpenDetail();

      const targetMonthStart = startOfMonth(date);
      const currentMonthStart = months[currentMonthIndexRef.current] || baseMonth;

      if (!isSameMonth(date, currentMonthStart)) {
        const targetIdx = months.findIndex((m) => isSameMonth(m, targetMonthStart));
        if (targetIdx !== -1) {
          isProgrammaticScroll.current = true;
          requestAnimationFrame(() => {
            scrollToMonth(targetIdx, true);
          });
        }
      }
    },
    [baseMonth, handleOpenDetail, months, scrollToMonth, setSelectedDate]
  );

  const handleSelectMonthFromPicker = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= months.length) return;
      hapticSelection();
      if (isDayDetailOpen) {
        setIsDayDetailOpen(false);
      }
      setIsMonthPickerOpen(false);
      isProgrammaticScroll.current = true;
      requestAnimationFrame(() => {
        scrollToMonth(targetIdx, true);
      });
    },
    [isDayDetailOpen, months.length, scrollToMonth, setIsDayDetailOpen]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Selected date details
  const rawSelectedShift =
    activePatternObj && currentPattern
      ? getShiftForDate(selectedDate, currentPattern as any, activePatternObj.startDate)
      : null;
  const selectedShift = resolveShiftDayWithTypes(rawSelectedShift, shiftTypesMap);

  const selectedException = exceptionsMap.get(selectedDateStr);
  const selectedHolidayDetail = getHolidayDetail(selectedDate);
  const selectedLeaveVisual =
    previewDaysMap.get(selectedDateStr) || savedVacationsMap.get(selectedDateStr) || null;

  const isSelectedRest =
    selectedException?.type === 'VACATION' ||
    Boolean(selectedLeaveVisual) ||
    selectedException?.type === 'SICK' ||
    selectedShift?.type === 'REST';

  const selectedVisualProps =
    selectedShift || selectedException || selectedLeaveVisual
      ? getShiftVisualProps(
          selectedException?.name || selectedShift?.name,
          selectedShift?.type,
          selectedException?.type || (selectedLeaveVisual ? 'VACATION' : undefined),
          selectedShift?.icon,
          customVacationIcon,
          customSickIcon
        )
      : null;

  // Quick action: Add/Remove single-day vacation, sick leave, or excuse exception
  const handleAddQuickException = async (type: 'VACATION' | 'SICK' | 'OTHER' | 'EXCUSE', weight?: number) => {
    try {
      let exName = customExcuseName || 'Mazeret İzni';
      if (type === 'VACATION') exName = customVacationName;
      if (type === 'SICK') exName = customSickName;
      if (type === 'OTHER') {
        const customName = window.prompt('Özel Gün veya Yıldönümü adı:', 'Yıldönümü');
        if (!customName) return; // User cancelled
        exName = customName;
      }
      if (type === 'EXCUSE') {
        if (weight === 0.5) exName = `Yarım Gün ${customExcuseName || 'Mazeret'}`;
        else if (weight === 0.25) exName = `Saatlik ${customExcuseName || 'Mazeret'}`;
      }

      const exColor =
        type === 'VACATION'
          ? customVacationColor
          : type === 'SICK'
          ? customSickColor
          : customExcuseColor;

      await db.exceptions.put({
        id: `ex-${selectedDateStr}`,
        date: selectedDateStr,
        type,
        name: exName,
        color: exColor,
        weight: weight || 1,
      });
      triggerAutoSync();
      hapticSuccess();
      showToast(`${exName} takvime kaydedildi.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveQuickException = async () => {
    try {
      if (selectedException) {
        await db.exceptions.delete(selectedException.id);
        triggerAutoSync();
        hapticWarning();
        showToast('İstisna / İzin kaydı kaldırıldı.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Apply previewed leave opportunity or custom leave plan to Dexie DB
  const handleApplyPreviewLeave = async () => {
    if (!leavePreview) return;
    try {
      if (leavePreview.opportunity) {
        await applyLeaveOpportunityToCalendar(leavePreview.opportunity);
      } else {
        const sDate = parseISO(leavePreview.formalStartDateStr);
        const eDate = parseISO(leavePreview.formalEndDateStr);
        const interval = eachDayOfInterval({ start: sDate, end: eDate });

        await db.transaction('rw', db.exceptions, async () => {
          for (const d of interval) {
            const dStr = formatToFullDateFast(d);
            if (!isSunday(d) && !isOfficialHoliday(d)) {
              const existing = await db.exceptions.where('date').equals(dStr).first();
              if (existing) await db.exceptions.delete(existing.id);
              await db.exceptions.add({
                id: crypto.randomUUID(),
                date: dStr,
                type: 'VACATION',
                name: customVacationName,
                color: customVacationColor,
              });
            }
          }
        });
        triggerAutoSync();
      }

      clearLeavePreview();
      closeLeavePlanning();
      showToast(t('leave_applied_toast', 'İzin günleri takviminize işlendi! 🎉'));
    } catch (err) {
      console.error('Failed to apply leave preview:', err);
    }
  };

  const monthName = format(currentVisibleMonth, 'LLLL', { locale: dateLocale });
  const yearNumber = format(currentVisibleMonth, 'yyyy', { locale: dateLocale });
  const isThisCurrentMonth = isSameMonth(currentVisibleMonth, new Date());

  const gapClass =
    calendarTheme === 'seamless'
      ? 'gap-0 px-0 py-0'
      : calendarTheme === 'compact-bar'
      ? 'gap-1 px-1 pt-0.5 pb-1'
      : 'gap-1 sm:gap-1.5 px-1.5 pt-0.5 pb-1 sm:pb-1.5';

  return (
    <div className="pt-1.5 pb-0 h-full flex flex-col select-none overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-[calc(0.75rem+var(--sat))] left-1/2 -translate-x-1/2 z-[70] bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-200 flex items-center space-x-2 text-xs sm:text-sm font-bold backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Calendar Header with Navigation Controls (Left) & Action Group (Right) */}
      <div className="flex justify-between items-center mb-2 px-3 shrink-0">
        {/* Left Side: Month / Year Navigation */}
        <div className="flex items-center space-x-1 min-w-0">
          <button
            onClick={goToPreviousMonth}
            disabled={currentMonthIndex <= 0}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer touch-manipulation active:scale-90 transition-all shrink-0"
            aria-label="Önceki Ay"
            title="Önceki Ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setPickerYear(currentVisibleMonth.getFullYear());
              setIsMonthPickerOpen(true);
            }}
            className="flex items-baseline space-x-1 px-1.5 py-0.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group select-none text-left touch-manipulation min-w-0"
            title="Hızlı Ay ve Yıl Seç"
            aria-label="Hızlı Ay ve Yıl Seç"
          >
            <h2 className="text-xl sm:text-2xl font-black capitalize tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
              {monthName}
            </h2>
            <span className="text-sm sm:text-base font-bold text-slate-400 dark:text-slate-500 group-hover:text-primary-500 shrink-0">
              {yearNumber}
            </span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400 group-hover:text-primary-500 transition-transform opacity-70 shrink-0" />
          </button>

          <button
            onClick={goToNextMonth}
            disabled={currentMonthIndex >= months.length - 1}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer touch-manipulation active:scale-90 transition-all shrink-0"
            aria-label="Sonraki Ay"
            title="Sonraki Ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Team / Pattern Selector & View Style Switcher */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {currentPattern ? (
            <button
              onClick={() => setIsTeamSelectorOpen(true)}
              className="text-[11px] font-black px-2.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary-300 dark:hover:border-primary-700 transition-all flex items-center space-x-1.5 shadow-2xs shrink-0 cursor-pointer active:scale-95 touch-manipulation"
              title="Aktif Ekip / Düzen Değiştir"
              aria-label="Aktif Ekip / Düzen Değiştir"
            >
              <Users className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[70px] sm:max-w-[120px] truncate">
                {currentPattern.name
                  .replace(/\s*\(HAT\)/gi, '')
                  .replace(/\s*ekibi/gi, '')
                  .replace(/\s*ekib[iİ]/gi, '')
                  .trim() || currentPattern.name}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => setIsTeamSelectorOpen(true)}
              className="text-[11px] font-black px-2.5 py-1.5 rounded-2xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50 transition-all flex items-center space-x-1 shadow-2xs shrink-0 cursor-pointer animate-pulse active:scale-95 touch-manipulation"
              title="Ekip / Düzen Seç"
              aria-label="Ekip / Düzen Seç"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Ekip Seç</span>
            </button>
          )}

          {/* UI Theme / View Style Switcher Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            title={t('calendar_view_options', 'Görünüm Seçenekleri')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 shadow-xs transition-all active:scale-95 text-xs font-extrabold group cursor-pointer touch-manipulation shrink-0"
          >
            <Palette className="w-4 h-4 text-primary-500 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="hidden sm:inline">{t('calendar_view_button', 'Görünüm')}</span>
          </button>
        </div>
      </div>

      {/* Floating Leave Preview & Confirmation Dock */}
      {leavePreview && (
        <div
          style={{
            borderColor: customVacationColor,
            background: `linear-gradient(to right, ${customVacationColor}20, ${customVacationColor}10, ${customVacationColor}05)`,
            boxShadow: `0 10px 25px -5px ${customVacationColor}25`,
          }}
          className="mx-3 mb-2 p-2.5 sm:p-3 rounded-2xl border-2 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center space-x-2.5 min-w-0 w-full sm:w-auto">
            <div
              style={{ backgroundColor: customVacationColor }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white flex items-center justify-center font-black shadow-xs shrink-0 text-sm sm:text-base"
            >
              <ShiftIcon icon={customVacationIcon} className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span
                  style={{ color: customVacationColor }}
                  className="text-[10.5px] sm:text-xs font-black uppercase tracking-wider truncate"
                >
                  {leavePreview.title || customVacationName}
                </span>
                <span
                  style={{
                    backgroundColor: `${customVacationColor}25`,
                    color: customVacationColor,
                  }}
                  className="text-[10px] font-black px-2 py-0.2 rounded-full whitespace-nowrap"
                >
                  {leavePreview.totalVacationDays} Gün Tatil • {leavePreview.leaveDaysSpent} Gün İzin
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                {format(parseISO(leavePreview.startDateStr), 'd MMMM', { locale: dateLocale })} -{' '}
                {format(parseISO(leavePreview.endDateStr), 'd MMMM yyyy', { locale: dateLocale })}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
            {isLeavePlanningOpen && (
              <button
                onClick={restoreLeavePlanning}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black shadow-md shadow-primary-600/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4 -ml-0.5" />
                <span>Listeye Dön</span>
              </button>
            )}

            <button
              onClick={handleApplyPreviewLeave}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer touch-manipulation"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Takvime Kaydet</span>
            </button>

            <button
              onClick={() => {
                clearLeavePreview();
                if (isLeavePlanningOpen) {
                  closeLeavePlanning();
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center space-x-1"
              title="Planlamayı İptal Et"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">İptal</span>
            </button>
          </div>
        </div>
      )}

      {/* Continuing Leave Planning Session Banner (when minimized without active preview) */}
      {!leavePreview && isLeavePlanningOpen && isLeavePlanningMinimized && (
        <div className="mx-3 mb-2 p-2.5 sm:p-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 shadow-md flex items-center justify-between gap-2.5 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 text-xs">
              🌴
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                İzin Planlaması Devam Ediyor
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                Kaldığınız yerden devam etmek için listeye dönün
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={restoreLeavePlanning}
              className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black shadow-md shadow-primary-500/20 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Listeye Dön</span>
            </button>
            <button
              onClick={closeLeavePlanning}
              className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer"
              title="Planlamayı İptal Et"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Informational Banner if No Active Pattern is Selected */}
      {!isLoadingData && !currentPattern && (
        <div className="mx-3 mb-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2.5 shadow-2xs shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11.5px] font-bold text-amber-900 dark:text-amber-200 truncate">
              Vardiyaları görmek için bir düzen seçin
            </span>
          </div>
          <Link
            to="/patterns"
            className="text-xs font-black px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-xs transition-all shrink-0 touch-manipulation"
          >
            Düzen Seç →
          </Link>
        </div>
      )}

      {/* Weekday Labels (Fixed Header) */}
      <div
        className={`grid grid-cols-7 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 ${
          calendarTheme === 'seamless'
            ? 'gap-0 px-0'
            : calendarTheme === 'compact-bar'
            ? 'gap-1 px-1 py-0.5'
            : 'gap-1 sm:gap-1.5 px-1.5 py-0.5'
        } touch-none`}
      >
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, i) => (
          <div
            key={i}
            className={`text-center text-[11px] uppercase font-bold py-1.5 ${
              calendarTheme === 'seamless'
                ? 'border-r last:border-r-0 border-slate-200/60 dark:border-slate-800/60'
                : ''
            } ${
              i >= 5
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Continuous Stream of Unique Weeks with CSS Scroll-Snap (ZERO Duplicate Days!) */}
      <div
        ref={containerRef}
        onTouchStart={handleCalendarTouchStart}
        onTouchEnd={handleCalendarTouchEnd}
        className={`relative flex-1 min-h-[280px] overflow-y-auto snap-y snap-mandatory overscroll-y-none touch-pan-y gpu-scroll-container flex flex-col ${
          !isDayDetailOpen ? 'pb-[var(--sab)]' : ''
        } ${
          calendarTheme === 'seamless'
            ? 'border-b border-l border-slate-200/70 dark:border-slate-800/70'
            : 'border-b border-slate-200/70 dark:border-slate-800/70'
        }`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          overscrollBehaviorY: 'none',
        }}
      >
        {weeksData.map((week, wIdx) => {
          const monthIdx = weekToMonthMap.get(wIdx);
          const isSnapTarget = monthIdx !== undefined;

          return (
            <WeekRow
              key={week[0].dayStr}
              week={week}
              wIdx={wIdx}
              monthIdx={monthIdx}
              isSnapTarget={isSnapTarget}
              gapClass={gapClass}
              selectedDateStr={selectedDateStr}
              todayStr={todayStr}
              currentVisibleMonth={currentVisibleMonth}
              calendarTheme={calendarTheme}
              shiftDisplayMode={shiftDisplayMode}
              customVacationColor={customVacationColor}
              customVacationIcon={customVacationIcon}
              customVacationName={customVacationName}
              customHolidayColor={customHolidayColor}
              customHolidayIcon={customHolidayIcon}
              customHolidayName={customHolidayName}
              isLoadingData={isLoadingData}
              onSelectDate={handleSelectDate}
            />
          );
        })}
      </div>

      {/* Bottom Detail Card: Selected Day Shift & Holiday Detail */}
      <SelectedDayDetailCard
        selectedDate={selectedDate}
        selectedShift={selectedShift}
        selectedException={selectedException}
        selectedHolidayDetail={selectedHolidayDetail}
        selectedVisualProps={selectedVisualProps}
        isSelectedRest={isSelectedRest}
        leaveVisual={selectedLeaveVisual}
        customVacationColor={customVacationColor}
        customVacationIcon={customVacationIcon}
        customVacationName={customVacationName}
        customHolidayColor={customHolidayColor}
        customHolidayIcon={customHolidayIcon}
        customSickIcon={customSickIcon}
        isOpen={isDayDetailOpen}
        dateLocale={dateLocale}
        t={t}
        onClose={handleCloseDetail}
        onGoToToday={goToToday}
        onAddQuickException={handleAddQuickException}
        onRemoveQuickException={handleRemoveQuickException}
      />

      {/* Quick Month & Year Picker Modal */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pt-[calc(var(--sat)+1rem)] pb-[calc(var(--sab)+1rem)] px-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setIsMonthPickerOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative bg-card dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 w-full max-w-sm shadow-2xl z-10 space-y-3.5 my-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Ay ve Yıl Seçimi"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-primary-500" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Ay ve Yıl Seçimi
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthPickerOpen(false);
                    goToToday();
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-black bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 active:scale-95 transition-all cursor-pointer touch-manipulation"
                >
                  {t('go_to_today', 'Bugün')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Year Selector */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 px-0.5">
                Yıl
              </span>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${availableYears.length}, minmax(0, 1fr))` }}
              >
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setPickerYear(yr);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      pickerYear === yr
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Month Grid (12 Months) */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 px-0.5">
                Ay ({pickerYear})
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {monthPickerNames.map((name, idx) => {
                  const targetIdx = months.findIndex(
                    (m) => m.getFullYear() === pickerYear && m.getMonth() === idx
                  );
                  const isAvailable = targetIdx !== -1;
                  const isCurrent =
                    currentVisibleMonth.getFullYear() === pickerYear &&
                    currentVisibleMonth.getMonth() === idx;

                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSelectMonthFromPicker(targetIdx)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center capitalize ${
                        !isAvailable
                          ? 'opacity-25 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600'
                          : isCurrent
                          ? 'bg-primary-600 text-white font-black shadow-xs ring-2 ring-primary-400/40 cursor-pointer'
                          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 cursor-pointer'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Theme Customizer Modal */}
      <CalendarThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <QuickTeamSelectorSheet
        isOpen={isTeamSelectorOpen}
        onClose={() => setIsTeamSelectorOpen(false)}
        onPatternChanged={(name) => {
          setToastMessage(`${name} takvime uygulandı! 🎉`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* Floating Jump-To-Today Action Pill */}
      <AnimatePresence>
        {!isThisCurrentMonth && !isDayDetailOpen && (
          <motion.button
            key="floating-today-btn"
            initial={{ opacity: 0, y: 24, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.88 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            whileTap={{ scale: 0.94 }}
            onClick={goToToday}
            className="fixed bottom-[calc(1.25rem+var(--sab))] left-1/2 -translate-x-1/2 z-35 flex items-center space-x-2 px-4 py-2.5 rounded-full bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-xl shadow-slate-950/25 dark:shadow-black/40 border border-slate-700/60 dark:border-slate-300/80 backdrop-blur-md cursor-pointer touch-manipulation select-none active:scale-95 hover:bg-slate-800 dark:hover:bg-white transition-all group"
            title={t('return_to_today', 'Bugüne Dön')}
            aria-label={t('return_to_today', 'Bugüne Dön')}
          >
            <div className="w-5 h-5 rounded-full bg-primary-500/20 dark:bg-primary-500/25 flex items-center justify-center text-primary-400 dark:text-primary-600 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black tracking-wide">
              {t('return_to_today', 'Bugüne Dön')}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;



