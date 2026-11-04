import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { I18nProvider } from './lib/i18n.jsx';
import { InstitutionProvider } from './lib/institution.jsx';
import { ToastProvider, ConfirmProvider } from './components/ui.jsx';

try { document.documentElement.dataset.theme = localStorage.getItem('anka_theme') || 'dark'; } catch { /* storage unavailable */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <InstitutionProvider><ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider></InstitutionProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
