/* chainview.js — 运营商端·区块链浏览器注册（Task 8 薄注册，实现在 js/chainview.js 共享 CXV 模块）。
   本端裁剪：defaultMsgTypes 聚焦「任务申请 / 飞行许可」跨链留痕（客户端筛选芯片默认勾选，可调）。
   端点：explorer/* + crosschain/list（见 js/chainview.js 头注）。 */
(function () {
  'use strict';
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  OP.chainview = {
    render: function (root) {
      window.CXV.render(root, { portal: 'op', defaultMsgTypes: ['MISSION_APPLICATION', 'FLIGHT_PASS'] });
    }
  };
})();
