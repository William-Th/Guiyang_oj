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
  // 注意：请勿开启 React.StrictMode——开发期 effect 双跑会让 wangEditor 的
  // createEditor 在同一容器重复创建而抛错（RichTextEditor 为命令式封装）。
  <ConfigProvider locale={zhCN} theme={boheTheme}>
    {/* component={false}：仅提供 message/modal 上下文，不渲染额外 DOM 影响布局 */}
    <AntdApp component={false}>
      <FeedbackBinder />
      <App />
    </AntdApp>
  </ConfigProvider>,
);
