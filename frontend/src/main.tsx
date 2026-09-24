import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import FeedbackBinder from './components/common/FeedbackBinder';
import boheTheme from './theme/boheTheme';
import './theme/variables.css';
import './styles/index.css';
import './styles/platform-future.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={boheTheme}>
      {/* component={false}：仅提供 message/modal 上下文，不渲染额外 DOM 影响布局 */}
      <AntdApp component={false}>
        <FeedbackBinder />
        <App />
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
