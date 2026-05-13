import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  message,
  Input,
  Radio,
  Tooltip,
  Empty,
  Spin,
  Descriptions,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { questionReviewApi, questionBankApi } from '../../services/api';

const { TextArea } = Input;

// 能力配置接口
interface Ability {
  id: string;
  name: string;
  description: string;
}

// 知识点配置接口
interface KnowledgePoint {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Question {
  id: number;
  type: string;
  subject: string;
  grade: string;
  level: string;
  content: string;
  options?: string[];
  correct_answer: any;
  suggested_score: number;
  difficulty: string;
  explanation?: string;
  abilities?: string[];
  knowledge_points?: string[];
  status: string;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  scope?: string[];
}

const ReviewPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<Question[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 配置数据
  const [abilitiesConfig, setAbilitiesConfig] = useState<Ability[]>([]);
  const [knowledgePointsConfig, setKnowledgePointsConfig] = useState<Record<string, KnowledgePoint[]>>({});
  const [scopeTextsMap, setScopeTextsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
    loadPendingReviews();
  }, []);

  // 加载配置数据
  const loadConfig = async () => {
    try {
      const abilitiesRes = await questionBankApi.getAbilities();
      const abilities = abilitiesRes.data?.abilities || abilitiesRes.data || [];
      setAbilitiesConfig(abilities);

      const kpRes = await questionBankApi.getAllKnowledgePoints();
      if (kpRes.data) {
        const kpMap: Record<string, KnowledgePoint[]> = {};
        Object.entries(kpRes.data).forEach(([key, value]: [string, any]) => {
          if (value.knowledge_points) {
            kpMap[key] = value.knowledge_points;
          }
        });
        setKnowledgePointsConfig(kpMap);
      }
    } catch (error) {
      console.error('Load config error:', error);
    }
  };

  // 科目中文名称到英文代码的映射
  const getSubjectCode = (subjectName: string): string => {
    const subjectMap: Record<string, string> = {
      '数学': 'math',
      '物理': 'physics',
      '化学': 'chemistry',
      '生物': 'biology',
      '信息科技': 'computer',
      '计算机': 'computer'
    };
    return subjectMap[subjectName] || subjectName;
  };

  // 获取能力名称
  const getAbilityName = (id: string): string => {
    const ability = abilitiesConfig.find(a => a.id === id);
    return ability?.name || id;
  };

  // 获取知识点名称
  const getKnowledgePointName = (subject: string, id: string): string => {
    const subjectCode = getSubjectCode(subject);
    const kps = knowledgePointsConfig[subjectCode] || [];
    const kp = kps.find(k => k.id === id);
    return kp?.name || id;
  };

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await questionReviewApi.getPendingReviews();
      setPendingReviews(response.data || []);
    } catch (error: any) {
      console.error('Load pending reviews error:', error);
      message.error(error.response?.data?.error || '加载待审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = async (question: Question) => {
    setSelectedQuestion(question);
    setReviewStatus('approved');
    setReviewComment('');

    // 加载该题目的scope文本映射
    if (question.scope && question.scope.length > 0) {
      try {
        const scopeRes = await questionBankApi.getScopeTexts(question.scope);
        if (scopeRes.data) {
          setScopeTextsMap(scopeRes.data);
        }
      } catch (error) {
        console.error('Load scope texts error:', error);
      }
    }

    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    // 拒绝时必须填写审核意见，批准时可选
    if (reviewStatus === 'rejected' && !reviewComment.trim()) {
      message.warning('拒绝时必须填写审核意见');
      return;
    }

    try {
      setSubmitting(true);
      await questionReviewApi.reviewQuestion(
        selectedQuestion!.id,
        reviewStatus,
        reviewComment
      );
      message.success(`${reviewStatus === 'approved' ? '批准' : '拒绝'}成功`);
      setReviewModalVisible(false);
      loadPendingReviews();
    } catch (error: any) {
      message.error(error.response?.data?.error || '审核提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getQuestionTypeText = (type: string) => {
    const types: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      blank: '填空题',
      true_false: '判断题',
      essay: '问答题',
      code: '编程题',
      matching: '匹配题',
    };
    return types[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'green',
      medium: 'orange',
      hard: 'red',
    };
    return colors[difficulty] || 'default';
  };

  const getDifficultyText = (difficulty: string) => {
    const texts: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return texts[difficulty] || difficulty;
  };

  const getLevelColor = (level: string) => {
    const levelNum = parseInt(level.replace('L', ''));
    if (levelNum <= 3) return 'green';
    if (levelNum <= 6) return 'blue';
    return 'red';
  };

  const getScopeText = (scope: string) => {
    // 使用从后端API加载的scope文本映射
    return scopeTextsMap[scope] || scope;
  };

  const renderAnswer = (question: Question) => {
    switch (question.type) {
      case 'single':
      case 'multiple':
        if (Array.isArray(question.correct_answer)) {
          return question.correct_answer.join(', ');
        }
        return question.correct_answer;
      case 'true_false':
        return question.correct_answer ? '正确' : '错误';
      case 'blank':
        if (Array.isArray(question.correct_answer)) {
          return question.correct_answer.map((ans: string, idx: number) =>
            `空${idx + 1}: ${ans}`
          ).join('; ');
        }
        return question.correct_answer;
      default:
        return question.correct_answer || '-';
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type: string) => (
        <Tag color="blue">{getQuestionTypeText(type)}</Tag>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.length > 50 ? text.substring(0, 50) + '...' : text}</span>
        </Tooltip>
      ),
    },
    {
      title: '建议分值',
      dataIndex: 'suggested_score',
      key: 'suggested_score',
      width: 90,
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Question) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleReviewClick(record)}
        >
          审核
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card title="待我审核">
        <Spin spinning={loading}>
          {pendingReviews.length === 0 && !loading ? (
            <Empty
              description="暂无待审核题目"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={pendingReviews}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 道待审核题目`,
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>

      {/* Review Modal */}
      <Modal
        title="审核题目"
        open={reviewModalVisible}
        onOk={handleSubmitReview}
        onCancel={() => setReviewModalVisible(false)}
        confirmLoading={submitting}
        width={800}
        okText="提交审核"
        cancelText="取消"
      >
        {selectedQuestion && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="题目ID">
                {selectedQuestion.id}
              </Descriptions.Item>
              <Descriptions.Item label="题型">
                <Tag color="blue">{getQuestionTypeText(selectedQuestion.type)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="科目">
                {selectedQuestion.subject}
              </Descriptions.Item>
              <Descriptions.Item label="年级">
                {selectedQuestion.grade}
              </Descriptions.Item>
              <Descriptions.Item label="级别">
                <Tag color={getLevelColor(selectedQuestion.level)}>
                  {selectedQuestion.level}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="难度">
                <Tag color={getDifficultyColor(selectedQuestion.difficulty)}>
                  {getDifficultyText(selectedQuestion.difficulty)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="建议分值">
                {selectedQuestion.suggested_score} 分
              </Descriptions.Item>
              <Descriptions.Item label="题库范围">
                {selectedQuestion.scope?.map((s) => (
                  <Tag key={s} color="purple" style={{ marginBottom: 4 }}>
                    {getScopeText(s)}
                  </Tag>
                ))}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <strong>题目内容：</strong>
              <div style={{
                marginTop: 8,
                padding: 12,
                background: '#f3f4f6',
                borderRadius: 4,
                whiteSpace: 'pre-wrap'
              }}>
                {selectedQuestion.content}
              </div>
            </div>

            {selectedQuestion.options && selectedQuestion.options.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>选项：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.options.map((option, index) => (
                    <div key={index} style={{ padding: '4px 0' }}>
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <strong>正确答案：</strong>
              <div style={{
                marginTop: 8,
                padding: 12,
                background: '#e6f7ff',
                borderRadius: 4
              }}>
                {renderAnswer(selectedQuestion)}
              </div>
            </div>

            {selectedQuestion.explanation && (
              <div style={{ marginTop: 16 }}>
                <strong>题目解析：</strong>
                <div style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f3f4f6',
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedQuestion.explanation}
                </div>
              </div>
            )}

            {selectedQuestion.abilities && selectedQuestion.abilities.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>考察能力：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.abilities.map((ability, index) => (
                    <Tag key={index} color="geekblue" style={{ marginBottom: 4 }}>
                      {getAbilityName(ability)}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedQuestion.knowledge_points && selectedQuestion.knowledge_points.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>知识点：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.knowledge_points.map((kp, index) => (
                    <Tag key={index} color="cyan" style={{ marginBottom: 4 }}>
                      {getKnowledgePointName(selectedQuestion.subject, kp)}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <span style={{ color: 'red' }}>* </span>
                  审核决定：
                </label>
                <Radio.Group
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <Radio.Button value="approved">
                    <CheckCircleOutlined style={{ color: '#22c55e' }} /> 批准通过
                  </Radio.Button>
                  <Radio.Button value="rejected">
                    <CloseCircleOutlined style={{ color: '#ef4444' }} /> 拒绝
                  </Radio.Button>
                </Radio.Group>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  {reviewStatus === 'rejected' && <span style={{ color: 'red' }}>* </span>}
                  审核意见{reviewStatus === 'rejected' ? '（必填）' : '（可选）'}：
                </label>
                <TextArea
                  rows={4}
                  placeholder={
                    reviewStatus === 'approved'
                      ? '可填写审核意见，如：题目质量良好，同意发布'
                      : '请说明拒绝原因，如：题目内容不准确，需要修改'
                  }
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={500}
                  showCount
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewPage;
