import { UserRow, getStudentUsers, getTeacherUsers } from '../../../../services/api';
import { isAdmin, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

type UserTab = 'student' | 'teacher';

interface DisplayUser {
  id: number;
  username: string;
  real_name: string;
  status: string;
  metaText: string;
}

function decorate(u: UserRow): DisplayUser {
  const parts: string[] = [];
  if (u.school_name) parts.push(u.school_name);
  if (u.grade) parts.push(u.grade);
  if (u.class) parts.push(String(u.class));
  if (u.student_no) parts.push(`学号 ${u.student_no}`);
  return {
    id: u.id,
    username: u.username,
    real_name: u.real_name ?? '',
    status: u.status ?? 'active',
    metaText: parts.join(' · '),
  };
}

function match(u: DisplayUser, keyword: string): boolean {
  if (!keyword) return true;
  return u.real_name.includes(keyword) || u.username.toLowerCase().includes(keyword.toLowerCase());
}

Page({
  data: {
    tabs: [
      { label: '学生', value: 'student' },
      { label: '教师', value: 'teacher' },
    ],
    tab: 'student' as UserTab,
    keyword: '',
    loading: false,
    list: [] as DisplayUser[],
  },

  // 原始数据缓存（接口无搜索参数，前端过滤）
  rawStudents: [] as DisplayUser[],
  rawTeachers: [] as DisplayUser[],

  onShow() {
    if (!requireLogin()) return;
    if (!isAdmin()) {
      wx.showToast({ title: '无管理权限', icon: 'none' });
      wx.navigateBack();
      return;
    }
    if (this.rawStudents.length === 0 && this.rawTeachers.length === 0) {
      this.load();
    }
  },

  async load() {
    this.setData({ loading: true });
    try {
      if (this.data.tab === 'student') {
        if (this.rawStudents.length === 0) {
          this.rawStudents = (await getStudentUsers()).map(decorate);
        }
        this.applyFilter();
      } else {
        if (this.rawTeachers.length === 0) {
          this.rawTeachers = (await getTeacherUsers()).map(decorate);
        }
        this.applyFilter();
      }
    } catch (err) {
      toastError(err, '用户列表加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const keyword = this.data.keyword.trim();
    const raw = this.data.tab === 'student' ? this.rawStudents : this.rawTeachers;
    this.setData({ list: raw.filter((u) => match(u, keyword)) });
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const tab = String(e.currentTarget.dataset.tab) as UserTab;
    this.setData({ tab });
    this.load();
  },

  onKeyword() {
    this.applyFilter();
  },
});
