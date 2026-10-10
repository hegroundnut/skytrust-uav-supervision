/* capability.js —— CAPX 三大核心能力组件（项目绩效目标自然嵌入三端落地页）。
   三种密度：cards（运营商门户首页，hero 与服务入口之间）/ strip（管理当局审核队列顶栏，点击抽屉展开）
   / cockpit（监管驾驶舱，实验面板默认展开）。
   每张能力卡 = 产品化特性描述 + 实时证据 chips（既有只读端点，绝不新增后端）
   + 「项目绩效目标」官方原文折叠小字 + 「开展实验验证」一键自证面板
   （experiment/list 历史 + experiment/run 运行；「秒级」能力出 p95 < 1000ms 达标判定）。
   高危实验门禁：def.warn（RISK_SCAN / MESSAGE_FLOW ATTACK·DEFENSE 虫洞残留、CROSSCHAIN_LOOP 真实上链）
   一律 P.confirm 二次确认后才发请求。
   依赖：API / UI / PUI / PORTAL + js/data/capabilities.js（加载顺序须在其后）。 */
(function () {
  'use strict';
  var h = UI.h, P = PUI;

  function fmtMs(x) {
    var n = Number(x);
    if (!isFinite(n)) return '—';
    return (n < 10 ? n.toFixed(1) : Math.round(n)) + ' ms';
  }
  function pctOf(row) {
    var c = Number(row && row.count) || 0, s = Number(row && row.success_count) || 0;
    return c > 0 ? Math.round(s / c * 1000) / 10 : null;
  }

  /* ---------- 「秒级」判定（仅 claim 能力出阈值判定；cap1 不谎称秒级） ---------- */
  function verdictEl(cap, row) {
    if (!row || !row.run_id) return null;
    var parts = [P.badge(row.status)];
    if (row.status === 'DONE') {
      var pct = pctOf(row);
      parts.push(h('span', { class: 'd-small' },
        '成功 ' + (row.success_count ?? 0) + '/' + (row.count ?? 0) + (pct != null ? '（' + pct + '%）' : '')));
      if (row.p95_latency_ms != null) {
        if (cap.claim) {
          var ok = Number(row.p95_latency_ms) < window.CAPABILITIES.p95ClaimMs;
          parts.push(h('span', { class: 'd-cap-verdict ' + (ok ? 'ok' : 'bad') },
            (ok ? '✓ ' + cap.claim.text + '达成' : '✗ 超出秒级阈值') + ' · p95 = ' + fmtMs(row.p95_latency_ms)));
        } else {
          parts.push(h('span', { class: 'd-small d-muted' }, 'p95 ' + fmtMs(row.p95_latency_ms)));
        }
      }
    } else if (row.status === 'FAILED') {
      parts.push(h('span', { class: 'd-small d-muted' }, '运行失败 —— 详情见下方错误卡（FAILED 行同样入账本）'));
    }
    return h('div', { class: 'd-cap-verdict-row' }, parts);
  }
  function verdictMini(cap, row) {
    /* 非「秒级」主张能力（cap1）不出阈值判定——p95 列已展示原始毫秒，不谎称达标语义 */
    if (!cap.claim || !row || row.status !== 'DONE' || row.p95_latency_ms == null) return '—';
    var ok = Number(row.p95_latency_ms) < window.CAPABILITIES.p95ClaimMs;
    return h('span', { class: 'd-cap-verdict ' + (ok ? 'ok' : 'bad') }, ok ? '✓ 秒级' : '✗ 超阈');
  }

  /* ---------- 实验历史（experiment/list 客户端按能力过滤；details 首次展开才拉取） ---------- */
  function historyBox(cap) {
    var box = h('div', { class: 'd-cap-hist' });
    var types = {};
    cap.experiments.forEach(function (e) { types[e.type] = true; });
    function showRun(row) {
      P.drawer('实验运行 ' + row.run_id,
        P.kv([
          ['实验类型', h('code', { class: 'p-mono' }, row.experiment_type)],
          row.scenario ? ['场景', row.scenario] : null,
          ['状态', P.badge(row.status)],
          ['迭代', (row.success_count ?? 0) + ' 成功 / ' + (row.failed_count ?? 0) + ' 失败 / 共 ' + (row.count ?? 0)],
          ['成功率', (pctOf(row) != null ? pctOf(row) + '%' : '—')],
          ['延迟 avg/p50/p95/max', fmtMs(row.avg_latency_ms) + ' / ' + fmtMs(row.p50_latency_ms) + ' / ' + fmtMs(row.p95_latency_ms) + ' / ' + fmtMs(row.max_latency_ms)],
          row.failure_reasons ? ['失败原因', h('code', { class: 'p-mono' }, String(row.failure_reasons))] : null,
          ['起止', (row.started_at || '—') + ' → ' + (row.completed_at || '—')],
        ]),
        h('details', { class: 'p-rawjson' }, h('summary', {}, '运行行 JSON'), UI.jsonBlock(row)));
    }
    async function load() {
      if (!box.isConnected) return;
      box.innerHTML = ''; box.append(h('div', { class: 'p-empty' }, '⏳ 加载实验历史…'));
      var r = await API.call('/api/experiment/list', { page: 1, page_size: 50 });
      if (!box.isConnected) return;
      box.innerHTML = '';
      if (!r.ok) { box.append(P.errCard(r)); return; }
      var recs = ((r.data && r.data.records) || []).filter(function (x) { return types[x.experiment_type]; });
      if (!recs.length) {
        box.append(h('div', { class: 'p-empty' }, '尚无本能力的实验记录 —— 点击上方「运行」生成第一批自证数据'));
        return;
      }
      box.append(h('table', { class: 'p-tbl d-cap-hist-tbl' },
        h('thead', {}, h('tr', {}, ['时间', '实验', '状态', '成功', 'p95', '秒级判定'].map(function (t) { return h('th', {}, t); }))),
        h('tbody', {}, recs.slice(0, 8).map(function (row) {
          return h('tr', { class: 'clickable', title: 'run_id ' + row.run_id + ' · 点击查看详情', onClick: function () { showRun(row); } },
            h('td', {}, String(row.completed_at || row.started_at || '—').slice(5, 19)),
            h('td', {}, h('code', { class: 'p-mono' }, row.experiment_type),
              row.scenario ? h('span', { class: 'd-cap-scen' }, row.scenario) : null),
            h('td', {}, P.badge(row.status)),
            h('td', {}, (row.success_count ?? 0) + '/' + (row.count ?? 0)),
            h('td', {}, row.p95_latency_ms != null ? fmtMs(row.p95_latency_ms) : '—'),
            h('td', {}, verdictMini(cap, row)));
        }))));
    }
    box.reload = load;
    return box;
  }

  /* ---------- 单个实验运行行 ---------- */
  function expRow(cap, def, afterRun) {
    var sel = def.scenarios ? h('select', { class: 'd-cap-sel' },
      def.scenarios.map(function (s) { return h('option', { value: s.v }, s.t); })) : null;
    var cnt = h('input', { type: 'number', class: 'd-cap-cnt', value: def.count, min: 1, max: 1000, title: '迭代次数 count（1..1000）' });
    var slot = h('div', { class: 'd-cap-slot' });
    var btn = h('button', { class: 'p-btn p-btn-sm' + (def.heavy ? '' : ' p-btn-primary') }, def.heavy ? '▶ 运行（真实上链）' : '▶ 运行');
    btn.addEventListener('click', async function () {
      var scenario = sel ? sel.value : '';   /* 无场景集的类型恒空串（P5-R5 双向严格） */
      var warn = def.warn || (sel ? ((def.scenarios.find(function (s) { return s.v === scenario; }) || {}).warn) : null);
      if (warn && !(await P.confirm('高危实验 · 二次确认', warn, '确认运行'))) return;
      var count = Math.min(1000, Math.max(1, Number(cnt.value) || def.count));
      btn.disabled = true; var old = btn.textContent; btn.textContent = '⏳ 运行中…';
      slot.innerHTML = '';
      var r = await API.call('/api/experiment/run',
        { experiment_type: def.type, scenario: scenario, count: count, concurrency: 1 });
      btn.disabled = false; btn.textContent = old;
      if (!slot.isConnected) return;
      var row = (r.data && r.data.run_id) ? r.data : null;   /* OK 与 FailData 均携带运行行 */
      if (row) slot.append(verdictEl(cap, row));
      if (!r.ok) slot.append(P.errCard(r));
      slot.append(P.metaLine(r));
      if (afterRun) afterRun();
    });
    return h('div', { class: 'd-cap-exp-row' },
      h('div', { class: 'd-cap-exp-main' },
        h('span', { class: 'd-cap-exp-label' }, def.label),
        h('code', { class: 'p-mono d-cap-exp-type' }, def.type),
        sel,
        h('label', { class: 'd-cap-cnt-wrap' }, '×', cnt),
        btn),
      def.note ? h('div', { class: 'd-cap-exp-note' }, '⚠ ' + def.note) : null,
      slot);
  }

  /* ---------- 实验自证面板（details 首次展开才拉历史；opts.open 则立即拉） ---------- */
  function expPanel(cap, open) {
    var hist = historyBox(cap);
    var det = h('details', { class: 'd-cap-exp', open: !!open },
      h('summary', {}, '🧪 开展实验验证 · ' + cap.experiments.length + ' 类一键自证'),
      h('div', {},
        cap.experiments.map(function (def) { return expRow(cap, def, function () { hist.reload(); }); }),
        h('div', { class: 'd-cap-hist-head' },
          h('span', {}, '最近实验记录（experiment/list）'),
          h('button', { class: 'p-btn p-btn-sm p-btn-ghost', onClick: function () { hist.reload(); } }, '⟳ 刷新')),
        hist));
    det.addEventListener('toggle', function () { if (det.open) hist.reload(); });
    if (open) hist.reload();
    return det;
  }

  /* ---------- 实时证据 chips（顺序拉取保证次序；失败降级为错误 chip，不阻断） ---------- */
  function evidenceBox(cap) {
    var box = h('div', { class: 'd-cap-ev' }, h('div', { class: 'p-empty' }, '⏳ 实时证据加载中…'));
    (async function () {
      var chips = [];
      for (var i = 0; i < cap.evidence.length; i++) {
        var ev = cap.evidence[i];
        var r = await API.call(ev.endpoint, ev.body || {});
        if (!box.isConnected) return;
        if (r.ok) {
          try { chips = chips.concat(ev.chips(r.data) || []); }
          catch (e) { chips.push({ label: ev.endpoint, value: '解析失败', tone: 'warning' }); }
        } else {
          chips.push({ label: ev.endpoint, value: 'code=' + r.code, tone: 'critical' });
        }
      }
      if (!box.isConnected) return;
      box.innerHTML = '';
      box.append(P.statCards(chips));
    })();
    return box;
  }

  /* ---------- 能力卡（完整密度） ---------- */
  function capCard(cap, opts) {
    opts = opts || {};
    return h('article', { class: 'd-cap-card' },
      h('header', { class: 'd-cap-head' },
        h('span', { class: 'd-cap-ico' }, PORTAL.ico(cap.ico)),
        h('div', {},
          h('h3', {}, cap.title),
          h('span', { class: 'd-cap-goalno' }, cap.goalNo))),
      h('p', { class: 'd-cap-pitch' }, cap.pitch),
      h('ul', { class: 'd-cap-points' }, cap.points.map(function (p) { return h('li', {}, p); })),
      evidenceBox(cap),
      h('details', { class: 'd-cap-goal' },
        h('summary', {}, '📋 项目绩效目标（官方原文）'),
        h('p', {}, cap.goal)),
      expPanel(cap, opts.expOpen));
  }

  /* ---------- strip 迷你卡（管理当局审核队列顶栏；点击抽屉展开完整能力卡） ---------- */
  function stripMini(cap) {
    var el = h('button', { class: 'd-cap-mini', title: '点击查看「' + cap.goalNo + '」实时证据与实验自证' },
      h('span', { class: 'd-cap-mini-ico' }, PORTAL.ico(cap.ico)),
      h('span', { class: 'd-cap-mini-txt' },
        h('b', {}, cap.title),
        h('i', {}, cap.goalNo + ' · 实时证据 + 实验自证')));
    el.addEventListener('click', function () {
      P.drawer(cap.title + '（' + cap.goalNo + '）', capCard(cap, { expOpen: false }));
    });
    return el;
  }

  /* ---------- 对外入口：section(density) ---------- */
  function section(density) {
    var caps = (window.CAPABILITIES && window.CAPABILITIES.caps) || [];
    if (!caps.length) return h('div');
    if (density === 'strip') return h('div', { class: 'd-cap-strip' }, caps.map(stripMini));
    var head = density === 'cockpit'
      ? { t: '能力态势 · 绩效目标实验自证', s: '三大核心能力实时证据 + experiment/run 一键自证；高危虫洞/真实上链实验均有二次确认门禁' }
      : { t: '平台三大核心能力', s: '证据来自在网实时台账 · 「开展实验验证」一键自证 · 项目绩效目标官方原文见卡内小字' };
    return h('section', { class: 'd-cap-section' + (density === 'cockpit' ? ' d-cap-cockpit' : '') },
      h('div', { class: 'd-cap-sec-head' }, h('h2', {}, head.t), h('p', {}, head.s)),
      h('div', { class: 'd-cap-grid' }, caps.map(function (c) { return capCard(c, { expOpen: density === 'cockpit' }); })));
  }

  window.CAPX = { section: section, capCard: capCard };
})();
