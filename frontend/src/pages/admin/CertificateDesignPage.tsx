import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, Switch, Alert, Typography, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, StarOutlined, StarFilled,
} from '@ant-design/icons';
import { message } from '../../lib/feedback';
import api from '@/services/api';

const { Title, Text } = Typography;

/** 与后端 certificate_designs 表对齐；颜色一律 #RRGGBB */
interface CertificateDesign {
  id: number;
  name: string;
  title: string;
  subtitle: string;
  org_name: string;
  seal_text: string;
  border_color: string;
  inner_border_color: string;
  title_color: string;
  subtitle_color: string;
  accent_color: string;
  background_color: string;
  background_image_url: string;
  is_default: boolean;
  updated_at?: string;
}

const COLOR_FIELDS: { key: keyof CertificateDesign; label: string }[] = [
  { key: 'border_color', label: '外边框' },
  { key: 'inner_border_color', label: '内边框' },
  { key: 'title_color', label: '标题文字' },
  { key: 'subtitle_color', label: '副标题/分隔线' },
  { key: 'accent_color', label: '强调色（姓名/分数框）' },
  { key: 'background_color', label: '背景色' },
];

const EMPTY_FORM = {
  name: '',
  title: '贵阳市小学生能力测评',
  subtitle: '— 认证证书 —',
  org_name: '贵阳市教育局',
  seal_text: '贵阳教育',
  border_color: '#B8860B',
  inner_border_color: '#DAA520',
  title_color: '#1890FF',
  subtitle_color: '#DAA520',
  accent_color: '#1890FF',
  background_color: '#FFFFFF',
  background_image_url: '',
  is_default: false,
};

const CertificateDesignPage: React.FC = () => {
  const [designs, setDesigns] = useState<CertificateDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CertificateDesign | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/certificates/designs');
      setDesigns(res.data?.data ?? []);
    } catch (err: unknown) {
      message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || '加载证书设计失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = (design: CertificateDesign | null) => {
    setEditing(design);
    form.setFieldsValue(design ? { ...EMPTY_FORM, ...design } : EMPTY_FORM);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/certificates/designs/${editing.id}`, values);
        message.success('设计已更新');
      } else {
        await api.post('/certificates/designs', values);
        message.success('设计已创建');
      }
      setEditorOpen(false);
      load();
    } catch (err: unknown) {
      message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (design: CertificateDesign) => {
    try {
      await api.put(`/certificates/designs/${design.id}/default`);
      message.success('已设为默认设计，此后生成/下载的证书均按此渲染');
      load();
    } catch (err: unknown) {
      message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || '设置失败');
    }
  };

  const handleDelete = async (design: CertificateDesign) => {
    try {
      await api.delete(`/certificates/designs/${design.id}`);
      message.success('设计已删除');
      load();
    } catch (err: unknown) {
      message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || '删除失败');
    }
  };

  /** 预览：带鉴权取回 PDF blob 后新窗口打开（window.open 无法带 Authorization 头） */
  const handlePreview = async (design: CertificateDesign) => {
    try {
      const res = await api.get(`/certificates/designs/${design.id}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      message.error('预览生成失败');
    }
  };

  const columns = [
    {
      title: '设计名称',
      dataIndex: 'name',
      render: (name: string, record: CertificateDesign) => (
        <Space>
          <Text strong>{name}</Text>
          {record.is_default && (
            <Tag icon={<StarFilled />} color="gold">
              默认
            </Tag>
          )}
        </Space>
      ),
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '副标题', dataIndex: 'subtitle', width: 180, ellipsis: true },
    {
      title: '配色',
      key: 'colors',
      width: 150,
      render: (_: unknown, record: CertificateDesign) => (
        <Space size={4}>
          {[record.border_color, record.title_color, record.accent_color, record.background_color].map((c) => (
            <span
              key={c}
              title={c}
              style={{
                display: 'inline-block', width: 18, height: 18, borderRadius: 4,
                background: c, border: '1px solid #d9d9d9',
              }}
            />
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 310,
      render: (_: unknown, record: CertificateDesign) => (
        <Space size={0} wrap>
          <Tooltip title="预览（示例数据 PDF）">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>
              预览
            </Button>
          </Tooltip>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditor(record)}>
            编辑
          </Button>
          {!record.is_default && (
            <Button type="link" size="small" icon={<StarOutlined />} onClick={() => handleSetDefault(record)}>
              设默认
            </Button>
          )}
          {!record.is_default && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>
              证书设计
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>
              新建设计
            </Button>
          </Space>

          <Alert
            type="info"
            showIcon
            message="默认设计决定此后所有生成与下载的证书版式；编辑后可先「预览」用示例数据目检，再设为默认。已生成的历史证书文件不会回溯重绘。"
          />

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={designs}
            pagination={false}
          />
        </Space>
      </Card>

      <Modal
        title={editing ? `编辑设计：${editing.name}` : '新建设计'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item name="name" label="设计名称" rules={[{ required: true, message: '请输入设计名称' }]}>
            <Input placeholder="如：默认设计 / 荣誉金边版" maxLength={100} />
          </Form.Item>
          <Form.Item name="title" label="证书标题" rules={[{ required: true, message: '请输入证书标题' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="subtitle" label="副标题" rules={[{ required: true, message: '请输入副标题' }]}>
            <Input maxLength={200} placeholder="如：— 认证证书 —" />
          </Form.Item>
          <Form.Item name="org_name" label="颁发机构" rules={[{ required: true, message: '请输入颁发机构' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="seal_text" label="印章文字" rules={[{ required: true, message: '请输入印章文字' }]}>
            <Input maxLength={100} />
          </Form.Item>

          <Form.Item label="配色（点击色块修改）" required>
            <Space wrap>
              {COLOR_FIELDS.map(({ key, label }) => (
                <Form.Item key={key} name={key} noStyle>
                  <Input type="color" title={label} style={{ width: 52, height: 32 }} />
                </Form.Item>
              ))}
            </Space>
          </Form.Item>

          <Form.Item
            name="background_image_url"
            label="背景图（可选）"
            extra="填写站内 /uploads/... 图片路径（横向，建议 1123×794 以上）；留空则使用背景色。素材上传功能随后续版本提供。"
          >
            <Input placeholder="/uploads/certificates/bg.png" maxLength={500} />
          </Form.Item>

          <Form.Item name="is_default" label="设为默认设计" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CertificateDesignPage;
