/**
 * 题库管理基础路径。
 *
 * QuestionBankMain（含题库浏览/我的草稿/新建题目 Tab）同时挂载在
 * /admin/question-bank 与 /teacher/question-bank 两个前缀下，
 * 页内跳转必须跟随当前入口前缀，否则会被角色路由弹回首页。
 */
export const questionBankBasePath = (): string =>
  window.location.pathname.startsWith('/admin') ? '/admin/question-bank' : '/teacher/question-bank';
