/* records.js — 管理当局端·审核留痕（计划 B Task 9，spec §5.2）
   ① review/query：按申请号/审核号查审核记录（{records,total} 无分页回显，review_time ASC）；
   ② crosschain/list（baseBody MISSION_REVIEW_RESULT）：裁决跨链回传流水——business_id 即审核号，
      行点击 P.openCxDetail 四段存证抽屉（fisco-bcos → chainmaker → fabric）。
   裁决 3：Review.rules_hit 响应侧 JSON 字符串 → PORTAL.jp。
   全局审计 audit/query·export 属监管端 #/audit 页（spec §5.3），本页不做。
   端点：review/query、crosschain/list·query（经 openCxDetail）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '审核留痕',
      sub: '审核记录 · 裁决跨链回传流水 —— 每一次裁决都可回溯到链上四段 TxID' }));

    /* ① review/query 审核记录 */
    var rpR = P.resultPanel();
    var fR = P.form([
      { name: 'application_id', label: '申请号', type: 'text', placeholder: 'APP-…（顶栏 chips 可复制）' },
      { name: 'review_id', label: '审核号', type: 'text', placeholder: 'REV-…（两键至少填一个）' }
    ]);
    root.append(card('审核记录 review/query（无分页回显，review_time ASC）', fR.root,
      P.actionBar([{ label: '查询审核记录', kind: 'primary', run: P.runOp({
        path: '/api/review/query',
        body: function () {
          var v = fR.read();
          if (!v.application_id && !v.review_id) {
            UI.toast('申请号与审核号至少填一个', 'err'); return null;
          }
          return v;
        },
        rp: rpR, successText: '查询完成',
        render: function (d) {
          if (!d.total) return P.empty('无匹配审核记录');
          var box = h('div', { class: 'd-col' },
            h('div', { class: 'd-small d-muted' }, '共 ' + d.total + ' 条'));
          (d.records || []).forEach(function (x) {
            box.append(P.kv([
              ['审核号', h('code', { class: 'p-mono' }, UI.trunc(x.review_id, 32))],
              ['申请号', h('code', { class: 'p-mono' }, x.application_id)],
              ['裁决', P.badge(x.result)],
              ['审核员', x.reviewer],
              ['命中规则', PORTAL.jp(x.rules_hit, []).join('、') || '—'],
              ['意见', x.comment || '—'],
              ['审核时间', x.review_time]
            ]));
          });
          return box;
        } }) }]),
      rpR.root));

    /* ② crosschain/list 裁决回传流水（MISSION_REVIEW_RESULT，business_id=审核号） */
    var tblC = P.dataTable({
      endpoint: '/api/crosschain/list', pageSize: 10,
      baseBody: { message_type: 'MISSION_REVIEW_RESULT' },
      filters: [
        { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] }
      ],
      columns: [
        { title: 'cross_tx_id', render: function (r) { return UI.trunc(r.cross_tx_id, 20); }, mono: true },
        { title: '审核号（business_id）', render: function (r) { return UI.trunc(r.business_id, 26); }, mono: true },
        { title: '回传路由', render: function (r) {
          return h('span', {}, P.chainTag(r.source_chain), ' → ', P.chainTag(r.final_target_chain));
        } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '回传时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); P.openCxDetail(r.cross_tx_id); } }, '四段存证');
        } }
      ],
      onRow: function (r) { P.openCxDetail(r.cross_tx_id); },
      emptyText: '暂无裁决回传记录（提交裁决后自动出现）'
    });
    root.append(card('裁决跨链回传流水 crosschain/list（MISSION_REVIEW_RESULT；点行开四段存证）', tblC));
  }

  AU.records = { render: render };
})();
