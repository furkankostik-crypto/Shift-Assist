import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShiftRangeCalendar } from '../ShiftRangeCalendar';
import { createTeamPattern } from '../../db/db';

describe('ShiftRangeCalendar - Date Range Picker & Interactive Calendar', () => {
  const d1Pattern = createTeamPattern('D1');

  it('renders calendar month header and day names', () => {
    const onRangeChange = vi.fn();

    render(
      <ShiftRangeCalendar
        startDateStr=""
        endDateStr=""
        onRangeChange={onRangeChange}
        selectedYear={2026}
        currentPattern={d1Pattern}
        patternStartDate="2026-01-12"
      />
    );

    // Weekday headers: Pzt, Sal, Çar, Per, Cum, Cmt, Paz
    expect(screen.getByText('Pzt')).toBeInTheDocument();
    expect(screen.getByText('Paz')).toBeInTheDocument();
  });

  it('calls onRangeChange when a day cell is clicked', () => {
    const onRangeChange = vi.fn();

    render(
      <ShiftRangeCalendar
        startDateStr=""
        endDateStr=""
        onRangeChange={onRangeChange}
        selectedYear={2026}
        currentPattern={d1Pattern}
        patternStartDate="2026-01-12"
      />
    );

    // Click on day "15" in current month
    const dayCells = screen.getAllByText('15');
    expect(dayCells.length).toBeGreaterThan(0);
    fireEvent.click(dayCells[0]);

    expect(onRangeChange).toHaveBeenCalled();
    const [firstCallStart, firstCallEnd] = onRangeChange.mock.calls[0];
    expect(firstCallStart).toMatch(/^2026-\d{2}-15$/);
    expect(firstCallEnd).toBe('');
  });

  it('handles preset quick duration buttons', () => {
    const onRangeChange = vi.fn();
    const onPresetDays = vi.fn();

    render(
      <ShiftRangeCalendar
        startDateStr="2026-06-01"
        endDateStr="2026-06-10"
        onRangeChange={onRangeChange}
        onPresetDays={onPresetDays}
        selectedYear={2026}
        currentPattern={d1Pattern}
        patternStartDate="2026-01-12"
      />
    );

    const preset10Btn = screen.getByRole('button', { name: /\+.*10.*g/i });
    fireEvent.click(preset10Btn);

    expect(onPresetDays).toHaveBeenCalledWith(10);
  });

  it('calls onRangeChange with empty strings when Temizle (Reset) is clicked', () => {
    const onRangeChange = vi.fn();

    render(
      <ShiftRangeCalendar
        startDateStr="2026-06-01"
        endDateStr="2026-06-10"
        onRangeChange={onRangeChange}
        selectedYear={2026}
        currentPattern={d1Pattern}
        patternStartDate="2026-01-12"
      />
    );

    const resetBtn = screen.getByTitle('Sıfırla');
    fireEvent.click(resetBtn);

    expect(onRangeChange).toHaveBeenCalledWith('', '');
  });

  it('highlights invalid start date on Sunday with warning badge and banner', () => {
    const onRangeChange = vi.fn();

    // 2026-09-20 is Sunday
    render(
      <ShiftRangeCalendar
        startDateStr="2026-09-20"
        endDateStr="2026-09-24"
        onRangeChange={onRangeChange}
        selectedYear={2026}
        currentPattern={d1Pattern}
        patternStartDate="2026-01-12"
      />
    );

    // Should display warning badge on the cell
    expect(screen.getByText('⚠️ Pazar Başlayamaz')).toBeInTheDocument();
    // Should display warning in legend
    expect(screen.getByText('Hatalı Seçim')).toBeInTheDocument();
  });

  it('renders suggested start date when customAnalysis has boundary adjustment', () => {
    const onRangeChange = vi.fn();

    const mockAnalysis: any = {
      isValid: false,
      period: 'WINTER_2',
      hasBoundaryAdjustment: true,
      suggestedStartDateStr: '2026-09-19',
      suggestedEndDateStr: '2026-09-24',
      formalStartDateStr: '2026-09-19',
      formalEndDateStr: '2026-09-24',
      formalStartDate: new Date(2026, 8, 19),
      formalEndDate: new Date(2026, 8, 24),
      vacationStartDateStr: '2026-09-17',
      vacationEndDateStr: '2026-09-26',
      vacationStartDate: new Date(2026, 8, 17),
      vacationEndDate: new Date(2026, 8, 26),
      leaveDaysSpent: 5,
      totalVacationDays: 10,
      efficiencyMultiplier: 2.0,
      breakdown: [],
    };

    render(
      <ShiftRangeCalendar
        startDateStr="2026-09-20"
        endDateStr="2026-09-24"
        onRangeChange={onRangeChange}
        selectedYear={2026}
        currentPattern={d1Pattern}
        patternStartDate="2026-01-12"
        customAnalysis={mockAnalysis}
      />
    );

    // Should show ghost badge on 19th
    expect(screen.getByText('💡 Önerilen Başlangıç')).toBeInTheDocument();
  });
});
