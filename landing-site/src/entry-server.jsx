import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import FeaturesGuide from './FeaturesGuide.jsx';
import './App.css';

// Prerender entry. <Analytics /> is intentionally omitted here: it renders no
// DOM, so leaving it out keeps the server markup identical to the client's
// while avoiding any analytics work at build time.
export function render(page) {
  const node = page === 'features' ? <FeaturesGuide /> : <App />;
  return renderToString(<StrictMode>{node}</StrictMode>);
}
