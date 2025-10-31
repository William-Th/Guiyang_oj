import React, { useState } from 'react';
import { Tabs } from 'antd';
import {
  HomeOutlined,
  TrophyOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import StudentHomePage from './StudentHomePage';
import ResultsPage from './ResultsPage';
import GrowthCenterPage from './student/GrowthCenterPage';

const { TabPane } = Tabs;

const StudentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <TabPane
        tab={
          <span>
            <HomeOutlined />
            首页
          </span>
        }
        key="home"
      >
        <StudentHomePage />
      </TabPane>
      <TabPane
        tab={
          <span>
            <RiseOutlined />
            个人成长中心
          </span>
        }
        key="growth"
      >
        <GrowthCenterPage />
      </TabPane>
      <TabPane
        tab={
          <span>
            <TrophyOutlined />
            成绩查询
          </span>
        }
        key="results"
      >
        <ResultsPage />
      </TabPane>
    </Tabs>
  );
};

export default StudentDashboard;
