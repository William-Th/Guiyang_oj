/**
 * 题目编码生成服务
 *
 * 功能：为题目生成唯一的编码
 * 格式：科目代码 + 年月日 + 序号
 * 示例：MATH250120001 (数学-2025年1月20日-第1题)
 */

const { query } = require('../database/connection');

// 科目代码映射
const SUBJECT_CODE_MAP = {
  '数学': 'MATH',
  '物理': 'PHYS',
  '化学': 'CHEM',
  '生物': 'BIOL',
  '计算机': 'COMP',
};

/**
 * 生成题目编码
 * @param {string} subject - 科目名称
 * @param {Date} createdAt - 创建时间（可选，默认为当前时间）
 * @returns {Promise<string>} 题目编码
 */
async function generateQuestionCode(subject, createdAt = new Date()) {
  try {
    // 1. 获取科目代码
    const subjectCode = SUBJECT_CODE_MAP[subject] || 'OTHR';

    // 2. 获取日期部分 (YYMMDD)
    const year = createdAt.getFullYear().toString().slice(-2);
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(createdAt.getDate()).padStart(2, '0');
    const datePart = year + month + day;

    // 3. 获取当天该科目的序号
    const prefix = subjectCode + datePart;
    const sql = `
      SELECT COALESCE(MAX(CAST(SUBSTRING(question_code FROM 11) AS INTEGER)), 0) + 1 as next_sequence
      FROM question_bank
      WHERE question_code LIKE $1
    `;
    const result = await query(sql, [prefix + '%']);
    const sequence = result.rows[0].next_sequence;

    // 4. 组合生成编码
    const code = prefix + String(sequence).padStart(4, '0');

    return code;
  } catch (error) {
    console.error('Error generating question code:', error);
    throw new Error('Failed to generate question code');
  }
}

/**
 * 验证题目编码是否已存在
 * @param {string} code - 题目编码
 * @returns {Promise<boolean>} 是否存在
 */
async function isCodeExists(code) {
  try {
    const sql = 'SELECT COUNT(*) as count FROM question_bank WHERE question_code = $1';
    const result = await query(sql, [code]);
    return result.rows[0].count > 0;
  } catch (error) {
    console.error('Error checking code existence:', error);
    throw new Error('Failed to check code existence');
  }
}

/**
 * 根据编码查询题目
 * @param {string} code - 题目编码
 * @returns {Promise<object|null>} 题目对象
 */
async function getQuestionByCode(code) {
  try {
    const sql = 'SELECT * FROM question_bank WHERE question_code = $1 AND is_active = true';
    const result = await query(sql, [code]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting question by code:', error);
    throw new Error('Failed to get question by code');
  }
}

/**
 * 解析题目编码
 * @param {string} code - 题目编码
 * @returns {object} 编码信息 {subjectCode, subject, date, sequence}
 */
function parseQuestionCode(code) {
  if (!code || code.length !== 14) {
    throw new Error('Invalid question code format');
  }

  const subjectCode = code.substring(0, 4);
  const year = '20' + code.substring(4, 6);
  const month = code.substring(6, 8);
  const day = code.substring(8, 10);
  const sequence = parseInt(code.substring(10, 14), 10);

  // 反向查找科目名称
  const subjectName = Object.keys(SUBJECT_CODE_MAP).find(
    key => SUBJECT_CODE_MAP[key] === subjectCode
  ) || '其他';

  return {
    subjectCode,
    subject: subjectName,
    date: `${year}-${month}-${day}`,
    sequence,
  };
}

/**
 * 批量为题目生成编码
 * @param {Array<number>} questionIds - 题目ID数组
 * @returns {Promise<Array<object>>} 更新结果
 */
async function batchGenerateQuestionCodes(questionIds) {
  const results = [];

  for (const id of questionIds) {
    try {
      // 获取题目信息
      const questionSql = 'SELECT id, subject, created_at FROM question_bank WHERE id = $1';
      const questionResult = await query(questionSql, [id]);

      if (questionResult.rows.length === 0) {
        results.push({ id, success: false, error: 'Question not found' });
        continue;
      }

      const question = questionResult.rows[0];

      // 生成编码
      const code = await generateQuestionCode(question.subject, new Date(question.created_at));

      // 更新题目
      const updateSql = 'UPDATE question_bank SET question_code = $1 WHERE id = $2 RETURNING *';
      await query(updateSql, [code, id]);

      results.push({ id, success: true, code });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  generateQuestionCode,
  isCodeExists,
  getQuestionByCode,
  parseQuestionCode,
  batchGenerateQuestionCodes,
  SUBJECT_CODE_MAP,
};
