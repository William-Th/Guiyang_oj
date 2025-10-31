import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store';
import StudentDashboard from './StudentDashboard';
import AdminTeacherDashboard from './AdminTeacherDashboard';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // 检查是否为管理员角色（不包括普通教师）
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin',
      'base_school_admin', 'municipal_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  // 检查是否为教师角色
  const isTeacher = () => {
    return user && user.role === 'teacher';
  };

  // 如果是管理员，重定向到管理员首页
  useEffect(() => {
    if (isAdmin()) {
      navigate('/admin/home', { replace: true });
    }
  }, [user, navigate]);

  // 如果是普通教师，显示教师工作台
  if (isTeacher()) {
    return <AdminTeacherDashboard />;
  }

  // 如果是学生，显示学生Dashboard
  return <StudentDashboard />;
};

export default HomePage;
