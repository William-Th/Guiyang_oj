import React, { useState } from 'react';
import { Tabs } from 'antd';
import {
  BookOutlined,
  InboxOutlined,
  FileAddOutlined,
  SendOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import QuestionBankPage from './QuestionBankPage';
import DraftsPage from './DraftsPage';
import QuestionFormPage from './QuestionFormPage';
import MySubmissionsPage from './MySubmissionsPage';
import ReviewPage from './ReviewPage';

const QuestionBankMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState('bank');
  const [editQuestionId, setEditQuestionId] = useState<number | undefined>(undefined);

  const handleEdit = (questionId: number) => {
    setEditQuestionId(questionId);
    setActiveTab('create');
  };

  const handleSuccess = () => {
    // Reset edit mode and switch to drafts tab
    setEditQuestionId(undefined);
    setActiveTab('drafts');
  };

  const handleTabChange = (key: string) => {
    // Clear edit mode when switching tabs manually
    if (key !== 'create') {
      setEditQuestionId(undefined);
    }
    setActiveTab(key);
  };

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        size="large"
        items={[
          {
            key: 'bank',
            label: (
              <span>
                <BookOutlined />
                题库浏览
              </span>
            ),
            children: <QuestionBankPage />,
          },
          {
            key: 'drafts',
            label: (
              <span>
                <InboxOutlined />
                我的草稿
              </span>
            ),
            children: <DraftsPage onEdit={handleEdit} isActive={activeTab === 'drafts'} />,
          },
          {
            key: 'create',
            label: (
              <span>
                <FileAddOutlined />
                新建题目
              </span>
            ),
            children: <QuestionFormPage editQuestionId={editQuestionId} onSuccess={handleSuccess} />,
          },
          {
            key: 'submissions',
            label: (
              <span>
                <SendOutlined />
                我的提交
              </span>
            ),
            children: <MySubmissionsPage onBackToDrafts={() => handleTabChange('drafts')} />,
          },
          {
            key: 'review',
            label: (
              <span>
                <AuditOutlined />
                待我审核
              </span>
            ),
            children: <ReviewPage />,
          },
        ]}
      />
    </div>
  );
};

export default QuestionBankMain;
