/**
 * 科目配置文件
 * 统一管理系统中所有科目的定义，包括年级和能力等级
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
 * 小学和初中年级选项（一年级到九年级，不含高中）
 */
const GRADES_PRIMARY_AND_MIDDLE: Option[] = ALL_GRADES.slice(0, 9); // 索引0-8：一年级到九年级

/**
 * 三年级到九年级（不含高中）
 */
const GRADES_3_TO_9: Option[] = ALL_GRADES.slice(2, 9); // 索引2-8：三年级到九年级

/**
 * 数学能力等级（7个等级）
 */
const MATH_ABILITY_LEVELS: Option[] = [
  { value: 'L1', label: 'L1 - 基础运算' },
  { value: 'L2', label: 'L2 - 基础理解' },
  { value: 'L3', label: 'L3 - 综合运用' },
  { value: 'L4', label: 'L4 - 问题解决' },
  { value: 'L5', label: 'L5 - 逻辑推理' },
  { value: 'L6', label: 'L6 - 创新应用' },
  { value: 'L7', label: 'L7 - 拓展探究' },
];

/**
 * 信息科技能力等级（7个等级）
 */
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
 * 当前配置：数学（一年级-九年级）、信息科技（三年级-九年级）
 */
export const SUBJECT_CONFIGS: SubjectConfig[] = [
  {
    value: '数学',
    label: '数学',
    grades: GRADES_PRIMARY_AND_MIDDLE,
    abilityLevels: MATH_ABILITY_LEVELS,
  },
  {
    value: '信息科技',
    label: '信息科技',
    grades: GRADES_3_TO_9,
    abilityLevels: IT_ABILITY_LEVELS,
  },
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
