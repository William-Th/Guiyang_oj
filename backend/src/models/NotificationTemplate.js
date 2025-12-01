/**
 * NotificationTemplate Model
 * 通知模板模型
 */

const { query } = require('../database/connection');

class NotificationTemplate {
  /**
   * 根据模板代码获取模板
   * @param {string} code - 模板代码
   * @returns {Object} 模板对象
   */
  static async findByCode(code) {
    const result = await query(
      'SELECT * FROM notification_templates WHERE code = $1 AND is_active = TRUE',
      [code]
    );
    return result.rows[0];
  }

  /**
   * 获取所有模板
   * @param {boolean} activeOnly - 是否只获取启用的模板
   * @returns {Array} 模板列表
   */
  static async findAll(activeOnly = true) {
    let sql = 'SELECT * FROM notification_templates';
    if (activeOnly) {
      sql += ' WHERE is_active = TRUE';
    }
    sql += ' ORDER BY type, code';

    const result = await query(sql);
    return result.rows;
  }

  /**
   * 渲染模板
   * @param {string} template - 模板字符串
   * @param {Object} variables - 变量对象
   * @returns {string} 渲染后的字符串
   */
  static renderTemplate(template, variables = {}) {
    if (!template) return '';

    // 简单的模板渲染：替换 {{variable}} 格式的占位符
    let rendered = template;

    // 处理条件块 {{#condition}}...{{/condition}}
    rendered = rendered.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      return variables[key] ? content : '';
    });

    // 替换变量 {{variable}}
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : '';
    });

    return rendered.trim();
  }

  /**
   * 根据模板代码渲染通知内容
   * @param {string} code - 模板代码
   * @param {Object} variables - 变量对象
   * @returns {Object|null} 渲染后的通知对象 { title, content, type, priority }
   */
  static async renderByCode(code, variables = {}) {
    const template = await this.findByCode(code);
    if (!template) {
      return null;
    }

    return {
      title: this.renderTemplate(template.title_template, variables),
      content: this.renderTemplate(template.content_template, variables),
      type: template.type,
      priority: template.default_priority
    };
  }

  /**
   * 创建或更新模板
   * @param {Object} data - 模板数据
   * @returns {Object} 创建/更新的模板
   */
  static async upsert(data) {
    const {
      code,
      name,
      title_template,
      content_template,
      type = 'system',
      default_priority = 3,
      is_active = true
    } = data;

    const result = await query(
      `INSERT INTO notification_templates
       (code, name, title_template, content_template, type, default_priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         title_template = EXCLUDED.title_template,
         content_template = EXCLUDED.content_template,
         type = EXCLUDED.type,
         default_priority = EXCLUDED.default_priority,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [code, name, title_template, content_template, type, default_priority, is_active]
    );

    return result.rows[0];
  }

  /**
   * 删除模板
   * @param {string} code - 模板代码
   * @returns {boolean} 是否删除成功
   */
  static async delete(code) {
    const result = await query(
      'DELETE FROM notification_templates WHERE code = $1 RETURNING code',
      [code]
    );
    return result.rows.length > 0;
  }
}

module.exports = NotificationTemplate;
