/* audit.js — 监管当局端·监管审计（计划 B Task 12，spec §5.3）
   双台账 + 双 CSV 导出（P.tabs；本页非 mapPage，tabs 无 Leaflet 零尺寸问题）：
   reg 页 regulatory/audit/list·export —— 监管动作留痕（仅 INSPECT / AUTH_APPROVE /
   AUTH_DENY 三写入点；TRACE_IDENTITY_BROKEN 走全局 AuditLog、见 all 页页签；
   RegAudit 目标键名是 target 单键，不是 target_type/target_id 一对——§3）；
   all 页 audit/query·export —— 全局 AuditLog（三维 business_id/action/actor；
   响应只有 {records,total} 无 page/page_size 回显——dataTable 只消费
   records/total（pui.js:338），天然兼容）。
   CSV 导出过滤键 = 各 list 的过滤键（export 无分页）。
   端点：regulatory/audit/list、regulatory/audit/export、audit/query、audit/export。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* 审计动作中文（按后端 logAudit 调用点逐一整理；未收录动作回退原文徽章——红线：不猜不造） */
  var ACTION_ZH = {
    /* 监管域 */
    INSPECT: '密文核验', INSPECT_CHAIN_FAILED: '核验结论上链失败',
    AUTH_APPLY: '授权申请', AUTH_REVIEW: '授权审批',
    AUTH_APPROVE: '授权批准', AUTH_DENY: '授权拒绝',
    TRACE_IDENTITY: '身份追踪', TRACE_IDENTITY_BROKEN: '身份追踪断链',
    ALERT_RAISE: '告警登记', ALERT_STATUS: '告警状态推进',
    WORMHOLE_ENABLE: '虫洞开启', WORMHOLE_DISABLE: '虫洞关闭', WORMHOLE_ISOLATE: '虫洞隔离',
    RISK_EVALUATE: '风险评估', PATH_SWITCH: '路径切换',
    /* 运行域 */
    SESSION_OPEN: '会话建立', SESSION_CLOSE: '会话关闭',
    MESSAGE_SEND: '消息发送', STATE_TRANSITION: '状态迁移',
    TELEMETRY_REPORT: '遥测上报', NODE_REGISTER: '节点登记',
    MISSION_CREATE: '任务创建', MISSION_SUBMIT: '任务提交',
    REVIEW_SUBMIT: '审核提交', ROUTE_CREATE: '航段登记',
    PASS_ISSUE: '许可签发', PASS_REVOKE: '许可吊销', PASS_REVOKE_RETRY: '许可吊销重试',
    PASS_REVOKE_CROSSCHAIN_FAILED: '许可吊销跨链中继失败',
    PILOT_LICENSE_ISSUE: '执照签发', REALNAME_REGISTER: '实名登记',
    OPERATOR_REGISTER: '运营方登记', MANUFACTURER_REGISTER: '厂商登记',
    IDENTITY_MAPPING_CREATE: '身份映射建立', MAPPING_PASS_BACKFILL: '许可映射回填',
    UAV_REVOKE: '航空器注销', CONFLICT_FLAGGED: '冲突标记', CONFLICT_RESOLVE: '冲突处置',
    /* 跨链网关（CROSSCHAIN_ + 5 种消息类型，spec §6.3） */
    CROSSCHAIN_UAV_REGISTER_PROOF: '航空器登记凭证中继',
    CROSSCHAIN_MISSION_APPLICATION: '任务申请中继',
    CROSSCHAIN_MISSION_REVIEW_RESULT: '审核结果中继',
    CROSSCHAIN_FLIGHT_PASS: '电子许可中继',
    CROSSCHAIN_PASS_REVOKE: '许可吊销中继'
  };
  function actionBadge(a) {
    var s = String(a ?? '');
    var zh = ACTION_ZH[s];
    if (!zh && /_FAILED$/.test(s)) {
      var base = ACTION_ZH[s.replace(/_FAILED$/, '')];
      if (base) zh = base + '失败';      /* MESSAGE_SEND_FAILED → 消息发送失败（机械后缀，不猜语义） */
    }
    return zh ? P.badgeZh(a, zh, 'neutral') : P.badge(a);
  }
  function decisionZh(d) { return d === 'APPROVE' ? '批准' : d === 'DENY' ? '拒绝' : d; }

  /* RegAudit.result 是 JSON 字符串（如 {"comment":"…","decision":"APPROVE"}）——
     列表列做可读压缩，原文仅调试展示 */
  function resultText(s) {
    var o = PORTAL.jp(s, null);
    if (o && typeof o === 'object') {
      return [decisionZh(o.decision), o.comment].filter(Boolean).join(' · ') || JSON.stringify(o);
    }
    return (s != null && s !== '') ? String(s) : '—';
  }

  function regDrawer(r) {
    P.drawer('监管审计 ' + r.audit_id,
      P.kv([
        ['审计号', h('code', { class: 'p-mono' }, r.audit_id)],
        ['动作', actionBadge(r.action)],
        ['操作方', r.operator_id],
        ['目标', h('code', { class: 'p-mono' }, r.target || '—')],
        ['告警号', r.alert_id || '—'],
        ['授权号', r.authorization_id || '—'],
        ['链上存证', r.chain_tx_id ? h('code', { class: 'p-mono' }, r.chain_tx_id) : '—（「拒绝」裁决不上链）'],
        ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(r.audit_hash, 32))],
        ['结果', resultText(r.result)],
        ['时间', UI.fmtDT(r.created_at, true)]
      ]),
      P.DEBUG ? h('div', { class: 'd-section' }, '结果原文') : null,
      P.DEBUG ? UI.jsonBlock(PORTAL.jp(r.result, r.result), 160) : null);
  }

  /* --- 页签一：监管审计台账（regulatory/audit/list·export） --- */
  function tabReg(box) {
    var fEx = P.form([
      { name: 'alert_id', label: '告警号过滤', type: 'text', placeholder: 'ALERT-…' },
      { name: 'authorization_id', label: '授权号过滤', type: 'text', placeholder: 'AUTH-…' },
      { name: 'action', label: '动作过滤', type: 'text', placeholder: 'INSPECT / AUTH_APPROVE / …' },
      { name: 'operator_id', label: '操作方过滤', type: 'text', placeholder: 'REG-01' }
    ]);
    var tbl = P.dataTable({
      endpoint: '/api/regulatory/audit/list', pageSize: 10,
      filters: [
        { name: 'action', label: '动作', type: 'text', placeholder: '如 INSPECT' },
        { name: 'operator_id', label: '操作方', type: 'text' },
        { name: 'alert_id', label: '告警号', type: 'text' },
        { name: 'authorization_id', label: '授权号', type: 'text' }
      ],
      columns: [
        { title: '审计号', render: function (r) { return UI.trunc(r.audit_id, 20); }, mono: true },
        { title: '动作', render: function (r) { return actionBadge(r.action); } },
        { title: '操作方', key: 'operator_id' },
        { title: '目标', render: function (r) { return UI.trunc(r.target, 24); }, mono: true },
        { title: '结果', render: function (r) { return UI.trunc(resultText(r.result), 30); } },
        { title: '链上存证', render: function (r) { return r.chain_tx_id ? UI.trunc(r.chain_tx_id, 22) : '—'; }, mono: true },
        { title: '时间', render: function (r) { return UI.fmtDT(r.created_at); } }
      ],
      onRow: function (r) { regDrawer(r); },
      emptyText: '暂无监管动作留痕——先去「密文核验」或「授权中心」产生动作'
    });
    box.append(card('监管审计导出',
      h('div', { class: 'p-card-sub' }, '过滤条件同台账 · 导出全量'),
      h('div', { class: 'd-row d-row-wrap' }, fEx.root,
        P.csvExport({ endpoint: '/api/regulatory/audit/export',
          filters: function () { return fEx.read(); },
          filename: 'regulatory-audit.csv', label: '导出 CSV' }))));
    box.append(card('监管动作台账',
      h('div', { class: 'p-card-sub' }, '密文核验与授权裁决动作全程留痕；身份追踪动作见「全局审计台账」页签'), tbl));
  }

  /* --- 页签二：全局审计台账（audit/query·export） --- */
  function tabAll(box) {
    var fEx = P.form([
      { name: 'business_id', label: '业务单号过滤', type: 'text',
        placeholder: 'MISSION-… / SESS-… / PSEUDO-UAV-…' },
      { name: 'action', label: '动作过滤', type: 'text', placeholder: '如 TRACE_IDENTITY' },
      { name: 'actor', label: '行为方过滤', type: 'text', placeholder: 'REG-01' }
    ]);
    var tbl = P.dataTable({
      endpoint: '/api/audit/query', pageSize: 10,
      filters: [
        { name: 'business_id', label: '业务单号', type: 'text' },
        { name: 'action', label: '动作', type: 'text' },
        { name: 'actor', label: '行为方', type: 'text' }
      ],
      columns: [
        { title: 'ID', key: 'id', num: true },
        { title: '追踪 ID', render: function (r) { return UI.trunc(r.trace_id, 18); }, mono: true },
        { title: '行为方', key: 'actor' },
        { title: '动作', render: function (r) { return actionBadge(r.action); } },
        { title: '目标', render: function (r) {
            return UI.trunc((r.target_type || '') + (r.target_id ? ':' + r.target_id : ''), 28);
          }, mono: true },
        { title: '明细', render: function (r) { return UI.trunc(r.detail, 30); } },
        { title: '时间', render: function (r) { return UI.fmtDT(r.created_at); } }
      ],
      onRow: function (r) {
        P.drawer('审计日志 #' + r.id,
          P.kv([
            ['编号 / 追踪 ID', h('span', { class: 'd-row' }, String(r.id),
              h('code', { class: 'p-mono' }, r.trace_id || '—'))],
            ['行为方 / 动作', h('span', { class: 'd-row' }, r.actor || '—', actionBadge(r.action))],
            ['目标', (r.target_type || '—') + ' : ' + (r.target_id || '—')],
            ['时间', UI.fmtDT(r.created_at, true)]
          ]),
          P.DEBUG ? h('div', { class: 'd-section' }, '明细原文') : null,
          P.DEBUG ? UI.jsonBlock(PORTAL.jp(r.detail, r.detail), 200) : null);
      },
      emptyText: '暂无全局审计记录'
    });
    box.append(card('全局审计导出',
      h('div', { class: 'p-card-sub' }, '按业务单号、动作、行为方过滤 · 导出全量'),
      h('div', { class: 'd-row d-row-wrap' }, fEx.root,
        P.csvExport({ endpoint: '/api/audit/export',
          filters: function () { return fEx.read(); },
          filename: 'audit-all.csv', label: '导出 CSV' }))));
    box.append(card('全局审计台账',
      h('div', { class: 'p-card-sub' }, '全平台行为留痕 · 按时间倒序'), tbl));
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '监管审计',
      sub: '双台账：监管动作留痕（含链上存证）+ 全局审计（多维过滤）——均可导出 CSV' }));
    root.append(P.tabs([
      { key: 'reg', label: '监管审计台账', render: tabReg },
      { key: 'all', label: '全局审计台账', render: tabAll }
    ]));
  }

  RG.audit = { render: render };
})();
