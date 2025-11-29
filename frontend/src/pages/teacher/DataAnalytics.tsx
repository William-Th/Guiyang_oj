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
  Alert,
  Tag,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  BookOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
} from 'recharts';
import { statisticsApi } from '../../services/api';

// 与后端 v_school_ability_realtime 视图字段保持一致
interface SchoolAbilityStats {
  ability: string;
  subject: string;
  grade: string;
  student_count: number;
  total_attempts: number;
  correct_count: number;
  accuracy_rate: number;
  avg_score: number;
  last_activity_time: string;
}

// 与后端 v_district_ability_realtime 视图字段保持一致
interface DistrictAbilityStats {
  ability: string;
  subject: string;
  grade: string;
  school_count: number;
  student_count: number;
  total_attempts: number;
  correct_count: number;
  accuracy_rate: number;
  avg_score: number;
  last_activity_time: string;
}

const DataAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [schoolStats, setSchoolStats] = useState<SchoolAbilityStats[]>([]);
  const [districtStats, setDistrictStats] = useState<DistrictAbilityStats[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [viewLevel, setViewLevel] = useState<'school' | 'district'>('school');
  const [hasDistrictAccess, setHasDistrictAccess] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Try to load school data first
      await loadSchoolData();

      // Try to load district data to check if user has district access
      try {
        const districtResponse = await statisticsApi.getDistrictAbilities();
        if (districtResponse.success && districtResponse.data.length > 0) {
          setHasDistrictAccess(true);
          setDistrictStats(districtResponse.data);
        }
      } catch (error) {
        // User doesn't have district access, which is fine
        setHasDistrictAccess(false);
      }
    } catch (error: any) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolData = async (subject?: string, grade?: string) => {
    const filters: any = {};
    if (subject && subject !== 'all') filters.subject = subject;
    if (grade && grade !== 'all') filters.grade = grade;

    const response = await statisticsApi.getSchoolAbilities(filters);
    if (response.success) {
      setSchoolStats(response.data);

      // Extract unique subjects and grades
      const uniqueSubjects = Array.from(
        new Set<string>(response.data.map((item: SchoolAbilityStats) => item.subject))
      );
      const uniqueGrades = Array.from(
        new Set<string>(response.data.map((item: SchoolAbilityStats) => item.grade))
      );
      setSubjects(uniqueSubjects);
      setGrades(uniqueGrades);
    }
  };

  const loadDistrictData = async (subject?: string, grade?: string) => {
    const filters: any = {};
    if (subject && subject !== 'all') filters.subject = subject;
    if (grade && grade !== 'all') filters.grade = grade;

    const response = await statisticsApi.getDistrictAbilities(filters);
    if (response.success) {
      setDistrictStats(response.data);
    }
  };

  const handleSubjectChange = async (value: string) => {
    setSelectedSubject(value);
    setLoading(true);
    try {
      if (viewLevel === 'school') {
        await loadSchoolData(value, selectedGrade);
      } else {
        await loadDistrictData(value, selectedGrade);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = async (value: string) => {
    setSelectedGrade(value);
    setLoading(true);
    try {
      if (viewLevel === 'school') {
        await loadSchoolData(selectedSubject, value);
      } else {
        await loadDistrictData(selectedSubject, value);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewLevelChange = async (level: 'school' | 'district') => {
    setViewLevel(level);
    setLoading(true);
    try {
      if (level === 'school') {
        await loadSchoolData(selectedSubject, selectedGrade);
      } else {
        await loadDistrictData(selectedSubject, selectedGrade);
      }
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for school view
  const schoolBarData = schoolStats.slice(0, 10).map((item) => ({
    name: `${item.ability.substring(0, 6)}...`,
    fullName: item.ability,
    accuracy: parseFloat(item.accuracy_rate.toFixed(1)),
    students: item.student_count,
    grade: item.grade,
  }));

  // Prepare chart data for district view
  const districtBarData = districtStats.slice(0, 10).map((item) => ({
    name: `${item.ability.substring(0, 6)}...`,
    fullName: item.ability,
    accuracy: parseFloat(item.accuracy_rate.toFixed(1)),
    schools: item.school_count,
    students: item.student_count,
    grade: item.grade,
  }));

  // Prepare radar data (by grade)
  const currentStats = viewLevel === 'school' ? schoolStats : districtStats;
  const radarData = grades
    .filter((grade) => selectedGrade === 'all' || selectedGrade === grade)
    .map((grade) => {
      const gradeStats = currentStats.filter((item) => item.grade === grade);
      const avgAccuracy =
        gradeStats.length > 0
          ? gradeStats.reduce((sum, item) => sum + item.accuracy_rate, 0) / gradeStats.length
          : 0;
      return {
        grade,
        accuracy: parseFloat(avgAccuracy.toFixed(1)),
        fullMark: 100,
      };
    });

  // Calculate summary statistics
  const totalStudents = currentStats.reduce(
    (sum, item) => sum + item.student_count,
    0
  );
  const totalAttempts = currentStats.reduce((sum, item) => sum + item.total_attempts, 0);
  const avgAccuracy =
    currentStats.length > 0
      ? currentStats.reduce((sum, item) => sum + item.accuracy_rate, 0) / currentStats.length
      : 0;
  const avgScore =
    currentStats.length > 0
      ? currentStats.reduce((sum, item) => sum + item.avg_score, 0) / currentStats.length
      : 0;

  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return '#52c41a';
    if (accuracy >= 60) return '#faad14';
    return '#f5222d';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2>数据分析</h2>
        </Col>
        <Col>
          {hasDistrictAccess && (
            <Select
              value={viewLevel}
              onChange={handleViewLevelChange}
              style={{ width: 150 }}
            >
              <Select.Option value="school">
                <TeamOutlined /> 学校级
              </Select.Option>
              <Select.Option value="district">
                <BookOutlined /> 区域级
              </Select.Option>
            </Select>
          )}
        </Col>
      </Row>

      {viewLevel === 'district' && (
        <Alert
          message="区域级数据"
          description="您正在查看区域内所有学校的聚合数据"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        {/* Summary Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={viewLevel === 'school' ? '学生数' : '学生总数'}
                value={totalStudents}
                prefix={<TeamOutlined />}
                suffix="人"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="答题次数"
                value={totalAttempts}
                prefix={<CheckCircleOutlined />}
                suffix="次"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="平均正确率"
                value={avgAccuracy}
                prefix={<TrophyOutlined />}
                suffix="%"
                precision={1}
                valueStyle={{ color: avgAccuracy >= 60 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="平均得分"
                value={avgScore}
                prefix={<TrophyOutlined />}
                suffix="分"
                precision={1}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col>
              <span style={{ marginRight: 8 }}>科目：</span>
              <Select
                style={{ width: 150 }}
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
            </Col>
            <Col>
              <span style={{ marginRight: 8 }}>年级：</span>
              <Select
                style={{ width: 150 }}
                value={selectedGrade}
                onChange={handleGradeChange}
              >
                <Select.Option value="all">全部年级</Select.Option>
                {grades.map((grade) => (
                  <Select.Option key={grade} value={grade}>
                    {grade}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Charts */}
        <Tabs defaultActiveKey="abilities">
          <Tabs.TabPane tab="能力分析" key="abilities">
            <Card>
              {(viewLevel === 'school' ? schoolBarData : districtBarData).length > 0 ? (
                <>
                  <h3 style={{ textAlign: 'center', marginBottom: 24 }}>
                    {viewLevel === 'school' ? '学校' : '区域'}能力正确率分析 (Top 10)
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={viewLevel === 'school' ? schoolBarData : districtBarData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
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
                                <div>年级：{data.grade}</div>
                                <div>正确率：{data.accuracy}%</div>
                                {viewLevel === 'school' ? (
                                  <div>学生数：{data.students} 人</div>
                                ) : (
                                  <>
                                    <div>学校数：{data.schools} 所</div>
                                    <div>学生数：{data.students} 人</div>
                                  </>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="accuracy" name="正确率 (%)">
                        {(viewLevel === 'school' ? schoolBarData : districtBarData).map(
                          (entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detailed List */}
                  <div style={{ marginTop: 24 }}>
                    <h4>详细统计：</h4>
                    <Row gutter={[16, 16]}>
                      {currentStats.map((item, index) => (
                        <Col key={index} xs={24} sm={12} md={8}>
                          <Card size="small">
                            <div>
                              <strong>{item.ability}</strong>
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                {item.grade}
                              </Tag>
                            </div>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                              科目：{item.subject}
                            </div>
                            {viewLevel === 'district' && (
                              <div style={{ fontSize: 12, color: '#666' }}>
                                学校数：{(item as DistrictAbilityStats).school_count} 所
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: '#666' }}>
                              学生数：{item.student_count} 人
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              答题次数：{item.total_attempts} 次
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

          <Tabs.TabPane tab="年级对比" key="grades">
            <Card>
              {radarData.length > 0 ? (
                <>
                  <h3 style={{ textAlign: 'center', marginBottom: 24 }}>
                    各年级平均正确率对比
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="grade" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="平均正确率 (%)"
                        dataKey="accuracy"
                        stroke="#1890ff"
                        fill="#1890ff"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <Empty description="暂无年级对比数据" />
              )}
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Spin>
    </div>
  );
};

export default DataAnalytics;
