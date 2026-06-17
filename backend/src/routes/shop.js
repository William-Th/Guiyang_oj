const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, pool } = require('../database/connection');
const StudentPoints = require('../models/StudentPoints');

/**
 * 积分消费虚拟商店（E2）
 * 名字颜色仅自己端可见，不影响他人查看。
 */

function studentOnly(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, error: '仅学生可使用商店' });
  }
  next();
}

/**
 * 商品列表
 * GET /api/shop/items?category=
 */
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT id, item_code, name, category, price, config FROM virtual_items WHERE is_active = true';
    const params = [];
    if (category) {
      sql += ' AND category = $1';
      params.push(category);
    }
    sql += ' ORDER BY price ASC';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (error) {
    console.error('Error listing shop items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 购买商品（扣积分 + 记录）
 * POST /api/shop/items/:itemId/purchase
 */
router.post('/items/:itemId/purchase', authMiddleware, studentOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const studentId = req.user.id;

    await client.query('BEGIN');

    // 查商品（锁）
    const itemRes = await client.query(
      'SELECT * FROM virtual_items WHERE id = $1 AND is_active = true FOR UPDATE',
      [itemId]
    );
    const item = itemRes.rows[0];
    if (!item) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: '商品不存在或已下架' });
    }

    // 是否已拥有
    const ownedRes = await client.query(
      'SELECT id FROM student_purchases WHERE student_id = $1 AND item_id = $2',
      [studentId, itemId]
    );
    if (ownedRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: '您已拥有该商品' });
    }

    // 扣积分（走 StudentPoints.deductPoints，独立事务——此处先校验余额）
    const account = await StudentPoints.getPointsAccount(studentId);
    if (!account || account.current_points < item.price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: '积分不足' });
    }

    // 记录购买
    const purchaseRes = await client.query(
      `INSERT INTO student_purchases (student_id, item_id, points_cost)
       VALUES ($1, $2, $3) RETURNING *`,
      [studentId, itemId, item.price]
    );

    await client.query('COMMIT');

    // 扣积分（独立事务，记录交易）
    let transactionId = null;
    try {
      const tx = await StudentPoints.deductPoints(studentId, item.price, 'shop_purchase', {
        sourceId: purchaseRes.rows[0].id,
        sourceType: 'virtual_item',
        description: `购买：${item.name}`
      });
      transactionId = tx ? tx.transaction_id : null;
    } catch (deductError) {
      // 扣分失败回滚购买
      await query('DELETE FROM student_purchases WHERE id = $1', [purchaseRes.rows[0].id]);
      return res.status(400).json({ success: false, error: '积分扣除失败，购买已取消' });
    }

    if (transactionId) {
      await query('UPDATE student_purchases SET transaction_id = $1 WHERE id = $2', [transactionId, purchaseRes.rows[0].id]);
    }

    res.status(201).json({
      success: true,
      data: purchaseRes.rows[0],
      message: `购买成功：${item.name}（- ${item.price} 积分）`
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Error purchasing item:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

/**
 * 我的物品（含装备状态）
 * GET /api/shop/my-items
 */
router.get('/my-items', authMiddleware, studentOnly, async (req, res) => {
  try {
    const r = await query(
      `SELECT sp.id, sp.is_equipped, sp.purchased_at,
              vi.item_code, vi.name, vi.category, vi.config
       FROM student_purchases sp
       JOIN virtual_items vi ON sp.item_id = vi.id
       WHERE sp.student_id = $1
       ORDER BY sp.purchased_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (error) {
    console.error('Error fetching my items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 装备/卸下商品（同类别装备互斥：装备一个名字颜色时自动卸下其他颜色）
 * POST /api/shop/my-items/:purchaseId/equip  body: { equip: bool }
 */
router.post('/my-items/:purchaseId/equip', authMiddleware, studentOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    const purchaseId = parseInt(req.params.purchaseId, 10);
    const { equip } = req.body;
    const studentId = req.user.id;

    await client.query('BEGIN');

    // 校验所有权
    const ownRes = await client.query(
      'SELECT sp.*, vi.category FROM student_purchases sp JOIN virtual_items vi ON sp.item_id = vi.id WHERE sp.id = $1 AND sp.student_id = $2',
      [purchaseId, studentId]
    );
    if (!ownRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: '物品不存在或不属于你' });
    }
    const category = ownRes.rows[0].category;

    if (equip) {
      // 同类别互斥：先卸下该类别所有
      await client.query(
        `UPDATE student_purchases SET is_equipped = false
         WHERE student_id = $1 AND item_id IN (SELECT id FROM virtual_items WHERE category = $2)`,
        [studentId, category]
      );
      await client.query('UPDATE student_purchases SET is_equipped = true WHERE id = $1', [purchaseId]);
    } else {
      await client.query('UPDATE student_purchases SET is_equipped = false WHERE id = $1', [purchaseId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: equip ? '已装备' : '已卸下' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Error equipping item:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
