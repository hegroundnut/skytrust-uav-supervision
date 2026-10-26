/* ops.js — 运营商端·运行识别·飞行动态（计划 B Task 8，spec §5.1）
   UOM「运行识别」实时视图：起飞报备（session/open，SM9 挑战认证回显）→ 全屏地图 +
   遥测轮询（每 3s 对全部在册航空器 telemetry/latest），航空器图标按 lat/lon/heading 移动；
   右侧运行识别（RID）卡展示登记标志/运营企业/实名主体/最新遥测；
   会话状态卡 + 降落报备（session/close）+ 会话台账（session/list）+ 会话消息（message/list）。
   起飞报备关联 mission_id 后，后端自动驾驶沿任务航段走廊生成遥测（source=SIM）——
   地图无人机实时移动即由此驱动（spec §5.1 飞行动态闭环；未关联 mission 只建会话不飞，
   telemetry_autopilot.go:91-139：MissionID 为空即跳过）。
   裁决 17：{telemetry:null} 是 code=0 合法响应 =「暂无遥测」，绝不走错误分支；
   红线：坐标双零/缺失 = 未设，不画不猜（GEO.telemetryCoord 已守卫）。
   惯例 ⑤：轮询 = 模块级 timer + DOM 脱离自清理；ATTACKER 节点不在运营端展示。
   端点：session/open·list·close、telemetry/latest·list、message/list、uav/list、
   route/list（底图走廊）、topology/get（底图节点）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var POLL_MS = 3000;
  function ico(name) {
    return h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
      h('use', { href: '#d-ico-' + name }));
  }
  var mx = null, poll = null, busy = false;
  var uavs = [], latestCache = {}, lastSeen = {};
  var curS = null;   /* 当前飞行会话（起飞报备建立，或点台账在飞行接管）——降落报备前提 */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    if (poll) { clearInterval(poll); poll = null; }
    uavs = []; latestCache = {}; lastSeen = {}; busy = false; curS = null;

    root.append(P.pageHead({
      title: '运行识别 · 飞行动态',
      sub: '实时遥测刷新（3 秒）· 运行识别 RID 信息卡 —— 飞行动态全程可见' }));

    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var ridBox = h('div', { class: 'd-col' }, P.empty('选择航空器查看运行识别信息'));
    var trailBox = h('div', { class: 'd-col' }, P.empty('选择航空器查看最近遥测'));
    var flyingEl = h('span', { class: 'd-strong' }, '0');
    var selEl = h('select', { class: 'p-input', onchange: function () { onPick(selEl.value, ridBox, trailBox); } });
    var autoEl = h('input', { type: 'checkbox', checked: true,
      onchange: function () { setPoll(autoEl.checked); } });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        h('div', { class: 'd-toolbar' },
          h('span', { class: 'd-small' }, '航空器'), selEl,
          h('label', { class: 'd-small' }, autoEl, ' 自动刷新（3 秒）'),
          h('button', { class: 'p-btn', onclick: function () { loadBase(); tick(); } }, '立即刷新'),
          h('span', { class: 'd-spacer' }),
          h('span', { class: 'd-small d-muted' }, '在飞：'), flyingEl, h('span', { class: 'd-small d-muted' }, ' 架')),
        mapEl,
        h('div', { class: 'd-map-hint' }, '无人机图标朝向即航空器实时航向；底图展示空域走廊、航段与网络节点。暂无位置上报的航空器不在地图显示。')),
      h('div', { class: 'd-col' },
        card('运行识别（RID）', ridBox),
        card('最近遥测', trailBox))));

    /* --- 飞行报备（spec §5.1：session/open=起飞报备、session/close=降落报备） --- */
    var slotU = STORE.get('UAV'), slotM = STORE.get('MISSION'),
        slotP = STORE.get('PASS'), slotS = STORE.get('SESSION');
    var sessBox = h('div', {}, P.empty('暂无进行中的会话 —— 先「起飞报备」，或点下方会话台账的在飞行接管'));
    var rpSo = P.resultPanel();
    var fSo = P.form([
      { name: 'uav_id', label: '航空器', type: 'text', required: true, value: slotU ? slotU.id : '',
        placeholder: 'UAV-MED-01（可通过顶栏标签快速填入）',
        hint: '须为已完成登记的航空器' },
      { name: 'mission_id', label: '关联任务（强烈建议）', type: 'text', value: slotM ? slotM.id : '',
        hint: '关联任务后，航空器沿任务航线飞行，地图实时展示动态；留空仅建立会话不产生飞行' },
      { name: 'pass_id', label: '关联许可（可选留档）', type: 'text', value: slotP ? slotP.id : '' },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '留空自动分配' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '留空自动分配' }
    ]);
    var tblS = null, tblM = null;   /* runOp/onRow 点击时才解引用，前向声明安全 */
    var soCard = card('起飞报备',
      fSo.root,
      P.actionBar([{ label: '起飞报备 · 建立会话', kind: 'primary', run: P.runOp({
        path: '/api/session/open',
        body: function () {
          var v = PORTAL.need(fSo.read(), 'uav_id');
          if (!v) return null;
          var body = { uav_id: v.uav_id };
          if (v.mission_id) body.mission_id = v.mission_id;
          if (v.pass_id) body.pass_id = v.pass_id;
          if (v.source_node) body.source_node = v.source_node;
          if (v.target_node) body.target_node = v.target_node;
          return body;
        },
        rp: rpSo, successText: '起飞报备完成（初始化 → 认证 → 活跃 · 国密认证通过）',
        render: function (d) {
          return h('div', {},
            P.kv([
              ['会话号', h('code', { class: 'p-mono' }, d.session.session_id)],
              ['会话状态', P.badge(d.session.status)],
              ['航空器', d.session.uav_id],
              ['关联任务 / 许可', (d.session.mission_id || '—') + ' / ' + (d.session.pass_id || '—')],
              ['SM9 认证', d.auth.verified
                ? h('span', { style: { color: 'var(--d-good)' } }, ico('check'), ' 认证通过')
                : h('span', { style: { color: 'var(--d-critical)' } }, ico('x'), ' 未通过')],
              ['SM9 身份', h('code', { class: 'p-mono' }, d.auth.sm9_identity)],
              ['认证随机数', h('code', { class: 'p-mono' }, UI.trunc(d.auth.nonce, 40))],
              ['签名', h('code', { class: 'p-mono' }, UI.trunc(d.auth.signature, 40))],
              ['初始可信路径', (d.path || []).join(' → ')]
            ]),
            h('p', { class: 'd-small d-muted' }, '已关联任务时，航空器随即沿任务航线飞行 —— 上方地图无人机图标实时展示飞行动态。'));
        },
        note: { kind: 'SESSION', id: function (d) { return d.session.session_id; },
          extra: function (d) { return { uav_id: d.session.uav_id, mission_id: d.session.mission_id }; } },
        onOk: function (d) {
          setCur(d.session);
          if (tblS) tblS.reload();
          if (tblM) tblM.reload({ session_id: d.session.session_id });
          tick();
        }
      }) }]),
      rpSo.root);

    var rpCl = P.resultPanel();
    var closeBtn = h('button', { class: 'p-btn p-btn-danger', onclick: doClose }, '降落报备 · 关闭会话');
    async function doClose() {
      if (!curS) { UI.toast('暂无进行中的会话 —— 先起飞报备', 'err'); return; }
      var ok = await P.confirm('降落报备',
        '关闭后航空器停止上报动态，地图图标停留在降落位置，该会话不可再发送消息。会话号：' + curS.session_id,
        '确认降落');
      if (!ok) return;
      var r = await API.call('/api/session/close',
        { session_id: curS.session_id, operator: 'Operator Portal', reason: '降落报备' });
      rpCl.show(r, function (d) {                          /* close 响应 = Session 平铺（§15） */
        return P.kv([
          ['会话号', h('code', { class: 'p-mono' }, d.session_id)],
          ['会话状态', P.badge(d.status)],
          ['航空器', d.uav_id || '—'],
          ['降落报备方', 'Operator Portal'],
          ['更新时间', UI.fmtDT(d.updated_at, true)]
        ]);
      });
      if (r.ok) {
        STORE.note('SESSION', r.data.session_id);
        UI.toast('降落报备完成（' + P.statusZh(r.data.status) + '）');
        setCur(null);
        if (tblS) tblS.reload();
        tick();
      }
    }

    function setCur(s) {
      curS = s;
      sessBox.innerHTML = '';
      if (!s) {
        sessBox.append(P.empty('暂无进行中的会话 —— 先「起飞报备」，或点会话台账的在飞行接管'));
        return;
      }
      sessBox.append(P.kv([
        ['会话号', h('code', { class: 'p-mono' }, s.session_id)],
        ['会话状态', P.badge(s.status)],
        ['航空器', s.uav_id || '—'],
        ['关联任务', s.mission_id || '—'],
        ['当前路径', PORTAL.jp(s.current_path, []).join(' → ') || '—'],
        ['建立时间', UI.fmtDT(s.created_at, true)]
      ]));
    }

    root.append(h('div', { class: 'd-grid-2 d-mt2' },
      soCard,
      card('会话状态 · 降落报备', sessBox,
        h('div', { class: 'd-mt' }, closeBtn,
          h('span', { class: 'd-small d-muted', style: { 'margin-left': '8px' } },
            '关闭后航空器停止上报动态；已关闭的会话不可重复关闭')),
        rpCl.root)));

    tblS = P.dataTable({
      endpoint: '/api/session/list', pageSize: 5,
      filters: [{ name: 'status', label: '状态', type: 'select',
        options: ['INIT', 'AUTHENTICATED', 'ACTIVE', 'DEGRADED', 'RECOVERED', 'CLOSED']
          .map(function (s) { return [s, P.statusZh(s)]; }) }],
      columns: [
        { title: '会话号', render: function (r) { return UI.trunc(r.session_id, 20); }, mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '关联任务', render: function (r) { return r.mission_id || '—'; } },
        { title: '建立时间', render: function (r) { return UI.fmtDT(r.created_at); } }
      ],
      onRow: function (r) {
        if (tblM) tblM.reload({ session_id: r.session_id });
        if (r.status === 'ACTIVE' || r.status === 'DEGRADED' || r.status === 'RECOVERED') {
          setCur(r);   /* 接管为当前会话 → 降落报备可用 */
          UI.toast('会话 ' + UI.trunc(r.session_id, 20) + ' 已接管为当前会话（可降落报备）');
        } else {
          UI.toast('会话号已过滤到会话消息台账');
        }
      },
      emptyText: '暂无会话（起飞报备后出现）'
    });
    tblM = P.dataTable({
      endpoint: '/api/message/list', pageSize: 5,
      filters: [
        { name: 'session_id', label: '会话号', type: 'text', placeholder: 'SESS-…（点会话台账行自动过滤）' },
        { name: 'msg_type', label: '类型', type: 'select',
          options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT']
            .map(function (s) { return [s, P.statusZh(s)]; }) }
      ],
      columns: [
        { title: '消息号', render: function (r) { return UI.trunc(r.message_id, 18); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.msg_type); } },
        { title: '路由', render: function (r) { return r.source_node + ' → ' + r.target_node; }, mono: true },
        { title: '序号', key: 'seq', num: true },
        { title: '耗时', render: function (r) { return UI.fmtMs(r.latency_ms); }, num: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '时间', render: function (r) { return UI.fmtDT(r.created_at); } }
      ],
      emptyText: '暂无消息（会话心跳/位置报会出现在这里）'
    });
    root.append(h('div', { class: 'd-grid-2 d-mt2' },
      card('会话台账',
        h('div', { class: 'p-card-sub' }, '点击在飞行即可接管为当前会话'), tblS),
      card('会话消息',
        h('div', { class: 'p-card-sub' }, '心跳与位置报流水'), tblM)));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadBase().then(tick);
    setPoll(true);

    function setPoll(on) {
      if (poll) { clearInterval(poll); poll = null; }
      if (on) poll = setInterval(tick, POLL_MS);
    }

    /* 惯例 ⑤：页面被路由销毁后 timer 自清理 */
    async function tick() {
      if (!document.body.contains(mapEl)) { if (poll) { clearInterval(poll); poll = null; } return; }
      if (busy || !uavs.length) return;
      busy = true;
      try {
        var res = await Promise.all(uavs.map(function (u) {
          return API.call('/api/telemetry/latest', { uav_id: u.uav_id });
        }));
        var seen = {};
        res.forEach(function (r, i) {
          var u = uavs[i];
          if (!r.ok || !r.data || !r.data.telemetry) return;   /* 裁决 17：null = 暂无遥测，正常 */
          var t = r.data.telemetry;
          latestCache[u.uav_id] = t;
          var c = GEO.telemetryCoord(t);
          if (!c) return;                                       /* 红线：坐标未设不画 */
          seen[u.uav_id] = true;
          if (mx) mx.drone(u.uav_id, c[0], c[1], t.heading);
        });
        Object.keys(lastSeen).forEach(function (id) {
          if (!seen[id] && mx) mx.removeDrone(id);              /* demo/reset 后图标同步清除 */
        });
        lastSeen = seen;
        flyingEl.textContent = String(Object.keys(seen).length);
        if (selEl.value && selEl.value in latestCache) onPick(selEl.value, ridBox, trailBox);
      } finally { busy = false; }
    }

    async function loadBase() {
      var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
      if (rr.ok && mx) {
        mx.clear('zones'); mx.clear('routes');
        mx.drawZones(rr.data.records || []);
        mx.drawRoutes(rr.data.records || []);
      }
      var tr = await API.call('/api/topology/get', {});
      if (tr.ok && mx) {
        mx.clear('nodes');
        mx.drawNodes((tr.data.nodes || []).filter(function (n) { return n.node_type !== 'ATTACKER'; }));
      }
      var ur = await API.call('/api/uav/list', { page: 1, page_size: 200 });
      if (!ur.ok) { UI.toast('航空器列表加载失败：' + (ur.message || ('code=' + ur.code)), 'err'); return; }
      uavs = (ur.data.records || []).filter(function (u) { return u.status !== 'REVOKED'; });
      var keep = selEl.value;
      selEl.innerHTML = '';
      selEl.append(h('option', { value: '' }, '全部航空器（总览）'));
      uavs.forEach(function (u) {
        selEl.append(h('option', { value: u.uav_id },
          u.uav_id + ' · ' + (u.registration_mark || '未发放登记标志')));
      });
      if (keep && uavs.some(function (u) { return u.uav_id === keep; })) selEl.value = keep;
    }
  }

  /* RID 卡 + 最近遥测：选中变化与每轮轮询后刷新 */
  function onPick(uavId, ridBox, trailBox) {
    if (!uavId) {
      ridBox.innerHTML = ''; ridBox.append(P.empty('选择航空器查看运行识别信息'));
      trailBox.innerHTML = ''; trailBox.append(P.empty('选择航空器查看最近遥测'));
      return;
    }
    var u = null;
    for (var i = 0; i < uavs.length; i++) if (uavs[i].uav_id === uavId) { u = uavs[i]; break; }
    var t = latestCache[uavId] || null;
    ridBox.innerHTML = '';
    if (!u) { ridBox.append(P.empty('未找到航空器 ' + uavId)); return; }
    ridBox.append(P.kv([
      ['航空器', h('code', { class: 'p-mono' }, u.uav_id)],
      ['登记标志', h('code', { class: 'p-mono' }, u.registration_mark || '未发放登记标志')],
      ['型号 / 序列号', (u.model || '—') + ' / ' + (u.serial_no || '—')],
      ['运营企业', u.operator_id],
      ['实名主体', u.realname_id ? h('code', { class: 'p-mono' }, u.realname_id) : '未关联'],
      ['航空器状态', P.badge(u.status)],
      ['SM9 身份', h('code', { class: 'p-mono' }, UI.trunc(u.sm9_identity, 32))]
    ]));
    if (t) {
      ridBox.append(h('div', { class: 'd-section' }, '最新遥测'), P.kv([
        ['位置', GEO.fmtCoordPair(t.lat, t.lon)],
        ['高度 / 速度', t.alt + ' m / ' + t.speed + ' m/s'],
        ['航向', t.heading + '°'],
        ['序号 / 来源', '序号 ' + t.seq + ' · 来源 ' + (t.source || '—')],
        ['会话', t.session_id ? h('code', { class: 'p-mono' }, UI.trunc(t.session_id, 24)) : '—'],
        ['上报时间', UI.fmtDT(t.reported_at, true)]
      ]));
    } else {
      ridBox.append(h('div', { class: 'd-section' }, '最新遥测'),
        P.empty('暂无遥测数据'));
    }
    loadTrail(uavId, trailBox);
  }

  async function loadTrail(uavId, box) {
    var r = await API.call('/api/telemetry/list', { uav_id: uavId, page: 1, page_size: 8 });
    if (!box.isConnected) return;
    box.innerHTML = '';
    if (!r.ok) { box.append(P.errCard(r)); return; }
    var recs = r.data.records || [];
    if (!recs.length) { box.append(P.empty('该航空器尚无遥测记录')); return; }
    recs.forEach(function (t) {
      box.append(h('div', { class: 'd-row d-small' },
        h('span', { class: 'd-num' }, '#' + t.seq),
        h('span', { class: 'p-mono' }, GEO.fmtCoordPair(t.lat, t.lon)),
        h('span', {}, t.alt + 'm · ' + t.speed + 'm/s · ' + t.heading + '°'),
        h('span', { class: 'd-muted' }, UI.fmtDT(t.reported_at, true))));
    });
  }

  OP.ops = { render: render };
})();
