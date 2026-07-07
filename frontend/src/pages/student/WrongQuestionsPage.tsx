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
  Radio,
  Checkbox,
  Alert,
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

const TYPE_LABEL: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  blank: '填空题',
  code: '编程题',
  essay: '问答题',
  matching: '匹配题',
};

// 不支持在线自动判题的题型（与后端 judgeObjective 保持一致）
const UNSUPPORTED_TYPES = ['code', 'essay', 'matching'];

/**
 * 选项归一化：把题库中多种 options 格式统一成 { key, text }
 *  - 字符串数组 ["A. xxx", "B. yyy"]        → 提取字母 key + 去前缀 text（避免字母重复）
 *  - 对象数组 [{label:"A",content:"xxx"}]   → label 作 key，content 作 text
 *  - 兜底：无前缀字符串                       → 用 65+i 推字母
 */
interface OptItem { key: string; text: string }
function normalizeOptions(options: any): OptItem[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt: any, i: number) => {
    if (opt && typeof opt === 'object' && !Array.isArray(opt)) {
      const key = String(opt.label || String.fromCharCode(65 + i)).toUpperCase();
      return { key, text: opt.content != null ? String(opt.content) : '' };
    }
    const t = String(opt ?? '');
    const m = t.match(/^\s*([A-Za-z])[.、):：]\s*(.*)$/);
    if (m) return { key: m[1].toUpperCase(), text: m[2] };
    return { key: String.fromCharCode(65 + i), text: t };
  });
}

const WrongQuestionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<WrongQuestion[]>([]);
  const [stats, setStats] = useState<{ total: number; bySubject: any[] }>({ total: 0, bySubject: [] });
  const [subjectFilter, setSubjectFilter] = useState<string | undefined>();
  const [redoing, setRedoing] = useState<WrongQuestion | null>(null);
  const [answer, setAnswer] = useState<any>('');
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

  // 打开重做弹窗：按题型初始化答案（多选为数组，其余为字符串）
  const openRedo = (q: WrongQuestion) => {
    setRedoing(q);
    setAnswer(q.type === 'multiple' ? [] : '');
  };

  const handleRedo = async () => {
    if (!redoing) return;
    const isMultiple = redoing.type === 'multiple';
    const empty = isMultiple ? !answer || answer.length === 0 : !String(answer ?? '').trim();
    if (empty) {
      message.warning('请选择/输入答案');
      return;
    }
    setSubmitting(true);
    try {
      const payload = isMultiple ? answer : String(answer).trim();
      const r = await wrongQuestionApi.redo(redoing.question_id, payload);
      if (r.data?.correct) {
        const streakInfo = r.data.streak ? `，连胜 ${r.data.streak.current_streak}` : '';
        const awardInfo = r.data.awarded ? `，积分 +${r.data.awarded}` : '';
        message.success(`回答正确！已掌握并移出错题集${awardInfo}${streakInfo}`);
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
          <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={() => openRedo(r)}>
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
          <Table
            columns={columns}
            dataSource={list}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 900 }}
          />
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
        {redoing && (() => {
          const opts = normalizeOptions(redoing.options);
          const unsupported = UNSUPPORTED_TYPES.includes(redoing.type);
          return (
            <div>
              <Space style={{ marginBottom: 8 }}>
                {redoing.difficulty && (
                  <Tag color={difficultyMap[redoing.difficulty]?.color}>
                    {difficultyMap[redoing.difficulty]?.text}
                  </Tag>
                )}
                {redoing.type && <Tag>{TYPE_LABEL[redoing.type] || redoing.type}</Tag>}
              </Space>
              <div
                style={{ marginBottom: 16, fontSize: 16, lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: redoing.content || '' }}
              />
              {unsupported ? (
                <Alert type="warning" showIcon message="该题型（编程/问答/匹配）暂不支持在线自动判题" />
              ) : redoing.type === 'multiple' ? (
                <Checkbox.Group
                  value={answer}
                  onChange={(v) => setAnswer(v)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {opts.map((o) => (
                      <Checkbox key={o.key} value={o.key} style={{ fontSize: 15, lineHeight: 1.8 }}>
                        {o.key}. {o.text}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              ) : redoing.type === 'blank' ? (
                <>
                  <div style={{ marginTop: 4, marginBottom: 4 }}>请输入答案：</div>
                  <TextArea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={2}
                    placeholder="若有多个空，用逗号分隔"
                  />
                </>
              ) : (
                <Radio.Group
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {opts.map((o) => (
                      <Radio key={o.key} value={o.key} style={{ fontSize: 15, lineHeight: 1.8 }}>
                        {o.key}. {o.text}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default WrongQuestionsPage;
