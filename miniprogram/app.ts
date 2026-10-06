import { logger } from './utils/logger';

App({
  globalData: {},
  onLaunch() {
    logger.info('app', '启动');
  },
  onError(msg: string) {
    logger.error('app.onError', msg);
  },
  onUnhandledRejection(res: { reason: unknown }) {
    logger.error('app.unhandledRejection', String(res.reason));
  },
  onPageNotFound(res: { path: string; isEntryPage?: boolean }) {
    logger.warn('app.pageNotFound', res.path);
    wx.reLaunch({ url: '/pages/home/index' });
  },
});
