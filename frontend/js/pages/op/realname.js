/* realname.js — 运营商端·实名登记与操控员执照（计划 B Task 6，spec §5.1 + §6 第 1 章）
   三页签：主体登记（模拟证件号，红线 #10）+ 操控员执照 + 登记台账。
   操控员执照——pilot/apply 即申即发（ISSUED + SM9 局方签名，expires_at=签发+2 年）；
   spec §6 第 1 章「执照申请」属运营商端（Task 10 管理端 registry 只读、不做登记动作）。
   身份 = STORE OPERATOR 槽位且 id 以 RNS- 开头（轻量「登录」叙事、无密码、非认证体系，spec §8）；
   选定后 aircraft/flight 等页按前缀判据预填。端点：realname/register·list·query、
   pilot/apply·list·query（契约档案 §8：register/apply 响应有 {subject}/{license} 包裹、
   query/list 平铺——不对称是后端事实，前端两处形状都要吃；category 是中文枚举
   多旋翼|固定翼|垂直起降；7002=执照不存在或已失效。pilot 域无 STORE 落点：
   13 kinds 无 LICENSE，flight 页关联执照走 pilot/list 下拉——Task 7 已有）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var idbarEl = null;   /* 当前身份条容器：登记/选择后局部重绘 */

  function isSubjectSlot(s) { return !!s && String(s.id).indexOf('RNS-') === 0; }

  function drawIdbar() {
    if (!idbarEl || !idbarEl.isConnected) return;
    var s = STORE.get('OPERATOR');
    idbarEl.innerHTML = '';
    if (isSubjectSlot(s)) {
      var name = (s.extra && s.extra.name) || s.id;
      var kind = (s.extra && s.extra.subject_type === 'ENTERPRISE') ? '🏢 企业' : '👤 个人';
      idbarEl.append(
        h('span', { class: 'd-idbar-label' }, '当前身份'),
        h('span', { class: 'd-idchip' }, kind + ' · ' + name + ' · ' + s.id),
        h('span', { class: 'd-small d-muted' }, '（登记/选择即替换；清空请用顶栏 chip 条「✕ 清空」）'));
    } else {
      idbarEl.append(
        h('span', { class: 'd-idbar-label' }, '当前身份'),
        h('span', { class: 'd-small d-muted' }, '未选定实名主体 —— 在下方登记新主体，或在台账中点「选为当前身份」'));
    }
  }

  function render(root, ctx) {
    idbarEl = h('div', { class: 'd-idbar' });
    root.append(P.pageHead({
      title: '实名登记',
      sub: '实名主体登记 · 操控员执照即申即发 · 演示环境仅收取模拟证件号，不采集任何真实证件信息' }));
    root.append(idbarEl);
    drawIdbar();
    root.append(P.tabs([
      { key: 'register', label: '主体登记', render: tabRegister },
      { key: 'pilot', label: '操控员执照', render: tabPilot },
      { key: 'list', label: '登记台账', render: tabList }
    ]));
    var sid = ctx.query.get('subject_id');       /* 深链 #/realname?subject_id=RNS-xxx */
    if (sid) openSubject(sid, null);
  }

  function tabRegister(box) {
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'subject_type', label: '主体类型', type: 'select', required: true, value: 'ENTERPRISE',
        options: [['ENTERPRISE', '企业'], ['INDIVIDUAL', '个人']] },
      { name: 'name', label: '主体名称', type: 'text', required: true,
        placeholder: '如：武汉应急医疗运输有限公司（演示）' },
      { name: 'id_number', label: '证件号码（模拟）', type: 'text', required: true,
        placeholder: '企业 91420100DEMO001X / 个人 420100199001010011',
        hint: '红线：仅收取演示用模拟证件号（格式示意统一社会信用代码/身份证号），系统不采集、不存储任何真实证件信息' },
      { name: 'contact', label: '联系方式', type: 'text', placeholder: '如 027-88880001（可选）' }
    ]);
    box.append(card('主体登记 realname/register', f.root,
      P.actionBar([{ label: '提交登记', kind: 'primary', run: P.runOp({
        path: '/api/realname/register',
        body: function () { return PORTAL.need(f.read(), 'subject_type', 'name', 'id_number'); },
        rp: rp, successText: '实名主体登记成功',
        render: function (d) { return subjectCert(d.subject); },   /* {subject:{…}} 包裹（§8） */
        note: { kind: 'OPERATOR', id: function (d) { return d.subject.subject_id; },
          extra: function (d) { return { name: d.subject.name, subject_type: d.subject.subject_type }; } },
        onOk: function () { drawIdbar(); UI.toast('已设为当前身份，全端预填'); }
      }) }]),
      rp.root));
  }

  /* 登记回执卡（d-cert 政务凭证样式；本页无 QR——二维码是航空器登记标志专属） */
  function subjectCert(s) {
    if (!s) return null;
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '无人驾驶航空器实名登记回执'),
        h('span', { class: 'd-cert-no' }, s.subject_id)),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([
          ['主体名称', s.name],
          ['主体类型', s.subject_type === 'ENTERPRISE' ? '企业' : '个人'],
          ['证件号码（模拟）', h('code', { class: 'p-mono' }, s.id_number)],
          ['联系方式', s.contact || '—'],
          ['状态', P.badge(s.status)],
          ['登记时间', s.created_at]
        ]))));
  }

  /* ============ 页签 2：操控员执照（pilot/apply 即申即发，spec §6 第 1 章） ============ */
  function tabPilot(box) {
    var tbl = null;   /* 申领成功后 reload 台账（runOp 点击时才解引用，前向声明安全） */
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'name', label: '姓名', type: 'text', required: true,
        placeholder: '如：医疗运输操控员（演示）' },
      { name: 'id_number', label: '证件号码（模拟）', type: 'text', required: true,
        placeholder: '如 420100199203054321',
        hint: '红线：仅收取演示用模拟证件号，系统不采集、不存储任何真实证件信息' },
      { name: 'category', label: '航空器类别', type: 'select', required: true, value: '垂直起降',
        options: ['多旋翼', '固定翼', '垂直起降'] }
    ]);
    box.append(card('执照申领 pilot/apply（即申即发 · SM9 局方签名）', f.root,
      P.actionBar([{ label: '提交执照申领', kind: 'primary', run: P.runOp({
        path: '/api/pilot/apply',
        body: function () { return PORTAL.need(f.read(), 'name', 'id_number', 'category'); },
        rp: rp, successText: '执照已即申即发（ISSUED · 失效时间=签发+2 年）',
        render: function (d) { return licenseCert(d.license); },   /* {license} 包裹（§8） */
        onOk: function () { if (tbl) tbl.reload(); }               /* pilot 域无 STORE 落点 */
      }) }]),
      rp.root,
      h('p', { class: 'd-small d-muted' }, '「飞行活动申请」页建任务时可关联本执照（pilot_license_id）；管理当局「登记与资质」页可对本执照做 SM9 验签（签发身份 SM9-ID-FISCO-ADMIN）。')));
    tbl = P.dataTable({
      endpoint: '/api/pilot/list', pageSize: 5,
      filters: [{ name: 'category', label: '类别', type: 'select',
        options: ['多旋翼', '固定翼', '垂直起降'] }],
      columns: [
        { title: '执照 ID', render: function (r) { return UI.trunc(r.license_id, 20); }, mono: true },
        { title: '执照编号', key: 'license_no', mono: true },
        { title: '姓名', key: 'name' },
        { title: '类别', render: function (r) { return P.badge(r.category); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '签发 → 失效', render: function (r) {
            return UI.trunc(r.issued_at, 16) + ' → ' + UI.trunc(r.expires_at, 16); } },
        { title: '操作', render: function (r) {
            return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
              onClick: function (e) { e.stopPropagation(); openLicense(r.license_id, tbl); } }, '详情');
          } }
      ],
      onRow: function (r) { openLicense(r.license_id, tbl); },
      emptyText: '暂无执照 —— 在上方提交申领后即发'
    });
    box.append(card('执照台账 pilot/list', tbl));
  }

  /* 执照凭证卡（d-cert 政务凭证样式；申领回执与详情抽屉共用） */
  function licenseCert(L) {
    if (!L) return null;
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '无人驾驶航空器操控员执照（演示）'),
        h('span', { class: 'd-cert-no' }, L.license_no)),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([
          ['执照 ID', h('code', { class: 'p-mono' }, L.license_id)],
          ['持有人', L.name],
          ['证件号码（模拟）', h('code', { class: 'p-mono' }, L.id_number)],
          ['航空器类别', P.badge(L.category)],
          ['状态', P.badge(L.status)],
          ['签发时间', L.issued_at],
          ['失效时间（签发+2 年）', L.expires_at],
          ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(L.signature, 48))]
        ]),
        h('p', { class: 'd-small d-muted' }, '演示数据域：证件号为模拟值；执照为演示环境即发，不构成真实资质。'))));
  }

  async function openLicense(lid, tbl) {
    var d = P.drawer('操控员执照 ' + lid, h('div', { class: 'p-empty' }, '⏳ pilot/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/pilot/query', { license_id: lid });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 7002 不存在或已失效 → EXPLAIN 解说 */
    body.append(licenseCert(r.data));                  /* query 平铺（§8 不对称） */
    if (tbl) tbl.reload();
  }

  function tabList(box) {
    box.append(P.dataTable({
      endpoint: '/api/realname/list', pageSize: 10,
      filters: [{ name: 'subject_type', label: '类型', type: 'select', options: ['ENTERPRISE', 'INDIVIDUAL'] }],
      columns: [
        { title: '主体 ID', key: 'subject_id', mono: true },
        { title: '名称', key: 'name' },
        { title: '类型', render: function (r) { return r.subject_type === 'ENTERPRISE' ? '企业' : '个人'; } },
        { title: '证件号（模拟）', key: 'id_number', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '登记时间', key: 'created_at' },
        { title: '操作', render: function (r) {
            return h('span', { class: 'd-row' },
              h('button', { class: 'p-btn p-btn-sm', title: '存入当前身份，全端预填',
                onClick: function (e) { e.stopPropagation(); pick(r); } }, '选为当前身份'),
              h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
                onClick: function (e) { e.stopPropagation(); openSubject(r.subject_id, null); } }, '详情'));
          } }
      ],
      onRow: function (r) { openSubject(r.subject_id, null); },
      emptyText: '暂无实名主体 —— 先在「主体登记」页办理登记'
    }));
  }

  function pick(s) {
    STORE.note('OPERATOR', s.subject_id, { name: s.name, subject_type: s.subject_type });
    drawIdbar();
    UI.toast('当前身份：' + s.name + '（' + s.subject_id + '）');
  }

  async function openSubject(sid, tbl) {
    var d = P.drawer('实名主体 ' + sid, h('div', { class: 'p-empty' }, '⏳ realname/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/realname/query', { subject_id: sid });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 7001 主体不存在 → EXPLAIN 解说 */
    body.append(subjectCert(r.data),                    /* query 平铺（§8 不对称） */
      P.actionBar([{ label: '选为当前身份', kind: 'primary',
        run: function () { pick(r.data); d.close(); } }]));
    if (tbl) tbl.reload();
  }

  OP.realname = { render: render };
})();
