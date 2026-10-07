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

  /* RegAudit.result 是 JSON 字符串（如 {"comment":"…","decision":"APPROVE"}）——
     列表列做可读压缩，抽屉里给原文 */
  function resultText(s) {
    var o = PORTAL.jp(s, null);
    if (o && typeof o === 'object') {
      return [o.decision, o.comment].filter(Boolean).join(' · ') || JSON.stringify(o);
    }
    return (s != null && s !== '') ? String(s) : '—';
  }

  function regDrawer(r) {
    P.drawer('监管审计 ' + r.audit_id,
      P.kv([
        ['审计号', h('code', { class: 'p-mono' }, r.audit_id)],
        ['动作', P.badge(r.action)],
        ['操作方', r.operator_id],
        ['目标（target 单键）', h('code', { class: 'p-mono' }, r.target || '—')],
        ['告警号', r.alert_id || '—'],
        ['授权号', r.authorization_id || '—'],
        ['链上存证', r.chain_tx_id ? h('code', { class: 'p-mono' }, r.chain_tx_id) : '—（DENY 不上链）'],
        ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(r.audit_hash, 32))],
        ['时间', r.created_at]
      ]),
      h('div', { class: 'd-section' }, '结果原文（result JSON 字符串）'),
      UI.jsonBlock(PORTAL.jp(r.result, r.result), 160));
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
        { title: '动作', render: function (r) { return P.badge(r.action); } },
        { title: '操作方', key: 'operator_id' },
        { title: '目标', render: function (r) { return UI.trunc(r.target, 24); }, mono: true },
        { title: '结果', render: function (r) { return UI.trunc(resultText(r.result), 30); } },
        { title: '链上存证', render: function (r) { return r.chain_tx_id ? UI.trunc(r.chain_tx_id, 22) : '—'; }, mono: true },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) { regDrawer(r); },
      emptyText: '暂无监管动作留痕——先去「密文核验」或「授权中心」产生动作'
    });
    box.append(card('监管审计导出 regulatory/audit/export（过滤键同台账四维，无分页）',
      h('div', { class: 'd-row d-row-wrap' }, fEx.root,
        P.csvExport({ endpoint: '/api/regulatory/audit/export',
          filters: function () { return fEx.read(); },
          filename: 'regulatory-audit.csv', label: '⤓ 导出 CSV' }))));
    box.append(card('监管动作台账 regulatory/audit/list（INSPECT / AUTH_APPROVE / AUTH_DENY；TRACE_IDENTITY_BROKEN 见全局台账页签）', tbl));
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
        { title: 'trace_id', render: function (r) { return UI.trunc(r.trace_id, 18); }, mono: true },
        { title: '行为方', key: 'actor' },
        { title: '动作', render: function (r) { return P.badge(r.action); } },
        { title: '目标', render: function (r) {
            return UI.trunc((r.target_type || '') + (r.target_id ? ':' + r.target_id : ''), 28);
          }, mono: true },
        { title: '明细', render: function (r) { return UI.trunc(r.detail, 30); } },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) {
        P.drawer('审计日志 #' + r.id,
          P.kv([
            ['ID / trace', h('span', { class: 'd-row' }, String(r.id),
              h('code', { class: 'p-mono' }, r.trace_id || '—'))],
            ['行为方 / 动作', h('span', { class: 'd-row' }, r.actor || '—', P.badge(r.action))],
            ['目标', (r.target_type || '—') + ' : ' + (r.target_id || '—')],
            ['时间', r.created_at]
          ]),
          h('div', { class: 'd-section' }, '明细原文（detail JSON 字符串）'),
          UI.jsonBlock(PORTAL.jp(r.detail, r.detail), 200));
      },
      emptyText: '暂无全局审计记录'
    });
    box.append(card('全局审计导出 audit/export（过滤键 business_id/action/actor，无分页）',
      h('div', { class: 'd-row d-row-wrap' }, fEx.root,
        P.csvExport({ endpoint: '/api/audit/export',
          filters: function () { return fEx.read(); },
          filename: 'audit-all.csv', label: '⤓ 导出 CSV' }))));
    box.append(card('全局审计台账 audit/query（响应无 page/page_size 回显——dataTable 兼容；排序 id DESC）', tbl));
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '监管审计',
      sub: '双台账：监管动作留痕（RegAudit，含链上存证）+ 全局审计（AuditLog，三维过滤）——均可导 CSV' }));
    root.append(P.tabs([
      { key: 'reg', label: '监管审计台账', render: tabReg },
      { key: 'all', label: '全局审计台账', render: tabAll }
    ]));
  }

  RG.audit = { render: render };
})();
