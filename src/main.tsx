import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RouterProvider } from './contexts/RouterContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TrialUpgradeNudge } from './components/TrialUpgradeNudge';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <TrialUpgradeNudge />
          <App />
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  </StrictMode>
);
