/* chainview.js — 证照中心端·区块链浏览器注册（Task 8 薄注册，实现在 js/chainview.js 共享 CXV 模块）。
   本端裁剪：defaultChain 'irita'——默认深钻 IRITA 证照链（链卡/节点/块浏览初始选中 irita，可切换）；
   irita「Merkle 证明可用」标注仅 mode=real 出现（裁决 D）。
   端点：explorer/* + crosschain/list（见 js/chainview.js 头注）。 */
(function () {
  'use strict';
  var CT = window.CT_PAGES = window.CT_PAGES || {};
  CT.chainview = {
    render: function (root) {
      window.CXV.render(root, { portal: 'ct', defaultChain: 'irita' });
    }
  };
})();
