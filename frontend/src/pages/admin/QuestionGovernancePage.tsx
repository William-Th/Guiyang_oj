import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  InputNumber,
  message,
  Empty,
  Spin,
  Typography,
  Tooltip,
} from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { questionGovernanceApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Promotion {
  id: number;
  draft_id: number;
  from_scope: string;
  to_scope: string;
  requested_by: number;
  status: string;
  review_comment?: string;
  created_at: string;
  content?: string;
  subject?: string;
  requester_name?: string;
}

interface QuotaRow {
  user_id: number;
  username: string;
  real_name?: string;
  quota: number;
  owned: number;
  remaining: number;
}

const QuestionGovernancePage: React.FC = () => {
  // 提级审核
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoStatus, setPromoStatus] = useState<string | undefined>('pending');
  const [reviewing, setReviewing] = useState<Promotion | null>(null);
  const [approve, setApprove] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 配额管理
  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [editingQuota, setEditingQuota] = useState<QuotaRow | null>(null);
  const [newQuota, setNewQuota] = useState<number>(1000);
  const [quotaReason, setQuotaReason] = useState('');
  const [quotaSearch, setQuotaSearch] = useState('');

  // 配额搜索过滤：按 ID / 用户名 / 姓名
  const filteredQuotas = quotas.filter((q) => {
    const kw = quotaSearch.trim().toLowerCase();
    if (!kw) return true;
    return (
      String(q.user_id).includes(kw) ||
      (q.username || '').toLowerCase().includes(kw) ||
      (q.real_name || '').toLowerCase().includes(kw)
    );
  });

  const fetchPromotions = async () => {
    setPromoLoading(true);
    try {
      const r = await questionGovernanceApi.listPromotions(promoStatus);
      setPromotions(r.data || []);
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载提级申请失败');
    } finally {
      setPromoLoading(false);
    }
  };

  // 配额列表（教师列表 + 各自配额）
  const fetchQuotas = async () => {
    setQuotaLoading(true);
    try {
      // 复用题库管理接口获取教师列表较复杂，这里简化：管理员手动输入教师ID查询
      // 实际列表由后端 /quotas/list 提供（若无可改为输入查询）
      const r = await questionGovernanceApi.listQuotas();
      setQuotas(r.data || []);
    } catch (e: any) {
      // 后端可能无 listQuotas，降级为空列表
      setQuotas([]);
    } finally {
      setQuotaLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoStatus]);

  // 配额管理：进入页面即加载（此前仅在手动点“刷新”时拉取）
  useEffect(() => {
    fetchQuotas();
  }, []);

  // 切换 Tab 时刷新对应数据，确保每次进入都展示最新
  const handleTabChange = (key: string) => {
    if (key === 'promotion') fetchPromotions();
    else if (key === 'quota') fetchQuotas();
  };

  const handleReview = async () => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      await questionGovernanceApi.reviewPromotion(reviewing.id, approve, comment);
      message.success(approve ? '已通过提级' : '已驳回提级');
      setReviewing(null);
      setComment('');
      fetchPromotions();
    } catch (e: any) {
      message.error(e.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminPromote = async (p: Promotion) => {
    Modal.confirm({
      title: '主动提级',
      content: '确认将此区级题目直接提级到市级题库？',
      onOk: async () => {
        try {
          await questionGovernanceApi.adminPromote(p.draft_id);
          message.success('已提级到市级');
          fetchPromotions();
        } catch (e: any) {
          message.error(e.response?.data?.error || '提级失败');
        }
      },
    });
  };

  const handleSaveQuota = async () => {
    if (!editingQuota) return;
    setSubmitting(true);
    try {
      await questionGovernanceApi.setQuota(editingQuota.user_id, newQuota, quotaReason);
      message.success('配额已更新');
      setEditingQuota(null);
      setQuotaReason('');
      fetchQuotas();
    } catch (e: any) {
      message.error(e.response?.data?.error || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const promotionColumns: ColumnsType<Promotion> = [
    {
      title: '题目',
      dataIndex: 'content',
      render: (c: string, r) => (
        <Tooltip title={`草稿ID #${r.draft_id}`}>
          <div style={{ maxWidth: 300 }} dangerouslySetInnerHTML={{ __html: c && c.length > 50 ? c.slice(0, 50) + '...' : c || `题目#${r.draft_id}` }} />
        </Tooltip>
      ),
    },
    { title: '科目', dataIndex: 'subject', width: 90, render: (s: string) => s || '-' },
    {
      title: '范围',
      width: 200,
      render: (_, r) => (
        <Space>
          <Tag>{r.from_scope}</Tag>
          <ArrowUpOutlined />
          <Tag color="blue">{r.to_scope}</Tag>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => {
        const m: Record<string, { t: string; c: string }> = {
          pending: { t: '待审核', c: 'orange' },
          approved: { t: '已通过', c: 'green' },
          rejected: { t: '已驳回', c: 'default' },
        };
        return <Tag color={m[s]?.c}>{m[s]?.t || s}</Tag>;
      },
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, r: Promotion) =>
        r.status === 'pending' ? (
          <Space>
            <Button size="small" type="primary" onClick={() => { setReviewing(r); setApprove(true); setComment(''); }}>
              审核
            </Button>
            <Button size="small" icon={<ArrowUpOutlined />} onClick={() => handleAdminPromote(r)}>
              直接提级
            </Button>
          </Space>
        ) : (
          <Text type="secondary">已处理</Text>
        ),
    },
  ];

  const quotaColumns: ColumnsType<QuotaRow> = [
    { title: '教师ID', dataIndex: 'user_id', width: 90 },
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '姓名', dataIndex: 'real_name', width: 120, render: (n: string) => n || '-' },
    {
      title: '已用/配额',
      width: 140,
      render: (_, r) => (
        <Space>
          <Text>{r.owned}</Text>
          <Text type="secondary">/ {r.quota}</Text>
        </Space>
      ),
    },
    {
      title: '剩余',
      dataIndex: 'remaining',
      width: 90,
      render: (n: number) => <Tag color={n <= 0 ? 'red' : n < 50 ? 'orange' : 'green'}>{n}</Tag>,
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, r: QuotaRow) => (
        <Button size="small" onClick={() => { setEditingQuota(r); setNewQuota(r.quota); setQuotaReason(''); }}>
          调整配额
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>题库治理</Title>
      <Tabs
        onChange={handleTabChange}
        items={[
          {
            key: 'promotion',
            label: '提级审核',
            children: (
              <Card
                extra={
                  <Space>
                    <Tabs size="small" activeKey={promoStatus || 'all'} onChange={(k) => setPromoStatus(k === 'all' ? undefined : k)} items={[
                      { key: 'pending', label: '待审核' },
                      { key: 'approved', label: '已通过' },
                      { key: 'all', label: '全部' },
                    ]} />
                    <Button icon={<ReloadOutlined />} onClick={fetchPromotions} loading={promoLoading}>刷新</Button>
                  </Space>
                }
              >
                {promoLoading ? <Spin /> : promotions.length ? (
                  <Table columns={promotionColumns} dataSource={promotions} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
                ) : <Empty description="暂无提级申请" />}
              </Card>
            ),
          },
          {
            key: 'quota',
            label: '配额管理',
            children: (
              <Card extra={
                <Space>
                  <Input.Search
                    allowClear
                    placeholder="搜索 ID / 用户名 / 姓名"
                    value={quotaSearch}
                    onChange={(e) => setQuotaSearch(e.target.value)}
                    style={{ width: 220 }}
                  />
                  <Button icon={<ReloadOutlined />} onClick={fetchQuotas} loading={quotaLoading}>刷新</Button>
                </Space>
              }>
                {quotaLoading ? <Spin /> : filteredQuotas.length ? (
                  <Table columns={quotaColumns} dataSource={filteredQuotas} rowKey="user_id" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
                ) : <Empty description={quotaSearch ? '未找到匹配的教师' : '暂无配额数据'} />}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="提级审核"
        open={!!reviewing}
        onCancel={() => setReviewing(null)}
        footer={[
          <Button key="cancel" onClick={() => setReviewing(null)}>取消</Button>,
          <Button key="reject" danger icon={<CloseOutlined />} loading={submitting && !approve} onClick={() => setApprove(false)}>仅驳回</Button>,
          <Button key="ok" type="primary" icon={<CheckOutlined />} loading={submitting && approve} onClick={handleReview}>确认{approve ? '通过' : '驳回'}</Button>,
        ]}
      >
        {reviewing && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Button size="small" type={approve ? 'primary' : 'default'} onClick={() => setApprove(true)}>通过</Button>
                <Button size="small" danger={approve === false} type={approve === false ? 'primary' : 'default'} onClick={() => setApprove(false)}>驳回</Button>
              </Space>
            </div>
            <TextArea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="审核意见" />
          </div>
        )}
      </Modal>

      <Modal
        title={`调整配额 - ${editingQuota?.username || ''}`}
        open={!!editingQuota}
        onOk={handleSaveQuota}
        onCancel={() => setEditingQuota(null)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
      >
        {editingQuota && (
          <div>
            <div style={{ marginBottom: 8 }}>当前配额：{editingQuota.quota}（已用 {editingQuota.owned}）</div>
            <div style={{ marginBottom: 8 }}>新配额：</div>
            <InputNumber min={0} max={100000} value={newQuota} onChange={(v) => setNewQuota(v || 0)} style={{ width: '100%' }} />
            <div style={{ marginTop: 12, marginBottom: 4 }}>调整原因（可选）：</div>
            <TextArea value={quotaReason} onChange={(e) => setQuotaReason(e.target.value)} rows={2} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuestionGovernancePage;
