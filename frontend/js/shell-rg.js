/* shell-rg.js — 监管当局门户薄壳（计划 B Task 5）：深藏青大屏（body data-theme="dark"）。
   theme-rg.css；告警只用红黄语义色（Global Constraints #7）；页面 js/pages/rg/*.js 先于本文件加载。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'rg',
    registry: 'RG_PAGES',
    defaultPage: 'cockpit',
    mapPages: ['cockpit'],
    nav: [
      { key: 'cockpit', label: '监管驾驶舱',  ico: 'radar' },
      { key: 'alerts',  label: '告警管理',    ico: 'alert' },
      { key: 'trace',   label: '身份追踪',    ico: 'search' },
      { key: 'authz',   label: '授权中心',    ico: 'key' },
      { key: 'inspect', label: '密文核验',    ico: 'shield' },
      { key: 'audit',   label: '监管审计',    ico: 'audit' },
      { key: 'crypto',  label: '密码工具箱',  ico: 'lock' },
      { key: 'chainview', label: '链上浏览器', ico: 'db' }
    ]
  });
})();
