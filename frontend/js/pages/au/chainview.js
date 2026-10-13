/* chainview.js — 管理当局端·区块链浏览器注册（Task 8 薄注册，实现在 js/chainview.js 共享 CXV 模块）。
   本端裁剪：全量（四链全类型，无默认过滤聚焦）。
   端点：explorer/* + crosschain/list（见 js/chainview.js 头注）。 */
(function () {
  'use strict';
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  AU.chainview = {
    render: function (root) {
      window.CXV.render(root, { portal: 'au' });
    }
  };
})();
