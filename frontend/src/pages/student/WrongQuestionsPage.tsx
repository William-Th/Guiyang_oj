import React, { useEffect, useState } from 'react';

import { plainTextPreview } from '@/utils/richText';
import { Card, Table, Tag, Button, Select, Space, Modal, Input, Radio, Checkbox, Alert, Empty, Spin, Typography, Tabs, List } from 'antd';
import { message, modal } from '../../lib/feedback';
import {
  CheckOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  FireOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { wrongQuestionApi } from '../../services/api';
import RichTextViewer from '../../components/common/RichTextViewer';
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
  status?: string;
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

// 科目筛选下拉选项（覆盖项目主要科目，所有 Tab 通用，避免只显示活跃错题的科目）
const SUBJECT_OPTIONS = [
  { value: '数学', label: '数学' },
  { value: '信息科技', label: '信息科技' },
  { value: '语文', label: '语文' },
  { value: '英语', label: '英语' },
  { value: '科学', label: '科学' },
];

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
  const [stats, setStats] = useState<{ total: number; bySubject: any[]; byStatus?: { active: number; mastered: number; removed: number } }>({ total: 0, bySubject: [] });
  const [statusTab, setStatusTab] = useState<string>('active');
  const [subjectFilter, setSubjectFilter] = useState<string | undefined>();
  const [redoing, setRedoing] = useState<WrongQuestion | null>(null);
  const [answer, setAnswer] = useState<any>('');
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [l, s] = await Promise.all([
        wrongQuestionApi.list({ subject: subjectFilter, status: statusTab, limit: 100 }),
        wrongQuestionApi.getStats(subjectFilter),
      ]);
      setList(l.data || []);
      setStats(s.data || { total: 0, bySubject: [] });
    } catch (e: any) {
      setLoadError(true);
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subjectFilter, statusTab]);

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
        message.error('回答错误，已回到活跃错题');
        setRedoing(null);
        setAnswer('');
        fetchData();
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
    modal.confirm({
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

  const renderActions = (question: WrongQuestion) => {
    if (statusTab === 'removed') {
      return <Text type="secondary">已移除</Text>;
    }

    return (
      <Space className="wrong-question-card__actions" wrap size={4}>
        <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={() => openRedo(question)}>
          {statusTab === 'mastered' ? '再练一次' : '重新作答'}
        </Button>
        {statusTab === 'active' && (
          <Button size="small" icon={<CheckOutlined />} onClick={() => handleMastered(question)}>标记掌握</Button>
        )}
        {statusTab === 'active' && (
          <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemove(question)}>移除</Button>
        )}
      </Space>
    );
  };

  const columns: ColumnsType<WrongQuestion> = [
    {
      title: '题目',
      dataIndex: 'content',
      render: (c: string) => (
        <div className="wrong-question-title">{plainTextPreview(c, 80)}</div>
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
      width: 285,
      render: (_: any, r: WrongQuestion) => renderActions(r),
    },
  ];

  return (
    <main className="wrong-questions-page" aria-labelledby="wrong-questions-title">
      <header className="wrong-questions-page__hero">
        <div>
          <span className="wrong-questions-page__eyebrow">
            <ExperimentOutlined aria-hidden="true" /> 错题实验室
          </span>
          <Title id="wrong-questions-title" level={1}>错题巩固站</Title>
          <Typography.Paragraph>
            错题不是失败记录，而是下一次进步最清楚的线索。选择一道题，再试一次。
          </Typography.Paragraph>
        </div>
        <div className="wrong-questions-page__hero-stat" aria-label="错题学习概览">
          <div className="wrong-questions-page__metric">
            <strong>{stats.byStatus?.active ?? 0}</strong>
            <span><FireOutlined /> 待巩固</span>
          </div>
          <div className="wrong-questions-page__metric">
            <strong>{stats.byStatus?.mastered ?? 0}</strong>
            <span><TrophyOutlined /> 已掌握</span>
          </div>
        </div>
      </header>

      <Card className="wrong-questions-page__controls">
        <div className="wrong-questions-page__toolbar">
          <div className="wrong-questions-page__filter">
            <Text>选择科目</Text>
            <Select
              allowClear
              showSearch
              placeholder="全部科目"
              value={subjectFilter}
              onChange={setSubjectFilter}
              options={SUBJECT_OPTIONS}
              aria-label="选择错题科目"
            />
          </div>
          <Tabs
            className="wrong-questions-page__tabs"
            activeKey={statusTab}
            onChange={(key) => setStatusTab(key)}
            items={[
              { key: 'active', label: `待巩固（${stats.byStatus?.active ?? 0}）` },
              { key: 'mastered', label: `已掌握（${stats.byStatus?.mastered ?? 0}）` },
              { key: 'removed', label: `已移除（${stats.byStatus?.removed ?? 0}）` },
            ]}
          />
        </div>
      </Card>

      {loadError && (
        <Alert
          type="warning"
          showIcon
          message="错题暂时没有加载出来"
          description="请检查网络连接后刷新页面。"
          action={<Button onClick={() => void fetchData()}>重新加载</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card className="wrong-questions-page__content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" tip="正在整理错题..." />
          </div>
        ) : list.length ? (
          <>
            <div className="wrong-questions-page__desktop-table">
              <Table
                columns={columns}
                dataSource={list}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1040 }}
              />
            </div>
            <List
              className="wrong-questions-page__mobile-list"
              dataSource={list}
              pagination={{ pageSize: 6, size: 'small' }}
              renderItem={(item) => (
                <List.Item>
                  <article className="wrong-question-card">
                    <div className="wrong-question-card__meta">
                      <Tag color="cyan">{item.subject}</Tag>
                      <Tag color={difficultyMap[item.difficulty]?.color}>
                        {difficultyMap[item.difficulty]?.text || item.difficulty}
                      </Tag>
                      <Tag>{TYPE_LABEL[item.type] || item.type}</Tag>
                    </div>
                    <RichTextViewer content={item.content} className="wrong-question-card__content" />
                    <div className="wrong-question-card__footer">
                      <Text type="secondary">累计答错 {item.error_count} 次</Text>
                      {renderActions(item)}
                    </div>
                  </article>
                </List.Item>
              )}
            />
          </>
        ) : (
          <Empty description={statusTab === 'active' ? '当前没有待巩固的错题，继续保持' : '这个分类里暂时没有题目'} />
        )}
      </Card>
      <Modal
        title="重新挑战这道题"
        open={!!redoing}
        onOk={handleRedo}
        onCancel={() => setRedoing(null)}
        confirmLoading={submitting}
        okText="提交答案"
        cancelText="取消"
        width={680}
        wrapClassName="wrong-question-redo-modal"
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
              <RichTextViewer content={redoing.content} className="wrong-question-redo-modal__content" />
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
    </main>
  );
};

export default WrongQuestionsPage;
