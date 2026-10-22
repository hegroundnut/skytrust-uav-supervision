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
          sub: '摘要匹配 ' + fmtBool(v.digest_match) + ' · 签名有效 ' + fmtBool(v.signature_valid),
          tone: (v.digest_match && v.signature_valid) ? 'good' : 'critical' },
        { label: '授权范围', value: (d.scope || []).length + ' 项',
          sub: (d.scope || []).join('、') || '—' }
      ]),
      h('div', { class: 'd-section' }, '解密明文视图（国密解密 · 仅本次响应展示，不落库）'),
      h('div', { class: 'p-mono d-cert' }, d.decrypted_view || '（未开箱——授权范围不含 MISSION，或任务暂无密文）'),
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
      h('div', { class: 'd-section' }, '🔒 封缄视图——仅返回封缄元信息，明文内容绝不外泄'),
      P.kv([
        ['任务', h('code', { class: 'p-mono' }, s.mission_id || '—')],
        ['密文状态', P.badge(s.ciphertext_status)],
        ['有密文', fmtBool(s.has_ciphertext)],
        ['脱敏值', s.masked_value || '—'],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(s.sm3_hash, 32))]
      ]),
      h('p', { class: 'd-small d-muted' }, '「看不到」本身就是监管结论：未授权、越权或授权过期时，系统只返回封缄元信息——数据最小化，隐私保护可见可证。'));
  }

  function render(root, ctx) {
    var slotM = STORE.get('MISSION'), slotAz = STORE.get('AUTHORIZATION');
    var resultBox = h('div', {}, P.empty('填写左侧表单执行核验——开箱或封缄结果显示在这里'));

    root.append(P.pageHead({
      title: '密文核验',
      sub: 'SM9 任务密文——未授权保持封缄，经授权方可开箱：国密双重完整性核验 · 结论上链存证' }));

    var fIn = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true,
        value: slotM ? slotM.id : '', placeholder: 'MISSION-2026-…（可自动预填）' },
      { name: 'authorization_id', label: '授权号（可空）', type: 'text',
        value: slotAz ? slotAz.id : '',
        placeholder: 'AUTH-…（可自动预填）',
        hint: '留空将被以封缄态拒绝——数据最小化：未授权不见明文' },
      { name: 'regulator_id', label: '监管方（审计用）', type: 'text', value: 'REG-01' },
      { name: 'trajectory', label: '申报轨迹', type: 'select', value: '',
        options: [['', '（留空——不申报）'], ['NORMAL', 'NORMAL 正常申报'],
          ['DEVIATION', 'DEVIATION 偏航申报']],
        hint: '申报需授权范围含 ROUTE；无需申报时请保持留空' },
      { name: 'payload_type', label: '申报载荷类型（可选）', type: 'text',
        placeholder: '如 MEDICAL_KIT（与任务载荷比对）',
        hint: '申报需授权范围含 PAYLOAD；与任务载荷不符将被裁定并触发告警' }
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
        card('发起核验',
          fIn.root,
          P.actionBar([{ label: '执行核验', kind: 'primary', run: doInspect }])),
        card('核验规则说明',
          P.kv([
            ['封缄（拒绝路径）', '未授权、越权、授权过期或结论上链失败——一律只返回封缄元信息，不见明文'],
            ['开箱（授权路径)', '授权范围决定可见内容：MISSION→明文视图、ROUTE→轨迹比对、PAYLOAD→载荷比对'],
            ['核验即审计', '开箱与拒绝均写入审计留痕；开箱结论上链存证']
          ]))),
      card('核验结果', resultBox)));
  }

  RG.inspect = { render: render };
})();
