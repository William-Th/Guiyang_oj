import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ExamListPage from './pages/ExamListPage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import ProfilePage from './pages/ProfilePage';
import ExamDetailPage from './pages/ExamDetailPage';
import AdminDashboard from './pages/admin/Dashboard';
import CertificateVerifyPage from './pages/CertificateVerifyPage';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<CertificateVerifyPage />} />
          <Route path="/verify/:certNumber" element={<CertificateVerifyPage />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="exams" element={<ExamListPage />} />
            <Route path="exam/:id" element={<ExamPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="exam-detail/:examId" element={<ExamDetailPage />} />
            <Route path="admin/*" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;