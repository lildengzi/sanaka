import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppStoreProvider } from './store/AppStore';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </React.StrictMode>
);
