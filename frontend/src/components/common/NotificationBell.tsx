/**
 * NotificationBell Component
 * 通知铃铛组件 - 显示在顶部导航栏
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  Dropdown,
  List,
  Typography,
  Button,
  Empty,
  Spin,
  Tabs,
  Tag,
  Space,
  message
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  NotificationOutlined,
  SoundOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getAnnouncements,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markAnnouncementAsRead,
  Notification,
  Announcement
} from '../../services/notificationApi';

const { Text, Paragraph } = Typography;

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, announcements: 0, total: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState('notifications');

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadCount();
      if (result.success) {
        setUnreadCount(result.count);
      }
    } catch (error) {
      console.error('Load unread count error:', error);
    }
  }, []);

  // Load notifications and announcements
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifResult, announceResult] = await Promise.all([
        getNotifications({ page: 1, page_size: 10 }),
        getAnnouncements({ page: 1, page_size: 10 })
      ]);

      if (notifResult.success) {
        setNotifications(notifResult.data);
      }
      if (announceResult.success) {
        setAnnouncements(announceResult.data);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for unread count every 60 seconds
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Load data when dropdown opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => ({
          ...prev,
          notifications: Math.max(0, prev.notifications - 1),
          total: Math.max(0, prev.total - 1)
        }));
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }

    // Navigate based on related type
    if (notification.related_type && notification.related_id) {
      setOpen(false);
      switch (notification.related_type) {
        case 'activity':
          navigate(`/student/activity/${notification.related_id}`);
          break;
        case 'achievement':
          navigate('/student/achievements');
          break;
        case 'question':
          navigate('/teacher/question-bank');
          break;
        default:
          navigate('/notifications');
      }
    }
  };

  // Handle announcement click
  const handleAnnouncementClick = async (announcement: Announcement) => {
    if (!announcement.is_read) {
      try {
        await markAnnouncementAsRead(announcement.id);
        setAnnouncements(prev =>
          prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
        );
        setUnreadCount(prev => ({
          ...prev,
          announcements: Math.max(0, prev.announcements - 1),
          total: Math.max(0, prev.total - 1)
        }));
      } catch (error) {
        console.error('Mark announcement as read error:', error);
      }
    }

    // Navigate to announcement detail or notification center
    setOpen(false);
    navigate('/notifications', { state: { tab: 'announcements', announcementId: announcement.id } });
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(prev => ({
        ...prev,
        notifications: 0,
        total: prev.announcements
      }));
      message.success('已全部标记为已读');
    } catch (error) {
      console.error('Mark all as read error:', error);
      message.error('操作失败');
    }
  };

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'activity':
        return <ClockCircleOutlined style={{ color: '#16a34a' }} />;
      case 'achievement':
        return <TrophyOutlined style={{ color: '#faad14' }} />;
      case 'reminder':
        return <ClockCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'announcement':
        return <SoundOutlined style={{ color: '#52c41a' }} />;
      default:
        return <NotificationOutlined style={{ color: '#722ed1' }} />;
    }
  };

  // Get notification type tag
  const getNotificationTypeTag = (type: string) => {
    const typeConfig: Record<string, { color: string; text: string }> = {
      system: { color: 'purple', text: '系统' },
      activity: { color: 'blue', text: '活动' },
      achievement: { color: 'gold', text: '成就' },
      reminder: { color: 'red', text: '提醒' },
      announcement: { color: 'green', text: '公告' }
    };
    const config = typeConfig[type] || { color: 'default', text: type };
    return <Tag color={config.color} style={{ marginLeft: 8 }}>{config.text}</Tag>;
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // Render notification list
  const renderNotificationList = () => (
    <List
      dataSource={notifications}
      loading={loading}
      locale={{ emptyText: <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      renderItem={(item) => (
        <List.Item
          key={item.id}
          onClick={() => handleNotificationClick(item)}
          style={{
            cursor: 'pointer',
            background: item.is_read ? 'transparent' : '#f6ffed',
            padding: '12px 16px'
          }}
        >
          <List.Item.Meta
            avatar={getNotificationIcon(item.type)}
            title={
              <Space>
                <Text strong={!item.is_read}>{item.title}</Text>
                {getNotificationTypeTag(item.type)}
              </Space>
            }
            description={
              <div>
                {item.content && (
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 4, color: '#666' }}
                  >
                    {item.content}
                  </Paragraph>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatTime(item.created_at)}
                </Text>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );

  // Render announcement list
  const renderAnnouncementList = () => (
    <List
      dataSource={announcements}
      loading={loading}
      locale={{ emptyText: <Empty description="暂无公告" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      renderItem={(item) => (
        <List.Item
          key={item.id}
          onClick={() => handleAnnouncementClick(item)}
          style={{
            cursor: 'pointer',
            background: item.is_read ? 'transparent' : '#fff7e6',
            padding: '12px 16px'
          }}
        >
          <List.Item.Meta
            avatar={<SoundOutlined style={{ color: item.is_pinned ? '#ff4d4f' : '#52c41a', fontSize: 20 }} />}
            title={
              <Space>
                <Text strong={!item.is_read}>{item.title}</Text>
                {item.is_pinned && <Tag color="red">置顶</Tag>}
              </Space>
            }
            description={
              <div>
                {item.summary && (
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 4, color: '#666' }}
                  >
                    {item.summary}
                  </Paragraph>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.published_at ? formatTime(item.published_at) : formatTime(item.created_at)}
                </Text>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );

  // Dropdown content
  const dropdownContent = (
    <div style={{ width: 380, background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 16 }}>消息中心</Text>
        <Space>
          {unreadCount.notifications > 0 && (
            <Button type="link" size="small" onClick={handleMarkAllAsRead} icon={<CheckOutlined />}>
              全部已读
            </Button>
          )}
          <Button type="link" size="small" onClick={() => { setOpen(false); navigate('/notifications'); }} icon={<SettingOutlined />}>
            查看全部
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        centered
        items={[
          {
            key: 'notifications',
            label: (
              <Badge count={unreadCount.notifications} size="small" offset={[6, 0]}>
                通知
              </Badge>
            ),
            children: (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                  </div>
                ) : (
                  renderNotificationList()
                )}
              </div>
            )
          },
          {
            key: 'announcements',
            label: (
              <Badge count={unreadCount.announcements} size="small" offset={[6, 0]}>
                公告
              </Badge>
            ),
            children: (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                  </div>
                ) : (
                  renderAnnouncementList()
                )}
              </div>
            )
          }
        ]}
        style={{ marginBottom: 0 }}
      />
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount.total} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          className={className}
          style={{ padding: '4px 8px' }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
