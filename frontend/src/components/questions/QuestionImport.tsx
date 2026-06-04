import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  Table,
  Alert,
  Progress,
  Card,
  Descriptions,
  Space,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Typography
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;
const { Step } = Steps;
const { Text } = Typography;

interface ImportQuestion {
  rowIndex: number
  type: string
  content: string
  options?: string[]
  correct_answer: any
  explanation?: string
  score: number
  subject: string
  difficulty: string
  tags?: string[]
  errors?: string[]
  status: 'success' | 'error' | 'warning'
}

interface QuestionImportProps {
  visible: boolean
  onCancel: () => void
  onImportComplete: (questions: any[]) => void
}

const QuestionImport: React.FC<QuestionImportProps> = ({
  visible,
  onCancel,
  onImportComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<any[]>([]);
  const [importQuestions, setImportQuestions] = useState<ImportQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const steps = [
    {
      title: '上传文件',
      description: '选择要导入的Excel或CSV文件'
    },
    {
      title: '数据预览',
      description: '检查数据格式和内容'
    },
    {
      title: '导入完成',
      description: '查看导入结果'
    }
  ];

  // 模拟文件解析
  const parseFile = async (_file: File): Promise<ImportQuestion[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟解析的数据
        const mockData: ImportQuestion[] = [
          {
            rowIndex: 2,
            type: 'single',
            content: '下列哪个是中国的首都？',
            options: ['北京', '上海', '广州', '深圳'],
            correct_answer: '北京',
            explanation: '北京是中华人民共和国的首都。',
            score: 5,
            subject: 'chinese',
            difficulty: 'easy',
            tags: ['地理', '基础知识'],
            status: 'success'
          },
          {
            rowIndex: 3,
            type: 'multiple',
            content: '下列哪些是水果？',
            options: ['苹果', '萝卜', '香蕉', '白菜'],
            correct_answer: ['苹果', '香蕉'],
            explanation: '苹果和香蕉是水果。',
            score: 10,
            subject: 'science',
            difficulty: 'medium',
            tags: ['生物'],
            status: 'success'
          },
          {
            rowIndex: 4,
            type: 'single',
            content: '', // 空内容，会产生错误
            options: ['A', 'B', 'C'],
            correct_answer: 'A',
            score: 5,
            subject: 'math',
            difficulty: 'easy',
            errors: ['题目内容不能为空'],
            status: 'error'
          },
          {
            rowIndex: 5,
            type: 'true_false',
            content: '地球是圆的。',
            correct_answer: true,
            explanation: '地球是一个近似球体。',
            score: 5,
            subject: 'science',
            difficulty: 'easy',
            tags: ['地理'],
            status: 'success'
          },
          {
            rowIndex: 6,
            type: 'blank',
            content: '中国的首都是___。',
            correct_answer: ['北京'],
            score: 8,
            subject: 'chinese',
            difficulty: 'easy',
            tags: ['地理'],
            status: 'success'
          }
        ];
        resolve(mockData);
      }, 1500);
    });
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    fileList,
    beforeUpload: (file) => {
      const isValidType = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         file.type === 'application/vnd.ms-excel' ||
                         file.type === 'text/csv';
      
      if (!isValidType) {
        message.error('只支持 Excel 和 CSV 文件格式！');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！');
        return false;
      }

      setFileList([file]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
      setCurrentStep(0);
      setImportQuestions([]);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && fileList.length > 0) {
      setLoading(true);
      try {
        const questions = await parseFile(fileList[0]);
        setImportQuestions(questions);
        setCurrentStep(1);
      } catch (error) {
        message.error('文件解析失败，请检查文件格式');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 1) {
      // 执行导入
      setLoading(true);
      setImportProgress(0);
      
      try {
        const validQuestions = importQuestions.filter(q => q.status === 'success');
        
        // 模拟导入进度
        for (let i = 0; i <= 100; i += 10) {
          setImportProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        onImportComplete(validQuestions);
        setCurrentStep(2);
        message.success(`成功导入 ${validQuestions.length} 道题目`);
      } catch (error) {
        message.error('导入失败，请重试');
      } finally {
        setLoading(false);
        setImportProgress(0);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFileList([]);
    setImportQuestions([]);
    setImportProgress(0);
    onCancel();
  };

  const downloadTemplate = () => {
    // 创建模板下载
    const templateData = `题型,题目内容,选项A,选项B,选项C,选项D,正确答案,解析,分值,科目,难度,标签
single,下列哪个是中国的首都？,北京,上海,广州,深圳,北京,北京是中华人民共和国的首都,5,chinese,easy,"地理,基础知识"
multiple,下列哪些是水果？,苹果,萝卜,香蕉,白菜,"苹果,香蕉",苹果和香蕉是水果,10,science,medium,生物
true_false,地球是圆的。,,,,true,地球是一个近似球体,5,science,easy,地理
blank,中国的首都是___。,,,,北京,填空题示例,8,chinese,easy,地理`;
    
    const blob = new Blob([templateData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '题目导入模板.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const columns = [
    {
      title: '行号',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 60,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusMap = {
          success: { icon: <CheckCircleOutlined />, color: 'success', text: '成功' },
          error: { icon: <ExclamationCircleOutlined />, color: 'error', text: '错误' },
          warning: { icon: <ExclamationCircleOutlined />, color: 'warning', text: '警告' }
        };
        const { icon, color, text } = statusMap[status as keyof typeof statusMap];
        return <Tag icon={icon} color={color}>{text}</Tag>;
      }
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          single: '单选',
          multiple: '多选',
          blank: '填空',
          essay: '问答',
          true_false: '判断',
          code: '编程',
          matching: '匹配'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string, record: ImportQuestion) => (
        <span style={{ color: record.status === 'error' ? '#ff4d4f' : undefined }}>
          {content || '(空)'}
        </span>
      )
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 60,
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => {
        const difficultyMap = {
          easy: { text: '简单', color: 'green' },
          medium: { text: '中等', color: 'orange' },
          hard: { text: '困难', color: 'red' }
        };
        const { text, color } = difficultyMap[difficulty as keyof typeof difficultyMap] || { text: difficulty, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '错误信息',
      dataIndex: 'errors',
      key: 'errors',
      render: (errors: string[]) => errors && errors.length > 0 ? (
        <div>
          {errors.map((error, index) => (
            <div key={index} style={{ color: '#ff4d4f', fontSize: '12px' }}>
              {error}
            </div>
          ))}
        </div>
      ) : null
    }
  ];

  const successCount = importQuestions.filter(q => q.status === 'success').length;
  const errorCount = importQuestions.filter(q => q.status === 'error').length;
  const totalCount = importQuestions.length;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <Alert
              message="导入说明"
              description={
                <div>
                  <p>1. 支持 Excel (.xlsx, .xls) 和 CSV 文件格式</p>
                  <p>2. 文件大小不能超过 10MB</p>
                  <p>3. 请确保数据格式符合模板要求</p>
                  <p>4. 建议先下载模板文件，按格式填写数据</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Space style={{ marginBottom: 16 }}>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={downloadTemplate}
              >
                下载模板文件
              </Button>
              <Button 
                icon={<FileExcelOutlined />} 
                type="link"
                onClick={() => {
                  // 打开格式说明
                  message.info('格式说明：请参考下载的模板文件');
                }}
              >
                查看格式说明
              </Button>
            </Space>

            <Dragger {...uploadProps} style={{ padding: '40px' }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: '48px', color: '#16a34a' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 Excel 和 CSV 格式，文件大小不超过 10MB
              </p>
            </Dragger>
          </div>
        );

      case 1:
        return (
          <div>
            {loading && importProgress > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <Progress 
                    type="circle" 
                    percent={importProgress} 
                    format={percent => `${percent}%`}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Text>正在导入题目...</Text>
                  </div>
                </div>
              </Card>
            )}

            {!loading && totalCount > 0 && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic 
                      title="总题目数" 
                      value={totalCount} 
                      valueStyle={{ color: '#16a34a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="成功" 
                      value={successCount} 
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="错误" 
                      value={errorCount} 
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="成功率" 
                      value={totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0} 
                      suffix="%"
                      valueStyle={{ color: successCount === totalCount ? '#52c41a' : '#faad14' }}
                    />
                  </Col>
                </Row>

                {errorCount > 0 && (
                  <Alert
                    message={`发现 ${errorCount} 个错误`}
                    description="请检查并修正错误后重新上传文件，或选择忽略错误继续导入有效数据。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Table
                  columns={columns}
                  dataSource={importQuestions}
                  rowKey="rowIndex"
                  size="small"
                  scroll={{ y: 300 }}
                  pagination={false}
                />
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <CheckCircleOutlined style={{ fontSize: '72px', color: '#52c41a', marginBottom: '24px' }} />
            <h2>导入完成！</h2>
            <Descriptions column={1} style={{ marginTop: '32px' }}>
              <Descriptions.Item label="成功导入">{successCount} 道题目</Descriptions.Item>
              {errorCount > 0 && (
                <Descriptions.Item label="忽略错误">{errorCount} 条记录</Descriptions.Item>
              )}
            </Descriptions>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="批量导入题目"
      open={visible}
      onCancel={handleClose}
      width={800}
      style={{ top: 20 }}
      footer={
        <Space>
          {currentStep > 0 && currentStep < 2 && (
            <Button onClick={handlePrevious}>
              上一步
            </Button>
          )}
          {currentStep < 2 && (
            <Button 
              type="primary" 
              onClick={handleNext}
              loading={loading}
              disabled={currentStep === 0 && fileList.length === 0}
            >
              {currentStep === 0 ? '解析文件' : '开始导入'}
            </Button>
          )}
          {currentStep === 2 && (
            <Button type="primary" onClick={handleClose}>
              完成
            </Button>
          )}
          <Button onClick={handleClose}>
            {currentStep === 2 ? '关闭' : '取消'}
          </Button>
        </Space>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map(step => (
          <Step key={step.title} title={step.title} description={step.description} />
        ))}
      </Steps>

      {renderStepContent()}
    </Modal>
  );
};

export default QuestionImport;