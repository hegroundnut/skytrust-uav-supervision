/* flight.js — 运营商端·飞行活动申请（计划 B Task 7，spec §5.1）
   地图勾选航段（zone 着色 OPEN/RESTRICTED/CLOSED，点选高亮入单，勾选框双向同步）
   → mission/create（描述 SM9 加密入库、界面只见 masked_value 脱敏值）
   → conflict/detect 冲突提示 + conflict/resolve 协调（重复消解 3004 = 设计内拒绝）
   → mission/submit 跨链提交（fabric → chainmaker → fisco-bcos）。
   端点：mission/create·submit·query·list、route/list、conflict/detect·resolve、pilot/list、
   crosschain/query（经 P.openCxDetail / P.cxTrail 段点击）。
   裁决 3：route_segments/zones/suggestion 响应侧是 JSON 字符串 → PORTAL.jp。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;
  /* 任务/载荷类型为自由文本协议值——已知值给中文标签，未知值原样展示（不猜测） */
  var MT_ZH = { MEDICAL: '医疗', POWER_INSPECTION: '电力巡检', LOGISTICS: '物流' };
  var PT_ZH = { MEDICAL_KIT: '医疗箱', CAMERA: '摄像载荷', CARGO: '货运载荷' };
  function typeZh(map, v) {
    if (v == null || v === '') return '—';
    return h('span', { title: String(v) }, map[v] || String(v));
  }

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    root.append(P.pageHead({
      title: '飞行活动申请',
      sub: '地图勾选航段建任务 · 描述加密存储脱敏展示 · 冲突协调全程留痕 · 跨链提交跨域申请' }));
    root.append(P.tabs([
      { key: 'create', label: '新建申请', render: tabCreate },
      { key: 'missions', label: '我的任务', render: tabMissions }
    ]));
  }

  /* ============ Tab 1：新建申请（左地图右表单，UOM 对位） ============ */
  function tabCreate(box) {
    var routes = [], selected = [];
    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var rpCr = P.resultPanel(), rpCf = P.resultPanel(), rpRs = P.resultPanel(), rpSb = P.resultPanel();

    var f = P.form([
      { name: 'operator_id', label: '运营企业', type: 'select', required: true, options: [['', '选择运营企业…']] },
      { name: 'uav_id', label: '航空器', type: 'select', required: true, options: [['', '选择航空器…']] },
      { name: 'mission_type', label: '任务类型', type: 'text', required: true, value: 'MEDICAL',
        placeholder: 'MEDICAL 医疗 / POWER_INSPECTION 电力巡检 / LOGISTICS 物流…' },
      { name: 'payload_type', label: '载荷类型', type: 'text', required: true, value: 'MEDICAL_KIT',
        placeholder: 'MEDICAL_KIT 医疗箱 / CAMERA 摄像 / CARGO 货运…' },
      { name: 'route_segments', label: '航段', type: 'multi', required: true, options: [],
        hint: '地图点选与勾选框双向同步' },
      { name: 'altitude_min', label: '高度下限(m)', type: 'number', value: 60 },
      { name: 'altitude_max', label: '高度上限(m)', type: 'number', required: true, value: 120 },
      { name: 'start_time', label: '开始时间', type: 'datetime', required: true, value: UI.datetimeLocal(60),
        hint: '已预填「1 小时后」，可直接修改' },
      { name: 'end_time', label: '结束时间', type: 'datetime', required: true, value: UI.datetimeLocal(240),
        hint: '已预填「4 小时后」' },
      { name: 'pilot_license_id', label: '关联执照', type: 'select', options: [['', '不关联（可选）']],
        hint: '可关联操控员执照；执照无效或过期时无法通过校验' },
      { name: 'description', label: '任务描述', type: 'textarea', rows: 3,
        placeholder: '如：紧急医疗运输——特殊血样送达市一医院（演示剧情）',
        hint: '任务描述经国密算法加密存储：管理端与台账仅见脱敏值，明文不出运营商域' }
    ]);
    var slot = STORE.get('MISSION');
    var fCf = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'MISSION-2026-xxx（创建成功后自动预填）' }
    ]);
    var fRs = P.form([
      { name: 'conflict_id', label: '冲突 ID', type: 'text', required: true, placeholder: 'CFL-…（检测结果点「消解此冲突」预填）' },
      { name: 'resolution', label: '消解措施', type: 'text', required: true, placeholder: '如：时间窗后移 30 分钟' },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: '', placeholder: '如：Operator-B' },
      { name: 'mission_id', label: '继续执行方任务号', type: 'text',
        placeholder: '留空则双方任务均回到 REVIEWING（可选）' }
    ]);
    var fSb = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'MISSION-2026-xxx（创建成功后自动预填）' },
      { name: 'operator', label: '提交人/运营方', type: 'text', required: true, value: '',
        placeholder: 'Operator-MED（须为航空器归属运营方；创建任务成功后自动回填）' }
    ]);

    box.append(h('div', { class: 'd-grid-form' },
      h('div', { class: 'd-col d-sticky' },
        h('div', { class: 'd-map-hint' }, '点击地图航线即可勾选或取消（高亮即入单）。走廊着色：绿色=开放 · 琥珀色=限制 · 红色=关闭'),
        mapEl),
      h('div', { class: 'd-col' },
        card('① 任务创建', f.root,
          P.actionBar([{ label: '创建任务', kind: 'primary', run: P.runOp({
            path: '/api/mission/create',
            body: function () { return PORTAL.need(f.read(), 'operator_id', 'uav_id', 'mission_type',
              'payload_type', 'route_segments', 'altitude_max', 'start_time', 'end_time'); },
            rp: rpCr, successText: '任务已创建（草稿），描述已加密存储',
            render: function (d) {
              return h('div', {},
                P.kv([
                  ['任务号', h('code', { class: 'p-mono' }, d.mission_id)],
                  ['状态', P.badge(d.status)],
                  ['脱敏值', d.masked_value || '—'],
                  ['航段', PORTAL.jp(d.route_segments, []).join('、')],
                  ['涉及空域', PORTAL.jp(d.zones, []).join('、')],
                  ['高度带', d.altitude_min + '–' + d.altitude_max + ' m'],
                  ['时间窗', UI.fmtDT(d.start_time, true) + ' → ' + UI.fmtDT(d.end_time, true)],
                  ['关联执照', d.pilot_license_id || '未关联'],
                  ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(d.sm3_hash, 40))]
                ]),
                h('p', { class: 'd-small d-muted' }, '下一步：② 冲突检测（可选）→ ③ 跨链提交。任务号已自动预填。'));
            },
            note: { kind: 'MISSION', id: function (d) { return d.mission_id; },
              extra: function (d) { return { operator_id: d.operator_id, uav_id: d.uav_id }; } },
            onOk: function (d) {
              fSb.set('mission_id', d.mission_id); fCf.set('mission_id', d.mission_id);
              fSb.set('operator', d.operator_id);   /* 回填归属运营方：submit 归属校验违者 1001 */
            }
          }) }]),
          rpCr.root),
        card('② 冲突检测与协调',
          h('p', { class: 'd-small d-muted' }, '同走廊重叠时窗会检出时窗重叠 / 航路交叉 / 高度冲突，主动方任务进入「协调中」；同一冲突不可重复消解。'),
          fCf.root,
          P.actionBar([{ label: '检测冲突', run: P.runOp({
            path: '/api/conflict/detect',
            body: function () { return PORTAL.need(fCf.read(), 'mission_id'); },
            rp: rpCf, successText: '冲突检测完成',
            render: function (d) { return conflictsView(d, fRs); } }) }]),
          rpCf.root, fRs.root,
          P.actionBar([{ label: '提交消解', kind: 'primary', run: P.runOp({
            path: '/api/conflict/resolve',
            body: function () { return PORTAL.need(fRs.read(), 'conflict_id', 'resolution', 'operator'); },
            rp: rpRs, successText: '冲突消解成功',
            render: function (d) { return P.kv([['冲突', d.conflict_id || '—'], ['消解后状态', P.badge(d.status || '—')]]); },
            note: { kind: 'CONFLICT', id: function (d) { return (d && d.conflict_id) || ''; } } }) }]),
          rpRs.root),
        card('③ 跨链提交', fSb.root,
          P.actionBar([{ label: '提交跨域申请', kind: 'primary',
            confirm: { title: '提交跨域申请', msg: '任务将经运营链→监管链→管理链跨域提交，进入管理当局待审队列。', ok: '确认提交' },
            run: P.runOp({
              path: '/api/mission/submit',
              body: function () { return PORTAL.need(fSb.read(), 'mission_id', 'operator'); },
              rp: rpSb, successText: '跨域申请已提交（任务：草稿 → 已提交）',
              render: function (d) {
                return h('div', {},
                  P.kv([['申请号', h('code', { class: 'p-mono' }, d.application.application_id)],
                        ['任务号', d.application.mission_id],
                        ['申请状态', P.badge(d.application.status)]]),
                  P.cxTrail(d.crosschain));
              },
              note: { kind: 'APPLICATION', id: function (d) { return d.application.application_id; },
                extra: function (d) { return { mission_id: d.application.mission_id }; } },
              onOk: function (d) {
                STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
              } }) }]),
          rpSb.root))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });

    function redraw() {
      if (!mx) return;
      mx.clear('zones'); mx.clear('routes');
      mx.drawZones(routes);
      mx.drawRoutes(routes, { active: selected, onPick: pick, opacity: 0.9 });
    }
    function pick(rt) {
      var i = selected.indexOf(rt.route_id);
      if (i >= 0) selected.splice(i, 1); else selected.push(rt.route_id);
      f.set('route_segments', selected);
      redraw();
    }
    /* 勾选框手动改动 → 地图高亮同步（事件委托，setOptions 重建 DOM 也不失效） */
    f.root.addEventListener('change', function (e) {
      if (e.target && e.target.matches && e.target.matches('input[data-mf="route_segments"]')) {
        selected = f.read().route_segments || [];
        redraw();
      }
    });
    loadPickers(); loadRoutes();

    async function loadPickers() {
      var op = await API.call('/api/operator/list', { page: 1, page_size: 200 });
      if (op.ok) f.setOptions('operator_id', [['', '选择运营企业…']].concat(
        (op.data.records || []).map(function (o) { return [o.operator_id, o.name + '（' + o.operator_id + '）']; })));
      var ua = await API.call('/api/uav/list', { page: 1, page_size: 200 });
      if (ua.ok) f.setOptions('uav_id', [['', '选择航空器…']].concat(
        (ua.data.records || []).map(function (u) {
          return [u.uav_id, u.uav_id + ' · ' + (u.model || '?') + ' · ' + (u.registration_mark || '未发放登记标志')];
        })));
      var pl = await API.call('/api/pilot/list', { page: 1, page_size: 200 });
      if (pl.ok) f.setOptions('pilot_license_id', [['', '不关联（可选）']].concat(
        (pl.data.records || []).map(function (l) {
          return [l.license_id, l.name + ' · ' + l.license_no + ' · ' + l.category];
        })));
    }
    async function loadRoutes() {
      var r = await API.call('/api/route/list', { page: 1, page_size: 200 });
      if (!r.ok) { if (mx) mx.setEmpty('航线加载失败：' + (r.message || ('code=' + r.code))); return; }
      routes = r.data.records || [];
      f.setOptions('route_segments', routes.map(function (x) {
        return [x.route_id, x.route_id + ' · ' + x.zone + ' · ' + (GEO.ZONE_LABEL[x.corridor_status] || x.corridor_status)];
      }));
      redraw();
      var pts = GEO.routePoints(routes);
      if (mx && pts.length) mx.fitPoints(pts);
    }
  }

  /* 冲突检测结果列表：点「消解此冲突」预填消解表单；suggestion 是 JSON 字符串（裁决 3）。
     fRs 可为 null（详情面板复用本视图时无预填目标）。 */
  function conflictsView(d, fRs) {
    var list = d.conflicts || [];
    if (!list.length) return P.empty('无冲突（' + (d.count || 0) + ' 项）—— 可直接跨链提交');
    return h('div', {},
      h('div', { class: 'd-small d-muted d-mb' }, '检出 ' + list.length + ' 项冲突。类型：时窗重叠 / 航路交叉 / 高度冲突。'),
      h('div', { class: 'd-col' }, list.map(function (c) {
        var sug = PORTAL.jp(c.suggestion, null);
        return h('div', { class: 'p-card' },
          P.kv([
            ['冲突 ID', h('code', { class: 'p-mono' }, c.conflict_id)],
            ['类型', P.badge(c.conflict_type)],
            ['任务对', c.mission_id_a + ' ⇄ ' + c.mission_id_b],
            ['状态', P.badge(c.status)],
            ['系统建议', sug === null ? '—' : (typeof sug === 'string' ? sug : JSON.stringify(sug))]
          ]),
          fRs ? P.actionBar([{ label: '消解此冲突', run: function () {
            fRs.set('conflict_id', c.conflict_id);
            UI.toast('已预填冲突 ID：' + c.conflict_id + ' —— 填写消解措施后提交');
          } }]) : null);
      })));
  }

  /* ============ Tab 2：我的任务（台账 + 右侧详情/操作面板） ============ */
  function tabMissions(box) {
    var detail = h('div', { class: 'd-small d-muted' }, '点击左侧台账行查看任务详情与跨链操作');
    var tbl = P.dataTable({
      endpoint: '/api/mission/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['DRAFT', 'SUBMITTED', 'REVIEWING', 'COORDINATING', 'APPROVED', 'REJECTED',
            'EXECUTING', 'COMPLETED', 'ABORTED'].map(function (s) { return [s, P.statusZh(s)]; }) },
        { name: 'uav_id', label: '航空器 ID', type: 'text' }
      ],
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '运营企业', key: 'operator_id' },
        { title: '脱敏描述', render: function (r) { return r.masked_value || '—'; } },
        { title: '时间窗', render: function (r) { return UI.fmtDT(r.start_time) + ' → ' + UI.fmtDT(r.end_time); } },
        { title: '创建时间', render: function (r) { return UI.fmtDT(r.created_at); } }
      ],
      onRow: function (r) { openMission(r.mission_id, detail, tbl); },
      emptyText: '暂无任务 —— 在「新建申请」页地图勾选航段创建'
    });
    box.append(h('div', { class: 'd-grid-side' }, tbl,
      h('div', { class: 'd-col' }, h('div', { class: 'd-section' }, '任务详情 · 状态追踪'), detail)));
  }

  async function openMission(mid, panel, tbl) {
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '任务详情查询中…'));
    var r = await API.call('/api/mission/query', { mission_id: mid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }    /* 6002 不存在 → EXPLAIN 解说 */
    var m = r.data;
    STORE.note('MISSION', m.mission_id, { operator_id: m.operator_id, uav_id: m.uav_id });  /* §29 惯例 */
    var rpSb = P.resultPanel(), rpCf = P.resultPanel();
    panel.append(
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['状态', P.badge(m.status)],
        ['脱敏描述', m.masked_value || '—'],
        ['航段', PORTAL.jp(m.route_segments, []).join('、') || '—'],
        ['涉及空域', PORTAL.jp(m.zones, []).join('、') || '—'],
        ['高度带', m.altitude_min + '–' + m.altitude_max + ' m'],
        ['时间窗', UI.fmtDT(m.start_time, true) + ' → ' + UI.fmtDT(m.end_time, true)],
        ['任务 / 载荷类型', h('span', {}, typeZh(MT_ZH, m.mission_type), ' / ', typeZh(PT_ZH, m.payload_type))],
        ['关联执照', m.pilot_license_id || '未关联'],
        ['SM9 身份', h('code', { class: 'p-mono' }, m.sm9_identity || '—')],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(m.sm3_hash, 40))],
        ['创建 / 更新', UI.fmtDT(m.created_at, true) + ' → ' + UI.fmtDT(m.updated_at, true)]
      ]),
      h('p', { class: 'd-small d-muted' }, '任务描述经国密算法加密存储，本页与管理端仅见脱敏值 —— 数据可用不可见。'),
      P.actionBar([
        { label: '提交跨域申请', kind: 'primary',
          confirm: { title: '提交跨域申请', msg: '任务 ' + m.mission_id + ' 将经运营链→监管链→管理链跨域提交，进入管理当局待审队列；仅「草稿」状态可提交。', ok: '确认提交' },
          run: P.runOp({
            path: '/api/mission/submit',
            body: function () { return { mission_id: m.mission_id, operator: m.operator_id }; },
            rp: rpSb, successText: '跨域申请已提交',
            render: function (d) {
              return h('div', {},
                P.kv([['申请号', h('code', { class: 'p-mono' }, d.application.application_id)],
                      ['申请状态', P.badge(d.application.status)]]),
                P.cxTrail(d.crosschain));
            },
            note: { kind: 'APPLICATION', id: function (d) { return d.application.application_id; },
              extra: function (d) { return { mission_id: d.application.mission_id }; } },
            onOk: function (d) {
              STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
              if (tbl) tbl.reload();
            } }) },
        { label: '冲突检测', run: P.runOp({
            path: '/api/conflict/detect',
            body: function () { return { mission_id: m.mission_id }; },
            rp: rpCf, successText: '冲突检测完成',
            render: function (d) { return conflictsView(d, null); } }) }
      ]),
      rpSb.root, rpCf.root);
  }

  OP.flight = { render: render };
})();
