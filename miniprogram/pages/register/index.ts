import {
  DistrictOption,
  RegistrationStatusInfo,
  SchoolOption,
  getDistricts,
  getSchools,
  queryRegistrationStatus,
  queryRegistrationStatusByIdentity,
  submitRegistration,
} from '../../services/api';
import { toastError } from '../../utils/request';

const GRADE_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

Page({
  data: {
    activeTab: 0,
    // 申请表单
    phone: '',
    realName: '',
    birthDate: '',
    idCardLast4: '',
    districts: [] as DistrictOption[],
    districtNames: [] as string[],
    districtIndex: -1,
    schools: [] as SchoolOption[],
    schoolNames: [] as string[],
    schoolIndex: -1,
    grades: GRADE_OPTIONS,
    gradeIndex: -1,
    submitting: false,
    // 提交成功结果（查询码仅此一次展示）
    result: null as null | { id: number; estimatedReviewTime: string; inquiryCode: string },
    // 查进度
    queryMode: 'id' as 'id' | 'code',
    queryPhone: '',
    queryBirthDate: '',
    queryIdCard: '',
    queryCode: '',
    querying: false,
    statusInfo: null as RegistrationStatusInfo | null,
    statusTagType: 'warning' as 'warning' | 'success' | 'danger',
  },

  onLoad() {
    this.loadDistricts();
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ activeTab: Number(e.detail.index ?? 0) });
  },

  onQueryBirthChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ queryBirthDate: String(e.detail.value ?? '') });
  },

  toggleQueryMode() {
    this.setData({ queryMode: this.data.queryMode === 'id' ? 'code' : 'id', statusInfo: null });
  },

  onField(e: WechatMiniprogram.CustomEvent) {
    const field = e.currentTarget.dataset.field as
      | 'phone'
      | 'realName'
      | 'idCardLast4'
      | 'queryPhone'
      | 'queryCode'
      | 'queryIdCard';
    const patch: Record<string, string> = {};
    patch[field] = String(e.detail ?? '');
    this.setData(patch);
  },

  onBirthChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ birthDate: String(e.detail.value ?? '') });
  },

  async loadDistricts() {
    try {
      const res = await getDistricts();
      const districts = res.data ?? [];
      this.setData({ districts, districtNames: districts.map((d) => d.name) });
    } catch (err) {
      toastError(err, '区县配置加载失败');
    }
  },

  async onDistrictChange(e: WechatMiniprogram.CustomEvent) {
    const index = Number(e.detail.value);
    const district = this.data.districts[index];
    if (!district) return;
    this.setData({ districtIndex: index, schools: [], schoolNames: [], schoolIndex: -1 });
    try {
      const res = await getSchools(district.code);
      const schools = res.data ?? [];
      this.setData({ schools, schoolNames: schools.map((s) => s.name) });
    } catch (err) {
      toastError(err, '学校列表加载失败');
    }
  },

  onSchoolChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ schoolIndex: Number(e.detail.value) });
  },

  onGradeChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ gradeIndex: Number(e.detail.value) });
  },

  /** 校验规则与后端 POST /registration/student 完全一致，先端上提示避免白跑 */
  async onSubmit() {
    const d = this.data;
    const district = d.districts[d.districtIndex];
    const school = d.schools[d.schoolIndex];
    if (!/^1[3-9]\d{9}$/.test(d.phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (!d.realName.trim() || d.realName.trim().length < 2) {
      wx.showToast({ title: '姓名至少2个字符', icon: 'none' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate)) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }
    if (!/^\d{4}$/.test(d.idCardLast4)) {
      wx.showToast({ title: '身份证后4位需为4位数字', icon: 'none' });
      return;
    }
    if (!district) {
      wx.showToast({ title: '请选择区县', icon: 'none' });
      return;
    }
    if (!school) {
      wx.showToast({ title: '请选择学校', icon: 'none' });
      return;
    }
    if (d.submitting) return;
    this.setData({ submitting: true });
    try {
      const res = await submitRegistration({
        phone: d.phone,
        realName: d.realName.trim(),
        birthDate: d.birthDate,
        idCardLast4: d.idCardLast4,
        districtCode: district.code,
        schoolCode: school.code,
        grade: d.gradeIndex >= 0 ? d.grades[d.gradeIndex] : undefined,
      });
      this.setData({ result: res.data });
    } catch (err) {
      toastError(err, '提交注册申请失败');
    } finally {
      this.setData({ submitting: false });
    }
  },

  copyInquiryCode() {
    wx.setClipboardData({ data: this.data.result?.inquiryCode ?? '' });
  },

  backToLogin() {
    wx.navigateBack();
  },

  async onQuery() {
    const d = this.data;
    if (!/^1[3-9]\d{9}$/.test(d.queryPhone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (d.querying) return;
    this.setData({ querying: true, statusInfo: null });
    try {
      let res;
      if (d.queryMode === 'id') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d.queryBirthDate)) {
          wx.showToast({ title: '请选择出生日期', icon: 'none' });
          return;
        }
        if (!/^\d{17}[\dXx]$/.test(d.queryIdCard)) {
          wx.showToast({ title: '请填写完整的18位身份证号', icon: 'none' });
          return;
        }
        res = await queryRegistrationStatusByIdentity(d.queryPhone, d.queryBirthDate, d.queryIdCard);
      } else {
        if (!d.queryCode.trim() || d.queryCode.trim().length < 20) {
          wx.showToast({ title: '查询码不正确', icon: 'none' });
          return;
        }
        res = await queryRegistrationStatus(d.queryPhone, d.queryCode.trim());
      }
      const info = res.data;
      const statusTagType =
        info.status === 'approved' ? 'success' : info.status === 'rejected' ? 'danger' : 'warning';
      this.setData({ statusInfo: info, statusTagType });
    } catch (err) {
      toastError(err, '申请信息或查询码不正确');
    } finally {
      this.setData({ querying: false });
    }
  },
});
