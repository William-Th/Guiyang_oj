import React from 'react';
import { Card, Alert, Empty } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

/**
 * 成绩查询页面
 * 状态：待开发
 *
 * 计划功能：
 * - 考试成绩列表
 * - 成绩详情查看
 * - 成绩统计分析
 * - 证书下载功能
 */
const ResultsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Alert
          message="功能开发中"
          description={
            <div>
              <p>成绩查询功能正在开发中，即将上线以下功能：</p>
              <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                <li>📊 考试成绩列表展示</li>
                <li>📝 成绩详细信息查看</li>
                <li>📈 学习进度统计分析</li>
                <li>🏆 优秀成绩证书下载</li>
                <li>📉 个人成绩趋势分析</li>
              </ul>
              <p style={{ marginTop: '12px', color: '#666' }}>
                敬请期待！
              </p>
            </div>
          }
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: '24px' }}
        />

        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#999' }}>
              成绩查询功能即将开放
            </span>
          }
        />
      </Card>
    </div>
  );
};

export default ResultsPage;
