/* chainview.js — 监管当局端·区块链浏览器注册（Task 8 薄注册，实现在 js/chainview.js 共享 CXV 模块）。
   本端裁剪：全量 + 监管视角——跨链存证详情里 CHAINMAKER 段（监管签收/中继）加 .d-cxv-reg-hl
   高亮（openCxDetail 渲染完成后 DOM 遍历施加，pui.js 零改动，裁决 E）。
   端点：explorer/* + crosschain/list（见 js/chainview.js 头注）。 */
(function () {
  'use strict';
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  RG.chainview = {
    render: function (root) {
      window.CXV.render(root, { portal: 'rg' });
    }
  };
})();
