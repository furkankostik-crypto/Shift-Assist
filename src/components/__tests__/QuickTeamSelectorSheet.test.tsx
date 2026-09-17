import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickTeamSelectorSheet } from '../QuickTeamSelectorSheet';
import { db, DEFAULT_PATTERN_START_DATE } from '../../db/db';

describe('QuickTeamSelectorSheet', () => {
  beforeEach(async () => {
    await db.activePatterns.clear();
    await db.patterns.clear();

    await db.patterns.bulkPut([
      {
        id: 'pattern-d1',
        name: 'D-1 Ekibi',
        cycleLength: 32,
        days: [{ dayIndex: 1, type: 'WORK', name: 'Gündüz', color: '#10b981' }],
      },
      {
        id: 'pattern-d2',
        name: 'D-2 Ekibi',
        cycleLength: 32,
        days: [{ dayIndex: 1, type: 'WORK', name: 'Gece', color: '#6366f1' }],
      },
    ]);

    await db.activePatterns.put({
      id: 'default-active-pattern',
      patternId: 'pattern-d1',
      startDate: DEFAULT_PATTERN_START_DATE,
    });
  });

  it('renders correctly when open', async () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <QuickTeamSelectorSheet isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Vardiya/i)).toBeInTheDocument();
    });
  });

  it('does NOT close overlay when selecting a team, and calls onPatternChanged', async () => {
    const handleClose = vi.fn();
    const handlePatternChanged = vi.fn();

    render(
      <MemoryRouter>
        <QuickTeamSelectorSheet
          isOpen={true}
          onClose={handleClose}
          onPatternChanged={handlePatternChanged}
        />
      </MemoryRouter>
    );

    // Click on group 'D'
    const groupDBtn = await screen.findByText('D');
    await act(async () => {
      fireEvent.click(groupDBtn);
    });

    // Find D-2 Ekibi button and click it
    const d2Btn = await screen.findByText('D-2 Ekibi');
    await act(async () => {
      fireEvent.click(d2Btn);
    });

    // Verify onPatternChanged was called
    await waitFor(() => {
      expect(handlePatternChanged).toHaveBeenCalledWith(expect.stringMatching(/D-?2 Ekibi/i));
    });

    // CRITICAL: Verify onClose was NOT called upon selection!
    expect(handleClose).not.toHaveBeenCalled();

    // Verify DB updated
    await waitFor(async () => {
      const active = await db.activePatterns.toArray();
      expect(active[0]?.patternId).toBe('pattern-d2');
    });
  });

  it('closes overlay when Kapat button or close icon is clicked', async () => {
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <QuickTeamSelectorSheet isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    const closeButtons = screen.getAllByRole('button', { name: /kapat/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);

    // Click the bottom 'Kapat' text button
    const bottomCloseBtn = screen.getByText('Kapat');
    fireEvent.click(bottomCloseBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});