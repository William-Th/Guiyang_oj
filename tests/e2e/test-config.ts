export const STORAGE_STATE = 'tests/.auth/user.json';
export const TEACHER_STORAGE_STATE = 'tests/.auth/teacher.json';
export const ADMIN_STORAGE_STATE = 'tests/.auth/admin.json';

export const TEST_CONFIG = {
  // Demo accounts from CLAUDE.md
  STUDENT: {
    phone: '13800138003',  // 学生使用手机号登录
    password: 'password123'
  },
  TEACHER: {
    username: 'teacher_yy_ps_math',
    password: 'password123'
  },
  TEACHER02: {
    username: 'teacher02',
    password: 'password123'
  },
  ADMIN: {
    username: 'admin',
    password: 'password123'
  }
};

export const TEST_TIMEOUTS = {
  NAVIGATION: 30000,
  ELEMENT_WAIT: 10000,
  API_RESPONSE: 15000
};

export const SELECTORS = {
  LOGIN: {
    STUDENT_TAB: 'text=学生入口',
    TEACHER_TAB: 'text=教师入口',
    ID_CARD_INPUT: 'input[placeholder="身份证号"]',
    PHONE_INPUT: 'input[placeholder="手机号"]',
    USERNAME_INPUT: 'input[placeholder="用户名"]',
    PASSWORD_INPUT: 'input[placeholder="密码"]',
    SUBMIT_BUTTON: 'button[type="submit"]'
  },
  NAVIGATION: {
    HOME_LINK: 'text=首页',
    EXAMS_LINK: 'text=考试列表',
    RESULTS_LINK: 'text=成绩查询',
    PROFILE_LINK: 'text=个人信息',
    ADMIN_LINK: 'text=管理后台'
  }
};
