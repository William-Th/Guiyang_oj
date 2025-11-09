import React from 'react';
import { Card, Typography, Row, Col } from 'antd';

const { Title } = Typography;

/**
 * 积分商城页面
 * 展示可兑换商品、积分余额、兑换历史等
 */
const PointsShopPage: React.FC = () => {
  return (
    <div className="points-shop-page">
      <Title level={2}>积分商城</Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="我的积分">
            <p>积分余额展示 - 待实现</p>
            {/* TODO: 实现积分账户信息组件 */}
          </Card>
        </Col>

        <Col span={24}>
          <Card title="商品列表">
            <p>商品展示区域 - 待实现</p>
            {/* TODO: 实现商品列表组件 */}
            {/* 分类：实物商品、虚拟商品、特权商品 */}
          </Card>
        </Col>

        <Col span={24}>
          <Card title="兑换记录">
            <p>兑换历史记录 - 待实现</p>
            {/* TODO: 实现兑换记录组件 */}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PointsShopPage;
