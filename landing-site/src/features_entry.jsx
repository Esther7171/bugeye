import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import FeaturesGuide from './FeaturesGuide.jsx';
import './App.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeaturesGuide />
    <Analytics />
  </StrictMode>,
);
