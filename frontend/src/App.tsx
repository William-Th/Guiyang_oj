import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import CertificateVerifyPage from './pages/CertificateVerifyPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import RegisterStatusPage from './pages/RegisterStatusPage';
import AdminHome from './pages/admin/AdminHome';
import AdminOverview from './pages/admin/AdminOverview';
import QuestionBankMain from './pages/teacher/QuestionBankMain';
import QuestionFormPage from './pages/teacher/QuestionFormPage';
import UserManagement from './pages/admin/UserManagement';
import PermissionManagement from './pages/admin/PermissionManagement';
import ActivityListPage from './pages/teacher/ActivityListPage';
import ActivityFormPage from './pages/teacher/ActivityFormPage';
import ActivityDetailPage from './pages/teacher/ActivityDetailPage';
import PaperGenerationPage from './pages/teacher/PaperGenerationPage';
import PracticeCenterPage from './pages/student/PracticeCenterPage';
import AssessmentCenterPage from './pages/student/AssessmentCenterPage';
import TakeActivityPage from './pages/student/TakeActivityPage';
import AssessmentManagementPage from './pages/admin/AssessmentManagementPage';
import RegistrationApprovalPage from './pages/admin/RegistrationApprovalPage';
import GradingListPage from './pages/teacher/GradingListPage';
import GradingDetailPage from './pages/teacher/GradingDetailPage';
import ReviewWorkbench from './pages/teacher/ReviewWorkbench';
import AchievementManagementPage from './pages/admin/AchievementManagementPage';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<StudentRegisterPage />} />
          <Route path="/register-status/:phone" element={<RegisterStatusPage />} />
          <Route path="/verify" element={<CertificateVerifyPage />} />
          <Route path="/verify/:certNumber" element={<CertificateVerifyPage />} />

          {/* 学生和教师路由 */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* 管理员路由 - 导航在Header中 */}
            <Route path="admin">
              <Route index element={<Navigate to="/admin/home" replace />} />
              <Route path="home" element={<AdminHome />} />
              <Route path="overview" element={<AdminOverview />} />
              <Route path="question-bank">
                <Route index element={<QuestionBankMain />} />
                <Route path="create" element={<QuestionFormPage />} />
                <Route path="edit/:id" element={<QuestionFormPage />} />
              </Route>
              <Route path="users" element={<UserManagement />} />
              <Route path="permissions" element={<PermissionManagement />} />
              <Route path="registration-approval" element={<RegistrationApprovalPage />} />
              <Route path="achievements" element={<AchievementManagementPage />} />
            </Route>

            {/* 学生路由 */}
            <Route path="student">
              <Route path="practice" element={<PracticeCenterPage />} />
              <Route path="practice/:id" element={<TakeActivityPage />} />
              <Route path="assessments" element={<AssessmentCenterPage />} />
              <Route path="assessment/:id" element={<TakeActivityPage />} />
              {/* 统一答题界面路由 - 支持练习和测评 */}
              <Route path="activity/:id" element={<TakeActivityPage />} />
            </Route>

            {/* 教师路由 - 题库管理 */}
            <Route path="teacher">
              <Route path="question-bank">
                <Route index element={<QuestionBankMain />} />
                <Route path="create" element={<QuestionFormPage />} />
                <Route path="edit/:id" element={<QuestionFormPage />} />
              </Route>
              <Route path="activities">
                <Route index element={<ActivityListPage />} />
                <Route path="create/:type?" element={<ActivityFormPage />} />
                <Route path="edit/:id" element={<ActivityFormPage />} />
                <Route path=":id" element={<ActivityDetailPage />} />
                <Route path=":id/paper" element={<PaperGenerationPage />} />
              </Route>
              <Route path="review-workbench" element={<ReviewWorkbench />} />
              <Route path="grading">
                <Route index element={<GradingListPage />} />
                <Route path=":id" element={<GradingDetailPage />} />
              </Route>
            </Route>

            {/* 管理员路由 - 测评管理 */}
            <Route path="admin/assessments">
              <Route index element={<AssessmentManagementPage />} />
              <Route path="create/:type?" element={<ActivityFormPage />} />
              <Route path="edit/:id" element={<ActivityFormPage />} />
              <Route path=":id" element={<ActivityDetailPage />} />
              <Route path=":id/paper" element={<PaperGenerationPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;