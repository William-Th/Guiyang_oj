import React, { useEffect } from 'react';
import { App } from 'antd';
import { bindFeedbackApis } from '../../lib/feedback';

/**
 * 挂载在根节点 antd <App> 内部，把带主题上下文的
 * message / modal 实例绑定到 lib/feedback 单例，
 * 供全应用替代 antd 静态 message / Modal 调用。
 */
const FeedbackBinder: React.FC = () => {
  const { message, modal } = App.useApp();

  useEffect(() => {
    bindFeedbackApis({ message, modal });
  }, [message, modal]);

  return null;
};

export default FeedbackBinder;
