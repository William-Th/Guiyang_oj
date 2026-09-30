import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Select, Empty, Alert, Tag, Table, Space } from 'antd';
import { message } from '../../lib/feedback';
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
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { statisticsApi } from '../../services/api';
import { SUBJECTS, getAllGrades } from '../../config/subjects';

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
  // 下拉选项以科目配置为基准（统计数据只做补充），避免无数据时无法筛选
  const [subjects, setSubjects] = useState<string[]>(SUBJECTS.map(s => s.value));
  const [grades, setGrades] = useState<string[]>(getAllGrades().map(g => g.value));
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
      // PostgreSQL numeric 类型返回字符串，统一转为数字
      const data = (response.data || []).map((item: any) => ({
        ...item,
        accuracy_rate: parseFloat(item.accuracy_rate) || 0,
        avg_score: parseFloat(item.avg_score) || 0,
        student_count: parseInt(item.student_count) || 0,
        total_attempts: parseInt(item.total_attempts) || 0,
        correct_count: parseInt(item.correct_count) || 0,
      }));
      setSchoolStats(data);

      // Extract unique subjects and grades
      const uniqueSubjects = Array.from(
        new Set<string>(data.map((item: SchoolAbilityStats) => item.subject))
      );
      const uniqueGrades = Array.from(
        new Set<string>(data.map((item: SchoolAbilityStats) => item.grade))
      );
      setSubjects(prev => Array.from(new Set([...prev, ...uniqueSubjects])));
      setGrades(prev => Array.from(new Set([...prev, ...uniqueGrades])));
    }
  };

  const loadDistrictData = async (subject?: string, grade?: string) => {
    const filters: any = {};
    if (subject && subject !== 'all') filters.subject = subject;
    if (grade && grade !== 'all') filters.grade = grade;

    const response = await statisticsApi.getDistrictAbilities(filters);
    if (response.success) {
      // PostgreSQL numeric 类型返回字符串，统一转为数字
      const data = (response.data || []).map((item: any) => ({
        ...item,
        accuracy_rate: parseFloat(item.accuracy_rate) || 0,
        avg_score: parseFloat(item.avg_score) || 0,
        school_count: parseInt(item.school_count) || 0,
        student_count: parseInt(item.student_count) || 0,
        total_attempts: parseInt(item.total_attempts) || 0,
        correct_count: parseInt(item.correct_count) || 0,
      }));
      setDistrictStats(data);
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

  // 年级平均正确率对比（横向条形图数据，任意年级数都能读）
  const currentStats = viewLevel === 'school' ? schoolStats : districtStats;
  const barData = viewLevel === 'school' ? schoolBarData : districtBarData;
  const gradeComparisonData = grades
    // 只画当前筛选结果里有数据的年级，避免一排 0 值产生噪音
    .filter((grade) => currentStats.some((item) => item.grade === grade))
    .map((grade) => {
      const gradeStats = currentStats.filter((item) => item.grade === grade);
      const avgAccuracy =
        gradeStats.length > 0
          ? gradeStats.reduce((sum, item) => sum + item.accuracy_rate, 0) / gradeStats.length
          : 0;
      return {
        grade,
        accuracy: parseFloat(avgAccuracy.toFixed(1)),
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

  const accuracyTag = (value: number) => (
    <Tag color={value >= 80 ? 'green' : value >= 60 ? 'orange' : 'red'}>
      {value.toFixed(1)}%
    </Tag>
  );

  const detailColumns: any[] = [
    { title: '能力', dataIndex: 'ability', ellipsis: true },
    { title: '科目', dataIndex: 'subject', width: 90 },
    { title: '年级', dataIndex: 'grade', width: 120 },
    ...(viewLevel === 'district'
      ? [{ title: '学校数', dataIndex: 'school_count', width: 90, render: (v: number) => `${v} 所` }]
      : []),
    { title: '学生数', dataIndex: 'student_count', width: 90, render: (v: number) => `${v} 人` },
    { title: '答题次数', dataIndex: 'total_attempts', width: 100, render: (v: number) => `${v} 次` },
    { title: '正确率', dataIndex: 'accuracy_rate', width: 100, render: (v: number) => accuracyTag(v) },
    { title: '平均分', dataIndex: 'avg_score', width: 90, render: (v: number) => `${v.toFixed(1)} 分` },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1320, margin: '0 auto' }}>
      {/* 工具行：标题 + 视图级别/科目/年级筛选，不再单独占一整张卡 */}
      <Row justify="space-between" align="middle" wrap style={{ marginBottom: 6 }}>
        <Col>
          <h2 style={{ margin: 0 }}>数据分析</h2>
        </Col>
        <Col>
          <Space size={12} wrap>
            {hasDistrictAccess && (
              <Select
                value={viewLevel}
                onChange={handleViewLevelChange}
                style={{ width: 118 }}
              >
                <Select.Option value="school">
                  <TeamOutlined /> 学校级
                </Select.Option>
                <Select.Option value="district">
                  <BookOutlined /> 区域级
                </Select.Option>
              </Select>
            )}
            <span>
              科目：
              <Select
                style={{ width: 128 }}
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
            </span>
            <span>
              年级：
              <Select
                style={{ width: 128 }}
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
            </span>
          </Space>
        </Col>
      </Row>

      {viewLevel === 'district' && (
        <Alert
          message="区域级数据：正在查看区域内所有学校的聚合数据"
          type="info"
          showIcon
          style={{ marginBottom: 6 }}
        />
      )}

      <Spin spinning={loading}>
        {/* 概览：四个指标合并为一张卡，数值紧凑 */}
        <Card styles={{ body: { padding: '14px 20px' } }}>
          <Row gutter={16} align="middle">
            <Col xs={12} md={6}>
              <Statistic
                title={viewLevel === 'school' ? '学生数' : '学生总数'}
                value={totalStudents}
                prefix={<TeamOutlined />}
                suffix="人"
                valueStyle={{ fontSize: 24 }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="答题次数"
                value={totalAttempts}
                prefix={<CheckCircleOutlined />}
                suffix="次"
                valueStyle={{ fontSize: 24 }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="平均正确率"
                value={avgAccuracy}
                prefix={<TrophyOutlined />}
                suffix="%"
                precision={1}
                valueStyle={{ fontSize: 24, color: avgAccuracy >= 60 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="平均得分"
                value={avgScore}
                prefix={<TrophyOutlined />}
                suffix="分"
                precision={1}
                valueStyle={{ fontSize: 24 }}
              />
            </Col>
          </Row>
        </Card>

        {/* 图表：能力 Top10 与年级对比并排，一眼看全，不再藏进页签 */}
        <Row gutter={[6, 6]}>
          <Col xs={24} lg={14}>
            <Card
              size="small"
              title="能力正确率 Top 10"
              styles={{ body: { padding: '10px 12px 4px' } }}
            >
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={barData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
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
                    <Bar dataKey="accuracy" name="正确率 (%)" maxBarSize={44} radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无能力统计数据" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title="各年级平均正确率"
              styles={{ body: { padding: '10px 12px 4px' } }}
            >
              {gradeComparisonData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, gradeComparisonData.length * 44 + 40)}
                >
                  <BarChart
                    data={gradeComparisonData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="grade"
                      width={64}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="accuracy"
                      name="平均正确率 (%)"
                      maxBarSize={22}
                      radius={[0, 4, 4, 0]}
                    >
                      {gradeComparisonData.map((entry, index) => (
                        <Cell key={`grade-cell-${index}`} fill={getBarColor(entry.accuracy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无年级对比数据" />
              )}
            </Card>
          </Col>
        </Row>

        {/* 明细：卡片墙改为紧凑表格，信息密度更高 */}
        <Card
          size="small"
          title="能力明细"
          styles={{ body: { padding: '4px 0 0' } }}
        >
          <Table
            size="small"
            rowKey={(_, index) => String(index)}
            dataSource={currentStats}
            columns={detailColumns}
            pagination={{ pageSize: 10, size: 'small', showSizeChanger: false, hideOnSinglePage: true }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无能力统计数据" />,
            }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default DataAnalytics;
