import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CalendarThemeId,
  DEFAULT_CALENDAR_THEME,
  type ShiftDisplayMode,
  DEFAULT_SHIFT_DISPLAY_MODE,
} from '../utils/calendarThemes';
import { triggerAutoSync } from '../services/syncService';

export interface LeavePreview {
  id?: string;
  title: string;
  startDateStr: string; // vacationStartDateStr
  endDateStr: string; // vacationEndDateStr
  formalStartDateStr: string;
  formalEndDateStr: string;
  leaveDaysSpent: number;
  totalVacationDays: number;
  savedFreeDays?: number;
  efficiencyMultiplier?: number;
  holidayNames?: string[];
  opportunity?: any;
  breakdown?: any[];
}

import type { LeavePeriod } from '../utils/leavePlanner';

export type WizardStep = 'METHOD' | 'PERIOD_SELECT' | 'OPPORTUNITIES' | 'MANUAL_CALENDAR';
export type OpportunityShiftFilter = 'ALL' | 'SINGLE' | 'DOUBLE' | 'BRIDGES' | 'BEST';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  calendarTheme: CalendarThemeId;
  setCalendarTheme: (calendarTheme: CalendarThemeId) => void;
  shiftDisplayMode: ShiftDisplayMode;
  setShiftDisplayMode: (shiftDisplayMode: ShiftDisplayMode) => void;
  employmentStartDate: string | null;
  setEmploymentStartDate: (dateStr: string | null) => void;
  annualLeaveEntitlement: number;
  setAnnualLeaveEntitlement: (days: number) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  leavePreview: LeavePreview | null;
  setLeavePreview: (preview: LeavePreview | null) => void;
  clearLeavePreview: () => void;
  isDayDetailOpen: boolean;
  setIsDayDetailOpen: (open: boolean) => void;
  hasCompletedSetup: boolean;
  setHasCompletedSetup: (completed: boolean) => void;
  isSetupModalOpen: boolean;
  setIsSetupModalOpen: (open: boolean) => void;
  isUpdateModalOpen: boolean;
  setIsUpdateModalOpen: (open: boolean) => void;
  // Leave planning flow state
  isLeavePlanningOpen: boolean;
  isLeavePlanningMinimized: boolean;
  leavePlanningYear: number;
  leavePlanningStep: WizardStep;
  leavePlanningPeriod: LeavePeriod;
  leavePlanningMonth: number | 'ALL';
  leavePlanningShift: OpportunityShiftFilter;
  leavePlanningExpandedCardId: string | null;
  leavePlanningCustomStart: string;
  leavePlanningCustomEnd: string;
  openLeavePlanning: (opts?: { year?: number; period?: LeavePeriod; step?: WizardStep }) => void;
  closeLeavePlanning: () => void;
  minimizeLeavePlanning: () => void;
  restoreLeavePlanning: () => void;
  setLeavePlanningYear: (year: number) => void;
  setLeavePlanningStep: (step: WizardStep) => void;
  setLeavePlanningPeriod: (period: LeavePeriod) => void;
  setLeavePlanningMonth: (month: number | 'ALL') => void;
  setLeavePlanningShift: (shift: OpportunityShiftFilter) => void;
  setLeavePlanningExpandedCardId: (id: string | null) => void;
  setLeavePlanningCustomRange: (start: string, end: string) => void;
  globalToastMessage: string | null;
  showGlobalToast: (msg: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        triggerAutoSync();
      },
      calendarTheme: DEFAULT_CALENDAR_THEME,
      setCalendarTheme: (calendarTheme) => {
        set({ calendarTheme });
        triggerAutoSync();
      },
      shiftDisplayMode: DEFAULT_SHIFT_DISPLAY_MODE,
      setShiftDisplayMode: (shiftDisplayMode) => {
        set({ shiftDisplayMode });
        triggerAutoSync();
      },
      employmentStartDate: null,
      setEmploymentStartDate: (employmentStartDate) => {
        set({ employmentStartDate });
        triggerAutoSync();
      },
      annualLeaveEntitlement: 14, // Default to 14 days (standard minimum in Turkey)
      setAnnualLeaveEntitlement: (annualLeaveEntitlement) => {
        set({ annualLeaveEntitlement });
        triggerAutoSync();
      },
      selectedDate: new Date(),
      setSelectedDate: (date) => set({ selectedDate: date }),
      leavePreview: null,
      setLeavePreview: (leavePreview) => set({ leavePreview }),
      clearLeavePreview: () => set({ leavePreview: null }),
      isDayDetailOpen: false,
      setIsDayDetailOpen: (isDayDetailOpen) => set({ isDayDetailOpen }),
      hasCompletedSetup: false,
      setHasCompletedSetup: (hasCompletedSetup) => {
        set({ hasCompletedSetup });
        triggerAutoSync();
      },
      isSetupModalOpen: false,
      setIsSetupModalOpen: (isSetupModalOpen) => set({ isSetupModalOpen }),
      isUpdateModalOpen: false,
      setIsUpdateModalOpen: (isUpdateModalOpen) => set({ isUpdateModalOpen }),
      // Leave planning flow state
      isLeavePlanningOpen: false,
      isLeavePlanningMinimized: false,
      leavePlanningYear: new Date().getFullYear(),
      leavePlanningStep: 'METHOD',
      leavePlanningPeriod: 'WINTER_1',
      leavePlanningMonth: 'ALL',
      leavePlanningShift: 'ALL',
      leavePlanningExpandedCardId: null,
      leavePlanningCustomStart: '',
      leavePlanningCustomEnd: '',
      openLeavePlanning: (opts) =>
        set((state) => ({
          isLeavePlanningOpen: true,
          isLeavePlanningMinimized: false,
          leavePlanningYear: opts?.year ?? state.leavePlanningYear,
          leavePlanningPeriod: opts?.period ?? state.leavePlanningPeriod,
          leavePlanningStep: opts?.step ?? (opts?.period ? 'OPPORTUNITIES' : 'METHOD'),
        })),
      closeLeavePlanning: () =>
        set({
          isLeavePlanningOpen: false,
          isLeavePlanningMinimized: false,
          leavePreview: null,
        }),
      minimizeLeavePlanning: () =>
        set({
          isLeavePlanningMinimized: true,
        }),
      restoreLeavePlanning: () =>
        set({
          isLeavePlanningOpen: true,
          isLeavePlanningMinimized: false,
        }),
      setLeavePlanningYear: (leavePlanningYear) => set({ leavePlanningYear }),
      setLeavePlanningStep: (leavePlanningStep) => set({ leavePlanningStep }),
      setLeavePlanningPeriod: (leavePlanningPeriod) => set({ leavePlanningPeriod }),
      setLeavePlanningMonth: (leavePlanningMonth) => set({ leavePlanningMonth }),
      setLeavePlanningShift: (leavePlanningShift) => set({ leavePlanningShift }),
      setLeavePlanningExpandedCardId: (leavePlanningExpandedCardId) =>
        set({ leavePlanningExpandedCardId }),
      setLeavePlanningCustomRange: (leavePlanningCustomStart, leavePlanningCustomEnd) =>
        set({ leavePlanningCustomStart, leavePlanningCustomEnd }),
      globalToastMessage: null,
      showGlobalToast: (msg: string) => {
        set({ globalToastMessage: msg });
        setTimeout(() => {
          set((state) => (state.globalToastMessage === msg ? { globalToastMessage: null } : {}));
        }, 3500);
      },
    }),
    {
      name: 'vardiya-settings',
      partialize: (state) => ({
        theme: state.theme,
        calendarTheme: state.calendarTheme,
        shiftDisplayMode: state.shiftDisplayMode,
        employmentStartDate: state.employmentStartDate,
        annualLeaveEntitlement: state.annualLeaveEntitlement,
        hasCompletedSetup: state.hasCompletedSetup,
      }),
    }
  )
);



