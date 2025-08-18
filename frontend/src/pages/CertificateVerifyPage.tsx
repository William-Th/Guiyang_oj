import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Result,
  Typography,
  Descriptions,
  Space,
  Alert,
  Spin,
  QRCode,
  Row,
  Col,
  Divider,
  Tag
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
  HomeOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import moment from 'moment';
import { certificateAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;

interface Certificate {
  cert_no: string;
  student_name: string;
  exam_name: string;
  exam_date: string;
  score: number;
  level: string;
  issue_date: string;
  school_name?: string;
}

interface VerifyResult {
  valid: boolean;
  message: string;
  certificate?: Certificate;
}

const CertificateVerifyPage: React.FC = () => {
  const { certNumber } = useParams<{ certNumber?: string }>();
  const navigate = useNavigate();
  // const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [searchCertNumber, setSearchCertNumber] = useState(certNumber || '');

  // 页面加载时自动验证URL中的证书编号
  useEffect(() => {
    if (certNumber) {
      setSearchCertNumber(certNumber);
      handleVerify(certNumber);
    }
  }, [certNumber]);

  const handleVerify = async (certNo?: string) => {
    const numberToVerify = certNo || searchCertNumber;
    if (!numberToVerify) {
      return;
    }

    setLoading(true);
    try {
      const response = await certificateAPI.verify(numberToVerify);
      setVerifyResult(response.data);
    } catch (error: any) {
      if (error.response?.status === 429) {
        setVerifyResult({
          valid: false,
          message: `请求过于频繁，请 ${error.response.data.retryAfter} 秒后再试`
        });
      } else {
        setVerifyResult({
          valid: false,
          message: error.response?.data?.message || '证书验证失败'
        });
      }
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!verifyResult?.certificate?.cert_no) return;
    
    try {
      const response = await certificateAPI.download(verifyResult.certificate.cert_no);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${verifyResult.certificate.cert_no}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // 显示下载成功提示
      message.success('证书下载成功！提示：打开下载的HTML文件，使用浏览器"打印"功能可保存为PDF');
    } catch (error) {
      console.error('下载证书失败:', error);
      message.error('下载证书失败，请稍后重试');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '优秀': return 'red';
      case '良好': return 'blue';
      case '及格': return 'green';
      default: return 'default';
    }
  };

  const renderSearchForm = () => (
    <Card title={
      <Space>
        <SafetyCertificateOutlined />
        证书验证
      </Space>
    }>
      <Form
        form={form}
        layout="inline"
        onFinish={() => handleVerify()}
        style={{ justifyContent: 'center' }}
      >
        <Form.Item
          name="certNumber"
          rules={[{ required: true, message: '请输入证书编号' }]}
          style={{ width: 300 }}
        >
          <Input
            placeholder="请输入证书编号（如：GY-2025-ABC12345）"
            value={searchCertNumber}
            onChange={(e) => setSearchCertNumber(e.target.value)}
            suffix={<SearchOutlined />}
          />
        </Form.Item>
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<SearchOutlined />}
          >
            验证证书
          </Button>
        </Form.Item>
      </Form>
      
      <Divider />
      
      <Alert
        message="证书验证说明"
        description={
          <div>
            <p>• 请输入完整的证书编号进行验证</p>
            <p>• 证书编号格式：GY-年份-8位字符（如：GY-2025-ABC12345）</p>
            <p>• 验证成功后可查看证书基本信息确认真伪</p>
            <p>• <strong>隐私保护：</strong>公开验证时学生姓名将部分隐藏</p>
            <p>• 如需查看完整信息，请联系颁发机构</p>
            <p>• 如有疑问，请联系贵阳市教育局</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Card>
  );

  const renderVerifyResult = () => {
    if (!verifyResult) return null;

    if (!verifyResult.valid) {
      return (
        <Card style={{ marginTop: 24 }}>
          <Result
            status="error"
            title="证书验证失败"
            subTitle={verifyResult.message}
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            extra={[
              <Button key="retry" onClick={() => handleVerify()}>
                重新验证
              </Button>
            ]}
          />
        </Card>
      );
    }

    const certificate = verifyResult.certificate!;
    const verifyUrl = `${window.location.origin}/verify/${certificate.cert_no}`;

    return (
      <Card style={{ marginTop: 24 }}>
        <Result
          status="success"
          title="证书验证成功"
          subTitle="该证书真实有效"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        />
        
        <Row gutter={24} style={{ marginTop: 24 }}>
          <Col span={16}>
            <Card title="证书信息" size="small">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="证书编号">
                  <Text strong copyable>{certificate.cert_no}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="学生姓名">
                  <Space>
                    <Text strong>{certificate.student_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (隐私保护)
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="考试名称">
                  {certificate.exam_name}
                </Descriptions.Item>
                <Descriptions.Item label="考试日期">
                  {moment(certificate.exam_date).format('YYYY年MM月DD日')}
                </Descriptions.Item>
                <Descriptions.Item label="成绩等级">
                  <Tag color={getLevelColor(certificate.level)}>{certificate.level}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="颁发日期">
                  {moment(certificate.issue_date).format('YYYY年MM月DD日')}
                </Descriptions.Item>
                <Descriptions.Item label="颁发机构">
                  <Text strong>贵阳市教育局</Text>
                </Descriptions.Item>
              </Descriptions>
              
              <Space style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                >
                  下载证书文件
                </Button>
                <Button onClick={() => window.print()}>
                  打印此页
                </Button>
              </Space>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card title="验证二维码" size="small" style={{ textAlign: 'center' }}>
              <QRCode value={verifyUrl} size={160} />
              <Paragraph style={{ marginTop: 8, fontSize: 12 }}>
                扫描二维码验证证书
              </Paragraph>
            </Card>
            
            <Alert
              message="防伪标识"
              description={
                <div style={{ textAlign: 'center' }}>
                  <div>✓ 官方数字签名</div>
                  <div>✓ 唯一证书编号</div>
                  <div>✓ 实时在线验证</div>
                </div>
              }
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ 
      background: '#f0f2f5',
      minHeight: '100vh'
    }}>
      {/* Navigation Header */}
      <Card style={{ 
        borderRadius: 0, 
        borderBottom: '1px solid #d9d9d9',
        marginBottom: 0
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          <Title level={3} style={{ margin: 0, color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <HomeOutlined style={{ marginRight: 8 }} />
            贵阳市小学生测评平台
          </Title>
          <Space>
            <Button 
              onClick={() => navigate('/')}
              type="link"
            >
              进入平台
            </Button>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/')}
              type="primary"
            >
              返回主页
            </Button>
          </Space>
        </div>
      </Card>

      <div style={{ 
        padding: '24px',
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          证书验证系统
        </Title>
      
      <Spin spinning={loading}>
        {renderSearchForm()}
        {renderVerifyResult()}
      </Spin>
      
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Text type="secondary">
            贵阳市教育局出品 | 技术支持：贵阳市小学生测评平台
          </Text>
        </Card>
      </div>
    </div>
  );
};

export default CertificateVerifyPage;