import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Modal,
  Input,
  message,
  Empty,
  Spin,
  Typography,
  Tooltip,
} from 'antd';
import { ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { questionGovernanceApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ErrorReport {
  id: number;
  question_id: number;
  question_content?: string;
  subject?: string;
  error_type: string;
  error_description: string;
  status: string;
  reporter_name?: string;
  created_at: string;
  report_count?: number; // 同题累计纠错次数
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  accepted: { text: '已采纳', color: 'green' },
  rejected: { text: '已驳回', color: 'default' },
  escalated: { text: '已上报', color: 'red' },
};

const errorTypeMap: Record<string, string> = {
  content_error: '内容错误',
  answer_error: '答案错误',
  option_error: '选项错误',
  typo: '文字/排版',
  knowledge_point: '知识点标注',
  other: '其他',
};

const ErrorReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ErrorReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending');
  const [handling, setHandling] = useState<ErrorReport | null>(null);
  const [action, setAction] = useState<'accepted' | 'rejected'>('accepted');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await questionGovernanceApi.listErrorReports(statusFilter);
      setList(r.data || []);
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSubmit = async () => {
    if (!handling) return;
    setSubmitting(true);
    try {
      await questionGovernanceApi.handleErrorReport(handling.id, action, comment);
      message.success(action === 'accepted' ? '已采纳纠错' : '已驳回纠错');
      setHandling(null);
      setComment('');
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ErrorReport> = [
    {
      title: '题目',
      dataIndex: 'question_content',
      render: (c: string, r) => (
        <Tooltip title={`题目ID #${r.question_id}`}>
          <div style={{ maxWidth: 300 }} dangerouslySetInnerHTML={{ __html: c && c.length > 60 ? c.slice(0, 60) + '...' : c }} />
        </Tooltip>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      width: 90,
      render: (s: string) => s || '-',
    },
    {
      title: '错误类型',
      dataIndex: 'error_type',
      width: 110,
      render: (t: string) => <Tag>{errorTypeMap[t] || t}</Tag>,
    },
    {
      title: '错误描述',
      dataIndex: 'error_description',
      render: (d: string) => <Text type="secondary" style={{ maxWidth: 220, display: 'inline-block' }}>{d}</Text>,
    },
    {
      title: '纠错次数',
      dataIndex: 'report_count',
      width: 90,
      render: (n: number) => (n ? <Tag color={n >= 5 ? 'red' : n >= 3 ? 'orange' : 'default'}>{n}/5</Tag> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 150,
      render: (t: string) => (t ? new Date(t).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, r: ErrorReport) =>
        r.status === 'pending' ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setHandling(r);
              setAction('accepted');
              setComment('');
            }}
          >
            处理
          </Button>
        ) : (
          <Text type="secondary">已处理</Text>
        ),
    },
  ];

  return (
    <div>
      <Title level={3}>学生纠错处理</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text>状态筛选：</Text>
          <Select
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            options={[
              { value: 'pending', label: '待处理' },
              { value: 'accepted', label: '已采纳' },
              { value: 'rejected', label: '已驳回' },
              { value: 'escalated', label: '已上报' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>
        </Space>
      </Card>
      <Card>
        {loading ? (
          <Spin />
        ) : list.length ? (
          <Table columns={columns} dataSource={list} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
        ) : (
          <Empty description="暂无纠错记录" />
        )}
      </Card>

      <Modal
        title="处理纠错"
        open={!!handling}
        onCancel={() => setHandling(null)}
        footer={[
          <Button key="cancel" onClick={() => setHandling(null)}>取消</Button>,
          <Button
            key="reject"
            icon={<CloseOutlined />}
            danger
            loading={submitting && action === 'rejected'}
            onClick={() => { setAction('rejected'); }}
          >
            驳回
          </Button>,
          <Button
            key="accept"
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting && action === 'accepted'}
            onClick={handleSubmit}
          >
            采纳并提交
          </Button>,
        ]}
      >
        {handling && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>错误类型：</Text>
              <Tag>{errorTypeMap[handling.error_type] || handling.error_type}</Tag>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>学生描述：</Text>
              <div>{handling.error_description}</div>
            </div>
            <div style={{ marginTop: 12, marginBottom: 4 }}>
              <Text strong>处理意见（采纳/驳回理由）：</Text>
            </div>
            <RadioGroupLike action={action} setAction={setAction} />
            <TextArea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="填写处理意见，将反馈给审核流程" style={{ marginTop: 8 }} />
            {handling.report_count != null && handling.report_count >= 3 && (
              <div style={{ marginTop: 8, color: '#fa8c16' }}>
                ⚠ 该题累计被纠错 {handling.report_count} 次，已{handling.report_count >= 5 ? '达到上限冻结' : '触发上级关注'}。
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// 简易采纳/驳回切换（按钮组语义）
const RadioGroupLike: React.FC<{ action: 'accepted' | 'rejected'; setAction: (a: 'accepted' | 'rejected') => void }> = ({ action, setAction }) => (
  <Space>
    <Button size="small" type={action === 'accepted' ? 'primary' : 'default'} onClick={() => setAction('accepted')}>采纳</Button>
    <Button size="small" danger={action === 'rejected'} type={action === 'rejected' ? 'primary' : 'default'} onClick={() => setAction('rejected')}>驳回</Button>
  </Space>
);

export default ErrorReportsPage;
