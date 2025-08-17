const { query, getClient } = require('../database/connection');

class QuestionCategory {
  static async create(categoryData) {
    const { name, parent_id, subject, description } = categoryData;

    const sql = `
      INSERT INTO question_categories (name, parent_id, subject, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [name, parent_id, subject, description];
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT * FROM question_categories WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const sql = `
      SELECT 
        c.*,
        p.name as parent_name,
        COUNT(qb.id) as question_count
      FROM question_categories c
      LEFT JOIN question_categories p ON c.parent_id = p.id
      LEFT JOIN question_bank qb ON c.id = qb.category_id AND qb.is_active = true
      GROUP BY c.id, p.name
      ORDER BY c.parent_id NULLS FIRST, c.name
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  static async findBySubject(subject) {
    const sql = `
      SELECT * FROM question_categories 
      WHERE subject = $1 OR subject IS NULL
      ORDER BY parent_id NULLS FIRST, name
    `;
    
    const result = await query(sql, [subject]);
    return result.rows;
  }

  static async getHierarchy() {
    const sql = `
      WITH RECURSIVE category_tree AS (
        SELECT 
          id, name, parent_id, subject, description,
          0 as level,
          ARRAY[id] as path,
          name::text as full_path
        FROM question_categories
        WHERE parent_id IS NULL
        
        UNION ALL
        
        SELECT 
          c.id, c.name, c.parent_id, c.subject, c.description,
          ct.level + 1,
          ct.path || c.id,
          ct.full_path || ' > ' || c.name
        FROM question_categories c
        JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT * FROM category_tree
      ORDER BY path
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'parent_id', 'subject', 'description'];
    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    const sql = `
      UPDATE question_categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async delete(id) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if category has questions
      const checkSql = 'SELECT COUNT(*) FROM question_bank WHERE category_id = $1 AND is_active = true';
      const checkResult = await client.query(checkSql, [id]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        throw new Error('Cannot delete category with active questions');
      }
      
      // Check if category has subcategories
      const subCheckSql = 'SELECT COUNT(*) FROM question_categories WHERE parent_id = $1';
      const subCheckResult = await client.query(subCheckSql, [id]);
      
      if (parseInt(subCheckResult.rows[0].count) > 0) {
        throw new Error('Cannot delete category with subcategories');
      }
      
      // Delete the category
      const deleteSql = 'DELETE FROM question_categories WHERE id = $1 RETURNING *';
      const result = await client.query(deleteSql, [id]);
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getQuestionCount(id) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM question_bank 
      WHERE category_id = $1 AND is_active = true
    `;
    
    const result = await query(sql, [id]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = QuestionCategory;