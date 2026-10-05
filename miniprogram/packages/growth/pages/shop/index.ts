import { ShopItem, ShopOwnedItem, equipShopItem, getMyShopItems, getShopItems, purchaseShopItem } from '../../../../services/growth';
import { getPointsAccount } from '../../../../services/api';
import { getUser, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

const CATEGORY_TEXT: Record<string, string> = {
  skin: '皮肤',
  avatar_frame: '头像框',
  name_color: '名字颜色',
  other: '其他',
};

const CATEGORY_ICON: Record<string, string> = {
  skin: 'brush-o',
  avatar_frame: 'contact',
  name_color: 'edit',
  other: 'gift-o',
};

interface DisplayItem {
  id: number;
  name: string;
  categoryText: string;
  icon: string;
  color: string;
  price: number;
  owned: boolean;
}

interface DisplayOwned {
  id: number;
  name: string;
  categoryText: string;
  icon: string;
  color: string;
  is_equipped: boolean;
}

function colorOf(config?: { color?: string }): string {
  return config?.color ?? '';
}

Page({
  data: {
    loading: true,
    balance: 0,
    category: 'all',
    categories: [
      { value: 'all', label: '全部' },
      { value: 'skin', label: '皮肤' },
      { value: 'avatar_frame', label: '头像框' },
      { value: 'name_color', label: '名字颜色' },
      { value: 'other', label: '其他' },
    ],
    items: [] as DisplayItem[],
    owned: [] as DisplayOwned[],
  },

  rawItems: [] as ShopItem[],
  rawOwned: [] as ShopOwnedItem[],

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const user = getUser();
      const [accountRes, itemsRes, ownedRes] = await Promise.all([
        user ? getPointsAccount(user.id).catch(() => null) : Promise.resolve(null),
        getShopItems().catch(() => null),
        getMyShopItems().catch(() => null),
      ]);
      this.rawItems = itemsRes?.data ?? [];
      this.rawOwned = ownedRes?.data ?? [];
      this.setData({ balance: accountRes?.data?.current_points ?? 0 });
      this.applyFilter();
    } catch (err) {
      toastError(err, '商店加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  async refreshBalance() {
    const user = getUser();
    if (!user) return;
    const res = await getPointsAccount(user.id).catch(() => null);
    this.setData({ balance: res?.data?.current_points ?? 0 });
  },

  applyFilter() {
    const ownedCodes = new Set(this.rawOwned.map((o) => o.item_code));
    const items = this.rawItems
      .filter((i) => this.data.category === 'all' || i.category === this.data.category)
      .map((i) => ({
        id: i.id,
        name: i.name,
        categoryText: CATEGORY_TEXT[i.category] ?? i.category,
        icon: CATEGORY_ICON[i.category] ?? 'gift-o',
        color: colorOf(i.config),
        price: i.price,
        owned: ownedCodes.has(i.item_code),
      }));
    const owned = [...this.rawOwned]
      .sort((a, b) => Number(b.is_equipped) - Number(a.is_equipped))
      .map((o) => ({
        id: o.id,
        name: o.name,
        categoryText: CATEGORY_TEXT[o.category] ?? o.category,
        icon: CATEGORY_ICON[o.category] ?? 'gift-o',
        color: colorOf(o.config),
        is_equipped: o.is_equipped,
      }));
    this.setData({ items, owned });
  },

  onCategoryChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ category: String(e.currentTarget.dataset.category) });
    this.applyFilter();
  },

  onPurchase(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.rawItems.find((i) => i.id === id);
    if (!item) return;
    wx.showModal({
      title: '确认兑换',
      content: `用 ${item.price} 积分兑换「${item.name}」？兑换后不可退换。`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await purchaseShopItem(id);
          wx.showToast({ title: result.message || '兑换成功', icon: 'none' });
          await Promise.all([this.refreshBalance(), this.load()]);
        } catch (err) {
          toastError(err, '兑换失败');
        }
      },
    });
  },

  async onToggleEquip(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const equipped = String(e.currentTarget.dataset.equipped) === 'true';
    try {
      const result = await equipShopItem(id, !equipped);
      wx.showToast({ title: result.message || (equipped ? '已卸下' : '已装备'), icon: 'none' });
      await this.load();
    } catch (err) {
      toastError(err, '操作失败');
    }
  },
});
