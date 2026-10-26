/* crypto.js — 监管当局端·密码工具箱（计划 B Task 12，spec §5.3）
   SM3 摘要 / SM9 身份派生 / 签名→验签闭环 / 篡改检测——监管取证与演示支撑工具。
   契约要点（§5）：
   sm3 {payload 对象} → {canonical 键排序规范化串, sm3_hash 64hex}——键序不同摘要相同；
   keygen {entity_id} → {sm9_identity:"SM9-ID-"+entity_id} 确定性派生；
   sign {sm9_identity,payload} → {signature base64, sm3_hash}；
   verify {sm9_identity,payload,signature} → {valid}——**code 恒 0 即使 valid=false**：
   「验签不通过」是合法业务结论；只有签名不是合法 base64 才 1002（errCard 路径）。
   篡改演示闭环：签名 → 填入验签 → valid=true → 篡改按钮（altitude_max→999）→ 再验签
   valid=false 且 code 仍 0。端点：crypto/sm3、crypto/sm9/keygen、crypto/sm9/sign、crypto/sm9/verify。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* textarea 文本 → JSON 对象（守卫：非对象/数组/解析失败 toast+null） */
  function readPayload(txt) {
    var o = PORTAL.jp(txt, null);
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      UI.toast('数据内容必须是 JSON 对象（如 {"altitude_max":120,…}）', 'err');
      return null;
    }
    return o;
  }

  var DEFAULT_PAYLOAD = '{"altitude_max":120,"mission_id":"MISSION-2026-001","operator_id":"Operator-A"}';

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '密码工具箱',
      sub: 'SM3 摘要 · SM9 身份派生 · 签名→验签闭环 · 篡改检测' }));

    /* --- SM3 摘要 --- */
    var rpSm = P.resultPanel();
    var fSm = P.form([
      { name: 'payload', label: '数据内容（JSON 对象）', type: 'textarea', required: true, rows: 4,
        value: DEFAULT_PAYLOAD,
        hint: '系统自动对数据规范化后计算 SM3 摘要——字段顺序不同，摘要相同' }
    ]);
    var smCard = card('SM3 摘要',
      fSm.root,
      P.actionBar([{ label: '计算摘要', kind: 'primary', run: P.runOp({
        path: '/api/crypto/sm3',
        body: function () {
          var v = PORTAL.need(fSm.read(), 'payload');
          if (!v) return null;
          var p = readPayload(v.payload);
          return p ? { payload: p } : null;
        },
        rp: rpSm, successText: 'SM3 摘要完成',
        render: function (d) {
          return h('div', {},
            P.kv([['SM3 摘要', h('code', { class: 'p-mono' }, d.sm3_hash)]]),
            h('div', { class: 'd-section' }, '规范化串（摘要计算的输入基准）'),
            UI.jsonBlock(d.canonical, 120));
        }
      }) }]),
      rpSm.root);

    /* --- SM9 身份派生 --- */
    var rpKg = P.resultPanel();
    var fKg = P.form([
      { name: 'entity_id', label: '实体 ID', type: 'text', required: true, value: 'UAV-A-001',
        hint: '同一实体始终派生同一 SM9 身份，稳定可复验' }
    ]);
    var kgCard = card('SM9 身份派生',
      fKg.root,
      P.actionBar([{ label: '派生身份', run: P.runOp({
        path: '/api/crypto/sm9/keygen',
        body: function () {
          var v = PORTAL.need(fKg.read(), 'entity_id');
          return v ? { entity_id: v.entity_id } : null;
        },
        rp: rpKg, successText: 'SM9 身份已派生',
        render: function (d) {
          return P.kv([['SM9 身份', h('code', { class: 'p-mono' }, d.sm9_identity)]]);
        },
        onOk: function (d) { fSg.set('sm9_identity', d.sm9_identity); }   /* fSg 后声明，var 提升，运行时已赋值 */
      }) }]),
      rpKg.root);

    /* --- SM9 签名（含篡改按钮，依赖验签表单 fVf——后声明同 var 提升模式） --- */
    var rpSg = P.resultPanel();
    var lastBody = null;      /* 最近一次签名的请求体（填入验签/篡改用） */
    var lastSigned = null;    /* {identity,payload,signature}——签名成功后解锁篡改按钮 */
    var fSg = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true,
        value: 'SM9-ID-UAV-A-001' },
      { name: 'payload', label: '数据内容（JSON 对象）', type: 'textarea', required: true, rows: 4,
        value: DEFAULT_PAYLOAD }
    ]);
    var tamperBtn = h('button', { class: 'p-btn p-btn-danger', disabled: true,
      title: '先完成一次签名' }, '篡改数据并回填验签');
    var sgCard = card('SM9 签名',
      fSg.root,
      P.actionBar([
        { label: '签名', kind: 'primary', run: P.runOp({
          path: '/api/crypto/sm9/sign',
          body: function () {
            var v = PORTAL.need(fSg.read(), 'sm9_identity', 'payload');
            if (!v) return null;
            var p = readPayload(v.payload);
            if (!p) return null;
            lastBody = { sm9_identity: v.sm9_identity, payload: p };
            return lastBody;
          },
          rp: rpSg, successText: '签名完成',
          render: function (d) {
            return P.kv([
              ['签名（base64）', h('code', { class: 'p-mono' }, UI.trunc(d.signature, 48))],
              ['SM3 摘要', h('code', { class: 'p-mono' }, d.sm3_hash)]
            ]);
          },
          onOk: function (d) {
            lastSigned = { identity: lastBody.sm9_identity, payload: lastBody.payload,
              signature: d.signature };
            tamperBtn.disabled = false;
            tamperBtn.title = '自动篡改已签名载荷并回填验签表单';
          }
        }) },
        { label: '填入验签表单 →', run: function () {
          if (!lastSigned) { UI.toast('请先完成一次签名', 'err'); return; }
          fVf.set('sm9_identity', lastSigned.identity);
          fVf.set('payload', JSON.stringify(lastSigned.payload));
          fVf.set('signature', lastSigned.signature);
          UI.toast('已填入——直接点「验签」，预期结果为通过');
        } }
      ]),
      rpSg.root);

    /* --- SM9 验签（篡改检测） --- */
    var rpVf = P.resultPanel();
    var fVf = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true,
        value: 'SM9-ID-UAV-A-001' },
      { name: 'payload', label: '数据内容（JSON 对象）', type: 'textarea', required: true, rows: 4,
        value: DEFAULT_PAYLOAD },
      { name: 'signature', label: '签名（base64）', type: 'textarea', required: true, rows: 2,
        placeholder: '从签名卡「填入验签表单」带入，或手工粘贴' }
    ]);
    tamperBtn.addEventListener('click', function () {
      if (!lastSigned) return;
      var t = JSON.parse(JSON.stringify(lastSigned.payload));
      if ('altitude_max' in t) { t.altitude_max = 999; } else { t._tampered = true; }
      fVf.set('sm9_identity', lastSigned.identity);
      fVf.set('payload', JSON.stringify(t));
      fVf.set('signature', lastSigned.signature);
      UI.toast('已篡改并回填——点「验签」：预期验签不通过，篡改只能藏、不能通过核验', 'ok', 5200);
    });
    var vfCard = card('SM9 验签',
      h('div', { class: 'p-card-sub' }, '篡改检测——数据一经改动，国密验签当即识破'),
      fVf.root,
      P.actionBar([{ label: '验签', kind: 'primary', run: P.runOp({
        path: '/api/crypto/sm9/verify',
        body: function () {
          var v = PORTAL.need(fVf.read(), 'sm9_identity', 'payload', 'signature');
          if (!v) return null;
          var p = readPayload(v.payload);
          if (!p) return null;
          return { sm9_identity: v.sm9_identity, payload: p, signature: v.signature };
        },
        rp: rpVf, successText: '验签完成',
        render: function (d) {
          return h('div', {},
            P.statCards([{ label: 'SM9 验签',
              value: d.valid ? '验签通过' : '验签不通过',
              sub: d.valid ? '签名与载荷一致' : '签名与载荷不一致（被篡改或用错身份）',
              tone: d.valid ? 'good' : 'critical' }]),
            h('p', { class: 'd-small d-muted' },
              '「验签不通过」不是系统故障，而是明确的核验结论——数据一经篡改，国密验签当即识破。'));
        }
      }) }]),
      h('div', { class: 'd-mt' }, tamperBtn),
      rpVf.root);

    root.append(h('div', { class: 'd-grid-2' }, smCard, kgCard));
    root.append(h('div', { class: 'd-grid-2' }, sgCard, vfCard));
  }

  RG.crypto = { render: render };
})();
