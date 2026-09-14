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
});
