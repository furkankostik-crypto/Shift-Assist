import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n'; // Initialize i18n
import { initPreventPullToRefresh } from './utils/preventPullToRefresh';

// Block mobile browser pull-to-refresh gesture
initPreventPullToRefresh();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
