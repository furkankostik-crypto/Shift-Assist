import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

describe('useAppStore - State Management', () => {
  beforeEach(() => {
    // Reset to initial state
    useAppStore.setState({
      theme: 'system',
      calendarTheme: 'modern-rounded',
      shiftDisplayMode: 'both',
      employmentStartDate: null,
      annualLeaveEntitlement: 14,
      isLeavePlanningOpen: false,
      isLeavePlanningMinimized: false,
      leavePlanningStep: 'METHOD',
      leavePlanningPeriod: 'WINTER_1',
      leavePlanningMonth: 'ALL',
      leavePlanningShift: 'ALL',
      leavePreview: null,
      globalToastMessage: null,
    });
  });

  it('should update theme correctly', () => {
    expect(useAppStore.getState().theme).toBe('system');
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('should update calendarTheme and shiftDisplayMode', () => {
    useAppStore.getState().setCalendarTheme('seamless');
    expect(useAppStore.getState().calendarTheme).toBe('seamless');

    useAppStore.getState().setShiftDisplayMode('icon');
    expect(useAppStore.getState().shiftDisplayMode).toBe('icon');
  });

  it('should manage leave planning wizard lifecycle', () => {
    const store = useAppStore.getState();

    store.openLeavePlanning({ year: 2027, period: 'SUMMER' });
    expect(useAppStore.getState().isLeavePlanningOpen).toBe(true);
    expect(useAppStore.getState().leavePlanningYear).toBe(2027);
    expect(useAppStore.getState().leavePlanningPeriod).toBe('SUMMER');
    expect(useAppStore.getState().leavePlanningStep).toBe('OPPORTUNITIES');

    store.minimizeLeavePlanning();
    expect(useAppStore.getState().isLeavePlanningMinimized).toBe(true);

    store.restoreLeavePlanning();
    expect(useAppStore.getState().isLeavePlanningOpen).toBe(true);
    expect(useAppStore.getState().isLeavePlanningMinimized).toBe(false);

    store.closeLeavePlanning();
    expect(useAppStore.getState().isLeavePlanningOpen).toBe(false);
  });

  it('should trigger and clear global toast notifications', () => {
    useAppStore.getState().showGlobalToast('Test Toast');
    expect(useAppStore.getState().globalToastMessage).toBe('Test Toast');
  });

  it('should set and clear holidayHighlight correctly', () => {
    expect(useAppStore.getState().holidayHighlight).toBeNull();

    useAppStore.getState().setHolidayHighlight({
      id: 'dynamic-2026-03-20-ramazan',
      name: 'Ramazan Bayramı 1. Gün',
      dateStr: '2026-03-20',
      dates: ['2026-03-19', '2026-03-20', '2026-03-21', '2026-03-22'],
      daysCount: 4,
      type: 'religious',
      isOfficial: true,
      year: 2026,
      filterTab: 'OFFICIAL',
    });

    const highlight = useAppStore.getState().holidayHighlight;
    expect(highlight).toBeDefined();
    expect(highlight?.name).toBe('Ramazan Bayramı 1. Gün');
    expect(highlight?.dates.length).toBe(4);
    expect(highlight?.filterTab).toBe('OFFICIAL');

    useAppStore.getState().clearHolidayHighlight();
    expect(useAppStore.getState().holidayHighlight).toBeNull();
  });
});
