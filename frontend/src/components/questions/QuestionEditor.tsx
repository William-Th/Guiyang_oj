import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  InputNumber, 
  Card, 
  Tag,
  message,
  Divider
} from 'antd';
import { PlusOutlined, MinusOutlined, EyeOutlined } from '@ant-design/icons';
import QuestionDisplay from './QuestionDisplay';

const { Option } = Select;
const { TextArea } = Input;

interface QuestionData {
  id?: number
  type: 'single' | 'multiple' | 'blank' | 'essay' | 'code' | 'true_false' | 'matching'
  content: string
  options?: string[]
  correct_answer?: any
  explanation?: string
  score: number
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[]
  blanks_count?: number
}

interface QuestionEditorProps {
  initialData?: QuestionData
  onSave?: (data: QuestionData) => void
  onCancel?: () => void
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [questionType, setQuestionType] = useState<string>(initialData?.type || 'single');
  const [options, setOptions] = useState<string[]>(initialData?.options || ['', '']);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const questionTypes = [
    { value: 'single', label: '单选题' },
    { value: 'multiple', label: '多选题' },
    { value: 'true_false', label: '判断题' },
    { value: 'blank', label: '填空题' },
    { value: 'essay', label: '问答题' },
    { value: 'code', label: '编程题' },
    { value: 'matching', label: '匹配题' }
  ];

  const subjects = [
    { value: 'math', label: '数学' },
    { value: 'chinese', label: '语文' },
    { value: 'english', label: '英语' },
    { value: 'science', label: '科学' },
    { value: 'computer', label: '计算机' },
    { value: 'art', label: '美术' },
    { value: 'music', label: '音乐' },
    { value: 'pe', label: '体育' }
  ];

  const difficulties = [
    { value: 'easy', label: '简单', color: 'green' },
    { value: 'medium', label: '中等', color: 'orange' },
    { value: 'hard', label: '困难', color: 'red' }
  ];

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleTypeChange = (type: string) => {
    setQuestionType(type);
    
    // 根据题型设置默认选项
    if (type === 'single' || type === 'multiple') {
      setOptions(['', '', '', '']);
    } else if (type === 'true_false') {
      setOptions([]);
    } else if (type === 'matching') {
      setOptions(['', '', '', '']);
    } else {
      setOptions([]);
    }
  };

  const getPreviewData = () => {
    const formData = form.getFieldsValue();
    return {
      id: 1,
      type: questionType as any,
      content: formData.content || '',
      options: questionType === 'single' || questionType === 'multiple' || questionType === 'matching' ? options.filter(opt => opt.trim()) : undefined,
      score: formData.score || 5,
      explanation: formData.explanation,
      blanks_count: formData.blanks_count
    };
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const questionData: QuestionData = {
        ...values,
        type: questionType as any,
        options: questionType === 'single' || questionType === 'multiple' || questionType === 'matching' ? options.filter(opt => opt.trim()) : undefined,
        id: initialData?.id
      };

      // 验证必要字段
      if (!questionData.content.trim()) {
        message.error('请输入题目内容');
        return;
      }

      if ((questionType === 'single' || questionType === 'multiple') && options.filter(opt => opt.trim()).length < 2) {
        message.error('选择题至少需要2个选项');
        return;
      }

      await onSave?.(questionData);
      message.success('题目保存成功');
      
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (questionType) {
      case 'single':
      case 'multiple':
        return (
          <Form.Item label="选项设置" required>
            <Space direction="vertical" style={{ width: '100%' }}>
              {options.map((option, index) => (
                <Space key={index} style={{ width: '100%' }}>
                  <Input
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {options.length > 2 && (
                    <Button 
                      type="text" 
                      danger 
                      icon={<MinusOutlined />} 
                      onClick={() => removeOption(index)}
                    />
                  )}
                </Space>
              ))}
              <Button 
                type="dashed" 
                onClick={addOption} 
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                添加选项
              </Button>
            </Space>
          </Form.Item>
        );

      case 'blank':
        return (
          <Form.Item label="空格数量" name="blanks_count" initialValue={1}>
            <InputNumber min={1} max={10} />
          </Form.Item>
        );

      case 'matching':
        return (
          <Form.Item label="匹配项设置" required>
            <div style={{ marginBottom: '8px', color: '#4b5563' }}>
              前一半选项为左侧项，后一半为右侧项
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              {options.map((option, index) => (
                <Space key={index} style={{ width: '100%' }}>
                  <Input
                    placeholder={index < options.length / 2 ? `左侧项 ${index + 1}` : `右侧项 ${index - Math.floor(options.length / 2) + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {options.length > 4 && (
                    <Button 
                      type="text" 
                      danger 
                      icon={<MinusOutlined />} 
                      onClick={() => removeOption(index)}
                    />
                  )}
                </Space>
              ))}
              <Button 
                type="dashed" 
                onClick={addOption} 
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                添加匹配项
              </Button>
            </Space>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <Card 
        title="题目编辑器"
        extra={
          <Space>
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '隐藏预览' : '预览效果'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={initialData}
          onFinish={handleSubmit}
        >
          <Form.Item label="题目类型" required>
            <Select 
              value={questionType} 
              onChange={handleTypeChange}
              style={{ width: '200px' }}
            >
              {questionTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            label="题目内容" 
            name="content" 
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="请输入题目内容..."
              showCount
              maxLength={1000}
            />
          </Form.Item>

          {renderTypeSpecificFields()}

          <Form.Item 
            label="正确答案" 
            name="correct_answer"
            rules={[{ required: true, message: '请设置正确答案' }]}
          >
            {questionType === 'true_false' ? (
              <Select placeholder="请选择正确答案">
                <Option value={true}>正确</Option>
                <Option value={false}>错误</Option>
              </Select>
            ) : questionType === 'single' ? (
              <Select placeholder="请选择正确选项">
                {options.filter(opt => opt.trim()).map((option, index) => (
                  <Option key={index} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            ) : questionType === 'multiple' ? (
              <Select 
                mode="multiple" 
                placeholder="请选择正确选项（可多选）"
              >
                {options.filter(opt => opt.trim()).map((option, index) => (
                  <Option key={index} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            ) : (
              <TextArea 
                rows={2} 
                placeholder="请输入正确答案或答案要点..."
              />
            )}
          </Form.Item>

          <Form.Item label="题目解析" name="explanation">
            <TextArea 
              rows={3} 
              placeholder="请输入题目解析（可选）..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item 
              label="分值" 
              name="score" 
              initialValue={5}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={1} max={100} />
            </Form.Item>

            <Form.Item 
              label="科目" 
              name="subject" 
              rules={[{ required: true, message: '请选择科目' }]}
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="请选择科目" style={{ width: '120px' }}>
                {subjects.map(subject => (
                  <Option key={subject.value} value={subject.value}>
                    {subject.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item 
              label="难度" 
              name="difficulty" 
              initialValue="medium"
              style={{ marginBottom: 0 }}
            >
              <Select style={{ width: '100px' }}>
                {difficulties.map(diff => (
                  <Option key={diff.value} value={diff.value}>
                    <Tag color={diff.color}>{diff.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Form.Item label="标签" name="tags">
            <Select
              mode="tags"
              placeholder="输入标签后按回车确认"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
              >
                {initialData ? '更新题目' : '保存题目'}
              </Button>
              <Button onClick={onCancel}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {showPreview && (
        <>
          <Divider>预览效果</Divider>
          <Card title="题目预览">
            <QuestionDisplay 
              question={getPreviewData()}
              readonly={false}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default QuestionEditor;