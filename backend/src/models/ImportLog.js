const { query } = require('../database/connection');

class ImportLog {
  static async create(logData) {
    const {
      batch_id,
      file_name,
      file_type,
      total_rows,
      successful_rows,
      failed_rows,
      error_details,
      imported_by
    } = logData;

    const sql = `
      INSERT INTO import_logs 
      (batch_id, file_name, file_type, total_rows, successful_rows, 
       failed_rows, error_details, imported_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      batch_id,
      file_name,
      file_type,
      total_rows,
      successful_rows || 0,
      failed_rows || 0,
      JSON.stringify(error_details || {}),
      imported_by
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT * FROM import_logs WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findByBatchId(batchId) {
    const sql = 'SELECT * FROM import_logs WHERE batch_id = $1';
    const result = await query(sql, [batchId]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT 
        il.*,
        u.username as imported_by_username,
        u.real_name as imported_by_name
      FROM import_logs il
      LEFT JOIN users u ON il.imported_by = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.imported_by) {
      paramCount++;
      sql += ` AND il.imported_by = $${paramCount}`;
      values.push(filters.imported_by);
    }

    if (filters.file_type) {
      paramCount++;
      sql += ` AND il.file_type = $${paramCount}`;
      values.push(filters.file_type);
    }

    if (filters.start_date) {
      paramCount++;
      sql += ` AND il.created_at >= $${paramCount}`;
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      paramCount++;
      sql += ` AND il.created_at <= $${paramCount}`;
      values.push(filters.end_date);
    }

    sql += ' ORDER BY il.created_at DESC';

    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await query(sql, values);
    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = ['successful_rows', 'failed_rows', 'error_details'];
    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        
        if (field === 'error_details') {
          values.push(JSON.stringify(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    const sql = `
      UPDATE import_logs 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async getStatistics(userId = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_imports,
        SUM(total_rows) as total_rows_processed,
        SUM(successful_rows) as total_successful,
        SUM(failed_rows) as total_failed,
        AVG(CASE WHEN total_rows > 0 
          THEN (successful_rows::float / total_rows * 100) 
          ELSE 0 END) as avg_success_rate
      FROM import_logs
    `;
    
    const values = [];
    
    if (userId) {
      sql += ' WHERE imported_by = $1';
      values.push(userId);
    }
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async getRecentImports(limit = 10) {
    const sql = `
      SELECT 
        il.*,
        u.username as imported_by_username,
        u.real_name as imported_by_name,
        CASE WHEN total_rows > 0 
          THEN ROUND((successful_rows::float / total_rows * 100)::numeric, 2)
          ELSE 0 END as success_rate
      FROM import_logs il
      LEFT JOIN users u ON il.imported_by = u.id
      ORDER BY il.created_at DESC
      LIMIT $1
    `;
    
    const result = await query(sql, [limit]);
    return result.rows;
  }
}

module.exports = ImportLog;