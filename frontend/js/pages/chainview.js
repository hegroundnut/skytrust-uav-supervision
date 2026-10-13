/* chainview.js — index SPA·区块链浏览器注册（Task 8 薄注册，实现在 js/chainview.js 共享 CXV 模块）。
   index 版禁用依赖（裁决 G）：index.html 不加载 PORTAL/MAPX——CXV 只依赖 API/UI/PUI
   （index.html 已加载 pui.js）。注意：index.html 不加载 drone.css → .d-cxv-* 装饰性样式缺席，
   结构性 p-* 类（product.css）保证内容完整可读（如实降级，不虚构样式）。
   本端裁剪：全量。script 顺序：本文件必须位于 app.js 之前（app.js 加载时捕获 window.PAGES）。 */
(function () {
  'use strict';
  window.PAGES = window.PAGES || {};
  window.PAGES.chainview = {
    render: function (root) {
      window.CXV.render(root, { portal: 'index' });
    }
  };
})();
