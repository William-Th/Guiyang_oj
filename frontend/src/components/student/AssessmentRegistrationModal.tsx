/**
 * Assessment Registration Modal
 * 测评报名弹窗组件
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  message,
  Spin,
  Alert,
  Descriptions,
  Tag,
  Card,
  Progress,
  Space,
  Typography
} from 'antd';
import {
  EnvironmentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import {
  checkEligibility,
  registerForAssessment,
  AssessmentLocation,
  RegistrationEligibility
} from '../../services/assessmentRegistrationApi';

const { Text, Title } = Typography;

interface AssessmentRegistrationModalProps {
  visible: boolean;
  activityId: number;
  activityTitle: string;
  abilityLevel?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AssessmentRegistrationModal: React.FC<AssessmentRegistrationModalProps> = ({
  visible,
  activityId,
  activityTitle,
  abilityLevel,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<RegistrationEligibility | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | undefined>();

  useEffect(() => {
    if (visible && activityId) {
      loadEligibility();
    }
  }, [visible, activityId]);

  const loadEligibility = async () => {
    try {
      setLoading(true);
      const result = await checkEligibility(activityId);
      setEligibility(result);
      setSelectedLocation(undefined);
    } catch (error: any) {
      console.error('Check eligibility error:', error);
      message.error(error.response?.data?.message || '检查报名资格失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate location selection for L4+ assessments
      if (eligibility?.activity?.require_location && !selectedLocation) {
        message.error('请选择测评点');
        return;
      }

      setSubmitting(true);
      await registerForAssessment(activityId, selectedLocation);
      message.success('报名成功！');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Registration error:', error);
      message.error(error.response?.data?.message || '报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  const getAbilityLevelColor = (level?: string) => {
    const colors: Record<string, string> = {
      L1: 'blue',
      L2: 'cyan',
      L3: 'green',
      L4: 'lime',
      L5: 'orange',
      L6: 'red',
      L7: 'purple'
    };
    return colors[level || ''] || 'default';
  };

  const requiresLocation = eligibility?.activity?.require_location ||
    ['L4', 'L5', 'L6', 'L7'].includes(abilityLevel || '');

  const renderLocationCard = (location: AssessmentLocation) => {
    const isSelected = selectedLocation === location.id;
    const isFull = location.is_full || location.registered_count >= location.capacity;
    const capacityPercent = Math.round((location.registered_count / location.capacity) * 100);

    return (
      <Card
        key={location.id}
        hoverable={!isFull}
        style={{
          marginBottom: 12,
          border: isSelected ? '2px solid #16a34a' : '1px solid #e5e7eb',
          opacity: isFull ? 0.6 : 1,
          cursor: isFull ? 'not-allowed' : 'pointer'
        }}
        onClick={() => !isFull && setSelectedLocation(location.id)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 16 }}>{location.name}</Text>
            {isFull ? (
              <Tag color="red">已满</Tag>
            ) : isSelected ? (
              <Tag color="blue">已选择</Tag>
            ) : null}
          </div>

          {location.address && (
            <Space>
              <EnvironmentOutlined />
              <Text type="secondary">{location.address}</Text>
            </Space>
          )}

          <Space split={<span style={{ color: '#e5e7eb' }}>|</span>}>
            {location.exam_date && (
              <Space>
                <ClockCircleOutlined />
                <Text>{formatDate(location.exam_date)}</Text>
                {location.exam_time_start && location.exam_time_end && (
                  <Text>{formatTime(location.exam_time_start)} - {formatTime(location.exam_time_end)}</Text>
                )}
              </Space>
            )}
            {location.contact_name && (
              <Space>
                <UserOutlined />
                <Text>{location.contact_name}</Text>
              </Space>
            )}
            {location.contact_phone && (
              <Space>
                <PhoneOutlined />
                <Text>{location.contact_phone}</Text>
              </Space>
            )}
          </Space>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Space>
                <TeamOutlined />
                <Text>报名人数</Text>
              </Space>
              <Text>
                {location.registered_count} / {location.capacity}
              </Text>
            </div>
            <Progress
              percent={capacityPercent}
              status={isFull ? 'exception' : capacityPercent > 80 ? 'active' : 'normal'}
              showInfo={false}
              size="small"
            />
          </div>

          {location.notes && (
            <Alert
              message={location.notes}
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Space>
      </Card>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="检查报名资格中..." />
        </div>
      );
    }

    if (!eligibility) {
      return (
        <Alert
          message="无法获取报名信息"
          description="请稍后重试"
          type="error"
          showIcon
        />
      );
    }

    if (!eligibility.eligible) {
      return (
        <Alert
          message="无法报名"
          description={eligibility.reason || '您当前不符合报名条件'}
          type="warning"
          showIcon
        />
      );
    }

    return (
      <div>
        <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="测评名称">{activityTitle}</Descriptions.Item>
          <Descriptions.Item label="能力等级">
            <Tag color={getAbilityLevelColor(abilityLevel)}>{abilityLevel || '-'}</Tag>
          </Descriptions.Item>
          {eligibility.activity?.registration_start_time && (
            <Descriptions.Item label="报名时间">
              {new Date(eligibility.activity.registration_start_time).toLocaleString('zh-CN')}
              {' ~ '}
              {eligibility.activity.registration_end_time ?
                new Date(eligibility.activity.registration_end_time).toLocaleString('zh-CN') :
                '待定'}
            </Descriptions.Item>
          )}
        </Descriptions>

        {requiresLocation && eligibility.locations && eligibility.locations.length > 0 && (
          <>
            <Title level={5} style={{ marginBottom: 12 }}>
              <EnvironmentOutlined style={{ marginRight: 8 }} />
              请选择测评点
            </Title>
            <Alert
              message="L4及以上等级测评需要到指定地点现场参加，请选择您方便的测评点"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {eligibility.locations.map(renderLocationCard)}
            </div>
          </>
        )}

        {requiresLocation && (!eligibility.locations || eligibility.locations.length === 0) && (
          <Alert
            message="暂无可用测评点"
            description="该测评尚未设置测评点，请稍后再试"
            type="warning"
            showIcon
          />
        )}

        {!requiresLocation && (
          <Alert
            message="在线测评"
            description="本测评为在线测评，报名成功后可直接在线参加"
            type="info"
            showIcon
          />
        )}
      </div>
    );
  };

  const canSubmit = eligibility?.eligible &&
    (!requiresLocation || selectedLocation);

  return (
    <Modal
      title="测评报名"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          确认报名
        </Button>
      ]}
    >
      {renderContent()}
    </Modal>
  );
};

export default AssessmentRegistrationModal;
