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
} from 'antd';
import { ReloadOutlined, FireOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { recommendApi } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

interface RecommendItem {
  question_id: number;
  draft_id: number;
  difficulty: string;
  content: string;
  type: string;
  score: number;
  factors: { mastery: number; zpd: number; spaced: number; novelty: number };
}

interface DailySet {
  question_ids: number[];
  stat_date: string;
  streak_count?: number;
  completed_count?: number;
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

const SmartPracticePage: React.FC = () => {
  const [tab, setTab] = useState('daily');
  const [subject, setSubject] = useState<string | undefined>();

  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySet, setDailySet] = useState<DailySet | null>(null);

  const [recLoading, setRecLoading] = useState(false);
  const [recs, setRecs] = useState<RecommendItem[]>([]);
  const [ability, setAbility] = useState<number | undefined>();

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

  return (
    <div>
      <Title level={3}>
        <ThunderboltOutlined /> 智能练习
      </Title>
      <Paragraph type="secondary">
        系统根据你的掌握度、难度匹配与错题复习情况智能推题，巩固薄弱知识点。
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
                ) : dailySet && dailySet.question_ids?.length ? (
                  <>
                    <Text type="secondary">
                      今日推荐 {dailySet.question_ids.length} 题（{dailySet.stat_date}）
                    </Text>
                    <List
                      style={{ marginTop: 16 }}
                      bordered
                      dataSource={dailySet.question_ids}
                      renderItem={(qid, idx) => (
                        <List.Item>
                          <Space>
                            <Tag color="blue">第 {idx + 1} 题</Tag>
                            <Text>题目编号 #{qid}</Text>
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
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Tag color={difficultyMap[item.difficulty]?.color}>{difficultyMap[item.difficulty]?.text}</Tag>}
                          title={
                            <Space>
                              <Text strong>#{idx + 1}</Text>
                              <span dangerouslySetInnerHTML={{ __html: item.content }} />
                            </Space>
                          }
                          description={
                            <Tooltip title={`薄弱:${item.factors.mastery} 难度匹配:${item.factors.zpd} 复习:${item.factors.spaced} 新鲜:${item.factors.novelty}`}>
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
    </div>
  );
};

export default SmartPracticePage;
