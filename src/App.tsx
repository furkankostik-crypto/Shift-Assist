import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import LeavePlannerPage from './pages/LeavePlannerPage';
import HolidaysPage from './pages/HolidaysPage';
import PatternsPage from './pages/PatternsPage';
import SettingsPage from './pages/SettingsPage';

// Offline-first static imports: ensures all pages work 100% offline even when mobile carrier blocks domain
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CalendarPage />} />
          <Route path="leave-planner" element={<LeavePlannerPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="patterns" element={<PatternsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
