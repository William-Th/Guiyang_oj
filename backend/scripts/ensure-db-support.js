/**
 * 数据库格式支持保障脚本（幂等，可重复执行）
 *
 * 校验并保障新格式（富文本题干/解析、多题型答案、11 科目、能力标签）
 * 在数据库层面可存储、可查询：
 *   1. 关键列类型自检（content/explanation/answer 需 TEXT，options/correct_answer 需 jsonb）
 *   2. subjects 表科目数据 upsert（2022 课程方案 11 科目）
 *   3. student_points 账户兜底（每个学生一条，缺失自动补齐）
 *
 * 用法（在 backend 容器内）: node scripts/ensure-db-support.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'guiyang_oj',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// 与前端 subjects.ts / 种子脚本保持一致的科目清单
const SUBJECT_ROWS = [
  ['MATH', '数学', '数学，一年级到高三', ['1','2','3','4','5','6','7','8','9','10','11','12'], 1],
  ['IT', '信息科技', '信息科技，三年级到高三', ['3','4','5','6','7','8','9','10','11','12'], 2],
  ['CHIN', '语文', '语文，一年级到高三', ['1','2','3','4','5','6','7','8','9','10','11','12'], 3],
  ['ENG', '英语', '英语，三年级到高三', ['3','4','5','6','7','8','9','10','11','12'], 4],
  ['MORL', '道德与法治', '道德与法治，一年级到九年级', ['1','2','3','4','5','6','7','8','9'], 5],
  ['SCIE', '科学', '科学，一年级到九年级', ['1','2','3','4','5','6','7','8','9'], 6],
  ['HIST', '历史', '历史，七年级到高三', ['7','8','9','10','11','12'], 7],
  ['GEOG', '地理', '地理，七年级到高三', ['7','8','9','10','11','12'], 8],
  ['PHYS', '物理', '物理，八年级到高三', ['8','9','10','11','12'], 9],
  ['CHEM', '化学', '化学，九年级到高三', ['9','10','11','12'], 10],
  ['BIOL', '生物学', '生物学，七年级到高三', ['7','8','9','10','11','12'], 11],
];

const results = [];
function report(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

/** 关键列类型自检：新格式（富文本 HTML、选项/答案 JSON、答卷文本）依赖这些列类型 */
async function checkColumnTypes() {
  const expectations = [
    { table: 'question_drafts', column: 'content', type: 'text' },
    { table: 'question_drafts', column: 'explanation', type: 'text' },
    { table: 'question_drafts', column: 'options', type: 'jsonb' },
    { table: 'question_drafts', column: 'correct_answer', type: 'jsonb' },
    { table: 'question_drafts', column: 'abilities', type: 'ARRAY' },
    { table: 'answers', column: 'answer', type: 'text' },
    { table: 'activities', column: 'description', type: 'text' },
  ];

  for (const { table, column, type } of expectations) {
    const r = await pool.query(
      `SELECT data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (r.rows.length === 0) {
      report(`列存在: ${table}.${column}`, false, '列不存在');
      continue;
    }
    const actual = r.rows[0];
    const ok = type === 'ARRAY'
      ? actual.data_type === 'ARRAY'
      : actual.udt_name === type;
    report(`列类型: ${table}.${column} = ${type}`, ok, actual.udt_name || actual.data_type);
  }
}

/** subjects 表科目数据 upsert（2022 课程方案 11 科目） */
async function upsertSubjects() {
  for (const [code, name, desc, grades, order] of SUBJECT_ROWS) {
    await pool.query(
      `INSERT INTO subjects (subject_code, subject_name, description, grade_range, ability_levels, is_active, display_order)
       VALUES ($1, $2, $3, $4::jsonb, '["优秀","良好","合格","待提高"]'::jsonb, true, $5)
       ON CONFLICT (subject_code) DO UPDATE SET
         subject_name = EXCLUDED.subject_name,
         grade_range = EXCLUDED.grade_range,
         is_active = true,
         display_order = EXCLUDED.display_order`,
      [code, name, desc, JSON.stringify(grades), order]
    );
  }
  const r = await pool.query(`SELECT COUNT(*) AS n FROM subjects WHERE is_active = true`);
  report(`科目配置: ${SUBJECT_ROWS.length} 个科目已固化`, Number(r.rows[0].n) >= SUBJECT_ROWS.length);
}

/** 学生积分账户兜底（缺失自动补零账户） */
async function ensureStudentPoints() {
  await pool.query(
    `INSERT INTO student_points (student_id)
     SELECT id FROM students
     ON CONFLICT (student_id) DO NOTHING`
  );
  const missing = await pool.query(
    `SELECT COUNT(*) AS n FROM students s
     WHERE NOT EXISTS (SELECT 1 FROM student_points sp WHERE sp.student_id = s.id)`
  );
  report(`积分账户: 每个学生都有账户`, Number(missing.rows[0].n) === 0);
}

async function main() {
  console.log('===== 数据库格式支持自检与保障 =====\n');

  await checkColumnTypes();
  console.log('');
  await upsertSubjects();
  await ensureStudentPoints();

  console.log('');
  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.error(`共 ${results.length} 项检查，${failed.length} 项失败`);
    process.exitCode = 1;
  } else {
    console.log(`共 ${results.length} 项检查全部通过`);
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error('脚本执行失败:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
