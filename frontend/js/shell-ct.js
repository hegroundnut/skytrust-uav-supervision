/* shell-ct.js — 证照中心门户薄壳（Task 6）：深绿黑大屏（body data-theme="dark"）。
   theme-ct.css；页面 js/pages/ct/*.js 先于本文件加载；除 home 外各页 Task 7-8 补齐，
   未注册路由由 portal.js 兜底「页面未注册」卡（非白屏）。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'ct',
    registry: 'CT_PAGES',
    defaultPage: 'home',
    mapPages: [],
    nav: [
      { key: 'home',      label: '证照总览',   ico: 'home' },
      { key: 'issue',     label: '通行证签发', ico: 'cert' },
      { key: 'ledger',    label: '证照台账',   ico: 'db' },
      { key: 'verify',    label: '证照查验',   ico: 'search' },
      { key: 'revoke',    label: '证照吊销',   ico: 'lock' },
      { key: 'chainview', label: '链上浏览器', ico: 'db' }
    ]
  });
})();
