import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { UserRole } from '@/types/user';
import { getDefaultPathForRole, hasRole } from '@/auth/roles';

interface RoleRouteProps {
  roles: readonly UserRole[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ roles }) => {
  const location = useLocation();
  const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole(user.role, roles)) {
    return <Navigate to={getDefaultPathForRole(user.role)} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
