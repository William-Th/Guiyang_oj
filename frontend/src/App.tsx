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
import ApprovalCenter from './pages/admin/ApprovalCenter';
import GradingListPage from './pages/teacher/GradingListPage';
import GradingDetailPage from './pages/teacher/GradingDetailPage';
import ReviewWorkbench from './pages/teacher/ReviewWorkbench';
import AchievementManagementPage from './pages/admin/AchievementManagementPage';
import AchievementPage from './pages/student/AchievementPage';
import PointsPage from './pages/student/PointsPage';
import MyStatistics from './pages/student/MyStatistics';
import MyRegistrationsPage from './pages/student/MyRegistrationsPage';
import GrowthCenterPage from './pages/student/GrowthCenterPage';
import ActivityResultPage from './pages/student/ActivityResultPage';
import DataAnalytics from './pages/teacher/DataAnalytics';
import TeachingClassList from './pages/teacher/TeachingClassList';
import TeachingClassDetail from './pages/teacher/TeachingClassDetail';
import TeachingClassForm from './pages/teacher/TeachingClassForm';
import TeachingClassStudents from './pages/teacher/TeachingClassStudents';
import NotificationCenterPage from './pages/common/NotificationCenterPage';
import CodeJudgeTestPage from './pages/CodeJudgeTestPage';

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
            <Route path="notifications" element={<NotificationCenterPage />} />
            <Route path="code-judge-test" element={<CodeJudgeTestPage />} />

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
              <Route path="approval-center" element={<ApprovalCenter />} />
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
              {/* 活动结果页面 */}
              <Route path="results/:id" element={<ActivityResultPage />} />
              <Route path="achievements" element={<AchievementPage />} />
              <Route path="points" element={<PointsPage />} />
              <Route path="statistics" element={<MyStatistics />} />
              <Route path="registrations" element={<MyRegistrationsPage />} />
              <Route path="growth" element={<GrowthCenterPage />} />
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
              <Route path="data-analytics" element={<DataAnalytics />} />
              {/* 教学班管理路由 */}
              <Route path="teaching-classes">
                <Route index element={<TeachingClassList />} />
                <Route path="create" element={<TeachingClassForm />} />
                <Route path=":id" element={<TeachingClassDetail />} />
                <Route path=":id/edit" element={<TeachingClassForm />} />
                <Route path=":id/students" element={<TeachingClassStudents />} />
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