/* act2.js —— 幕二 · 系统二：链下可信网络虫洞攻防。
   覆盖链下网络/会话/消息/攻防/实验 5 组端点：node/register·list、topology/get、
   session/open·list·close、message/send·list、wormhole/toggle、risk/evaluate、
   event/list、path/switch、experiment/run·list·result·export。 */
(function () {
  'use strict';
  const { h, card, statusBadge, table, kv, metaLine, toast, toastResult, asyncBtn,
          readForm, field, fieldSelect, jsonBlock, trunc, hbarChart, showTip, hideTip } = UI;
  const call = API.call;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const S = { sess: null, lastRisk: null };

  function run(box, path, body, render) {
    box.innerHTML = '';
    box.append(h('div', { class: 'small muted' }, '⏳ POST ' + path + ' …'));
    return call(path, body).then(r => {
      box.innerHTML = '';
      box.append(h('div', { class: 'small muted mb8' },
        h('b', {}, 'POST ' + path), ' · 请求 ', h('code', { class: 'mono' }, JSON.stringify(body).slice(0, 130))));
      box.append(metaLine(r));
      if (!r.ok) box.append(h('div', { class: 'callout danger mt8' }, 'code=' + r.code + ' · ' + r.message));
      if (r.ok && render) { const v = render(r.data, r); if (v) box.append(v); }
      box.append(h('details', { class: 'mt8' }, h('summary', { class: 'small muted' }, '原始响应 JSON'), jsonBlock(r.raw)));
      return r;
    });
  }

  /* ---------- 拓扑 SVG ---------- */
  const TYPE_COLOR = { UAV: 'var(--series-1)', EDGE: 'var(--series-2)', MANAGEMENT: 'var(--series-3)', ATTACKER: 'var(--critical)' };
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }
  function parsePos(p) {
    try { const o = typeof p === 'string' ? JSON.parse(p) : (p || {});
      return { x: Number(o.x ?? o.X ?? 50), y: Number(o.y ?? o.Y ?? 50) }; }
    catch (_) { return { x: 50, y: 50 }; }
  }
  function topoSVG(topo, hlPath) {
    const W = 700, H = 470;
    const svg = svgEl('svg', { class: 'topo', viewBox: '0 0 ' + W + ' ' + H });
    const pos = {};
    topo.nodes.forEach(n => {
      const p = parsePos(n.position);
      pos[n.node_id] = { X: 40 + p.x * 6.1, Y: 30 + p.y * 5.6 };
    });
    const hl = new Set();
    if (hlPath && hlPath.length > 1) for (let i = 0; i < hlPath.length - 1; i++) hl.add(hlPath[i] + '|' + hlPath[i + 1]);
    const inHl = (a, b) => hl.has(a + '|' + b) || hl.has(b + '|' + a);
    // 边
    topo.edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const line = svgEl('line', { x1: a.X, y1: a.Y, x2: b.X, y2: b.Y,
        class: 'edge' + (e.wormhole_edge ? ' wormhole' : (inHl(e.from, e.to) ? ' active-path' : '')) });
      line.addEventListener('mousemove', ev => showTip(
        '<b>' + e.from + ' ⇄ ' + e.to + '</b><br>距离 ' + Number(e.distance || 0).toFixed(1) +
        ' · 宣告延迟 ' + (e.advertised_latency_ms ?? '—') + 'ms' +
        (e.wormhole_edge ? '<br>⚠ 虫洞伪造边' : '') + (inHl(e.from, e.to) ? '<br>● 当前会话路径' : ''), ev.clientX, ev.clientY));
      line.addEventListener('mouseleave', hideTip);
      svg.append(line);
    });
    // 节点
    topo.nodes.forEach(n => {
      const p = pos[n.node_id];
      const g = svgEl('g', { class: 'node' });
      const isolated = n.status === 'ISOLATED', offline = n.status === 'OFFLINE';
      const c = svgEl('circle', { cx: p.X, cy: p.Y,
        r: n.node_type === 'MANAGEMENT' ? 13 : n.node_type === 'ATTACKER' ? 11 : 10,
        fill: offline ? 'transparent' : (TYPE_COLOR[n.node_type] || 'var(--ink-3)'),
        stroke: isolated ? 'var(--critical)' : offline ? 'var(--ink-3)' : 'var(--good)',
        'stroke-width': isolated ? 3 : 2,
        'stroke-dasharray': isolated ? '4 3' : '' });
      g.append(c);
      const label = svgEl('text', { x: p.X, y: p.Y + 24 });
      label.textContent = (isolated ? '⛔' : offline ? '○ ' : '') + n.node_id;
      if (isolated) label.setAttribute('fill', 'var(--critical)');
      g.append(label);
      if (n.node_type === 'ATTACKER') {
        const tag = svgEl('text', { x: p.X, y: p.Y - 16, 'text-anchor': 'middle', fill: 'var(--critical)', 'font-size': '10' });
        tag.textContent = '⚠ ATTACKER';
        g.append(tag);
      }
      g.addEventListener('mousemove', ev => showTip(
        '<b>' + n.node_id + '</b><br>类型 ' + n.node_type + ' · 状态 ' + n.status +
        '<br>SM9 ' + trunc(n.sm9_identity || '—', 30) +
        '<br>邻居 ' + (n.neighbors || '[]') + (n.risk_score ? '<br>风险分 ' + n.risk_score : ''), ev.clientX, ev.clientY));
      g.addEventListener('mouseleave', hideTip);
      svg.append(g);
    });
    return svg;
  }
  function topoLegend() {
    const it = (color, icon, text, dashed) => h('span', {},
      h('i', { style: { background: dashed ? 'transparent' : color, border: dashed ? '2px dashed ' + color : 'none' } }), icon ? icon + ' ' : '', text);
    return h('div', { class: 'topo-legend' },
      it('var(--series-1)', '', 'UAV 节点'), it('var(--series-2)', '', 'EDGE 边缘'),
      it('var(--series-3)', '', 'MANAGEMENT 管理'), it('var(--critical)', '⚠', 'ATTACKER 攻击者'),
      it('var(--good)', '●', 'ONLINE 描边'), it('var(--ink-3)', '○', 'OFFLINE 空心'),
      it('var(--critical)', '⛔', 'ISOLATED 虚线圈'),
      h('span', {}, h('i', { style: { background: 'var(--critical)', height: '3px', width: '14px', borderRadius: 0 } }), '虫洞伪造边'),
      h('span', {}, h('i', { style: { background: 'var(--series-1)', height: '3px', width: '14px', borderRadius: 0 } }), '当前会话路径'));
  }

  function render(root) {
    root.append(h('div', { class: 'page-head' },
      h('h1', {}, '幕二 · 系统二：链下可信网络虫洞攻防'),
      h('p', {}, '无人机经链下多跳网络与管理节点通信。攻击者部署虫洞隧道伪造邻接、诱导路由，' +
        '系统以五维证据（身份/邻接/延迟/挑战/路径）判定并隔离，随后 Dijkstra 自动规避恢复通信。'),
      h('div', { class: 'flow-steps', id: 'act2-flow' })));
    const flowNames = ['会话建立', '基线消息', '虫洞部署', '攻击态消息', '风险判定', '事件流水', '路径规避', '恢复验证', '关闭隧道', '对比实验'];
    const flowBar = root.querySelector('#act2-flow');
    flowNames.forEach((n, i) => flowBar.append(h('span', { class: 'flow-step', 'data-i': i }, (i + 1) + '. ' + n)));
    const markFlow = (i, cls) => { const el = flowBar.querySelector('[data-i="' + i + '"]'); if (el) el.className = 'flow-step ' + cls; };

    const out = {};
    function sec(id, title, sub, ...body) {
      const box = h('div', { class: 'mt8' });
      out[id] = box;
      root.append(card(title, sub, ...body, box));
      return box;
    }

    /* ===== 一键幕二 ===== */
    root.append(card(null, null, h('div', { class: 'row' },
      asyncBtn('▶ 一键实跑幕二攻防剧本', runAll, 'btn-primary'),
      h('span', { class: 'small muted' }, '会话建立 → 基线消息×2 → 虫洞 ON → 攻击态消息（延迟骤降）→ 五维风险判定 DETECT+ISOLATE → 路径规避 RECOVERED → 恢复消息 → 虫洞 OFF → DEFENSE 对比实验'))));

    /* ===== 节点注册 ===== */
    const nForm = h('div', { class: 'form-grid' },
      field('nodeId', '节点ID node_id', { value: 'N-WEB-' + UI.tsSuffix() }),
      fieldSelect('nodeType', '类型 node_type', ['EDGE', 'UAV', 'MANAGEMENT', 'ATTACKER'], 'EDGE'),
      field('px', '坐标 X', { type: 'number', value: 15 }),
      field('py', '坐标 Y', { type: 'number', value: 25 }));
    sec('node', '① 节点注册与台账', 'node_type 合法枚举 UAV/EDGE/MANAGEMENT/ATTACKER（非法值报 4003）；注册自动派生 SM9 身份。',
      nForm,
      h('div', { class: 'btn-row' },
        asyncBtn('注册节点 node/register', () => {
          const f = readForm(nForm);
          return run(out.node, '/api/node/register', { node_id: f.nodeId, node_type: f.nodeType, position: { X: Number(f.px), Y: Number(f.py) } },
            d => kv([['节点', h('code', {}, d.node_id)], ['类型', d.node_type], ['SM9（自动派生）', h('code', {}, d.sm9_identity)], ['状态', statusBadge(d.status)]]));
        }, 'btn-primary'),
        asyncBtn('节点台账 node/list', () => run(out.node, '/api/node/list', {}, d =>
          table([{ title: '节点', render: r => h('code', { class: 'mono' }, r.node_id) },
            { title: '类型', key: 'node_type' }, { title: 'SM9', render: r => h('code', { class: 'mono' }, trunc(r.sm9_identity, 26)) },
            { title: '邻居', render: r => h('span', { class: 'small' }, r.neighbors) },
            { title: '状态', render: r => statusBadge(r.status) },
            { title: '风险分', num: true, key: 'risk_score' }], d.records || [])))));

    /* ===== 拓扑 ===== */
    const topoBox = h('div', {});
    sec('topo', '② 网络拓扑', '节点填充色 = 类型（图例），描边 = 状态（绿=ONLINE / 灰空心=OFFLINE / 红虚线⛔=ISOLATED）；红虚线边 = 虫洞伪造边，蓝边 = 当前会话路径。悬停查看详情。',
      h('div', { class: 'btn-row' },
        asyncBtn('⟳ 拉取拓扑 topology/get', loadTopo, 'btn-primary')),
      topoBox);
    async function loadTopo() {
      const r = await call('/api/topology/get', {});
      topoBox.innerHTML = '';
      if (!r.ok) { topoBox.append(h('div', { class: 'callout danger' }, 'code=' + r.code + ' ' + r.message)); return; }
      const t = r.data;
      S.topo = t;
      const tblView = h('div', { style: { display: 'none' }, class: 'mt8' },
        table([{ title: '节点', key: 'node_id' }, { title: '类型', key: 'node_type' }, { title: '状态', render: n => statusBadge(n.status) }], t.nodes),
        h('div', { style: { height: '8px' } }),
        table([{ title: '边', render: e => e.from + ' ⇄ ' + e.to },
          { title: '距离', num: true, render: e => Number(e.distance || 0).toFixed(1) },
          { title: '宣告延迟', num: true, render: e => (e.advertised_latency_ms ?? '—') + 'ms' },
          { title: '虫洞边', render: e => e.wormhole_edge ? h('span', { class: 'badge critical' }, '⚠ 是') : '否' }], t.edges));
      const svgWrap = h('div', { class: 'topo-wrap' },
        topoSVG(t, S.hlPath), topoLegend());
      topoBox.append(
        h('div', { class: 'row mb8' },
          h('span', { class: 'badge ' + (t.wormhole_enabled ? 'critical' : 'good') }, t.wormhole_enabled ? '⚠ 虫洞隧道已开启' : '✓ 隧道关闭'),
          h('span', { class: 'small muted' }, t.nodes.length + ' 节点 / ' + t.edges.length + ' 边' +
            ((t.isolated && t.isolated.length) ? ' · ⛔ 隔离中：' + t.isolated.join('、') : '') +
            ' · 活跃会话 ' + (t.active_sessions ?? '—')),
          h('button', { class: 'btn btn-sm btn-ghost', onClick: e => {
            const show = tblView.style.display === 'none';
            tblView.style.display = show ? 'block' : 'none';
            svgWrap.style.display = show ? 'none' : 'block';
            e.target.textContent = show ? '图形视图' : '表格视图'; } }, '表格视图')),
        svgWrap, tblView);
    }
    loadTopo();

    /* ===== 会话 ===== */
    const sForm = h('div', { class: 'form-grid' },
      fieldSelect('uavId', '无人机 uav_id', ['UAV-A-001', 'UAV-B-001', 'UAV-C-001'], 'UAV-A-001'));
    sec('sess', '③ 会话建立（SM9 挑战-响应认证）', 'session/open 下发随机 nonce，机载节点 SM9 签名回传，验签通过才建会话；初始路径按拓扑最短路计算。',
      sForm,
      h('div', { class: 'btn-row' },
        asyncBtn('建立会话 session/open', () => {
          const f = readForm(sForm);
          return run(out.sess, '/api/session/open', { uav_id: f.uavId }, d => {
            S.sess = d.session.session_id; S.hlPath = d.path; markFlow(0, 'done'); loadTopo();
            return h('div', {},
              kv([['会话', h('code', {}, d.session.session_id)], ['状态', statusBadge(d.session.status)],
                ['SM9 身份', h('code', {}, d.auth.sm9_identity)], ['nonce', h('code', {}, trunc(d.auth.nonce, 34))],
                ['验签', d.auth.verified ? h('span', { class: 'badge good' }, '✓ verified=true') : h('span', { class: 'badge critical' }, '✕ 未通过')]]),
              pathChips(d.path));
          });
        }, 'btn-primary'),
        asyncBtn('会话列表 session/list', () => run(out.sess, '/api/session/list', {}, d =>
          table([{ title: '会话', render: r => h('code', { class: 'mono' }, trunc(r.session_id, 24)) },
            { title: '无人机', key: 'uav_id' }, { title: '状态', render: r => statusBadge(r.status) },
            { title: '当前路径', render: r => h('span', { class: 'small mono' }, trunc(r.current_path, 60)) }], d.records || []))),
        asyncBtn('关闭会话 session/close', () => S.sess ? run(out.sess, '/api/session/close', { session_id: S.sess, operator: 'OP-1', reason: '网页演示完毕' }, d => {
          S.sess = null; S.hlPath = null; loadTopo();
          return kv([['状态', statusBadge((d && d.status) || 'CLOSED')]]);
        }) : (toast('先建立会话', 'err'), Promise.resolve()), 'btn-danger')));
    function pathChips(path) {
      if (!path || !path.length) return null;
      return h('div', { class: 'row mt8' }, ...path.map((p, i) => [
        h('span', { class: 'badge' }, h('i', { class: 'bi' }, '●'), p),
        i < path.length - 1 ? h('span', { class: 'muted' }, '→') : null]).flat());
    }

    /* ===== 消息 ===== */
    const msgForm = h('div', { class: 'form-grid' },
      fieldSelect('msgType', '消息类型 msg_type', ['POSITION_UPDATE', 'ROUTE_STATUS', 'HEARTBEAT', 'PASS_VERIFY'], 'POSITION_UPDATE'),
      field('src', '源节点 source_node', { value: 'UAV-A-001-NODE' }),
      field('dst', '目标节点 target_node', { value: 'MGR' }));
    sec('msg', '④ 消息传输（SM3 完整性 + 逐跳证据）', '每条消息带 SM3 摘要与逐跳 path_detail 延迟证据；攻击态下路由被隧道劫持、延迟"快得违反物理"。',
      msgForm,
      h('div', { class: 'btn-row' },
        asyncBtn('发送消息 message/send', sendMsg),
        asyncBtn('会话消息列表 message/list', () => S.sess ? run(out.msg, '/api/message/list', { session_id: S.sess, page: 1, page_size: 12 }, d => {
          const st = d.stats || {};
          return h('div', {},
            h('div', { class: 'row mb8' },
              h('span', { class: 'badge good' }, '✓ 成功率 ' + Math.round((st.success_rate || 0) * 100) + '%'),
              h('span', { class: 'small muted' }, '共 ' + d.total + ' 条 · avg ' + st.avg_latency_ms + 'ms · p50 ' + st.p50_latency_ms + 'ms · p95 ' + st.p95_latency_ms + 'ms · max ' + st.max_latency_ms + 'ms')),
            table([{ title: 'seq', num: true, key: 'seq' },
              { title: '类型', key: 'msg_type' },
              { title: 'SM3', render: r => h('code', { class: 'mono' }, trunc(r.sm3_hash, 20)) },
              { title: '路径', render: r => h('span', { class: 'small mono' }, trunc(r.path, 52)) },
              { title: '延迟', num: true, render: r => r.latency_ms + 'ms' },
              { title: '状态', render: r => statusBadge(r.status) }], d.records || []));
        }) : (toast('先建立会话', 'err'), Promise.resolve()))));
    function sendMsg() {
      if (!S.sess) { toast('先建立会话', 'err'); return Promise.resolve(); }
      const f = readForm(msgForm);
      return run(out.msg, '/api/message/send', { session_id: S.sess, msg_type: f.msgType, source_node: f.src, target_node: f.dst }, d => {
        const m = d.message;
        const det = d.path_detail || [];
        const throughTunnel = det.some(x => /NODE-[XY]/.test(x.from + x.to));
        if (throughTunnel) markFlow(3, 'done'); else if (!S.msgOnce) { S.msgOnce = true; markFlow(1, 'done'); }
        return h('div', {},
          kv([['消息', h('code', {}, m.message_id)], ['seq', m.seq], ['类型', m.msg_type],
            ['延迟', h('b', { style: throughTunnel ? { color: 'var(--critical)' } : null }, m.latency_ms + 'ms' + (throughTunnel ? ' ⚠ 经由虫洞隧道（低于物理下限）' : ''))],
            ['SM3', h('code', { class: 'mono' }, trunc(m.sm3_hash, 40))], ['状态', statusBadge(m.status)]]),
          h('div', { class: 'row mt8' }, ...det.flatMap((x, i) => [
            h('span', { class: 'badge ' + (/NODE-[XY]/.test(x.from + x.to) ? 'critical' : '') },
              h('i', { class: 'bi' }, /NODE-[XY]/.test(x.from + x.to) ? '⚠' : '·'), x.from + '→' + x.to + ' ' + x.latency_ms + 'ms'),
          ])));
      });
    }

    /* ===== 攻防 ===== */
    sec('atk', '⑤ 虫洞部署 · 五维检测 · 隔离 · 规避', 'wormhole/toggle 注入伪造邻接；risk/evaluate 五维累积评分（>0.7 → DETECT+ISOLATE，会话 DEGRADED）；path/switch 在剔除隔离节点的拓扑上重算路径（仅 DEGRADED 会话可切，否则 4002）。',
      h('div', { class: 'btn-row' },
        asyncBtn('⚠ 部署虫洞 wormhole/toggle ON', () => run(out.atk, '/api/wormhole/toggle', { enabled: true, operator: 'ATTACKER-SIM' }, d => {
          markFlow(2, 'done'); loadTopo();
          return kv([['隧道', d.wormhole_enabled ? h('span', { class: 'badge critical' }, '⚠ 已开启') : '关闭'],
            ['受影响节点', (d.nodes_affected || []).join('、') || '（无 —— ISOLATED 残留态需 demo/reset 清除，重复开启报 4001）']]);
        }), 'btn-danger'),
        asyncBtn('五维风险判定 risk/evaluate', () => S.sess ? run(out.atk, '/api/risk/evaluate', { session_id: S.sess }, d => {
          S.lastRisk = d; markFlow(4, d.verdict === 'DETECT' ? 'done' : 'current'); loadTopo();
          const dims = d.dimensions || {};
          return h('div', {},
            h('div', { class: 'row mb8' },
              h('span', { class: 'tiles' },
                h('span', { class: 'tile', style: { minWidth: '180px' } },
                  h('span', { class: 't-label' }, '⚠ 风险评分（阈值 ' + d.threshold + '）'),
                  h('span', { class: 't-value ' + (d.verdict === 'DETECT' ? 'critical' : 'good') }, String(d.risk_score)),
                  h('span', { class: 't-sub' }, '判定 ' + d.verdict + ' · 会话 ' + d.session_status))),
              statusBadge(d.verdict), statusBadge(d.session_status)),
            hbarChart(Object.entries(dims).map(([k, v]) => ({
              label: ({ identity: '身份 identity', adjacency: '邻接 adjacency', latency: '延迟 latency', challenge: '挑战 challenge', path: '路径 path' })[k] || k,
              value: v, display: String(v), tone: v >= 0.25 ? 'critical' : v > 0 ? 'warn' : '',
              tip: '维度得分 ' + v + '（计入总分 ' + d.risk_score + '）',
            })), { seriesName: '风险维度得分', max: 0.45, unit: '' }),
            (d.events || []).length ? h('div', { class: 'mt8' },
              h('div', { class: 'small muted mb8' }, '本次判定产生的事件：'),
              table([{ title: '事件', render: e => h('code', { class: 'mono' }, trunc(e.event_id, 20)) },
                { title: '动作', render: e => statusBadge(e.action) },
                { title: '节点对', render: e => e.node_x + ' ⇄ ' + e.node_y },
                { title: '评分', num: true, key: 'risk_score' }], d.events)) : null);
        }) : (toast('先建立会话', 'err'), Promise.resolve()), 'btn-danger'),
        asyncBtn('事件流水 event/list', () => S.sess ? run(out.atk, '/api/event/list', { session_id: S.sess }, d => {
          markFlow(5, 'done');
          return table([{ title: '事件', render: r => h('code', { class: 'mono' }, trunc(r.event_id, 20)) },
            { title: '动作', render: r => statusBadge(r.action) },
            { title: '节点对', render: r => r.node_x + ' ⇄ ' + r.node_y },
            { title: '评分', num: true, key: 'risk_score' },
            { title: '新路径', render: r => h('span', { class: 'small mono' }, trunc(r.new_path || '—', 46)) },
            { title: '恢复延迟', num: true, render: r => r.recovery_latency_ms ? r.recovery_latency_ms + 'ms' : '—' },
            { title: '时间', render: r => h('span', { class: 'small' }, r.created_at) }], d.records || []);
        }) : (toast('先建立会话', 'err'), Promise.resolve())),
        asyncBtn('路径规避切换 path/switch', () => S.sess ? run(out.atk, '/api/path/switch', { session_id: S.sess, operator: 'OP-1' }, d => {
          markFlow(6, 'done'); S.hlPath = d.new_path; loadTopo();
          return h('div', {},
            kv([['会话状态', statusBadge(d.session.status)], ['恢复延迟', h('b', {}, d.recovery_latency_ms + 'ms')],
              ['RECOVER 事件', h('code', {}, d.event ? d.event.event_id : '—')]]),
            h('div', { class: 'small muted mt8' }, '原路径（含被隔离节点）：'), pathChips(d.original_path),
            h('div', { class: 'small muted mt8' }, '新路径（Dijkstra 剔除 ISOLATED 后重算）：'), pathChips(d.new_path));
        }) : (toast('先建立会话', 'err'), Promise.resolve()), 'btn-primary'),
        asyncBtn('关闭隧道 wormhole/toggle OFF', () => run(out.atk, '/api/wormhole/toggle', { enabled: false, operator: 'ATTACKER-SIM' }, d => {
          markFlow(8, 'done'); loadTopo();
          return kv([['隧道', d.wormhole_enabled ? '开启' : h('span', { class: 'badge good' }, '✓ 已关闭')],
            ['受影响节点', (d.nodes_affected || []).join('、') || '（ISOLATED 不随关闭解除 —— 隔离是监管处置，仅 demo/reset 可清）']]);
        })),
      ));

    /* ===== 实验 ===== */
    const eForm = h('div', { class: 'form-grid' },
      fieldSelect('expType', '实验类型 experiment_type', ['MESSAGE_FLOW', 'CROSSCHAIN_LOOP'], 'MESSAGE_FLOW'),
      fieldSelect('scenario', '场景 scenario（MESSAGE_FLOW 必填）', ['NORMAL', 'ATTACK', 'DEFENSE'], 'DEFENSE'),
      field('count', '次数 count', { type: 'number', value: 5 }));
    sec('exp', '⑥ 攻防对比实验', 'NORMAL / ATTACK / DEFENSE 三场景批量压测：ATTACK 在隧道开启态跑（消息被劫持），DEFENSE 在隔离规避后跑（干净拓扑），对比成功率与延迟分位。',
      eForm,
      h('div', { class: 'btn-row' },
        asyncBtn('运行实验 experiment/run', () => {
          const f = readForm(eForm);
          return run(out.exp, '/api/experiment/run', { experiment_type: f.expType, scenario: f.scenario, count: Number(f.count) || 5 }, d => {
            markFlow(9, 'done');
            S.runId = d.run_id;
            return h('div', {},
              h('div', { class: 'tiles' },
                h('div', { class: 'tile' }, h('div', { class: 't-label' }, '✓ 成功率'), h('div', { class: 't-value ' + (d.success_rate >= 1 ? 'good' : '') }, Math.round(d.success_rate * 100) + '%'), h('div', { class: 't-sub' }, d.success_count + '/' + d.count + ' 成功')),
                h('div', { class: 'tile' }, h('div', { class: 't-label' }, '⏱ p95 延迟'), h('div', { class: 't-value' }, d.p95_latency_ms + 'ms'), h('div', { class: 't-sub' }, 'avg ' + d.avg_latency_ms + ' · p50 ' + d.p50_latency_ms + ' · max ' + d.max_latency_ms)),
                h('div', { class: 'tile' }, h('div', { class: 't-label' }, '▦ 运行'), h('div', { class: 't-value', style: { fontSize: '15px' } }, d.run_id), h('div', { class: 't-sub' }, d.scenario + ' · ' + statusBadge(d.status).textContent))),
              hbarChart([
                { label: '平均延迟', value: d.avg_latency_ms, display: d.avg_latency_ms + 'ms' },
                { label: 'p50', value: d.p50_latency_ms, display: d.p50_latency_ms + 'ms' },
                { label: 'p95', value: d.p95_latency_ms, display: d.p95_latency_ms + 'ms' },
                { label: '最大', value: d.max_latency_ms, display: d.max_latency_ms + 'ms' }],
                { seriesName: '延迟分位（' + d.scenario + '）', unit: 'ms' }));
          });
        }, 'btn-primary'),
        asyncBtn('实验列表 experiment/list', () => run(out.exp, '/api/experiment/list', {}, d =>
          table([{ title: '实验', render: r => h('code', { class: 'mono' }, trunc(r.experiment_id, 22)) },
            { title: 'run', render: r => h('code', { class: 'mono' }, trunc(r.run_id, 18)) },
            { title: '类型/场景', render: r => r.experiment_type + ' / ' + (r.scenario || '—') },
            { title: '成功率', num: true, render: r => Math.round((r.success_rate || 0) * 100) + '%' },
            { title: 'p95', num: true, render: r => (r.p95_latency_ms ?? '—') + 'ms' },
            { title: '状态', render: r => statusBadge(r.status) }], d.records || []))),
        asyncBtn('按 run_id 查结果 experiment/result', () => S.runId ? run(out.exp, '/api/experiment/result', { run_id: S.runId }, d => jsonBlock(d)) : (toast('先运行一次实验', 'err'), Promise.resolve())),
        asyncBtn('导出实验 experiment/export', () => run(out.exp, '/api/experiment/export', {}, d => {
          downloadJSON('skytrust-experiments.json', d);
          return h('div', { class: 'callout' }, '已触发浏览器下载（JSON，含全部实验运行记录）。');
        }))));

    function downloadJSON(name, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.append(a); a.click(); a.remove();
    }

    /* ===== 一键剧本 ===== */
    async function runAll() {
      const clickBtn = (sec_, i) => {
        const cardEl = out[sec_].parentElement;
        const btns = cardEl.querySelectorAll('.btn-row .btn');
        btns[i].click();
      };
      const wait = () => new Promise(res => {
        const t = setInterval(() => { if (!document.querySelector('.btn:disabled')) { clearInterval(t); setTimeout(res, 150); } }, 80);
        setTimeout(() => { clearInterval(t); res(); }, 25000);
      });
      const steps = [
        ['sess', 0],  // 会话
        ['msg', 0], ['msg', 0],  // 基线×2
        ['atk', 0],   // 虫洞 ON
        ['msg', 0],   // 攻击态消息
        ['atk', 1],   // risk
        ['atk', 2],   // events
        ['atk', 3],   // path switch
        ['msg', 0],   // 恢复消息
        ['atk', 4],   // 虫洞 OFF
        ['exp', 0],   // DEFENSE 实验
      ];
      for (const [s_, i] of steps) { clickBtn(s_, i); await wait(); }
      toast('幕二攻防剧本实跑完毕（风险评分 ' + (S.lastRisk ? S.lastRisk.risk_score + ' → ' + S.lastRisk.verdict : '?') + '）', 'ok', 6000);
    }
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.act2 = { render };
})();
