import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Badge, Tag, Button, Empty, Spin, Statistic, Progress } from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  BookOutlined,
  TrophyOutlined,
  DashboardOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';

interface WorkflowItem {
  id: number;
  type: 'user_approval' | 'question_review' | 'exam_approval' | 'certificate_issue';
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'urgent';
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
}

interface RegionStats {
  totalSchools: number;
  totalTeachers: number;
  totalStudents: number;
  activeExams: number;
  pendingApprovals: number;
}

const AdminHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null);

  // 获取管理员级别显示名称
  const getAdminLevelName = () => {
    const roleMap: Record<string, string> = {
      'system_admin': '市级管理员',
      'municipal_admin': '市级管理员',
      'district_admin': '区级管理员',
      'school_admin': '校级管理员',
      'municipal_school_admin': '市直属学校管理员',
      'base_school_admin': '基地校管理员',
    };
    return user?.role ? roleMap[user.role] || '管理员' : '管理员';
  };

  // 获取管理范围描述
  const getAdminScope = () => {
    const roleMap: Record<string, string> = {
      'system_admin': '全市范围',
      'municipal_admin': '全市范围',
      'district_admin': '所属区域',
      'school_admin': '所属学校',
      'municipal_school_admin': '市直属学校',
      'base_school_admin': '基地校',
    };
    return user?.role ? roleMap[user.role] || '当前区域' : '当前区域';
  };

  useEffect(() => {
    fetchWorkflows();
    fetchRegionStats();
  }, []);

  // 获取待处理工作流
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取待处理工作流
      // const response = await api.get('/admin/workflows/pending');

      // 模拟数据
      const mockWorkflows: WorkflowItem[] = [
        {
          id: 1,
          type: 'user_approval',
          title: '学生注册审核',
          description: '5个学生注册申请待审核',
          status: 'urgent',
          createdAt: '2025-10-16 10:30:00',
          priority: 'high',
        },
        {
          id: 2,
          type: 'question_review',
          title: '题目审核',
          description: '12道题目提交待审核',
          status: 'pending',
          createdAt: '2025-10-16 09:15:00',
          priority: 'medium',
        },
        {
          id: 3,
          type: 'exam_approval',
          title: '考试审批',
          description: '3场考试申请待审批',
          status: 'pending',
          createdAt: '2025-10-15 16:20:00',
          priority: 'medium',
        },
        {
          id: 4,
          type: 'certificate_issue',
          title: '证书颁发',
          description: '25份证书待颁发',
          status: 'processing',
          createdAt: '2025-10-15 14:00:00',
          priority: 'low',
        },
      ];

      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取区域统计数据
  const fetchRegionStats = async () => {
    try {
      // TODO: 调用API获取区域统计数据
      // const response = await api.get('/admin/region/stats');

      // 模拟数据
      const mockStats: RegionStats = {
        totalSchools: 120,
        totalTeachers: 850,
        totalStudents: 15000,
        activeExams: 45,
        pendingApprovals: 20,
      };

      setRegionStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch region stats:', error);
    }
  };

  // 获取工作流类型图标
  const getWorkflowIcon = (type: WorkflowItem['type']) => {
    const iconMap = {
      'user_approval': <TeamOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      'question_review': <BookOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      'exam_approval': <FileTextOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      'certificate_issue': <TrophyOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
    };
    return iconMap[type];
  };

  // 获取状态标签
  const getStatusTag = (status: WorkflowItem['status']) => {
    const statusMap = {
      'urgent': <Tag color="red" icon={<ExclamationCircleOutlined />}>紧急</Tag>,
      'pending': <Tag color="orange" icon={<ClockCircleOutlined />}>待处理</Tag>,
      'processing': <Tag color="blue" icon={<CheckCircleOutlined />}>处理中</Tag>,
    };
    return statusMap[status];
  };

  // 处理工作流点击
  const handleWorkflowClick = (item: WorkflowItem) => {
    // 根据类型跳转到相应页面
    const routeMap = {
      'user_approval': '/admin/users?tab=approval',
      'question_review': '/admin/question-bank?tab=review',
      'exam_approval': '/admin/exams?tab=approval',
      'certificate_issue': '/admin/exams?tab=certificates',
    };
    navigate(routeMap[item.type] || '/admin/home');
  };

  return (
    <div>
      {/* 管理员信息卡片 */}
      <Card
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>
                欢迎回来，{user?.realName || user?.username}
              </h2>
              <p style={{ margin: '8px 0 0 0', color: '#8c8c8c', fontSize: 14 }}>
                <Badge status="success" text={getAdminLevelName()} />
                <span style={{ margin: '0 8px' }}>|</span>
                管理范围：{getAdminScope()}
              </p>
            </div>
          </Col>
          <Col>
            <Button type="primary" icon={<BellOutlined />}>
              查看所有通知
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 左侧：待处理工作流 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <BellOutlined style={{ marginRight: 8 }} />
                待处理工作流
              </span>
            }
            extra={
              <Badge count={workflows.filter(w => w.status === 'urgent').length} />
            }
            style={{ height: '100%' }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin tip="加载中..." />
              </div>
            ) : workflows.length === 0 ? (
              <Empty
                description="暂无待处理工作流"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={workflows}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleWorkflowClick(item)}
                    actions={[
                      <Button type="link" key="handle">
                        立即处理
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getWorkflowIcon(item.type)}
                      title={
                        <div>
                          {item.title}
                          <span style={{ marginLeft: 8 }}>
                            {getStatusTag(item.status)}
                          </span>
                        </div>
                      }
                      description={
                        <div>
                          <div>{item.description}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {item.createdAt}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：区域数据统计 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                <DashboardOutlined style={{ marginRight: 8 }} />
                区域数据统计
              </span>
            }
            style={{ height: '100%' }}
          >
            {regionStats ? (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card bordered={false} style={{ background: '#f0f5ff' }}>
                      <Statistic
                        title="学校总数"
                        value={regionStats.totalSchools}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#1677ff' }}
                        suffix="所"
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card bordered={false} style={{ background: '#f6ffed' }}>
                      <Statistic
                        title="教师总数"
                        value={regionStats.totalTeachers}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                        suffix="人"
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card bordered={false} style={{ background: '#fff7e6' }}>
                      <Statistic
                        title="学生总数"
                        value={regionStats.totalStudents}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#fa8c16' }}
                        suffix="人"
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card bordered={false} style={{ background: '#fff0f6' }}>
                      <Statistic
                        title="进行中考试"
                        value={regionStats.activeExams}
                        prefix={<FileTextOutlined />}
                        valueStyle={{ color: '#eb2f96' }}
                        suffix="场"
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 审批处理进度 */}
                <Card
                  bordered={false}
                  style={{ marginTop: 16, background: '#fafafa' }}
                  bodyStyle={{ padding: 16 }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>本周审批处理进度</span>
                  </div>
                  <Progress
                    percent={75}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    status="active"
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                    已处理 60 项，剩余 {regionStats.pendingApprovals} 项待处理
                  </div>
                </Card>

                {/* 快捷操作 */}
                <div style={{ marginTop: 16 }}>
                  <Button
                    block
                    type="primary"
                    onClick={() => navigate('/admin/overview')}
                  >
                    查看详细数据分析
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin tip="加载中..." />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 快捷入口 */}
      <Card
        title="快捷入口"
        style={{ marginTop: 16 }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6} md={4}>
            <Button
              block
              size="large"
              icon={<FileTextOutlined />}
              onClick={() => navigate('/admin/assessments')}
            >
              测评管理
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              block
              size="large"
              icon={<BookOutlined />}
              onClick={() => navigate('/admin/question-bank')}
            >
              题库管理
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              block
              size="large"
              icon={<TeamOutlined />}
              onClick={() => navigate('/admin/users')}
            >
              用户管理
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              block
              size="large"
              icon={<SettingOutlined />}
              onClick={() => navigate('/admin/permissions')}
            >
              权限管理
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              block
              size="large"
              icon={<TrophyOutlined />}
              onClick={() => navigate('/admin/assessments?tab=certificates')}
            >
              证书管理
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              block
              size="large"
              icon={<DashboardOutlined />}
              onClick={() => navigate('/admin/overview')}
            >
              数据分析
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AdminHome;
