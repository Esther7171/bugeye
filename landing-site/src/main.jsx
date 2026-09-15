import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.jsx';
import './App.css';

const container = document.getElementById('root');
const tree = (
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
);

// Prerendered HTML (production build): hydrate it. Dev server ships an empty
// #root, so fall back to a fresh client render there.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
