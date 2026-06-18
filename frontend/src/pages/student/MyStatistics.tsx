import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  message,
  Tabs,
  Select,
  Empty,
} from 'antd';
import {
  TrophyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
} from '@ant-design/icons';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { statisticsApi, learningStatsApi } from '../../services/api';

// 与后端 v_student_learning_overview 视图字段保持一致
interface LearningOverview {
  total_activities: number;
  completed_activities: number;
  avg_score: number;
  total_study_seconds: number;
  last_activity_time: string | null;
  first_activity_time: string | null;
}

// 与后端 v_student_ability_realtime 视图字段保持一致
interface AbilityStats {
  ability: string;
  subject: string;
  total_questions: number;
  correct_count: number;
  accuracy_rate: number;
  avg_score: number;
  last_activity_time: string;
}

// 与后端 v_student_knowledge_realtime 视图字段保持一致
interface KnowledgeStats {
  knowledge_point: string;
  subject: string;
  total_questions: number;
  correct_count: number;
  accuracy_rate: number;
  avg_score: number;
  last_activity_time: string;
}

const MyStatistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [abilities, setAbilities] = useState<AbilityStats[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgeStats[]>([]);
  // E3 弱项知识点（按科目维度）
  const [weakPoints, setWeakPoints] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadOverview(),
        loadAbilities(),
        loadKnowledgePoints(),
        loadWeakPoints(),
      ]);
    } catch (error: any) {
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // E3 按科目加载薄弱知识点（正确率<60%）
  const loadWeakPoints = async () => {
    try {
      const response = await learningStatsApi.bySubject(undefined, 60);
      if (response.success) {
        setWeakPoints(response.data || []);
      }
    } catch (e) {
      // 接口可能暂无数据，忽略
    }
  };

  const loadOverview = async () => {
    const response = await statisticsApi.getStudentOverview();
    if (response.success && response.data) {
      // PostgreSQL numeric 类型返回字符串，统一转为数字
      const data = {
        ...response.data,
        total_activities: parseInt(response.data.total_activities) || 0,
        completed_activities: parseInt(response.data.completed_activities) || 0,
        avg_score: parseFloat(response.data.avg_score) || 0,
        total_study_seconds: parseInt(response.data.total_study_seconds) || 0,
      };
      setOverview(data);
    }
  };

  const loadAbilities = async (subject?: string) => {
    const response = await statisticsApi.getStudentAbilities(
      subject && subject !== 'all' ? { subject } : undefined
    );
    if (response.success) {
      // PostgreSQL numeric 类型返回字符串，统一转为数字
      const data = (response.data || []).map((item: any) => ({
        ...item,
        accuracy_rate: parseFloat(item.accuracy_rate) || 0,
        avg_score: parseFloat(item.avg_score) || 0,
        total_questions: parseInt(item.total_questions) || 0,
        correct_count: parseInt(item.correct_count) || 0,
      }));
      setAbilities(data);

      // Extract unique subjects
      const uniqueSubjects = Array.from(
        new Set<string>(data.map((item: AbilityStats) => item.subject))
      );
      setSubjects(uniqueSubjects);
    }
  };

  const loadKnowledgePoints = async (subject?: string) => {
    const response = await statisticsApi.getStudentKnowledgePoints(
      subject && subject !== 'all' ? { subject } : undefined
    );
    if (response.success) {
      // PostgreSQL numeric 类型返回字符串，统一转为数字
      const data = (response.data || []).map((item: any) => ({
        ...item,
        accuracy_rate: parseFloat(item.accuracy_rate) || 0,
        avg_score: parseFloat(item.avg_score) || 0,
        total_questions: parseInt(item.total_questions) || 0,
        correct_count: parseInt(item.correct_count) || 0,
      }));
      setKnowledgePoints(data);
    }
  };

  const handleSubjectChange = async (value: string) => {
    setSelectedSubject(value);
    setLoading(true);
    try {
      await Promise.all([
        loadAbilities(value),
        loadKnowledgePoints(value),
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Prepare radar chart data (ability stats)
  const radarData = abilities.map((item) => ({
    ability: item.ability,
    accuracy: parseFloat(item.accuracy_rate.toFixed(1)),
    fullMark: 100,
  }));

  // Prepare bar chart data (knowledge points)
  const barData = knowledgePoints.slice(0, 10).map((item) => ({
    name: item.knowledge_point.length > 8
      ? item.knowledge_point.substring(0, 8) + '...'
      : item.knowledge_point,
    fullName: item.knowledge_point,
    accuracy: parseFloat(item.accuracy_rate.toFixed(1)),
    questions: item.total_questions,
  }));

  // Color scale for bars
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return '#52c41a'; // Green
    if (accuracy >= 60) return '#faad14'; // Orange
    return '#f5222d'; // Red
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>我的学习统计</h2>

      <Spin spinning={loading}>
        {/* Learning Overview Cards */}
        {overview && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="参与活动"
                  value={overview.total_activities}
                  prefix={<BookOutlined />}
                  suffix="次"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="完成活动"
                  value={overview.completed_activities}
                  prefix={<CheckCircleOutlined />}
                  suffix="次"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="平均得分"
                  value={overview.avg_score || 0}
                  prefix={<TrophyOutlined />}
                  suffix="分"
                  precision={1}
                  valueStyle={{ color: (overview.avg_score || 0) >= 60 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="学习时长"
                  value={Math.floor((overview.total_study_seconds || 0) / 3600)}
                  prefix={<ClockCircleOutlined />}
                  suffix="小时"
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Subject Filter */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 8 }}>选择科目：</span>
            <Select
              style={{ width: 200 }}
              value={selectedSubject}
              onChange={handleSubjectChange}
            >
              <Select.Option value="all">全部科目</Select.Option>
              {subjects.map((subject) => (
                <Select.Option key={subject} value={subject}>
                  {subject}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Card>

        {/* Charts */}
        <Tabs defaultActiveKey="abilities">
          <Tabs.TabPane tab="能力雷达图" key="abilities">
            <Card>
              {radarData.length > 0 ? (
                <>
                  <h3 style={{ textAlign: 'center', marginBottom: 24 }}>
                    {selectedSubject === 'all' ? '全部科目' : selectedSubject} - 能力分析
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="ability" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="正确率 (%)"
                        dataKey="accuracy"
                        stroke="#16a34a"
                        fill="#16a34a"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 16 }}>
                    <h4>详细数据：</h4>
                    <Row gutter={[16, 16]}>
                      {abilities.map((item, index) => (
                        <Col key={index} xs={24} sm={12} md={8}>
                          <Card size="small">
                            <div><strong>{item.ability}</strong></div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              答题数：{item.total_questions} 题
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              正确率：{item.accuracy_rate.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              平均分：{item.avg_score.toFixed(1)} 分
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </>
              ) : (
                <Empty description="暂无能力统计数据" />
              )}
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane tab="知识点掌握度" key="knowledge">
            <Card>
              {barData.length > 0 ? (
                <>
                  <h3 style={{ textAlign: 'center', marginBottom: 24 }}>
                    {selectedSubject === 'all' ? '全部科目' : selectedSubject} - 知识点掌握情况
                    （Top 10）
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={barData}
                      layout="horizontal"
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="category" dataKey="name" />
                      <YAxis type="number" domain={[0, 100]} />
                      <Tooltip
                        content={({ payload }) => {
                          if (payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div
                                style={{
                                  background: 'white',
                                  padding: '8px',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                }}
                              >
                                <div><strong>{data.fullName}</strong></div>
                                <div>正确率：{data.accuracy}%</div>
                                <div>答题数：{data.questions} 题</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="accuracy" name="正确率 (%)">
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 16 }}>
                    <h4>完整列表：</h4>
                    <Row gutter={[16, 16]}>
                      {knowledgePoints.map((item, index) => (
                        <Col key={index} xs={24} sm={12} md={8}>
                          <Card size="small">
                            <div><strong>{item.knowledge_point}</strong></div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              答题数：{item.total_questions} 题
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              正确率：{item.accuracy_rate.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              平均分：{item.avg_score.toFixed(1)} 分
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </>
              ) : (
                <Empty description="暂无知识点统计数据" />
              )}
            </Card>

            {/* E3 薄弱知识点（按科目维度，正确率<60%） */}
            <Card title="⚠ 薄弱知识点（建议加强）" style={{ marginTop: 16 }}>
              {weakPoints.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {weakPoints.map((wp: any, index) => (
                    <Col key={index} xs={24} sm={12} md={8}>
                      <Card size="small" style={{ borderLeft: '3px solid #ff4d4f' }}>
                        <div><strong>{wp.subject}</strong> · {wp.knowledge_point}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          正确率：{(wp.accuracy_rate || 0).toFixed(1)}%（{wp.correct_count || 0}/{wp.total_questions || 0}）
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty description="暂无薄弱知识点，继续保持！" />
              )}
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Spin>
    </div>
  );
};

export default MyStatistics;
