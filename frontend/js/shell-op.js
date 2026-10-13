/* shell-op.js — 运营商门户薄壳（计划 B Task 5）：导航表 + 路由注册表 + PORTAL.boot。
   门户定位：UOM（民用无人驾驶航空器综合管理平台）风格政务办事窗口；theme-op.css 政务蓝白。
   页面文件 js/pages/op/*.js 在本文件之前加载（operator.html script 顺序保证）。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'op',
    registry: 'OP_PAGES',
    defaultPage: 'home',
    mapPages: ['home', 'flight', 'ops', 'airspace'],
    nav: [
      { key: 'home',     label: '服务首页',        ico: 'home' },
      { key: 'realname', label: '实名登记',        ico: 'id' },
      { key: 'aircraft', label: '我的航空器',      ico: 'drone' },
      { key: 'flight',   label: '飞行活动申请',    ico: 'map' },
      { key: 'license',  label: '电子飞行许可',    ico: 'cert' },
      { key: 'ops',      label: '运行识别·飞行动态', ico: 'radar' },
      { key: 'airspace', label: '空域查询',        ico: 'globe' },
      { key: 'chainview', label: '链上浏览器',     ico: 'db' }
    ]
  });
})();
