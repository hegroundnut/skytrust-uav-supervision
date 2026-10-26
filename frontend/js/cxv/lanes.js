/* cxv/lanes.js — 布局 E 第⑤段：可折叠四链结构泳道（第五期 Task 8，window.CXV_LANES）。
   时间线回答「发生了什么、多快」，泳道回答「每条链各自承担什么」（归档 mockup 布局 E）。
   数据流：本模块零端点零请求——内容全部来自 Task 7 journey.js 的 onSelect(journeyData|null)
   回调（薄壳 chainview.js 接线 CXV_LANES.update(data)）；journeyData = explorer/journey
   handler 响应 data 原样（anchor/objects/hops/summary）。零编造条目：泳道卡一一映射 hops
   行，无数据/空态绝不渲染任何事件卡。
   钉死语义（brief Task 8）：
   - 默认收起；折叠条显示各链笔数「Fabric N 笔 · CM 中继 N 跳 · FISCO N 笔 · IRITA N 笔」
     ——由 hops 实算：业务事件计入其 source_chain 列，CM 列 = 中继跳数 = hop_count
     （监管中继非旁路：每跳必经 ChainMaker）。无数据折叠条 =「四链结构视图（等待旅程选择）」。
   - 展开态列序固定：运营链 Fabric、监管链 ChainMaker、管理链 FISCO BCOS、证照链 IRITA
     （LANES 常量钉死，不随旅程跳序重排，Review Focus 5）；列头链色 = Global Constraint 4
     四色，只经 CXV.SHARED.CHAIN_VAR var 引用注入（零 hex），未知链回落中性线色不猜测。
   - 事件卡 = 业务动作 + TxID 截断（前 8 后 6，journey 同规）+ verify 徽章（p-badge 徽章
     样式类复用，icon+文字永不仅靠颜色）；CM 列 = 每 hop 一张虚线中继卡（「◈ 中继：
     source→target · verify 结果」原值直出），点击同 SHARED.openCx（rg 端 CHAINMAKER
     高亮后处理继续生效，裁决 E）。
   - update(null)（空态/失败/清空旅程）→ 泳道收起且计数清空回到等待文案，如实——绝不以
     空泳道冒充「无中继」断言（混合探测失败披露行由 journey.js 负责，本区不与之矛盾）。
   - update(data) 且 data.hops 为空（点选零跨链行对象的成功响应）→ 计数如实全 0 +
     各列如实空态文案（实算 0 ≠ 无数据，两语义分离，同 goals fmtVal 真实 0/null 之分）。
   诚实红线：计数/卡片全部实算自传入 hops；verify 空值 → '—' 不编造；source_chain 不属
   四链的 hop 如实披露、绝不静默丢弃（现网关五调用点源链仅 fabric/fisco-bcos/irita，
   守卫性兜底）。折叠开合经内联 style.display 切换——index.html 不加载 drone.css 时
   .d-cxv-lane* 缺席，结构类 p-card/p-empty/p-badge/p-mono + 内联开合保证内容完整可读
   （裁决 G，同 goals/journey 约定）。
   装载序契约：标签在 zones.js 之前、journey.js 之后（终序 goals→journey→lanes→zones→
   薄壳）；IIFE 顶层零 window.CXV 访问——SHARED.CHAIN_VAR/openCx 仅 render/update/点击
   调用期解析。update 委托最近一次 render 的实例（刷新全部重渲 → 指向新实例；journey 侧
   isConnected/归属守卫保证迟到响应不会打进新实例）。依赖仅 UI/PUI。 */
(function () {
  'use strict';
  var h = UI.h, P = PUI;

  /* 展开态列序钉死（brief：运营链 Fabric、监管链 ChainMaker、管理链 FISCO BCOS、
     证照链 IRITA——不随旅程跳序重排）；chain = 后端链键（fisco-bcos 带连字符） */
  var LANES = [
    { chain: 'fabric', name: '运营链 Fabric', short: 'Fabric' },
    { chain: 'chainmaker', name: '监管链 ChainMaker', short: 'CM' },
    { chain: 'fisco-bcos', name: '管理链 FISCO BCOS', short: 'FISCO' },
    { chain: 'irita', name: '证照链 IRITA', short: 'IRITA' }
  ];

  /* 无数据折叠条文案（brief 钉死逐字） */
  var WAIT_COPY = '四链结构视图（等待旅程选择）';

  /* message_type → 业务动作中文名 / 链显示名：与 journey.js MSG_CN/CHAIN_CN 同口径的
     固定架构文案（该两表 journey 未导出，此处本地持有——同步注记：任一侧修改必须同步
     另一侧，否则静默分叉）。未知值一律原样直出，不编造中文、不猜测链名。 */
  var MSG_CN = {
    UAV_REGISTER_PROOF: '注册证明上链',
    MISSION_APPLICATION: '任务申请上链',
    MISSION_REVIEW_RESULT: '审核结果回传',
    FLIGHT_PASS: '许可签发',
    PASS_REVOKE: '许可吊销同步'
  };
  var CHAIN_CN = {
    chainmaker: 'ChainMaker 监管链', fabric: 'Fabric 运营链',
    'fisco-bcos': 'FISCO BCOS 管理链', irita: 'IRITA 证照链'
  };
  function msgName(t) { return MSG_CN[t] || String(t || '—'); }
  function chainName(c) { return CHAIN_CN[c] || String(c || '—'); }
  /* 链色 var 引用（SHARED.CHAIN_VAR 调用期解析；未知链 → 中性线色，不猜测链色） */
  function chainVar(c) { return window.CXV.SHARED.CHAIN_VAR[c] || 'var(--d-line-strong)'; }

  /* TxID 截断前 8 后 6 / 序号圈码：与 journey.js 同规副本（同步注记：任一侧修改必须
     同步另一侧）——短于 15 原样直出不硬截；圈码越界如实 '#N' 不编造 */
  function truncTx(id) {
    var s = String(id || '');
    if (!s) return '—';
    return s.length > 14 ? s.slice(0, 8) + '…' + s.slice(-6) : s;
  }
  function circled(n) {
    return (n >= 1 && n <= 20) ? String.fromCharCode(0x2460 + n - 1) : '#' + n;
  }

  /* verify 徽章（事件卡用；journey.js smBadge 同款徽章样式类与文案口径——icon+文字，
     空值如实 '—' 不编造） */
  function verifyBadge(vr) {
    if (vr === 'PASS') return h('span', { class: 'p-badge p-tone-good d-cxv-lane-sm' }, 'SM3✓ SM9✓');
    if (vr === 'FAIL_SM3') return h('span', { class: 'p-badge p-tone-critical d-cxv-lane-sm' }, '✕ SM3 验签失败');
    if (vr === 'FAIL_SM9') return h('span', { class: 'p-badge p-tone-critical d-cxv-lane-sm' }, '✕ SM9 验签失败');
    if (vr) return h('span', { class: 'p-badge p-tone-neutral d-cxv-lane-sm' }, '· ' + vr);
    return h('span', { class: 'd-cxv-lane-sm' }, '验签 —');
  }
  /* 中继卡 verify 结果文字（钉死模板「◈ 中继：source→target · verify 结果」；
     verify_result 原值直出不转译，icon+文字） */
  function verifyText(vr) {
    if (vr === 'PASS') return 'verify ✓ PASS';
    if (vr === 'FAIL_SM3' || vr === 'FAIL_SM9') return 'verify ✕ ' + vr;
    if (vr) return 'verify ' + vr;
    return 'verify —';
  }

  /* 计数实算（钉死口径）：业务事件计入其 source_chain 列；CM 列 = 中继跳数 = hop_count
     （每跳必经监管链，非旁路）。source_chain 不属四链 → unknown 收集如实披露，
     绝不静默丢弃、绝不猜测归列。 */
  function countBy(hops) {
    var biz = { fabric: 0, chainmaker: 0, 'fisco-bcos': 0, irita: 0 };
    var unknown = [];
    hops.forEach(function (hop) {
      var src = hop && hop.source_chain;
      if (src !== null && src !== undefined && Object.prototype.hasOwnProperty.call(biz, src)) biz[src]++;
      else unknown.push(hop || {});
    });
    return { biz: biz, relay: hops.length, unknown: unknown };
  }
  /* 折叠条计数串（钉死格式「Fabric N 笔 · CM 中继 N 跳 · FISCO N 笔 · IRITA N 笔」）——
     经 LANES 派生（列序/短名单一事实源，不另写字面量重复）；CM 项 = 中继跳数（钉死口径） */
  function countsText(c) {
    var s = LANES.map(function (lane) {
      return lane.chain === 'chainmaker'
        ? lane.short + ' 中继 ' + c.relay + ' 跳'
        : lane.short + ' ' + c.biz[lane.chain] + ' 笔';
    }).join(' · ');
    if (c.unknown.length) s += ' · ' + c.unknown.length + ' 跳源链不属四链（展开如实披露）';
    return s;
  }

  /* ================= render（薄壳 chainview.js 组装时位于 JOURNEY 之下 ZONES 之上） =================
     先挂折叠条（无数据 = WAIT_COPY）+ 泳道容器（默认收起）。实例 update 经模块级 current
     委托——薄壳 onSelect 调 window.CXV_LANES.update(data)，恒指向最近一次 render 的实例。 */
  var current = null;

  function render(root, opts) {
    opts = opts || {};
    var portal = opts.portal || 'index';
    var st = { data: null, expanded: false };

    function toggle() { st.expanded = !st.expanded; sync(); }
    var foldBtn = h('button', {
      type: 'button', class: 'd-cxv-lane-fold',
      title: '展开/收起四链结构视图——同一批旅程事件按链归列，计数由实际数据实算',
      onClick: toggle
    });
    var gridBox = h('div', { class: 'd-cxv-lanes' });
    root.append(h('section', { class: 'p-card d-cxv-lane-sec' },
      h('h3', { class: 'p-card-title' },
        '四链结构泳道 · 旅程事件按链归列（与上方旅程实时联动，零编造；每跳均含监管链中继卡——非旁路）'),
      foldBtn, gridBox));

    /* ---------- 展开态内容 ---------- */
    function eventCard(hop, idx) {
      var seq = hop.seq || (idx + 1);
      return h('button', {
        type: 'button', class: 'd-cxv-lane-ev',
        title: '点击打开该跳四段存证详情',
        onClick: function () { window.CXV.SHARED.openCx(hop.cross_tx_id, portal); }
      },
        h('b', {}, circled(seq) + ' ' + msgName(hop.message_type)),
        h('code', { class: 'p-mono d-cxv-lane-tx', title: hop.cross_tx_id || '' }, truncTx(hop.cross_tx_id)),
        h('div', { class: 'd-cxv-lane-badges' }, verifyBadge(hop.verify_result), P.badge(hop.status)));
    }
    function relayCard(hop, idx) {
      var seq = hop.seq || (idx + 1);
      return h('button', {
        type: 'button', class: 'd-cxv-lane-relay',
        title: '时间线节点 ' + circled(seq) + ' 的监管中继段（每跳必经 ChainMaker 签收/验签/中继，非旁路）——点击打开四段存证详情',
        onClick: function () { window.CXV.SHARED.openCx(hop.cross_tx_id, portal); }
      },
        h('span', {}, '◈ 中继：' + chainName(hop.source_chain) + '→' + chainName(hop.final_target_chain) + ' · ' + verifyText(hop.verify_result)),
        h('code', { class: 'p-mono d-cxv-lane-tx', title: hop.cross_tx_id || '' }, truncTx(hop.cross_tx_id)));
    }
    function renderLanes(c) {
      var hops = (st.data && st.data.hops) || [];
      LANES.forEach(function (lane) {
        var el = h('div', { class: 'd-cxv-lane' });
        el.style.setProperty('--cxv-chain', chainVar(lane.chain));
        var hd = h('div', { class: 'd-cxv-lane-hd' },
          lane.name + (lane.chain === 'chainmaker' ? ' · 中继 ' + c.relay + ' 跳' : ' · ' + c.biz[lane.chain] + ' 笔'));
        hd.style.background = chainVar(lane.chain);
        var bd = h('div', { class: 'd-cxv-lane-bd' });
        var n = 0;
        /* 业务事件卡：source_chain 归列（含 chainmaker 源——现网关五调用点无此源，
           如实兜底不静默丢弃；CM 折叠计数仍按钉死口径 = 中继跳数） */
        hops.forEach(function (hop, idx) {
          if (!hop || hop.source_chain !== lane.chain) return;
          bd.append(eventCard(hop, idx));
          n++;
        });
        /* CM 列 = 每 hop 一张虚线中继卡（钉死；监管中继非旁路，hop 序 = created_at 升序原序） */
        if (lane.chain === 'chainmaker') {
          hops.forEach(function (hop, idx) { if (hop) bd.append(relayCard(hop, idx)); });
          n += hops.length;
        }
        if (!n) {
          bd.append(h('div', { class: 'd-cxv-lane-zero' }, lane.chain === 'chainmaker'
            ? '中继 0 跳——本旅程无跨链中继记录（实算结果，如实展示）'
            : '0 笔——本旅程该链无业务事件（实算结果，如实展示）'));
        }
        el.append(hd, bd);
        gridBox.append(el);
      });
      /* source_chain 不属四链的如实披露行（守卫性兜底；跨满 grid 行） */
      if (c.unknown.length) {
        gridBox.append(h('div', { class: 'd-cxv-lane-warn' },
          c.unknown.map(function (hop) {
            return h('div', {}, '跳 ' + String(hop.seq || '—') + ' 源链 ' + String(hop.source_chain || '(空)') +
              ' 不属四链——如实披露，不猜测归列（TxID ' + String(hop.cross_tx_id || '—') + '）');
          })));
      }
    }

    /* ---------- 折叠条 + 展开内容同步（每次 update/开合全量重绘，零残留） ---------- */
    function sync() {
      var c = st.data ? countBy(st.data.hops || []) : null;
      foldBtn.innerHTML = '';
      foldBtn.setAttribute('aria-expanded', st.expanded ? 'true' : 'false');
      foldBtn.append(h('span', {}, c
        ? (st.expanded ? '▾ 收起' : '▸ 展开') + '「四链结构视图」：同一批事件按链归列（ ' + countsText(c) + ' ）'
        : (st.expanded ? '▾ ' : '▸ ') + WAIT_COPY));
      gridBox.style.display = st.expanded ? '' : 'none';
      gridBox.innerHTML = '';
      if (!st.expanded) return;
      if (!c) {
        gridBox.append(P.empty('等待旅程选择——泳道内容与上方旅程实时联动（绝不编造事件卡）'));
        return;
      }
      renderLanes(c);
    }

    st.update = function (data) {
      st.data = data || null;
      if (!st.data) st.expanded = false;   /* 钉死：update(null) → 泳道收起且计数清空，如实 */
      sync();
    };
    current = st.update;
    sync();
  }

  /* update 委托最近实例；render 前调用 → 如实 no-op（薄壳组装序保证 render 恒先于 onSelect 回调） */
  function update(data) { if (current) current(data); }

  window.CXV_LANES = { render: render, update: update };
})();
