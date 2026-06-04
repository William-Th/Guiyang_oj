import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Select,
  Tooltip,
  Popconfirm,
  Empty,
  Spin,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { questionReviewApi, questionBankApi } from '../../services/api';
import { buildDistrictScope, getDistrictById } from '../../config/districts';

interface Question {
  id: number;
  type: string;
  subject: string;
  grade: string;
  level: string;
  content: string;
  suggested_score: number;
  difficulty: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Reviewer {
  id: number;
  username: string;
  real_name: string;
  subjects: string[];
}

interface DraftsPageProps {
  onEdit?: (questionId: number) => void;
  isActive?: boolean;
}

const DraftsPage: React.FC<DraftsPageProps> = ({ onEdit, isActive }) => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Question[]>([]);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<number | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 自动获取用户所属区域代码
  const getUserDistrictCode = (): string | null => {
    if (!user?.districtId) return null;
    const district = getDistrictById(user.districtId);
    return district?.code || null;
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  // 监听标签页激活状态，当标签页激活时重新加载数据
  useEffect(() => {
    if (isActive) {
      console.log('📌 DraftsPage activated, reloading data...');
      loadDrafts();
    }
  }, [isActive]);

  // 监听scope变化，动态加载对应的审核人列表
  useEffect(() => {
    const loadReviewersForScope = async () => {
      if (!selectedQuestion || !selectedScope) {
        // 如果没有选择题目或scope，清空审核人列表
        setAvailableReviewers([]);
        setSelectedReviewer(null);
        return;
      }

      // 如果选择了区级题库但未选择具体区域，不加载审核人
      if (selectedScope === 'practice_district' && !selectedDistrictCode) {
        setAvailableReviewers([]);
        setSelectedReviewer(null);
        return;
      }

      // 构造完整的scope字符串
      let finalScope = selectedScope;
      if (selectedScope === 'practice_district' && selectedDistrictCode) {
        finalScope = buildDistrictScope(selectedDistrictCode);
      }

      try {
        const response = await questionReviewApi.getAvailableReviewers(
          selectedQuestion.subject,
          finalScope
        );
        setAvailableReviewers(response.data || []);
        setSelectedReviewer(null); // 清空之前选择的审核人
      } catch (error: any) {
        console.error('Load reviewers error:', error);
        message.error('加载审核人列表失败：' + (error.response?.data?.error || error.message));
        setAvailableReviewers([]);
      }
    };

    loadReviewersForScope();
  }, [selectedScope, selectedDistrictCode, selectedQuestion]);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const response = await questionReviewApi.getMyDrafts();
      setDrafts(response.data || []);
    } catch (error: any) {
      console.error('Load drafts error:', error);
      message.error(error.response?.data?.error || '加载草稿失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await questionBankApi.deleteQuestion(id);
      message.success('删除成功');
      loadDrafts();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleSubmitClick = async (question: Question) => {
    setSelectedQuestion(question);
    setSelectedReviewer(null);
    setSelectedScope('');
    setSelectedDistrictCode(''); // 清空区域选择
    setAvailableReviewers([]); // 清空审核人列表，等用户选择scope后再加载
    setSubmitModalVisible(true); // 直接打开模态框
  };

  const handleSubmit = async () => {
    if (!selectedReviewer || !selectedScope) {
      message.warning('请选择审核人和题库范围');
      return;
    }

    // 如果选择区级题库但无法获取区域代码，提示用户
    if (selectedScope === 'practice_district' && !selectedDistrictCode) {
      message.error('无法获取您的区域信息，请联系管理员');
      return;
    }

    // 构造完整的scope字符串
    let finalScope = selectedScope;
    if (selectedScope === 'practice_district' && selectedDistrictCode) {
      finalScope = buildDistrictScope(selectedDistrictCode);
    }

    try {
      setSubmitting(true);
      await questionReviewApi.submitForReview(
        selectedQuestion!.id,
        selectedReviewer,
        finalScope
      );
      message.success('提交审核成功');
      setSubmitModalVisible(false);
      loadDrafts();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
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

  const getLevelColor = (level: string | null | undefined) => {
    if (!level) return 'default';
    const levelNum = parseInt(level.replace('L', ''));
    if (levelNum <= 3) return 'green';
    if (levelNum <= 6) return 'blue';
    return 'red';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '题目编码',
      dataIndex: 'question_code',
      key: 'question_code',
      width: 130,
      render: (code: string) => (
        <Tag color="cyan" style={{ fontFamily: 'monospace' }}>{code || '-'}</Tag>
      ),
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
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit && onEdit(record.id)}
            />
          </Tooltip>
          <Tooltip title="发布题目（需提交审核）">
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handleSubmitClick(record)}
            >
              发布
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这道题目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="我的草稿"
        extra={
          <Button
            type="primary"
            onClick={() => navigate('/teacher/question-bank/create')}
          >
            新建题目
          </Button>
        }
      >
        <Spin spinning={loading}>
          {drafts.length === 0 && !loading ? (
            <Empty
              description="暂无草稿题目"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                onClick={() => navigate('/teacher/question-bank/create')}
              >
                立即创建
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={drafts}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 道草稿题目`,
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>

      {/* Submit for Review Modal */}
      <Modal
        title="发布题目"
        open={submitModalVisible}
        onOk={handleSubmit}
        onCancel={() => setSubmitModalVisible(false)}
        confirmLoading={submitting}
        width={600}
        okText="提交审核并发布"
        cancelText="取消"
      >
        {selectedQuestion && (
          <div>
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 4
            }}>
              <strong>发布说明：</strong>题目发布需要经过审核流程。请选择审核人和发布的题库范围，审核通过后题目将自动发布到对应的题库中。
            </div>
            <p>
              <strong>题目：</strong>
              {selectedQuestion.content.substring(0, 100)}
              {selectedQuestion.content.length > 100 && '...'}
            </p>
            <p>
              <strong>科目：</strong>{selectedQuestion.subject}
              <span style={{ marginLeft: 20 }}>
                <strong>年级：</strong>{selectedQuestion.grade}
              </span>
              <span style={{ marginLeft: 20 }}>
                <strong>级别：</strong>
                <Tag color={getLevelColor(selectedQuestion.level)}>
                  {selectedQuestion.level}
                </Tag>
              </span>
            </p>

            <div style={{ marginTop: 24 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ color: 'red' }}>* </span>
                选择目标题库范围：
              </label>
              <Select
                value={selectedScope || undefined}
                onChange={(value) => {
                  setSelectedScope(value);
                  // 如果选择区级题库，自动设置用户所属区域
                  if (value === 'practice_district') {
                    const userDistrictCode = getUserDistrictCode();
                    if (userDistrictCode) {
                      setSelectedDistrictCode(userDistrictCode);
                    } else {
                      message.warning('无法获取您的区域信息，请联系管理员');
                      setSelectedDistrictCode('');
                    }
                  } else {
                    setSelectedDistrictCode('');
                  }
                  setSelectedReviewer(null);
                }}
                placeholder="请选择要提交的题库范围"
                style={{ width: '100%' }}
                virtual={false}
              >
                <Select.Option value="assessment">
                  <Tag color="orange">测评题库</Tag>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    - 市级/系统管理员审核（最高标准）
                  </span>
                </Select.Option>
                <Select.Option value="practice_municipal">
                  <Tag color="blue">市级练习题库</Tag>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    - 市级审核人审核
                  </span>
                </Select.Option>
                <Select.Option value="practice_district">
                  <Tag color="cyan">区级练习题库</Tag>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    - 区级审核人审核
                  </span>
                </Select.Option>
              </Select>
              <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                提示：选择目标题库后，系统会根据题目科目筛选对应的审核人。校级题库无需审核，可在创建时直接发布。
              </div>
            </div>

            {/* 区域信息显示（仅当选择区级题库时显示） */}
            {selectedScope === 'practice_district' && selectedDistrictCode && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  目标区域：
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: '#f0f2f5',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9'
                }}>
                  <Tag color="cyan">{selectedDistrictCode}</Tag>
                  <span style={{ marginLeft: 8 }}>
                    {user?.districtId ? getDistrictById(user.districtId)?.name || '未知区域' : '未知区域'}
                  </span>
                  <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                    (根据您的账号自动匹配)
                  </span>
                </div>
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                  提示：系统已自动根据您的账号信息匹配所属区域，并加载该区域的审核人列表。
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ color: 'red' }}>* </span>
                选择审核人：
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder={
                  !selectedScope
                    ? '请先选择目标题库范围'
                    : (selectedScope === 'practice_district' && !selectedDistrictCode)
                      ? '请先选择目标区域'
                      : '请选择审核人'
                }
                value={selectedReviewer}
                onChange={setSelectedReviewer}
                showSearch
                optionFilterProp="children"
                disabled={!selectedScope || (selectedScope === 'practice_district' && !selectedDistrictCode)}
                virtual={false}
              >
                {availableReviewers.map((reviewer) => (
                  <Select.Option key={reviewer.id} value={reviewer.id}>
                    {reviewer.real_name} ({reviewer.username})
                    <span style={{ color: '#999', marginLeft: 8 }}>
                      [{reviewer.subjects.join(', ')}]
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </div>

            {availableReviewers.length === 0 && (
              <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                <strong>提示：</strong>当前没有可用的审核人。请联系管理员为教师授予相应的审核权限。
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DraftsPage;
