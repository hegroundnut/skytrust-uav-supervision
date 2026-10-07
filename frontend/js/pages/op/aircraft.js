/* aircraft.js — 运营商端·我的航空器（计划 B Task 6，spec §5.1）
   登记即上链：uav/register 成功即发登记标志 UAS-xxxxxxxx + 二维码 + 跨链四段 TxID。
   台账 / 详情抽屉 / 状态迁移 / 注销（spec §6 第 8 章 ACTIVATE 收尾戏依赖本页状态操作）。
   端点：uav/register·list·query·status·revoke、manufacturer/list、operator/list、
   crosschain/list（登记存证回查；裁决 16：无 business_id 过滤 → 拉回本地逐行匹配）。
   红线 #9：遗留行 registration_mark=NULL → 「未发放登记标志」回退文案，不渲染空 QR。
   契约档案 §9：register/status 响应 {uav,crosschain} 包裹、revoke/query 平铺——两处形状都吃；
   status 的 crosschain 可为 null（裁决 12：null 不画 cxTrail）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function markOf(u) { return u.registration_mark || '未发放登记标志'; }
  function qrPayload(u) {
    return JSON.stringify({ mark: u.registration_mark, uav_id: u.uav_id, operator_id: u.operator_id });
  }
  /* 实名身份预填：OPERATOR 槽位且 RNS- 前缀（Task 6 Produces 约定） */
  function prefillSubject() {
    var s = STORE.get('OPERATOR');
    return (s && String(s.id).indexOf('RNS-') === 0) ? s.id : '';
  }
  function verifiedBadge(st) {
    return h('span', { class: 'd-row' }, P.badge(st),
      st === 'VERIFIED' ? h('span', { class: 'd-small d-muted' }, '实名核验通过') : null);
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '我的航空器',
      sub: '登记即上链 —— 注册成功即发登记标志与二维码，跨链存证四段 TxID 全程可溯' }));
    root.append(P.tabs([
      { key: 'register', label: '航空器登记', render: tabRegister },
      { key: 'fleet', label: '航空器台账', render: tabFleet }
    ]));
  }

  function tabRegister(box) {
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'uav_id', label: '航空器 ID', type: 'text', placeholder: '留空自动生成；如 UAV-A-001' },
      { name: 'manufacturer_id', label: '生产厂商', type: 'select', required: true, options: [['', '选择厂商…']] },
      { name: 'operator_id', label: '运营企业', type: 'select', required: true, options: [['', '选择运营企业…']] },
      { name: 'model', label: '型号', type: 'text', placeholder: '如 DJI-M300（可选）' },
      { name: 'serial_no', label: '产品序列号', type: 'text', required: true, placeholder: '如 SN-A001' },
      { name: 'realname_id', label: '关联实名主体', type: 'text', value: prefillSubject(),
        placeholder: 'RNS-xxxxxxxx（可选）',
        hint: '在「实名登记」页选定当前身份后自动预填；填写但主体不存在 → 7001 拒绝' }
    ]);
    loadMasterData(f);
    box.append(card('航空器登记 uav/register（注册即核验 · 登记即上链）', f.root,
      P.actionBar([{ label: '提交登记', kind: 'primary', run: P.runOp({
        path: '/api/uav/register',
        body: function () { return PORTAL.need(f.read(), 'manufacturer_id', 'operator_id', 'serial_no'); },
        rp: rp, successText: '航空器登记成功，跨链存证已上链',
        render: function (d) { return regCert(d); },
        note: { kind: 'UAV', id: function (d) { return d.uav.uav_id; },
          extra: function (d) { return { operator_id: d.uav.operator_id }; } },
        onOk: function (d) {
          STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
        }
      }) }]),
      rp.root));
  }

  /* 主数据下拉：厂商/运营商台账一次拉全（page_size 200 上限，种子仅 3+3 条） */
  async function loadMasterData(f) {
    var mf = await API.call('/api/manufacturer/list', { page: 1, page_size: 200 });
    if (mf.ok) f.setOptions('manufacturer_id', [['', '选择厂商…']].concat(
      (mf.data.records || []).map(function (m) { return [m.manufacturer_id, m.name + '（' + m.manufacturer_id + '）']; })));
    var op = await API.call('/api/operator/list', { page: 1, page_size: 200 });
    if (op.ok) f.setOptions('operator_id', [['', '选择运营企业…']].concat(
      (op.data.records || []).map(function (o) { return [o.operator_id, o.name + '（' + o.operator_id + '）']; })));
  }

  /* 登记证书卡：政务凭证样式 + QR + 「登记即上链」印章 + 跨链四段 TxID */
  function regCert(d) {
    var u = d.uav, x = d.crosschain;
    var qrEl = h('div', { class: 'd-qr' });
    var cert = h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '民用无人驾驶航空器登记证明'),
        h('span', { class: 'd-cert-no' }, markOf(u))),
      h('div', { class: 'd-cert-body' },
        h('div', { class: 'd-cert-main' }, P.kv([
          ['航空器 ID', h('code', { class: 'p-mono' }, u.uav_id)],
          ['登记标志', h('b', { class: 'd-num' }, markOf(u))],
          ['状态', verifiedBadge(u.status)],
          ['厂商 / 企业', (u.manufacturer_id || '—') + ' / ' + (u.operator_id || '—')],
          ['型号 / 序列号', (u.model || '—') + ' / ' + (u.serial_no || '—')],
          ['实名主体', u.realname_id || '未关联'],
          ['SM9 身份', h('code', { class: 'p-mono' }, u.sm9_identity || '—')],
          ['登记时间', u.created_at]
        ])),
        qrEl),
      h('div', { class: 'd-seal' }, '登记即上链'));
    if (u.registration_mark) {
      PORTAL.renderQR(qrEl, qrPayload(u));       /* 失败自动变 .d-qr-none 兜底（Task 5 契约） */
    } else {
      qrEl.className = 'd-qr d-qr-none';
      qrEl.textContent = '未发放登记标志（遗留数据），二维码不生成';
    }
    return h('div', {}, cert,
      x ? h('div', { class: 'd-mt' },
          h('div', { class: 'd-section' }, '跨链存证 · 四段 TxID（运营链 fabric → 监管链 chainmaker 签收/中继 → 存证）'),
          P.cxTrail(x))
        : null);
  }

  function tabFleet(box) {
    var tbl = P.dataTable({
      endpoint: '/api/uav/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['REGISTERED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] },
        { name: 'operator_id', label: '运营企业 ID', type: 'text' }
      ],
      columns: [
        { title: '航空器 ID', key: 'uav_id', mono: true },
        { title: '登记标志', render: function (r) { return h('code', { class: 'p-mono' }, markOf(r)); } },
        { title: '型号', render: function (r) { return r.model || '—'; } },
        { title: '运营企业', key: 'operator_id' },
        { title: '实名主体', render: function (r) { return r.realname_id || '未关联'; } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '登记时间', key: 'created_at' }
      ],
      onRow: function (r) { openUav(r.uav_id, tbl); },
      emptyText: '暂无航空器 —— 先在「航空器登记」页办理登记'
    });
    box.append(tbl);
  }

  async function openUav(uavId, tbl) {
    var d = P.drawer('航空器 ' + uavId, h('div', { class: 'p-empty' }, '⏳ uav/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/uav/query', { uav_id: uavId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 1001 不存在 → EXPLAIN 解说 */
    var u = r.data;
    STORE.note('UAV', u.uav_id, { operator_id: u.operator_id });   /* 旧页惯例（§29） */
    var qrEl = h('div', { class: 'd-qr' });
    if (u.registration_mark) PORTAL.renderQR(qrEl, qrPayload(u));
    else { qrEl.className = 'd-qr d-qr-none'; qrEl.textContent = '未发放登记标志（遗留数据）'; }
    body.append(
      h('div', { class: 'd-row d-row-top d-mb' }, qrEl,
        h('div', { style: { flex: '1', 'min-width': '0' } }, P.kv([
          ['登记标志', h('b', { class: 'd-num' }, markOf(u))],
          ['状态', verifiedBadge(u.status)],
          ['厂商', u.manufacturer_id || '—'],
          ['运营企业', u.operator_id || '—'],
          ['型号 / 序列号', (u.model || '—') + ' / ' + (u.serial_no || '—')],
          ['实名主体', u.realname_id || '未关联'],
          ['SM9 身份', h('code', { class: 'p-mono' }, u.sm9_identity || '—')],
          ['创建 / 更新', u.created_at + ' → ' + u.updated_at]
        ]))),
      statePanel(u, tbl),
      cxPanel(u));
  }

  /* 状态迁移 + 注销（1004 非法迁移——VERIFY 仅允许 REGISTERED 起点，重复核验已核验机同为 1004——为设计内，errCard 中性展示） */
  function statePanel(u, tbl) {
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'action', label: '状态动作', type: 'select', required: true, value: 'ACTIVATE',
        options: [['VERIFY', 'VERIFY 核验'], ['ACTIVATE', 'ACTIVATE 激活'],
                  ['SUSPEND', 'SUSPEND 暂停'], ['RESUME', 'RESUME 恢复']] }
    ]);
    return h('div', {},
      h('div', { class: 'd-section' }, '状态迁移与注销'),
      h('p', { class: 'd-small d-muted' }, '提示：重复 VERIFY 已核验机 → 1004 非法迁移（VERIFY 仅允许 REGISTERED 起点——注册即核验已替你走完那一步）；非法迁移/不可注销状态 → 1004 —— 均为状态机设计内行为。'),
      f.root,
      P.actionBar([
        { label: '执行状态动作', kind: 'primary', run: P.runOp({
            path: '/api/uav/status',
            body: function () { return Object.assign({ uav_id: u.uav_id }, f.read()); },
            rp: rp, successText: '状态迁移成功',
            render: function (d) {
              return h('div', {},
                P.kv([['航空器', d.uav.uav_id], ['新状态', P.badge(d.uav.status)]]),
                d.crosschain ? P.cxTrail(d.crosschain) : null);   /* 可为 null（裁决 12） */
            },
            note: { kind: 'UAV', id: function (d) { return d.uav.uav_id; } },
            onOk: function () { if (tbl) tbl.reload(); }
          }) },
        { label: '注销航空器', kind: 'danger',
          confirm: { title: '确认注销', msg: '注销 ' + u.uav_id + ' 后状态变为 REVOKED，不可再用于任务申请。', ok: '确认注销' },
          run: P.runOp({
            path: '/api/uav/revoke',
            body: function () { return { uav_id: u.uav_id, reason: '运营方主动注销', operator: 'Operator Portal' }; },
            rp: rp, successText: '航空器已注销',
            render: function (d) { return P.kv([['航空器', d.uav_id], ['状态', P.badge(d.status)]]); },  /* revoke 平铺（§9） */
            note: { kind: 'UAV', id: function (d) { return d.uav_id; } },
            onOk: function () { if (tbl) tbl.reload(); }
          }) }
      ]),
      rp.root);
  }

  /* 登记跨链存证回查：crosschain/list 无 business_id 过滤（裁决 16）→ 拉回本地逐行匹配；
     段点击 → P.openCxDetail（内部走 crosschain/query，覆盖 spec §5.1 端点列） */
  function cxPanel(u) {
    var box = h('div', { class: 'p-empty' }, '⏳ 登记跨链存证查询中…');
    (async function () {
      var r = await API.call('/api/crosschain/list', { message_type: 'UAV_REGISTER_PROOF', page: 1, page_size: 200 });
      if (!box.isConnected) return;
      box.innerHTML = '';
      if (!r.ok) { box.append(P.errCard(r)); return; }
      var hit = (r.data.records || []).filter(function (x) { return x.business_id === u.uav_id; })[0];
      if (!hit) { box.append(P.empty('未找到该航空器的登记存证（可能为跨链域上线前的遗留数据）')); return; }
      box.append(P.cxTrail(hit));
    })();
    return h('div', {}, h('div', { class: 'd-section' }, '登记跨链存证（fabric → chainmaker）'), box);
  }

  OP.aircraft = { render: render };
})();
