import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './firebase/auth';
import './index.css';

// Restore SPA deep-link from 404.html fallback.
const saved = sessionStorage.getItem('spa-redirect');
if (saved) {
  sessionStorage.removeItem('spa-redirect');
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (saved.startsWith(basename)) {
    window.history.replaceState(null, '', saved);
  }
}

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
