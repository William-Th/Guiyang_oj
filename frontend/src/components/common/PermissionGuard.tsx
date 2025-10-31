import React from 'react';
import { Result, Button } from 'antd';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store';

type UserRole = 'student' | 'teacher' | 'admin' | 'school_admin' | 'district_admin' | 'municipal_school_admin' | 'base_school_admin' | 'municipal_admin' | 'system_admin';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredRole,
  requiredRoles,
  fallback
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  // Check if user has required permission
  const hasPermission = () => {
    if (!user) return false;

    if (requiredRole) {
      return user.role === requiredRole;
    }

    if (requiredRoles) {
      return requiredRoles.includes(user.role);
    }

    return true;
  };

  if (!hasPermission()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Result
        status="403"
        title="权限不足"
        subTitle="抱歉，您没有权限访问此功能。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;