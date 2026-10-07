const CertificateDesign = require('../models/CertificateDesign');

/** 颜色字段白名单校验（#RRGGBB） */
const COLOR_FIELDS = [
  'border_color', 'inner_border_color', 'title_color',
  'subtitle_color', 'accent_color', 'background_color'
];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normalizePayload(body) {
  const errors = [];
  const out = {};

  const name = String(body.name ?? '').trim();
  if (!name || name.length > 100) errors.push('设计名称必填且不超过 100 字');
  out.name = name;

  for (const [field, max] of [
    ['title', 200], ['subtitle', 200], ['org_name', 200], ['seal_text', 100]
  ]) {
    const v = String(body[field] ?? '').trim();
    if (!v || v.length > max) errors.push(`${field} 必填且不超过 ${max} 字`);
    out[field] = v;
  }

  for (const field of COLOR_FIELDS) {
    const v = String(body[field] ?? '').trim();
    if (!HEX_RE.test(v)) errors.push(`${field} 必须是 #RRGGBB 颜色值`);
    out[field] = v;
  }

  const bg = String(body.background_image_url ?? '').trim();
  if (bg && !/^\/(uploads\/)[A-Za-z0-9_\-./]+$/.test(bg)) {
    errors.push('background_image_url 必须是 /uploads/... 站内路径');
  }
  out.background_image_url = bg;

  out.is_default = Boolean(body.is_default);
  return { out, errors };
}

// 设计列表（管理端）
exports.list = async (req, res) => {
  try {
    res.json({ success: true, data: await CertificateDesign.list() });
  } catch (error) {
    console.error('获取证书设计列表失败:', error);
    res.status(500).json({ success: false, message: '获取证书设计列表失败' });
  }
};

// 新建设计
exports.create = async (req, res) => {
  try {
    const { out, errors } = normalizePayload(req.body || {});
    if (errors.length) return res.status(400).json({ success: false, message: errors.join('；') });
    const design = await CertificateDesign.create(out, req.user.id);
    res.status(201).json({ success: true, data: design, message: '设计已创建' });
  } catch (error) {
    console.error('创建证书设计失败:', error);
    res.status(500).json({ success: false, message: '创建证书设计失败' });
  }
};

// 更新设计
exports.update = async (req, res) => {
  try {
    const existing = await CertificateDesign.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: '设计不存在' });
    const { out, errors } = normalizePayload(req.body || {});
    if (errors.length) return res.status(400).json({ success: false, message: errors.join('；') });
    const design = await CertificateDesign.update(existing.id, out);
    res.json({ success: true, data: design, message: '设计已更新' });
  } catch (error) {
    console.error('更新证书设计失败:', error);
    res.status(500).json({ success: false, message: '更新证书设计失败' });
  }
};

// 设为默认
exports.setDefault = async (req, res) => {
  try {
    const design = await CertificateDesign.setDefault(req.params.id);
    if (!design) return res.status(404).json({ success: false, message: '设计不存在' });
    res.json({ success: true, data: design, message: '已设为默认设计，此后生成/下载的证书均按此渲染' });
  } catch (error) {
    console.error('设置默认证书设计失败:', error);
    res.status(500).json({ success: false, message: '设置默认设计失败' });
  }
};

// 删除设计（默认设计不可删）
exports.remove = async (req, res) => {
  try {
    const result = await CertificateDesign.remove(req.params.id);
    if (!result.ok) {
      const msg = result.reason === 'is_default' ? '默认设计不可删除，请先将其他设计设为默认' : '设计不存在';
      return res.status(400).json({ success: false, message: msg });
    }
    res.json({ success: true, message: '设计已删除' });
  } catch (error) {
    console.error('删除证书设计失败:', error);
    res.status(500).json({ success: false, message: '删除证书设计失败' });
  }
};

// 预览：用示例数据按该设计渲染一份 PDF（管理端目检用）
exports.preview = async (req, res) => {
  try {
    const design = await CertificateDesign.findById(req.params.id);
    if (!design) return res.status(404).json({ success: false, message: '设计不存在' });
    const pdfService = require('../services/pdfCertificateService');
    const pdfBuffer = await pdfService.generatePDFBuffer(
      {
        studentName: '王小明',
        examName: '三年级数学期末测评',
        score: 92,
        certNumber: 'GY-2026-PREVIEW',
        issueDate: new Date()
      },
      design
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="design_preview.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('预览证书设计失败:', error);
    res.status(500).json({ success: false, message: '预览证书设计失败' });
  }
};
