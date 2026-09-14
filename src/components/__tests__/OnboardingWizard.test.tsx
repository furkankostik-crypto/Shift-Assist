import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from '../OnboardingWizard';
import { useAppStore } from '../../store/useAppStore';
import i18n from '../../i18n';

describe('OnboardingWizard - Interactive Setup Flow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('tr');
    useAppStore.setState({
      hasCompletedSetup: false,
      isSetupModalOpen: true,
      theme: 'system',
    });
  });

  it('renders the wizard modal with team selection step', async () => {
    render(<OnboardingWizard />);

    // Should show step 1 with team options
    expect(screen.getByText('A Ekibi')).toBeInTheDocument();
    expect(screen.getByText('B Ekibi')).toBeInTheDocument();
    expect(screen.getByText('C Ekibi')).toBeInTheDocument();
    expect(screen.getByText('D Ekibi')).toBeInTheDocument();
  });

  it('allows clicking a team to select and displays sub-teams', async () => {
    render(<OnboardingWizard />);

    const bTeam = screen.getByText('B Ekibi');
    fireEvent.click(bTeam);

    // Should show sub teams B1, B2, B3, B4
    await waitFor(() => {
      expect(screen.getByText('B1')).toBeInTheDocument();
      expect(screen.getByText('B2')).toBeInTheDocument();
      expect(screen.getByText('B3')).toBeInTheDocument();
      expect(screen.getByText('B4')).toBeInTheDocument();
    });
  });

  it('advances through wizard steps upon clicking continue', async () => {
    render(<OnboardingWizard />);

    // Click on D Ekibi then D1
    const dTeam = screen.getByText('D Ekibi');
    fireEvent.click(dTeam);

    const d1Btn = screen.getByText('D1');
    fireEvent.click(d1Btn);

    // Find "Devam Et" or "Continue" button
    const nextBtn = screen.getByRole('button', { name: /devam et|continue/i });
    fireEvent.click(nextBtn);

    // Step 2: Theme / Display configuration step
    await waitFor(() => {
      expect(screen.getByText(/görünüm|tema|theme|appearance/i)).toBeInTheDocument();
    });
  });
});
