/* revoke.js — 证照中心·证照吊销（Task 7）
   VALID 证照列表（pass/list status=VALID 服务端过滤 + 分页）→ 吊销确认弹窗（后果文案 +
   reason/operator 必填，operator 默认 REGISTRY-ADMIN）→ pass/revoke。
   服务端语义（pass.go 本地先行 Ruling）：本地吊销即时生效（REVOKED 为终态，不可逆），
   再查验必 valid=false（reason「许可已吊销」）；仅 VALID 可吊销（其余 3002 按设计拒绝）；
   PASS_REVOKE 跨链 best-effort——crosschain_status=FAILED 时如实黄条
   「本地已吊销，链上吊销未达——将自动补发」（revokeNeedsResend 语义），绝不掩饰。
   补发机制如实说明：无后台定时任务——同 pass_id 重入 pass/revoke 只补跨链腿
   （PASS_REVOKE_RETRY 审计留痕，不重复状态迁移），页面提供一键「补发链上吊销」。
   进行中态文案与签发一致（约 3-6s 三链中继，一次性操作延迟预期管理）。
   端点：pass/list、pass/revoke。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var CT = window.CT_PAGES = window.CT_PAGES || {};
  const OPERATOR = 'REGISTRY-ADMIN';
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  const warnBox = (...kids) => h('div', {
    style: { marginTop: '10px', padding: '12px', background: 'var(--d-warning-soft)',
      border: '1px dashed var(--d-warning)', borderRadius: '6px', color: 'var(--d-warning)' } }, ...kids);

  function render(root) {
    root.append(P.pageHead({
      title: '证照吊销',
      sub: '仅 VALID 可吊销（其余 3002 按设计拒绝）· 本地先行即时生效 · PASS_REVOKE 跨链 best-effort，链上失败如实展示'
    }));
    var rp = P.resultPanel();
    rp.root.append(P.empty('尚无吊销操作 —— 在上方列表点「吊销」，回执（本地状态 + 跨链结果 + 四段 TxID）显示在此'));
    var tbl = P.dataTable({
      endpoint: '/api/pass/list', pageSize: 10,
      baseBody: { status: 'VALID' },
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '航空器 ID', type: 'text' }
      ],
      columns: [
        { title: '证照号 pass_id', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '有效窗', render: function (r) {
          return UI.trunc(r.valid_from, 16) + ' → ' + UI.trunc(r.valid_to, 16); } },
        { title: '签发时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-danger',
            onClick: function (e) { e.stopPropagation(); openRevokeModal(r, rp, tbl); } }, '吊销'); } }
      ],
      emptyText: '暂无 VALID 证照 —— 签发后出现在此（GENERATING/USED/EXPIRED/REVOKED 均不可吊销，如实为空）'
    });
    root.append(card('可吊销证照 pass/list（status=VALID 服务端过滤）', tbl));
    root.append(card('吊销结果 pass/revoke（本地状态 + 跨链吊销结果，FAILED 如实黄条）', rp.root));
  }

  /* ---------- 吊销确认弹窗：后果文案 + reason/operator 必填 + 进行中态 ---------- */
  function openRevokeModal(rec, rp, tbl) {
    var f = P.form([
      { name: 'reason', label: '吊销原因 reason', type: 'text', required: true,
        placeholder: '如：任务终止 / 安全风险 / 证照回收', hint: '必填——写入审计与 PASS_REVOKE 跨链载荷' },
      { name: 'operator', label: '操作人 operator', type: 'text', value: OPERATOR, required: true,
        hint: '默认 REGISTRY-ADMIN（证照链证照中心吊销操作身份）' }
    ]);
    var bodyBox = h('div', {},
      P.kv([
        ['证照号', h('code', { class: 'p-mono' }, rec.pass_id)],
        ['任务 / 航空器', rec.mission_id + ' / ' + (rec.uav_id || '—')],
        ['有效窗', UI.trunc(rec.valid_from, 16) + ' → ' + UI.trunc(rec.valid_to, 16)],
        ['当前状态', P.badge(rec.status)]
      ]),
      h('p', { class: 'd-small', style: { color: 'var(--d-warning)' } },
        '吊销后果（如实告知）：① 本地先行——确认后证照立即迁移 REVOKED（终态，不可逆），',
        'pass/verify 随即返回 valid=false（原因「许可已吊销」）；② PASS_REVOKE 跨链（证照链 → 监管链中继 → 运营链）',
        '为 best-effort——链上失败不阻塞本地吊销，将如实黄条展示并支持一键补发；③ 仅 VALID 证照可吊销（其余状态服务端 3002 拒绝）。'),
      f.root);
    var busy = false;
    var mask = h('div', { class: 'p-modal-mask' });
    var btnCancel = h('button', { class: 'p-btn p-btn-ghost', onClick: function () { if (!busy) close(); } }, '取消');
    var btnGo = h('button', { class: 'p-btn p-btn-danger', onClick: submit }, '确认吊销');
    mask.append(h('div', { class: 'p-modal' },
      h('div', { class: 'p-modal-title' }, '吊销证照 pass/revoke'),
      h('div', { class: 'p-modal-msg' }, bodyBox),
      h('div', { class: 'p-modal-btns' }, btnCancel, btnGo)));
    mask.addEventListener('click', function (e) { if (e.target === mask && !busy) close(); });
    function onKey(e) { if (e.key === 'Escape' && !busy) close(); }
    document.addEventListener('keydown', onKey);
    document.body.append(mask);
    function close() { mask.remove(); document.removeEventListener('keydown', onKey); }

    async function submit() {
      if (busy) return;
      var v = PORTAL.need(f.read(), 'reason', 'operator');
      if (!v) return;
      busy = true;
      btnCancel.disabled = true; btnGo.disabled = true;
      /* 进行中态：与签发一致的延迟预期管理（同款三链中继路径） */
      bodyBox.innerHTML = '';
      bodyBox.append(
        h('div', { class: 'p-empty', style: { height: 'auto', padding: '18px 6px' } },
          '⏳ 跨链吊销约 3-6s：证照链→监管链中继→运营链'),
        h('p', { class: 'd-small d-muted d-center' },
          'PASS_REVOKE · irita（源链上链）→ chainmaker（签收+中继）→ fabric（目标链存证）',
          h('br', {}), '本地吊销即时生效；提交中不可关闭本弹窗。'));
      var args = { pass_id: rec.pass_id, reason: String(v.reason).trim(), operator: String(v.operator).trim() };
      var r = await API.call('/api/pass/revoke', args);
      close();
      showResult(r, rp, tbl, args);
    }
  }

  /* ---------- 结果渲染：SUCCESS 绿 / FAILED 如实黄条 + 一键补发 ---------- */
  function showResult(r, rp, tbl, args) {
    rp.show(r, function (d) { return revokeView(d, rp, tbl, args); });
    if (r.ok) {
      STORE.note('PASS', r.data.pass.pass_id, { mission_id: r.data.pass.mission_id });
      if (r.data.crosschain && r.data.crosschain.cross_tx_id) {
        STORE.note('CROSS_TX', r.data.crosschain.cross_tx_id, { business_id: r.data.pass.pass_id });
      }
      UI.toast('证照已吊销 ' + r.data.pass.pass_id +
        (r.data.crosschain_status === 'FAILED' ? '（链上吊销未达，可补发）' : ''), 'ok');
      tbl.reload();                                      /* VALID 列表移除该证 */
      return;
    }
    /* 3002/6002：errCard（含 EXPLAIN 解说）已由 rp.show 渲染；FailData 留痕如实补展 */
    var fd = r.data || {};
    if (fd.pass) {
      rp.root.append(h('div', { class: 'd-small d-muted d-mt' }, '服务端返回的证照当前状态（按设计拒绝的依据，如实展示）：',
        P.badge(fd.pass.status), h('code', { class: 'p-mono' }, fd.pass.pass_id)));
    }
  }

  function revokeView(d, rp, tbl, args) {
    var p = d.pass || {}, cs = d.crosschain_status, cx = d.crosschain;
    var parts = [
      P.kv([
        ['证照号', h('code', { class: 'p-mono' }, p.pass_id || '—')],
        ['本地证照状态', P.badge(p.status)],
        ['链上吊销 crosschain_status', P.badge(cs)]
      ])
    ];
    if (cs === 'SUCCESS') {
      parts.push(h('div', { class: 'p-ok-line' },
        '✓ 本地已吊销（REVOKED 终态，不可逆）且链上吊销存证成功（PASS_REVOKE · 证照链 → 监管链 → 运营链）'));
    } else {
      /* FAILED：brief 钉死黄条文案，绝不掩饰；补发语义如实说明（无后台定时任务） */
      parts.push(warnBox(
        h('b', {}, '⚠ 本地已吊销，链上吊销未达——将自动补发'),
        h('div', { class: 'd-small', style: { color: 'var(--d-ink-2)' } },
          '本地 REVOKED 已即时生效（安全优先：pass/verify 已返回 valid=false「许可已吊销」）。',
          '补发语义（revokeNeedsResend）：同 pass_id 重入 pass/revoke 只补跨链腿（PASS_REVOKE_RETRY 审计留痕，',
          '不重复状态迁移）；补发触发于重入调用，无后台定时任务——点下方按钮立即补发。')));
      parts.push(h('div', { class: 'd-row d-mt' },
        h('button', { class: 'p-btn p-btn-sm p-btn-primary',
          onClick: async function (e) {
            var btn = e.currentTarget;
            btn.disabled = true; var old = btn.textContent; btn.textContent = '⏳ 补发中（约 3-6s）…';
            var r2 = await API.call('/api/pass/revoke', args);
            btn.disabled = false; btn.textContent = old;
            showResult(r2, rp, tbl, args);               /* 补发结果重渲染同一结果面板 */
          } }, '补发链上吊销（同 pass_id 重入 pass/revoke）')));
    }
    if (cx) {
      parts.push(h('div', { class: 'd-section' },
        'PASS_REVOKE 四段 TxID 存证（点击任一段打开 openCxDetail 全量证据；FAILED 记录如实展示）'),
        P.cxTrail(cx));
    } else {
      parts.push(h('p', { class: 'd-small d-muted' }, '响应未携带跨链留痕（crosschain 为空）——可在跨链台账回查，不猜测。'));
    }
    return h('div', {}, ...parts);
  }

  CT.revoke = { render: render };
})();
