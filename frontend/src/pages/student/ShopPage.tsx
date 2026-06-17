import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Row,
  Col,
  Button,
  Tag,
  Spin,
  Empty,
  Typography,
  message,
  Modal,
  Statistic,
} from 'antd';
import { ShoppingOutlined, CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { shopApi, pointsApi } from '../../services/api';

const { Title, Text } = Typography;

interface ShopItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  price: number;
  config: any;
}

interface MyItem {
  id: number;
  is_equipped: boolean;
  purchased_at: string;
  item_code: string;
  name: string;
  category: string;
  config: any;
}

const categoryMap: Record<string, string> = {
  skin: '皮肤',
  avatar_frame: '头像框',
  name_color: '名字颜色',
  other: '其他',
};

const ShopPage: React.FC = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [myItems, setMyItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, myRes] = await Promise.all([
        shopApi.listItems(),
        shopApi.myItems(),
      ]);
      setItems(itemsRes.data || []);
      setMyItems(myRes.data || []);
      // 余额
      try {
        const uid = JSON.parse(localStorage.getItem('user') || '{}').id;
        if (uid) {
          const acc = await pointsApi.getPointsAccount(uid);
          setBalance(acc.current_points ?? acc.data?.current_points ?? 0);
        }
      } catch (e) {
        /* ignore */
      }
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePurchase = (item: ShopItem) => {
    Modal.confirm({
      title: `购买「${item.name}」`,
      content: `消耗 ${item.price} 积分（当前余额 ${balance}）`,
      onOk: async () => {
        setPurchasing(item.id);
        try {
          await shopApi.purchase(item.id);
          message.success('购买成功');
          fetchData();
        } catch (e: any) {
          message.error(e.response?.data?.message || e.response?.data?.error || '购买失败');
        } finally {
          setPurchasing(null);
        }
      },
    });
  };

  const handleEquip = async (my: MyItem, equip: boolean) => {
    try {
      await shopApi.equip(my.id, equip);
      message.success(equip ? '已装备' : '已卸下');
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.error || '操作失败');
    }
  };

  const renderColorPreview = (config: any) => {
    if (config && config.color) {
      return <span style={{ color: config.color, fontWeight: 'bold', fontSize: 16 }}>示例昵称</span>;
    }
    return null;
  };

  return (
    <div>
      <Title level={3}>
        <ShoppingOutlined /> 积分商店
      </Title>
      <Card style={{ marginBottom: 16 }}>
        <Statistic title="我的积分" value={balance} prefix={<CrownOutlined />} valueStyle={{ color: '#faad14' }} />
      </Card>

      <Tabs
        items={[
          {
            key: 'shop',
            label: '商品橱窗',
            children: loading ? (
              <Spin />
            ) : items.length ? (
              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col xs={24} sm={12} md={8} key={item.id}>
                    <Card
                      title={item.name}
                      extra={<Tag>{categoryMap[item.category] || item.category}</Tag>}
                      actions={[
                        <Button
                          key="buy"
                          type="primary"
                          loading={purchasing === item.id}
                          onClick={() => handlePurchase(item)}
                        >
                          {item.price} 积分购买
                        </Button>,
                      ]}
                    >
                      <div style={{ minHeight: 60, textAlign: 'center', padding: 12 }}>
                        {renderColorPreview(item.config) || <Text type="secondary">{item.item_code}</Text>}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="暂无商品" />
            ),
          },
          {
            key: 'mine',
            label: '我的物品',
            children: loading ? (
              <Spin />
            ) : myItems.length ? (
              <Row gutter={[16, 16]}>
                {myItems.map((my) => (
                  <Col xs={24} sm={12} md={8} key={my.id}>
                    <Card
                      title={my.name}
                      extra={
                        my.is_equipped ? (
                          <Tag icon={<CheckCircleOutlined />} color="success">已装备</Tag>
                        ) : null
                      }
                      actions={[
                        my.is_equipped ? (
                          <Button key="unequip" onClick={() => handleEquip(my, false)}>卸下</Button>
                        ) : (
                          <Button key="equip" type="primary" onClick={() => handleEquip(my, true)}>装备</Button>
                        ),
                      ]}
                    >
                      <div style={{ minHeight: 60, textAlign: 'center', padding: 12 }}>
                        {renderColorPreview(my.config) || <Text type="secondary">{my.item_code}</Text>}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="还没有物品，去橱窗看看吧" />
            ),
          },
        ]}
      />
    </div>
  );
};

export default ShopPage;
