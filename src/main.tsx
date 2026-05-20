import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1', // Indigo Accent
          borderRadius: 8,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          colorBgBase: '#0b0c10', // Matching --bg-app
          colorBgContainer: '#12141c', // Matching --bg-sidebar / --bg-card
          colorBorder: '#292b35', // Matching --border
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>
);
