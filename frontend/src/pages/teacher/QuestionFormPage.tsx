import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Radio,
  InputNumber,
  Spin,
  Checkbox,
  Row,
  Col,
  Alert,
  Tag,
  Divider,
  Upload,
  Image,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { questionBankApi, questionReviewApi, testCaseAPI, questionImageUploadApi, questionGovernanceApi } from '../../services/api';
import { SUBJECTS, getGradesBySubject } from '../../config/subjects';
import { CodeQuestionForm, CodeQuestionConfig, TestCase } from '../../components/questions';

const { TextArea } = Input;
const { Option } = Select;

interface Ability {
  id: string;
  name: string;
  description: string;
}

interface KnowledgePoint {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface QuestionFormPageProps {
  editQuestionId?: number;
  onSuccess?: () => void;
}

const QuestionFormPage: React.FC<QuestionFormPageProps> = ({ editQuestionId, onSuccess }) => {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questionType, setQuestionType] = useState<string>('single');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [questionCode, setQuestionCode] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Programming question specific state
  const [codeConfig, setCodeConfig] = useState<CodeQuestionConfig>({
    time_limit: 1000,
    memory_limit: 256,
    judge_mode: 'standard',
    supported_languages: ['cpp', 'c'],
    testCases: [],
  });
  const codeConfigRef = useRef<CodeQuestionConfig>(codeConfig);

  const id = editQuestionId || (routeId ? parseInt(routeId) : undefined);
  const isEditMode = !!id;

  useEffect(() => {
    loadAbilities();
    if (isEditMode) {
      loadQuestion();
    }
  }, [id]);

  // C4 配额提示（仅新建模式）
  const [quota, setQuota] = useState<{ quota: number; owned: number; remaining: number; allowed: boolean } | null>(null);
  useEffect(() => {
    if (!isEditMode) {
      questionGovernanceApi.getMyQuota()
        .then((r) => { if (r.success) setQuota(r.data); })
        .catch(() => { /* 非教师或无配额限制，忽略 */ });
    }
  }, [isEditMode]);

  useEffect(() => {
    if (selectedSubject) {
      loadKnowledgePoints(selectedSubject);
    }
  }, [selectedSubject]);

  const loadAbilities = async () => {
    try {
      const response = await questionBankApi.getAbilities();
      setAbilities(response.data.abilities || []);
    } catch (error: any) {
      console.error('Failed to load abilities:', error);
      message.error('加载能力配置失败');
    }
  };

  const loadKnowledgePoints = async (subject: string) => {
    try {
      setLoadingConfig(true);
      const subjectMap: Record<string, string> = {
        '数学': 'math',
        '物理': 'physics',
        '化学': 'chemistry',
        '生物': 'biology',
        '计算机': 'computer',
      };

      const subjectCode = subjectMap[subject];
      if (!subjectCode) {
        setKnowledgePoints([]);
        return;
      }

      const response = await questionBankApi.getKnowledgePoints(subjectCode);
      setKnowledgePoints(response.data.knowledge_points || []);
    } catch (error: any) {
      console.error('Failed to load knowledge points:', error);
      message.error('加载知识点配置失败');
      setKnowledgePoints([]);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const response = await questionBankApi.getQuestion(id!);
      const question = response.data;

      form.setFieldsValue({
        ...question,
        options: question.options || [],
        tags: question.tags || [],
        abilities: question.abilities || [],
        knowledge_points: question.knowledge_points || [],
      });
      setQuestionType(question.type);
      // 初始化图片URL
      if (question.image_url) {
        setImageUrl(question.image_url);
      }
      if (question.subject) {
        setSelectedSubject(question.subject);
      }
      if (question.question_code) {
        setQuestionCode(question.question_code);
      }

      // Load programming question config if applicable
      if (question.type === 'code') {
        const newCodeConfig: CodeQuestionConfig = {
          code_template: question.code_template || '',
          time_limit: question.time_limit || 1000,
          memory_limit: question.memory_limit || 256,
          judge_mode: question.judge_mode || 'standard',
          special_judge_code: question.special_judge_code || '',
          supported_languages: question.supported_languages || ['cpp', 'c'],
          testCases: [],
        };
        setCodeConfig(newCodeConfig);
        codeConfigRef.current = newCodeConfig;
      }
    } catch (error: any) {
      message.error('加载题目失败');
      navigate('/teacher/question-bank');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeConfigChange = (newConfig: CodeQuestionConfig) => {
    setCodeConfig(newConfig);
    codeConfigRef.current = newConfig;
  };

  const handleTestCasesSave = async (testCases: TestCase[]) => {
    if (!id) {
      message.warning('请先保存题目，然后再添加测试用例');
      return;
    }
    await testCaseAPI.bulkCreate(id, testCases, true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      // Format correct_answer based on question type
      let correctAnswer = values.correct_answer;
      if (questionType === 'multiple' || questionType === 'blank') {
        // correctAnswer is already an array, no transformation needed
      } else if (questionType === 'true_false') {
        correctAnswer = correctAnswer === 'true' || correctAnswer === true;
      }

      /* eslint-disable no-misleading-character-class */
      // 清洗题目内容：过滤不可见控制字符（保留换行和制表符）
      const sanitizeContent = (text: string): string => {
        if (!text) return text;
        const ctrlChars = String.fromCharCode(
          0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
          0x0B, 0x0C,
          0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
          0x7F, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
          0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F
        );
        const ctrlRe = new RegExp('[' + ctrlChars + ']', 'g');
        const zw = String.fromCharCode(
          0x200B, 0x200C, 0x200D, 0x200E, 0x200F,
          0x2028, 0x2029, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x202F,
          0xFEFF
        );
        const zwRe = new RegExp('[' + zw + ']', 'gu');
        return text.replace(ctrlRe, '').replace(zwRe, '');
      };
      /* eslint-enable no-misleading-character-class */

      // Build question data
      const questionData: any = {
        ...values,
        content: sanitizeContent(values.content),
        correct_answer: correctAnswer,
        target_scope: values.target_scope,
        image_url: imageUrl || null,
      };

      // Add programming question fields if applicable
      if (questionType === 'code') {
        const currentConfig = codeConfigRef.current;
        questionData.code_template = currentConfig.code_template;
        questionData.time_limit = currentConfig.time_limit;
        questionData.memory_limit = currentConfig.memory_limit;
        questionData.judge_mode = currentConfig.judge_mode;
        questionData.special_judge_code = currentConfig.special_judge_code;
        questionData.supported_languages = currentConfig.supported_languages;
      }

      let createdQuestionId: number | undefined;

      if (isEditMode) {
        await questionBankApi.updateQuestion(id!, questionData);
        // Save test cases for programming questions
        if (questionType === 'code' && codeConfigRef.current.testCases.length > 0) {
          await testCaseAPI.bulkCreate(id!, codeConfigRef.current.testCases, true);
        }
        message.success('更新成功');
      } else {
        const response = await questionBankApi.createQuestion(questionData);
        createdQuestionId = response.data?.id;

        // Save test cases for programming questions
        if (questionType === 'code' && createdQuestionId && codeConfigRef.current.testCases.length > 0) {
          await testCaseAPI.bulkCreate(createdQuestionId, codeConfigRef.current.testCases, true);
        }

        // 如果选择了校级题库，直接发布（无需审核）
        if (values.target_scope === 'practice_school' && createdQuestionId) {
          await questionReviewApi.publishToSchool(createdQuestionId);
          message.success('题目已保存并发布到校级题库');
        } else if (values.target_scope) {
          message.success('题目已保存为草稿，可在草稿箱中提交审核');
        } else {
          message.success('题目已保存为草稿');
        }
      }

      // Reset form after successful submission
      form.resetFields();
      setQuestionType('single');
      setSelectedSubject('');
      setImageUrl(null);
      // Reset code config
      setCodeConfig({
        time_limit: 1000,
        memory_limit: 256,
        judge_mode: 'standard',
        supported_languages: ['cpp', 'c'],
        testCases: [],
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/teacher/question-bank');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAnswerFields = () => {
    switch (questionType) {
      case 'single':
        return (
          <>
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <span>{String.fromCharCode(65 + index)}.</span>
                      <Form.Item
                        {...restField}
                        name={name}
                        rules={[{ required: true, message: '请输入选项内容' }]}
                        style={{ marginBottom: 0, flex: 1 }}
                      >
                        <Input placeholder="选项内容" style={{ width: 400 }} />
                      </Form.Item>
                      {fields.length > 2 && (
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      )}
                    </Space>
                  ))}
                  {fields.length < 6 && (
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加选项
                      </Button>
                    </Form.Item>
                  )}
                </>
              )}
            </Form.List>

            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.options !== currentValues.options}>
              {() => (
                <Form.Item
                  label="正确答案"
                  name="correct_answer"
                  rules={[{ required: true, message: '请选择正确答案' }]}
                >
                  <Radio.Group>
                    <Space direction="vertical">
                      {form.getFieldValue('options')?.map((_: any, index: number) => (
                        <Radio key={index} value={String.fromCharCode(65 + index)}>
                          选项 {String.fromCharCode(65 + index)}
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </Form.Item>
              )}
            </Form.Item>
          </>
        );

      case 'multiple':
        return (
          <>
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <span>{String.fromCharCode(65 + index)}.</span>
                      <Form.Item
                        {...restField}
                        name={name}
                        rules={[{ required: true, message: '请输入选项内容' }]}
                        style={{ marginBottom: 0, flex: 1 }}
                      >
                        <Input placeholder="选项内容" style={{ width: 400 }} />
                      </Form.Item>
                      {fields.length > 2 && (
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      )}
                    </Space>
                  ))}
                  {fields.length < 6 && (
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加选项
                      </Button>
                    </Form.Item>
                  )}
                </>
              )}
            </Form.List>

            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.options !== currentValues.options}>
              {() => (
                <Form.Item
                  label="正确答案"
                  name="correct_answer"
                  rules={[{ required: true, message: '请选择正确答案' }]}
                >
                  <Checkbox.Group>
                    <Space direction="vertical">
                      {form.getFieldValue('options')?.map((_: any, index: number) => (
                        <Checkbox key={index} value={String.fromCharCode(65 + index)}>
                          选项 {String.fromCharCode(65 + index)}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                </Form.Item>
              )}
            </Form.Item>
          </>
        );

      case 'blank':
        return (
          <Form.List name="correct_answer">
            {(fields, { add, remove }) => (
              <>
                <p style={{ color: '#666', marginBottom: 10 }}>
                  填空题可以有多个空，每个空可以有多个正确答案（用逗号分隔）
                </p>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <span>空 {index + 1}:</span>
                    <Form.Item
                      {...restField}
                      name={name}
                      rules={[{ required: true, message: '请输入正确答案' }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="正确答案（多个答案用逗号分隔）" style={{ width: 400 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加填空
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        );

      case 'true_false':
        return (
          <Form.Item
            label="正确答案"
            name="correct_answer"
            rules={[{ required: true, message: '请选择正确答案' }]}
          >
            <Radio.Group>
              <Radio value={true}>正确</Radio>
              <Radio value={false}>错误</Radio>
            </Radio.Group>
          </Form.Item>
        );

      case 'essay':
        return (
          <Form.Item
            label="参考答案"
            name="correct_answer"
            help="主观题的参考答案，不用于自动评分"
          >
            <TextArea rows={4} placeholder="请输入参考答案" />
          </Form.Item>
        );

      case 'code':
        return (
          <>
            <Form.Item
              label="参考答案"
              name="correct_answer"
              help="编程题的参考代码，仅供教师参考，不用于自动评分"
            >
              <TextArea
                rows={4}
                placeholder="请输入参考代码（可选）"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Divider />
            <CodeQuestionForm
              questionId={id}
              initialConfig={codeConfig}
              onChange={handleCodeConfigChange}
              onTestCasesSave={handleTestCasesSave}
            />
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <Card
        title={isEditMode ? '编辑题目' : '新建题目'}
      >
        {quota && !isEditMode && (
          <Alert
            style={{ marginBottom: 16 }}
            type={quota.allowed ? 'info' : 'warning'}
            showIcon
            message={`题目配额：已用 ${quota.owned} / ${quota.quota} 道，剩余 ${quota.remaining} 道`}
            description={!quota.allowed ? '已达题目上限，如需更多请联系上级管理员申请追加额度。' : undefined}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: 'single',
            difficulty: 'medium',
            level: 'L1',
            suggested_score: 5,
            score: 5,
            options: ['', '', '', ''], // 默认4个选项
            correct_answer: [''],
            status: 'draft'
          }}
        >
          {/* 显示题目编码（仅编辑模式） */}
          {isEditMode && questionCode && (
            <Alert
              message={
                <div>
                  <strong>题目编码：</strong>
                  <Tag color="cyan" style={{ fontFamily: 'monospace', marginLeft: 8 }}>
                    {questionCode}
                  </Tag>
                  <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                    （系统自动分配，不可更改）
                  </span>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="题型"
                name="type"
                rules={[{ required: true, message: '请选择题型' }]}
              >
                <Select onChange={(value) => {
                  setQuestionType(value);
                  // Reset correct_answer when type changes
                  if (value === 'blank') {
                    form.setFieldsValue({ correct_answer: [''] });
                  } else if (value === 'multiple') {
                    form.setFieldsValue({ correct_answer: [] });
                  } else {
                    form.setFieldsValue({ correct_answer: undefined });
                  }
                }} disabled={isEditMode}>
                  <Option value="single">单选题</Option>
                  <Option value="multiple">多选题</Option>
                  <Option value="blank">填空题</Option>
                  <Option value="true_false">判断题</Option>
                  <Option value="essay">问答题</Option>
                  <Option value="code">编程题</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="科目"
                name="subject"
                rules={[{ required: true, message: '请选择科目' }]}
              >
                <Select
                  onChange={(value) => {
                    setSelectedSubject(value);
                    // 清空年级选择，因为不同科目支持的年级不同
                    form.setFieldValue('grade', undefined);
                  }}
                >
                  {SUBJECTS.map(subject => (
                    <Option key={subject.value} value={subject.value}>
                      {subject.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="年级"
                name="grade"
                rules={[{ required: true, message: '请选择年级' }]}
              >
                <Select
                  placeholder={selectedSubject ? '请选择年级' : '请先选择科目'}
                  disabled={!selectedSubject}
                >
                  {selectedSubject && getGradesBySubject(selectedSubject).map(grade => (
                    <Option key={grade.value} value={grade.value}>
                      {grade.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="考察能力"
            name="abilities"
            help="选择该题目考察学生的能力（可多选）"
          >
            <Select
              mode="multiple"
              placeholder="请选择考察的能力"
              optionFilterProp="children"
              loading={loadingConfig}
            >
              {abilities.map((ability) => (
                <Option key={ability.id} value={ability.id}>
                  {ability.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="知识点"
            name="knowledge_points"
            help="选择该题目涉及的知识点（可多选）"
          >
            <Select
              mode="multiple"
              placeholder={selectedSubject ? '请选择知识点' : '请先选择科目'}
              optionFilterProp="children"
              disabled={!selectedSubject}
              loading={loadingConfig}
            >
              {knowledgePoints.map((kp) => (
                <Option key={kp.id} value={kp.id}>
                  <span>{kp.name}</span>
                  <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                    ({kp.category})
                  </span>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="题目内容"
            name="content"
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <TextArea rows={4} placeholder="请输入题目内容" />
          </Form.Item>

          {/* 题目图片上传 */}
          <Form.Item label="题目插图">
            {imageUrl ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Image
                  src={imageUrl}
                  alt="题目插图"
                  style={{ maxHeight: 200, maxWidth: 400, borderRadius: 4 }}
                />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => setImageUrl(null)}
                >
                  移除
                </Button>
              </div>
            ) : (
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={async ({ file, onSuccess: uploadSuccess, onError }) => {
                  try {
                    setImageUploading(true);
                    const formData = new FormData();
                    formData.append('image', file as File);
                    const response = await questionImageUploadApi(formData);
                    if (response.data?.url) {
                      setImageUrl(response.data.url);
                      message.success('图片上传成功');
                      uploadSuccess?.(response.data);
                    } else {
                      onError?.(new Error(response.data?.message || '上传失败'));
                    }
                  } catch (err: any) {
                    onError?.(err);
                    message.error(err.response?.data?.message || '图片上传失败');
                  } finally {
                    setImageUploading(false);
                  }
                }}
              >
                <Button icon={<UploadOutlined />} loading={imageUploading}>
                  上传题目插图
                </Button>
              </Upload>
            )}
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              支持 JPG、PNG、GIF、WebP 格式，最大 10MB
            </div>
          </Form.Item>

          {renderAnswerFields()}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="题目级别"
                name="level"
                rules={[{ required: true, message: '请选择题目级别' }]}
              >
                <Select placeholder="选择级别L1-L9">
                  <Option value="L1">L1 - 基础入门</Option>
                  <Option value="L2">L2 - 基础</Option>
                  <Option value="L3">L3 - 基础提高</Option>
                  <Option value="L4">L4 - 中等</Option>
                  <Option value="L5">L5 - 中等偏难</Option>
                  <Option value="L6">L6 - 较难</Option>
                  <Option value="L7">L7 - 难</Option>
                  <Option value="L8">L8 - 高难度</Option>
                  <Option value="L9">L9 - 竞赛级</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="难度"
                name="difficulty"
                rules={[{ required: true, message: '请选择难度' }]}
              >
                <Select>
                  <Option value="easy">简单</Option>
                  <Option value="medium">中等</Option>
                  <Option value="hard">困难</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="建议分值"
                name="suggested_score"
                rules={[{ required: true, message: '请输入建议分值' }]}
                tooltip="此题目在考试中的建议分值"
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="题目解析" name="explanation">
            <TextArea rows={3} placeholder="请输入题目解析（选填）" />
          </Form.Item>

          <Form.Item label="标签" name="tags" help="多个标签用逗号分隔">
            <Select mode="tags" placeholder="输入标签后按回车" />
          </Form.Item>

          {/* 🔧 发布范围选择已禁用 - 所有题目创建后保存为草稿，在草稿箱中选择发布范围 */}
          {/* <Form.Item
            label="发布范围"
            name="target_scope"
            help="选择题目的发布范围。校级题库可直接发布，其他范围需要审核。"
          >
            <Select placeholder="保存为草稿（不选择）或选择发布范围" allowClear>
              <Option value="practice_school">
                <Tag color="green">校级题库</Tag>
                <span style={{ color: '#666', marginLeft: 8 }}>- 直接发布到本校题库，无需审核</span>
              </Option>
              <Option value="practice_district">
                <Tag color="cyan">区级练习题库</Tag>
                <span style={{ color: '#666', marginLeft: 8 }}>- 需要区级审核人审核</span>
              </Option>
              <Option value="practice_municipal">
                <Tag color="blue">市级练习题库</Tag>
                <span style={{ color: '#666', marginLeft: 8 }}>- 需要市级审核人审核</span>
              </Option>
              <Option value="assessment">
                <Tag color="orange">测评题库</Tag>
                <span style={{ color: '#666', marginLeft: 8 }}>- 需要测评审核人审核（更高标准）</span>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.target_scope !== currentValues.target_scope}>
            {() => {
              const targetScope = form.getFieldValue('target_scope');
              if (targetScope && targetScope !== 'practice_school') {
                return (
                  <Alert
                    message="提醒"
                    description={
                      <span>
                        选择 <Tag color="blue">{targetScope === 'assessment' ? '测评题库' : targetScope === 'practice_municipal' ? '市级练习题库' : '区级练习题库'}</Tag> 需要经过审核。
                        保存后可在&ldquo;草稿箱&rdquo;中提交审核。
                      </span>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                );
              }
              if (targetScope === 'practice_school') {
                return (
                  <Alert
                    message="校级题库"
                    description="校级题库无需审核，保存后可直接发布到本校题库供学生使用。"
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                );
              }
              return null;
            }}
          </Form.Item> */}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isEditMode ? '更新' : '保存'}
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default QuestionFormPage;
