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
import api from '@/services/api';

interface WorkflowItem {
  id: string;
  type: 'user_approval' | 'question_review' | 'exam_approval' | 'certificate_issue';
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'urgent';
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workflowsRes, statsRes] = await Promise.all([
        api.get('/admin/dashboard/workflows').catch(() => ({ data: { workflows: [] } })),
        api.get('/admin/dashboard/region-stats').catch(() => ({ data: { data: null } })),
      ]);

      setWorkflows(workflowsRes.data?.workflows || []);
      setRegionStats(statsRes.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch admin home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowIcon = (type: WorkflowItem['type']) => {
    const iconMap = {
      'user_approval': <TeamOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      'question_review': <BookOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      'exam_approval': <FileTextOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      'certificate_issue': <TrophyOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
    };
    return iconMap[type];
  };

  const getStatusTag = (status: WorkflowItem['status']) => {
    const statusMap = {
      'urgent': <Tag color="red" icon={<ExclamationCircleOutlined />}>紧急</Tag>,
      'pending': <Tag color="orange" icon={<ClockCircleOutlined />}>待处理</Tag>,
      'processing': <Tag color="blue" icon={<CheckCircleOutlined />}>处理中</Tag>,
    };
    return statusMap[status];
  };

  const handleWorkflowClick = (item: WorkflowItem) => {
    const routeMap: Record<string, string> = {
      'user_approval': '/admin/users?tab=approval',
      'question_review': '/admin/question-bank?tab=review',
      'exam_approval': '/admin/assessments',
      'certificate_issue': '/admin/assessments?tab=certificates',
    };
    navigate(routeMap[item.type] || '/admin/home');
  };

  return (
    <div>
      {/* 管理员信息卡片 */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '20px 24px' }}>
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
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin tip="加载中..." />
              </div>
            ) : regionStats ? (
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
                        title="教职工总数"
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
                        title="进行中活动"
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
                    <span style={{ fontSize: 14, fontWeight: 500 }}>待审批事项</span>
                  </div>
                  <Progress
                    percent={regionStats.pendingApprovals > 0 ? Math.max(20, 100 - regionStats.pendingApprovals * 5) : 100}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    status={regionStats.pendingApprovals > 0 ? 'active' : 'success'}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                    {regionStats.pendingApprovals > 0
                      ? `还有 ${regionStats.pendingApprovals} 项待处理审批`
                      : '所有审批已处理完毕'}
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
              <Empty description="暂无统计数据" />
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
              onClick={() => navigate('/admin/achievements')}
            >
              成就管理
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
