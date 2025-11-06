/**
 * 科目配置管理路由
 * 提供科目列表、年级范围、能力等级等配置信息
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');

/**
 * GET /api/subjects
 * 获取所有科目列表（启用的科目）
 *
 * Query params:
 *   - includeInactive: boolean - 是否包含未启用的科目（默认false）
 *
 * Response:
 *   {
 *     "subjects": [
 *       {
 *         "id": 1,
 *         "subjectCode": "01",
 *         "subjectName": "数学",
 *         "description": "数学科目，涵盖一年级到九年级",
 *         "gradeRange": [...],
 *         "abilityLevels": [...],
 *         "displayOrder": 1
 *       }
 *     ]
 *   }
 */
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const query = `
      SELECT
        id,
        subject_code as "subjectCode",
        subject_name as "subjectName",
        description,
        grade_range as "gradeRange",
        ability_levels as "abilityLevels",
        is_active as "isActive",
        display_order as "displayOrder"
      FROM subjects
      ${includeInactive ? '' : 'WHERE is_active = true'}
      ORDER BY display_order ASC, subject_code ASC
    `;

    const result = await pool.query(query);

    res.json({
      subjects: result.rows
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      message: '获取科目列表失败',
      error: error.message
    });
  }
});

/**
 * GET /api/subjects/simple
 * 获取简单的科目选项列表（用于下拉框）
 *
 * Response:
 *   {
 *     "subjects": [
 *       { "value": "数学", "label": "数学", "code": "01" },
 *       { "value": "信息科技", "label": "信息科技", "code": "02" }
 *     ]
 *   }
 */
router.get('/simple', async (req, res) => {
  try {
    const query = `
      SELECT
        subject_code as code,
        subject_name as value,
        subject_name as label
      FROM subjects
      WHERE is_active = true
      ORDER BY display_order ASC, subject_code ASC
    `;

    const result = await pool.query(query);

    res.json({
      subjects: result.rows
    });
  } catch (error) {
    console.error('Error fetching simple subjects:', error);
    res.status(500).json({
      message: '获取科目列表失败',
      error: error.message
    });
  }
});

/**
 * GET /api/subjects/:subjectName/grades
 * 获取指定科目支持的年级列表
 *
 * Response:
 *   {
 *     "subject": "数学",
 *     "grades": [
 *       { "value": "一年级", "label": "一年级" },
 *       ...
 *     ]
 *   }
 */
router.get('/:subjectName/grades', async (req, res) => {
  try {
    const { subjectName } = req.params;

    const query = `
      SELECT
        subject_name as "subjectName",
        grade_range as grades
      FROM subjects
      WHERE subject_name = $1 AND is_active = true
    `;

    const result = await pool.query(query, [subjectName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: '未找到该科目'
      });
    }

    res.json({
      subject: result.rows[0].subjectName,
      grades: result.rows[0].grades
    });
  } catch (error) {
    console.error('Error fetching subject grades:', error);
    res.status(500).json({
      message: '获取科目年级失败',
      error: error.message
    });
  }
});

/**
 * GET /api/subjects/:subjectName/ability-levels
 * 获取指定科目的能力等级列表
 *
 * Response:
 *   {
 *     "subject": "数学",
 *     "abilityLevels": [
 *       { "value": "L1", "label": "L1 - 基础运算" },
 *       ...
 *     ]
 *   }
 */
router.get('/:subjectName/ability-levels', async (req, res) => {
  try {
    const { subjectName } = req.params;

    const query = `
      SELECT
        subject_name as "subjectName",
        ability_levels as "abilityLevels"
      FROM subjects
      WHERE subject_name = $1 AND is_active = true
    `;

    const result = await pool.query(query, [subjectName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: '未找到该科目'
      });
    }

    res.json({
      subject: result.rows[0].subjectName,
      abilityLevels: result.rows[0].abilityLevels
    });
  } catch (error) {
    console.error('Error fetching subject ability levels:', error);
    res.status(500).json({
      message: '获取科目能力等级失败',
      error: error.message
    });
  }
});

/**
 * GET /api/subjects/:subjectName
 * 获取指定科目的完整配置信息
 *
 * Response:
 *   {
 *     "subject": {
 *       "id": 1,
 *       "subjectCode": "01",
 *       "subjectName": "数学",
 *       "description": "...",
 *       "gradeRange": [...],
 *       "abilityLevels": [...]
 *     }
 *   }
 */
router.get('/:subjectName', async (req, res) => {
  try {
    const { subjectName } = req.params;

    const query = `
      SELECT
        id,
        subject_code as "subjectCode",
        subject_name as "subjectName",
        description,
        grade_range as "gradeRange",
        ability_levels as "abilityLevels",
        is_active as "isActive",
        display_order as "displayOrder"
      FROM subjects
      WHERE subject_name = $1
    `;

    const result = await pool.query(query, [subjectName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: '未找到该科目'
      });
    }

    res.json({
      subject: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      message: '获取科目信息失败',
      error: error.message
    });
  }
});

module.exports = router;
