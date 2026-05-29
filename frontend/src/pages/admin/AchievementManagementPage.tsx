import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Descriptions,
  Badge,
  Drawer,
  Alert,
  Divider,
  Typography,
  Switch,
  Upload,
  Image,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  TrophyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import api from '@/services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

interface Achievement {
  achievement_id: number;
  achievement_code: string;
  achievement_name: string;
  achievement_desc: string;
  category: string;
  subcategory?: string;
  rarity: string;
  achievement_icon: string;
  points_reward: number;
  trigger_condition: any;
  is_active: boolean;
  is_hidden: boolean;
  max_times?: number;
  cooldown_days?: number;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
  display_order?: number;
}

// 分类映射
const CATEGORY_MAP: Record<string, string> = {
  exam_certification: '测评认证',
  learning_growth: '学习成长',
  social_collaboration: '社交协作',
  special_event: '特殊事件',
};

// 稀有度完整配置（图标、颜色、样式）

// 稀有度完整配置（图标、颜色、样式）
const RARITY_CONFIG: Record<string, { icon: string; label: string; tagColor: string; textColor: string; bgGradient: string }> = {
  common: {
    icon: '⚪',
    label: '普通',
    tagColor: 'default',
    textColor: '#8c8c8c',
    bgGradient: 'linear-gradient(135deg, #f0f0f0 0%, #d9d9d9 100%)',
  },
  rare: {
    icon: '💎',
    label: '稀有',
    tagColor: 'blue',
    textColor: '#1677ff',
    bgGradient: 'linear-gradient(135deg, #e6f4ff 0%, #91caff 100%)',
  },
  epic: {
    icon: '💜',
    label: '史诗',
    tagColor: 'purple',
    textColor: '#722ed1',
    bgGradient: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)',
  },
  legendary: {
    icon: '🌟',
    label: '传说',
    tagColor: 'gold',
    textColor: '#d48806',
    bgGradient: 'linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)',
  },
  mythic: {
    icon: '🔥',
    label: '神话',
    tagColor: 'red',
    textColor: '#cf1322',
    bgGradient: 'linear-gradient(135deg, #fff1f0 0%, #ffa39e 100%)',
  },
};

// 子分类映射
const SUBCATEGORY_MAP: Record<string, string> = {
  first_breakthrough: '首次突破',
  learning_duration: '学习时长',
  learning_frequency: '学习频率',
  consecutive_success: '连续成功',
  interaction: '互动交流',
  help: '帮助他人',
  recognition: '获得认可',
  sharing: '知识分享',
  holiday: '节日活动',
  seasonal: '季节活动',
  habit: '学习习惯',
  improvement: '能力提升',
  progression: '等级进阶',
  cross_subject: '跨学科',
  练习进度: '练习进度',
};

// 按分类分组的子分类选项（用于编辑表单下拉）
const SUBCATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  exam_certification: [
    { value: 'first_breakthrough', label: '首次突破' },
    { value: 'progression', label: '等级进阶' },
    { value: 'cross_subject', label: '跨学科' },
  ],
  learning_growth: [
    { value: 'first_breakthrough', label: '首次突破' },
    { value: 'learning_duration', label: '学习时长' },
    { value: 'learning_frequency', label: '学习频率' },
    { value: 'consecutive_success', label: '连续成功' },
    { value: 'habit', label: '学习习惯' },
    { value: 'improvement', label: '能力提升' },
    { value: '练习进度', label: '练习进度' },
  ],
  social_collaboration: [
    { value: 'interaction', label: '互动交流' },
    { value: 'help', label: '帮助他人' },
    { value: 'recognition', label: '获得认可' },
    { value: 'sharing', label: '知识分享' },
  ],
  special_event: [
    { value: 'holiday', label: '节日活动' },
    { value: 'seasonal', label: '季节活动' },
  ],
};

// 触发模式映射
const TRIGGER_MODE_MAP: Record<string, string> = {
  real_time: '实时触发',
  realtime: '实时触发',
  scheduled: '定时触发',
};

// 触发频率映射
const TRIGGER_FREQUENCY_MAP: Record<string, string> = {
  real_time: '实时',
  realtime: '实时',
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

// 条件类型映射
const CONDITION_TYPE_MAP: Record<string, string> = {
  count: '计数条件',
  threshold: '阈值条件',
  state: '状态条件',
  consecutive: '连续条件',
  time_window: '时间窗口',
  and: '组合条件',
};

// 事件类型配置（基于后端EventTypes.js和数据库实际数据）
const EVENT_TYPES = {
  '学生活动': {
    'student.activity.completed': '活动完成',
    'student.activity.started': '活动开始',
    'student.activity.submitted': '提交答案',
    'student.high.score': '获得高分（≥90分）',
    'student.perfect.score': '获得满分（100分）',
    'student.question.completed': '完成题目',
    'student.answer.created': '创建答案',
  },
  '学生登录': {
    'student.login': '每次登录',
    'student.login.morning': '早晨登录（6-8点）',
    'student.first.login': '首次登录',
    'student.login.streak': '连续登录',
  },
  '学生练习': {
    'student.practice.completed': '完成练习',
    'student.practice.fast': '快速完成',
    'student.practice.accuracy': '正确率达标',
    'student.practice.morning': '早晨练习',
  },
  '学生测评': {
    'student.exam.completed': '完成测评',
    'student.exam.started': '测评开始',
  },
  '学习成长': {
    'student.learning.duration': '学习时长达标',
    'student.weekly.learning': '每周学习',
    'student.level.upgraded': '等级提升',
    'student.subject.questions': '科目题目完成',
  },
  '日常任务': {
    'student.daily.accuracy': '每日正确率',
    'student.weekly.accuracy': '每周正确率',
    'student.monthly.accuracy': '每月正确率',
    'student.weekly.login.days': '每周登录天数',
    'student.monthly.login.days': '每月登录天数',
    'student.perfect.week': '完美一周',
  },
  '排行榜': {
    'student.rank.update': '排名更新',
    'student.rank.top10': '进入前十',
    'student.rank.first': '排名第一',
  },
  '社交协作': {
    'student.help.others': '帮助他人',
    'student.comment': '发表评论',
    'student.comment.created': '创建评论',
    'student.comment.liked': '评论获赞',
    'student.share': '分享内容',
    'student.experience.shared': '分享经验',
  },
  '多科目': {
    'student.multi.subject': '三冠王（数学/语文/英语金级）',
    'student.all.subjects.gold': '大满贯（所有科目金级）',
  },
  '成就系统': {
    'student.all.achievements': '获得所有成就',
  },
  '特殊事件': {
    'student.event.winter': '冬季活动',
  },
  '长期目标': {
    'student.year.perfect': '完美学年',
  },
};

// 创建事件类型到友好名称的映射
const EVENT_TYPE_MAP: Record<string, string> = {};
Object.values(EVENT_TYPES).forEach(group => {
  Object.entries(group).forEach(([key, value]) => {
    EVENT_TYPE_MAP[key] = value;
  });
});

// 字段名称映射（用于threshold_field等）
const FIELD_NAME_MAP: Record<string, string> = {
  'score': '分数',
  'accuracy': '正确率',
  'duration': '时长',
  'count': '次数',
  'days': '天数',
  'weeks': '周数',
  'months': '月数',
  'consecutiveDays': '连续天数',
  'streakDays': '连续天数',
  'questionCount': '题目数量',
  'correctCount': '正确数量',
  'totalQuestions': '总题数',
  'correctAnswers': '正确答案数',
  'value': '数值',
};

// 条件类型选项
const CONDITION_TYPES = [
  { value: 'count', label: '计数条件 - 达到指定次数' },
  { value: 'threshold', label: '阈值条件 - 达到指定数值' },
  { value: 'state', label: '状态条件 - 满足特定状态' },
  { value: 'consecutive', label: '连续条件 - 连续天数/周数' },
];

// 触发模式选项
const TRIGGER_MODES = [
  { value: 'real_time', label: '实时触发 - 事件发生时立即检测' },
  { value: 'scheduled', label: '定时触发 - 定时任务检测' },
];

const AchievementManagementPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isHelpDrawerVisible, setIsHelpDrawerVisible] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [viewingAchievement, setViewingAchievement] = useState<Achievement | null>(null);
  const [form] = Form.useForm();
  const [conditionType, setConditionType] = useState<string>('count');
  const [selectedCategory, setSelectedCategory] = useState<string>('learning_growth');
  const [uploadedIcon, setUploadedIcon] = useState<string>('');
  const [iconFileList, setIconFileList] = useState<UploadFile[]>([]);

  // 检查权限
  const hasPermission = () => {
    return user?.role === 'system_admin' || user?.role === 'municipal_admin';
  };

  useEffect(() => {
    if (!hasPermission()) {
      message.error('您没有权限访问此页面');
      return;
    }
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/achievements');
      setAchievements(response.data.achievements || []);
    } catch (error: any) {
      message.error('获取成就列表失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAchievement(null);
    form.resetFields();
    setConditionType('count');
    setSelectedCategory('learning_growth');
    setUploadedIcon('');
    setIconFileList([]);
    setIsModalVisible(true);
  };

  const handleEdit = (record: Achievement) => {
    setEditingAchievement(record);
    setSelectedCategory(record.category);
    const tc = record.trigger_condition;

    // 解析trigger_condition
    setConditionType(tc.condition_type || 'count');

    // Normalize trigger_mode (handle 'realtime' variant from database)
    const normalizedTriggerMode = tc.trigger_mode
      ? tc.trigger_mode.replace('realtime', 'real_time')
      : 'real_time';

    form.setFieldsValue({
      achievement_name: record.achievement_name,
      achievement_desc: record.achievement_desc,
      category: record.category,
      subcategory: record.subcategory,
      rarity: record.rarity,
      achievement_icon: record.achievement_icon,
      points_reward: record.points_reward,
      is_active: record.is_active,
      is_hidden: record.is_hidden || false,
      max_times: record.max_times || 1,
      cooldown_days: record.cooldown_days || 0,

      // trigger_condition fields - handle both new format and existing database format
      trigger_mode: normalizedTriggerMode,
      condition_type: tc.condition_type || 'count',
      event_name: tc.event_name,
      // Support both 'target_count' (new) and 'threshold' (existing DB) for count type
      target_count: tc.target_count || (tc.condition_type === 'count' ? tc.threshold : undefined),
      // Support both 'threshold_value' (new) and 'threshold' (existing DB) for threshold type
      threshold_value: tc.threshold_value || (tc.condition_type === 'threshold' ? tc.threshold : undefined),
      threshold_field: tc.threshold_field,
      // For consecutive type, check if threshold is used as days count
      consecutive_days: tc.consecutive_days || (tc.condition_type === 'consecutive' ? tc.threshold : undefined),
      consecutive_weeks: tc.consecutive_weeks,
    });

    // 设置图标
    setUploadedIcon(record.achievement_icon || '');
    if (record.achievement_icon && record.achievement_icon.startsWith('/uploads/')) {
      // 已上传的图片
      setIconFileList([{
        uid: '-1',
        name: record.achievement_icon.split('/').pop() || 'icon.png',
        status: 'done',
        url: `http://localhost:3001${record.achievement_icon}`,
      }]);
    } else {
      setIconFileList([]);
    }

    setIsModalVisible(true);
  };

  // 处理图片上传
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;

    const formData = new FormData();
    formData.append('icon', file);

    try {
      const response = await api.post('/upload/achievement-icon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setUploadedIcon(response.data.data.url);
        form.setFieldValue('achievement_icon', response.data.data.url);
        message.success('图标上传成功');
        onSuccess?.(response.data);
      } else {
        message.error(response.data.message || '上传失败');
        onError?.(new Error(response.data.message));
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '上传失败');
      onError?.(error);
    }
  };

  // 处理图片变化
  const handleUploadChange: UploadProps['onChange'] = ({ fileList }) => {
    setIconFileList(fileList);
  };

  // 移除图片
  const handleRemove = () => {
    setUploadedIcon('');
    setIconFileList([]);
    form.setFieldValue('achievement_icon', '');
  };

  const handleView = (record: Achievement) => {
    setViewingAchievement(record);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/achievements/${id}`);
      message.success('删除成就成功');
      fetchAchievements();
    } catch (error: any) {
      message.error('删除成就失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 构建trigger_condition
      const trigger_condition: any = {
        trigger_mode: values.trigger_mode,
        condition_type: values.condition_type,
        event_name: values.event_name,
      };

      // 根据condition_type添加特定字段
      if (values.condition_type === 'count') {
        trigger_condition.target_count = values.target_count;
      } else if (values.condition_type === 'threshold') {
        trigger_condition.threshold_value = values.threshold_value;
        if (values.threshold_field) {
          trigger_condition.threshold_field = values.threshold_field;
        }
      } else if (values.condition_type === 'consecutive') {
        if (values.consecutive_days) {
          trigger_condition.consecutive_days = values.consecutive_days;
        }
        if (values.consecutive_weeks) {
          trigger_condition.consecutive_weeks = values.consecutive_weeks;
        }
      }

      // 构建请求数据
      const requestData = {
        name: values.achievement_name,
        description: values.achievement_desc,
        category: values.category,
        subcategory: values.subcategory,
        rarity: values.rarity,
        icon: values.achievement_icon,
        points: values.points_reward,
        triggerCondition: trigger_condition,
        isHidden: values.is_hidden || false,
        maxTimes: values.max_times || 1,
        cooldownDays: values.cooldown_days || 0,
      };

      if (editingAchievement) {
        await api.put(`/achievements/${editingAchievement.achievement_id}`, requestData);
        message.success('更新成就成功');
      } else {
        await api.post('/achievements', requestData);
        message.success('创建成就成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchAchievements();
    } catch (error: any) {
      message.error('保存成就失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      exam_certification: 'blue',
      learning_growth: 'green',
      social_collaboration: 'purple',
      special_event: 'red',
    };
    return colors[category] || 'default';
  };

  // 将触发条件格式化为中文可读列表（用于详情弹窗）
  const formatTriggerConditionDetail = (tc: any) => {
    if (!tc) return [];

    const lines: { label: string; value: string }[] = [];

    // 触发模式
    if (tc.trigger_mode) {
      const normalizedMode = tc.trigger_mode.replace('realtime', 'real_time');
      lines.push({ label: '触发模式', value: TRIGGER_MODE_MAP[normalizedMode] || tc.trigger_mode });
    }

    // 触发频率
    if (tc.trigger_frequency) {
      lines.push({ label: '触发频率', value: TRIGGER_FREQUENCY_MAP[tc.trigger_frequency] || tc.trigger_frequency });
    }

    // 条件类型
    if (tc.condition_type) {
      lines.push({ label: '条件类型', value: CONDITION_TYPE_MAP[tc.condition_type] || tc.condition_type });
    }

    // 触发事件
    if (tc.event_name) {
      lines.push({ label: '触发事件', value: EVENT_TYPE_MAP[tc.event_name] || tc.event_name });
    }

    // 计数条件
    if (tc.target_count !== undefined) {
      lines.push({ label: '目标次数', value: `${tc.target_count} 次` });
    }
    if (tc.threshold !== undefined && tc.condition_type === 'count') {
      lines.push({ label: '目标次数', value: `${tc.threshold} 次` });
    }

    // 阈值条件
    if (tc.threshold_value !== undefined) {
      const field = FIELD_NAME_MAP[tc.threshold_field] || tc.threshold_field || '值';
      lines.push({ label: `阈值（${field}）`, value: `≥ ${tc.threshold_value}` });
    }
    if (tc.threshold !== undefined && tc.condition_type === 'threshold') {
      const field = FIELD_NAME_MAP[tc.threshold_field] || tc.threshold_field || '值';
      lines.push({ label: `阈值（${field}）`, value: `≥ ${tc.threshold}` });
    }

    // 连续条件
    if (tc.consecutive_days) {
      lines.push({ label: '连续天数', value: `${tc.consecutive_days} 天` });
    }
    if (tc.consecutive_weeks) {
      lines.push({ label: '连续周数', value: `${tc.consecutive_weeks} 周` });
    }
    if (tc.consecutive === true) {
      lines.push({ label: '连续要求', value: '需要连续完成' });
    }

    // 状态条件
    if (tc.first_time) {
      lines.push({ label: '首次触发', value: '仅首次' });
    }
    if (tc.min_learning_days) {
      lines.push({ label: '最少学习天数', value: `${tc.min_learning_days} 天/周` });
    }

    // 过滤条件
    if (tc.filter) {
      const filterParts: string[] = [];
      if (tc.filter.type) filterParts.push(`类型: ${tc.filter.type === 'practice' ? '练习' : tc.filter.type === 'certification' ? '认证' : tc.filter.type}`);
      if (tc.filter.status) filterParts.push(`状态: ${tc.filter.status === 'passed' ? '通过' : tc.filter.status === 'submitted' ? '已提交' : tc.filter.status}`);
      if (tc.filter.activity_type) filterParts.push(`活动类型: ${tc.filter.activity_type === 'practice' ? '练习' : tc.filter.activity_type === 'assessment' ? '测评' : tc.filter.activity_type}`);
      if (tc.filter.from_level !== undefined) filterParts.push(`从等级 ${tc.filter.from_level}`);
      if (tc.filter.to_level !== undefined) filterParts.push(`到等级 ${tc.filter.to_level}`);
      if (filterParts.length > 0) {
        lines.push({ label: '过滤条件', value: filterParts.join('，') });
      }
    }

    // 时间窗口
    if (tc.time_window) {
      const tw = tc.time_window;

      // 格式化日期表达式：将 CURRENT_YEAR-MM-DD 转为 "当年M月D日"
      const format_date_expr = (expr: string): string => {
        if (!expr) return expr;
        // 模板变量
        const templateMap: Record<string, string> = {
          '${LUNAR_NEW_YEAR}': '农历新年初一',
          '${LUNAR_NEW_YEAR_END}': '农历正月十五',
        };
        if (templateMap[expr]) return templateMap[expr];
        // CURRENT_YEAR-MM-DD 格式
        const cyMatch = expr.match(/^CURRENT_YEAR-(\d{2})-(\d{2})$/);
        if (cyMatch) {
          const month = parseInt(cyMatch[1], 10);
          const day = parseInt(cyMatch[2], 10);
          return `当年${month}月${day}日`;
        }
        return expr;
      };

      if (tw.start && tw.end) {
        lines.push({ label: '时间范围', value: `${format_date_expr(tw.start)} ~ ${format_date_expr(tw.end)}` });
      }
      if (tw.type) {
        lines.push({ label: '窗口类型', value: tw.type === 'date_range' ? '日期范围' : tw.type });
      }
    }

    // 定时触发时间
    if (tc.trigger_time) {
      lines.push({ label: '触发时间', value: tc.trigger_time });
    }

    // 冷却标记
    if (tc.cooldown_days) {
      lines.push({ label: '冷却天数', value: `${tc.cooldown_days} 天` });
    }

    return lines;
  };

  const formatTriggerCondition = (tc: any) => {
    if (!tc) return '-';

    const parts = [];

    // Handle count condition - support both 'target_count' (new) and 'threshold' (existing DB)
    if (tc.condition_type === 'count') {
      const count = tc.target_count || tc.threshold;
      if (count !== undefined) {
        parts.push(`达到 ${count} 次`);
      }
      // Handle consecutive flag (database uses 'consecutive: true' for login streaks)
      if (tc.consecutive === true) {
        parts.push('(连续)');
      }
    }
    // Handle threshold condition - support both 'threshold_value' (new) and 'threshold' (existing DB)
    else if (tc.condition_type === 'threshold') {
      const threshold = tc.threshold_value || tc.threshold;
      const fieldName = FIELD_NAME_MAP[tc.threshold_field] || tc.threshold_field || '值';
      if (threshold !== undefined) {
        parts.push(`${fieldName} ≥ ${threshold}`);
      }
    }
    // Handle consecutive condition - support both explicit days/weeks and legacy threshold
    else if (tc.condition_type === 'consecutive') {
      if (tc.consecutive_days) {
        parts.push(`连续 ${tc.consecutive_days} 天`);
      } else if (tc.consecutive_weeks) {
        parts.push(`连续 ${tc.consecutive_weeks} 周`);
      } else if (tc.threshold) {
        // Fallback: some database entries might use threshold for consecutive counts
        parts.push(`连续 ${tc.threshold} 天`);
      }
    }
    // Handle state condition
    else if (tc.condition_type === 'state') {
      parts.push('状态触发');
    }

    // Add trigger mode info if present (normalize 'realtime' to 'real_time')
    if (tc.trigger_mode) {
      const normalizedMode = tc.trigger_mode.replace('realtime', 'real_time');
      const modeLabel = normalizedMode === 'real_time' ? '实时' : '定时';
      parts.push(`[${modeLabel}]`);
    }

    return parts.join(' ') || '-';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'achievement_id',
      key: 'achievement_id',
      width: 60,
    },
    {
      title: '图标',
      dataIndex: 'achievement_icon',
      key: 'achievement_icon',
      width: 80,
      render: (icon: string) => {
        if (icon && (icon.startsWith('/uploads/') || icon.startsWith('/images/'))) {
          return <Image src={icon} width={40} height={40} style={{ objectFit: 'cover' }} />;
        }
        return <span style={{ fontSize: '24px' }}>{icon || '🏆'}</span>;
      },
    },
    {
      title: '成就名称',
      dataIndex: 'achievement_name',
      key: 'achievement_name',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {CATEGORY_MAP[category] || category}
        </Tag>
      ),
    },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      width: 80,
      render: (rarity: string) => {
        const cfg = RARITY_CONFIG[rarity];
        return cfg ? (
          <Tag
            color={cfg.tagColor}
            style={{
              fontWeight: 600,
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
              background: cfg.bgGradient,
              borderColor: cfg.textColor,
              borderWidth: 1,
            }}
          >
            {cfg.icon} {cfg.label}
          </Tag>
        ) : <Tag>{rarity}</Tag>;
      },
    },
    {
      title: '积分',
      dataIndex: 'points_reward',
      key: 'points_reward',
      width: 80,
      render: (points: number) => <Badge count={points} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '触发事件',
      key: 'event',
      width: 180,
      render: (_: any, record: Achievement) => (
        <div>
          <div>{EVENT_TYPE_MAP[record.trigger_condition?.event_name] || record.trigger_condition?.event_name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {formatTriggerCondition(record.trigger_condition)}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Achievement) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此成就吗？"
            description="删除后已颁发的成就记录仍会保留"
            onConfirm={() => handleDelete(record.achievement_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!hasPermission()) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>您没有权限访问此页面</h3>
          <p>只有系统管理员和市级管理员可以管理成就系统</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <TrophyOutlined />
            <span>成就管理（新系统）</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<QuestionCircleOutlined />}
              onClick={() => setIsHelpDrawerVisible(true)}
            >
              帮助文档
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增成就
            </Button>
          </Space>
        }
      >
        <Alert
          message="成就系统说明"
          description="成就系统通过事件自动触发，当学生完成特定条件时会自动解锁成就并获得积分奖励。当前系统共有 60 个成就。"
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={achievements}
          rowKey="achievement_id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 新增/编辑成就模态框 */}
      <Modal
        title={
          <Space>
            {editingAchievement ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingAchievement ? '编辑成就' : '新增成就'}</span>
          </Space>
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            is_hidden: false,
            rarity: 'common',
            category: 'learning_growth',
            trigger_mode: 'real_time',
            condition_type: 'count',
            max_times: 1,
            cooldown_days: 0,
          }}
        >
          {editingAchievement && (
            <Alert
              message={`成就编码：${editingAchievement.achievement_code}`}
              description="编码由系统自动生成，创建后不可修改"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Title level={5}>基本信息</Title>
          <Form.Item
            label="成就名称"
            name="achievement_name"
            rules={[{ required: true, message: '请输入成就名称' }]}
          >
            <Input placeholder="例如：初次登录、学习之星" maxLength={20} />
          </Form.Item>

          <Form.Item
            label="成就描述"
            name="achievement_desc"
            rules={[{ required: true, message: '请输入成就描述' }]}
          >
            <TextArea rows={2} placeholder="清楚描述获得条件" maxLength={200} showCount />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="分类"
              name="category"
              rules={[{ required: true, message: '请选择分类' }]}
              style={{ width: '200px' }}
            >
              <Select onChange={(v) => {
                setSelectedCategory(v);
                form.setFieldValue('subcategory', undefined);
              }}>
                <Option value="exam_certification">测评认证</Option>
                <Option value="learning_growth">学习成长</Option>
                <Option value="social_collaboration">社交协作</Option>
                <Option value="special_event">特殊事件</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="子分类"
              name="subcategory"
              style={{ width: '200px' }}
              extra="在分类下的进一步细分"
            >
              <Select allowClear placeholder="选择子分类">
                {(SUBCATEGORY_OPTIONS[selectedCategory] || []).map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="稀有度"
              name="rarity"
              rules={[{ required: true, message: '请选择稀有度' }]}
              style={{ width: '200px' }}
            >
              <Select>
                {Object.entries(RARITY_CONFIG).map(([key, cfg]) => (
                  <Option key={key} value={key}>
                    <span style={{ color: cfg.textColor, fontWeight: 600 }}>{cfg.icon} {cfg.label}</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large" align="start">
            <Form.Item
              label="成就图标"
              name="achievement_icon"
              rules={[{ required: true, message: '请上传或输入图标' }]}
              style={{ width: '100%' }}
              extra="支持上传图片（jpg/png/gif，最大10MB）或输入emoji"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  name="icon"
                  listType="picture-card"
                  fileList={iconFileList}
                  customRequest={handleUpload}
                  onChange={handleUploadChange}
                  onRemove={handleRemove}
                  maxCount={1}
                  accept="image/*"
                >
                  {iconFileList.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传图片</div>
                    </div>
                  )}
                </Upload>
                <Input
                  placeholder="或输入emoji 🏆"
                  maxLength={10}
                  style={{ width: '200px' }}
                  onChange={(e) => {
                    if (e.target.value) {
                      setUploadedIcon(e.target.value);
                      form.setFieldValue('achievement_icon', e.target.value);
                    }
                  }}
                />
                {uploadedIcon && uploadedIcon.startsWith('/uploads/') && (
                  <Image
                    src={`http://localhost:3001${uploadedIcon}`}
                    width={50}
                    preview={true}
                  />
                )}
              </Space>
            </Form.Item>

            <Form.Item
              label="积分奖励"
              name="points_reward"
              rules={[{ required: true, message: '请输入积分' }]}
              style={{ width: '150px' }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="最大获得次数"
              name="max_times"
              style={{ width: '150px' }}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="冷却天数"
              name="cooldown_days"
              style={{ width: '150px' }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Divider>触发条件配置</Divider>

          <Form.Item
            label="触发模式"
            name="trigger_mode"
            rules={[{ required: true, message: '请选择触发模式' }]}
          >
            <Select>
              {TRIGGER_MODES.map(tm => (
                <Option key={tm.value} value={tm.value}>{tm.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="条件类型"
            name="condition_type"
            rules={[{ required: true, message: '请选择条件类型' }]}
          >
            <Select onChange={(value) => setConditionType(value)}>
              {CONDITION_TYPES.map(ct => (
                <Option key={ct.value} value={ct.value}>{ct.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="触发事件"
            name="event_name"
            rules={[{ required: true, message: '请选择事件类型' }]}
          >
            <Select
              showSearch
              placeholder="选择事件类型"
              optionFilterProp="children"
            >
              {Object.entries(EVENT_TYPES).map(([group, events]) => (
                <Select.OptGroup key={group} label={group}>
                  {Object.entries(events).map(([key, desc]) => (
                    <Option key={key} value={key}>
                      {desc}
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          {/* 根据条件类型显示不同的字段 */}
          {conditionType === 'count' && (
            <Form.Item
              label="目标次数"
              name="target_count"
              rules={[{ required: true, message: '请输入目标次数' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="例如：10" />
            </Form.Item>
          )}

          {conditionType === 'threshold' && (
            <>
              <Form.Item
                label="阈值"
                name="threshold_value"
                rules={[{ required: true, message: '请输入阈值' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：90" />
              </Form.Item>
              <Form.Item
                label="阈值字段"
                name="threshold_field"
              >
                <Input placeholder="例如：accuracy（正确率）、score（分数）" />
              </Form.Item>
            </>
          )}

          {conditionType === 'consecutive' && (
            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                label="连续天数"
                name="consecutive_days"
                style={{ width: '200px' }}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="例如：7" />
              </Form.Item>
              <Form.Item
                label="连续周数"
                name="consecutive_weeks"
                style={{ width: '200px' }}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="例如：4" />
              </Form.Item>
            </Space>
          )}

          <Divider>其他设置</Divider>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="启用状态"
              name="is_active"
              valuePropName="checked"
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            <Form.Item
              label="隐藏成就"
              name="is_hidden"
              valuePropName="checked"
            >
              <Switch checkedChildren="隐藏" unCheckedChildren="显示" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 查看成就详情模态框 */}
      <Modal
        title="成就详情"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {viewingAchievement && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="成就ID" span={1}>{viewingAchievement.achievement_id}</Descriptions.Item>
            <Descriptions.Item label="成就编码" span={1}>{viewingAchievement.achievement_code}</Descriptions.Item>
            <Descriptions.Item label="成就名称" span={2}>
              {viewingAchievement.achievement_icon && (viewingAchievement.achievement_icon.startsWith('/uploads/') || viewingAchievement.achievement_icon.startsWith('/images/'))
                ? <Image src={viewingAchievement.achievement_icon} width={24} height={24} style={{ marginRight: 8, verticalAlign: 'middle', objectFit: 'cover' }} />
                : <span style={{ fontSize: 18, marginRight: 8 }}>{viewingAchievement.achievement_icon || '🏆'}</span>}
              {viewingAchievement.achievement_name}
            </Descriptions.Item>
            <Descriptions.Item label="成就描述" span={2}>{viewingAchievement.achievement_desc}</Descriptions.Item>
            <Descriptions.Item label="分类">{CATEGORY_MAP[viewingAchievement.category]}</Descriptions.Item>
            <Descriptions.Item label="子分类">{(viewingAchievement.subcategory && SUBCATEGORY_MAP[viewingAchievement.subcategory]) || viewingAchievement.subcategory || '-'}</Descriptions.Item>
            <Descriptions.Item label="稀有度">
              {(() => {
                const cfg = RARITY_CONFIG[viewingAchievement.rarity];
                return cfg ? (
                  <Tag
                    color={cfg.tagColor}
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      padding: '2px 10px',
                      background: cfg.bgGradient,
                      borderColor: cfg.textColor,
                      borderWidth: 1,
                    }}
                  >
                    {cfg.icon} {cfg.label}
                  </Tag>
                ) : <Tag>{viewingAchievement.rarity}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="积分奖励">{viewingAchievement.points_reward}分</Descriptions.Item>
            <Descriptions.Item label="触发事件" span={2}>
              {EVENT_TYPE_MAP[viewingAchievement.trigger_condition?.event_name]}
            </Descriptions.Item>
            <Descriptions.Item label="触发条件" span={2}>
              {(() => {
                const lines = formatTriggerConditionDetail(viewingAchievement.trigger_condition);
                if (lines.length === 0) return '-';
                return (
                  <div style={{ fontSize: 13 }}>
                    {lines.map((line, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <Text type="secondary">{line.label}：</Text>
                        <Text>{line.value}</Text>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={viewingAchievement.is_active ? 'success' : 'default'}>
                {viewingAchievement.is_active ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="是否隐藏">
              {viewingAchievement.is_hidden ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="最大次数">{viewingAchievement.max_times || 1}</Descriptions.Item>
            <Descriptions.Item label="冷却天数">{viewingAchievement.cooldown_days || 0}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {new Date(viewingAchievement.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 帮助文档抽屉 */}
      <Drawer
        title={
          <Space>
            <InfoCircleOutlined />
            <span>成就系统创建指南</span>
          </Space>
        }
        placement="right"
        open={isHelpDrawerVisible}
        onClose={() => setIsHelpDrawerVisible(false)}
        width={600}
      >
        <Alert
          message="新版成就系统"
          description="当前使用的是基于事件驱动的新版成就系统，支持复杂的触发条件和自动检测。"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Title level={5}>系统特点</Title>
        <Paragraph>
          <ul>
            <li>✅ 事件驱动 - 基于EventBus自动检测</li>
            <li>✅ 实时触发 - 事件发生时立即检测</li>
            <li>✅ 定时任务 - 支持每日定时检测</li>
            <li>✅ 复杂条件 - 支持计数、阈值、连续等多种条件</li>
            <li>✅ 自动奖励 - 获得成就自动添加积分</li>
          </ul>
        </Paragraph>

        <Divider />

        <Title level={5}>条件类型说明</Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="计数条件 (count)">
            达到指定次数时触发。例如：完成10次活动、登录50次。
            <br />
            <Text type="secondary">需要字段：target_count</Text>
          </Descriptions.Item>
          <Descriptions.Item label="阈值条件 (threshold)">
            某个值达到或超过阈值时触发。例如：正确率≥90%、分数≥95分。
            <br />
            <Text type="secondary">需要字段：threshold_value, threshold_field（可选）</Text>
          </Descriptions.Item>
          <Descriptions.Item label="状态条件 (state)">
            满足特定状态时触发。例如：首次登录、首次完成活动。
            <br />
            <Text type="secondary">可选字段：first_time, filter, time_window</Text>
          </Descriptions.Item>
          <Descriptions.Item label="连续条件 (consecutive)">
            连续天数或周数达标时触发。例如：连续登录7天、连续4周学习。
            <br />
            <Text type="secondary">需要字段：consecutive_days 或 consecutive_weeks</Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Title level={5}>创建示例</Title>
        <Card size="small" title="示例1：完成10次活动" style={{ marginBottom: 8 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="条件类型">计数条件 (count)</Descriptions.Item>
            <Descriptions.Item label="触发事件">活动完成 (student.activity.completed)</Descriptions.Item>
            <Descriptions.Item label="目标次数">10</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" title="示例2：连续登录7天" style={{ marginBottom: 8 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="条件类型">连续条件 (consecutive)</Descriptions.Item>
            <Descriptions.Item label="触发事件">连续登录 (student.login.streak)</Descriptions.Item>
            <Descriptions.Item label="连续天数">7</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" title="示例3：正确率达到90%" style={{ marginBottom: 8 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="条件类型">阈值条件 (threshold)</Descriptions.Item>
            <Descriptions.Item label="触发事件">活动完成 (student.activity.completed)</Descriptions.Item>
            <Descriptions.Item label="阈值">90</Descriptions.Item>
            <Descriptions.Item label="阈值字段">accuracy</Descriptions.Item>
          </Descriptions>
        </Card>
      </Drawer>
    </div>
  );
};

export default AchievementManagementPage;
