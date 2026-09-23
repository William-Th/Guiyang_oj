/**
 * 科目配置文件
 * 统一管理系统中所有科目的定义，包括年级和能力等级
 *
 * 科目范围依据教育部《义务教育课程方案（2022年版）》与《普通高中课程方案》：
 * 义务教育：语文、数学、英语、道德与法治、科学、历史、地理、物理、化学、生物学、信息科技
 * 普通高中：语文、数学、英语、思想政治、历史、地理、物理、化学、生物学、信息技术
 * （体育与健康、劳动、艺术等非纸笔测评科目暂不纳入）
 */

export interface Option {
  value: string;
  label: string;
}

export interface SubjectConfig {
  value: string;
  label: string;
  grades: Option[];        // 该科目支持的年级
  abilityLevels: Option[]; // 该科目的能力等级
}

/**
 * 所有年级选项
 */
const ALL_GRADES: Option[] = [
  { value: '一年级', label: '一年级' },
  { value: '二年级', label: '二年级' },
  { value: '三年级', label: '三年级' },
  { value: '四年级', label: '四年级' },
  { value: '五年级', label: '五年级' },
  { value: '六年级', label: '六年级' },
  { value: '七年级', label: '七年级' },
  { value: '八年级', label: '八年级' },
  { value: '九年级', label: '九年级' },
  { value: '高一', label: '高一' },
  { value: '高二', label: '高二' },
  { value: '高三', label: '高三' },
];

/**
 * 常用年级区间（基于 ALL_GRADES 的下标切片）
 */
const G_ALL = ALL_GRADES;                    // 一年级到高三
const G1_9 = ALL_GRADES.slice(0, 9);         // 一年级到九年级（义务教育）
const G3_12 = ALL_GRADES.slice(2);           // 三年级到高三（英语、信息科技等三年级起）
const G7_12 = ALL_GRADES.slice(6);           // 七年级到高三（历史、地理、生物学等）
const G8_12 = ALL_GRADES.slice(7);           // 八年级到高三（物理八年级起）
const G9_12 = ALL_GRADES.slice(8);           // 九年级到高三（化学九年级起）

/**
 * 各科目能力等级（7 个等级，L1-L7）
 */
const CHIN_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 识字与积累' },
  { value: 'L2', label: 'L2 - 阅读理解' },
  { value: 'L3', label: 'L3 - 口语交际' },
  { value: 'L4', label: 'L4 - 写作表达' },
  { value: 'L5', label: 'L5 - 文学鉴赏' },
  { value: 'L6', label: 'L6 - 思辨探究' },
  { value: 'L7', label: 'L7 - 综合运用' },
];

const MATH_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础运算' },
  { value: 'L2', label: 'L2 - 基础理解' },
  { value: 'L3', label: 'L3 - 综合运用' },
  { value: 'L4', label: 'L4 - 问题解决' },
  { value: 'L5', label: 'L5 - 逻辑推理' },
  { value: 'L6', label: 'L6 - 创新应用' },
  { value: 'L7', label: 'L7 - 拓展探究' },
];

const ENG_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 语音与词汇' },
  { value: 'L2', label: 'L2 - 听说理解' },
  { value: 'L3', label: 'L3 - 阅读理解' },
  { value: 'L4', label: 'L4 - 书面表达' },
  { value: 'L5', label: 'L5 - 语用交际' },
  { value: 'L6', label: 'L6 - 文化意识' },
  { value: 'L7', label: 'L7 - 综合运用' },
];

const MORAL_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 道德认知' },
  { value: 'L2', label: 'L2 - 规则意识' },
  { value: 'L3', label: 'L3 - 法治观念' },
  { value: 'L4', label: 'L4 - 责任意识' },
  { value: 'L5', label: 'L5 - 价值判断' },
  { value: 'L6', label: 'L6 - 实践运用' },
  { value: 'L7', label: 'L7 - 综合素养' },
];

const SCIENCE_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础认知' },
  { value: 'L2', label: 'L2 - 观察描述' },
  { value: 'L3', label: 'L3 - 实验探究' },
  { value: 'L4', label: 'L4 - 科学思维' },
  { value: 'L5', label: 'L5 - 问题解决' },
  { value: 'L6', label: 'L6 - 综合应用' },
  { value: 'L7', label: 'L7 - 创新实践' },
];

const HISTORY_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 史实认知' },
  { value: 'L2', label: 'L2 - 史料阅读' },
  { value: 'L3', label: 'L3 - 历史理解' },
  { value: 'L4', label: 'L4 - 历史解释' },
  { value: 'L5', label: 'L5 - 家国情怀' },
  { value: 'L6', label: 'L6 - 思辨探究' },
  { value: 'L7', label: 'L7 - 综合运用' },
];

const GEOGRAPHY_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 区域认知' },
  { value: 'L2', label: 'L2 - 图表判读' },
  { value: 'L3', label: 'L3 - 原理理解' },
  { value: 'L4', label: 'L4 - 综合思维' },
  { value: 'L5', label: 'L5 - 地理实践' },
  { value: 'L6', label: 'L6 - 问题解决' },
  { value: 'L7', label: 'L7 - 创新探究' },
];

const PHYSICS_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础概念' },
  { value: 'L2', label: 'L2 - 规律理解' },
  { value: 'L3', label: 'L3 - 实验探究' },
  { value: 'L4', label: 'L4 - 问题解决' },
  { value: 'L5', label: 'L5 - 模型建构' },
  { value: 'L6', label: 'L6 - 综合应用' },
  { value: 'L7', label: 'L7 - 创新探究' },
];

const CHEMISTRY_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础概念' },
  { value: 'L2', label: 'L2 - 实验操作' },
  { value: 'L3', label: 'L3 - 规律理解' },
  { value: 'L4', label: 'L4 - 问题解决' },
  { value: 'L5', label: 'L5 - 模型建构' },
  { value: 'L6', label: 'L6 - 综合应用' },
  { value: 'L7', label: 'L7 - 创新探究' },
];

const BIOLOGY_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础概念' },
  { value: 'L2', label: 'L2 - 生命观念' },
  { value: 'L3', label: 'L3 - 实验探究' },
  { value: 'L4', label: 'L4 - 科学思维' },
  { value: 'L5', label: 'L5 - 问题解决' },
  { value: 'L6', label: 'L6 - 综合应用' },
  { value: 'L7', label: 'L7 - 创新探究' },
];

const IT_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础认知' },
  { value: 'L2', label: 'L2 - 基本操作' },
  { value: 'L3', label: 'L3 - 编程入门' },
  { value: 'L4', label: 'L4 - 算法理解' },
  { value: 'L5', label: 'L5 - 程序设计' },
  { value: 'L6', label: 'L6 - 项目开发' },
  { value: 'L7', label: 'L7 - 创新实践' },
];

/**
 * 系统支持的科目配置
 * 依据教育部 2022 年版课程方案：义务教育 + 普通高中主学科
 * （体育与健康、劳动、艺术等非纸笔测评科目暂不纳入）
 */
export const SUBJECT_CONFIGS: SubjectConfig[] = [
  { value: '语文', label: '语文', grades: G_ALL, abilityLevels: CHIN_ABILITY_LEVELS },
  { value: '数学', label: '数学', grades: G_ALL, abilityLevels: MATH_ABILITY_LEVELS },
  { value: '英语', label: '英语', grades: G3_12, abilityLevels: ENG_ABILITY_LEVELS },
  { value: '道德与法治', label: '道德与法治', grades: G1_9, abilityLevels: MORAL_ABILITY_LEVELS },
  { value: '科学', label: '科学', grades: G1_9, abilityLevels: SCIENCE_ABILITY_LEVELS },
  { value: '信息科技', label: '信息科技', grades: G3_12, abilityLevels: IT_ABILITY_LEVELS },
  { value: '历史', label: '历史', grades: G7_12, abilityLevels: HISTORY_ABILITY_LEVELS },
  { value: '地理', label: '地理', grades: G7_12, abilityLevels: GEOGRAPHY_ABILITY_LEVELS },
  { value: '物理', label: '物理', grades: G8_12, abilityLevels: PHYSICS_ABILITY_LEVELS },
  { value: '化学', label: '化学', grades: G9_12, abilityLevels: CHEMISTRY_ABILITY_LEVELS },
  { value: '生物学', label: '生物学', grades: G7_12, abilityLevels: BIOLOGY_ABILITY_LEVELS },
];

/**
 * 获取所有科目的简单列表（用于科目选择器）
 */
export const SUBJECTS: Option[] = SUBJECT_CONFIGS.map(config => ({
  value: config.value,
  label: config.label,
}));

/**
 * 获取所有科目的值列表
 */
export const getSubjectValues = (): string[] => {
  return SUBJECTS.map(subject => subject.value);
};

/**
 * 根据值获取科目标签
 */
export const getSubjectLabel = (value: string): string => {
  const subject = SUBJECTS.find(s => s.value === value);
  return subject ? subject.label : value;
};

/**
 * 根据科目获取该科目支持的年级列表
 */
export const getGradesBySubject = (subjectValue: string): Option[] => {
  const config = SUBJECT_CONFIGS.find(s => s.value === subjectValue);
  return config ? config.grades : ALL_GRADES;
};

/**
 * 根据科目获取该科目的能力等级列表
 */
export const getAbilityLevelsBySubject = (subjectValue: string): Option[] => {
  const config = SUBJECT_CONFIGS.find(s => s.value === subjectValue);
  return config ? config.abilityLevels : [];
};

/**
 * 获取所有可能的年级（不区分科目）
 */
export const getAllGrades = (): Option[] => {
  return ALL_GRADES;
};

/**
 * 获取所有可能的能力等级（不区分科目，用于筛选）
 */
export const getAllAbilityLevels = (): Option[] => {
  return [
    { value: 'L1', label: 'L1' },
    { value: 'L2', label: 'L2' },
    { value: 'L3', label: 'L3' },
    { value: 'L4', label: 'L4' },
    { value: 'L5', label: 'L5' },
    { value: 'L6', label: 'L6' },
    { value: 'L7', label: 'L7' },
  ];
};
