const crypto = require('crypto');
const { query } = require('../../database/connection');

const BITS = 64;
const MARK_THRESHOLD = 0.85;   // 综合分 ≥0.85 标记同质
const STRONG_THRESHOLD = 0.95; // ≥0.95 强提示

/**
 * QuestionSimilarityService (算法① L0 + L1)
 * L0 结构化硬规则 + L1 SimHash 文本指纹，综合判定题目同质化。
 *
 * SimHash：文本分词 → 每词哈希 → 加权累加 → 二值化得 64bit 指纹。
 * 相似度 = 1 - hamming(a,b) / 64。
 */
class QuestionSimilarityService {
  /**
   * 简单分词：中文按字符 bigram，英文/数字按词，去标点空白
   */
  static _tokenize(text) {
    if (!text) return [];
    const cleaned = String(text).toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
    const tokens = [];
    // 英文/数字连续段
    const ascii = cleaned.match(/[a-z0-9]+/g) || [];
    ascii.forEach((w) => tokens.push(w));
    // 中文字符 bigram（剔除已被 ascii 匹配的段）
    const cjk = cleaned.replace(/[a-z0-9]+/g, '');
    for (let i = 0; i < cjk.length - 1; i += 1) {
      tokens.push(cjk.slice(i, i + 2));
    }
    if (cjk.length === 1) tokens.push(cjk);
    return tokens;
  }

  /**
   * 计算 64bit SimHash
   */
  static simhash(text) {
    const tokens = QuestionSimilarityService._tokenize(text);
    if (tokens.length === 0) return BigInt(0);
    const freq = {};
    tokens.forEach((t) => { freq[t] = (freq[t] || 0) + 1; });

    const v = new Array(BITS).fill(0);
    Object.entries(freq).forEach(([token, weight]) => {
      const h = crypto.createHash('md5').update(token).digest();
      // 取前 8 字节作为 64bit
      let hash = BigInt(0);
      for (let i = 0; i < 8; i += 1) {
        hash = (hash << BigInt(8)) | BigInt(h[i]);
      }
      for (let i = 0; i < BITS; i += 1) {
        const bit = (hash >> BigInt(i)) & BigInt(1);
        v[i] += bit === BigInt(1) ? weight : -weight;
      }
    });

    let fp = BigInt(0);
    for (let i = 0; i < BITS; i += 1) {
      if (v[i] > 0) fp |= (BigInt(1) << BigInt(i));
    }
    return fp;
  }

  /**
   * 汉明距离（64bit）
   */
  static hamming(a, b) {
    let x = a ^ b;
    let d = 0;
    while (x > 0) {
      d += Number(x & BigInt(1));
      x >>= BigInt(1);
    }
    return d;
  }

  /**
   * 文本相似度 [0,1]
   */
  static textSimilarity(fpA, fpB) {
    if (!fpA || !fpB) return 0;
    return 1 - QuestionSimilarityService.hamming(fpA, fpB) / BITS;
  }

  /**
   * 构建 L0 结构化键
   */
  static structuredKey(draft) {
    const kp = Array.isArray(draft.knowledge_points)
      ? [...draft.knowledge_points].sort().join(',')
      : '';
    return [draft.type, draft.subject, draft.grade, draft.difficulty, kp].filter(Boolean).join('|');
  }

  /**
   * 计算并存储题目指纹
   */
  static async computeAndStore(draftId, draft) {
    const text = [draft.content, draft.explanation].filter(Boolean).join(' ');
    let contentText = text;
    if (draft.options) {
      try {
        const opts = typeof draft.options === 'string' ? JSON.parse(draft.options) : draft.options;
        contentText += ' ' + Object.values(opts || {}).join(' ');
      } catch (e) { /* ignore */ }
    }
    const fp = QuestionSimilarityService.simhash(contentText);
    const key = QuestionSimilarityService.structuredKey(draft);
    await query(
      `INSERT INTO question_fingerprint (draft_id, content_hash, structured_key, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (draft_id) DO UPDATE SET
         content_hash = EXCLUDED.content_hash,
         structured_key = EXCLUDED.structured_key,
         updated_at = CURRENT_TIMESTAMP`,
      [draftId, fp.toString(), key]
    );
    return { content_hash: fp.toString(), structured_key: key };
  }

  /**
   * 检查一道题与一批候选题的同质性（综合 L0+L1）
   * @param {number} draftId - 待查题目
   * @param {number[]} againstDraftIds - 对比集
   * @returns {Promise<Object>} { maxScore, level, hits[] }
   */
  static async checkHomogeneity(draftId, againstDraftIds) {
    if (!againstDraftIds || againstDraftIds.length === 0) {
      return { maxScore: 0, level: 'none', hits: [] };
    }
    // 取所有相关指纹
    const ids = [draftId, ...againstDraftIds];
    const r = await query(
      'SELECT draft_id, content_hash, structured_key FROM question_fingerprint WHERE draft_id = ANY($1::int[])',
      [ids]
    );
    const map = {};
    r.rows.forEach((row) => {
      map[row.draft_id] = {
        fp: row.content_hash ? BigInt(row.content_hash) : BigInt(0),
        key: row.structured_key
      };
    });

    const target = map[draftId];
    if (!target) {
      return { maxScore: 0, level: 'none', hits: [], note: '目标题目暂无指纹' };
    }

    const hits = [];
    let maxScore = 0;
    againstDraftIds.forEach((aid) => {
      const cand = map[aid];
      if (!cand) return;
      const structSame = target.key && cand.key && target.key === cand.key ? 1 : 0;
      const textSim = QuestionSimilarityService.textSimilarity(target.fp, cand.fp);
      // 综合：结构全等加权 + 文本相似（结构相同但文本不同也可能是同型不同题，需文本佐证）
      const score = structSame ? Math.min(1, 0.4 + textSim * 0.6) : textSim * 0.9;
      if (score >= MARK_THRESHOLD) {
        hits.push({ draft_id: aid, score: Number(score.toFixed(4)), struct_same: !!structSame, text_sim: Number(textSim.toFixed(4)) });
        if (score > maxScore) maxScore = score;
      }
    });

    let level = 'none';
    if (maxScore >= STRONG_THRESHOLD) level = 'strong';
    else if (maxScore >= MARK_THRESHOLD) level = 'marked';

    return { maxScore: Number(maxScore.toFixed(4)), level, hits };
  }

  static get MARK_THRESHOLD() { return MARK_THRESHOLD; }
  static get STRONG_THRESHOLD() { return STRONG_THRESHOLD; }
}

module.exports = QuestionSimilarityService;
