/* inspect.js — 监管当局端·密文核验（计划 B Task 12，spec §5.3）
   inspect/ciphertext 双态渲染（手写 run，非 runOp——rp 只渲染成功态，封缄补渲必须直接访问 r.data.sealed）：
   code=0 → 开箱态 openedView：authorized / scope（响应侧唯一真数组）/ decrypted_view 明文卡
   （SM9 解密临时视图，仅本次响应不落库；空=scope 无 MISSION 或无密文即未开箱）/ mission（密文字段仍不可见）/
   sealed(OPENED) / verification（digest_match+signature_valid 双验证+audit_hash）/
   conclusion（route/payload 双裁定+raised_alerts）/ chain_tx_id（结论上链）/ reg_audit_id；
   5002（未授权）/5003（scope 或目标违规）/5004（窗口外，惰性迁 EXPIRED）/2001（结论上链失败）
   → errCard + sealedCard 补渲——data 只有 {authorized:false, sealed:{封缄五键}}，明文绝不进错误信封；
   6002（mission 不存在 / trajectory 非法值）→ 仅 errCard。
   trajectory 用下拉 ""/NORMAL/DEVIATION（spec 吸收旧终审 BUG-4：消除误导 placeholder）；
   演示全程留空（Global Constraints #17：NORMAL 会撞硬编码基线必报偏航+污染驾驶舱）。
   监管端惯例：regulator_id 恒 'REG-01'。
   端点：inspect/ciphertext。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function fmtBool(b) { return b === true ? '✓' : b === false ? '✗' : '—'; }

  /* 开箱态（code=0）：授权+双验证+明文+双裁定+上链留痕 */
  function openedView(d) {
    var m = d.mission || {};
    var v = d.verification || {};
    var c = d.conclusion || {};
    var s = d.sealed || {};
    return h('div', {},
      P.statCards([
        { label: '授权核验', value: d.authorized ? '✓ 已开箱' : '✗ 未授权',
          tone: d.authorized ? 'good' : 'critical' },
        { label: '完整性双验证',
          value: (v.digest_match && v.signature_valid) ? '✓✓ 双通过' : '⚠ 验证未通过',
          sub: 'digest_match=' + fmtBool(v.digest_match) + ' · signature_valid=' + fmtBool(v.signature_valid),
          tone: (v.digest_match && v.signature_valid) ? 'good' : 'critical' },
        { label: '授权范围', value: (d.scope || []).length + ' 项',
          sub: (d.scope || []).join('、') || '—' }
      ]),
      h('div', { class: 'd-section' }, '解密明文视图 decrypted_view（SM9 解密临时视图——仅本次响应，不落库）'),
      h('div', { class: 'p-mono d-cert' }, d.decrypted_view || '（空 = scope 无 MISSION 或无密文——未开箱）'),
      P.kv([
        ['任务', h('code', { class: 'p-mono' }, m.mission_id || '—')],
        ['任务状态', P.badge(m.status)],
        ['脱敏值', m.masked_value || '—'],
        ['航段 / 区域', PORTAL.jp(m.route_segments, []).join('、') + ' / ' + PORTAL.jp(m.zones, []).join('、')],
        ['密文状态', P.badge(s.ciphertext_status)],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(s.sm3_hash, 32))],
        ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(v.audit_hash, 32))],
        ['航线裁定', P.badge(c.route_verdict)],
        ['载荷裁定', P.badge(c.payload_verdict)],
        ['触发告警', (c.raised_alerts || []).join('、') || '无'],
        ['结论上链', h('span', { class: 'd-row' }, P.chainTag('chainmaker'),
          h('code', { class: 'p-mono' }, UI.trunc(d.chain_tx_id, 28)))],
        ['核验审计号', h('code', { class: 'p-mono' }, d.reg_audit_id || '—')]
      ]));
  }

  /* 封缄态（5002/5003/5004/2001 的 data.sealed）：只可见元信息——这恰是最小授权的证明 */
  function sealedCard(s) {
    return h('div', {},
      h('div', { class: 'd-section' }, '🔒 封缄视图 sealed-only（明文绝不进错误信封）'),
      P.kv([
        ['任务', h('code', { class: 'p-mono' }, s.mission_id || '—')],
        ['密文状态', P.badge(s.ciphertext_status)],
        ['有密文', fmtBool(s.has_ciphertext)],
        ['脱敏值', s.masked_value || '—'],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(s.sm3_hash, 32))]
      ]),
      h('p', { class: 'd-small d-muted' }, '「看不到」本身就是监管结论：未授权/越权/过窗时系统只回封缄元信息——隐私保护由错误路径证明。'));
  }

  function render(root, ctx) {
    var slotM = STORE.get('MISSION'), slotAz = STORE.get('AUTHORIZATION');
    var resultBox = h('div', {}, P.empty('填写左侧表单执行核验——双态结果（开箱/封缄）显示在这里'));

    root.append(P.pageHead({
      title: '密文核验',
      sub: 'SM9 任务密文：封缄（5002/5003/5004）↔ 开箱（授权+双验证+结论上链）双态' }));

    var fIn = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true,
        value: slotM ? slotM.id : '', placeholder: 'MISSION-2026-…（MISSION 上下文 chip 自动预填）' },
      { name: 'authorization_id', label: '授权号（可空）', type: 'text',
        value: slotAz ? slotAz.id : '',
        placeholder: 'AUTH-…（AUTHORIZATION chip 自动预填）',
        hint: '留空 → 5002 封缄拒绝——这正是最小授权的演示入口' },
      { name: 'regulator_id', label: '监管方（审计用）', type: 'text', value: 'REG-01' },
      { name: 'trajectory', label: '申报轨迹', type: 'select', value: '',
        options: [['', '（留空——不申报）'], ['NORMAL', 'NORMAL 正常申报'],
          ['DEVIATION', 'DEVIATION 偏航申报']],
        hint: '严格枚举 ""|NORMAL|DEVIATION（非法值 6002）；申报需授权 scope 含 ROUTE（否则 5003）。演示全程留空——NORMAL 会撞硬编码基线必报偏航（Global Constraints #17）' },
      { name: 'payload_type', label: '申报载荷类型（可选）', type: 'text',
        placeholder: '如 MEDICAL_KIT（与任务载荷比对）',
        hint: '申报需授权 scope 含 PAYLOAD（否则 5003）；不符 → conclusion.payload_verdict=MISSION_MISMATCH + 触发告警' }
    ]);

    /* 手写 run：5002/5003/5004/2001 的 data.sealed 补渲必须直接访问错误响应 */
    async function doInspect(el) {
      var v = PORTAL.need(fIn.read(), 'mission_id');
      if (!v) return;
      var body = { mission_id: v.mission_id };
      if (v.authorization_id) body.authorization_id = v.authorization_id;
      if (v.regulator_id) body.regulator_id = v.regulator_id;
      if (v.trajectory) body.trajectory = v.trajectory;
      if (v.payload_type) body.payload_type = v.payload_type;
      el.disabled = true;
      var r = await API.call('/api/inspect/ciphertext', body);
      el.disabled = false;
      if (!resultBox.isConnected) return;
      resultBox.innerHTML = '';
      if (r.code === 0) {
        resultBox.append(openedView(r.data));
        if (r.data.mission && r.data.mission.mission_id) {
          STORE.note('MISSION', r.data.mission.mission_id);   /* §29：仅成功落 STORE */
        }
      } else if ((r.code === 5002 || r.code === 5003 || r.code === 5004 || r.code === 2001)
                 && r.data && r.data.sealed) {
        resultBox.append(P.errCard(r), sealedCard(r.data.sealed));
      } else {
        resultBox.append(P.errCard(r));   /* 6002 等：无封缄数据可补渲 */
      }
    }

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('发起核验 inspect/ciphertext',
          fIn.root,
          P.actionBar([{ label: '执行核验', kind: 'primary', run: doInspect }])),
        card('双态说明',
          P.kv([
            ['封缄（拒绝路径）', '5002 未授权 / 5003 scope·目标违规 / 5004 窗口外（惰性迁 EXPIRED）/ 2001 结论上链失败——只回封缄五键'],
            ['开箱（授权路径)', 'scope 定可见性：MISSION→明文视图、ROUTE→轨迹比对、PAYLOAD→载荷比对'],
            ['核验即审计', '开箱与拒绝都写 RegAudit（INSPECT）；开箱结论上链 ChainMaker（chain_tx_id）']
          ]))),
      card('核验结果', resultBox)));
  }

  RG.inspect = { render: render };
})();
