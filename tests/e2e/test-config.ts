export const STORAGE_STATE = 'tests/.auth/user.json';
export const TEACHER_STORAGE_STATE = 'tests/.auth/teacher.json';
export const ADMIN_STORAGE_STATE = 'tests/.auth/admin.json';

export const TEST_CONFIG = {
  // Demo accounts from CLAUDE.md
  STUDENT: {
    idCard: '520102200801011234',
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
    USERNAME_INPUT: 'input[placeholder="用户�?]',
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
