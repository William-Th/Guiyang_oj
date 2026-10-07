const { query } = require('../database/connection');

/**
 * 证书设计模型：管理端维护多套证书版式，生成/下载 PDF 时按默认设计渲染。
 * 颜色字段一律 #RRGGBB；background_image_url 为 /uploads/... 相对路径（可空）。
 */
class CertificateDesign {
  static async list() {
    const result = await query(
      'SELECT * FROM certificate_designs ORDER BY is_default DESC, updated_at DESC'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM certificate_designs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /** 默认设计；表意外为空时自动补种默认行（与迁移保持一致） */
  static async getDefault() {
    const result = await query(
      'SELECT * FROM certificate_designs WHERE is_default = TRUE LIMIT 1'
    );
    if (result.rows[0]) return result.rows[0];
    const seeded = await query(
      'INSERT INTO certificate_designs (name, is_default) VALUES (\'默认设计\', TRUE) RETURNING *'
    );
    return seeded.rows[0];
  }

  static async create(data, userId) {
    const {
      name, title, subtitle, org_name, seal_text,
      border_color, inner_border_color, title_color, subtitle_color, accent_color,
      background_color, background_image_url, is_default
    } = data;
    const result = await query(
      `INSERT INTO certificate_designs
        (name, title, subtitle, org_name, seal_text,
         border_color, inner_border_color, title_color, subtitle_color, accent_color,
         background_color, background_image_url, is_default, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        name, title, subtitle, org_name, seal_text,
        border_color, inner_border_color, title_color, subtitle_color, accent_color,
        background_color, background_image_url || '', Boolean(is_default), userId
      ]
    );
    if (result.rows[0].is_default) await this.clearDefaultExcept(result.rows[0].id);
    return result.rows[0];
  }

  static async update(id, data) {
    const {
      name, title, subtitle, org_name, seal_text,
      border_color, inner_border_color, title_color, subtitle_color, accent_color,
      background_color, background_image_url, is_default
    } = data;
    const result = await query(
      `UPDATE certificate_designs SET
         name = $2, title = $3, subtitle = $4, org_name = $5, seal_text = $6,
         border_color = $7, inner_border_color = $8, title_color = $9, subtitle_color = $10,
         accent_color = $11, background_color = $12, background_image_url = $13,
         is_default = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id, name, title, subtitle, org_name, seal_text,
        border_color, inner_border_color, title_color, subtitle_color, accent_color,
        background_color, background_image_url || '', Boolean(is_default)
      ]
    );
    if (result.rows[0] && result.rows[0].is_default) await this.clearDefaultExcept(id);
    return result.rows[0] || null;
  }

  static async setDefault(id) {
    const target = await this.findById(id);
    if (!target) return null;
    await this.clearDefaultExcept(id);
    const result = await query(
      'UPDATE certificate_designs SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async remove(id) {
    const target = await this.findById(id);
    if (!target) return { ok: false, reason: 'not_found' };
    if (target.is_default) return { ok: false, reason: 'is_default' };
    await query('DELETE FROM certificate_designs WHERE id = $1', [id]);
    return { ok: true };
  }

  static async clearDefaultExcept(id) {
    await query(
      'UPDATE certificate_designs SET is_default = FALSE WHERE is_default = TRUE AND id <> $1',
      [id]
    );
  }
}

module.exports = CertificateDesign;
