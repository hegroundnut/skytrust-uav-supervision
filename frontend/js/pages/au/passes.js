/* passes.js — 管理当局端·许可管理（Task 10 降级：只读台账 + 验证入口）
   四方分权（锁定裁决）：申请(op) → 审批(au) → 签发(ct) → 验证(au)。
   签发与吊销操作件已整体移交证照中心端（license-center.html，
   ct/issue.js + ct/revoke.js；签发身份 REGISTRY-ADMIN，FLIGHT_PASS 跨链
   irita → fabric），本页不再存在任何签发/吊销调用路径（是移除，不是禁用）。
   保留：pass/list 只读台账 + 行抽屉 pass/query 详情 / pass/verify 验证
   （验证是当局监管职责；冻结契约：envelope 恒 code=0，有效性 = data.valid +
   data.reasons 数据判定，「无效原因」不是错误；仅 pass_id 不存在 → 6002 errCard+EXPLAIN）。
   裁决 4：Pass.route 是 JSON 字符串 → PORTAL.jp。
   端点：pass/list·query·verify。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* Pass 对象 11 键 → kv（query 抽屉专用；route JSON 字符串，裁决 4） */
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
      sub: '电子飞行许可只读台账 + 验证入口（当局监管职责）—— 签发/吊销专属证照中心端' }));

    /* 顶部通告条（Task 10 brief 锁定文案）：签发/吊销移交证照中心端 + 入口链接 */
    root.append(h('div', { class: 'd-notice d-mt' },
      h('b', {}, '通行证签发/吊销已移交证照中心端（四方分权：申请→审批→签发→验证）'),
      ' ',
      h('a', { href: 'license-center.html' }, '前往证照中心端（license-center.html）→')));

    var tbl = P.dataTable({
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
            onClick: function (e) { e.stopPropagation(); passDrawer(r.pass_id); } }, '详情 · 验证');
        } }
      ],
      onRow: function (r) { passDrawer(r.pass_id); },
      emptyText: '暂无许可 —— 任务审核通过并经证照中心端签发后出现在此'
    });
    root.append(card('许可台账 pass/list（只读 · 点击行开详情抽屉）', tbl,
      h('p', { class: 'd-small d-muted' },
        'FLIGHT_PASS 跨链：irita → fabric（证照链签发）—— 签发/吊销操作请前往证照中心端，本页不提供任何变更入口。')));
  }

  async function passDrawer(passId) {
    var d = P.drawer('许可 ' + passId, h('div', { class: 'p-empty' }, '⏳ pass/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!body.isConnected) return;
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 6002 → EXPLAIN 解说 */
    var p = r.data;
    STORE.note('PASS', p.pass_id);                       /* §29 */
    var rpV = P.resultPanel();
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
      rpV.root);
  }

  AU.passes = { render: render };
})();
