import { MyCertificate, getMyCertificates } from '../../../../services/api';
import { getUser, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { BASE_URL, API_PREFIX } from '../../../../config/env';
import { formatDateTime } from '../../../../utils/format';

interface DisplayCertificate extends MyCertificate {
  dateText: string;
  downloading: boolean;
}

Page({
  data: {
    loading: true,
    list: [] as DisplayCertificate[],
    actingId: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    const user = getUser();
    if (!user?.id) {
      this.setData({ loading: false });
      return;
    }
    try {
      const res = await getMyCertificates(user.id);
      this.setData({
        loading: false,
        list: (res.certificates ?? []).map((c) => ({
          ...c,
          dateText: formatDateTime(c.issue_date, 'date'),
          downloading: false,
        })),
      });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载证书失败');
    }
  },

  onCopyCertNo(e: WechatMiniprogram.CustomEvent) {
    const certNo = String(e.currentTarget.dataset.no ?? '');
    if (!certNo) return;
    wx.setClipboardData({
      data: certNo,
      success: () => wx.showToast({ title: '编号已复制', icon: 'success' }),
    });
  },

  /** 下载 PDF 并打开（开发期 BASE_URL 为 http，真机需合法域名后可用） */
  onDownload(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const target = this.data.list.find((c) => c.id === id);
    if (!target || this.data.actingId) return;
    this.setData({ actingId: id, list: this.data.list.map((c) => (c.id === id ? { ...c, downloading: true } : c)) });
    wx.downloadFile({
      url: `${BASE_URL}${API_PREFIX}/certificates/download/${target.cert_no}`,
      header: { Authorization: `Bearer ${wx.getStorageSync('access_token') || ''}` },
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '证书下载失败', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          showMenu: true,
          fail: () => wx.showToast({ title: '证书打开失败', icon: 'none' }),
        });
      },
      fail: () => wx.showToast({ title: '证书下载失败，请检查网络', icon: 'none' }),
      complete: () => {
        this.setData({ actingId: 0, list: this.data.list.map((c) => ({ ...c, downloading: false })) });
      },
    });
  },
});
