import React, { useState, useEffect, useRef } from 'react';
import { Alert, Space, Typography } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface CountdownTimerProps {
  deadline: string; // ISO 8601 datetime string
  onTimeExpired?: () => void;
  showWarning?: boolean; // Show warning when time is running out
  warningThreshold?: number; // Minutes before deadline to show warning (default: 5)
}

/**
 * Countdown Timer Component
 * Displays remaining time and auto-triggers callback when time expires
 *
 * Features:
 * - Real-time countdown display
 * - Color-coded status (green → yellow → red)
 * - Warning alerts when time is running out
 * - Auto-submit callback when expired
 * - Proper cleanup on unmount
 */
const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadline,
  onTimeExpired,
  showWarning = true,
  warningThreshold = 5,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const expiredCallbackRef = useRef<boolean>(false);

  // Calculate time remaining in seconds
  const calculateTimeRemaining = (): number => {
    const now = dayjs();
    const end = dayjs(deadline);
    const diffSeconds = end.diff(now, 'second');
    return Math.max(0, diffSeconds);
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get color based on time remaining
  const getStatusColor = (seconds: number): string => {
    const minutes = seconds / 60;

    if (minutes <= 1) return 'error'; // Red - 1 minute or less
    if (minutes <= warningThreshold) return 'warning'; // Yellow - within warning threshold
    return 'success'; // Green - plenty of time
  };

  // Get icon based on status
  const getStatusIcon = (seconds: number) => {
    const minutes = seconds / 60;
    if (minutes <= warningThreshold) return <WarningOutlined />;
    return <ClockCircleOutlined />;
  };

  useEffect(() => {
    // Initialize time remaining
    setTimeRemaining(calculateTimeRemaining());

    // Start countdown timer
    timerRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Check if time expired
      if (remaining === 0 && !expiredCallbackRef.current) {
        setIsExpired(true);
        expiredCallbackRef.current = true;

        // Trigger callback
        if (onTimeExpired) {
          onTimeExpired();
        }

        // Clear interval
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [deadline, onTimeExpired]);

  const minutes = Math.floor(timeRemaining / 60);
  const statusColor = getStatusColor(timeRemaining);
  const statusIcon = getStatusIcon(timeRemaining);

  if (isExpired) {
    return (
      <Alert
        message="时间已到"
        description="答题时间已结束，正在自动提交..."
        type="error"
        showIcon
        icon={<WarningOutlined />}
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* Countdown Display */}
      <Alert
        message={
          <Space>
            {statusIcon}
            <Text strong>剩余时间：</Text>
            <Text
              strong
              style={{
                fontSize: '18px',
                color: statusColor === 'error' ? '#ef4444' : statusColor === 'warning' ? '#f59e0b' : '#22c55e',
              }}
            >
              {formatTime(timeRemaining)}
            </Text>
          </Space>
        }
        type={statusColor as any}
        banner
      />

      {/* Warning when time is running out */}
      {showWarning && minutes > 0 && minutes <= warningThreshold && (
        <Alert
          message={`注意：距离结束还有 ${minutes} 分钟！`}
          description="请抓紧时间完成答题，超时将自动提交。"
          type="warning"
          showIcon
          closable
        />
      )}

      {/* Critical warning when less than 1 minute */}
      {showWarning && timeRemaining > 0 && timeRemaining <= 60 && (
        <Alert
          message="时间即将到！"
          description="不到1分钟将自动提交，请立即提交答案！"
          type="error"
          showIcon
          closable
        />
      )}
    </Space>
  );
};

export default CountdownTimer;
