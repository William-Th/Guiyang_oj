import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 学生成就页面
 * 展示学生已获得的成就、成就墙、成就进度等
 */
const AchievementPage: React.FC = () => {
  return (
    <div className="achievement-page">
      <Title level={2}>我的成就</Title>

      <Card title="成就墙" style={{ marginBottom: 16 }}>
        <p>成就墙展示区域 - 待实现</p>
        {/* TODO: 实现成就墙组件 */}
      </Card>

      <Card title="成就进度" style={{ marginBottom: 16 }}>
        <p>成就进度展示区域 - 待实现</p>
        {/* TODO: 实现成就进度组件 */}
      </Card>

      <Card title="所有成就">
        <p>所有成就列表 - 待实现</p>
        {/* TODO: 实现成就列表组件 */}
      </Card>
    </div>
  );
};

export default AchievementPage;
