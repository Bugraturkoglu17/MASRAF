import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import './styles/theme.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kök DOM elemanı (#root) bulunamadı.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
