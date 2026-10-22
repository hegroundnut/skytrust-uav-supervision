/* netsec.js — 管理当局端·链网安全运营（计划 B Task 10，spec §5.2）
   系统二（链下可信网络）全量运营视图，四个页签：
   topo 拓扑·节点：topology/get 真地图（节点/虫洞伪造边/隔离集）+ node/register + node/list；
   traffic 会话·消息：session/open·close·list + message/send·list（统计卡 + 逐跳时延）；
   drill 攻防演练：wormhole/toggle + risk/evaluate + path/switch + event/list；
   exp 性能实验：experiment/run·result·list·export（CSV）。
   信息边界（Task 8 运营端惯例的反面）：管理端全量渲染 ATTACKER 节点——安全运营视角必须看到全貌。
   管理端表单默认值惯例：operator 恒 'SecOps'（会话关闭/虫洞/路径切换）。
   地图在页签 box 内创建（脱离 DOM 零尺寸）——依赖 MAPX.create 的 rAF invalidateSize 校正（Task 4）。
   端点：topology/get、node/register·list、session/open·close·list、message/send·list、
   wormhole/toggle、risk/evaluate、path/switch、event/list、experiment/run·result·list·export。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;   /* 拓扑真地图（tabTopo 专属；shell-au mapPages 含 netsec）：render 入口必先 destroy */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    root.append(P.pageHead({
      title: '链网安全运营',
      sub: '系统二 · 链下可信网络 — 拓扑 / 会话消息 / 攻防演练 / 性能实验（安全运营视角：ATTACKER 节点全量可见）' }));
    root.append(P.tabs([
      { key: 'topo', label: '拓扑·节点', render: tabTopo },
      { key: 'traffic', label: '会话·消息', render: tabTraffic },
      { key: 'drill', label: '攻防演练', render: tabDrill },
      { key: 'exp', label: '性能实验', render: tabExp }
    ]));
  }

  /* 响应侧 path 类字段可能是 JSON 字符串数组（裁决 3 惯例）——解析后展示，双形态兼容 */
  function pathText(v) {
    var arr = PORTAL.jp(v, null);
    if (Array.isArray(arr)) return arr.length ? arr.join(' → ') : '—';
    return (v != null && v !== '') ? String(v) : '—';
  }
  /* failure_reasons 为 JSON 字符串（原因→次数）→ '原因×次数；…' */
  function fmtReasons(s) {
    var o = PORTAL.jp(s, null);
    if (!o || typeof o !== 'object') return (s != null && s !== '' && s !== '{}') ? String(s) : '—';
    var ks = Object.keys(o);
    if (!ks.length) return '—';
    return ks.map(function (k) { return k + '×' + o[k]; }).join('；');
  }
  function verdictLabel(v) {
    return v === 'PASS' ? '✓ PASS 无异常'
      : v === 'DETECT' ? '⚠ DETECT 检出攻击'
      : v === 'BLOCK' ? '⛔ BLOCK 已阻断' : (v || '—');
  }

  /* ============ 页签 1：拓扑·节点 ============ */
  function tabTopo(box) {
    var statsBox = h('div', {}, P.empty('⏳ 拓扑数据加载中…'));
    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var wtopoBox = h('div', {}, P.empty('⏳ 抽象拓扑加载中…'));   /* Task 9 追加 */
    var tblNd = null;

    box.append(statsBox);
    box.append(h('div', { class: 'd-col' }, mapEl,
      h('div', { class: 'd-map-hint' }, '节点着色：紫=MANAGEMENT · 蓝=EDGE · 青=UAV · 红=ATTACKER（空心=OFFLINE、红虚线⛔=ISOLATED）；红虚线边=虫洞伪造边。无经纬度的节点不上图。')));
    /* ---- Task 9 追加：抽象拓扑（含攻击节点）区块 —— Leaflet 容器正下方；双层分工如标题 ----
       Leaflet 地理层保留不动（只落有经纬度的节点）；WTOPO 落全部有拓扑坐标的节点（含攻击者），
       只消费服务端抽象 position{x,y}，绝不读写经纬度（红线）；无 position 节点列「未布点」清单。 */
    box.append(card('抽象拓扑（含攻击节点）—— 上图：地理分布（未设坐标节点不落图）；下图：抽象拓扑（全节点含攻击者）',
      P.actionBar([{ label: '⟳ 刷新拓扑', run: loadTopo }]),
      wtopoBox));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadTopo();

    /* 节点注册（position 大写 X/Y 是 SVG 拓扑坐标；lat/lon 才驱动真地图） */
    var rpNd = P.resultPanel();
    var fNd = P.form([
      { name: 'node_id', label: '节点 ID', type: 'text', required: true, placeholder: 'N5',
        hint: '无人机端节点约定命名为「航空器ID-NODE」，建立会话前须先注册' },
      { name: 'node_type', label: '节点类型', type: 'select', required: true, value: 'EDGE',
        options: ['EDGE', 'MANAGEMENT', 'UAV', 'ATTACKER'] },
      { name: 'posX', label: '拓扑坐标 X（0-100）', type: 'number', required: true, value: 60 },
      { name: 'posY', label: '拓扑坐标 Y（0-100）', type: 'number', required: true, value: 60 },
      { name: 'neighbors', label: '邻居（逗号分隔，可空）', type: 'text', placeholder: 'N3,MGR' },
      { name: 'lat', label: '纬度（真地图需填）', type: 'number', step: '0.000001',
        hint: '不填则不上真地图' },
      { name: 'lon', label: '经度（真地图需填）', type: 'number', step: '0.000001' }
    ]);
    tblNd = P.dataTable({
      endpoint: '/api/node/list', pageSize: 10,
      filters: [
        { name: 'node_type', label: '类型', type: 'select', options: ['MANAGEMENT', 'EDGE', 'UAV', 'ATTACKER'] },
        { name: 'status', label: '状态', type: 'select', options: ['ONLINE', 'OFFLINE', 'ISOLATED'] }
      ],
      columns: [
        { title: '节点', key: 'node_id', mono: true },
        { title: '类型', render: function (r) { return P.badge(r.node_type); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '风险分', render: function (r) { return r.risk_score != null ? Number(r.risk_score).toFixed(2) : '—'; }, num: true },
        { title: '邻居', render: function (r) { return PORTAL.jp(r.neighbors, []).join('、') || '—'; } },
        { title: '地图坐标', render: function (r) { return GEO.fmtCoordPair(r.lat, r.lon); }, mono: true },
        { title: 'SM9 身份', render: function (r) { return UI.trunc(r.sm9_identity, 24); }, mono: true }
      ],
      emptyText: '暂无节点'
    });
    box.append(card('节点注册',
      fNd.root,
      P.actionBar([{ label: '注册节点', kind: 'primary', run: P.runOp({
        path: '/api/node/register',
        body: function () {
          var v = PORTAL.need(fNd.read(), 'node_id', 'node_type', 'posX', 'posY');
          if (!v) return null;
          var body = {
            node_id: v.node_id, node_type: v.node_type,
            position: { X: Number(v.posX) || 0, Y: Number(v.posY) || 0 }
          };
          if (v.neighbors) body.neighbors = String(v.neighbors).split(/[,，]/)
            .map(function (s) { return s.trim(); }).filter(Boolean);
          if (v.lat !== undefined) body.lat = v.lat;
          if (v.lon !== undefined) body.lon = v.lon;
          return body;
        },
        rp: rpNd, successText: '节点已注册（国密身份自动派生）',
        render: function (d) {
          var pos = PORTAL.jp(d.position, {});
          var px = pos.X != null ? pos.X : (pos.x != null ? pos.x : '?');
          var py = pos.Y != null ? pos.Y : (pos.y != null ? pos.y : '?');
          return P.kv([
            ['节点', h('code', { class: 'p-mono' }, d.node_id)],
            ['类型', P.badge(d.node_type)],
            ['状态', P.badge(d.status)],
            ['拓扑坐标', '(' + px + ', ' + py + ')'],
            ['邻居', PORTAL.jp(d.neighbors, []).join('、') || '—'],
            ['地图坐标', GEO.fmtCoordPair(d.lat, d.lon)],
            ['SM9 身份', h('code', { class: 'p-mono' }, UI.trunc(d.sm9_identity, 36))]
          ]);
        },
        note: { kind: 'NODE', id: function (d) { return d.node_id; },
          extra: function (d) { return { node_type: d.node_type }; } },
        onOk: function () { tblNd.reload(); loadTopo(); }
      }) }]),
      rpNd.root));
    box.append(card('节点台账', tblNd));

    /* hlPath = 当前会话路径（Task 9：STORE SESSION 槽 → session/list 200 条窗内客户端匹配
       ——服务端 SessionQuery 无 session_id 过滤键（session.go:168-174），不猜测；无槽/未匹配/
       路径退化 → null 不高亮。current_path 双形态兼容（JSON 字符串/数组，pathText 同律）。 */
    async function loadHlPath() {
      var slot = STORE.get('SESSION');
      if (!slot || !slot.id) return null;
      var rs = await API.call('/api/session/list', { page: 1, page_size: 200 });
      if (!rs.ok) return null;
      var hit = (rs.data.records || []).filter(function (s) { return s.session_id === slot.id; })[0];
      if (!hit) return null;
      var p = PORTAL.jp(hit.current_path, null);
      return (Array.isArray(p) && p.length > 1) ? p : null;
    }

    /* 拓扑加载：统计卡 + 真地图（虫洞伪造边入 marks 层，节点入 nodes 层）+ WTOPO 抽象拓扑。
       Task 9 联动刷新三路：① node/register onOk 直调本函数（既有钩子，WTOPO 随绘）；② 区块
       ⟳ 按钮直调；③ drill 页签 wormhole/toggle、path/switch、risk/evaluate 操作后切回本页签
       ——tab 切换即 hashchange → route() 整页重渲染 → 本函数重拉最新拓扑，双层重绘，
       hlPath 取当前会话最新 current_path（风险 5 维评分沿用 drill 页签既有 P.scoreBars，不动）。 */
    async function loadTopo() {
      var r = await API.call('/api/topology/get', {});
      if (statsBox.isConnected) {
        statsBox.innerHTML = '';
        if (!r.ok) { statsBox.append(P.errCard(r)); }
        else {
          var t = r.data;
          statsBox.append(P.statCards([
            { label: '活跃会话', value: t.active_sessions },
            { label: '节点', value: (t.nodes || []).length,
              sub: '隔离集：' + ((t.isolated || []).join('、') || '无') },
            { label: '网络边', value: (t.edges || []).length,
              sub: '虫洞边：' + (t.edges || []).filter(function (e) { return e.wormhole_edge; }).length },
            { label: '虫洞攻击', value: t.wormhole_enabled ? '⚠ 开启中' : '未开启',
              tone: t.wormhole_enabled ? 'critical' : 'good' }
          ]));
        }
      }
      /* ---- Task 9 追加：抽象拓扑区块（全节点含攻击者；svg 为 (topo,opts) 纯函数，
         攻击节点在此层必然可见——信息边界：管理端安全运营视角全量渲染） ---- */
      if (wtopoBox.isConnected) {
        var hl = r.ok ? await loadHlPath() : null;
        if (wtopoBox.isConnected) {   /* await 后复查：导航离开即弃填充（Task 8 守卫同律） */
          wtopoBox.innerHTML = '';
          if (!r.ok) wtopoBox.append(P.errCard(r));
          else wtopoBox.append(WTOPO.block(r.data, {
            hlPath: hl || undefined,
            onPickNode: function (n) {
              UI.toast('抽象拓扑 ' + n.node_id + ' · ' + n.node_type + ' · ' + n.status +
                (n.risk_score != null ? ' · 风险分 ' + Number(n.risk_score).toFixed(2) : ''), 'ok', 4200);
            }
          }));
        }
      }
      if (!mx || !r.ok) return;
      mx.clear('nodes'); mx.clear('marks');
      mx.drawWormholes(r.data.edges || [], r.data.nodes || []);
      mx.drawNodes(r.data.nodes || [], { onPick: function (n) {
        UI.toast(n.node_id + ' · ' + n.node_type + ' · ' + n.status +
          (n.risk_score != null ? ' · 风险分 ' + Number(n.risk_score).toFixed(2) : ''), 'ok', 4200);
      } });
      var pts = (r.data.nodes || []).map(function (n) { return GEO.nodeCoord(n); }).filter(Boolean);
      if (pts.length) mx.fitPoints(pts);
    }
  }

  /* ============ 页签 2：会话·消息 ============ */
  function tabTraffic(box) {
    var slotS = STORE.get('SESSION'), slotM = STORE.get('MISSION'), slotP = STORE.get('PASS');

    /* --- 会话台账（行级关闭；CLOSED 行按钮 disabled） --- */
    var tblS = null;
    tblS = P.dataTable({
      endpoint: '/api/session/list', pageSize: 10,
      filters: [{ name: 'status', label: '状态', type: 'select',
        options: ['INIT', 'AUTHENTICATED', 'ACTIVE', 'DEGRADED', 'RECOVERED', 'CLOSED'] }],
      columns: [
        { title: '会话号', render: function (r) { return UI.trunc(r.session_id, 22); }, mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '当前路径', render: function (r) { return UI.trunc(PORTAL.jp(r.current_path, []).join(' → '), 40) || '—'; }, mono: true },
        { title: '关联任务', render: function (r) { return r.mission_id || '—'; } },
        { title: '建立时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          var b = h('button', { class: 'p-btn p-btn-sm p-btn-danger', disabled: r.status === 'CLOSED' }, '关闭');
          b.addEventListener('click', function (e) { e.stopPropagation(); closeSession(r.session_id, tblS); });
          return b;
        } }
      ],
      onRow: function (r) { fMs.set('session_id', r.session_id); UI.toast('会话号已预填到消息发送表单'); },
      emptyText: '暂无会话'
    });

    async function closeSession(sid, tbl) {
      var ok = await P.confirm('关闭会话',
        '关闭后将无法向该会话发送消息。会话号：' + sid, '确认关闭');
      if (!ok) return;
      var r = await API.call('/api/session/close',
        { session_id: sid, operator: 'SecOps', reason: '手动关闭' });
      if (r.ok) {
        STORE.note('SESSION', r.data.session_id);
        UI.toast('会话已关闭（' + r.data.status + '）');
        tbl.reload();
      } else {
        UI.toast('关闭失败 code=' + r.code + '：' + r.message, 'err', 5200);
      }
    }

    /* --- 建立会话（SM9 挑战-应答 + Dijkstra 初始可信路径） --- */
    var rpSo = P.resultPanel();
    var fSo = P.form([
      { name: 'uav_id', label: '航空器', type: 'text', required: true, value: 'UAV-A-001',
        hint: '源节点缺省为「航空器ID-NODE」，须先注册' },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省 航空器ID-NODE' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省 MGR' },
      { name: 'mission_id', label: '关联任务（可选留档）', type: 'text', value: slotM ? slotM.id : '' },
      { name: 'pass_id', label: '关联许可（可选留档）', type: 'text', value: slotP ? slotP.id : '' }
    ]);
    var soCard = card('建立会话（国密身份认证）',
      fSo.root,
      P.actionBar([{ label: '起飞报备 · 建立会话', kind: 'primary', run: P.runOp({
        path: '/api/session/open',
        body: function () {
          var v = PORTAL.need(fSo.read(), 'uav_id');
          if (!v) return null;
          var body = { uav_id: v.uav_id };
          if (v.source_node) body.source_node = v.source_node;
          if (v.target_node) body.target_node = v.target_node;
          if (v.mission_id) body.mission_id = v.mission_id;
          if (v.pass_id) body.pass_id = v.pass_id;
          return body;
        },
        rp: rpSo, successText: '会话已建立（INIT→AUTHENTICATED→ACTIVE，全程审计留痕）',
        render: function (d) {
          return h('div', {},
            P.kv([
              ['会话号', h('code', { class: 'p-mono' }, d.session.session_id)],
              ['状态', P.badge(d.session.status)],
              ['航空器', d.session.uav_id],
              ['SM9 认证', d.auth.verified ? '✓ 挑战-应答通过' : '✗ 未通过'],
              ['SM9 身份', h('code', { class: 'p-mono' }, d.auth.sm9_identity)],
              ['Nonce', h('code', { class: 'p-mono' }, UI.trunc(d.auth.nonce, 40))],
              ['签名', h('code', { class: 'p-mono' }, UI.trunc(d.auth.signature, 40))],
              ['初始可信路径', (d.path || []).join(' → ')]
            ]),
            h('p', { class: 'd-small d-muted' }, '虫洞开启期间建立的会话，初始路径可能含隧道边——到「攻防演练」页签评估风险并切换路径。'));
        },
        note: { kind: 'SESSION', id: function (d) { return d.session.session_id; },
          extra: function (d) { return { uav_id: d.session.uav_id, mission_id: d.session.mission_id }; } },
        onOk: function (d) {
          fMs.set('session_id', d.session.session_id);
          tblS.reload();
        }
      }) }]),
      rpSo.root);

    /* --- 消息发送（逐跳时延；投递失败 = 非 0 code + data 留痕行，原始 JSON 详情可见） --- */
    var rpMs = P.resultPanel();
    var fMs = P.form([
      { name: 'session_id', label: '会话号', type: 'text', required: true, value: slotS ? slotS.id : '',
        placeholder: 'SESS-…（点上方会话行或新建会话自动预填）' },
      { name: 'msg_type', label: '消息类型', type: 'select', required: true, value: 'POSITION_UPDATE',
        options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
      { name: 'source_node', label: '源节点', type: 'text', required: true, value: 'UAV-A-001-NODE' },
      { name: 'target_node', label: '目标节点', type: 'text', required: true, value: 'MGR' },
      { name: 'payload', label: '载荷（可选，JSON 对象）', type: 'textarea', rows: 2,
        placeholder: '{"lat":30.508,"lon":119.99}' }
    ]);
    var msCard = card('消息发送（会话须 ACTIVE；CLOSED 会话不可发送）',
      fMs.root,
      P.actionBar([{ label: '发送', kind: 'primary', run: P.runOp({
        path: '/api/message/send',
        body: function () {
          var v = PORTAL.need(fMs.read(), 'session_id', 'msg_type', 'source_node', 'target_node');
          if (!v) return null;
          var body = { session_id: v.session_id, msg_type: v.msg_type,
            source_node: v.source_node, target_node: v.target_node };
          if (v.payload) {
            try { body.payload = JSON.parse(v.payload); }
            catch (e) { UI.toast('载荷不是合法 JSON：' + e.message, 'err', 5200); return null; }
          }
          return body;
        },
        rp: rpMs, successText: '消息已发送',
        render: function (d) {
          var m = d.message;
          return h('div', {},
            P.kv([
              ['消息号', h('code', { class: 'p-mono' }, UI.trunc(m.message_id, 28))],
              ['类型 / 序号', m.msg_type + ' · seq=' + m.seq],
              ['路由', m.source_node + ' → ' + m.target_node],
              ['状态 / 时延', h('span', { class: 'd-row' }, P.badge(m.status),
                (m.latency_ms != null ? m.latency_ms + ' ms' : '—'))],
              ['路径', PORTAL.jp(m.path, []).join(' → ') || '—'],
              ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(m.sm3_hash, 32))]
            ]),
            h('div', { class: 'd-section' }, '逐跳时延'),
            P.pathHops(d.path_detail));
        },
        onOk: function () { tblM.reload(); }
      }) }]),
      rpMs.root);

    /* --- 消息台账 + 流量统计（stats 随 list 响应携带，裁决 2：success_rate 是 0..1 小数） --- */
    var statsM = h('div', {});
    var tblM = null;
    tblM = P.dataTable({
      endpoint: '/api/message/list', pageSize: 10,
      filters: [
        { name: 'msg_type', label: '类型', type: 'select',
          options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
        { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] },
        { name: 'session_id', label: '会话号', type: 'text' }
      ],
      columns: [
        { title: '消息号', render: function (r) { return UI.trunc(r.message_id, 22); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.msg_type); } },
        { title: '路由', render: function (r) { return r.source_node + ' → ' + r.target_node; }, mono: true },
        { title: '序号', key: 'seq', num: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) { msgDrawer(r); },
      emptyText: '暂无消息'
    });

    async function loadStats() {
      var r = await API.call('/api/message/list', { page: 1, page_size: 1 });
      if (!statsM.isConnected) return;
      statsM.innerHTML = '';
      if (!r.ok) { statsM.append(P.errCard(r)); return; }
      var s = r.data.stats || {};
      statsM.append(P.statCards([
        { label: '消息总数', value: s.count != null ? s.count : '—' },
        { label: '成功数', value: s.success_count != null ? s.success_count : '—' },
        { label: '成功率', value: PORTAL.fmtRate(s.success_rate),
          tone: (s.success_rate != null && s.success_rate < 1) ? 'critical' : 'good' },
        { label: '平均时延', value: s.avg_latency_ms != null ? s.avg_latency_ms + ' ms' : '—' },
        { label: 'p50 / p95',
          value: (s.p50_latency_ms != null ? s.p50_latency_ms : '—') + ' / ' + (s.p95_latency_ms != null ? s.p95_latency_ms : '—'),
          sub: '最大 ' + (s.max_latency_ms != null ? s.max_latency_ms + ' ms' : '—') }
      ]));
    }

    function msgDrawer(m) {
      P.drawer('消息详情 ' + UI.trunc(m.message_id, 24),
        P.kv([
          ['消息号', h('code', { class: 'p-mono' }, m.message_id)],
          ['会话', h('code', { class: 'p-mono' }, m.session_id || '—')],
          ['类型', P.badge(m.msg_type)],
          ['序号 / 时延', 'seq=' + m.seq + ' · ' + (m.latency_ms != null ? m.latency_ms + ' ms' : '—')],
          ['路由', m.source_node + ' → ' + m.target_node],
          ['路径', PORTAL.jp(m.path, []).join(' → ') || '—'],
          ['状态', P.badge(m.status)],
          ['SM3 摘要', h('code', { class: 'p-mono' }, m.sm3_hash || '—')],
          ['时间戳 / 入库', (m.timestamp || '—') + ' / ' + m.created_at]
        ]),
        h('div', { class: 'd-section' }, '存证原文（逐跳明细 · 网关代签 · 签名）'),
        UI.jsonBlock(PORTAL.jp(m.evidence, m.evidence), 240));
    }

    box.append(h('div', { class: 'd-grid-2' }, soCard, msCard));
    box.append(card('会话台账（六态全列：INIT/AUTHENTICATED/ACTIVE/DEGRADED/RECOVERED/CLOSED）', tblS));
    box.append(card('消息台账（点击行查看存证原文）',
      P.actionBar([{ label: '加载流量统计', run: loadStats }]),
      statsM, tblM));
  }

  /* ============ 页签 3：攻防演练 ============ */
  function tabDrill(box) {
    var slotS = STORE.get('SESSION');
    var prefill = slotS ? slotS.id : '';

    /* --- 虫洞攻击模拟（enabled 是 *bool binding:required——关闭必须显式发 false） --- */
    var rpWh = P.resultPanel();
    function whRun(enabled) {
      return P.runOp({
        path: '/api/wormhole/toggle',
        body: function () { return { enabled: enabled, operator: 'SecOps' }; },
        rp: rpWh,
        successText: enabled ? '虫洞攻击已开启（NODE-X⇄NODE-Y 隧道边建立）' : '虫洞攻击已关闭',
        render: function (d) {
          return P.kv([
            ['虫洞状态', d.wormhole_enabled ? '⚠ 开启中' : '未开启'],
            ['受影响节点', (d.nodes_affected || []).join('、') || '—']
          ]);
        }
      });
    }
    var whCard = card('虫洞攻击模拟',
      h('p', { class: 'd-small d-muted' }, '开启后 NODE-X⇄NODE-Y 建立伪造隧道边（拓扑图红虚线）；节点一旦被隔离（ISOLATED），攻击不可重新开启——处置记录不可抹除。'),
      P.actionBar([
        { label: '⚠ 开启虫洞攻击', kind: 'danger',
          confirm: { title: '开启虫洞攻击', msg: '将建立 NODE-X⇄NODE-Y 伪造隧道边；期间新建会话的初始路径可能经过隧道。', ok: '开启' },
          run: whRun(true) },
        { label: '关闭虫洞攻击',
          confirm: { title: '关闭虫洞攻击', msg: '将移除隧道边（已隔离节点的隔离状态保留）。', ok: '关闭' },
          run: whRun(false) }
      ]),
      rpWh.root);

    /* --- 风险评估（5 维评分 + 阈值线） --- */
    var rpRk = P.resultPanel();
    var fRk = P.form([
      { name: 'session_id', label: '会话号', type: 'text', required: true, value: prefill,
        placeholder: 'SESS-…（自动预填当前会话）' },
      { name: 'node_x', label: '隧道端点 X（可选）', type: 'text', placeholder: '缺省取会话相关虫洞端点' },
      { name: 'node_y', label: '隧道端点 Y（可选）', type: 'text', placeholder: '缺省取会话相关虫洞端点' }
    ]);
    var rkCard = card('风险评估（五维引擎：身份/邻接/时延/挑战/路径）',
      fRk.root,
      P.actionBar([{ label: '评估风险', kind: 'primary', run: P.runOp({
        path: '/api/risk/evaluate',
        body: function () {
          var v = PORTAL.need(fRk.read(), 'session_id');
          if (!v) return null;
          var body = { session_id: v.session_id };
          if (v.node_x) body.node_x = v.node_x;
          if (v.node_y) body.node_y = v.node_y;
          return body;
        },
        rp: rpRk, successText: '风险评估完成',
        render: function (d) {
          return h('div', {},
            P.statCards([
              { label: '风险分', value: Number(d.risk_score || 0).toFixed(2),
                sub: '阈值 ' + d.threshold,
                tone: d.verdict === 'PASS' ? 'good' : 'critical' },
              { label: '裁定', value: verdictLabel(d.verdict) },
              { label: '会话状态', value: d.session_status || '—' }
            ]),
            P.scoreBars(d.dimensions || {}, d.threshold),
            (d.events || []).length
              ? h('div', {},
                  h('div', { class: 'd-section' }, '联动安全事件（' + d.events.length + '）'),
                  h('div', { class: 'd-col' }, d.events.map(function (ev) {
                    return P.kv([
                      ['事件', h('code', { class: 'p-mono' }, ev.event_id)],
                      ['动作', P.badge(ev.action)],
                      ['隧道端点', ev.node_x + ' ⇄ ' + ev.node_y],
                      ['风险分', Number(ev.risk_score || 0).toFixed(2)],
                      ['时间', ev.created_at]
                    ]);
                  })))
              : P.empty('无联动事件'));
        }
      }) }]),
      rpRk.root,
      h('p', { class: 'd-small d-muted' }, '评估检出攻击时，会话可能降级为 DEGRADED——可用下方「路径切换」恢复至 RECOVERED。'));

    /* --- 路径切换（仅 DEGRADED 会话；健康会话切换被拒 4002 是设计内） --- */
    var rpPs = P.resultPanel();
    var fPs = P.form([
      { name: 'session_id', label: '会话号', type: 'text', required: true, value: prefill },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'SecOps' },
      { name: 'new_path', label: '新路径（逗号分隔，可空）', type: 'text',
        placeholder: '留空 = 自动重算避让路径', hint: '如 UAV-A-001-NODE,N1,N2,N3,N4,MGR' }
    ]);
    var psCard = card('路径切换（仅 DEGRADED 会话可执行）',
      fPs.root,
      P.actionBar([{ label: '切换路径', kind: 'primary',
        confirm: { title: '切换路径', msg: '将重算避让路径并产生 RECOVER 安全事件（会话 → RECOVERED）。', ok: '切换' },
        run: P.runOp({
          path: '/api/path/switch',
          body: function () {
            var v = PORTAL.need(fPs.read(), 'session_id', 'operator');
            if (!v) return null;
            var body = { session_id: v.session_id, operator: v.operator };
            if (v.new_path) body.new_path = String(v.new_path).split(/[,，]/)
              .map(function (s) { return s.trim(); }).filter(Boolean);
            return body;
          },
          rp: rpPs, successText: '路径切换成功（会话 → RECOVERED）',
          render: function (d) {
            return P.kv([
              ['会话状态', P.badge(d.session ? d.session.status : '—')],
              ['原路径', pathText(d.original_path)],
              ['新路径', pathText(d.new_path)],
              ['恢复时延', d.recovery_latency_ms != null ? d.recovery_latency_ms + ' ms' : '—'],
              ['恢复事件', d.event ? (d.event.event_id + ' · ' + d.event.action) : '—']
            ]);
          },
          note: { kind: 'SESSION', id: function (d) { return (d.session && d.session.session_id) || ''; } }
        }) }]),
      rpPs.root);

    /* --- 安全事件台账 --- */
    var tblEv = P.dataTable({
      endpoint: '/api/event/list', pageSize: 10,
      filters: [
        { name: 'action', label: '动作', type: 'select', options: ['DETECT', 'ISOLATE', 'RECOVER'] },
        { name: 'session_id', label: '会话号', type: 'text' }
      ],
      columns: [
        { title: '事件号', render: function (r) { return UI.trunc(r.event_id, 22); }, mono: true },
        { title: '动作', render: function (r) { return P.badge(r.action); } },
        { title: '隧道端点', render: function (r) { return r.node_x + ' ⇄ ' + r.node_y; }, mono: true },
        { title: '风险分', render: function (r) { return Number(r.risk_score || 0).toFixed(2); }, num: true },
        { title: '恢复时延(ms)', render: function (r) { return r.recovery_latency_ms != null ? r.recovery_latency_ms : '—'; }, num: true },
        { title: '会话', render: function (r) { return UI.trunc(r.session_id || '—', 20); }, mono: true },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) {
        P.drawer('安全事件 ' + r.event_id,
          P.kv([
            ['动作', P.badge(r.action)],
            ['隧道端点', r.node_x + ' ⇄ ' + r.node_y],
            ['风险分', Number(r.risk_score || 0).toFixed(2)],
            ['会话', h('code', { class: 'p-mono' }, r.session_id || '—')],
            ['原路径', pathText(r.original_path)],
            ['新路径', pathText(r.new_path)],
            ['恢复时延', r.recovery_latency_ms != null ? r.recovery_latency_ms + ' ms' : '—'],
            ['时间', r.created_at]
          ]));
      },
      emptyText: '暂无安全事件（开启虫洞攻击并评估风险后出现）'
    });

    box.append(h('div', { class: 'd-grid-2' }, whCard, rkCard));
    box.append(psCard);
    box.append(card('安全事件台账（DETECT 检出 / ISOLATE 隔离节点 / RECOVER 路径恢复）', tblEv));
  }

  /* ============ 页签 4：性能实验 ============ */
  function tabExp(box) {
    var EXP_TYPES = ['CROSSCHAIN_LOOP', 'SM3_INTEGRITY', 'SM9_VERIFY', 'CONFLICT_DETECT',
      'MESSAGE_FLOW', 'RISK_SCAN', 'STRESS', 'TRACE_BATCH',
      'INSPECT_UNAUTHORIZED', 'INSPECT_AUTHORIZED', 'ALERT_BATCH'];

    var rpEx = P.resultPanel();
    var fEx = P.form([
      { name: 'experiment_type', label: '实验类型', type: 'select', required: true, value: 'SM3_INTEGRITY',
        options: EXP_TYPES },
      { name: 'count', label: '次数（1-1000）', type: 'number', required: true, value: 5 },
      { name: 'scenario', label: '场景', type: 'select', value: '',
        options: [['', '（留空）'], ['NORMAL', 'NORMAL 正常'],
          ['ATTACK', 'ATTACK 攻击'], ['DEFENSE', 'DEFENSE 防御']],
        hint: 'MESSAGE_FLOW 实验须选择场景（NORMAL/ATTACK/DEFENSE），其余类型请留空' },
      { name: 'concurrency', label: '并发（可选，1-20）', type: 'number', placeholder: '缺省串行' }
    ]);
    var tblEx = null;

    var runCard = card('运行实验（11 类）',
      fEx.root,
      P.actionBar([{ label: '运行实验', kind: 'primary', run: P.runOp({
        path: '/api/experiment/run',
        body: function () {
          var v = PORTAL.need(fEx.read(), 'experiment_type', 'count');
          if (!v) return null;
          var body = { experiment_type: v.experiment_type, count: Number(v.count) };
          if (v.experiment_type === 'MESSAGE_FLOW') {
            if (!v.scenario) {
              UI.toast('MESSAGE_FLOW 必须选择场景（NORMAL/ATTACK/DEFENSE）', 'err', 5200);
              return null;
            }
            body.scenario = v.scenario;
          }
          /* 非 MESSAGE_FLOW 一律不发 scenario（双向严格：传了也 6002） */
          if (v.concurrency !== undefined) body.concurrency = Number(v.concurrency);
          return body;
        },
        rp: rpEx, successText: '实验完成',
        render: function (d) { return expView(d); },
        onOk: function () { if (tblEx) tblEx.reload(); }
      }) }]),
      rpEx.root,
      h('p', { class: 'd-small d-muted' }, 'MESSAGE_FLOW × ATTACK 场景下成功率偏低不是故障，而是虫洞检测正在生效；失败原因按「原因×次数」聚合展示。'));

    /* 导出过滤表单：experiment/export 过滤键只有 experiment_type/status（裁决 24：无 run_id） */
    var fEx2 = P.form([
      { name: 'experiment_type', label: '导出类型过滤', type: 'select', value: '',
        options: [['', '全部类型']].concat(EXP_TYPES) },
      { name: 'status', label: '导出状态过滤', type: 'select', value: '',
        options: [['', '全部状态'], 'DONE', 'FAILED'] }
    ]);

    tblEx = P.dataTable({
      endpoint: '/api/experiment/list', pageSize: 10,
      filters: [
        { name: 'experiment_type', label: '类型', type: 'select', options: EXP_TYPES },
        { name: 'status', label: '状态', type: 'select', options: ['DONE', 'FAILED'] }
      ],
      columns: [
        { title: 'Run ID', render: function (r) { return UI.trunc(r.run_id, 20); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.experiment_type); } },
        { title: '场景', render: function (r) { return r.scenario || '—'; } },
        { title: '次数', key: 'count', num: true },
        { title: '成功率', render: function (r) { return PORTAL.fmtRate(r.success_rate); }, num: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '开始时间', key: 'started_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openExp(r.run_id); } }, '结果');
        } }
      ],
      onRow: function (r) { openExp(r.run_id); },
      emptyText: '暂无实验记录'
    });

    box.append(runCard);
    box.append(card('实验台账（支持 CSV 导出）',
      h('div', { class: 'd-row d-row-wrap' }, fEx2.root,
        P.csvExport({ endpoint: '/api/experiment/export',
          filters: function () { return fEx2.read(); },
          filename: 'experiments.csv', label: '⤓ 导出 CSV' })),
      tblEx));
  }

  /* ExperimentRun（17 键）统一视图：统计卡 + 时延分位 kv + 失败原因（run 回执与 result 抽屉共用） */
  function expView(d) {
    return h('div', {},
      P.statCards([
        { label: '成功率', value: PORTAL.fmtRate(d.success_rate),
          tone: d.success_rate >= 1 ? 'good' : 'critical' },
        { label: '次数', value: d.count,
          sub: '成功 ' + d.success_count + ' / 失败 ' + d.failed_count },
        { label: '状态', value: d.status === 'DONE' ? '✓ DONE' : '✗ FAILED',
          tone: d.status === 'DONE' ? 'good' : 'critical' }
      ]),
      P.kv([
        ['实验编号', h('code', { class: 'p-mono' }, d.experiment_id)],
        ['Run ID', h('code', { class: 'p-mono' }, d.run_id)],
        ['类型 / 场景', d.experiment_type + (d.scenario ? ' · ' + d.scenario : '')],
        ['时延 avg/p50/p95/max', [d.avg_latency_ms, d.p50_latency_ms, d.p95_latency_ms, d.max_latency_ms]
          .map(function (x) { return x != null ? x + 'ms' : '—'; }).join(' / ')],
        ['失败原因', fmtReasons(d.failure_reasons)],
        ['开始 / 完成', d.started_at + ' → ' + (d.completed_at || '—')]
      ]));
  }

  /* 实验结果抽屉：experiment/result（run_id required；6002 = run_id 不存在） */
  async function openExp(runId) {
    var d = P.drawer('实验结果 ' + runId, h('div', { class: 'p-empty' }, '⏳ 实验结果查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/experiment/result', { run_id: runId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    var x = r.data;
    body.append(expView(x));
    body.append(h('div', { class: 'd-section' }, '配置原文'));
    body.append(UI.jsonBlock(PORTAL.jp(x.config, x.config), 200));
  }

  AU.netsec = { render: render };
})();
