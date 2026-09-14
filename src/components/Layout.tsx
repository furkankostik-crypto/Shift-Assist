import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ReloadPrompt from './ReloadPrompt';
import { AuthModal } from './AuthModal';
import FloatingNavMenu from './FloatingNavMenu';
import { OnboardingWizard } from './OnboardingWizard';
import { LeavePlanningModal } from './LeavePlanningModal';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { IosInstallBanner } from './IosInstallBanner';

const Layout = () => {
  const theme = useAppStore(state => state.theme);
  const hasCompletedSetup = useAppStore(state => state.hasCompletedSetup);
  const isSetupModalOpen = useAppStore(state => state.isSetupModalOpen);
  const globalToastMessage = useAppStore(state => state.globalToastMessage);
  const location = useLocation();
  const isCalendarPage = location.pathname === '/';

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isDark ? 'dark' : 'light');
        root.style.colorScheme = isDark ? 'dark' : 'light';
      } else {
        root.classList.add(theme);
        root.style.colorScheme = theme;
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden pt-[var(--sat)] pl-[var(--sal)] pr-[var(--sar)]">
      {/* Main Content Area: Maximum full-screen height for calendar and views */}
      <main
        className={`flex-1 ${
          isCalendarPage ? 'overflow-hidden' : 'overflow-y-auto'
        } overflow-x-hidden overscroll-y-none`}
        style={{ overscrollBehaviorY: 'none' }}
      >
        <div className="w-full max-w-3xl mx-auto h-full flex flex-col min-w-0">
          <Outlet />
        </div>
      </main>

      <ReloadPrompt />
      <AuthModal />
      {(!hasCompletedSetup || isSetupModalOpen) && <OnboardingWizard />}

      {/* Persistent Global Leave Planning Wizard Modal */}
      <LeavePlanningModal />

      {/* Global PWA Mobile Installation Guide */}
      <PwaInstallPrompt />

      {/* Floating Apple iOS Installation Hint Banner */}
      <IosInstallBanner />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {globalToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-[calc(0.75rem+var(--sat))] left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-200 flex items-center space-x-2 text-xs sm:text-sm font-bold backdrop-blur-md pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{globalToastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Burger / Speed-Dial Menu */}
      <FloatingNavMenu />
    </div>
  );
};

export default Layout;

