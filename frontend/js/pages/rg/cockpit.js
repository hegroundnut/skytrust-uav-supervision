/* cockpit.js — 监管当局端·监管驾驶舱（计划 B Task 11，spec §5.3）
   大屏 C 位布局：dashboard/summary 统计带 + 全屏态势真地图
   （走廊/航段/网络节点全量含 ATTACKER/虫洞伪造边/在飞无人机遥测/告警落点·点击→详情卡）
   + 告警类型分布 hbars + 最近告警（复用 alerts.js 的 alertKv/alertDrawer——脚本序 cockpit 在前，
   引用发生在运行时回调，届时已加载）。
   监管端信息边界：ATTACKER 节点与虫洞边全量可见（监管视角必须看到全貌）。
   告警落点坐标解析链（红线：任一环缺失即跳过，不画不猜）：
   alert.mission_id → mission/query → route_segments[0] → route 缓存 → start_lat/start_lon。
   在飞无人机 = session 状态 ∈ ACTIVE|DEGRADED|RECOVERED → telemetry/latest(session_id) → mx.drone；
   {telemetry:null}（裁决 17）= 暂无遥测跳过；坐标未设不画。
   marks 层重绘惯例：告警 pin/虫洞边在 marks 层；drone 在独立 drones 层组
   （clear/clear('marks') 均不触碰——Task 4 评审 I1 修复后）；重绘前先 clearDrones() 属注册表卫生。
   端点：dashboard/summary、route/list、topology/get、session/list、telemetry/latest、mission/query。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;      /* 态势地图（shell-rg 唯一 mapPage）：render 入口必先 destroy */
  var poll = null;    /* 惯例⑤：模块级 timer，DOM 脱离后自清 */
  var POLL_MS = 5000;
  var FLYING = { ACTIVE: 1, DEGRADED: 1, RECOVERED: 1 };   /* 在飞状态（含降级——攻击后果跨端可见） */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    if (poll) { clearInterval(poll); poll = null; }

    var routes = [];      /* route/list 缓存（告警落点解析依赖） */
    var sessions = [];    /* 在飞会话缓存 */
    var lastSeen = {};    /* 上轮在图无人机（demo/reset 后同步清图标） */
    var busy = false;

    var statsBox = h('div', {}, P.empty('⏳ 监管概览加载中…'));
    var hbarsBox = h('div', {}, P.empty('—'));
    var recentBox = h('div', {}, P.empty('—'));
    var pinBox = h('div', {}, P.empty('点击地图上的告警落点查看详情'));
    var genEl = h('span', { class: 'd-small d-muted' }, '');
    var flyingEl = h('b', {}, '0');
    var autoEl = h('input', { type: 'checkbox', checked: true });
    var mapEl = h('div', { class: 'd-map d-map-xl' });

    root.append(P.pageHead({
      title: '监管驾驶舱',
      sub: '跨域态势大屏——航线、节点、在飞无人机与告警落点，一屏总览' }));
    root.append(statsBox);
    root.append(h('div', { class: 'd-toolbar' },
      h('label', { class: 'd-small' }, autoEl, ' 自动刷新(5s)'),
      h('button', { class: 'p-btn', onClick: function () { loadAll(); } }, '立即刷新'),
      h('span', { class: 'd-spacer' }),
      h('span', { class: 'd-small d-muted' }, '在飞：'), flyingEl, h('span', { class: 'd-small d-muted' }, ' 架'),
      genEl));
    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' }, mapEl,
        h('div', { class: 'd-map-hint' }, '✈️ = 在飞无人机；红虚线 = 虫洞伪造链路；红色落点 = 告警，点击查看详情。ATTACKER 节点监管端全量可见。自动刷新更新在飞无人机位置；统计与告警落点随「立即刷新」更新。暂无遥测数据的航空器不在图上显示。')),
      h('div', { class: 'd-col' },
        card('告警类型分布', hbarsBox),
        card('最近告警（前 5）', recentBox),
        card('告警落点详情', pinBox))));
    /* --- 能力态势：三大绩效目标能力卡（实时证据 + 一键实验自证，高危实验有门禁）--- */
    root.append(CAPX.section('cockpit'));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadAll();
    setPoll(true);

    autoEl.addEventListener('change', function () { setPoll(autoEl.checked); });

    function setPoll(on) {
      if (poll) { clearInterval(poll); poll = null; }
      if (on) poll = setInterval(tick, POLL_MS);
    }

    async function loadAll() {
      await loadBase();      /* 先基础层（会清 marks），再落点（画进 marks）——顺序不可反 */
      await loadSummary();
    }

    /* 轻量轮询：只拉在飞无人机遥测（summary/落点走「立即刷新」） */
    async function tick() {
      if (!document.body.contains(mapEl)) { if (poll) { clearInterval(poll); poll = null; } return; }
      if (busy || !sessions.length) return;
      busy = true;
      try {
        var res = await Promise.all(sessions.map(function (s) {
          return API.call('/api/telemetry/latest', { session_id: s.session_id });
        }));
        var seen = {};
        res.forEach(function (r, i) {
          var s = sessions[i];
          if (!r.ok || !r.data || !r.data.telemetry) return;   /* 裁决 17：null = 暂无遥测，正常 */
          var t = r.data.telemetry;
          var c = GEO.telemetryCoord(t);
          if (!c) return;                                       /* 红线：坐标未设不画 */
          seen[s.uav_id] = true;
          if (mx) mx.drone(s.uav_id, c[0], c[1], t.heading);
        });
        Object.keys(lastSeen).forEach(function (id) {
          if (!seen[id] && mx) mx.removeDrone(id);
        });
        lastSeen = seen;
        flyingEl.textContent = String(Object.keys(seen).length);
      } finally { busy = false; }
    }

    /* 基础层：航段+走廊 / 拓扑全量（节点含 ATTACKER + 虫洞边）/ 在飞会话 → 立即画一轮无人机 */
    async function loadBase() {
      var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
      if (rr.ok) {
        routes = rr.data.records || [];
        if (mx) {
          mx.clear('zones'); mx.clear('routes');
          mx.drawZones(routes);
          mx.drawRoutes(routes, { opacity: 0.8 });
          if (!routes.length) mx.setEmpty('暂无航段数据');
          else mx.clearEmpty();
        }
      }
      var tr = await API.call('/api/topology/get', {});
      var sr = await API.call('/api/session/list', { page: 1, page_size: 200 });
      if (sr.ok) {
        sessions = (sr.data.records || []).filter(function (s) { return FLYING[s.status]; });
      }
      if (mx) {
        /* 顺序固化：clearDrones 清 drones 层组+注册表，再清 nodes/marks（告警 pin/虫洞边在 marks），tick() 重建 */
        mx.clearDrones();
        mx.clear('nodes'); mx.clear('marks');
        if (tr.ok) {
          mx.drawWormholes(tr.data.edges || [], tr.data.nodes || []);
          mx.drawNodes(tr.data.nodes || []);
        }
      }
      lastSeen = {};
      await tick();   /* 若恰逢轮询在途（busy）会早退——下一轮 interval（≤5s）自愈重建图标 */
    }

    async function loadSummary() {
      var r = await API.call('/api/dashboard/summary', {});
      if (!statsBox.isConnected) return;
      statsBox.innerHTML = '';
      if (!r.ok) { statsBox.append(P.errCard(r)); return; }
      var d = r.data;
      statsBox.append(P.statCards([
        { label: '告警 · 待处置', value: d.alerts.open,
          sub: '高危未决：' + d.alerts.high_open,
          tone: d.alerts.high_open > 0 ? 'critical' : null },
        { label: '告警 · 总数', value: d.alerts.total,
          sub: '认定 ' + d.alerts.identified + ' · 已追踪 ' + d.alerts.traced + ' · 已办结 ' + d.alerts.resolved },
        { label: '监管授权', value: d.authorizations.authorized,
          sub: '待审 ' + d.authorizations.pending + ' · 拒绝 ' + d.authorizations.denied + ' · 过期 ' + d.authorizations.expired,
          tone: d.authorizations.pending > 0 ? 'warning' : null },
        { label: '会话 · 活跃', value: d.sessions.active,
          sub: '降级 ' + d.sessions.degraded + ' · 恢复 ' + d.sessions.recovered + ' · 关闭 ' + d.sessions.closed,
          tone: d.sessions.degraded > 0 ? 'warning' : null },
        { label: '虫洞事件', value: d.wormhole_events.total,
          sub: '检出 ' + d.wormhole_events.detect + ' · 隔离 ' + d.wormhole_events.isolate + ' · 恢复 ' + d.wormhole_events.recover,
          tone: d.wormhole_events.detect > 0 ? 'critical' : null }
      ]));
      genEl.textContent = '汇总生成：' + (d.generated_at || '—');

      /* 告警类型分布（by_type map → hbars 数组；红黄语义 Global Constraints #7） */
      var bt = d.alerts.by_type || {};
      var keys = Object.keys(bt);
      hbarsBox.innerHTML = '';
      hbarsBox.append(keys.length
        ? P.hbars(keys.map(function (k) { return { label: k, value: bt[k], tone: 'critical' }; }))
        : P.empty('暂无告警'));

      /* 最近 5 条告警（复用 alerts.js 的抽屉） */
      var rec = d.recent_alerts || [];
      recentBox.innerHTML = '';
      recentBox.append(rec.length
        ? h('div', { class: 'd-col' }, rec.map(function (a) {
            return h('button', { class: 'p-btn p-btn-ghost d-row',
              onClick: function () { RG.alerts.alertDrawer(a); } },
              h('code', { class: 'p-mono d-small' }, UI.trunc(a.alert_id, 20)),
              P.badge(a.risk_level), P.badge(a.status));
          }))
        : P.empty('暂无告警'));

      await drawPins(rec);
    }

    /* 告警落点：坐标解析链任一环缺失即跳过（红线#9：不画不猜） */
    async function drawPins(alerts) {
      if (!mx) return;
      var byId = {};
      routes.forEach(function (rt) { byId[rt.route_id] = rt; });
      for (var i = 0; i < alerts.length; i++) {
        var a = alerts[i];
        if (!a.mission_id) continue;
        var mr = await API.call('/api/mission/query', { mission_id: a.mission_id });
        if (!mr.ok || !mr.data) continue;
        var segs = PORTAL.jp(mr.data.route_segments, []);
        if (!Array.isArray(segs) || !segs.length) continue;
        var rt = byId[segs[0]];
        if (!rt) continue;
        var lat = Number(rt.start_lat), lon = Number(rt.start_lon);
        if (!GEO.hasCoord(lat, lon)) continue;
        (function (al, la, lo) {
          mx.alertPin(la, lo, al.alert_id + ' · ' + al.event_type, function () { showPin(al); });
        })(a, lat, lon);
      }
    }

    function showPin(a) {
      if (!pinBox.isConnected) return;
      pinBox.innerHTML = '';
      pinBox.append(RG.alerts.alertKv(a),
        P.actionBar([{ label: '详情与追踪 →', run: function () { RG.alerts.alertDrawer(a); } }]));
    }
  }

  RG.cockpit = { render: render };
})();
