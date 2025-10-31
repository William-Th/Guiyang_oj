const fs = require('fs');
const path = require('path');

class ConfigService {
  /**
   * 获取能力配置列表
   */
  static getAbilities() {
    try {
      const configPath = path.join(__dirname, '../../config/abilities.json');
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading abilities config:', error);
      throw new Error('Failed to load abilities configuration');
    }
  }

  /**
   * 获取区县配置列表
   */
  static getDistricts() {
    try {
      const configPath = path.join(__dirname, '../../config/districts.json');
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading districts config:', error);
      throw new Error('Failed to load districts configuration');
    }
  }

  /**
   * 获取学校配置列表
   */
  static getSchools() {
    try {
      const configPath = path.join(__dirname, '../../config/schools.json');
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading schools config:', error);
      throw new Error('Failed to load schools configuration');
    }
  }

  /**
   * 根据区县代码获取学校列表
   * @param {string} districtCode - 区县代码（如 YY, NM）
   */
  static getSchoolsByDistrict(districtCode) {
    const config = this.getSchools();
    const district = config.schools?.find(d => d.districtId === districtCode);

    if (!district || !district.schools) {
      return [];
    }

    return district.schools.map(school => ({
      ...school,
      districtId: district.districtId,
      districtName: district.districtName
    }));
  }

  /**
   * 根据学校代码获取学校信息
   * @param {string} schoolCode - 学校代码（如 YY-PS-01）
   */
  static getSchoolByCode(schoolCode) {
    const config = this.getSchools();

    for (const district of (config.schools || [])) {
      const school = district.schools?.find(s => s.code === schoolCode);
      if (school) {
        return {
          ...school,
          districtId: district.districtId,
          districtName: district.districtName
        };
      }
    }

    return null;
  }

  /**
   * 根据代码获取区县信息
   * @param {string} districtCode - 区县代码
   */
  static getDistrictByCode(districtCode) {
    const config = this.getDistricts();
    return config.districts?.find(d => d.code === districtCode) || null;
  }

  /**
   * 验证区县代码是否有效
   */
  static isValidDistrictCode(districtCode) {
    return this.getDistrictByCode(districtCode) !== null;
  }

  /**
   * 验证学校代码是否有效
   */
  static isValidSchoolCode(schoolCode) {
    return this.getSchoolByCode(schoolCode) !== null;
  }

  /**
   * 验证学校是否属于指定区县
   */
  static isSchoolInDistrict(schoolCode, districtCode) {
    const school = this.getSchoolByCode(schoolCode);
    return school && school.districtId === districtCode;
  }

  /**
   * 获取指定科目的知识点配置
   * @param {string} subject - 科目代码 (math, physics, chemistry, biology, computer)
   */
  static getKnowledgePointsBySubject(subject) {
    try {
      const configPath = path.join(__dirname, `../../config/knowledge-points-${subject}.json`);

      if (!fs.existsSync(configPath)) {
        return {
          subject: subject,
          subject_code: subject,
          knowledge_points: []
        };
      }

      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading knowledge points config for ${subject}:`, error);
      throw new Error(`Failed to load knowledge points configuration for ${subject}`);
    }
  }

  /**
   * 获取所有科目的知识点配置
   */
  static getAllKnowledgePoints() {
    const subjects = ['math', 'physics', 'chemistry', 'biology', 'computer'];
    const allKnowledgePoints = {};

    subjects.forEach(subject => {
      try {
        const config = this.getKnowledgePointsBySubject(subject);
        allKnowledgePoints[subject] = config;
      } catch (error) {
        console.error(`Error loading knowledge points for ${subject}:`, error);
        allKnowledgePoints[subject] = {
          subject: subject,
          subject_code: subject,
          knowledge_points: []
        };
      }
    });

    return allKnowledgePoints;
  }

  /**
   * 根据科目代码获取科目中文名称
   */
  static getSubjectName(subjectCode) {
    const subjectMap = {
      'math': '数学',
      'physics': '物理',
      'chemistry': '化学',
      'biology': '生物',
      'computer': '计算机'
    };
    return subjectMap[subjectCode] || subjectCode;
  }

  /**
   * 验证能力ID是否有效
   */
  static validateAbilityIds(abilityIds) {
    const config = this.getAbilities();
    const validIds = config.abilities.map(a => a.id);
    return abilityIds.every(id => validIds.includes(id));
  }

  /**
   * 验证知识点ID是否有效（针对特定科目）
   */
  static validateKnowledgePointIds(knowledgePointIds, subject) {
    const config = this.getKnowledgePointsBySubject(subject);
    const validIds = config.knowledge_points.map(kp => kp.id);
    return knowledgePointIds.every(id => validIds.includes(id));
  }
}

module.exports = ConfigService;
