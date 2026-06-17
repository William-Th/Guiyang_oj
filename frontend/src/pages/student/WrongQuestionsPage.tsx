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
  Statistic,
  Row,
} from 'antd';
import { ReloadOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { wrongQuestionApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface WrongQuestion {
  id: number;
  question_id: number;
  subject: string;
  difficulty: string;
  error_count: number;
  review_count: number;
  last_wrong_at: string;
  content: string;
  options: any;
  correct_answer: any;
  type: string;
  explanation: string;
}

const difficultyMap: Record<string, { text: string; color: string }> = {
  easy: { text: '简单', color: 'green' },
  medium: { text: '中等', color: 'orange' },
  hard: { text: '困难', color: 'red' },
};

const WrongQuestionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<WrongQuestion[]>([]);
  const [stats, setStats] = useState<{ total: number; bySubject: any[] }>({ total: 0, bySubject: [] });
  const [subjectFilter, setSubjectFilter] = useState<string | undefined>();
  const [redoing, setRedoing] = useState<WrongQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        wrongQuestionApi.list({ subject: subjectFilter, limit: 100 }),
        wrongQuestionApi.getStats(),
      ]);
      setList(l.data || []);
      setStats(s.data || { total: 0, bySubject: [] });
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subjectFilter]);

  const handleRedo = async () => {
    if (!redoing) return;
    setSubmitting(true);
    try {
      const r = await wrongQuestionApi.redo(redoing.question_id, answer);
      if (r.data?.correct) {
        const streakInfo = r.data.streak ? `，连胜 ${r.data.streak.current_streak}` : '';
        message.success(`回答正确！积分 +${r.data.awarded}${streakInfo}`);
        setRedoing(null);
        setAnswer('');
        fetchData();
      } else {
        message.error('回答错误，再接再厉');
      }
    } catch (e: any) {
      message.error(e.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMastered = async (q: WrongQuestion) => {
    try {
      await wrongQuestionApi.mastered(q.question_id);
      message.success('已标记掌握');
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.error || '操作失败');
    }
  };

  const handleRemove = (q: WrongQuestion) => {
    Modal.confirm({
      title: '确认移出错题集？',
      onOk: async () => {
        try {
          await wrongQuestionApi.remove(q.question_id);
          message.success('已移除');
          fetchData();
        } catch (e: any) {
          message.error(e.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const columns: ColumnsType<WrongQuestion> = [
    {
      title: '题目',
      dataIndex: 'content',
      render: (c: string) => (
        <div
          style={{ maxWidth: 400 }}
          dangerouslySetInnerHTML={{ __html: c && c.length > 80 ? c.slice(0, 80) + '...' : c }}
        />
      ),
    },
    { title: '科目', dataIndex: 'subject', width: 90 },
    {
      title: '难度',
      dataIndex: 'difficulty',
      width: 80,
      render: (d: string) => <Tag color={difficultyMap[d]?.color}>{difficultyMap[d]?.text || d}</Tag>,
    },
    { title: '错误次数', dataIndex: 'error_count', width: 90 },
    {
      title: '最近错误',
      dataIndex: 'last_wrong_at',
      width: 160,
      render: (t: string) => (t ? new Date(t).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      width: 230,
      render: (_: any, r: WrongQuestion) => (
        <Space>
          <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={() => { setRedoing(r); setAnswer(''); }}>
            重做
          </Button>
          <Button size="small" icon={<CheckOutlined />} onClick={() => handleMastered(r)}>掌握</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemove(r)}>移除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>错题集</Title>
      <Row style={{ marginBottom: 16 }}>
        <Card>
          <Statistic title="活跃错题数" value={stats.total} />
        </Card>
      </Row>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text>科目筛选：</Text>
          <Select
            allowClear
            placeholder="全部科目"
            style={{ width: 180 }}
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={(stats.bySubject || []).map((s: any) => ({ value: s.subject, label: `${s.subject} (${s.count})` }))}
          />
        </Space>
      </Card>
      <Card>
        {loading ? (
          <Spin />
        ) : list.length ? (
          <Table columns={columns} dataSource={list} rowKey="id" pagination={{ pageSize: 10 }} />
        ) : (
          <Empty description="暂无错题，继续加油！" />
        )}
      </Card>
      <Modal
        title="重做错题"
        open={!!redoing}
        onOk={handleRedo}
        onCancel={() => setRedoing(null)}
        confirmLoading={submitting}
        okText="提交"
        cancelText="取消"
      >
        {redoing && (
          <div>
            <div style={{ marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: redoing.content }} />
            {redoing.options && typeof redoing.options === 'object' && !Array.isArray(redoing.options) &&
              Object.entries(redoing.options).map(([k, v]) => (
                <div key={k} style={{ marginLeft: 16 }}>{k}. {String(v)}</div>
              ))}
            {Array.isArray(redoing.options) &&
              redoing.options.map((v, i) => (
                <div key={i} style={{ marginLeft: 16 }}>{String.fromCharCode(65 + i)}. {String(v)}</div>
              ))}
            <div style={{ marginTop: 12, marginBottom: 4 }}>请输入答案：</div>
            <TextArea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={2}
              placeholder="选项字母（如 A）/ 多选（如 AC）/ 填空答案"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WrongQuestionsPage;
