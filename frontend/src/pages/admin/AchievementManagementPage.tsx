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
  Collapse,
  Alert,
  Tooltip,
  Divider,
  Typography,
} from 'antd';
import {
  TrophyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import api from '@/services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Paragraph, Text } = Typography;

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  points: number;
  requirementType: string;
  requirementValue: number;
  isActive: boolean;
  createdAt: string;
  totalAwarded?: number;
}

// 事件类型配置（基于后端EventTypes.js）
const EVENT_TYPES = {
  '学生活动': {
    'student.activity.completed': '活动完成',
    'student.activity.started': '活动开始',
    'student.high.score': '获得高分（≥90分）',
    'student.perfect.score': '获得满分（100分）',
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
  },
  '学生测评': {
    'student.exam.completed': '完成测评',
    'student.exam.started': '测评开始',
  },
  '日常任务': {
    'student.daily.accuracy': '每日正确率达标',
    'student.weekly.accuracy': '每周正确率达标',
    'student.monthly.accuracy': '每月正确率达标',
    'student.weekly.login.days': '每周登录天数达标',
    'student.monthly.login.days': '每月登录天数达标',
    'student.perfect.week': '完美一周',
  },
  '排行榜': {
    'student.rank.update': '排名更新',
    'student.rank.top10': '进入前十',
    'student.rank.first': '排名第一',
  },
  '社交互动': {
    'student.help.others': '帮助他人',
    'student.comment': '发表评论',
    'student.share': '分享内容',
  },
  '多科目': {
    'student.multi.subject': '三冠王（数语英金级）',
    'student.all.subjects.gold': '大满贯（全科目金级）',
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

// 常用图标选项
const ICON_OPTIONS = [
  { label: '🏆 奖杯', value: '🏆' },
  { label: '⭐ 星星', value: '⭐' },
  { label: '🎯 目标', value: '🎯' },
  { label: '📚 学习', value: '📚' },
  { label: '🔥 火焰', value: '🔥' },
  { label: '💯 满分', value: '💯' },
  { label: '🎉 庆祝', value: '🎉' },
  { label: '💪 力量', value: '💪' },
  { label: '🌟 闪耀', value: '🌟' },
  { label: '👑 王冠', value: '👑' },
  { label: '🎖️ 勋章', value: '🎖️' },
  { label: '🏅 奖牌', value: '🏅' },
];

// 积分预设选项
const POINTS_OPTIONS = [
  { label: '10分 - 普通成就', value: 10 },
  { label: '20分 - 普通成就', value: 20 },
  { label: '30分 - 普通成就', value: 30 },
  { label: '50分 - 稀有成就', value: 50 },
  { label: '80分 - 稀有成就', value: 80 },
  { label: '100分 - 史诗成就', value: 100 },
  { label: '150分 - 史诗成就', value: 150 },
  { label: '200分 - 传说成就', value: 200 },
  { label: '300分 - 传说成就', value: 300 },
  { label: '500分 - 传说成就', value: 500 },
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
    setIsModalVisible(true);
  };

  const handleEdit = (record: Achievement) => {
    setEditingAchievement(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      category: record.category,
      rarity: record.rarity,
      icon: record.icon,
      points: record.points,
      requirementType: record.requirementType,
      requirementValue: record.requirementValue,
      isActive: record.isActive,
    });
    setIsModalVisible(true);
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

      if (editingAchievement) {
        await api.put(`/achievements/${editingAchievement.id}`, values);
        message.success('更新成就成功');
      } else {
        await api.post('/achievements', values);
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
      'learning': 'blue',
      'practice': 'green',
      'assessment': 'orange',
      'streak': 'purple',
      'special': 'red',
    };
    return colors[category] || 'default';
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'common': 'default',
      'rare': 'blue',
      'epic': 'purple',
      'legendary': 'gold',
    };
    return colors[rarity] || 'default';
  };

  const getRarityText = (rarity: string) => {
    const texts: Record<string, string> = {
      'common': '普通',
      'rare': '稀有',
      'epic': '史诗',
      'legendary': '传说',
    };
    return texts[rarity] || rarity;
  };

  const getCategoryText = (category: string) => {
    const texts: Record<string, string> = {
      'learning': '学习',
      'practice': '练习',
      'assessment': '测评',
      'streak': '连续',
      'special': '特殊',
      'special_event': '特殊',
      'daily_task': '日常任务',
      'achievement': '成就',
      'social': '社交',
      'milestone': '里程碑',
    };
    return texts[category] || category;
  };

  const columns = [
    {
      title: '成就编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '成就名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryText(category)}
        </Tag>
      ),
    },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      width: 100,
      render: (rarity: string) => (
        <Tag color={getRarityColor(rarity)}>
          {getRarityText(rarity)}
        </Tag>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      render: (points: number) => <Badge count={points} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '解锁要求',
      key: 'requirement',
      width: 250,
      render: (_: any, record: Achievement) => (
        <span>
          {EVENT_TYPE_MAP[record.requirementType] || record.requirementType}: {record.requirementValue}次
        </span>
      ),
    },
    {
      title: '已颁发',
      dataIndex: 'totalAwarded',
      key: 'totalAwarded',
      width: 80,
      render: (count: number) => count || 0,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
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
      width: 200,
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
            onConfirm={() => handleDelete(record.id)}
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
            <span>成就管理</span>
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
          description="成就系统通过事件自动触发，当学生完成特定条件时会自动解锁成就并获得积分奖励。点击右上角【帮助文档】查看详细创建指南。"
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={achievements}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑成就模态框 */}
      <Modal
        title={
          <Space>
            {editingAchievement ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingAchievement ? '编辑成就' : '新增成就'}</span>
            <Tooltip title="点击查看帮助文档">
              <Button
                type="link"
                size="small"
                icon={<QuestionCircleOutlined />}
                onClick={() => setIsHelpDrawerVisible(true)}
              >
                查看帮助
              </Button>
            </Tooltip>
          </Space>
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={700}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isActive: true,
            rarity: 'common',
            category: 'learning',
          }}
        >
          <Alert
            message="快速提示"
            description={editingAchievement ? '编辑成就时，编码由系统自动维护，无需修改。' : '创建成就后，系统会自动生成唯一的成就编码。'}
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />

          {editingAchievement && (
            <Alert
              message={`成就编码：${editingAchievement.code}`}
              description="编码由系统自动生成，创建后不可修改"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            label={
              <span>
                成就名称
                <Tooltip title="显示给学生的成就名称，建议简短有吸引力">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="name"
            rules={[{ required: true, message: '请输入成就名称' }]}
            extra="建议4-8个字，例如：初次登录、学习之星、完美一周"
          >
            <Input placeholder="初次登录" maxLength={20} />
          </Form.Item>

          <Form.Item
            label={
              <span>
                成就描述
                <Tooltip title="详细说明如何获得此成就，会显示在成就详情中">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="description"
            rules={[{ required: true, message: '请输入成就描述' }]}
            extra="清楚描述获得条件，例如：首次登录系统即可获得此成就"
          >
            <TextArea rows={2} placeholder="首次登录系统即可获得此成就" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            label={
              <span>
                分类
                <Tooltip title="成就所属类别，用于分类展示">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select>
              <Option value="learning">学习 - 与学习相关的成就</Option>
              <Option value="practice">练习 - 练习类成就</Option>
              <Option value="assessment">测评 - 测评类成就</Option>
              <Option value="streak">连续 - 连续性成就（如连续登录）</Option>
              <Option value="special">特殊 - 特殊类型成就</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                稀有度
                <Tooltip title="成就稀有度影响积分奖励和展示效果">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="rarity"
            rules={[{ required: true, message: '请选择稀有度' }]}
            extra="稀有度越高，建议积分奖励越多"
          >
            <Select>
              <Option value="common">普通 - 容易获得的成就（建议10-50积分）</Option>
              <Option value="rare">稀有 - 需要一定努力（建议50-100积分）</Option>
              <Option value="epic">史诗 - 较难获得（建议100-200积分）</Option>
              <Option value="legendary">传说 - 极难获得（建议200+积分）</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                图标
                <Tooltip title="选择一个代表成就的emoji图标">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="icon"
            rules={[{ required: true, message: '请选择图标' }]}
            extra="选择一个合适的emoji图标来代表这个成就"
          >
            <Select placeholder="选择图标">
              {ICON_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                积分奖励
                <Tooltip title="获得成就时奖励的积分数">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="points"
            rules={[{ required: true, message: '请选择积分奖励' }]}
            extra="根据稀有度选择合理的积分奖励"
          >
            <Select placeholder="选择积分奖励">
              {POINTS_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider>触发条件配置</Divider>

          <Form.Item
            label={
              <span>
                事件类型
                <Tooltip title="决定成就何时被检测，选择触发此成就的事件">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="requirementType"
            rules={[{ required: true, message: '请选择事件类型' }]}
            extra="选择合适的事件类型，系统会在该事件发生时检测成就条件"
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

          <Form.Item
            label={
              <span>
                要求数值
                <Tooltip title="达到此数值时解锁成就，具体含义取决于事件类型">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            name="requirementValue"
            rules={[{ required: true, message: '请输入要求数值' }]}
            extra="例如：完成5次活动（值为5）、连续登录7天（值为7）、正确率>=90%（值为90）"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="状态"
            name="isActive"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>启用 - 成就生效，可以被触发</Option>
              <Option value={false}>禁用 - 成就暂停，不会被触发</Option>
            </Select>
          </Form.Item>
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
        width={600}
      >
        {viewingAchievement && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="成就编码">{viewingAchievement.code}</Descriptions.Item>
            <Descriptions.Item label="成就名称">
              {viewingAchievement.icon} {viewingAchievement.name}
            </Descriptions.Item>
            <Descriptions.Item label="成就描述">{viewingAchievement.description}</Descriptions.Item>
            <Descriptions.Item label="分类">
              <Tag color={getCategoryColor(viewingAchievement.category)}>
                {getCategoryText(viewingAchievement.category)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="稀有度">
              <Tag color={getRarityColor(viewingAchievement.rarity)}>
                {getRarityText(viewingAchievement.rarity)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="积分奖励">{viewingAchievement.points}分</Descriptions.Item>
            <Descriptions.Item label="触发事件">
              {EVENT_TYPE_MAP[viewingAchievement.requirementType] || viewingAchievement.requirementType}
            </Descriptions.Item>
            <Descriptions.Item label="要求数值">
              {viewingAchievement.requirementValue}次
            </Descriptions.Item>
            <Descriptions.Item label="已颁发数量">
              {viewingAchievement.totalAwarded || 0}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={viewingAchievement.isActive ? 'success' : 'default'}>
                {viewingAchievement.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(viewingAchievement.createdAt).toLocaleString('zh-CN')}
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
        <Collapse accordion defaultActiveKey={['1']}>
          <Panel
            header={
              <Space>
                <BulbOutlined style={{ color: '#1890ff' }} />
                <strong>成就系统概述</strong>
              </Space>
            }
            key="1"
          >
            <Paragraph>
              成就系统是一个自动化的激励机制，通过监听学生的各种行为事件，在满足特定条件时自动颁发成就徽章和积分奖励。
            </Paragraph>
            <Paragraph>
              <Text strong>核心特点：</Text>
              <ul>
                <li>✅ 自动触发 - 无需手动操作，系统自动检测并颁发</li>
                <li>✅ 实时响应 - 事件发生时立即检测成就条件</li>
                <li>✅ 积分激励 - 获得成就即获得积分奖励</li>
                <li>✅ 进度追踪 - 可以查看学生的成就进度</li>
              </ul>
            </Paragraph>
          </Panel>

          <Panel header={<strong>📋 字段说明</strong>} key="2">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="成就编码">
                唯一标识符，建议格式：ACH_类别_名称
                <br />
                示例：ACH_LOGIN_FIRST、ACH_PERFECT_SCORE
              </Descriptions.Item>
              <Descriptions.Item label="成就名称">
                显示给学生的名称，建议4-8个字
                <br />
                示例：初次登录、学习之星、完美一周
              </Descriptions.Item>
              <Descriptions.Item label="成就描述">
                说明如何获得，建议20-50字
                <br />
                示例：首次登录系统即可获得此成就
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                根据成就类型选择：学习、练习、测评、连续、特殊
              </Descriptions.Item>
              <Descriptions.Item label="稀有度">
                普通/稀有/史诗/传说（影响积分奖励）
              </Descriptions.Item>
              <Descriptions.Item label="事件类型">
                触发成就检测的事件，见下方事件类型详解
              </Descriptions.Item>
              <Descriptions.Item label="要求数值">
                达成条件的阈值，具体含义取决于事件类型
              </Descriptions.Item>
            </Descriptions>
          </Panel>

          <Panel header={<strong>🎯 事件类型详解</strong>} key="3">
            <Paragraph>
              <Text type="secondary">
                以下是系统支持的所有事件类型，创建成就时可以从下拉菜单中选择：
              </Text>
            </Paragraph>
            {Object.entries(EVENT_TYPES).map(([group, events]) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <Title level={5}>{group}</Title>
                <ul style={{ marginLeft: 0, paddingLeft: 20 }}>
                  {Object.entries(events).map(([key, desc]) => (
                    <li key={key}>
                      <Text strong>{desc}</Text>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Panel>

          <Panel header={<strong>💡 创建示例</strong>} key="4">
            <Title level={5}>示例1：首次登录成就</Title>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="编码">系统自动生成（如：ACH_LEARNING_初次_123456）</Descriptions.Item>
              <Descriptions.Item label="名称">初次登录</Descriptions.Item>
              <Descriptions.Item label="描述">欢迎来到学习平台！首次登录即可获得</Descriptions.Item>
              <Descriptions.Item label="分类">学习</Descriptions.Item>
              <Descriptions.Item label="稀有度">普通</Descriptions.Item>
              <Descriptions.Item label="图标">🎉 庆祝</Descriptions.Item>
              <Descriptions.Item label="积分">10分</Descriptions.Item>
              <Descriptions.Item label="事件类型">首次登录</Descriptions.Item>
              <Descriptions.Item label="要求数值">1次</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>示例2：连续登录7天</Title>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="编码">系统自动生成（如：ACH_STREAK_坚持_234567）</Descriptions.Item>
              <Descriptions.Item label="名称">坚持不懈</Descriptions.Item>
              <Descriptions.Item label="描述">连续登录7天，养成良好学习习惯</Descriptions.Item>
              <Descriptions.Item label="分类">连续</Descriptions.Item>
              <Descriptions.Item label="稀有度">稀有</Descriptions.Item>
              <Descriptions.Item label="图标">🔥 火焰</Descriptions.Item>
              <Descriptions.Item label="积分">50分</Descriptions.Item>
              <Descriptions.Item label="事件类型">连续登录</Descriptions.Item>
              <Descriptions.Item label="要求数值">7次</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>示例3：完成100次活动</Title>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="编码">系统自动生成（如：ACH_LEARNING_勤学_345678）</Descriptions.Item>
              <Descriptions.Item label="名称">勤学好问</Descriptions.Item>
              <Descriptions.Item label="描述">累计完成100次学习活动</Descriptions.Item>
              <Descriptions.Item label="分类">学习</Descriptions.Item>
              <Descriptions.Item label="稀有度">史诗</Descriptions.Item>
              <Descriptions.Item label="图标">📚 学习</Descriptions.Item>
              <Descriptions.Item label="积分">150分</Descriptions.Item>
              <Descriptions.Item label="事件类型">活动完成</Descriptions.Item>
              <Descriptions.Item label="要求数值">100次</Descriptions.Item>
            </Descriptions>
          </Panel>

          <Panel header={<strong>⚙️ 最佳实践</strong>} key="5">
            <Paragraph>
              <Text strong>1. 积分设置建议</Text>
              <ul>
                <li>普通成就：10-50积分（如首次登录、完成第1次活动）</li>
                <li>稀有成就：50-100积分（如连续登录7天、完成10次活动）</li>
                <li>史诗成就：100-200积分（如完成100次活动、获得10次满分）</li>
                <li>传说成就：200+积分（如完美学年、全科目金级）</li>
              </ul>
            </Paragraph>

            <Paragraph>
              <Text strong>2. 成就难度梯度</Text>
              <ul>
                <li>设置多个难度级别的同类成就（如完成1/10/50/100次活动）</li>
                <li>让学生有持续的成就感和目标感</li>
                <li>避免设置过于简单或过于困难的成就</li>
              </ul>
            </Paragraph>

            <Paragraph>
              <Text strong>3. 命名规范</Text>
              <ul>
                <li>编码：ACH_类别_特征_数值（如ACH_LOGIN_STREAK_7）</li>
                <li>名称：简短有吸引力（4-8字）</li>
                <li>描述：清楚说明获得条件（20-50字）</li>
              </ul>
            </Paragraph>

            <Paragraph>
              <Text strong>4. 测试建议</Text>
              <ul>
                <li>创建成就后，先设置为&ldquo;禁用&rdquo;状态</li>
                <li>通过模拟学生行为测试触发条件</li>
                <li>确认无误后再设置为&ldquo;启用&rdquo;状态</li>
              </ul>
            </Paragraph>
          </Panel>

          <Panel header={<strong>❓ 常见问题</strong>} key="6">
            <Paragraph>
              <Text strong>Q: 要求数值的具体含义是什么？</Text>
              <br />
              A: 取决于事件类型。例如：
              <ul>
                <li>完成活动类事件：表示完成次数</li>
                <li>连续登录类事件：表示连续天数</li>
                <li>正确率类事件：表示正确率百分比</li>
                <li>排名类事件：表示排名位置</li>
              </ul>
            </Paragraph>

            <Paragraph>
              <Text strong>Q: 成就会重复颁发吗？</Text>
              <br />
              A: 不会。每个成就对每个学生只会颁发一次。
            </Paragraph>

            <Paragraph>
              <Text strong>Q: 如何修改已颁发的成就？</Text>
              <br />
              A: 可以修改成就信息，但不会影响已颁发的成就记录。建议创建新成就而不是修改旧成就。
            </Paragraph>

            <Paragraph>
              <Text strong>Q: 禁用成就后会怎样？</Text>
              <br />
              A: 已颁发的成就不受影响，但新的触发条件不会再颁发此成就。
            </Paragraph>
          </Panel>
        </Collapse>

        <Alert
          message="需要帮助？"
          description="如果在创建成就过程中遇到问题，请联系系统管理员或查看开发文档。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Drawer>
    </div>
  );
};

export default AchievementManagementPage;
