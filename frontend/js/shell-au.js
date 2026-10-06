/* shell-au.js — 管理当局门户薄壳（计划 B Task 5）：审核签发 + 链网安全运营合并端。
   theme-au.css 深蓝权威浅色；页面文件 js/pages/au/*.js 在本文件之前加载。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'au',
    registry: 'AU_PAGES',
    defaultPage: 'queue',
    mapPages: ['queue', 'masterdata', 'netsec'],
    nav: [
      { key: 'queue',      label: '审核队列',      ico: 'audit' },
      { key: 'passes',     label: '许可管理',      ico: 'cert' },
      { key: 'records',    label: '审核留痕',      ico: 'doc' },
      { key: 'registry',   label: '登记与资质',    ico: 'id' },
      { key: 'masterdata', label: '主数据维护',    ico: 'db' },
      { key: 'netsec',     label: '链网安全运营',  ico: 'net' }
    ]
  });
})();
