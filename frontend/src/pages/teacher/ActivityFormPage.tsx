import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  InputNumber,
  Spin,
  DatePicker,
  Switch,
  Alert,
  Divider,
} from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { activityApi } from '../../services/api';
import { RootState } from '../../store';
import type { TimeLimitType } from '../../types/activity';
import { SUBJECTS, getGradesBySubject, getAbilityLevelsBySubject } from '../../config/subjects';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ActivityFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type, id } = useParams<{ type?: 'practice' | 'assessment'; id?: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allowRetake, setAllowRetake] = useState(false);
  const [timeLimitType, setTimeLimitType] = useState<TimeLimitType>('unlimited');
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);

  // 根据选中的科目获取可用的年级和能力等级
  const availableGrades = selectedSubject ? getGradesBySubject(selectedSubject) : [];
  const availableAbilityLevels = selectedSubject ? getAbilityLevelsBySubject(selectedSubject) : [];

  // Determine activity type based on URL path if type param is not provided
  const getDefaultActivityType = (): 'practice' | 'assessment' => {
    if (type) return type;
    // If on admin assessments path, default to assessment
    if (location.pathname.includes('/admin/assessments/')) return 'assessment';
    return 'practice';
  };

  const [activityType, setActivityType] = useState<'practice' | 'assessment'>(getDefaultActivityType());

  const isEditMode = !!id;
  const isAssessment = activityType === 'assessment';
  const activityId = id ? parseInt(id) : undefined;

  // Helper function to get the correct return path based on user role and activity type
  const getReturnPath = () => {
    const isAdmin = user?.role && user.role.includes('admin');

    if (isAdmin && activityType === 'assessment') {
      return '/admin/assessments';
    }
    return '/teacher/activities';
  };

  useEffect(() => {
    if (isEditMode && activityId) {
      loadActivity();
    } else {
      // Set default values for create mode
      form.setFieldsValue({
        type: activityType,
        duration: 60,
        passScore: 60,
        allowRetake: false,
        maxAttempts: 1,
        isOfficial: isAssessment,
      });
    }
  }, [activityId, activityType]);

  const loadActivity = async () => {
    if (!activityId) return;

    try {
      setLoading(true);
      const response = await activityApi.getActivity(activityId);
      const activity = response.activity;

      // Set time limit type state
      const loadedTimeLimitType = activity.time_limit_type || 'unlimited';
      setTimeLimitType(loadedTimeLimitType);

      form.setFieldsValue({
        title: activity.title,
        description: activity.description,
        subject: activity.subject,
        grade: activity.grade,
        timeLimitType: loadedTimeLimitType,
        timeRange: activity.start_time && activity.end_time
          ? [dayjs(activity.start_time), dayjs(activity.end_time)]
          : null,
        duration: activity.duration,
        totalScore: activity.total_score,
        passScore: activity.pass_score,
        abilityLevel: activity.ability_level,
        scope: activity.scope,
        allowRetake: activity.allow_retake,
        maxAttempts: activity.max_attempts,
        isOfficial: activity.is_official,
      });

      setSelectedSubject(activity.subject);
      setAllowRetake(activity.allow_retake);
    } catch (error: any) {
      console.error('Load activity error:', error);
      message.error(error.response?.data?.message || '加载活动失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      const activityData = {
        title: values.title,
        description: values.description,
        subject: values.subject,
        grade: values.grade,
        timeLimitType: values.timeLimitType || 'unlimited',
        startTime: values.timeRange ? values.timeRange[0].toISOString() : undefined,
        endTime: values.timeRange ? values.timeRange[1].toISOString() : undefined,
        duration: values.duration,
        totalScore: values.totalScore,
        passScore: values.passScore,
        abilityLevel: values.abilityLevel,
        scope: values.scope,
        allowRetake: values.allowRetake,
        maxAttempts: values.maxAttempts || 1,
      };

      const selectedType = values.type || activityType;

      if (isEditMode && activityId) {
        // Update existing activity
        await activityApi.updateActivity(activityId, activityData);
        message.success('活动更新成功！');
      } else {
        // Create new activity - use form type value
        if (selectedType === 'assessment') {
          // Add assessment-specific fields
          const assessmentData = {
            ...activityData,
            targetAudience: values.targetAudience || { grades: [], schools: [], classes: [] },
            certificateConfig: values.certificateConfig || { enabled: false, template: null },
          };
          await activityApi.createAssessmentActivity(assessmentData);
        } else {
          await activityApi.createPracticeActivity(activityData);
        }
        message.success('活动创建成功！');
      }

      // Navigate back to appropriate list page
      navigate(getReturnPath());
    } catch (error: any) {
      console.error('Submit error:', error);
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateAssessment = () => {
    // Allow any user with "admin" in their role name to create assessments
    return user?.role && user.role.includes('admin');
  };

  if (!isAssessment || canCreateAssessment()) {
    // Allowed to access this form
  } else {
    return (
      <Card title="无权限">
        <Alert
          message="权限不足"
          description="您没有权限创建测评活动。只有区级及以上管理员可以创建测评活动。"
          type="error"
          showIcon
        />
        <Button type="primary" onClick={() => navigate(getReturnPath())} style={{ marginTop: 16 }}>
          返回活动列表
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载活动数据中..." />
      </div>
    );
  }

  return (
    <div>
      <Card
        title={isEditMode ? '编辑活动' : '创建活动'}
        extra={
          <Space>
            <Button onClick={() => navigate(getReturnPath())}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => form.submit()}>
              {isEditMode ? '保存' : '创建'}
            </Button>
          </Space>
        }
      >
        {isAssessment && (
          <Alert
            message="测评活动说明"
            description="测评活动为正式评估，可配置官方证书。只有高级管理员可以创建测评活动。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: activityType,
            timeLimitType: 'unlimited',
            duration: 60,
            passScore: 60,
            allowRetake: false,
            maxAttempts: 1,
            isOfficial: isAssessment,
          }}
        >
          <Divider orientation="left">基本信息</Divider>

          {!isEditMode && (
            <Form.Item
              label="活动类型"
              name="type"
              rules={[{ required: true, message: '请选择活动类型' }]}
            >
              <Select
                placeholder="请选择活动类型"
                onChange={(value: 'practice' | 'assessment') => setActivityType(value)}
                disabled={!canCreateAssessment() && activityType === 'assessment'}
                id="type"
                virtual={false}
              >
                <Option value="practice">练习</Option>
                {canCreateAssessment() && <Option value="assessment">测评</Option>}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            label="活动标题"
            name="title"
            rules={[
              { required: true, message: '请输入活动标题' },
              { max: 100, message: '标题不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入活动标题" />
          </Form.Item>

          <Form.Item
            label="活动描述"
            name="description"
            rules={[{ max: 500, message: '描述不能超过500个字符' }]}
          >
            <TextArea rows={4} placeholder="请输入活动描述（可选）" />
          </Form.Item>

          <Form.Item
            label="科目"
            name="subject"
            rules={[{ required: true, message: '请选择科目' }]}
          >
            <Select
              placeholder="请选择科目"
              id="subject"
              virtual={false}
              onChange={(value) => {
                setSelectedSubject(value);
                // 清空年级和能力等级（因为不同科目有不同的选项）
                form.setFieldsValue({ grade: undefined, abilityLevel: undefined });
              }}
            >
              {SUBJECTS.map(subject => (
                <Option key={subject.value} value={subject.value}>
                  {subject.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="年级"
            name="grade"
            rules={[{ required: true, message: '请选择年级' }]}
          >
            <Select
              placeholder={selectedSubject ? '请选择年级' : '请先选择科目'}
              id="grade"
              virtual={false}
              disabled={!selectedSubject}
            >
              {availableGrades.map(grade => (
                <Option key={grade.value} value={grade.value}>
                  {grade.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="能力等级"
            name="abilityLevel"
            help="L1-L7，能力等级根据所选科目显示相应描述"
          >
            <Select
              placeholder={selectedSubject ? '请选择能力等级（可选）' : '请先选择科目'}
              id="abilityLevel"
              allowClear
              virtual={false}
              disabled={!selectedSubject}
            >
              {availableAbilityLevels.map(level => (
                <Option key={level.value} value={level.value}>
                  {level.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {isAssessment && (
            <Form.Item
              label="范围"
              name="scope"
              help="测评活动的发布范围"
            >
              <Select placeholder="请选择范围" virtual={false}>
                <Option value="municipal">市级</Option>
                <Option value="district">区县级</Option>
                <Option value="base_school">基地学校</Option>
                <Option value="municipal_school">市直属学校</Option>
                <Option value="school">学校级</Option>
                <Option value="class">班级</Option>
              </Select>
            </Form.Item>
          )}

          <Divider orientation="left">时间与分数设置</Divider>

          <Form.Item
            label="时间限制类型"
            name="timeLimitType"
            rules={[{ required: true, message: '请选择时间限制类型' }]}
            help="无限制：练习模式；定时制：固定时间段；计时制：开始后计时"
          >
            <Select
              placeholder="请选择时间限制类型"
              onChange={(value: TimeLimitType) => setTimeLimitType(value)}
              virtual={false}
            >
              <Option value="unlimited">无限制（练习模式）</Option>
              <Option value="scheduled">定时制（固定时间段）</Option>
              <Option value="timed">计时制（开始后计时）</Option>
            </Select>
          </Form.Item>

          {timeLimitType === 'scheduled' && (
            <Form.Item
              label="活动时间"
              name="timeRange"
              rules={[{ required: true, message: '定时制测评必须设置活动时间' }]}
              help="活动的开始和结束时间"
            >
              <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          )}

          {(timeLimitType === 'scheduled' || timeLimitType === 'timed') && (
            <Form.Item
              label="答题时长（分钟）"
              name="duration"
              rules={[
                { required: true, message: '请输入答题时长' },
                { type: 'number', min: 1, max: 300, message: '时长应在1-300分钟之间' },
              ]}
              help={
                timeLimitType === 'scheduled'
                  ? '学生必须在活动时间内完成，且不超过此时长'
                  : '学生从开始答题时起计时，超时自动提交'
              }
            >
              <InputNumber min={1} max={300} style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Form.Item
            label="总分"
            name="totalScore"
            rules={[
              { required: true, message: '请输入总分' },
              { type: 'number', min: 1, message: '总分必须大于0' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="及格分数"
            name="passScore"
            rules={[
              { required: true, message: '请输入及格分数' },
              { type: 'number', min: 0, message: '及格分数不能为负' },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left">重做设置</Divider>

          <Form.Item
            label="允许重做"
            name="allowRetake"
            valuePropName="checked"
          >
            <Switch onChange={(checked) => setAllowRetake(checked)} />
          </Form.Item>

          {allowRetake && (
            <Form.Item
              label="最大尝试次数"
              name="maxAttempts"
              rules={[
                { required: true, message: '请输入最大尝试次数' },
                { type: 'number', min: 1, max: 10, message: '尝试次数应在1-10次之间' },
              ]}
            >
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default ActivityFormPage;
