/**
 * 演示数据种子脚本：清理回归测试遗留数据，重建高质量题库与完整卷子
 *
 * 用法（在 backend 容器内执行，数据库连接读取容器环境变量）：
 *   docker exec guiyang_oj_backend node scripts/seed-demo-data.js
 *
 * 内容：
 *   1. 清理：测试产生的活动/答卷/题目/通知/积分流水等事务性数据（保留用户、
 *      学校、班级、成就定义、积分策略等配置数据）
 *   2. 重建：数学/信息科技题库（约 78 题），9 份完整卷子的活动与测评
 *      （其中 2 份为 E2E 回归种子：【测试】学生答题流程测试活动、
 *      【完整流程测试】测试活动，allow_retake=true）
 *
 * 注意：再次运行全量 E2E 回归会重新产生测试数据，需要时可重跑本脚本。
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'guiyang_oj',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// 教师账号（users 表中已存在）
const TEACHER_YY_PS_MATH = 24; // 蒋磊-云岩一小（数学）
const TEACHER_YY_PS_IT = 25;   // 韩雪-云岩一小（信息科技）

// ============================================================================
// 科目配置（subjects 表；2022 课程方案，幂等）
// ============================================================================

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

async function seedSubjects() {
  for (const [code, name, desc, grades, order] of SUBJECT_ROWS) {
    await pool.query(
      `INSERT INTO subjects (subject_code, subject_name, description, grade_range, ability_levels, is_active, display_order)
       VALUES ($1, $2, $3, $4::jsonb, '["优秀","良好","合格","待提高"]'::jsonb, true, $5)
       ON CONFLICT (subject_code) DO UPDATE SET subject_name = EXCLUDED.subject_name, is_active = true, display_order = EXCLUDED.display_order`,
      [code, name, desc, JSON.stringify(grades), order]
    );
  }
  console.log('✓ 科目配置：' + SUBJECT_ROWS.length + ' 个科目（2022 课程方案）');
}

// ============================================================================
// 题库定义
// 格式: { subject, grade, type, content, options?, correct, explanation, difficulty, level, tags }
// correct: single='A' | multiple=['A','C'] | true_false='true'|'false' | blank='60|六十' | essay='参考答案'
// ============================================================================

const MATH3 = { subject: '数学', grade: '三年级' };
const MATH4 = { subject: '数学', grade: '四年级' };
const MATH5 = { subject: '数学', grade: '五年级' };
const IT3 = { subject: '信息科技', grade: '三年级' };

// 各科目/题型的能力标签（写入 question_drafts.abilities，供数据分析视图聚合）
const ABILITY_BY_SUBJECT_TYPE = {
  '数学': {
    single: ['运算能力'], true_false: ['数感'], multiple: ['逻辑推理'],
    blank: ['运算能力'], essay: ['应用实践'],
  },
  '信息科技': {
    single: ['信息意识'], true_false: ['信息安全意识'], multiple: ['数字素养'],
    blank: ['基本操作'], essay: ['问题解决'],
  },
};

const QUESTIONS = [
  // ---------- 数学三年级 · 单选 ----------
  ...[
    { content: '下面哪个数是奇数？', options: ['6', '7', '8', '10'], correct: 'B', explanation: '奇数是不能被 2 整除的数，6、8、10 都是偶数，只有 7 是奇数。' },
    { content: '1 千米等于多少米？', options: ['100', '1000', '10000', '10'], correct: 'B', explanation: '1 千米 = 1000 米。' },
    { content: '25 × 4 = ?', options: ['90', '100', '110', '125'], correct: 'B', explanation: '25 × 4 = 100。' },
    { content: '一个正方形有几条对称轴？', options: ['1 条', '2 条', '4 条', '8 条'], correct: 'C', explanation: '正方形有 4 条对称轴：2 条对角线和 2 条过对边中点的直线。' },
    { content: '48 ÷ 6 = ?', options: ['7', '8', '9', '6'], correct: 'B', explanation: '六八四十八，所以 48 ÷ 6 = 8。' },
    { content: '钟面上时针从 3 走到 5，经过了多少小时？', options: ['1 小时', '2 小时', '3 小时', '5 小时'], correct: 'B', explanation: '从 3 到 5 经过 5 - 3 = 2 小时。' },
    { content: '最大的两位数与最小的两位数的差是多少？', options: ['80', '88', '89', '90'], correct: 'C', explanation: '最大两位数是 99，最小两位数是 10，99 - 10 = 89。' },
    { content: '1 千克棉花和 1 千克铁比较（　）。', options: ['棉花重', '铁重', '一样重', '无法比较'], correct: 'C', explanation: '质量都是 1 千克，一样重。' },
    { content: '小明前面有 4 人，后面有 3 人，这一队一共有多少人？', options: ['7 人', '8 人', '9 人', '6 人'], correct: 'B', explanation: '别忘了小明自己：4 + 1 + 3 = 8 人。' },
    { content: '每盒铅笔有 6 支，5 盒一共有多少支？', options: ['11 支', '30 支', '56 支', '35 支'], correct: 'B', explanation: '6 × 5 = 30 支。' },
    { content: '3 个百、2 个十组成的数是多少？', options: ['302', '320', '322', '230'], correct: 'B', explanation: '3 个百是 300，2 个十是 20，合起来是 320。' },
    { content: '下列算式中，结果最大的是（　）。', options: ['18 ÷ 3', '18 ÷ 2', '18 ÷ 6', '18 ÷ 9'], correct: 'B', explanation: '被除数相同，除数越小商越大，18 ÷ 2 = 9 最大。' },
  ].map(q => ({ ...MATH3, type: 'single', ...q, level: 'L2', tags: ['计算'] })),

  // ---------- 数学三年级 · 判断 ----------
  ...[
    { content: '1 千米等于 100 米。', correct: 'false', explanation: '1 千米 = 1000 米。' },
    { content: '正方形是特殊的长方形。', correct: 'true', explanation: '正方形四条边相等，满足长方形特征，是特殊的长方形。' },
    { content: '0 乘任何数都等于 0。', correct: 'true', explanation: '0 乘任何数都等于 0。' },
    { content: '两位数乘一位数，结果一定是两位数。', correct: 'false', explanation: '例如 25 × 5 = 125，结果是三位数。' },
    { content: '周长相等的两个长方形，形状一定相同。', correct: 'false', explanation: '周长相等只说明长宽之和相等，长和宽可以不同。' },
    { content: '比 999 大 1 的数是 1000。', correct: 'true', explanation: '999 + 1 = 1000。' },
    { content: '1 千克棉花比 1 千克铁轻。', correct: 'false', explanation: '都是 1 千克，一样重。' },
    { content: '计算 36 - 18 时，可以先算 36 - 20 再加 2。', correct: 'true', explanation: '36 - 20 = 16，16 + 2 = 18，凑整巧算正确。' },
  ].map(q => ({ ...MATH3, type: 'true_false', ...q, level: 'L2', tags: ['概念'] })),

  // ---------- 数学三年级 · 多选 ----------
  ...[
    { content: '下面哪些数是偶数？（多选）', options: ['12', '15', '28', '33'], correct: ['A', 'C'], explanation: '偶数能被 2 整除：12 和 28 是偶数，15 和 33 是奇数。' },
    { content: '下面哪些单位是质量单位？（多选）', options: ['克', '千克', '米', '吨'], correct: ['A', 'B', 'D'], explanation: '克、千克、吨是质量单位，米是长度单位。' },
    { content: '得数比 20 大的算式有哪些？（多选）', options: ['5 × 5', '4 × 4', '6 × 4', '3 × 7'], correct: ['A', 'C', 'D'], explanation: '5 × 5 = 25，6 × 4 = 24，3 × 7 = 21，都大于 20；4 × 4 = 16。' },
  ].map(q => ({ ...MATH3, type: 'multiple', ...q, level: 'L3', tags: ['综合'] })),

  // ---------- 数学三年级 · 填空 ----------
  ...[
    { content: '1 小时 = （　）分钟。', correct: '60|六十', explanation: '1 小时 = 60 分钟。' },
    { content: '小明有 35 元，买书花了 12 元，还剩（　）元。', correct: '23|二十三', explanation: '35 - 12 = 23 元。' },
    { content: '6 × 7 = （　）', correct: '42|四十二', explanation: '六七四十二。' },
    { content: '最小的三位数是（　）。', correct: '100|一百', explanation: '最小的三位数是 100。' },
  ].map(q => ({ ...MATH3, type: 'blank', ...q, level: 'L2', tags: ['计算'] })),

  // ---------- 数学三年级 · 问答 ----------
  ...[
    { content: '小明有 35 元，买了一本书花了 12 元，又买了一个文具盒花了 8 元。请问他还剩多少钱？请写出计算过程。', correct: '35 - 12 - 8 = 15（元）。答：小明还剩 15 元。', explanation: '用总金额依次减去两次花费即可。' },
    { content: '一个长方形长 8 厘米，宽 5 厘米。它的周长是多少厘米？请写出计算过程。', correct: '(8 + 5) × 2 = 26（厘米）。答：周长是 26 厘米。', explanation: '长方形周长 =（长 + 宽）× 2。' },
    { content: '二（1）班同学去植树，每个小组植 5 棵，4 个小组一共植了多少棵？如果每人植 2 棵，20 人能植多少棵？', correct: '5 × 4 = 20（棵）；2 × 20 = 40（棵）。答：4 个小组植 20 棵，20 人能植 40 棵。', explanation: '总量 = 每份量 × 份数。' },
  ].map(q => ({ ...MATH3, type: 'essay', ...q, level: 'L3', tags: ['应用'] })),

  // ---------- 数学四年级 · 单选 ----------
  ...[
    { content: '一亿里有多少个万？', options: ['100 个', '1000 个', '10000 个', '10 个'], correct: 'C', explanation: '一亿 = 10000 万。' },
    { content: '用量角器量角时，角的顶点要与量角器的（　）重合。', options: ['中心点', '0 刻度线', '边缘', '任意位置'], correct: 'A', explanation: '量角时角的顶点对准量角器中心，0 刻度线对准角的一条边。' },
    { content: '125 × 8 = ?', options: ['900', '1000', '1100', '800'], correct: 'B', explanation: '125 × 8 = 1000，这是常用的凑整算式。' },
    { content: '两条直线相交成直角时，这两条直线（　）。', options: ['互相垂直', '互相平行', '相交但不垂直', '重合'], correct: 'A', explanation: '相交成直角的两条直线互相垂直。' },
    { content: '由 3 个百万和 5 个千组成的数是（　）。', options: ['3005000', '3050000', '3500000', '3000500'], correct: 'A', explanation: '3 个百万 = 3000000，5 个千 = 5000，合起来是 3005000。' },
  ].map(q => ({ ...MATH4, type: 'single', ...q, level: 'L3', tags: ['大数', '几何'] })),

  // ---------- 数学四年级 · 判断 ----------
  ...[
    { content: '一条直线长 5 米。', correct: 'false', explanation: '直线无限长，不可度量；线段才有长度。' },
    { content: '大于 90° 的角叫钝角。', correct: 'false', explanation: '大于 90° 且小于 180° 的角才是钝角。' },
    { content: '最小的自然数是 0。', correct: 'true', explanation: '0 是最小的自然数。' },
  ].map(q => ({ ...MATH4, type: 'true_false', ...q, level: 'L3', tags: ['概念'] })),

  // ---------- 数学四年级 · 多选 ----------
  ...[
    { content: '下面哪些说法是正确的？（多选）', options: ['长方形的对边相等', '正方形四条边都相等', '平行四边形有 4 条对称轴', '梯形只有一组对边平行'], correct: ['A', 'B', 'D'], explanation: '一般平行四边形不是轴对称图形，没有对称轴；A、B、D 正确。' },
  ].map(q => ({ ...MATH4, type: 'multiple', ...q, level: 'L4', tags: ['几何'] })),

  // ---------- 数学四年级 · 填空 ----------
  ...[
    { content: '4 公顷 = （　）平方米。', correct: '40000|4万', explanation: '1 公顷 = 10000 平方米，4 公顷 = 40000 平方米。' },
  ].map(q => ({ ...MATH4, type: 'blank', ...q, level: 'L3', tags: ['单位'] })),

  // ---------- 数学四年级 · 问答 ----------
  ...[
    { content: '四(1)班第一小组 5 名同学的身高分别是 138 厘米、142 厘米、140 厘米、145 厘米、135 厘米。这个小组的平均身高是多少厘米？', correct: '(138 + 142 + 140 + 145 + 135) ÷ 5 = 700 ÷ 5 = 140（厘米）。答：平均身高 140 厘米。', explanation: '平均数 = 总数 ÷ 份数。' },
    { content: '一辆汽车每小时行驶 60 千米，3 小时能行驶多少千米？如果行驶 240 千米需要几小时？', correct: '60 × 3 = 180（千米）；240 ÷ 60 = 4（小时）。答：3 小时行驶 180 千米，行驶 240 千米需要 4 小时。', explanation: '路程 = 速度 × 时间；时间 = 路程 ÷ 速度。' },
  ].map(q => ({ ...MATH4, type: 'essay', ...q, level: 'L4', tags: ['应用'] })),

  // ---------- 数学五年级 · 单选 ----------
  ...[
    { content: '0.25 × 4 = ?', options: ['0.1', '1', '10', '100'], correct: 'B', explanation: '0.25 × 4 = 1。' },
    { content: '下面哪个数最大？', options: ['0.6', '0.58', '0.601', '0.598'], correct: 'C', explanation: '0.601 > 0.6 > 0.598 > 0.58。' },
    { content: 'x + 3 = 10，那么 x = ?', options: ['3', '6', '7', '13'], correct: 'C', explanation: 'x = 10 - 3 = 7。' },
    { content: '平行四边形的面积公式是（　）。', options: ['底 × 高', '底 × 高 ÷ 2', '(底 + 高) × 2', '边长 × 边长'], correct: 'A', explanation: '平行四边形面积 = 底 × 高；底 × 高 ÷ 2 是三角形面积公式。' },
    { content: '24 和 36 的最大公因数是（　）。', options: ['4', '6', '12', '24'], correct: 'C', explanation: '24 = 2³×3，36 = 2²×3²，最大公因数 = 2²×3 = 12。' },
  ].map(q => ({ ...MATH5, type: 'single', ...q, level: 'L4', tags: ['小数', '方程'] })),

  // ---------- 数学五年级 · 判断 ----------
  ...[
    { content: '0.30 和 0.3 的大小相等。', correct: 'true', explanation: '小数末尾添 0 或去掉 0，大小不变。' },
    { content: '两个数相除，商一定小于被除数。', correct: 'false', explanation: '除以比 1 小的数时，商反而大于被除数，如 10 ÷ 0.5 = 20。' },
    { content: '三角形面积是平行四边形面积的一半。', correct: 'false', explanation: '必须是等底等高的三角形与平行四边形，三角形面积才是其一半。' },
  ].map(q => ({ ...MATH5, type: 'true_false', ...q, level: 'L4', tags: ['概念'] })),

  // ---------- 数学五年级 · 多选 ----------
  ...[
    { content: '下面哪些数是 3 的倍数？（多选）', options: ['9', '12', '16', '21'], correct: ['A', 'B', 'D'], explanation: '3 的倍数各位数字之和是 3 的倍数：9、12、21 都是；16 不是。' },
  ].map(q => ({ ...MATH5, type: 'multiple', ...q, level: 'L5', tags: ['数论'] })),

  // ---------- 数学五年级 · 填空 ----------
  ...[
    { content: '1.25 × 8 = （　）', correct: '10', explanation: '1.25 × 8 = 10，这是常用凑整算式。' },
  ].map(q => ({ ...MATH5, type: 'blank', ...q, level: 'L4', tags: ['计算'] })),

  // ---------- 数学五年级 · 问答 ----------
  ...[
    { content: '一块平行四边形广告牌，底是 6 米，高是 4 米。它的面积是多少平方米？', correct: '6 × 4 = 24（平方米）。答：面积是 24 平方米。', explanation: '平行四边形面积 = 底 × 高。' },
    { content: '甲、乙两数的和是 48，甲数是乙数的 2 倍。甲、乙两数各是多少？', correct: '乙数 = 48 ÷ (2 + 1) = 16，甲数 = 16 × 2 = 32。答：甲数是 32，乙数是 16。', explanation: '和倍问题：小数 = 和 ÷ (倍数 + 1)。' },
  ].map(q => ({ ...MATH5, type: 'essay', ...q, level: 'L5', tags: ['应用'] })),

  // ---------- 信息科技三年级 · 单选 ----------
  ...[
    { content: '计算机的"大脑"是哪一个部件？', options: ['显示器', '中央处理器（CPU）', '键盘', '鼠标'], correct: 'B', explanation: 'CPU（中央处理器）负责运算和控制，相当于计算机的大脑。' },
    { content: '下列哪个设备属于输入设备？', options: ['显示器', '打印机', '键盘', '音箱'], correct: 'C', explanation: '键盘把信息输入计算机，是输入设备；其余都是输出设备。' },
    { content: '编辑好的文件用完后应该（　）。', options: ['直接关机', '正确保存并关闭', '随手删除', '重命名'], correct: 'B', explanation: '先保存再关闭，避免数据丢失。' },
    { content: '电脑桌面上的小图片叫（　）。', options: ['图标', '文件夹', '窗口', '菜单'], correct: 'A', explanation: '桌面上的小图片是程序或文件的图标。' },
    { content: '想输入汉字，需要先把电脑切换到（　）。', options: ['大写锁定状态', '中文输入法', '静音状态', '飞行模式'], correct: 'B', explanation: '切换到中文输入法（如拼音输入法）才能输入汉字。' },
    { content: '关闭电脑的正确做法是（　）。', options: ['直接长按电源键', '通过系统的关机菜单正常关机', '拔掉电源插头', '晃动鼠标'], correct: 'B', explanation: '正常关机能保护系统和硬件，直接断电可能损坏数据。' },
    { content: '保存文件的常用快捷键是（　）。', options: ['Ctrl + S', 'Ctrl + C', 'Ctrl + V', 'Ctrl + Z'], correct: 'A', explanation: 'Ctrl + S 是保存，Ctrl + C 是复制，Ctrl + V 是粘贴。' },
    { content: '复制文件时，选中的文字或图片暂存在（　）里。', options: ['回收站', '剪贴板', '我的文档', '硬盘'], correct: 'B', explanation: '复制的内容暂存在剪贴板中，粘贴时取出来。' },
    { content: '下面哪种行为可能让电脑感染病毒？', options: ['使用正版软件', '随意打开陌生邮件的附件', '定期杀毒', '正常关机'], correct: 'B', explanation: '陌生邮件附件可能携带病毒，不要随意打开。' },
    { content: '想把屏幕上的内容展示给全班同学看，可以把电脑连接到（　）。', options: ['投影仪', '打印机', '音箱', '扫描仪'], correct: 'A', explanation: '投影仪可以把电脑画面放大显示出来。' },
  ].map(q => ({ ...IT3, type: 'single', ...q, level: 'L2', tags: ['信息意识'] })),

  // ---------- 信息科技三年级 · 判断 ----------
  ...[
    { content: '鼠标是计算机的输出设备。', correct: 'false', explanation: '鼠标用来输入指令，是输入设备。' },
    { content: '电脑长时间不用时，应该正常关机。', correct: 'true', explanation: '正常关机既省电又能保护电脑。' },
    { content: '随意删除别人电脑里的文件是没有礼貌的行为。', correct: 'true', explanation: '要尊重他人的劳动成果和隐私，不能随意删除。' },
    { content: '显示器是计算机的输出设备。', correct: 'true', explanation: '显示器把计算机处理的结果显示出来，是输出设备。' },
    { content: '任何网站都可以随便填写自己的真实个人信息。', correct: 'false', explanation: '要注意保护个人隐私，不能随便在陌生网站填写真实信息。' },
    { content: '按 Ctrl + Z 可以撤销上一步操作。', correct: 'true', explanation: 'Ctrl + Z 是常用的撤销快捷键。' },
    { content: '开机时应该先开显示器，再开主机。', correct: 'true', explanation: '先开外设（显示器），再开主机，可以保护主机电源。' },
  ].map(q => ({ ...IT3, type: 'true_false', ...q, level: 'L2', tags: ['信息社会责任'] })),

  // ---------- 信息科技三年级 · 多选 ----------
  ...[
    { content: '下列哪些属于输入设备？（多选）', options: ['键盘', '鼠标', '麦克风', '音箱'], correct: ['A', 'B', 'C'], explanation: '键盘、鼠标、麦克风都把信息送入电脑；音箱是输出设备。' },
    { content: '使用电脑的好习惯有哪些？（多选）', options: ['坐姿端正', '定时休息', '长时间玩游戏', '注意保护眼睛'], correct: ['A', 'B', 'D'], explanation: '正确用眼、劳逸结合才是好习惯；长时间玩游戏有害健康。' },
  ].map(q => ({ ...IT3, type: 'multiple', ...q, level: 'L2', tags: ['健康用机'] })),

  // ---------- 信息科技三年级 · 问答 ----------
  ...[
    { content: '请说出计算机的主要组成部分（至少写出 3 个）。', correct: '答出中央处理器（CPU）、显示器、键盘、鼠标、主机、内存、硬盘等其中的 3 个即可。', explanation: '计算机由硬件和软件组成，常见硬件有 CPU、显示器、键盘、鼠标等。' },
    { content: '如果电脑突然死机了，你应该怎么做？请说出至少一种处理办法。', correct: '可以先等待片刻；或按 Ctrl + Alt + Delete 打开任务管理器，结束无响应的程序；必要时再正常重启电脑。', explanation: '遇到死机不要拍打电脑，先等待或用软件方式处理。' },
  ].map(q => ({ ...IT3, type: 'essay', ...q, level: 'L3', tags: ['问题解决'] })),
];

// ============================================================================
// 卷子定义
// 每份卷子：从对应题池中按题型顺序取题（同一科目年级共享题池，不同卷子取不同子集）
// ============================================================================

// 从已按题型过滤的题池中循环抽取指定数量的题目
function pick(pool, count, offset = 0) {
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(pool[(offset + i) % pool.length]);
  }
  return picked;
}

const PAPERS = [
  // ---------- 数学练习（蒋磊创建） ----------
  {
    title: '【练习】三年级数学基础练习（一）',
    description: '三年级数学上学期基础知识巩固：口算、单位换算与简单应用。',
    subject: '数学', grade: '三年级', type: 'practice', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L2', duration: 40, passRatio: 0.6,
    composition: [
      [MATH3, 'single', 4], [MATH3, 'true_false', 3], [MATH3, 'blank', 1], [MATH3, 'essay', 2],
    ],
    scorePerQuestion: 10,
  },
  {
    title: '【练习】三年级数学巩固练习（二）',
    description: '三年级数学提高巩固：乘除法巧算、图形与质量单位综合。',
    subject: '数学', grade: '三年级', type: 'practice', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L3', duration: 40, passRatio: 0.6,
    composition: [
      [MATH3, 'single', 4, 4], [MATH3, 'true_false', 3, 4], [MATH3, 'multiple', 2], [MATH3, 'essay', 1, 2],
    ],
    scorePerQuestion: 10,
  },
  {
    title: '【练习】四年级数学期中复习',
    description: '四年级数学期中复习：大数的认识、角的度量与平均数。',
    subject: '数学', grade: '四年级', type: 'practice', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L3', duration: 45, passRatio: 0.6,
    composition: [
      [MATH4, 'single', 5], [MATH4, 'true_false', 3], [MATH4, 'blank', 1], [MATH4, 'essay', 1],
    ],
    scorePerQuestion: 10,
  },
  {
    title: '【练习】五年级数学综合练习',
    description: '五年级数学综合：小数乘除法、简易方程与多边形面积。',
    subject: '数学', grade: '五年级', type: 'practice', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L4', duration: 45, passRatio: 0.6,
    composition: [
      [MATH5, 'single', 5], [MATH5, 'true_false', 3], [MATH5, 'multiple', 1], [MATH5, 'essay', 1],
    ],
    scorePerQuestion: 10,
  },
  // ---------- 信息科技练习（韩雪创建，验证同校共享） ----------
  {
    title: '【练习】三年级信息科技基础入门',
    description: '认识计算机的组成、正确开关机与良好用机习惯。',
    subject: '信息科技', grade: '三年级', type: 'practice', creator: TEACHER_YY_PS_IT,
    abilityLevel: 'L2', duration: 30, passRatio: 0.6,
    composition: [
      [IT3, 'single', 3], [IT3, 'true_false', 3], [IT3, 'multiple', 1], [IT3, 'essay', 1],
    ],
    scorePerQuestion: 10,
  },
  // ---------- 测评 ----------
  {
    title: '【测评】三年级数学期中综合测评',
    description: '三年级数学期中综合测评，涵盖计算、概念与应用三大板块，请认真作答。',
    subject: '数学', grade: '三年级', type: 'assessment', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L3', duration: 60, passRatio: 0.6,
    composition: [
      [MATH3, 'single', 8], [MATH3, 'true_false', 4], [MATH3, 'blank', 2], [MATH3, 'essay', 1],
    ],
    scorePerQuestion: 8,
  },
  {
    title: '【测评】三年级信息科技期末测评',
    description: '三年级信息科技期末测评：计算机组成、信息安全与上机习惯。',
    subject: '信息科技', grade: '三年级', type: 'assessment', creator: TEACHER_YY_PS_IT,
    abilityLevel: 'L2', duration: 45, passRatio: 0.6,
    composition: [
      [IT3, 'single', 5], [IT3, 'true_false', 4], [IT3, 'multiple', 1], [IT3, 'essay', 2],
    ],
    scorePerQuestion: 10,
  },
  // ---------- E2E 回归种子（标题与 allow_retake 必须保持不变） ----------
  {
    title: '【测试】学生答题流程测试活动',
    description: '用于学生答题流程回归测试的活动',
    subject: '数学', grade: '三年级', type: 'practice', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L2', duration: 60, passRatio: 0.6, allowRetake: true, maxAttempts: 5,
    composition: [
      [MATH3, 'single', 2], [MATH3, 'true_false', 2], [MATH3, 'essay', 1],
    ],
    scorePerQuestion: 10,
  },
  {
    title: '【完整流程测试】测试活动',
    description: '完整流程回归测试：开始答题、作答、提交、查看结果',
    subject: '数学', grade: '三年级', type: 'practice', creator: TEACHER_YY_PS_MATH,
    abilityLevel: 'L3', duration: 60, passRatio: 0.6, allowRetake: true, maxAttempts: 5,
    composition: [
      [MATH3, 'single', 2], [MATH3, 'true_false', 2], [MATH3, 'essay', 1],
    ],
    scorePerQuestion: 10,
  },
];

// ============================================================================
// 清理阶段
// ============================================================================

async function clean() {
  // 事务性数据：按外键依赖顺序删除（子表在前）
  const statements = [
    `DELETE FROM answers`,
    `DELETE FROM code_submissions`,
    `DELETE FROM assessment_registrations`,
    `DELETE FROM student_activities`,
    `DELETE FROM certificates`,
    `DELETE FROM questions`,            // 旧版考试题目表（遗留）
    `DELETE FROM activity_questions`,
    `DELETE FROM activity_history`,
    `DELETE FROM teaching_class_activities`,
    `DELETE FROM assessment_locations`,
    `DELETE FROM judge_queue`,
    `DELETE FROM question_reviews`,
    `DELETE FROM question_bank`,
    `DELETE FROM test_cases`,
    `DELETE FROM student_question_practice`,
    `DELETE FROM question_drafts`,
    `DELETE FROM daily_question_sets`,
    `DELETE FROM student_daily_tasks`,
    `DELETE FROM task_completion_history`,
    `DELETE FROM achievement_progress`,
    `DELETE FROM student_achievements`,
    `DELETE FROM points_transactions`,
    `DELETE FROM leaderboards`,
    `DELETE FROM district_ability_stats`,
    `DELETE FROM user_notifications`,
    `DELETE FROM notification_reads`,
    `DELETE FROM registration_audit_log`,
    `DELETE FROM student_login_history`,
    `DELETE FROM audit_logs`,
    `DELETE FROM import_logs`,
    `DELETE FROM student_wrong_questions`,
    `DELETE FROM teacher_permissions`,
    `DELETE FROM teaching_class_approvals`,
    `DELETE FROM teaching_class_activities`,
    `DELETE FROM teaching_class_members`,
    `DELETE FROM teaching_class_teachers`,
    `DELETE FROM teaching_classes`,
    `DELETE FROM activities`,
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      // 部分表可能不存在（不同部署版本），跳过
      if (err.code !== '42P01') throw err;
      console.log(`  跳过不存在的表: ${sql.slice(7, sql.indexOf('SET') > 0 ? sql.indexOf('SET') : 60)}`);
    }
  }

  // 重置序列，让新数据从干净的 ID 开始
  const seqTables = [
    'activities', 'activity_questions', 'question_drafts', 'question_bank',
    'student_activities', 'answers', 'question_reviews', 'certificates',
    'points_transactions', 'achievement_progress', 'student_achievements',
    'daily_question_sets', 'activity_history', 'user_notifications',
    'student_wrong_questions', 'teacher_permissions',
    'teaching_classes', 'teaching_class_members', 'teaching_class_teachers',
    'teaching_class_activities', 'teaching_class_approvals',
  ];
  for (const t of seqTables) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('${t}', 'id'), 1, false)`
    ).catch(() => {});
  }

  // 学生积分账户：确保人人有账户并清零（保留账户行，避免前端 404）
  await pool.query(`INSERT INTO student_points (student_id) SELECT id FROM students ON CONFLICT DO NOTHING`);
  await pool.query(`UPDATE student_points SET current_points = 0, total_points = 0, spent_points = 0, frozen_points = 0`);

  console.log('✓ 清理完成：活动、答卷、题库、积分流水等事务性数据已清空');
}

// ============================================================================
// 生成阶段
// ============================================================================

async function seedQuestions() {
  const idMap = new Map(); // QUESTIONS 数组下标 → question_bank.id
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const draft = await pool.query(
      `INSERT INTO question_drafts
        (type, subject, grade, content, options, correct_answer, explanation,
         difficulty, level, suggested_score, abilities, tags, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10,
         $11::text[], $12::text[], $13, true)
       RETURNING id`,
      [
        q.type, q.subject, q.grade, q.content,
        q.options ? JSON.stringify(q.options) : null,
        JSON.stringify(q.correct),
        q.explanation || null,
        q.difficulty || 'medium',
        q.level || 'L2',
        10,
        q.abilities
          || (ABILITY_BY_SUBJECT_TYPE[q.subject] && ABILITY_BY_SUBJECT_TYPE[q.subject][q.type])
          || [],
        q.tags || [],
        q.creator || TEACHER_YY_PS_MATH,
      ]
    );
    const draftId = draft.rows[0].id;

    const bank = await pool.query(
      `INSERT INTO question_bank
        (draft_id, scope, status, reviewer_id, published_by, published_at, is_active, usage_count)
       VALUES ($1, 'practice_municipal', 'published', $2, $2, CURRENT_TIMESTAMP, true, 0)
       RETURNING id`,
      [draftId, q.creator || TEACHER_YY_PS_MATH]
    );
    idMap.set(i, bank.rows[0].id);
  }
  console.log(`✓ 题库重建完成：${QUESTIONS.length} 道题目（含完整选项/答案/解析）`);
  return idMap;
}

async function seedActivities(idMap) {
  const usedQuestionIds = new Set();
  let activityCount = 0;

  for (const paper of PAPERS) {
    // 按题型组成卷面题目
    const paperQuestions = [];
    const offsets = {};
    const allQuestions = QUESTIONS.map((q, i) => ({ ...q, __i: i }));
    for (const [poolDef, type, count, offset = 0] of paper.composition) {
      const key = poolDef.subject + poolDef.grade + ':' + type;
      const actualOffset = offsets[key] ?? offset;
      const typedPool = allQuestions.filter(q =>
        q.subject === poolDef.subject && q.grade === poolDef.grade && q.type === type
      );
      if (typedPool.length < count) {
        throw new Error(`题池不足: ${poolDef.subject}/${poolDef.grade}/${type} 需要 ${count} 道，仅有 ${typedPool.length} 道`);
      }
      paperQuestions.push(...pick(typedPool, count, actualOffset));
      offsets[key] = actualOffset + count;
    }

    const totalScore = paperQuestions.length * paper.scorePerQuestion;
    const passScore = Math.round(totalScore * paper.passRatio);

    // 时间模型（check 约束）：unlimited 不允许 duration/start/end；timed 必须有 duration
    const isAssessment = paper.type === 'assessment';
    const timeLimitType = isAssessment ? 'timed' : 'unlimited';
    const duration = isAssessment ? paper.duration : null;

    const activity = await pool.query(
      `INSERT INTO activities
        (title, description, subject, grade, duration, total_score, pass_score,
         status, created_by, type, ability_level, scope, allow_retake, max_attempts,
         is_official, target_audience, certificate_config, time_limit_type,
         registration_enabled, question_count, paper_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, $9, $10, 'system',
         $11, $12, false, '{"grades": [], "classes": [], "schools": []}'::jsonb,
         '{"enabled": false, "template": null}'::jsonb, $13, false, $14, 'completed')
       RETURNING id`,
      [
        paper.title, paper.description, paper.subject, paper.grade,
        duration, totalScore, passScore, paper.creator, paper.type,
        paper.abilityLevel, !!paper.allowRetake, paper.maxAttempts || 1,
        timeLimitType, paperQuestions.length,
      ]
    );
    const activityId = activity.rows[0].id;

    for (let i = 0; i < paperQuestions.length; i++) {
      const q = paperQuestions[i];
      const bankId = idMap.get(q.__i);
      await pool.query(
        `INSERT INTO activity_questions (activity_id, question_id, order_index, score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [activityId, bankId, i + 1, paper.scorePerQuestion]
      );
      usedQuestionIds.add(bankId);
    }

    activityCount++;
    console.log(`  ✓ ${paper.title}（${paperQuestions.length} 题 / ${totalScore} 分 / created_by=${paper.creator}）`);
  }

  console.log(`✓ 活动与测评重建完成：${activityCount} 份完整卷子`);
  console.log(`  题库利用率：${usedQuestionIds.size} / ${QUESTIONS.length} 道题目已被卷子引用`);
}

// ============================================================================
// 业务流转演示数据：草稿箱 / 待审核 / 审核权限 / 错题集 / 教学班
// ============================================================================

async function seedWorkflows(idMap) {
  const creator = TEACHER_YY_PS_MATH;

  // ---------- 6. 草稿箱：6 道未提交的草稿 ----------
  const drafts = [
    { subject: '数学', grade: '三年级', type: 'single', content: '下面哪组线段能围成三角形？', options: ['2cm、3cm、6cm', '3cm、4cm、5cm', '1cm、2cm、4cm', '2cm、2cm、5cm'], correct: 'B', explanation: '三角形两边之和必须大于第三边，只有 3+4>5 满足。', difficulty: 'medium', level: 'L3', tags: ['三角形'] },
    { subject: '数学', grade: '三年级', type: 'essay', content: '鸡兔同笼，共有 8 个头、22 只脚。鸡和兔各有几只？', correct: '假设全是鸡：8 × 2 = 16 只脚，比实际少 22 - 16 = 6 只；每只兔比鸡多 2 只脚，兔 = 6 ÷ 2 = 3 只，鸡 = 8 - 3 = 5 只。', explanation: '经典鸡兔同笼，可用假设法求解。', difficulty: 'hard', level: 'L5', tags: ['应用题'] },
    { subject: '数学', grade: '四年级', type: 'single', content: '一条平角是多少度？', options: ['90°', '180°', '270°', '360°'], correct: 'B', explanation: '平角等于 180°。', difficulty: 'easy', level: 'L3', tags: ['角'] },
    { subject: '数学', grade: '五年级', type: 'blank', content: '把 1 平均分成 4 份，每份是（　）。（填分数）', correct: '1/4|四分之一', explanation: '分数单位的概念。', difficulty: 'medium', level: 'L4', tags: ['分数'] },
    { subject: '信息科技', grade: '三年级', type: 'single', content: '下列哪个是常用的网页浏览器？', options: ['Word', 'Chrome', 'Excel', 'PowerPoint'], correct: 'B', explanation: 'Chrome 是浏览器，其余是办公软件。', difficulty: 'easy', level: 'L2', tags: ['网络'] },
    { subject: '信息科技', grade: '三年级', type: 'true_false', content: '为了安全，账号密码应该定期更换，并且不要告诉别人。', correct: 'true', explanation: '保护账号安全的基本习惯。', difficulty: 'easy', level: 'L2', tags: ['信息安全'] },
  ];

  for (const d of drafts) {
    await pool.query(
      `INSERT INTO question_drafts
        (type, subject, grade, content, options, correct_answer, explanation,
         difficulty, level, tags, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10::text[], $11, true)`,
      [d.type, d.subject, d.grade, d.content,
       d.options ? JSON.stringify(d.options) : null,
       JSON.stringify(d.correct), d.explanation || null,
       d.difficulty || 'medium', d.level || 'L2', d.tags || [], creator]
    );
  }
  console.log(`✓ 草稿箱：${drafts.length} 道草稿（含数学/信息科技多题型）`);

  // ---------- 7. 我的提交 + 待我审核：3 道待审核题目 ----------
  // scope = practice_school_6（云岩一小校级题库），审核人 = 蒋磊本人
  const pendingSubmissions = [
    { subject: '数学', grade: '三年级', type: 'single', content: '<p>3 千米 200 米 = （　）米。</p><p><strong>提示：</strong>1 千米 = 1000 米。</p>', options: ['32', '302', '3200', '320'], correct: 'C', explanation: '3 千米 = 3000 米，加 200 米等于 3200 米。', difficulty: 'easy', level: 'L2', tags: ['单位换算'] },
    { subject: '数学', grade: '三年级', type: 'essay', content: '妈妈带 50 元去超市，买了一箱牛奶花 38 元。收银员应找回多少元？', correct: '50 - 38 = 12（元）。答：应找回 12 元。', explanation: '购物找零用减法。', difficulty: 'easy', level: 'L2', tags: ['应用'] },
    { subject: '信息科技', grade: '三年级', type: 'single', content: '发送电子邮件时，必须要知道对方的（　）。', options: ['家庭住址', '电子邮箱地址', '电话号码', '身份证号'], correct: 'B', explanation: '电子邮件需要知道对方的邮箱地址才能发送。', difficulty: 'easy', level: 'L2', tags: ['网络通信'] },
  ];

  for (const d of pendingSubmissions) {
    const draft = await pool.query(
      `INSERT INTO question_drafts
        (type, subject, grade, content, options, correct_answer, explanation,
         difficulty, level, tags, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10::text[], $11, true)
       RETURNING id`,
      [d.type, d.subject, d.grade, d.content,
       d.options ? JSON.stringify(d.options) : null,
       JSON.stringify(d.correct), d.explanation || null,
       d.difficulty, d.level, d.tags || [], creator]
    );
    await pool.query(
      `INSERT INTO question_bank
        (draft_id, scope, status, reviewer_id, published_by, published_at, is_active)
       VALUES ($1, 'practice_school_6', 'pending_review', $2, $2, CURRENT_TIMESTAMP, true)`,
      [draft.rows[0].id, creator]
    );
  }
  console.log('✓ 我的提交：3 道待审核题目（提交到云岩一小校级题库，审核人=蒋磊）');

  // ---------- 8. 审核权限 ----------
  // 蒋磊：云岩一小校级审核（校级发布无需审核人，此权限用于工作台展示）
  await pool.query(
    `INSERT INTO teacher_permissions (user_id, permission_type, subjects, granted_by, notes, is_active)
     VALUES ($1, 'practice_school_manage', $2::text[], 1, '演示数据：云岩一小校级审核权限', true)`,
    [creator, ['数学', '信息科技']]
  );
  // 韩雪：云岩区区级审核人（区级题库提交时出现在审核人下拉中）
  await pool.query(
    `INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, district_id, granted_by, notes, is_active)
     VALUES ($1, 'practice_district_manage', $2::text[], 'district', 1, 1, '演示数据：云岩区区级审核权限', true)`,
    [TEACHER_YY_PS_IT, ['数学', '信息科技']]
  );
  // 曹斌（云岩一中数学，user 26）：云岩区区级审核人（E2E R405 依赖其出现在审核人下拉中）
  await pool.query(
    `INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, district_id, granted_by, notes, is_active)
     VALUES (26, 'practice_district_manage', ARRAY['数学','信息科技']::text[], 'district', 1, 1, '演示数据：云岩区区级审核权限（数学/信息科技）', true)`
  );
  // 曹斌：测评题库审核人（E2E R409 依赖其出现在测评题库审核人下拉中）
  await pool.query(
    `INSERT INTO teacher_permissions (user_id, permission_type, subjects, scope_level, granted_by, notes, is_active)
     VALUES (26, 'assessment_manage', ARRAY['数学','信息科技']::text[], 'municipal', 1, '演示数据：测评题库审核权限', true)`
  );
  console.log('✓ 审核权限：蒋磊校级审核 + 韩雪/曹斌云岩区区级审核 + 曹斌测评题库审核');

  // ---------- 9. 错题集：张小明的数学错题 ----------
  // 学生账号 13800138003（张小明）的 users.id = 30；错题引用种子题库中的题目
  const wrongDefs = [
    { contentLike: '下面哪个数是奇数', errorCount: 2, knowledge: ['数的奇偶性'] },
    { contentLike: '1 千米等于多少米', errorCount: 1, knowledge: ['长度单位'] },
    { contentLike: '钟面上时针从 3 走到 5', errorCount: 1, knowledge: ['时间认识'] },
    { contentLike: '每盒铅笔有 6 支', errorCount: 3, knowledge: ['乘法应用'] },
    { contentLike: '一个长方形长 8 厘米', errorCount: 1, knowledge: ['周长计算'] },
  ];
  for (const w of wrongDefs) {
    const q = await pool.query(
      `SELECT qb.id AS bank_id, qb.draft_id, qd.difficulty
       FROM question_bank qb
       JOIN question_drafts qd ON qd.id = qb.draft_id
       WHERE qd.content LIKE $1 AND qb.status = 'published' AND qb.is_active = true
       LIMIT 1`,
      [w.contentLike + '%']
    );
    if (q.rows.length === 0) {
      console.log(`  ⚠ 未找到错题引用的题目: ${w.contentLike}`);
      continue;
    }
    const row = q.rows[0];
    await pool.query(
      `INSERT INTO student_wrong_questions
        (student_id, question_id, draft_id, subject, knowledge_points, difficulty,
         error_count, review_count, first_wrong_at, last_wrong_at, source_activity_id, status)
       VALUES ($1, $2, $3, '数学', $4::text[], $5, $6, 0,
         CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day',
         (SELECT id FROM activities WHERE title LIKE '%基础练习（一）%' LIMIT 1), 'active')`,
      [30, row.bank_id, row.draft_id, w.knowledge, row.difficulty, w.errorCount]
    );
  }
  console.log('✓ 错题集：张小明新增 5 道数学错题（含错误次数与知识点）');

  // ---------- 10. 教学班：两个已批准的教学班 ----------
  // 班级 1：蒋磊的三年级数学教学班（云岩一小）
  const class1 = await pool.query(
    `INSERT INTO teaching_classes
      (name, description, scope, school_id, subject, grade, academic_year, status, created_by, approved_by, approved_at)
     VALUES ('云岩一小三年级(1)班数学教学班', '三年级数学课堂教学与练习辅导',
       'school', 6, '数学', '三年级', '2025-2026', 'approved', $1, 1, CURRENT_TIMESTAMP)
     RETURNING id`,
    [creator]
  );
  // 班级 2：韩雪的三年级信息科技教学班（云岩一小）
  const class2 = await pool.query(
    `INSERT INTO teaching_classes
      (name, description, scope, school_id, subject, grade, academic_year, status, created_by, approved_by, approved_at)
     VALUES ('云岩一小三年级信息科技教学班', '三年级信息科技基础教学',
       'school', 6, '信息科技', '三年级', '2025-2026', 'approved', $1, 1, CURRENT_TIMESTAMP)
     RETURNING id`,
    [TEACHER_YY_PS_IT]
  );
  const c1 = class1.rows[0].id;
  const c2 = class2.rows[0].id;

  // 任课教师（teachers 表行 id：user 24 → 13，user 25 → 14）
  await pool.query(
    `INSERT INTO teaching_class_teachers (teaching_class_id, teacher_id, role, is_active)
     VALUES ($1, 13, 'creator', true), ($2, 14, 'teacher', true)
     ON CONFLICT DO NOTHING`,
    [c1, c2]
  );

  // 学生成员（云岩一小：31 王明 / 32 李华 / 33 张伟，均为三年级）
  for (const sid of [31, 32, 33]) {
    await pool.query(
      `INSERT INTO teaching_class_members (teaching_class_id, student_id, is_active)
       VALUES ($1, $2, true), ($3, $2, true)
       ON CONFLICT DO NOTHING`,
      [c1, sid, c2]
    );
  }

  // 关联活动：数学教学班挂基础练习与期中测评
  await pool.query(
    `INSERT INTO teaching_class_activities (teaching_class_id, activity_id, assigned_by, is_required)
     SELECT $1, id, $2, true FROM activities
     WHERE title IN ('【练习】三年级数学基础练习（一）', '【测评】三年级数学期中综合测评')
     ON CONFLICT DO NOTHING`,
    [c1, creator]
  );
  await pool.query(
    `INSERT INTO teaching_class_activities (teaching_class_id, activity_id, assigned_by, is_required)
     SELECT $1, id, $2, true FROM activities
     WHERE title = '【练习】三年级信息科技基础入门'
     ON CONFLICT DO NOTHING`,
    [c2, TEACHER_YY_PS_IT]
  );
  console.log('✓ 教学班：2 个已批准教学班（数学/信息科技，各含任课教师、3 名学生与关联活动）');
}

async function seedAnalytics(idMap) {
  // 云岩一小两名学生（users.id 33=王明、34=李华）在「基础练习（一）」的历史答卷
  // 目的：为数据分析视图（v_school_ability_realtime）提供聚合数据源
  const targetTitle = '【练习】三年级数学基础练习（一）';
  const activity = await pool.query(
    `SELECT id, total_score FROM activities WHERE title = $1 AND status = 'published' LIMIT 1`,
    [targetTitle]
  );
  if (activity.rows.length === 0) {
    console.log('  ⚠ 未找到目标活动，跳过历史答卷生成');
    return;
  }
  const activityId = activity.rows[0].id;

  const aq = await pool.query(
    `SELECT question_id, score FROM activity_questions WHERE activity_id = $1 ORDER BY order_index`,
    [activityId]
  );
  const questions = aq.rows;
  if (questions.length === 0) {
    console.log('  ⚠ 目标活动无题目，跳过历史答卷生成');
    return;
  }

  // 每个学生的正确率（影响统计图表的多样性）
  const students = [
    { userId: 33, name: '王明', correctRatio: 0.8 },
    { userId: 34, name: '李华', correctRatio: 0.5 },
  ];

  for (const stu of students) {
    const sa = await pool.query(
      `INSERT INTO student_activities
        (student_id, activity_id, status, start_time, started_at, submit_time,
         score, grading_status, attempt_number, ip_address)
       VALUES ($1, $2, 'graded', CURRENT_TIMESTAMP - INTERVAL '2 days',
         CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '25 minutes',
         0, 'pending', 1, '192.168.1.100')
       RETURNING id`,
      [stu.userId, activityId]
    );
    const saId = sa.rows[0].id;

    let total = 0;
    let idx = 0;
    for (const q of questions) {
      const isEssay = idx >= questions.length - 2; // 最后两题为主观题
      const isCorrect = !isEssay && (idx % 10) / 10 < stu.correctRatio;
      const score = isCorrect ? parseFloat(q.score) : isEssay ? parseFloat(q.score) * 0.6 : 0;
      total += score;
      await pool.query(
        `INSERT INTO answers
          (student_exam_id, question_id, answer, is_correct, score, auto_score,
           grading_status, graded_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
           CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days',
           CURRENT_TIMESTAMP - INTERVAL '2 days')`,
        [
          saId, q.question_id,
          isEssay ? '略。学生作答内容。' : isCorrect ? 'A' : 'B',
          isEssay ? null : isCorrect,
          score, isEssay ? null : score,
          isEssay ? 'pending' : 'auto_graded',
        ]
      );
      idx++;
    }

    // 客观题总分写入，主观题待批（进入教师评卷列表）
    await pool.query(
      `UPDATE student_activities
       SET score = $2, grading_status = 'partial_graded'
       WHERE id = $1`,
      [saId, total]
    );
    console.log(`  ✓ ${stu.name} 历史答卷：${questions.length} 题，得分 ${total}`);
  }
  console.log('✓ 数据分析历史数据：2 份云岩一小学生答卷已生成');
}

async function verify() {
  const r = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM activities WHERE paper_status = 'completed') AS complete_papers,
      (SELECT COUNT(*) FROM activities a WHERE a.question_count > 0) AS papers_with_questions,
      (SELECT COALESCE(MIN(cnt), 0) FROM (
         SELECT a.id, COUNT(aq.question_id) cnt
         FROM activities a LEFT JOIN activity_questions aq ON aq.activity_id = a.id
         WHERE a.status = 'published' GROUP BY a.id
       ) s) AS min_questions_per_published,
      (SELECT COUNT(*) FROM question_bank WHERE status = 'published' AND is_active = true) AS published_questions
  `);
  const row = r.rows[0];
  console.log('\n===== 数据自检 =====');
  console.log(`完整卷子（paper_status=completed）: ${row.complete_papers}`);
  console.log(`带题目的活动: ${row.papers_with_questions}`);
  console.log(`已发布活动的最少题数: ${row.min_questions_per_published}`);
  console.log(`已发布题目总数: ${row.published_questions}`);

  if (Number(row.min_questions_per_published) < 4) {
    throw new Error('存在题数过少的已发布活动！');
  }
}

async function main() {
  console.log('开始重建演示数据…\n');
  await clean();
  await seedSubjects();
  const idMap = await seedQuestions();
  await seedActivities(idMap);
  await seedWorkflows(idMap);
  await seedAnalytics(idMap);
  await verify();
  await pool.end();
  console.log('\n全部完成。');
}

main().catch(async (err) => {
  console.error('种子脚本执行失败:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
