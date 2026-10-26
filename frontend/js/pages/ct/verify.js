/* verify.js — 证照中心·证照查验（Task 7）
   冻结契约（dispatch 裁决）：pass/verify envelope 恒 code=0——有效性 = data.valid +
   data.reasons 数据判定（valid = reasons 为空，服务端 pass.go 语义），「无效原因」永远
   不是错误码（3002=PassInvalid 属签发重复/吊销路径）；红灯是数据渲染（证面红卡 +
   reasons 中文列表），仅 pass_id 不存在 → 6002 走 errCard+EXPLAIN。
   结果卡：有效/无效 + reasons + 时间窗（pass/query 补全）+ SM9 签名身份（FLIGHT_PASS
   跨链留痕 sm9_identity——FlightPass 无身份字段，无留痕不展示不猜测）+ 双身份过渡小字
   「2026-10-13 迁移前证照由管理链身份签发，验证兼容」。
   链上证据区 = 关联 crosschain/query 四段时间线（主留痕 = 最新 SUCCESS FLIGHT_PASS；
   其余留痕含重试/失败如实列出；REVOKED 附 PASS_REVOKE，FAILED 待补发记录如实展示）。
   business_id 为最近 200 条窗口内客户端匹配（服务端仅支持 status/message_type 过滤），
   窗口如实标注（Review Focus 5），不外推。
   端点：pass/verify、pass/query、crosschain/list、crosschain/query。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var CT = window.CT_PAGES = window.CT_PAGES || {};
  const TRANSITION_NOTE = '2026-10-13 迁移前证照由管理链身份签发，验证兼容';
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* SM9 签名身份注记（双身份过渡 Task 3）：已知身份给友好标签，未登记身份只展示原值——绝不猜测 */
  function signerNote(sm9id) {
    if (sm9id === 'SM9-ID-REGISTRY-ADMIN') return 'REGISTRY-ADMIN · 证照链证照中心（现行签发身份）';
    if (sm9id === 'SM9-ID-FISCO-ADMIN') return 'FISCO-ADMIN · 管理链（2026-10-13 迁移前历史签发身份）';
    return '未登记身份（原值展示）';
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '证照查验',
      sub: '一键核验证照真伪 · 国密验签 · 查验结论与链上证据实时呈现'
    }));
    var pre = (ctx && ctx.query && ctx.query.get('pass_id')) || '';
    if (!pre) { var slot = STORE.get('PASS'); if (slot && slot.id) pre = slot.id; }
    var f = P.form([
      { name: 'pass_id', label: '证照号', type: 'text', value: pre,
        placeholder: '如 PASS-2026-001',
        hint: '输入证照号，即时核验证照真伪与有效性' }
    ]);
    var rp = P.resultPanel();
    rp.root.append(P.empty('尚未查验 —— 输入证照号点「查验」，查验结果与链上证据显示在此'));
    root.append(card('证照查验', f.root,
      P.actionBar([{ label: '查验', kind: 'primary', run: async function () {
        var v = PORTAL.need(f.read(), 'pass_id');
        if (v) await doVerify(String(v.pass_id).trim(), rp);
      } }])));
    root.append(card('查验结果',
      h('div', { class: 'p-card-sub' }, '查验结论、签名身份与链上证据'), rp.root));
  }

  async function doVerify(passId, rp) {
    var v = await API.call('/api/pass/verify', { pass_id: passId });
    if (!rp.root.isConnected) return;                    /* 用户已离开本页 */
    var slots = {};
    rp.show(v, function (d) {
      var win = h('div', {}, h('div', { class: 'p-empty' }, '有效时间窗读取中…'));
      var ev = h('div', {}, h('div', { class: 'p-empty' }, '链上证据检索中…'));
      slots.win = win; slots.ev = ev;
      return h('div', {}, verdictCard(d), win,
        h('p', { class: 'd-small d-muted' }, '签名身份说明：', TRANSITION_NOTE,
          '，存量证照不失效。'),
        h('div', { class: 'd-section' }, '链上证据区 · 四段存证时间线（已吊销证照自动附加吊销存证）'),
        ev);
    });
    if (!v.ok) return;                                   /* 6002：errCard + EXPLAIN 已渲染，不追加证据区 */
    STORE.note('PASS', v.data.pass_id || passId);
    fillWindow(slots.win, passId);                       /* 两路异步填充，各自 isConnected 守卫 */
    fillEvidence(slots.ev, v.data);
  }

  /* ---------- 结果卡：绿/红证面（valid=false 是数据渲染，绝不当错误卡） ---------- */
  function verdictCard(d) {
    if (d.valid) {
      return h('div', { class: 'd-cert' },
        h('div', { class: 'd-cert-head' },
          h('span', { class: 'd-cert-title', style: { color: 'var(--d-good)' } },
            h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('use', { href: '#d-ico-check' })),
            ' 查验通过 · 证照有效'),
          h('span', { class: 'd-cert-no' }, d.pass_id || '—')),
        h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' }, P.kv([
          ['证照状态', P.badge(d.status)],
          ['判定', '查验通过（时间窗有效 · 证照信息完整 · 国密验签通过）'],
          ['不通过原因', '（无）']
        ]))),
        h('div', { class: 'd-seal' }, '证照\n有效'));
    }
    var rs = d.reasons || [];
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title', style: { color: 'var(--d-critical)' } },
          h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('use', { href: '#d-ico-x' })),
          ' 查验未通过 · 证照无效'),
        h('span', { class: 'd-cert-no' }, d.pass_id || '—')),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([
          ['证照状态', P.badge(d.status)],
          ['判定', '查验未通过'],
          ['不通过原因', rs.length ? h('ul', { class: 'd-mt' }, rs.map(function (t) {
            return h('li', { style: { color: 'var(--d-critical)' } }, t); }))
          : h('span', { class: 'd-small d-muted' }, '未提供具体原因（如实展示）')]
        ]))));
  }

  /* ---------- 时间窗补全（pass/query 权威字段） ---------- */
  async function fillWindow(slot, passId) {
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!slot.isConnected) return;
    slot.innerHTML = '';
    if (!r.ok) { slot.append(P.errCard(r)); return; }
    var p = r.data;
    slot.append(P.kv([
      ['有效时间窗', p.valid_from + ' → ' + p.valid_to],
      ['任务 / 航空器', h('span', {}, h('code', { class: 'p-mono' }, p.mission_id),
        ' / ', h('code', { class: 'p-mono' }, p.uav_id || '—'))],
      ['许可航线', PORTAL.jp(p.route, []).join(' → ') || '—'],
      ['SM3 摘要', h('code', { class: 'p-mono', title: p.sm3_hash }, UI.trunc(p.sm3_hash, 48))]
    ]));
  }

  /* ---------- 链上证据区：FLIGHT_PASS 主留痕经 crosschain/query 权威回查 ---------- */
  async function fillEvidence(slot, vd) {
    var passId = vd.pass_id;
    var r = await API.call('/api/crosschain/list', { message_type: 'FLIGHT_PASS', page: 1, page_size: 200 });
    if (!slot.isConnected) return;
    slot.innerHTML = '';
    if (!r.ok) { slot.append(P.errCard(r)); return; }
    var recs = (r.data.records || []).filter(function (x) { return x.business_id === passId; });
    slot.append(windowNote(r, recs.length, 'FLIGHT_PASS'));
    if (!recs.length) {
      slot.append(P.empty('未找到签发跨链存证 —— SM9 签名身份与四段时间线无法链上溯源；可在跨链台账 / 链上浏览器补查'));
      if (vd.status === 'REVOKED') appendRevoke(slot, passId);
      return;
    }
    var primary = recs.filter(function (x) { return x.status === 'SUCCESS'; })[0] || recs[0];
    slot.append(P.kv([
      ['SM9 签名身份', h('div', {},
        h('code', { class: 'p-mono' }, primary.sm9_identity || '—'),
        h('div', { class: 'd-small d-muted' }, signerNote(primary.sm9_identity)))]
    ]));
    STORE.note('CROSS_TX', primary.cross_tx_id, { business_id: passId });
    var q = await API.call('/api/crosschain/query', { cross_tx_id: primary.cross_tx_id });
    if (!slot.isConnected) return;
    if (!q.ok) slot.append(P.errCard(q));
    else slot.append(
      h('div', { class: 'd-small d-muted d-mt' }, '主留痕 · ', UI.fmtDT(primary.created_at, true),
        primary.retry_of ? ' · 重试自 ' + primary.retry_of : ''),
      P.cxTrail(q.data));
    var others = recs.filter(function (x) { return x.cross_tx_id !== primary.cross_tx_id; });
    if (others.length) {
      slot.append(h('div', { class: 'd-small d-muted d-mt' },
        '其余留痕 ' + others.length + ' 条（重试 / 失败记录如实列出，点击「证据」看全量）：'));
      others.forEach(function (x) {
        slot.append(h('div', { class: 'd-row d-mt' },
          h('code', { class: 'p-mono' }, UI.trunc(x.cross_tx_id, 34)), P.badge(x.status),
          h('span', { class: 'd-small d-muted' }, UI.fmtDT(x.created_at)),
          h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function () { P.openCxDetail(x.cross_tx_id); } }, '证据')));
      });
    }
    if (vd.status === 'REVOKED') appendRevoke(slot, passId);
  }

  /* ---------- REVOKED 附加：PASS_REVOKE 吊销留痕（FAILED 待补发如实展示） ---------- */
  async function appendRevoke(slot, passId) {
    var box = h('div', {}, h('div', { class: 'p-empty' }, '吊销存证查询中…'));
    slot.append(h('div', { class: 'd-section' }, '吊销链上存证（失败或待补发记录如实展示）'), box);
    var r = await API.call('/api/crosschain/list', { message_type: 'PASS_REVOKE', page: 1, page_size: 200 });
    if (!box.isConnected) return;
    box.innerHTML = '';
    if (!r.ok) { box.append(P.errCard(r)); return; }
    var recs = (r.data.records || []).filter(function (x) { return x.business_id === passId; });
    box.append(windowNote(r, recs.length, 'PASS_REVOKE'));
    if (!recs.length) {
      box.append(P.empty('未找到吊销链上存证 —— 可在跨链台账补查'));
      return;
    }
    var primary = recs.filter(function (x) { return x.status === 'SUCCESS'; })[0] || recs[0];
    var q = await API.call('/api/crosschain/query', { cross_tx_id: primary.cross_tx_id });
    if (!box.isConnected) return;
    if (!q.ok) box.append(P.errCard(q));
    else box.append(h('div', { class: 'd-small d-muted' }, '主留痕 · ', UI.fmtDT(primary.created_at, true)),
      P.cxTrail(q.data));
    if (primary.status === 'FAILED') {
      box.append(h('div', { class: 'd-small',
        style: { marginTop: '8px', padding: '10px 12px', background: 'var(--d-warning-soft)',
          border: '1px dashed var(--d-warning)', borderRadius: '6px', color: 'var(--d-warning)' } },
        h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('use', { href: '#d-ico-triangle-alert' })),
        ' 链上吊销未达（待补发）—— 本地状态已是「已吊销」（吊销即时生效）；到「证照吊销」页可一键补发链上吊销，补发全程审计留痕，不重复变更状态。'));
    }
    var others = recs.filter(function (x) { return x.cross_tx_id !== primary.cross_tx_id; });
    others.forEach(function (x) {
      box.append(h('div', { class: 'd-row d-mt' },
        h('code', { class: 'p-mono' }, UI.trunc(x.cross_tx_id, 34)), P.badge(x.status),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: function () { P.openCxDetail(x.cross_tx_id); } }, '证据')));
    });
  }

  function windowNote(r, hit, msgType) {
    return h('p', { class: 'd-small d-muted' },
      '检索窗口：最近 ' + ((r.data && r.data.records) || []).length +
      ' 条存证记录（台账总量 ' + ((r.data && r.data.total) || 0) + ' 条）→ 命中 ' + hit + ' 条。');
  }

  CT.verify = { render: render };
})();
