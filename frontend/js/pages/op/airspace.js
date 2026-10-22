/* airspace.js — 运营商端·空域查询（计划 B Task 8，spec §5.1）
   走廊/航段/网络节点一张图：route/list（zone、corridor_status 服务端过滤）+ topology/get 节点叠加
   （ATTACKER 攻击节点属监管域，不在运营端展示）+「网络节点图层开关」复选框（spec §5.1）；
   地图点航线或右列列表项 → 航段详情卡 + 高亮。
   红线：lat/lon 0 = 未设 → fmtCoordPair 显示「坐标未设」，GEO 守卫不画不猜；
   zone 多边形宽度为示意值（GEO.zonePolygon widthDeg），非真实空域边界。
   端点：route/list、topology/get。spec §5.1 端点列还列了 node/list，但其过滤键仅
   node_type/status 等值、无法服务端排除 ATTACKER——运营端用它会把攻击节点泄进台账
   （违反信息边界），故节点数据源一律 topology/get 前端过滤（node/list 由管理端
   netsec 使用，Task 10 已用；偏差已在 Task 8 Produces 记录）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    var routes = [];

    root.append(P.pageHead({
      title: '空域查询',
      sub: '走廊状态 · 航段详情 · 网络节点一张图' }));
    var nodesOn = true;   /* 网络节点图层开关（spec §5.1） */
    var legend = legendBar();
    var nodesChk = h('input', { type: 'checkbox', checked: true,
      onchange: function () { nodesOn = nodesChk.checked; loadNodes(); } });
    legend.append(h('span', { class: 'd-idchip' },
      h('label', { class: 'd-small' }, nodesChk, ' 网络节点图层')));
    root.append(legend);

    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var detail = h('div', { class: 'd-col' }, P.empty('点击地图航线或右侧列表项查看航段详情'));
    var listBox = h('div', { class: 'd-col' }, P.empty('尚未查询'));
    var countEl = h('span', { class: 'd-strong' }, '—');
    var f = P.form([
      { name: 'zone', label: '空域分区', type: 'text', placeholder: 'Zone-A / Zone-B（留空查全部）' },
      { name: 'corridor_status', label: '走廊状态', type: 'select',
        options: [['', '全部'], ['OPEN', 'OPEN · 开放走廊'], ['RESTRICTED', 'RESTRICTED · 限制走廊'], ['CLOSED', 'CLOSED · 关闭走廊']] }
    ]);

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' }, mapEl,
        h('div', { class: 'd-map-hint' }, '🗺️ 点击航线查看详情并高亮。走廊着色：绿色为开放 OPEN · 琥珀色为限制 RESTRICTED · 红色为关闭 CLOSED。')),
      h('div', { class: 'd-col' },
        card('查询条件', f.root,
          P.actionBar([
            { label: '查询空域', kind: 'primary', run: doQuery },
            { label: '重置', run: function () { f.set('zone', ''); f.set('corridor_status', ''); doQuery(); } }]),
          h('div', { class: 'd-small d-muted d-mt' }, '命中航段：', countEl)),
        card('航段列表', listBox),
        card('航段详情', detail))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadNodes();
    doQuery();

    async function doQuery() {
      var b = f.read();
      var body = { page: 1, page_size: 200 };
      if (b.zone) body.zone = b.zone;
      if (b.corridor_status) body.corridor_status = b.corridor_status;
      listBox.innerHTML = '';
      listBox.append(h('div', { class: 'p-empty' }, '⏳ 空域航段查询中…'));
      var r = await API.call('/api/route/list', body);
      if (!listBox.isConnected) return;
      listBox.innerHTML = '';
      if (!r.ok) { listBox.append(P.errCard(r)); return; }
      routes = r.data.records || [];
      countEl.textContent = String(r.data.total || routes.length);
      redraw('');
      detail.innerHTML = '';
      detail.append(P.empty('点击地图航线或右侧列表项查看航段详情'));
      if (!routes.length) listBox.append(P.empty('无命中航段 —— 调整查询条件'));
      routes.forEach(function (rt) {
        listBox.append(h('div', { class: 'p-card', style: { cursor: 'pointer' },
          onclick: function () { showDetail(rt.route_id); } },
          h('div', { class: 'd-row' },
            h('code', { class: 'p-mono d-strong' }, rt.route_id),
            P.badge(rt.corridor_status),
            h('span', { class: 'd-small d-muted' }, rt.zone)),
          h('div', { class: 'd-small d-muted' }, rt.start_point + ' → ' + rt.end_point)));
      });
    }

    function redraw(activeId) {
      if (!mx) return;
      mx.clear('zones'); mx.clear('routes');
      mx.drawZones(routes);
      mx.drawRoutes(routes, {
        active: activeId ? [activeId] : [],
        opacity: 0.9,
        onPick: function (rt) { showDetail(rt.route_id); }
      });
    }

    function showDetail(rid) {
      var rt = null;
      for (var i = 0; i < routes.length; i++) if (routes[i].route_id === rid) { rt = routes[i]; break; }
      if (!rt) return;
      redraw(rid);
      detail.innerHTML = '';
      detail.append(P.kv([
        ['航段号', h('code', { class: 'p-mono' }, rt.route_id)],
        ['空域分区', rt.zone],
        ['走廊状态', h('span', {}, P.badge(rt.corridor_status),
          ' ' + (GEO.ZONE_LABEL[rt.corridor_status] || ''))],
        ['起止点', rt.start_point + ' → ' + rt.end_point],
        ['起点坐标', GEO.fmtCoordPair(rt.start_lat, rt.start_lon)],
        ['终点坐标', GEO.fmtCoordPair(rt.end_lat, rt.end_lon)],
        ['高度带', (rt.altitude_min || rt.altitude_max) ? rt.altitude_min + '–' + rt.altitude_max + ' m' : '未设'],
        ['登记时间', rt.created_at]
      ]));
    }

    async function loadNodes() {
      if (!nodesOn) { if (mx) mx.clear('nodes'); return; }   /* 图层开关关闭：只清节点层，走廊/航线不动 */
      var r = await API.call('/api/topology/get', {});
      if (!nodesOn) return;   /* 竞态守卫：在途请求期间开关被关闭 → 丢弃结果，不把节点画回 */
      if (!r.ok || !mx) return;
      mx.clear('nodes');
      mx.drawNodes((r.data.nodes || []).filter(function (n) { return n.node_type !== 'ATTACKER'; }));
    }
  }

  /* 图例条：走廊三色 + 运营端可见的三类节点（ATTACKER 不展示） */
  function legendBar() {
    function swatch(color) {
      return h('i', { style: { display: 'inline-block', width: '10px', height: '10px',
        'border-radius': '2px', background: color, 'margin-right': '4px' } });
    }
    var chips = GEO.ZONES.map(function (z) {
      return h('span', { class: 'd-idchip' }, swatch(GEO.ZONE_COLOR[z]), z + ' · ' + GEO.ZONE_LABEL[z]);
    });
    ['MANAGEMENT', 'EDGE', 'UAV'].forEach(function (t) {
      var s = GEO.NODE_STYLE[t];
      chips.push(h('span', { class: 'd-idchip' }, swatch(s.color), s.label));
    });
    return h('div', { class: 'd-row-wrap d-mb' }, chips);
  }

  OP.airspace = { render: render };
})();
