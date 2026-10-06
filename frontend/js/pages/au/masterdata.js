/* masterdata.js — 管理当局端·主数据维护（计划 B Task 10，spec §5.2）
   厂商/运营商登记 + 航段登记（route/create）+ 航段台账。
   航段坐标：地图点选两点定起止（第 1 击=起点「起」，第 2 击=终点「止」，第 3 击清空重来），
   也可手填四个坐标字段；「半套视为缺失」红线（commit 50c4a03）——前端先拦再提交。
   台账全局共享：管理端登记的主数据运营商端同源可见（演示/维护场景）。
   端点：manufacturer/register·list、operator/register·list、route/create·list。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;          /* 页面级地图（shell-au mapPages 含 masterdata）：render 入口必先 destroy */
  var routes = [];        /* 航线缓存（地图全量拉取） */
  var activeId = [];      /* 地图高亮航段 id */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    routes = []; activeId = [];
    root.append(P.pageHead({
      title: '主数据维护',
      sub: '厂商 / 运营商 / 航段登记 · 地图点选两点定起降坐标 · 台账全局共享' }));

    /* --- 航段登记（地图点选 + 手填坐标双通道） --- */
    var rpRt = P.resultPanel();
    var fRt = P.form([
      { name: 'route_id', label: '航段号', type: 'text', required: true, placeholder: 'R901' },
      { name: 'zone', label: '所属空域', type: 'text', required: true, placeholder: 'Zone-A / Zone-B / Zone-D' },
      { name: 'start_point', label: '起点名', type: 'text', required: true,
        placeholder: '可内嵌坐标：S9(30.510,114.310)' },
      { name: 'end_point', label: '终点名', type: 'text', required: true,
        placeholder: '可内嵌坐标：E9(30.620,114.420)' },
      { name: 'start_lat', label: '起点纬度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'start_lon', label: '起点经度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'end_lat', label: '终点纬度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'end_lon', label: '终点经度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'altitude_min', label: '最低高度(m)', type: 'number', value: 60 },
      { name: 'altitude_max', label: '最高高度(m)', type: 'number', value: 120 }
    ]);
    var clickStage = 0;   /* 0=下一击起点，1=下一击终点，2=已齐下一击重来 */
    var mapEl = h('div', { class: 'd-map d-map-lg' });
    var tblRt = null;     /* 前向声明：登记成功 onOk 里 reload（赋值先于任何点击） */

    function onPickPoint(lat, lon) {
      if (!mx) return;
      if (clickStage === 0) {
        mx.clear('marks');
        mx.tempMarker(lat, lon, '起');
        fRt.set('start_lat', lat.toFixed(6));
        fRt.set('start_lon', lon.toFixed(6));
        clickStage = 1;
      } else if (clickStage === 1) {
        mx.tempMarker(lat, lon, '止');
        fRt.set('end_lat', lat.toFixed(6));
        fRt.set('end_lon', lon.toFixed(6));
        clickStage = 2;
      } else {
        mx.clear('marks');
        ['start_lat', 'start_lon', 'end_lat', 'end_lon'].forEach(function (k) { fRt.set(k, ''); });
        clickStage = 0;
      }
    }

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('航段登记 route/create', fRt.root,
          P.actionBar([{ label: '登记航段', kind: 'primary',
            confirm: { title: '登记航段', msg: '航段入库后全局可见（运营商端空域查询/飞行申请同源台账）。', ok: '登记' },
            run: P.runOp({
              path: '/api/route/create',
              body: function () {
                var v = PORTAL.need(fRt.read(), 'route_id', 'zone', 'start_point', 'end_point');
                if (!v) return null;
                var filled = [v.start_lat, v.start_lon, v.end_lat, v.end_lon]
                  .filter(function (x) { return x !== undefined; }).length;
                if (filled > 0 && filled < 4) {
                  UI.toast('坐标半套视为缺失：四个坐标要么全填、要么全留空（留空=服务端从点名内嵌坐标解析）', 'err', 5200);
                  return null;
                }
                var body = { route_id: v.route_id, zone: v.zone,
                  start_point: v.start_point, end_point: v.end_point };
                if (v.altitude_min !== undefined) body.altitude_min = v.altitude_min;
                if (v.altitude_max !== undefined) body.altitude_max = v.altitude_max;
                if (filled === 4) {
                  body.start_lat = v.start_lat; body.start_lon = v.start_lon;
                  body.end_lat = v.end_lat; body.end_lon = v.end_lon;
                }
                return body;
              },
              rp: rpRt, successText: '航段已登记',
              render: function (d) {
                return P.kv([
                  ['航段号', h('code', { class: 'p-mono' }, d.route_id)],
                  ['空域', d.zone],
                  ['走廊', P.badge(d.corridor_status)],
                  ['起 → 止', d.start_point + ' → ' + d.end_point],
                  ['起点坐标', GEO.fmtCoordPair(d.start_lat, d.start_lon)],
                  ['终点坐标', GEO.fmtCoordPair(d.end_lat, d.end_lon)],
                  ['高度带', d.altitude_min + '–' + d.altitude_max + ' m']
                ]);
              },
              note: { kind: 'ROUTE', id: function (d) { return d.route_id; },
                extra: function (d) { return { zone: d.zone }; } },
              onOk: function (d) {
                clickStage = 0;
                if (mx) mx.clear('marks');
                activeId = [d.route_id];
                loadRoutes();
                if (tblRt) tblRt.reload();
              }
            }) }]),
          rpRt.root,
          h('p', { class: 'd-small d-muted' }, '坐标红线：0 值 = 未设，不猜测、不绘制；显式坐标半套（只给 lat 或只给 lon）后端视为缺失 → 6002。'))),
      h('div', { class: 'd-col' }, mapEl,
        h('div', { class: 'd-map-hint' }, '地图点选：第 1 击 = 起点「起」，第 2 击 = 终点「止」，第 3 击清空重来；点已有航线可高亮'))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    mx.onMapClick(onPickPoint);
    loadRoutes();

    /* --- 航段台账（行点击 → 地图高亮 + 定位） --- */
    tblRt = P.dataTable({
      endpoint: '/api/route/list', pageSize: 10,
      filters: [
        { name: 'zone', label: '空域', type: 'text', placeholder: 'Zone-A' },
        { name: 'corridor_status', label: '走廊', type: 'select', options: ['OPEN', 'RESTRICTED', 'CLOSED'] }
      ],
      columns: [
        { title: '航段号', key: 'route_id', mono: true },
        { title: '空域', key: 'zone' },
        { title: '起 → 止', render: function (r) { return r.start_point + ' → ' + r.end_point; } },
        { title: '起点坐标', render: function (r) { return GEO.fmtCoordPair(r.start_lat, r.start_lon); }, mono: true },
        { title: '终点坐标', render: function (r) { return GEO.fmtCoordPair(r.end_lat, r.end_lon); }, mono: true },
        { title: '高度带', render: function (r) { return r.altitude_min + '–' + r.altitude_max + ' m'; } },
        { title: '走廊', render: function (r) { return P.badge(r.corridor_status); } }
      ],
      onRow: function (r) {
        activeId = [r.route_id];
        redraw();
        var pts = GEO.routePoints([r]);
        if (mx && pts.length) mx.fitPoints(pts);
      },
      emptyText: '暂无航段'
    });
    root.append(card('航段台账 route/list（点行 → 地图高亮定位）', tblRt));

    /* --- 厂商登记 --- */
    var tblMf = null;
    var rpMf = P.resultPanel();
    var fMf = P.form([
      { name: 'manufacturer_id', label: '厂商 ID', type: 'text', required: true, placeholder: 'Manufacturer-D' },
      { name: 'name', label: '厂商名称', type: 'text', required: true, placeholder: '样例无人机制造商' },
      { name: 'adapter_type', label: '适配类型（可选）', type: 'text', placeholder: '留空' }
    ]);
    tblMf = P.dataTable({
      endpoint: '/api/manufacturer/list', pageSize: 5,
      columns: [
        { title: '厂商 ID', key: 'manufacturer_id', mono: true },
        { title: '名称', key: 'name' },
        { title: '适配类型', render: function (r) { return r.adapter_type || '—'; } },
        { title: '状态', render: function (r) { return P.badge(r.status); } }
      ],
      emptyText: '暂无厂商'
    });
    var mfCard = card('厂商登记 manufacturer/register', fMf.root,
      P.actionBar([{ label: '注册厂商', kind: 'primary', run: P.runOp({
        path: '/api/manufacturer/register',
        body: function () {
          var v = PORTAL.need(fMf.read(), 'manufacturer_id', 'name');
          if (!v) return null;
          return { manufacturer_id: v.manufacturer_id, name: v.name, adapter_type: v.adapter_type || '' };
        },
        rp: rpMf, successText: '厂商已注册（status 服务端固定 ACTIVE）',
        render: function (d) {
          return P.kv([
            ['厂商 ID', h('code', { class: 'p-mono' }, d.manufacturer_id)],
            ['名称', d.name],
            ['状态', P.badge(d.status)]
          ]);
        },
        note: { kind: 'MANUFACTURER', id: function (d) { return d.manufacturer_id; } },
        onOk: function () { tblMf.reload(); }
      }) }]),
      rpMf.root, tblMf);

    /* --- 运营商登记 --- */
    var tblOp = null;
    var rpOp = P.resultPanel();
    var fOp = P.form([
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true, placeholder: 'Operator-D' },
      { name: 'name', label: '运营商名称', type: 'text', required: true, placeholder: '样例低空物流运营商' },
      { name: 'contact', label: '联系方式（可选）', type: 'text', placeholder: '027-88880000' },
      { name: 'chain_org_id', label: '链上组织 ID（可选）', type: 'text', placeholder: '留空' }
    ]);
    tblOp = P.dataTable({
      endpoint: '/api/operator/list', pageSize: 5,
      columns: [
        { title: '运营商 ID', key: 'operator_id', mono: true },
        { title: '名称', key: 'name' },
        { title: '联系方式', render: function (r) { return r.contact || '—'; } },
        { title: '链上组织', render: function (r) { return r.chain_org_id || '—'; }, mono: true },
        { title: '资质', render: function (r) { return P.badge(r.qualification_status); } }
      ],
      emptyText: '暂无运营商'
    });
    var opCard = card('运营商登记 operator/register', fOp.root,
      P.actionBar([{ label: '注册运营商', kind: 'primary', run: P.runOp({
        path: '/api/operator/register',
        body: function () {
          var v = PORTAL.need(fOp.read(), 'operator_id', 'name');
          if (!v) return null;
          return { operator_id: v.operator_id, name: v.name,
            contact: v.contact || '', chain_org_id: v.chain_org_id || '' };
        },
        rp: rpOp, successText: '运营商已注册（资质服务端固定 QUALIFIED）',
        render: function (d) {
          return P.kv([
            ['运营商 ID', h('code', { class: 'p-mono' }, d.operator_id)],
            ['名称', d.name],
            ['资质', P.badge(d.qualification_status)],
            ['状态', P.badge(d.status)]
          ]);
        },
        note: { kind: 'OPERATOR', id: function (d) { return d.operator_id; } },
        onOk: function () { tblOp.reload(); }
      }) }]),
      rpOp.root, tblOp);

    root.append(h('div', { class: 'd-grid-2' }, mfCard, opCard));
  }

  /* 航线全量拉取 → 地图重绘（走廊按 corridor_status 着色 + 航线可点选高亮） */
  async function loadRoutes() {
    if (!mx) return;
    var r = await API.call('/api/route/list', { page: 1, page_size: 200 });
    if (!mx) return;
    if (!r.ok) { mx.setEmpty('航线加载失败 code=' + r.code + '（' + r.message + '）'); return; }
    routes = r.data.records || [];
    redraw();
  }
  function redraw() {
    if (!mx) return;
    mx.clear('zones'); mx.clear('routes');
    mx.drawZones(routes);
    mx.drawRoutes(routes, {
      active: activeId, opacity: 0.85,
      onPick: function (rt) { activeId = [rt.route_id]; redraw(); }
    });
  }

  AU.masterdata = { render: render };
})();
