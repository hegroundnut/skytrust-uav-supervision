/* passes.js — 管理当局端·许可管理（计划 B Task 9，spec §5.2）
   签发 pass/issue（前提任务 APPROVED；同 pass_id 且 GENERATING=幂等续签不产生第二张证；
   已生效重复签发→3002 设计内拒绝）+ pass/list 台账 + 行抽屉：pass/query 详情 /
   pass/verify 验证（code 恒 0，valid/reasons 是数据）/ pass/revoke 吊销
   （本地先行立即生效；跨链重发失败仅留痕不回滚；仅 VALID 可吊销→3002）。
   裁决 4：Pass.route 是 JSON 字符串 → PORTAL.jp。
   端点：pass/issue·list·query·verify·revoke。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* Pass 对象 11 键 → kv（issue 回执与 query 抽屉共用；route JSON 字符串，裁决 4） */
  function passKv(p) {
    return P.kv([
      ['许可号', h('code', { class: 'p-mono' }, p.pass_id)],
      ['状态', P.badge(p.status)],
      ['任务号', h('code', { class: 'p-mono' }, p.mission_id)],
      ['航空器', p.uav_id ? h('code', { class: 'p-mono' }, p.uav_id) : '—'],
      ['有效窗', p.valid_from + ' → ' + p.valid_to],
      ['许可航线', PORTAL.jp(p.route, []).join(' → ') || '—'],
      ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(p.sm3_hash, 48))],
      ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(p.signature, 48))],
      ['签发 / 更新', p.created_at + ' → ' + p.updated_at]
    ]);
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '许可管理',
      sub: '电子飞行许可签发 / 验证 / 吊销 —— 签发前提：任务已 APPROVED；吊销本地先行立即生效' }));

    var tbl = null;   /* 签发成功后 reload 台账（runOp 点击时才解引用，前向声明安全） */
    var rp = P.resultPanel();
    var slot = STORE.get('MISSION');
    var f = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'MISSION-2026-xxx（须已 APPROVED）' },
      { name: 'issuer', label: '签发人', type: 'text', required: true, value: 'FISCO-ADMIN' },
      { name: 'pass_id', label: '许可号（可选）', type: 'text',
        placeholder: '留空=自动生成 PASS-<年>-%03d；同号且 GENERATING=幂等续签' },
      { name: 'valid_from', label: '生效时间', type: 'datetime', value: UI.datetimeLocal(0),
        hint: '格式 YYYY-MM-DD HH:mm:ss（预填当前）' },
      { name: 'valid_to', label: '失效时间', type: 'datetime', value: UI.datetimeLocal(480),
        hint: '预填 8 小时后；两键均留空则用服务端默认窗口' }
    ]);
    root.append(card('签发许可 pass/issue（FLIGHT_PASS 跨链：fisco-bcos → fabric）',
      h('p', { class: 'd-small d-muted' }, '任务未 APPROVED → 6002（文案含 UAV 实际状态）；重复签发已生效许可 → 3002 设计内拒绝；跨链失败时许可停留 GENERATING 并留痕 FailData —— 修复后同 pass_id 重试为幂等续签，不产生第二张证。'),
      f.root,
      P.actionBar([{ label: '签发许可', kind: 'primary',
        confirm: { title: '确认签发', msg: '许可将签名（SM3 摘要 + SM9 签名）并经管理链上链回传运营链。', ok: '确认签发' },
        run: P.runOp({
          path: '/api/pass/issue',
          body: function () { return PORTAL.need(f.read(), 'mission_id', 'issuer'); },
          rp: rp, successText: '许可已签发（VALID）并上链',
          render: function (d) { return h('div', {}, passKv(d.pass), P.cxTrail(d.crosschain)); },
          note: { kind: 'PASS', id: function (d) { return d.pass.pass_id; },
            extra: function (d) { return { mission_id: d.pass.mission_id }; } },
          onOk: function (d) {
            STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.pass.pass_id });
            if (tbl) tbl.reload();
          } }) }]),
      rp.root));

    tbl = P.dataTable({
      endpoint: '/api/pass/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '航空器 ID', type: 'text' }
      ],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '有效窗', render: function (r) { return UI.trunc(r.valid_from, 16) + ' → ' + UI.trunc(r.valid_to, 16); } },
        { title: '签发时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); passDrawer(r.pass_id, tbl); } }, '详情 · 验证 · 吊销');
        } }
      ],
      onRow: function (r) { passDrawer(r.pass_id, tbl); },
      emptyText: '暂无许可 —— 任务审核通过并签发后出现在此'
    });
    root.append(card('许可台账 pass/list（点击行开详情抽屉）', tbl));
  }

  async function passDrawer(passId, tbl) {
    var d = P.drawer('许可 ' + passId, h('div', { class: 'p-empty' }, '⏳ pass/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!body.isConnected) return;
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 6002 → EXPLAIN 解说 */
    var p = r.data;
    STORE.note('PASS', p.pass_id);                       /* §29 */
    var rpV = P.resultPanel(), rpR = P.resultPanel();
    var fRv = P.form([
      { name: 'reason', label: '吊销原因', type: 'text', required: true, placeholder: '如：任务终止 / 安全风险' },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'FISCO-ADMIN' }
    ]);
    body.append(passKv(p),
      h('div', { class: 'd-section' }, '验证 pass/verify（code 恒 0：valid/reasons 是数据不是错误）'),
      P.actionBar([{ label: '验证许可', run: P.runOp({
        path: '/api/pass/verify',
        body: function () { return { pass_id: passId }; },
        rp: rpV, successText: '验证完成',
        render: function (x) {
          return h('div', {},
            P.statCards([{ label: 'valid', value: x.valid ? '✓ 有效' : '✗ 无效',
              tone: x.valid ? 'good' : 'critical', sub: 'status ' + x.status }]),
            x.reasons && x.reasons.length
              ? h('ul', {}, x.reasons.map(function (t) { return h('li', { style: { color: '#b91c1c' } }, t); }))
              : h('div', { class: 'd-small d-muted' }, '无拒绝原因'));
        } }) }]),
      rpV.root,
      h('div', { class: 'd-section' }, '吊销 pass/revoke（本地先行；仅 VALID 可吊销，否则 3002）'),
      fRv.root,
      P.actionBar([{ label: '吊销许可', kind: 'danger',
        confirm: { title: '确认吊销', msg: '吊销后 pass/verify 立即返回 valid=false（reason「许可已吊销」）。本地先行生效，跨链重发失败仅留痕不回滚。', ok: '确认吊销' },
        run: P.runOp({
          path: '/api/pass/revoke',
          body: function () {
            var v = PORTAL.need(fRv.read(), 'reason', 'operator');
            if (!v) return null;
            return { pass_id: passId, reason: v.reason, operator: v.operator };
          },
          rp: rpR, successText: '许可已吊销（本地生效）',
          render: function (x) {
            return h('div', {},
              P.kv([['许可号', h('code', { class: 'p-mono' }, x.pass.pass_id)],
                    ['状态', P.badge(x.pass.status)],
                    ['跨链重发', P.badge(x.crosschain_status)]]),
              h('p', { class: 'd-small d-muted' }, x.crosschain_status === 'FAILED'
                ? '本地吊销已生效；跨链重发失败仅留痕、不回滚（设计内语义，见安全红线）。'
                : '跨链吊销存证回传成功（PASS_REVOKE）。'),
              P.cxTrail(x.crosschain));
          },
          note: { kind: 'PASS', id: function (x) { return x.pass.pass_id; } },
          onOk: function () { if (tbl) tbl.reload(); } }) }]),
      rpR.root);
  }

  AU.passes = { render: render };
})();
