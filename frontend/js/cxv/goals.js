/* cxv/goals.js — 布局 E 第①段：三目标证据条（第五期 Task 6，window.CXV_GOALS）。
   三芯片 = 验收三目标的活数证据面：数据一律请求时实时拉取（render 内
   API.call('/api/explorer/goals', {})），失败/非 0 code → 芯片区如实显示错误态文案、
   不显示任何数字（绝不写死、绝不缓存假数）；测不到 null → '—'（fmtVal，Review Focus 2
   钉住点），真实 0 的计数如实显示 '0'（实测值，绝不以 null 充 0、也绝不以 0 充 null）。
   芯片①（目标①）：chains_online/chains_total 链在线 + 留痕 crosschain_total 条 +
   SM9 验签通过率 verify_pass_rate_pct%——决策 8 业务留痕口径，口径标注 = 固定小字
   GOAL1_SMALL_PRINT（一字不动）；IRITA SM2/Merkle 说明文案仅当 goal1.chains（活快照，
   与 explorer/overview 同构同值）中 chain=="irita" 项 mode=="real" 时渲染（Global
   Constraint 8 / 四期裁决 D 沿用：绝不在 sim/缺失数据上声称链本体密码学能力）。
   芯片②③（目标②③）：关键指标 + 跳转——目标页在本端 → 页内 hash 路由（location.hash
   赋值，portal.js hashchange 接管）；在他端 → 普通跨页 <a>（四端同源部署）。路由 key
   实证自 shell-au.js:16 nav 'netsec'（链网安全运营）/ shell-rg.js:13 nav 'trace'（身份追踪）。
   装载序契约：本文件标签在薄壳 chainview.js 之前（终序 goals→journey→lanes→zones→薄壳），
   IIFE 顶层零 window.CXV 访问——SHARED.merkleNote 仅在 render 调用期解析（与 zones.js 同约）。
   依赖仅 API/UI/PUI（index 版禁用依赖，裁决 G 沿用；index.html 不加载 drone.css →
   .d-cxv-goal* 缺席，结构类 p-card/p-empty/p-btn 保证内容完整可读）。
   端点：explorer/goals。 */
(function () {
  'use strict';
  var h = UI.h, P = PUI;

  /* 芯片①固定小字（决策 8 口径标注，一字不动） */
  var GOAL1_SMALL_PRINT = '业务留痕 · 不含压测流量（全量原始台账见下方第③区）';

  /* fmtVal：测得值 → 显示串（CXV_GOALS.fmtVal 暴露，供 DOM-less 核验）。
     null/undefined = 后端「测不到」的诚实 null → '—'（绝不渲染成 0 或空白）；
     NaN/±Infinity 同归 '—'（非可信读数）；真实 0 → '0'；其余 String 原样直出
     （后端数值不做千分位等改写——显示的就是响应里的值）。 */
  function fmtVal(v) {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number' && !Number.isFinite(v)) return '—';
    return String(v);
  }

  /* 值 + 单位：测不到只出 '—'、不带单位（绝不拼 '—%' / '— ms' 假读数） */
  function fmtUnit(v, unit) {
    var s = fmtVal(v);
    return s === '—' ? s : s + unit;
  }

  /* 跳转元素（brief 钉死）：目标页在本端 → button + location.hash 页内路由；
     在他端 → 普通跨页 <a>（四端同源）。永为「文字 + →」，不靠颜色表意。 */
  function jumpEl(isLocal, label, hash, href, title) {
    return isLocal
      ? h('button', {
          type: 'button', class: 'p-btn p-btn-sm d-cxv-goal-jump', title: title,
          onClick: function () { location.hash = hash; }
        }, label + ' →')
      : h('a', { class: 'd-cxv-goal-jump', href: href, title: title }, label + ' →');
  }

  /* IRITA SM2/Merkle 说明文案（spec §5.2：前端固定架构说明文案，非数据断言）：
     门控 = goal1.chains 活快照中 irita 项的 mode 字段，经 CXV.SHARED.merkleNote('irita',
     mode)（裁决 D 同一诚实门：mode!=='real' / irita 缺失 / mode 未知 → null → 不渲染）。
     链名徽章 P.chainTag('irita')——链色只出现在此徽章（.p-chain-tag 左边框色）。 */
  function iritaNote(g1) {
    var chains = (g1 && g1.chains) || [];
    var mode = null;
    for (var i = 0; i < chains.length; i++) {
      if (chains[i] && chains[i].chain === 'irita') { mode = chains[i].mode; break; }
    }
    var note = window.CXV.SHARED.merkleNote('irita', mode);
    if (!note) return null;
    return h('div', {
      class: 'd-cxv-goal-note',
      title: '仅当 goal1.chains 中 irita 项 mode=real 时出现（裁决 D：绝不在模拟数据上声称链本体密码学能力）'
    }, P.chainTag('irita'), h('span', {}, 'SM2 链本体 · ' + note));
  }

  /* 芯片①（目标① 异构链商密跨链）——数字全部来自 goal1 活字段 */
  function chip1(g1) {
    g1 = g1 || {};
    var el = h('div', { class: 'd-cxv-goal' },
      h('b', { class: 'd-cxv-goal-title' }, '目标① 异构链商密跨链'),
      h('div', { class: 'd-cxv-goal-nums' },
        fmtVal(g1.chains_online) + '/' + fmtVal(g1.chains_total) + ' 链在线 · 留痕 ',
        fmtUnit(g1.crosschain_total, ' 条')),
      h('div', { class: 'd-cxv-goal-sub' }, 'SM9 验签通过率 ', fmtUnit(g1.verify_pass_rate_pct, '%')),
      h('p', { class: 'd-cxv-goal-smallprint' }, GOAL1_SMALL_PRINT));
    var note = iritaNote(g1);
    if (note) el.append(note);
    return el;
  }

  /* 芯片②（目标② 秒级链下 · 抗虫洞）——跳转「链网安全运营」（本端为 au → #/netsec） */
  function chip2(g2, portal) {
    g2 = g2 || {};
    return h('div', { class: 'd-cxv-goal d-cxv-goal-link' },
      h('b', { class: 'd-cxv-goal-title' }, '目标② 秒级链下 · 抗虫洞'),
      h('div', { class: 'd-cxv-goal-nums' }, '消息时延中位 ', fmtUnit(g2.message_latency_median_ms, ' ms')),
      h('div', { class: 'd-cxv-goal-sub' },
        '虫洞事件 ', fmtUnit(g2.wormhole_events_total, ' 起'), ' · 恢复中位 ',
        fmtUnit(g2.recovery_latency_median_ms, ' ms')),
      jumpEl(portal === 'au', '链网安全运营', '#/netsec', 'authority.html#/netsec',
        '跳转管理当局端「链网安全运营」页（目标②演示：可信路由/秒级时延/SM9 挑战-应答/虫洞注入检出与隔离重算）'));
  }

  /* 芯片③（目标③ 秒级追踪 · 密文监管）——跳转「身份追踪」（本端为 rg → #/trace） */
  function chip3(g3, portal) {
    g3 = g3 || {};
    return h('div', { class: 'd-cxv-goal d-cxv-goal-link' },
      h('b', { class: 'd-cxv-goal-title' }, '目标③ 秒级追踪 · 密文监管'),
      h('div', { class: 'd-cxv-goal-nums' }, '告警 ', fmtVal(g3.alerts_total), ' · 身份追踪 ', fmtVal(g3.trace_total)),
      h('div', { class: 'd-cxv-goal-sub' }, '密文核验 ', fmtVal(g3.inspect_total), ' · 授权 ', fmtVal(g3.auth_total)),
      jumpEl(portal === 'rg', '身份追踪', '#/trace', 'regulator.html#/trace',
        '跳转监管当局端「身份追踪」页（目标③演示：七级跨链身份追踪，断链 5001 断点证据如实）'));
  }

  /* ================= render（薄壳 chainview.js 组装时位于 ZONES 之前） ================= */
  function render(root, opts) {
    opts = opts || {};
    var portal = opts.portal || 'index';
    var box = h('div', { class: 'd-cxv-goals' },
      h('div', { class: 'p-empty' }, '⏳ explorer/goals 加载中…'));
    var metaSlot = h('div', {});
    root.append(h('section', { class: 'p-card d-cxv-goal-sec' },
      h('h3', { class: 'p-card-title' },
        '三目标证据条 · explorer/goals（验收三目标活数芯片：请求时实时聚合，测不到 →「—」，绝不写死）'),
      metaSlot, box));
    load();

    async function load() {
      var r = await API.call('/api/explorer/goals', {});
      if (!box.isConnected) return;   /* 已导航离开/「刷新全部」卸载本区 → 弃填充 */
      metaSlot.innerHTML = '';
      metaSlot.append(P.metaLine(r));
      box.innerHTML = '';
      if (!r.ok) {
        /* 失败/非 0 code → 错误态文案如实直出，芯片区不显示任何数字（绝不写死、绝不缓存假数） */
        box.append(h('div', { class: 'd-cxv-goal-err' },
          h('div', {}, h('b', {}, '⚠ 三目标证据加载失败（code=' + r.code + '）——芯片拒绝显示任何数字')),
          h('div', { class: 'd-small' }, '芯片数字全部来自本次 explorer/goals 实时聚合；加载失败时绝不以写死值/缓存值充数。'),
          P.errCard(r)));
        return;
      }
      var d = r.data || {};
      box.append(chip1(d.goal1), chip2(d.goal2, portal), chip3(d.goal3, portal));
    }
  }

  window.CXV_GOALS = { render: render, fmtVal: fmtVal };
})();
