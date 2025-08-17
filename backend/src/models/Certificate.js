const { query } = require('../database/connection');

class Certificate {
    // 创建证书记录
    static async create(certificateData) {
        const {
            student_id,
            exam_id,
            cert_no,
            issue_date,
            level,
            file_url,
            score
        } = certificateData;

        const queryStr = `
            INSERT INTO certificates (student_id, exam_id, cert_no, issue_date, level, file_url, score)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [student_id, exam_id, cert_no, issue_date, level, file_url, score];
        const result = await query(queryStr, values);
        return result.rows[0];
    }

    // 根据证书编号查找证书
    static async findByCertNumber(certNumber) {
        const queryStr = `
            SELECT 
                c.*,
                u.real_name as student_name,
                u.id_card,
                e.title as exam_name,
                e.start_time as exam_date,
                s.school_id,
                sc.name as school_name
            FROM certificates c
            JOIN users u ON c.student_id = u.id
            JOIN exams e ON c.exam_id = e.id
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN schools sc ON s.school_id = sc.id
            WHERE c.cert_no = $1
        `;

        const result = await query(queryStr, [certNumber]);
        return result.rows[0];
    }

    // 根据学生ID获取证书列表
    static async findByStudentId(studentId) {
        const queryStr = `
            SELECT 
                c.*,
                e.title as exam_name,
                e.start_time as exam_date
            FROM certificates c
            JOIN exams e ON c.exam_id = e.id
            WHERE c.student_id = $1
            ORDER BY c.issue_date DESC
        `;

        const result = await query(queryStr, [studentId]);
        return result.rows;
    }

    // 根据考试ID获取证书列表
    static async findByExamId(examId) {
        const queryStr = `
            SELECT 
                c.*,
                u.real_name as student_name,
                u.username,
                s.student_no,
                s.grade,
                s.class
            FROM certificates c
            JOIN users u ON c.student_id = u.id
            LEFT JOIN students s ON u.id = s.user_id
            WHERE c.exam_id = $1
            ORDER BY c.score DESC, c.issue_date DESC
        `;

        const result = await query(queryStr, [examId]);
        return result.rows;
    }

    // 检查学生是否已有该考试的证书
    static async findByStudentAndExam(studentId, examId) {
        const queryStr = `
            SELECT * FROM certificates 
            WHERE student_id = $1 AND exam_id = $2
        `;

        const result = await query(queryStr, [studentId, examId]);
        return result.rows[0];
    }

    // 更新证书信息
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);
        const queryStr = `
            UPDATE certificates 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(queryStr, values);
        return result.rows[0];
    }

    // 删除证书
    static async delete(id) {
        const queryStr = 'DELETE FROM certificates WHERE id = $1 RETURNING *';
        const result = await query(queryStr, [id]);
        return result.rows[0];
    }

    // 验证证书有效性
    static async verifyCertificate(certNumber) {
        const certificate = await this.findByCertNumber(certNumber);
        
        if (!certificate) {
            return {
                valid: false,
                message: '证书不存在'
            };
        }

        return {
            valid: true,
            certificate: {
                cert_no: certificate.cert_no,
                student_name: certificate.student_name,
                exam_name: certificate.exam_name,
                exam_date: certificate.exam_date,
                score: certificate.score,
                level: certificate.level,
                issue_date: certificate.issue_date,
                school_name: certificate.school_name
            }
        };
    }

    // 获取证书统计信息
    static async getStatistics(examId = null) {
        let queryStr = `
            SELECT 
                COUNT(*) as total_certificates,
                COUNT(CASE WHEN level = '优秀' THEN 1 END) as excellent_count,
                COUNT(CASE WHEN level = '良好' THEN 1 END) as good_count,
                COUNT(CASE WHEN level = '及格' THEN 1 END) as pass_count,
                COUNT(CASE WHEN level = '待提高' THEN 1 END) as improve_count,
                AVG(score) as average_score,
                MAX(score) as highest_score,
                MIN(score) as lowest_score
            FROM certificates
        `;

        const values = [];
        if (examId) {
            queryStr += ' WHERE exam_id = $1';
            values.push(examId);
        }

        const result = await query(queryStr, values);
        return result.rows[0];
    }
}

module.exports = Certificate;