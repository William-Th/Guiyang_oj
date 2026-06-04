import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import boheTheme from './theme/boheTheme';
import './theme/variables.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={boheTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
