/* authz.js — 监管当局端·授权中心（计划 B Task 12，spec §5.3）
   authorize/apply：scope 请求侧真数组 min=1（5 枚举 MISSION|ROUTE|PAYLOAD|IDENTITY|EVIDENCE，
   重复元素→6002）；authorization_id 省略自动生成；有效窗按 Global Constraints #17
   相对时间预填（now−1h → now+4h，不写死钟点；服务端缺省 now→+24h）。
   authorize/review：APPROVE 上链 ChainMaker（chain_tx_id 留痕）；DENY 本地记录不上链；
   复审已裁决授权→6002；APPROVE 上链失败→2001 停留 PENDING 可同单重试（幂等）。
   授权生命周期：PENDING → AUTHORIZED | DENIED | EXPIRED（惰性迁移：核验窗口外触发 5004）。
   监管端惯例：regulator_id 恒 'REG-01'、reviewer_id 恒 'REG-ADMIN'（Task 11 Produces）。
   端点：authorize/apply、authorize/review。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var SCOPES = ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY', 'EVIDENCE'];

  /* Authorization.scope 响应侧是 JSON 字符串（§3）——解析回数组展示 */
  function scopeArr(s) {
    var a = PORTAL.jp(s, null);
    return Array.isArray(a) ? a : [];
  }
  function authKv(a) {
    return P.kv([
      ['授权号', h('code', { class: 'p-mono' }, a.authorization_id)],
      ['状态', P.badge(a.status)],
      ['监管方', a.regulator_id],
      ['目标', a.target_type + ' · ' + h('code', { class: 'p-mono' }, a.target_id)],
      ['授权范围', scopeArr(a.scope).join('、') || '—'],
      ['理由', a.reason || '—'],
      ['有效窗', a.valid_from + ' → ' + a.valid_to],
      ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(a.audit_hash, 32))],
      ['创建 / 更新', a.created_at + ' / ' + a.updated_at]
    ]);
  }

  function render(root, ctx) {
    var slotM = STORE.get('MISSION'), slotAz = STORE.get('AUTHORIZATION');
    root.append(P.pageHead({
      title: '授权中心',
      sub: '监管授权申请 → 审批上链（APPROVE 上 ChainMaker 存证 / DENY 本地不上链）→ 持授权号到「密文核验」开箱' }));

    /* --- 授权申请 --- */
    var rpAp = P.resultPanel();
    var fAp = P.form([
      { name: 'regulator_id', label: '监管方', type: 'text', required: true, value: 'REG-01' },
      { name: 'scope', label: '授权范围（多选，至少 1 项）', type: 'multi', required: true,
        options: SCOPES, value: ['ROUTE', 'PAYLOAD'],
        hint: '重复元素→6002；核验开箱需含 MISSION（明文视图）、申报轨迹需 ROUTE、申报载荷需 PAYLOAD' },
      { name: 'target_type', label: '目标类型', type: 'select', required: true, value: 'MISSION',
        options: ['MISSION', 'UAV', 'ALERT'] },
      { name: 'target_id', label: '目标单号', type: 'text', required: true,
        value: slotM ? slotM.id : '', placeholder: 'MISSION-2026-…（MISSION 上下文 chip 自动预填）' },
      { name: 'authorization_id', label: '授权号（可选）', type: 'text',
        placeholder: '留空自动生成 AUTH-…' },
      { name: 'reason', label: '申请理由', type: 'textarea', rows: 2,
        placeholder: '如：核查告警 ALERT-2026-001 涉及的医疗运输任务',
        hint: 'ALERT 目标可省；建议始终填写（进审计）' },
      { name: 'valid_from', label: '生效时间', type: 'text', value: UI.datetimeLocal(-60),
        hint: '相对时间惯例：当前−1 小时（Global Constraints #17）' },
      { name: 'valid_to', label: '失效时间', type: 'text', value: UI.datetimeLocal(240),
        hint: '当前+4 小时；窗口外核验 → 5004（惰性迁 EXPIRED）' }
    ]);
    var fRv = null;   /* 审批表单前向声明（申请成功回调预填） */
    var applyCard = card('授权申请 authorize/apply',
      fAp.root,
      P.actionBar([{ label: '提交授权申请', kind: 'primary', run: P.runOp({
        path: '/api/authorize/apply',
        body: function () {
          var v = PORTAL.need(fAp.read(), 'regulator_id', 'scope', 'target_type', 'target_id');
          if (!v) return null;
          var body = { regulator_id: v.regulator_id, scope: v.scope,
            target_type: v.target_type, target_id: v.target_id };
          ['authorization_id', 'reason', 'valid_from', 'valid_to'].forEach(function (k) {
            if (v[k]) body[k] = v[k];
          });
          return body;
        },
        rp: rpAp, successText: '授权申请已提交（status=PENDING，audit_hash 预生成）',
        render: function (d) { return authKv(d); },
        note: { kind: 'AUTHORIZATION', id: function (d) { return d.authorization_id; },
          extra: function (d) { return { target_id: d.target_id }; } },
        onOk: function (d) { if (fRv) fRv.set('authorization_id', d.authorization_id); }
      }) }]),
      rpAp.root);

    /* --- 授权审批（APPROVE 上链 / DENY 不上链） --- */
    var rpRv = P.resultPanel();
    fRv = P.form([
      { name: 'authorization_id', label: '授权号', type: 'text', required: true,
        value: slotAz ? slotAz.id : '', placeholder: 'AUTH-…（申请成功后自动预填）' },
      { name: 'decision', label: '裁决', type: 'select', required: true, value: 'APPROVE',
        options: ['APPROVE', 'DENY'] },
      { name: 'reviewer_id', label: '审批人', type: 'text', required: true, value: 'REG-ADMIN' },
      { name: 'comment', label: '批注', type: 'textarea', rows: 2, placeholder: '如：情况属实，同意开箱核验' }
    ]);
    var reviewCard = card('授权审批 authorize/review（复审已裁决授权 → 6002；上链失败 → 2001 停留 PENDING 可同单重试）',
      fRv.root,
      P.actionBar([{ label: '裁决', kind: 'primary',
        confirm: { title: '授权审批',
          msg: 'APPROVE 将上链存证（ChainMaker），不可撤销；DENY 仅本地记录不上链。',
          ok: '确认裁决' },
        run: P.runOp({
          path: '/api/authorize/review',
          body: function () {
            var v = PORTAL.need(fRv.read(), 'authorization_id', 'decision', 'reviewer_id');
            if (!v) return null;
            var body = { authorization_id: v.authorization_id, decision: v.decision,
              reviewer_id: v.reviewer_id };
            if (v.comment) body.comment = v.comment;
            return body;
          },
          rp: rpRv, successText: '裁决完成',
          render: function (d) {
            var denied = d.auth.status === 'DENIED';
            return h('div', {},
              P.statCards([{ label: '裁决结果',
                value: denied ? '✕ DENIED（不上链）' : '✓ AUTHORIZED（已上链）',
                tone: denied ? 'critical' : 'good' }]),
              authKv(d.auth),
              h('div', { class: 'd-section' }, '审计留痕（RegAudit）'),
              P.kv([
                ['审计号', h('code', { class: 'p-mono' }, d.audit.audit_id)],
                ['动作', P.badge(d.audit.action)],
                ['审批人', d.audit.operator_id],
                ['目标（target 单键）', h('code', { class: 'p-mono' }, d.audit.target || '—')],
                ['裁决原文', h('code', { class: 'p-mono' }, UI.trunc(String(d.audit.result || '—'), 60))],
                ['链上存证', d.chain_tx_id
                  ? h('span', { class: 'd-row' }, P.chainTag('chainmaker'),
                      h('code', { class: 'p-mono' }, UI.trunc(d.chain_tx_id, 30)))
                  : '—（DENY 不上链，本地留痕）']
              ]));
          },
          note: { kind: 'AUTHORIZATION', id: function (d) { return d.auth.authorization_id; } }
        }) }]),
      rpRv.root);

    root.append(h('div', { class: 'd-grid-2' }, applyCard, reviewCard));
    root.append(card('授权生命周期',
      P.kv([
        ['PENDING', '已申请待裁决（audit_hash 已预生成）'],
        ['AUTHORIZED', 'APPROVE 裁决 + ChainMaker 上链存证（chain_tx_id 留痕）'],
        ['DENIED', 'DENY 裁决——本地记录，不上链（chain_tx_id 为空）'],
        ['EXPIRED', 'valid_to 已过——惰性迁移：下次核验触发 5004 时才落状态']
      ]),
      h('p', { class: 'd-small d-muted' }, '拿到 AUTHORIZED 授权号后，到「密文核验」页填 mission_id + authorization_id 开箱；授权范围决定能看到什么：无 MISSION → decrypted_view 为空（未开箱），申报轨迹/载荷需 ROUTE/PAYLOAD 在范围内（否则 5003）。')));
  }

  RG.authz = { render: render };
})();
