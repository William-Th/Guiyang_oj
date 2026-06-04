import React from 'react';
import { Card, Tag, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AchievementCardProps {
  achievement: {
    achievement_id: number;
    achievement_name: string;
    achievement_desc?: string;
    achievement_icon?: string;
    category: string;
    rarity: string;
    points_reward: number;
    achieved_at?: string;
  };
  unlocked?: boolean;
}

/**
 * 成就卡片组件
 * 用于展示单个成就的信息
 */
const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, unlocked = false }) => {
  const rarityColors: { [key: string]: string } = {
    common: 'default',
    rare: 'blue',
    epic: 'purple',
    legendary: 'gold',
    mythic: 'red'
  };

  const rarityNames: { [key: string]: string } = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
    mythic: '神话'
  };

  return (
    <Card
      hoverable
      style={{
        opacity: unlocked ? 1 : 0.6,
        border: unlocked ? '2px solid #16a34a' : '1px solid #d9d9d9'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <TrophyOutlined
          style={{
            fontSize: 48,
            color: unlocked ? '#16a34a' : '#d9d9d9',
            marginBottom: 12
          }}
        />
        <div>
          <Text strong style={{ fontSize: 16 }}>
            {achievement.achievement_name}
          </Text>
        </div>
        <div style={{ marginTop: 8 }}>
          <Tag color={rarityColors[achievement.rarity]}>
            {rarityNames[achievement.rarity]}
          </Tag>
        </div>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{achievement.achievement_desc}</Text>
        </div>
        <div style={{ marginTop: 12 }}>
          <Text type="warning">+{achievement.points_reward} 积分</Text>
        </div>
        {unlocked && achievement.achieved_at && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              获得时间: {new Date(achievement.achieved_at).toLocaleDateString()}
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AchievementCard;
