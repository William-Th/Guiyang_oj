const { query } = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async findByIdCard(idCard) {
    const result = await query(
      'SELECT * FROM users WHERE id_card = $1',
      [idCard]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const { username, password, role, realName, idCard, phone, email } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(`
      INSERT INTO users (username, password, role, real_name, id_card, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, role, real_name, id_card, phone, email, created_at
    `, [username, hashedPassword, role, realName, idCard, phone, email]);
    
    return result.rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userId) {
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  static async getAllStudents() {
    const result = await query(`
      SELECT u.id, u.username, u.real_name, u.id_card, u.phone, u.email, u.created_at,
             s.student_no, s.grade, s.class, s.guardian_name, s.guardian_phone,
             sc.name as school_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN schools sc ON s.school_id = sc.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  static async createStudent(userData, studentData) {
    const client = await require('../database/connection').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userResult = await client.query(`
        INSERT INTO users (username, password, role, real_name, id_card, phone, email)
        VALUES ($1, $2, 'student', $3, $4, $5, $6)
        RETURNING id
      `, [userData.username, hashedPassword, userData.realName, userData.idCard, userData.phone, userData.email]);
      
      const userId = userResult.rows[0].id;
      
      // Create student record
      await client.query(`
        INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, studentData.studentNo, studentData.schoolId, studentData.grade, studentData.class, studentData.guardianName, studentData.guardianPhone]);
      
      await client.query('COMMIT');
      return await User.findById(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = User;