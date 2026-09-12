import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const LeavePlannerPage = lazy(() => import('./pages/LeavePlannerPage'));
const PatternsPage = lazy(() => import('./pages/PatternsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Live HMR dev mode active
function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-background text-primary-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<CalendarPage />} />
            <Route path="leave-planner" element={<LeavePlannerPage />} />
            <Route path="patterns" element={<PatternsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
