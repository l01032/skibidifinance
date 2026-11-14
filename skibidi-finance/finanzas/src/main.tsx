import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { StoreProvider } from './store';
import { UIProvider } from './uiState';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </StoreProvider>
  </StrictMode>,
);
