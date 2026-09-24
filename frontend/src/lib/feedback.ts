import type { MessageInstance } from 'antd/es/message/interface';
import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal';

/**
 * antd 反馈类 API 单例。
 *
 * 静态 message.xxx / Modal.xxx 无法消费 ConfigProvider 的主题上下文，
 * 运行时会触发 "[antd: message] Static function can not consume context" 警告。
 * 根节点 <App>（antd）内的 <FeedbackBinder> 在挂载时把 App.useApp() 的
 * 实例绑定到这里，业务代码改为从本模块导入 message / modal，
 * 调用方式与原静态 API 完全一致（message.success(...)、modal.confirm(...)）。
 */
export let message: MessageInstance;
export let modal: ModalHookAPI;

export const bindFeedbackApis = (apis: {
  message: MessageInstance;
  modal: ModalHookAPI;
}): void => {
  message = apis.message;
  modal = apis.modal;
};
