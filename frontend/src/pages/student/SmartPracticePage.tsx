import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Select,
  Space,
  Tag,
  List,
  Empty,
  Spin,
  Typography,
  message,
  Tooltip,
  Modal,
  Input,
  Alert,
  Radio,
  Checkbox,
} from 'antd';
import { ReloadOutlined, FireOutlined, ThunderboltOutlined, EditOutlined } from '@ant-design/icons';
import { recommendApi } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface QuestionItem {
  question_id: number;
  draft_id?: number;
  difficulty?: string;
  content?: string;
  options?: any;
  type?: string;
  score?: number;
  factors?: { mastery: number; zpd: number; spaced: number; novelty: number };
}

interface DailySet {
  question_ids: number[];
  stat_date: string;
  questions?: QuestionItem[];
  streak_count?: number;
  completed_count?: number;
}

interface AnswerResult {
  correct: boolean;
  awarded: number;
  streak: any;
  type?: string;
  options?: any;
  correct_answer?: any;
  explanation?: string;
}

const difficultyMap: Record<string, { text: string; color: string }> = {
  easy: { text: '简单', color: 'green' },
  medium: { text: '中等', color: 'orange' },
  hard: { text: '困难', color: 'red' },
};

const SUBJECT_OPTIONS = [
  { value: '数学', label: '数学' },
  { value: '信息科技', label: '信息科技' },
  { value: '语文', label: '语文' },
  { value: '英语', label: '英语' },
  { value: '科学', label: '科学' },
];

const TYPE_LABEL: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  blank: '填空',
  true_false: '判断',
  code: '编程',
  essay: '问答',
  matching: '匹配',
};

// 不支持在线自动判题的题型
const UNSUPPORTED_TYPES = ['code', 'essay', 'matching'];

/**
 * 选项归一化：把题库中三种 options 格式统一成 { key, text }
 *  - single/true_false: ["A. xxx", "B. yyy"]            → 提取字母 key + 去前缀 text
 *  - multiple:          [{label:"A",content:"xxx"}]      → label 作 key，content 作 text
 *  - 兜底：无前缀字符串 / 非对象                           → 用 65+i 推字母
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

const SmartPracticePage: React.FC = () => {
  const [tab, setTab] = useState('daily');
  const [subject, setSubject] = useState<string | undefined>();

  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySet, setDailySet] = useState<DailySet | null>(null);

  const [recLoading, setRecLoading] = useState(false);
  const [recs, setRecs] = useState<QuestionItem[]>([]);
  const [ability, setAbility] = useState<number | undefined>();

  // 答题弹窗状态
  const [current, setCurrent] = useState<QuestionItem | null>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 各题单已作答的题目 id（按来源分离：每日推题与碎片化推荐互不影响）
  const [dailyAnswered, setDailyAnswered] = useState<number[]>([]);
  const [recAnswered, setRecAnswered] = useState<number[]>([]);
  // 当前作答来源，用于答完后从对应题单移除
  const [currentSource, setCurrentSource] = useState<'daily' | 'recommend'>('daily');

  // 碎片化推荐：本会话已展示过的 question_id（换一批时累积排除，强制换内容；题库用尽则重置循环）
  const shownRecIdsRef = useRef<number[]>([]);

  const fetchDaily = async () => {
    setDailyLoading(true);
    try {
      const r = await recommendApi.dailyQuestions(subject);
      setDailySet(r.data || null);
    } catch (e: any) {
      message.error(e.response?.data?.error || '获取每日推题失败');
    } finally {
      setDailyLoading(false);
    }
  };

  // reset=true：重置已展示（切科目/初始）；reset=false：换一批，累积排除已展示
  const fetchRecommend = async (reset = false) => {
    if (!subject) {
      message.warning('请先选择科目');
      return;
    }
    setRecLoading(true);
    try {
      // 换一批：把当前批次并入排除集，强制后端返回未展示过的题
      if (reset) {
        shownRecIdsRef.current = [];
      } else {
        shownRecIdsRef.current = Array.from(
          new Set([...shownRecIdsRef.current, ...recs.map((r) => r.question_id)])
        );
      }
      let r = await recommendApi.recommend(subject, 10, shownRecIdsRef.current);
      // 候选基本用尽（返回过少）→ 重置排除集重新拉取，保证换一批始终有题可推
      if (!reset && (r.data || []).length < 3 && shownRecIdsRef.current.length > 0) {
        shownRecIdsRef.current = [];
        r = await recommendApi.recommend(subject, 10, []);
      }
      setRecs(r.data || []);
      setAbility(r.meta?.ability);
      setRecAnswered([]);   // 换一批：重置已答记录，允许新批次完整展示与重复作答
    } catch (e: any) {
      message.error(e.response?.data?.error || '获取推荐失败');
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'daily') fetchDaily();
  }, [tab, subject]);

  // 切科目：清空碎片化推荐累积排除与旧批次，避免跨科目误排除 / 显示旧题
  useEffect(() => {
    shownRecIdsRef.current = [];
    setRecs([]);
  }, [subject]);

  // 打开答题弹窗：按题型初始化答案，记录作答来源
  const openAnswer = (q: QuestionItem, source: 'daily' | 'recommend') => {
    setCurrent(q);
    setCurrentSource(source);
    setResult(null);
    setAnswer(q.type === 'multiple' ? [] : '');
  };

  const closeAnswer = () => {
    setCurrent(null);
    setAnswer(null);
    setResult(null);
  };

  // 提交答案
  const handleSubmit = async () => {
    if (!current) return;
    const isMultiple = current.type === 'multiple';
    const empty = isMultiple ? !answer || answer.length === 0 : !String(answer ?? '').trim();
    if (empty) {
      message.warning('请选择/输入答案');
      return;
    }
    setSubmitting(true);
    try {
      const payload = isMultiple ? answer : String(answer).trim();
      const r = await recommendApi.answerQuestion(current.question_id, payload);
      setResult(r.data);
      // 无论对错，仅从当前作答的题单移除（每日推题与碎片化推荐互不影响）
      const setAns = currentSource === 'daily' ? setDailyAnswered : setRecAnswered;
      setAns((prev) => (prev.includes(current.question_id) ? prev : [...prev, current.question_id]));
      if (r.data?.correct) {
        const streakInfo = r.data.streak ? `，连胜 ${r.data.streak.current_streak}` : '';
        message.success(`回答正确！积分 +${r.data.awarded}${streakInfo}`);
      } else {
        message.error('回答错误，已加入错题集');
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || e.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 题目内容摘要
  const renderContent = (c?: string, max = 80) => {
    if (!c) return '（无内容）';
    const plain = c.replace(/<[^>]+>/g, '');
    return plain.length > max ? plain.slice(0, max) + '...' : plain;
  };

  const dailyQuestions: QuestionItem[] = (dailySet?.questions || []).filter(
    (q) => !dailyAnswered.includes(q.question_id)
  );
  const visibleRecs = recs.filter((r) => !recAnswered.includes(r.question_id));

  // 当前题归一化选项
  const currentType = current?.type || '';
  const currentOpts = current ? normalizeOptions(current.options) : [];
  const unsupported = UNSUPPORTED_TYPES.includes(currentType);

  return (
    <div>
      <Title level={3}>
        <ThunderboltOutlined /> 智能练习
      </Title>
      <Paragraph type="secondary">
        系统根据你的掌握度、难度匹配与错题复习情况智能推题，巩固薄弱知识点。答错的题自动加入错题集，答对的题不再重复推送。
      </Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text>选择科目：</Text>
          <Select
            allowClear
            showSearch
            placeholder="如：数学、信息科技"
            style={{ width: 200 }}
            value={subject}
            onChange={setSubject}
            options={SUBJECT_OPTIONS}
          />
        </Space>
      </Card>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'daily',
            label: <span><FireOutlined /> 每日推题</span>,
            children: (
              <Card extra={<Button icon={<ReloadOutlined />} onClick={fetchDaily} loading={dailyLoading}>刷新</Button>}>
                {dailyLoading ? (
                  <Spin />
                ) : dailyQuestions.length ? (
                  <>
                    <Text type="secondary">
                      剩余 {dailyQuestions.length} 题（{dailySet?.stat_date}），含错题复习与新题巩固
                    </Text>
                    <List
                      style={{ marginTop: 16 }}
                      bordered
                      dataSource={dailyQuestions}
                      renderItem={(q, idx) => (
                        <List.Item
                          actions={[
                            <Button
                              key="ans"
                              size="small"
                              type="primary"
                              icon={<EditOutlined />}
                              onClick={() => openAnswer(q, 'daily')}
                            >
                              作答
                            </Button>,
                          ]}
                        >
                          <Space align="start">
                            <Tag color="blue">第 {idx + 1} 题</Tag>
                            {q.difficulty && (
                              <Tag color={difficultyMap[q.difficulty]?.color}>
                                {difficultyMap[q.difficulty]?.text}
                              </Tag>
                            )}
                            {q.type && <Tag>{TYPE_LABEL[q.type] || q.type}</Tag>}
                            <Text>{renderContent(q.content)}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </>
                ) : (
                  <Empty description="暂无每日推题，请选择科目或稍后再试" />
                )}
              </Card>
            ),
          },
          {
            key: 'recommend',
            label: <span><ThunderboltOutlined /> 碎片化推荐</span>,
            children: (
              <Card
                extra={
                  <Space>
                    {ability != null && (
                      <Tooltip title="该科目平均正确率估计">
                        <Tag>能力 {ability}</Tag>
                      </Tooltip>
                    )}
                    <Button icon={<ReloadOutlined />} onClick={() => fetchRecommend(false)} loading={recLoading}>换一批</Button>
                  </Space>
                }
              >
                {recLoading ? (
                  <Spin />
                ) : visibleRecs.length ? (
                  <List
                    bordered
                    dataSource={visibleRecs}
                    renderItem={(item, idx) => (
                      <List.Item
                        actions={[
                          <Button
                            key="ans"
                            size="small"
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => openAnswer(item, 'recommend')}
                          >
                            作答
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Space direction="vertical" size={2}>
                              {item.difficulty && (
                                <Tag color={difficultyMap[item.difficulty]?.color} style={{ margin: 0 }}>
                                  {difficultyMap[item.difficulty]?.text}
                                </Tag>
                              )}
                              {item.type && <Tag style={{ margin: 0 }}>{TYPE_LABEL[item.type] || item.type}</Tag>}
                            </Space>
                          }
                          title={
                            <Space>
                              <Text strong>#{idx + 1}</Text>
                              <span>{renderContent(item.content, 60)}</span>
                            </Space>
                          }
                          description={
                            <Tooltip title={`薄弱:${item.factors?.mastery} 难度匹配:${item.factors?.zpd} 复习:${item.factors?.spaced} 新鲜:${item.factors?.novelty}`}>
                              <Text type="secondary">综合推荐分 {item.score}</Text>
                            </Tooltip>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="选择科目后点「换一批」获取推荐题目" />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* 答题弹窗（每日推题 + 碎片化推荐共用） */}
      <Modal
        title="作答题目"
        open={!!current}
        onCancel={closeAnswer}
        width={620}
        destroyOnClose
        footer={
          result
            ? [<Button key="ok" type="primary" onClick={closeAnswer}>知道了</Button>]
            : unsupported
              ? [<Button key="close" onClick={closeAnswer}>关闭</Button>]
              : [
                  <Button key="cancel" onClick={closeAnswer}>取消</Button>,
                  <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>提交</Button>,
                ]
        }
      >
        {current && (
          <div>
            <Space style={{ marginBottom: 8 }}>
              {current.difficulty && (
                <Tag color={difficultyMap[current.difficulty]?.color}>
                  {difficultyMap[current.difficulty]?.text}
                </Tag>
              )}
              {current.type && <Tag>{TYPE_LABEL[current.type] || current.type}</Tag>}
            </Space>
            <div
              style={{ marginBottom: 16, fontSize: 16, lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: current.content || '' }}
            />

            {/* 结果已出：禁用交互，仅展示对错与解析 */}
            {result ? (
              <Alert
                type={result.correct ? 'success' : 'error'}
                showIcon
                message={result.correct ? `回答正确！积分 +${result.awarded}` : '回答错误，已加入错题集'}
                description={
                  !result.correct && (
                    <div>
                      <div>正确答案：<Text strong>{String(result.correct_answer ?? '')}</Text></div>
                      {result.explanation && (
                        <div style={{ marginTop: 4 }}>解析：{result.explanation}</div>
                      )}
                    </div>
                  )
                }
              />
            ) : unsupported ? (
              <Alert
                type="warning"
                showIcon
                message="该题型（编程/问答/匹配）暂不支持在线自动判题"
              />
            ) : (
              <>
                {/* 单选 */}
                {currentType === 'single' && (
                  <Radio.Group
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {currentOpts.map((o) => (
                        <Radio key={o.key} value={o.key} style={{ fontSize: 15, lineHeight: 1.8 }}>
                          {o.key}. {o.text}
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                )}

                {/* 多选 */}
                {currentType === 'multiple' && (
                  <Checkbox.Group
                    value={answer}
                    onChange={(v) => setAnswer(v)}
                    style={{ width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {currentOpts.map((o) => (
                        <Checkbox key={o.key} value={o.key} style={{ fontSize: 15, lineHeight: 1.8 }}>
                          {o.key}. {o.text}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                )}

                {/* 判断：key 为 A/B，匹配 correct_answer 实际存储 */}
                {currentType === 'true_false' && (
                  <Radio.Group
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  >
                    <Space>
                      {currentOpts.map((o) => (
                        <Radio key={o.key} value={o.key} style={{ fontSize: 15 }}>
                          {o.text}
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                )}

                {/* 填空 */}
                {currentType === 'blank' && (
                  <TextArea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={2}
                    placeholder="请输入答案"
                  />
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SmartPracticePage;
