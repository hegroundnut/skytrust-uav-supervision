/* alerts.js — 监管当局端·告警管理（计划 B Task 11，spec §5.3）
   alert/raise 登记（event_type 封闭 6 枚举；必填 5 项——裁决 8：以后端 binding 为准，
   不学旧页把 alert_id/mission_id 也列为必填）
   + alert/status 线性状态机单步推进（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED；
   跨级/重复推进 6002 设计内）
   + alert/list 五维过滤台账（行点击 → 抽屉 + 推进表单预填 + 转追踪入口）。
   库中只存伪名+证据摘要（匿名化）——真实身份走「身份追踪」七级跨链解析。
   监管端 operator 惯例：恒 'REG-01'。
   导出 RG.alerts.{alertKv,alertDrawer} 供 cockpit.js 复用（运行时引用，脚本序无关）。
   端点：alert/raise、alert/status、alert/list。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var EVENT_TYPES = ['ROUTE_DEVIATION', 'INVALID_PASS', 'UNKNOWN_NODE_ACCESS',
    'MISSION_MISMATCH', 'WORMHOLE_ALERT', 'IDENTITY_ANOMALY'];
  var STATUSES = ['OPEN', 'IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED'];
  /* 来源系统中文（原表单 hint 即此映射——升级为选项标签，枚举原文降级为 tooltip） */
  var SOURCE_ZH = { SYSTEM1: '任务协同', SYSTEM2: '链下攻防', SYSTEM3: '密文核查', MANUAL: '人工登记' };
  function sourceZh(s) {
    if (!s) return '—';
    return h('span', { title: String(s) }, SOURCE_ZH[s] || String(s));
  }
  function pairs(list) { return list.map(function (s) { return [s, P.statusZh(s)]; }); }

  function render(root, ctx) {
    var slotA = STORE.get('ALERT');
    root.append(P.pageHead({
      title: '告警管理',
      sub: '告警登记 → 状态机推进 → 台账查询（匿名化：库中只存伪名与证据摘要）' }));

    /* --- 告警登记 --- */
    var rpRa = P.resultPanel();
    var fRa = P.form([
      { name: 'uav_pseudonym', label: '航空器伪名', type: 'text', required: true,
        placeholder: 'PSEUDO-UAV-83921',
        hint: '对外只暴露伪名；真实身份经「身份追踪」七级解析' },
      { name: 'event_type', label: '事件类型', type: 'select', required: true, value: 'WORMHOLE_ALERT',
        options: pairs(EVENT_TYPES),
        hint: '从标准事件类型中选择' },
      { name: 'risk_level', label: '风险等级', type: 'select', required: true, value: 'HIGH',
        options: pairs(['LOW', 'MEDIUM', 'HIGH']) },
      { name: 'source_system', label: '来源系统', type: 'select', required: true, value: 'MANUAL',
        options: Object.keys(SOURCE_ZH).map(function (s) { return [s, SOURCE_ZH[s]]; }) },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'REG-01' },
      { name: 'alert_id', label: '告警号（可选）', type: 'text', placeholder: '留空自动生成 ALERT-…' },
      { name: 'mission_id', label: '关联任务（可选）', type: 'text',
        value: (slotA && slotA.extra && slotA.extra.mission_id) || '' },
      { name: 'evidence_hash', label: '证据摘要（可选）', type: 'text',
        placeholder: '可留空，系统自动生成国密摘要' },
      { name: 'wormhole_event_id', label: '虫洞事件号（可选）', type: 'text',
        placeholder: '仅「虫洞告警」类型需要填写' }
    ]);
    var tblAl = null;
    var raiseCard = card('告警登记',
      fRa.root,
      P.actionBar([{ label: '登记告警', kind: 'primary', run: P.runOp({
        path: '/api/alert/raise',
        body: function () {
          var v = PORTAL.need(fRa.read(), 'uav_pseudonym', 'event_type', 'risk_level', 'source_system', 'operator');
          if (!v) return null;
          var body = { uav_pseudonym: v.uav_pseudonym, event_type: v.event_type,
            risk_level: v.risk_level, source_system: v.source_system, operator: v.operator };
          ['alert_id', 'mission_id', 'evidence_hash', 'wormhole_event_id'].forEach(function (k) {
            if (v[k]) body[k] = v[k];
          });
          return body;
        },
        rp: rpRa, successText: '告警已登记（初始状态「待处置」）',
        render: function (d) { return alertKv(d); },
        note: { kind: 'ALERT', id: function (d) { return d.alert_id; },
          extra: function (d) { return { mission_id: d.mission_id }; } },
        onOk: function (d) {
          fSt.set('alert_id', d.alert_id);      /* 推进表单无缝预填 */
          if (tblAl) tblAl.reload();
        }
      }) }]),
      rpRa.root);

    /* --- 状态机推进 --- */
    var rpSt = P.resultPanel();
    var fSt = P.form([
      { name: 'alert_id', label: '告警号', type: 'text', required: true,
        value: slotA ? slotA.id : '', placeholder: 'ALERT-…（登记后自动预填）' },
      { name: 'to_status', label: '目标状态（单步）', type: 'select', required: true, value: 'IDENTIFIED',
        options: pairs(['IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED']) },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'REG-01' },
      { name: 'reason', label: '推进理由', type: 'textarea', rows: 2,
        placeholder: '如：初步研判成立，启动跨链追踪',
        hint: '逐段单步推进；跳级或重复推进将被系统显式拒绝并说明原因' }
    ]);
    var statusCard = card('状态机推进',
      h('div', { class: 'p-card-sub' }, '待处置 → 已定位 → 已追踪 → 已复核 → 已处置 → 已归档 · 逐段单步'),
      fSt.root,
      P.actionBar([{ label: '推进状态', kind: 'primary', run: P.runOp({
        path: '/api/alert/status',
        body: function () {
          var v = PORTAL.need(fSt.read(), 'alert_id', 'to_status', 'operator');
          if (!v) return null;
          var body = { alert_id: v.alert_id, to_status: v.to_status, operator: v.operator };
          if (v.reason) body.reason = v.reason;
          return body;
        },
        rp: rpSt, successText: '状态已推进',
        render: function (d) { return alertKv(d); },
        note: { kind: 'ALERT', id: function (d) { return d.alert_id; } },
        onOk: function () { tblAl.reload(); }
      }) }]),
      rpSt.root);

    /* --- 五维台账 --- */
    tblAl = P.dataTable({
      endpoint: '/api/alert/list', pageSize: 10,
      filters: [
        { name: 'event_type', label: '类型', type: 'select', options: pairs(EVENT_TYPES) },
        { name: 'status', label: '状态', type: 'select', options: pairs(STATUSES) },
        { name: 'risk_level', label: '风险', type: 'select', options: pairs(['LOW', 'MEDIUM', 'HIGH']) },
        { name: 'source_system', label: '来源', type: 'select',
          options: Object.keys(SOURCE_ZH).map(function (s) { return [s, SOURCE_ZH[s]]; }) },
        { name: 'mission_id', label: '任务号', type: 'text' }
      ],
      columns: [
        { title: '告警号', key: 'alert_id', mono: true },
        { title: '伪名', render: function (r) { return UI.trunc(r.uav_pseudonym, 20); }, mono: true },
        { title: '事件类型', render: function (r) { return P.badge(r.event_type); } },
        { title: '风险', render: function (r) { return P.badge(r.risk_level); } },
        { title: '来源', render: function (r) { return sourceZh(r.source_system); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '任务', render: function (r) { return r.mission_id || '—'; } },
        { title: '创建时间', render: function (r) { return UI.fmtDT(r.created_at); } }
      ],
      onRow: function (r) { alertDrawer(r, fSt); },
      emptyText: '暂无告警（攻防演练/密文核查触发或手工登记后出现）'
    });

    root.append(h('div', { class: 'd-grid-2' }, raiseCard, statusCard));
    root.append(card('告警台账',
      h('div', { class: 'p-card-sub' }, '五维过滤 · 行点击查看详情、预填推进表单或转身份追踪'), tblAl));
  }

  /* Alert 10 键完整 kv（cockpit.js 落点详情卡复用） */
  function alertKv(a) {
    return P.kv([
      ['告警号', h('code', { class: 'p-mono' }, a.alert_id)],
      ['事件类型', P.badge(a.event_type)],
      ['风险等级', P.badge(a.risk_level)],
      ['状态', P.badge(a.status)],
      ['来源系统', sourceZh(a.source_system)],
      ['航空器伪名', h('code', { class: 'p-mono' }, a.uav_pseudonym)],
      ['关联任务', a.mission_id || '—'],
      ['证据摘要', h('code', { class: 'p-mono' }, UI.trunc(a.evidence_hash, 32))],
      ['创建 / 更新', UI.fmtDT(a.created_at, true) + ' / ' + UI.fmtDT(a.updated_at, true)]
    ]);
  }

  /* 告警抽屉（cockpit.js 最近告警/落点复用；fSt 仅 alerts 页传入 → 多一个「预填推进表单」按钮） */
  function alertDrawer(a, fSt) {
    P.drawer('告警 ' + a.alert_id,
      alertKv(a),
      h('p', { class: 'd-small d-muted' }, '库中只存伪名与证据摘要（匿名化）——真实身份请到「身份追踪」做七级跨链解析。'),
      P.actionBar([
        fSt ? { label: '预填推进表单', run: function () {
          fSt.set('alert_id', a.alert_id);
          UI.toast('已预填，下一步通常是「' + nextOf(a.status) + '」');
        } } : null,
        { label: '转七级身份追踪 →', kind: 'primary', run: function () {
          STORE.note('ALERT', a.alert_id, { mission_id: a.mission_id });
          location.hash = '#/trace';
        } }
      ].filter(Boolean)));
  }

  function nextOf(s) {
    var i = STATUSES.indexOf(s);
    return (i >= 0 && i < STATUSES.length - 1) ? P.statusZh(STATUSES[i + 1]) : '已终态';
  }

  RG.alerts = { render: render, alertKv: alertKv, alertDrawer: alertDrawer };
})();
