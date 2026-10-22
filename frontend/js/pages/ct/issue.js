/* issue.js — 证照中心·通行证签发（Task 7）
   待签发发现：mission/list(APPROVED) ⋈ pass/list 客户端比对——APPROVED 且无对应
   mission_id 证照记录 = 待签发（home.js 同语义；两侧各取最近 200 条、窗口如实标注，不外推）。
   签发弹窗：issuer 固定 REGISTRY-ADMIN（证照链证照中心签发身份，只读展示不可改）；
   valid_from/to 默认 ±1h（两键均清空 = 服务端回退任务时间窗）；pass_id 留空 = 自动生成
   PASS-<年>-%03d；显式同号且记录停留 GENERATING = 幂等续签重试（prevFailedSourceTxID：
   复用上次 FAILED 记录已确认的源链 TxID，不产生第二张证）。
   SM3 摘要（裁决落地）：前端无 SM3 实现且禁新增依赖 → 提交前不预生成摘要、绝不伪造；
   摘要由服务端签发时对规范化材料（pass_id/mission_id/uav_id/route/valid_from/valid_to）
   权威计算，回执即时展示 pass.sm3_hash（弹窗内如实说明）。
   进行中态：「跨链签发约 3-6s：证照链→监管链中继→运营链」spinner（一次性操作延迟预期管理）。
   成功卡 = pass_id + QR(renderQR) + 四段 TxID（cxTrail 段点击即 openCxDetail 入口）；
   失败 = P.errCard（EXPLAIN 解说）+ GENERATING 停留时「同 pass_id 可重试」提示 +
   一键重开弹窗预填同号 + FAILED 跨链留痕如实展示。
   红线：一切渲染值来自实时响应；失败绝不渲染成功卡；空列表 = 诚实空态。
   端点：mission/list、pass/list、pass/issue。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var CT = window.CT_PAGES = window.CT_PAGES || {};
  const ISSUER = 'REGISTRY-ADMIN';   /* 证照链证照中心签发身份（Task 3 迁移后 passSignerUID 固定） */
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* SM9 签名身份注记（双身份过渡）：已知身份给友好标签，未登记身份只展示原值——绝不猜测 */
  function signerNote(sm9id) {
    if (sm9id === 'SM9-ID-REGISTRY-ADMIN') return 'REGISTRY-ADMIN · 证照链证照中心（现行签发身份）';
    if (sm9id === 'SM9-ID-FISCO-ADMIN') return 'FISCO-ADMIN · 管理链（2026-10-13 迁移前历史签发身份）';
    return '未登记身份（原值展示）';
  }

  function render(root) {
    root.append(P.pageHead({
      title: '通行证签发',
      sub: '证照链源发签发 · 国密签名 · 跨链存证：证照链 → 监管链签收 → 运营链存证'
    }));
    var rp = P.resultPanel();
    rp.root.append(P.empty('尚无签发操作 —— 在上方待签发表格点「签发」，签发回执（电子证面与链上存证）显示在此'));
    var listBox = h('div', {});
    root.append(card('待签发任务（已获批准、尚未发证）', listBox,
      h('p', { class: 'd-small d-muted' }, '统计窗口：两侧各取最近 200 条比对——超出窗口的总量在计数行如实标注。')));
    root.append(card('签发结果（成功展示电子证面，失败提示原因与重试入口）', rp.root));
    loadPending(listBox, rp);
  }

  /* ---------- 待签发表格（客户端 join，红线 #9：只渲染实时响应） ---------- */
  async function loadPending(box, rp) {
    box.innerHTML = '';
    box.append(h('div', { class: 'p-empty' }, '⏳ 待签发任务加载中…'));
    var mR = await API.call('/api/mission/list', { status: 'APPROVED', page: 1, page_size: 200 });
    var pR = await API.call('/api/pass/list', { page: 1, page_size: 200 });
    if (!box.isConnected) return;                      /* 加载中用户已离开本页 */
    box.innerHTML = '';
    if (!mR.ok) { box.append(P.errCard(mR)); return; }
    if (!pR.ok) { box.append(P.errCard(pR)); return; }
    var issued = {};
    (pR.data.records || []).forEach(function (p) { if (p.mission_id) issued[p.mission_id] = true; });
    var pend = (mR.data.records || []).filter(function (m) { return !issued[m.mission_id]; });
    box.append(h('div', { class: 'd-small d-muted d-mb' },
      '已批准任务共 ' + (mR.data.total || 0) + ' 条 · 证照台账共 ' + (pR.data.total || 0) +
      ' 条（最近 200 条窗口内比对）→ 待签发 ' + pend.length + ' 条'),
      h('button', { class: 'p-btn p-btn-sm p-btn-ghost d-mb',
        onClick: function () { loadPending(box, rp); } }, '⟳ 刷新'));
    if (!pend.length) {
      box.append(P.empty('暂无待签发任务 —— 任务经管理当局审核批准、尚未发证时出现在此'));
      return;
    }
    box.append(h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
      h('thead', {}, h('tr', {},
        ['任务号', '申请人', '时间窗', '操作'].map(function (t) { return h('th', {}, t); }))),
      h('tbody', {}, pend.map(function (m) {
        return h('tr', {},
          h('td', { class: 'p-mono' }, m.mission_id),
          h('td', {}, m.operator_id || '—'),
          h('td', {}, UI.trunc(m.start_time, 16) + ' → ' + UI.trunc(m.end_time, 16)),
          h('td', {}, h('button', { class: 'p-btn p-btn-sm p-btn-primary',
            onClick: function () {
              openIssueModal(m, rp, function () { loadPending(box, rp); }, '');
            } }, '签发')));
      })))));
  }

  /* ---------- 签发弹窗（issuer 只读 / ±1h 默认窗 / SM3 诚实说明 / 进行中态） ---------- */
  function openIssueModal(m, rp, onDone, prefillPassId) {
    var f = P.form([
      { name: 'pass_id', label: '证照号（可选）', type: 'text', value: prefillPassId || '',
        placeholder: '留空自动生成，如 PASS-2026-001',
        hint: '证照生成中时填入同一证照号可续办签发，不会产生第二张证照' },
      { name: 'valid_from', label: '生效时间', type: 'datetime', value: UI.datetimeLocal(-60),
        hint: '默认预填当前时间前 1 小时' },
      { name: 'valid_to', label: '失效时间', type: 'datetime', value: UI.datetimeLocal(60),
        hint: '默认预填当前时间后 1 小时；两项均留空时按任务时间窗执行' }
    ]);
    var bodyBox = h('div', {},
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['申请人 / 航空器', (m.operator_id || '—') + ' / ' + (m.uav_id || '—')],
        ['航段', PORTAL.jp(m.route_segments, []).join(' → ') || '—'],
        ['任务时间窗', UI.trunc(m.start_time, 16) + ' → ' + UI.trunc(m.end_time, 16)],
        ['描述（脱敏）', m.masked_value || '—'],
        ['签发人', h('b', { class: 'p-mono' }, ISSUER), ],
      ]),
      h('p', { class: 'd-small d-muted' },
        '签发人身份固定 ', h('code', { class: 'p-mono' }, ISSUER),
        '（证照链证照中心，只读不可改）。',
        '证照摘要于签发时以国密 SM3 算法权威计算——',
        '签发成功后，回执即时展示摘要与 SM9 签名结果。'),
      f.root);
    var busy = false;
    var mask = h('div', { class: 'p-modal-mask' });
    var btnCancel = h('button', { class: 'p-btn p-btn-ghost', onClick: function () { if (!busy) close(); } }, '取消');
    var btnGo = h('button', { class: 'p-btn p-btn-primary', onClick: submit }, '确认签发');
    mask.append(h('div', { class: 'p-modal' },
      h('div', { class: 'p-modal-title' }, '签发通行证'),
      h('div', { class: 'p-modal-msg' }, bodyBox),
      h('div', { class: 'p-modal-btns' }, btnCancel, btnGo)));
    mask.addEventListener('click', function (e) { if (e.target === mask && !busy) close(); });
    function onKey(e) { if (e.key === 'Escape' && !busy) close(); }
    document.addEventListener('keydown', onKey);
    document.body.append(mask);
    function close() { mask.remove(); document.removeEventListener('keydown', onKey); }

    async function submit() {
      if (busy) return;
      var v = f.read();
      /* 轻量前置校验（同格式才做字典序比较；其余交服务端 6002 如实拒绝） */
      var re = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      if (v.valid_from && v.valid_to && re.test(v.valid_from) && re.test(v.valid_to) &&
          v.valid_to <= v.valid_from) {
        UI.toast('失效时间必须晚于生效时间', 'err'); return;
      }
      busy = true;
      btnCancel.disabled = true; btnGo.disabled = true;
      /* 进行中态（Review Focus：一次性操作延迟预期管理，brief 钉死文案） */
      bodyBox.innerHTML = '';
      bodyBox.append(
        h('div', { class: 'p-empty', style: { height: 'auto', padding: '18px 6px' } },
          '⏳ 跨链签发约 3-6s：证照链→监管链中继→运营链'),
        h('p', { class: 'd-small d-muted d-center' },
          '证照链源发上链 → 监管链签收中继 → 运营链跨链存证',
          h('br', {}), '请勿重复提交；提交中不可关闭本弹窗。'));
      var body = { mission_id: m.mission_id, issuer: ISSUER };
      if (v.pass_id) body.pass_id = String(v.pass_id).trim();
      if (v.valid_from) body.valid_from = v.valid_from;
      if (v.valid_to) body.valid_to = v.valid_to;
      var r = await API.call('/api/pass/issue', body);
      close();
      showResult(r, rp, m, onDone);
    }
  }

  /* ---------- 结果渲染：成功证面 / 失败错误卡 + 同 pass_id 重试提示 ---------- */
  function showResult(r, rp, m, onDone) {
    rp.show(r, function (d) { return successView(d); });
    if (r.ok) {
      var d = r.data;
      STORE.note('PASS', d.pass.pass_id, { mission_id: d.pass.mission_id });
      if (d.crosschain && d.crosschain.cross_tx_id) {
        STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.pass.pass_id });
      }
      UI.toast('证照已签发 ' + d.pass.pass_id, 'ok');
      if (onDone) onDone();                            /* 待签发表格刷新（该任务已有证照） */
      return;
    }
    /* 失败：errCard（含 EXPLAIN 解说）已由 rp.show 渲染——按 prevFailedSourceTxID 语义补重试提示 */
    var fd = r.data || {};                             /* FailData 携带 {pass,crosschain} 留痕 */
    if (fd.pass && fd.pass.status === 'GENERATING') {
      rp.root.append(h('div', {
        style: { marginTop: '10px', padding: '12px', background: 'var(--d-warning-soft)',
          border: '1px dashed var(--d-warning)', borderRadius: '6px', color: 'var(--d-warning)' } },
        h('b', {}, '⚠ 证照生成中（跨链存证未完成）—— 同证照号可重试：'),
        h('code', { class: 'p-mono' }, fd.pass.pass_id),
        h('div', { class: 'd-small', style: { color: 'var(--d-ink-2)' } },
          '重试将复用上次已确认的源链 TxID 续办原证签发，不会产生第二张证照。'),
        h('div', { class: 'd-row d-mt' },
          h('button', { class: 'p-btn p-btn-sm p-btn-primary',
            onClick: function () { openIssueModal(m, rp, onDone, fd.pass.pass_id); } },
            '同证照号重试签发'))));
    }
    if (fd.crosschain) {
      rp.root.append(h('div', { class: 'd-small d-muted d-mt' }, '失败的跨链留痕（如实展示）：'),
        P.cxTrail(fd.crosschain));
    }
  }

  /* ---------- 成功证面：pass_id + QR + SM3 权威摘要 + 签名身份 + 四段 TxID ---------- */
  function successView(d) {
    var p = d.pass || {}, cx = d.crosschain;
    var qrEl = h('div', { class: 'd-qr' });
    var cert = h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '无人机电子飞行许可'),
        h('span', { class: 'd-cert-no' }, p.pass_id || '—')),
      h('div', { class: 'd-cert-body' },
        h('div', { class: 'd-cert-main' }, P.kv([
          ['许可状态', P.badge(p.status)],
          ['任务号', h('code', { class: 'p-mono' }, p.mission_id)],
          ['航空器', h('code', { class: 'p-mono' }, p.uav_id || '—')],
          ['有效窗', p.valid_from + ' → ' + p.valid_to],
          ['许可航线', PORTAL.jp(p.route, []).join(' → ') || '—'],
          ['SM3 摘要', h('code', { class: 'p-mono', title: p.sm3_hash }, UI.trunc(p.sm3_hash, 48))],
          ['SM9 签名', h('code', { class: 'p-mono', title: p.signature }, UI.trunc(p.signature, 48))],
          ['签发时间', p.created_at]
        ])),
        qrEl),
      h('div', { class: 'd-seal' }, '证照链\n签发'));
    PORTAL.renderQR(qrEl, JSON.stringify({
      pass_id: p.pass_id, mission_id: p.mission_id, uav_id: p.uav_id, valid_to: p.valid_to }),
      'QR 生成失败——证照号等以左侧文字为准，不虚构二维码');
    return h('div', {},
      h('div', { class: 'p-ok-line' }, '✓ 证照已签发并上链（状态以回执为准：' + (p.status || '—') + '）'),
      cert,
      cx ? h('div', {},
        h('div', { class: 'd-section' }, '四段 TxID 跨链存证（点击任一段查看全量证据）'),
        P.kv([
          ['SM9 签名身份', h('div', {},
            h('code', { class: 'p-mono' }, cx.sm9_identity || '—'),
            h('div', { class: 'd-small d-muted' }, signerNote(cx.sm9_identity)))]
        ]),
        P.cxTrail(cx))
       : h('p', { class: 'd-small d-muted' }, '本次签发未携带跨链留痕信息——可在证照台账 / 跨链台账回查。'));
  }

  CT.issue = { render: render };
})();
