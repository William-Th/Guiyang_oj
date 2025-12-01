/**
 * AssessmentLocation Model
 * 测评点管理模型 - 用于L4+线下现场测评的考点管理
 */

const { query, getClient } = require('../database/connection');

class AssessmentLocation {
  /**
   * 创建测评点
   * @param {Object} locationData - 测评点数据
   * @returns {Object} 创建的测评点
   */
  static async create(locationData) {
    const {
      activity_id,
      name,
      address,
      district_id,
      capacity = 50,
      contact_name,
      contact_phone,
      exam_date,
      exam_time_start,
      exam_time_end,
      check_in_time,
      notes,
      created_by
    } = locationData;

    const result = await query(`
      INSERT INTO assessment_locations (
        activity_id, name, address, district_id, capacity,
        contact_name, contact_phone, exam_date, exam_time_start,
        exam_time_end, check_in_time, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      activity_id, name, address, district_id, capacity,
      contact_name, contact_phone, exam_date, exam_time_start,
      exam_time_end, check_in_time, notes, created_by
    ]);

    return result.rows[0];
  }

  /**
   * 根据ID查找测评点
   * @param {number} id - 测评点ID
   * @returns {Object|null} 测评点信息
   */
  static async findById(id) {
    const result = await query(`
      SELECT al.*,
             d.name as district_name,
             a.title as activity_title,
             a.ability_level,
             a.type as activity_type,
             u.real_name as created_by_name
      FROM assessment_locations al
      LEFT JOIN districts d ON al.district_id = d.id
      LEFT JOIN activities a ON al.activity_id = a.id
      LEFT JOIN users u ON al.created_by = u.id
      WHERE al.id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * 根据活动ID获取所有测评点
   * @param {number} activityId - 活动ID
   * @param {Object} options - 查询选项
   * @returns {Array} 测评点列表
   */
  static async findByActivityId(activityId, options = {}) {
    const { activeOnly = false, availableOnly = false, districtId } = options;

    let sql = `
      SELECT al.*,
             d.name as district_name,
             al.capacity - al.registered_count as remaining_capacity,
             CASE WHEN al.registered_count >= al.capacity THEN true ELSE false END as is_full
      FROM assessment_locations al
      LEFT JOIN districts d ON al.district_id = d.id
      WHERE al.activity_id = $1
    `;
    const params = [activityId];

    if (activeOnly) {
      sql += ' AND al.is_active = true';
    }

    if (availableOnly) {
      sql += ' AND al.registered_count < al.capacity AND al.is_active = true';
    }

    if (districtId) {
      params.push(districtId);
      sql += ` AND al.district_id = $${params.length}`;
    }

    sql += ' ORDER BY al.district_id, al.name';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 更新测评点
   * @param {number} id - 测评点ID
   * @param {Object} updateData - 更新数据
   * @returns {Object|null} 更新后的测评点
   */
  static async update(id, updateData) {
    const allowedFields = [
      'name', 'address', 'district_id', 'capacity',
      'contact_name', 'contact_phone', 'exam_date',
      'exam_time_start', 'exam_time_end', 'check_in_time',
      'notes', 'is_active'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE assessment_locations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * 删除测评点
   * @param {number} id - 测评点ID
   * @returns {boolean} 是否删除成功
   */
  static async delete(id) {
    // 检查是否有报名记录
    const registrationCheck = await query(`
      SELECT COUNT(*) as count
      FROM assessment_registrations
      WHERE location_id = $1 AND status NOT IN ('cancelled', 'rejected')
    `, [id]);

    if (parseInt(registrationCheck.rows[0].count) > 0) {
      throw new Error('该测评点已有报名记录，无法删除');
    }

    const result = await query(`
      DELETE FROM assessment_locations
      WHERE id = $1
      RETURNING id
    `, [id]);

    return result.rowCount > 0;
  }

  /**
   * 检查测评点是否有剩余名额
   * @param {number} id - 测评点ID
   * @returns {Object} 容量信息
   */
  static async checkCapacity(id) {
    const result = await query(`
      SELECT
        id,
        name,
        capacity,
        registered_count,
        capacity - registered_count as remaining,
        CASE WHEN registered_count >= capacity THEN true ELSE false END as is_full
      FROM assessment_locations
      WHERE id = $1 AND is_active = true
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * 获取活动的测评点统计
   * @param {number} activityId - 活动ID
   * @returns {Object} 统计信息
   */
  static async getStatistics(activityId) {
    const result = await query(`
      SELECT
        COUNT(*) as total_locations,
        SUM(capacity) as total_capacity,
        SUM(registered_count) as total_registered,
        SUM(capacity - registered_count) as total_remaining,
        COUNT(CASE WHEN registered_count >= capacity THEN 1 END) as full_locations,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_locations
      FROM assessment_locations
      WHERE activity_id = $1
    `, [activityId]);

    return result.rows[0];
  }

  /**
   * 批量创建测评点
   * @param {number} activityId - 活动ID
   * @param {Array} locations - 测评点数据数组
   * @param {number} createdBy - 创建者ID
   * @returns {Array} 创建的测评点列表
   */
  static async bulkCreate(activityId, locations, createdBy) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const createdLocations = [];
      for (const loc of locations) {
        const result = await client.query(`
          INSERT INTO assessment_locations (
            activity_id, name, address, district_id, capacity,
            contact_name, contact_phone, exam_date, exam_time_start,
            exam_time_end, check_in_time, notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [
          activityId, loc.name, loc.address, loc.district_id, loc.capacity || 50,
          loc.contact_name, loc.contact_phone, loc.exam_date, loc.exam_time_start,
          loc.exam_time_end, loc.check_in_time, loc.notes, createdBy
        ]);
        createdLocations.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return createdLocations;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 检查活动是否需要测评点
   * @param {number} activityId - 活动ID
   * @returns {boolean} 是否需要测评点
   */
  static async activityRequiresLocation(activityId) {
    const result = await query(`
      SELECT ability_level, require_location
      FROM activities
      WHERE id = $1
    `, [activityId]);

    if (!result.rows[0]) return false;

    const { ability_level, require_location } = result.rows[0];

    // L4+级别默认需要测评点，或者显式设置了require_location
    return require_location || ['L4', 'L5', 'L6', 'L7'].includes(ability_level);
  }
}

module.exports = AssessmentLocation;
