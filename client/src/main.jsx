import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { GeolocationProvider } from './features/dashboard/hooks/useGeolocation.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GeolocationProvider>
      <App />
    </GeolocationProvider>
  </React.StrictMode>
);
