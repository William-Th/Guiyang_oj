/**
 * NotificationCenterPage
 * 通知中心页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  List,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Modal,
  message,
  Checkbox,
  Popconfirm,
  Badge,
  Select
} from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  ReloadOutlined,
  NotificationOutlined,
  SoundOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import {
  getNotifications,
  getAnnouncements,
  getUnreadCount,
  markNotificationAsRead,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  markAnnouncementAsRead,
  deleteNotification,
  deleteNotifications,
  deleteAllReadNotifications,
  getAnnouncementDetail,
  Notification,
  Announcement
} from '../../services/notificationApi';

const { Text, Paragraph } = Typography;

const NotificationCenterPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, announcements: 0, total: 0 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [readFilter, setReadFilter] = useState<boolean | undefined>(undefined);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [announcementModal, setAnnouncementModal] = useState<{ visible: boolean; announcement: Announcement | null }>({
    visible: false,
    announcement: null
  });

  // Handle initial state from navigation
  useEffect(() => {
    const state = location.state as { tab?: string; announcementId?: number } | null;
    if (state?.tab) {
      setActiveTab(state.tab);
    }
    if (state?.announcementId) {
      loadAnnouncementDetail(state.announcementId);
    }
  }, [location]);

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

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotifications({
        type: typeFilter,
        is_read: readFilter,
        page: pagination.page,
        page_size: pagination.page_size
      });
      if (result.success) {
        setNotifications(result.data);
        setPagination(prev => ({ ...prev, total: result.pagination.total }));
      }
    } catch (error) {
      console.error('Load notifications error:', error);
      message.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, readFilter, pagination.page, pagination.page_size]);

  // Load announcements
  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnnouncements({
        page: pagination.page,
        page_size: pagination.page_size
      });
      if (result.success) {
        setAnnouncements(result.data);
        setPagination(prev => ({ ...prev, total: result.pagination.total }));
      }
    } catch (error) {
      console.error('Load announcements error:', error);
      message.error('加载公告失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.page_size]);

  // Load announcement detail
  const loadAnnouncementDetail = async (announcementId: number) => {
    try {
      const result = await getAnnouncementDetail(announcementId);
      if (result.success) {
        setAnnouncementModal({ visible: true, announcement: result.announcement });
        // Mark as read
        if (!result.announcement.is_read) {
          await markAnnouncementAsRead(announcementId);
          loadUnreadCount();
        }
      }
    } catch (error) {
      console.error('Load announcement detail error:', error);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    loadUnreadCount();
    if (activeTab === 'notifications') {
      loadNotifications();
    } else {
      loadAnnouncements();
    }
  }, [activeTab, loadNotifications, loadAnnouncements, loadUnreadCount]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        loadUnreadCount();
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }
  };

  // Handle announcement click
  const handleAnnouncementClick = async (announcement: Announcement) => {
    setAnnouncementModal({ visible: true, announcement });
    if (!announcement.is_read) {
      try {
        await markAnnouncementAsRead(announcement.id);
        setAnnouncements(prev =>
          prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
        );
        loadUnreadCount();
      } catch (error) {
        console.error('Mark announcement as read error:', error);
      }
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(typeFilter);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      loadUnreadCount();
      message.success('已全部标记为已读');
    } catch (error) {
      console.error('Mark all as read error:', error);
      message.error('操作失败');
    }
  };

  // Handle batch mark as read
  const handleBatchMarkAsRead = async () => {
    if (selectedIds.length === 0) {
      message.warning('请选择要操作的通知');
      return;
    }
    try {
      await markNotificationsAsRead(selectedIds);
      setNotifications(prev =>
        prev.map(n => selectedIds.includes(n.id) ? { ...n, is_read: true } : n)
      );
      setSelectedIds([]);
      loadUnreadCount();
      message.success('已标记为已读');
    } catch (error) {
      console.error('Batch mark as read error:', error);
      message.error('操作失败');
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      loadUnreadCount();
      message.success('已删除');
    } catch (error) {
      console.error('Delete notification error:', error);
      message.error('删除失败');
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning('请选择要删除的通知');
      return;
    }
    try {
      await deleteNotifications(selectedIds);
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      loadUnreadCount();
      message.success('已删除');
    } catch (error) {
      console.error('Batch delete error:', error);
      message.error('删除失败');
    }
  };

  // Handle delete all read
  const handleDeleteAllRead = async () => {
    try {
      const result = await deleteAllReadNotifications();
      loadNotifications();
      message.success(`已删除 ${result.count} 条已读通知`);
    } catch (error) {
      console.error('Delete all read error:', error);
      message.error('删除失败');
    }
  };

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'activity':
        return <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 24 }} />;
      case 'achievement':
        return <TrophyOutlined style={{ color: '#faad14', fontSize: 24 }} />;
      case 'reminder':
        return <ClockCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />;
      case 'announcement':
        return <SoundOutlined style={{ color: '#52c41a', fontSize: 24 }} />;
      default:
        return <NotificationOutlined style={{ color: '#722ed1', fontSize: 24 }} />;
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
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // Render notification list
  const renderNotificationList = () => (
    <List
      loading={loading}
      dataSource={notifications}
      locale={{ emptyText: <Empty description="暂无通知" /> }}
      pagination={{
        current: pagination.page,
        pageSize: pagination.page_size,
        total: pagination.total,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: (page, pageSize) => setPagination(prev => ({ ...prev, page, page_size: pageSize || 20 }))
      }}
      renderItem={(item) => (
        <List.Item
          key={item.id}
          style={{
            background: item.is_read ? '#fff' : '#f6ffed',
            marginBottom: 8,
            borderRadius: 8,
            padding: '16px 20px'
          }}
          actions={[
            !item.is_read && (
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handleNotificationClick(item)}
              >
                标记已读
              </Button>
            ),
            <Popconfirm
              key="delete"
              title="确定删除此通知？"
              onConfirm={() => handleDeleteNotification(item.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ].filter(Boolean)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
            <Checkbox
              checked={selectedIds.includes(item.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(prev => [...prev, item.id]);
                } else {
                  setSelectedIds(prev => prev.filter(id => id !== item.id));
                }
              }}
              style={{ marginRight: 16, marginTop: 4 }}
            />
            <div style={{ marginRight: 16 }}>
              {getNotificationIcon(item.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8 }}>
                <Text strong={!item.is_read} style={{ fontSize: 16, marginRight: 8 }}>
                  {item.title}
                </Text>
                {getNotificationTypeTag(item.type)}
                {item.priority >= 4 && <Tag color="red">重要</Tag>}
              </div>
              {item.content && (
                <Paragraph style={{ marginBottom: 8, color: '#666' }}>
                  {item.content}
                </Paragraph>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatTime(item.created_at)}
              </Text>
            </div>
          </div>
        </List.Item>
      )}
    />
  );

  // Render announcement list
  const renderAnnouncementList = () => (
    <List
      loading={loading}
      dataSource={announcements}
      locale={{ emptyText: <Empty description="暂无公告" /> }}
      pagination={{
        current: pagination.page,
        pageSize: pagination.page_size,
        total: pagination.total,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: (page, pageSize) => setPagination(prev => ({ ...prev, page, page_size: pageSize || 20 }))
      }}
      renderItem={(item) => (
        <List.Item
          key={item.id}
          onClick={() => handleAnnouncementClick(item)}
          style={{
            background: item.is_read ? '#fff' : '#fff7e6',
            marginBottom: 8,
            borderRadius: 8,
            padding: '16px 20px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ marginRight: 16 }}>
              <SoundOutlined style={{ color: item.is_pinned ? '#ff4d4f' : '#52c41a', fontSize: 24 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8 }}>
                <Text strong={!item.is_read} style={{ fontSize: 16, marginRight: 8 }}>
                  {item.title}
                </Text>
                {item.is_pinned && <Tag color="red">置顶</Tag>}
                <Tag>{item.type === 'notice' ? '公告' : item.type === 'update' ? '更新' : item.type === 'maintenance' ? '维护' : '活动'}</Tag>
              </div>
              {item.summary && (
                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8, color: '#666' }}>
                  {item.summary}
                </Paragraph>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.published_at ? formatTime(item.published_at) : formatTime(item.created_at)}
              </Text>
            </div>
          </div>
        </List.Item>
      )}
    />
  );

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setSelectedIds([]);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          tabBarExtraContent={
            activeTab === 'notifications' && (
              <Space>
                <Select
                  placeholder="类型筛选"
                  allowClear
                  style={{ width: 120 }}
                  value={typeFilter}
                  onChange={setTypeFilter}
                >
                  <Select.Option value="system">系统</Select.Option>
                  <Select.Option value="activity">活动</Select.Option>
                  <Select.Option value="achievement">成就</Select.Option>
                  <Select.Option value="reminder">提醒</Select.Option>
                </Select>
                <Select
                  placeholder="状态筛选"
                  allowClear
                  style={{ width: 100 }}
                  value={readFilter === undefined ? undefined : (readFilter ? 'read' : 'unread')}
                  onChange={(value) => setReadFilter(value === undefined ? undefined : value === 'read')}
                >
                  <Select.Option value="unread">未读</Select.Option>
                  <Select.Option value="read">已读</Select.Option>
                </Select>
                <Button icon={<ReloadOutlined />} onClick={loadNotifications}>
                  刷新
                </Button>
              </Space>
            )
          }
          items={[
            {
              key: 'notifications',
              label: (
                <Badge count={unreadCount.notifications} offset={[10, 0]}>
                  <span style={{ padding: '0 8px' }}>通知</span>
                </Badge>
              ),
              children: (
                <div>
                  {selectedIds.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0f5ff', borderRadius: 4 }}>
                      <Space>
                        <Text>已选择 {selectedIds.length} 条</Text>
                        <Button size="small" icon={<CheckOutlined />} onClick={handleBatchMarkAsRead}>
                          标记已读
                        </Button>
                        <Popconfirm
                          title="确定删除选中的通知？"
                          onConfirm={handleBatchDelete}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                        <Button size="small" onClick={() => setSelectedIds([])}>
                          取消选择
                        </Button>
                      </Space>
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Button icon={<CheckOutlined />} onClick={handleMarkAllAsRead}>
                        全部标记已读
                      </Button>
                      <Popconfirm
                        title="确定删除所有已读通知？"
                        onConfirm={handleDeleteAllRead}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          清空已读
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                  {renderNotificationList()}
                </div>
              )
            },
            {
              key: 'announcements',
              label: (
                <Badge count={unreadCount.announcements} offset={[10, 0]}>
                  <span style={{ padding: '0 8px' }}>公告</span>
                </Badge>
              ),
              children: renderAnnouncementList()
            }
          ]}
        />
      </Card>

      {/* Announcement Detail Modal */}
      <Modal
        title={announcementModal.announcement?.title}
        open={announcementModal.visible}
        onCancel={() => setAnnouncementModal({ visible: false, announcement: null })}
        footer={[
          <Button key="close" onClick={() => setAnnouncementModal({ visible: false, announcement: null })}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {announcementModal.announcement && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                {announcementModal.announcement.is_pinned && <Tag color="red">置顶</Tag>}
                <Tag>{announcementModal.announcement.type === 'notice' ? '公告' : announcementModal.announcement.type === 'update' ? '更新' : announcementModal.announcement.type === 'maintenance' ? '维护' : '活动'}</Tag>
                <Text type="secondary">
                  发布时间：{announcementModal.announcement.published_at ? formatTime(announcementModal.announcement.published_at) : '-'}
                </Text>
              </Space>
            </div>
            <div
              style={{
                padding: 16,
                background: '#fafafa',
                borderRadius: 8,
                minHeight: 200
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {announcementModal.announcement.content}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationCenterPage;
