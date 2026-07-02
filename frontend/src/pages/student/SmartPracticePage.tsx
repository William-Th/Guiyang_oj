import React, { useEffect, useState } from 'react';
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
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchRecommend = async () => {
    if (!subject) {
      message.warning('请先选择科目');
      return;
    }
    setRecLoading(true);
    try {
      const r = await recommendApi.recommend(subject, 10);
      setRecs(r.data || []);
      setAbility(r.meta?.ability);
    } catch (e: any) {
      message.error(e.response?.data?.error || '获取推荐失败');
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'daily') fetchDaily();
  }, [tab, subject]);

  // 打开答题弹窗
  const openAnswer = (q: QuestionItem) => {
    setCurrent(q);
    setAnswer('');
    setResult(null);
  };

  const closeAnswer = () => {
    setCurrent(null);
    setAnswer('');
    setResult(null);
  };

  // 提交答案
  const handleSubmit = async () => {
    if (!current) return;
    if (!answer.trim()) {
      message.warning('请输入答案');
      return;
    }
    setSubmitting(true);
    try {
      const r = await recommendApi.answerQuestion(current.question_id, answer.trim());
      setResult(r.data);
      if (r.data?.correct) {
        const streakInfo = r.data.streak ? `，连胜 ${r.data.streak.current_streak}` : '';
        message.success(`回答正确！积分 +${r.data.awarded}${streakInfo}`);
        // 碎片化推荐：答对后刷新（已答对的题不再推送）
        if (tab === 'recommend') {
          setTimeout(() => fetchRecommend(), 800);
        }
      } else {
        message.error('回答错误，已加入错题集');
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || e.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染题目内容摘要
  const renderContent = (c?: string, max = 80) => {
    if (!c) return '（无内容）';
    const plain = c.replace(/<[^>]+>/g, '');
    return plain.length > max ? plain.slice(0, max) + '...' : plain;
  };

  const dailyQuestions: QuestionItem[] = dailySet?.questions || [];

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
                      今日推荐 {dailyQuestions.length} 题（{dailySet?.stat_date}），含错题复习与新题巩固
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
                              onClick={() => openAnswer(q)}
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
                    <Button icon={<ReloadOutlined />} onClick={fetchRecommend} loading={recLoading}>换一批</Button>
                  </Space>
                }
              >
                {recLoading ? (
                  <Spin />
                ) : recs.length ? (
                  <List
                    bordered
                    dataSource={recs}
                    renderItem={(item, idx) => (
                      <List.Item
                        actions={[
                          <Button
                            key="ans"
                            size="small"
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => openAnswer(item)}
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
        footer={
          result
            ? [<Button key="ok" type="primary" onClick={closeAnswer}>知道了</Button>]
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
              style={{ marginBottom: 12, lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: current.content || '' }}
            />
            {/* 选项展示：兼容对象 / 数组两种结构 */}
            {current.options && typeof current.options === 'object' && !Array.isArray(current.options) &&
              Object.entries(current.options).map(([k, v]) => (
                <div key={k} style={{ marginLeft: 16, lineHeight: 1.8 }}>{k}. {String(v)}</div>
              ))}
            {Array.isArray(current.options) &&
              current.options.map((v, i) => (
                <div key={i} style={{ marginLeft: 16, lineHeight: 1.8 }}>
                  {String.fromCharCode(65 + i)}. {String(v)}
                </div>
              ))}

            {/* 不支持自动判题的题型提示 */}
            {current.type && UNSUPPORTED_TYPES.includes(current.type) && !result && (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                message="该题型（编程/问答/匹配）暂不支持在线自动判题"
              />
            )}

            {/* 答案输入（未提交且题型支持时显示） */}
            {!result && !(current.type && UNSUPPORTED_TYPES.includes(current.type)) && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 4 }}>请输入答案：</div>
                <TextArea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={2}
                  placeholder="选项字母（如 A）/ 多选（如 AC）/ 判断（对/错）/ 填空答案"
                />
              </div>
            )}

            {/* 结果展示 */}
            {result && (
              <div style={{ marginTop: 16 }}>
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
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SmartPracticePage;
