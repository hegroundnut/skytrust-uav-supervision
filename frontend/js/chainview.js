/* chainview.js — 四端共享区块链浏览器模块 window.CXV 薄壳（第五期拆分 Task 5，spec §6.1）。
   职责（薄壳）：共享常量与下钻助手（CXV.SHARED = CHAIN_VAR/MSG_TYPES/CX_STATUSES/merkleNote/
   degradeSpec/isDegrade/chainCard/openBlock/txView/openCx，openCx 含 rg 端 CHAINMAKER 高亮
   DOM 后处理，裁决 E pui.js 零改动沿用）+ 纯函数裁决点（CXV._pure 三键不变）+ SMALL_PRINT
   字面量（verify 脚本 grep 落点，物理保留于本文件）+ render 组装。
   三区（节点情况/块浏览/链上数据追踪）渲染代码已原样迁移至 js/cxv/zones.js →
   window.CXV_ZONES.render（纯搬家，行为零变化；zones.js 装载序在本文件之前，经运行时
   window.CXV.SHARED.* / window.CXV.SMALL_PRINT 回引共享面）；goals/journey/lanes
   模块标签一律插在 zones.js 之前（goals 已于 Task 6、journey 已于 Task 7 落地），
   最终装载序 goals→journey→lanes→zones→本薄壳。
   render(root, opts) 签名与 opts 契约 {portal:'op'|'au'|'rg'|'ct'|'index', defaultChain?,
   defaultMsgTypes?} 不变。三区详情/四端裁剪/诚实红线文档见 js/cxv/zones.js 头注释。
   端点：explorer/overview、explorer/nodes、explorer/blocks、explorer/block、explorer/tx、
   crosschain/list。 */
(function () {
  'use strict';
  var h = UI.h, P = PUI;

  /* 链色只经 CSS var 引用（product.css --p-chain-* / drone.css --d-chain-irita；fisco-bcos 的
     令牌名历史上就是 --p-chain-fisco，见 product.css .p-chain-tag[data-chain="fisco-bcos"]）。
     未知链回落中性线色——不猜测、不编造链色。 */
  var CHAIN_VAR = {
    chainmaker: 'var(--p-chain-chainmaker)',
    fabric: 'var(--p-chain-fabric)',
    'fisco-bcos': 'var(--p-chain-fisco)',
    irita: 'var(--d-chain-irita)'
  };

  /* 跨链消息 5 类（crosschain 网关在用的全部 message_type） */
  var MSG_TYPES = ['UAV_REGISTER_PROOF', 'MISSION_APPLICATION', 'MISSION_REVIEW_RESULT', 'FLIGHT_PASS', 'PASS_REVOKE'];
  /* 跨链状态 = statemachine.CrosschainMachine 全状态（machine.go:77-87，不臆造枚举） */
  var CX_STATUSES = ['PENDING', 'SOURCE_CONFIRMED', 'REG_RECEIVED', 'REG_VERIFIED', 'REG_RELAYED',
    'TARGET_CONFIRMED', 'RETURN_REG_RECEIVED', 'SUCCESS', 'FAILED'];
  /* Review Focus 5 固定小字（Task 11 grep 断言对象，一字不动） */
  var SMALL_PRINT = '服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选';

  /* ---------- 纯函数裁决点（经 CXV._pure 暴露，供 DOM-less 核验；渲染只走这里） ---------- */
  /* Merkle 标注诚实门（裁决 D）：irita 且 overview 报告 mode=real 才允许出现；sim/未知 → null。 */
  function merkleNote(chain, mode) {
    if (chain !== 'irita' || mode !== 'real') return null;
    return 'Merkle 证明可用：real 传输读路径经 /abci_query prove=true 返回 ics23 双段证明（记录包含证明 + 多 store 提交证明）';
  }
  /* 2005 降级卡内容（裁决 A：brief 旧字样 5003 一律按 2005 落地）：后端 message 逐字直出。
     fisco 块类怪癖注记已随 §12.11 复核移除（SDK 通道块查询可用，2005 不再是 fisco 常态）。 */
  function degradeSpec(r, chain, what) {
    var lines = [];
    if (r && r.message) lines.push('后端原文：' + r.message);
    lines.push('能力缺口如实降级——绝不拼造块/节点/交易数据。');
    return { title: '⚠ 能力降级 code=2005 · 该链 RPC 不支持' + what, lines: lines };
  }
  function isDegrade(r) { return !!(r && r.code === 2005); }
  /* 同步注记（Task 6 controller-authorized）：本函数在 js/cxv/zones.js 有一份逐字孪生副本
     （三区侧私有 helper，SHARED 十键钉死不含它）——任一侧修改必须同步另一侧，否则静默分叉。 */
  function degradeCard(r, chain, what) {
    var sp = degradeSpec(r, chain, what);
    return h('div', { class: 'd-cxv-degrade' },
      h('div', {}, h('b', {}, sp.title)),
      sp.lines.map(function (t) { return h('div', { class: 'd-small' }, t); }));
  }

  /* ---------- 模式徽章（icon+文字，永不单靠颜色） ---------- */
  function modeBadge(mode) {
    if (mode === 'sim') return h('span', { class: 'p-badge p-tone-info', title: 'mode=sim：进程内模拟链（后端按 Resettable 能力判定）' }, '◈ SIM 模拟链');
    if (mode === 'real') return h('span', { class: 'p-badge p-tone-good', title: 'mode=real：真实链 SDK/RPC 传输' }, '● REAL 真实链');
    return h('span', { class: 'p-badge p-tone-neutral' }, '· mode=' + String(mode ?? '—'));
  }

  /* ---------- 链卡（节点情况区） ---------- */
  function chainCard(c, sel, onPick) {
    var el = h('button', {
      type: 'button',
      class: 'd-cxv-chain-card' + (sel ? ' sel' : ''),
      'data-chain': c.chain,
      title: '选中 ' + c.chain + '：驱动节点表与块浏览。node_count/block_height 来自实时探测——0 = 能力缺失或探测失败（后端如实归 0，前端不猜测）',
      onClick: function () { onPick(c.chain); }
    },
      h('div', { class: 'd-cxv-chain-name' }, c.name || c.chain),
      h('div', { class: 'd-cxv-chain-badges' }, P.badge(c.status || 'UNKNOWN'), modeBadge(c.mode)),
      h('div', { class: 'd-cxv-chain-stats' },
        h('span', {}, '块高 ', h('b', {}, String(c.block_height ?? 0))),
        h('span', {}, '节点 ', h('b', {}, String(c.node_count ?? 0)))),
      h('div', { class: 'd-cxv-chain-consensus' }, '共识 ', c.consensus || '—',
        ' · 链 ID ', h('code', { class: 'p-mono' }, c.chain)));
    el.style.setProperty('--cxv-chain', CHAIN_VAR[c.chain] || 'var(--d-line-strong)');
    return el;
  }

  /* ---------- ② 块详情抽屉 ---------- */
  async function openBlock(chain, height, mode) {
    var d = P.drawer('块详情 ' + chain + ' #' + height, h('div', { class: 'p-empty' }, '⏳ explorer/block 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/explorer/block', { chain: chain, height: height });
    if (!body.isConnected) return;                     /* 抽屉已关闭 */
    body.innerHTML = '';
    body.append(P.metaLine(r));
    if (isDegrade(r)) { body.append(degradeCard(r, chain, '块详情查询')); return; }
    if (!r.ok) { body.append(P.errCard(r)); return; }
    var b = (r.data && r.data.block) || {};
    body.append(P.kv([
      ['链', P.chainTag(chain)],
      ['高度', String(b.height ?? height)],
      ['块哈希', h('code', { class: 'p-mono' }, b.hash || '—')],
      ['出块时间', b.time || '—'],
      ['交易数', String(b.tx_count ?? 0)],
      ['出块者', h('code', { class: 'p-mono' }, b.proposer || '—')]
    ]));
    var note = merkleNote(chain, mode);
    if (note) body.append(h('div', { class: 'd-cxv-merkle' }, '🧾 ' + note));
    var txs = b.tx_ids || [];
    var txResult = h('div', {});
    body.append(
      h('div', { class: 'p-drawer-sec' }, '交易列表（' + txs.length + ' 笔 · 点击直查链上收据 explorer/tx）'),
      txs.length
        ? h('div', {}, txs.map(function (tx) {
            return h('button', {
              type: 'button', class: 'd-cxv-txrow', title: tx,
              onClick: function () { queryTxInto(txResult, chain, tx); }
            }, h('span', {}, UI.trunc(tx, 44)), h('span', {}, '直查 →'));
          }))
        : P.empty('本块无交易（如实展示）'),
      txResult,
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  /* ---------- explorer/tx 结果渲染（块抽屉与直查表单共用） ---------- */
  function txView(r, chain) {
    var wrap = h('div', { class: 'd-cxv-txresult' }, P.metaLine(r));
    if (!r.ok) { wrap.append(P.errCard(r)); return wrap; }   /* 6002=不存在或查询失败（EXPLAIN 解说） */
    var tx = (r.data && r.data.tx) || {};
    wrap.append(P.kv([
      ['链', P.chainTag(chain)],
      ['TxID', h('code', { class: 'p-mono' }, tx.tx_id || '—')],
      ['所在块高', String(tx.block_num ?? '—')],
      ['状态（链原生收据值，原样展示不转译）', P.badge(tx.status ?? '—')],
      ['时间戳', tx.timestamp || '—']
    ]), h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
    return wrap;
  }
  /* 同步注记（Task 6 controller-authorized）：本函数在 js/cxv/zones.js 有一份逐字孪生副本
     （三区侧直查表单 runDq 用）——任一侧修改必须同步另一侧，否则静默分叉。 */
  async function queryTxInto(slot, chain, txId) {
    slot.innerHTML = '';
    slot.append(h('div', { class: 'p-empty' }, '⏳ explorer/tx 直查中…'));
    var r = await API.call('/api/explorer/tx', { chain: chain, tx_id: txId });
    if (!slot.isConnected) return;
    slot.innerHTML = '';
    slot.append(txView(r, chain));
  }

  /* ---------- openCxDetail 包装：rg 端 CHAINMAKER 监管中继段高亮（裁决 E） ---------- */
  async function openCx(crossTxId, portal) {
    if (!crossTxId) return;
    await P.openCxDetail(crossTxId);
    if (portal !== 'rg') return;
    /* pui.js additive-only（目标零改动）→ 高亮在 openCxDetail 渲染完成后由 CXV DOM 遍历施加；
       段内已有「② 监管链签收 / ③ 监管链中继」文字 + .d-cxv-reg-hl 的 ::after 文字标注，
       永不仅靠颜色。 */
    document.querySelectorAll('.p-drawer .p-cx-seg').forEach(function (seg) {
      if (seg.querySelector('.p-chain-tag[data-chain="chainmaker"]')) seg.classList.add('d-cxv-reg-hl');
    });
  }

  /* ================= render（薄壳组装：GOALS → JOURNEY → ZONES；后续 lanes 任务在此追加） =================
     布局 E 第①段三目标证据条（window.CXV_GOALS，js/cxv/goals.js）与第②③④段业务对象
     全链旅程（window.CXV_JOURNEY，js/cxv/journey.js，Task 7）节点依次位于 ZONES 之前；
     goals/journey 装载序在本文件之前（5 HTML 一律），window.CXV_GOALS/CXV_JOURNEY
     调用期解析，无加载序问题。JOURNEY 的 onSelect(journeyData|null) 回调本任务为空实现
     （brief 钉死）——Task 8 在此接 CXV_LANES（旅程数据 → 折叠泳道；null → 清空）。 */
  function render(root, opts) {
    window.CXV_GOALS.render(root, opts);
    window.CXV_JOURNEY.render(root, opts, function (data) { /* Task 8 接 LANES.update(data) */ });
    window.CXV_ZONES.render(root, opts);
  }

  window.CXV = {
    render: render,
    SMALL_PRINT: SMALL_PRINT,
    /* 纯函数裁决点暴露：供 node DOM-less 核验（Merkle 诚实门 / 2005 降级内容），渲染同走此处 */
    _pure: { merkleNote: merkleNote, degradeSpec: degradeSpec, isDegrade: isDegrade },
    /* 第五期拆分：共享常量与下钻助手导出面（钉死十键）——js/cxv/zones.js 与后续
       goals/journey/lanes 模块经运行时 window.CXV.SHARED.* 引用 */
    SHARED: {
      CHAIN_VAR: CHAIN_VAR, MSG_TYPES: MSG_TYPES, CX_STATUSES: CX_STATUSES,
      merkleNote: merkleNote, degradeSpec: degradeSpec, isDegrade: isDegrade,
      chainCard: chainCard, openBlock: openBlock, txView: txView, openCx: openCx
    }
  };
})();
