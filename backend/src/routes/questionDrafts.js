const express = require('express');
const router = express.Router();
const QuestionDraft = require('../models/QuestionDraft');
const QuestionBank = require('../models/QuestionBank');
const { authMiddleware } = require('../middleware/auth');

/**
 * 获取我的草稿列表
 * GET /api/question-drafts
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { subject, grade, type, difficulty, level, search, page = 1, limit = 20 } = req.query;

    const filters = {
      subject,
      grade,
      type,
      difficulty,
      level,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [drafts, total] = await Promise.all([
      QuestionDraft.getMyDrafts(req.user.id, filters),
      QuestionDraft.countMyDrafts(req.user.id, filters)
    ]);

    res.json({
      success: true,
      data: drafts,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 根据ID获取草稿详情
 * GET /api/question-drafts/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const draft = await QuestionDraft.findById(id);

    if (!draft) {
      return res.status(404).json({ success: false, error: '草稿不存在' });
    }

    // 权限检查：只能查看自己的草稿
    if (draft.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: '无权访问此草稿' });
    }

    res.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 创建草稿
 * POST /api/question-drafts
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const draftData = {
      ...req.body,
      created_by: req.user.id
    };

    const draft = await QuestionDraft.create(draftData);

    res.status(201).json({
      success: true,
      data: draft,
      message: '草稿创建成功'
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 克隆草稿（修订已发布题目）
 * POST /api/question-drafts/:id/clone
 */
router.post('/:id/clone', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查原草稿是否存在
    const existingDraft = await QuestionDraft.findById(id);
    if (!existingDraft) {
      return res.status(404).json({ success: false, error: '原草稿不存在' });
    }

    // 克隆草稿，创建者为当前用户
    const clonedDraft = await QuestionDraft.cloneFrom(id, req.user.id);

    res.status(201).json({
      success: true,
      data: clonedDraft,
      message: '已创建修订副本，可在草稿箱中编辑'
    });
  } catch (error) {
    console.error('Error cloning draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 更新草稿
 * PUT /api/question-drafts/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查草稿是否存在
    const existingDraft = await QuestionDraft.findById(id);
    if (!existingDraft) {
      return res.status(404).json({ success: false, error: '草稿不存在' });
    }

    // 权限检查：只能修改自己的草稿
    if (existingDraft.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: '无权修改此草稿' });
    }

    // 发布状态检查：已发布或审核中的题目不能直接编辑
    const publications = await QuestionDraft.getPublications(id);
    const lockedStatuses = publications.filter(p => p.status === 'published' || p.status === 'pending_review');
    if (lockedStatuses.length > 0) {
      const statusText = lockedStatuses[0].status === 'published' ? '已发布' : '审核中';
      return res.status(403).json({
        success: false,
        error: `该题目${statusText}，不能直接编辑。请使用"修订"功能创建新版本。`
      });
    }

    const draft = await QuestionDraft.update(id, req.body);

    res.json({
      success: true,
      data: draft,
      message: '草稿更新成功'
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 删除草稿
 * DELETE /api/question-drafts/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查草稿是否存在
    const existingDraft = await QuestionDraft.findById(id);
    if (!existingDraft) {
      return res.status(404).json({ success: false, error: '草稿不存在' });
    }

    // 权限检查：只能删除自己的草稿
    if (existingDraft.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: '无权删除此草稿' });
    }

    // 检查是否有发布记录
    const publications = await QuestionDraft.getPublications(id);
    if (publications.length > 0) {
      return res.status(400).json({
        success: false,
        error: '该草稿已有发布记录，不能删除。如需停用，请删除对应的发布记录。',
        publications: publications.length
      });
    }

    await QuestionDraft.delete(id);

    res.json({
      success: true,
      message: '草稿删除成功'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取草稿的发布记录
 * GET /api/question-drafts/:id/publications
 */
router.get('/:id/publications', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查草稿是否存在
    const draft = await QuestionDraft.findById(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: '草稿不存在' });
    }

    // 权限检查：只能查看自己的草稿
    if (draft.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: '无权访问此草稿' });
    }

    const publications = await QuestionDraft.getPublications(id);

    res.json({
      success: true,
      data: publications,
      meta: {
        count: publications.length,
        draft_id: parseInt(id)
      }
    });
  } catch (error) {
    console.error('Error fetching publications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 发布草稿到指定范围
 * POST /api/question-drafts/:id/publish
 */
router.post('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { scope, reviewer_id } = req.body;

    if (!scope) {
      return res.status(400).json({ success: false, error: 'scope参数必填' });
    }

    // 检查草稿是否存在
    const draft = await QuestionDraft.findById(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: '草稿不存在' });
    }

    // 权限检查：只能发布自己的草稿
    if (draft.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: '无权发布此草稿' });
    }

    // 检查是否已发布到该范围
    const isPublished = await QuestionDraft.isPublishedToScope(id, scope);
    if (isPublished) {
      return res.status(400).json({
        success: false,
        error: '该题目已经发布到此范围，不能重复发布'
      });
    }

    // 判断是否需要审核
    const needsReview = scope !== `practice_school_${req.user.school_id}` &&
                        !scope.startsWith('practice_school_');

    const status = needsReview ? 'pending_review' : 'published';

    // 如果需要审核但没有提供审核人，返回错误
    if (needsReview && !reviewer_id) {
      return res.status(400).json({
        success: false,
        error: '发布到非校级题库需要选择审核人'
      });
    }

    // 创建发布记录
    const publication = await QuestionBank.publish({
      draft_id: parseInt(id),
      scope,
      published_by: req.user.id,
      reviewer_id: reviewer_id || null,
      status
    });

    res.status(201).json({
      success: true,
      data: publication,
      message: needsReview ? '已提交审核' : '发布成功'
    });
  } catch (error) {
    console.error('Error publishing draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
