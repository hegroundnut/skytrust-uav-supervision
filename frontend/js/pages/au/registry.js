/* registry.js — 管理当局端·登记与资质（计划 B Task 10，spec §5.2）
   只读局方台账：实名主体（realname/list·query）+ 飞行员执照（pilot/list·query）。
   执照记录带 SM9 验签按钮：crypto/sm9/verify 以局方签发身份 SM9-ID-FISCO-ADMIN 复核
   pilotCanonical 七键 {license_id,license_no,name,id_number,category,issued_at,expires_at}——防篡改。
   本页不做登记动作（realname/register·pilot/apply 属运营商端）；管理当局只查看与复核。
   端点：realname/list·query、pilot/list·query、crypto/sm9/verify。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* 局方执照签发身份（pilot.go: pilotSignerUID = crypto.SM9IdentityOf("FISCO-ADMIN")） */
  const PILOT_SIGNER = 'SM9-ID-FISCO-ADMIN';

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '登记与资质',
      sub: '只读局方台账 · 实名主体 + 飞行员执照 · 执照可 SM9 验签防篡改' }));

    var panel = h('div', { class: 'd-col' }, P.empty('点击左侧台账行查看详情'));

    /* 实名主体台账（subject_type 过滤：ENTERPRISE/INDIVIDUAL 大写枚举） */
    var tblR = P.dataTable({
      endpoint: '/api/realname/list', pageSize: 10,
      filters: [{ name: 'subject_type', label: '主体类型', type: 'select',
        options: ['ENTERPRISE', 'INDIVIDUAL'].map(function (s) { return [s, P.statusZh(s)]; }) }],
      columns: [
        { title: '主体号', render: function (r) { return UI.trunc(r.subject_id, 22); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.subject_type); } },
        { title: '名称', key: 'name' },
        { title: '证件号', render: function (r) { return UI.trunc(r.id_number, 20); }, mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } }
      ],
      onRow: function (r) { openSubject(r.subject_id, panel); },
      emptyText: '暂无实名主体（运营商端实名登记后出现）'
    });

    /* 飞行员执照台账（category 中文枚举过滤） */
    var tblP = P.dataTable({
      endpoint: '/api/pilot/list', pageSize: 10,
      filters: [{ name: 'category', label: '类别', type: 'select',
        options: ['多旋翼', '固定翼', '垂直起降'] }],
      columns: [
        { title: '执照号', render: function (r) { return UI.trunc(r.license_id, 20); }, mono: true },
        { title: '编号', key: 'license_no', mono: true },
        { title: '姓名', key: 'name' },
        { title: '类别', render: function (r) { return P.badge(r.category); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openLicense(r.license_id, panel); } }, '详情');
        } }
      ],
      onRow: function (r) { openLicense(r.license_id, panel); },
      emptyText: '暂无飞行员执照（运营商端执照申请后出现）'
    });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('实名主体台账', tblR),
        card('飞行员执照台账', tblP)),
      h('div', { class: 'd-col' }, card('详情', panel))));
  }

  /* 实名主体详情：realname/query 平铺 Subject（8 键） */
  async function openSubject(sid, panel) {
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '实名主体查询中…'));
    var r = await API.call('/api/realname/query', { subject_id: sid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }   /* 7001 主体不存在 */
    var s = r.data;
    panel.append(
      h('div', { class: 'd-section' }, '实名主体'),
      P.kv([
        ['主体号', h('code', { class: 'p-mono' }, s.subject_id)],
        ['类型', P.badge(s.subject_type)],
        ['名称', s.name],
        ['证件号', h('code', { class: 'p-mono' }, s.id_number)],
        ['联系方式', s.contact || '—'],
        ['状态', P.badge(s.status)],
        ['建档 / 更新', UI.fmtDT(s.created_at, true) + ' → ' + UI.fmtDT(s.updated_at, true)]
      ]),
      h('p', { class: 'd-small d-muted' }, '演示数据域：证件号为模拟值，不接真实认证系统。'));
  }

  /* 飞行员执照详情：pilot/query 平铺 License（11 键）+ SM9 验签 */
  async function openLicense(lid, panel) {
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '执照详情查询中…'));
    var r = await API.call('/api/pilot/query', { license_id: lid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }   /* 7002 不存在或已失效 */
    var L = r.data;

    var verifyBox = h('div', { class: 'd-col' });
    panel.append(
      h('div', { class: 'd-section' }, '飞行员执照'),
      P.kv([
        ['执照号', h('code', { class: 'p-mono' }, L.license_id)],
        ['执照编号', h('code', { class: 'p-mono' }, L.license_no)],
        ['姓名', L.name],
        ['证件号', h('code', { class: 'p-mono' }, L.id_number)],
        ['类别', P.badge(L.category)],
        ['状态', P.badge(L.status)],
        ['签发 / 失效', UI.fmtDT(L.issued_at, true) + ' → ' + UI.fmtDT(L.expires_at, true)],
        ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(L.signature, 40))]
      ]),
      h('div', { class: 'd-section' }, 'SM9 验签'),
      P.actionBar([{ label: 'SM9 验签', kind: 'primary', title: '以局方签发材料复核签名',
        run: function (el) { verifyLicense(L, verifyBox, el); } }]),
      verifyBox,
      h('p', { class: 'd-small d-muted' }, '验签以局方签发身份 ', h('code', { class: 'p-mono' }, PILOT_SIGNER),
        ' 复核，采用执照七项关键信息组成的规范载荷，与签发时的签名材料完全一致。演示数据域：证件号为模拟值。'));
  }

  /* crypto/sm9/verify：payload = query 响应七键子集；合法签名 valid true/false 均 code=0 */
  async function verifyLicense(L, box, el) {
    box.innerHTML = '';
    box.append(h('div', { class: 'p-empty' }, 'SM9 验签中…'));
    if (el) el.disabled = true;
    var payload = {
      license_id: L.license_id, license_no: L.license_no, name: L.name,
      id_number: L.id_number, category: L.category,
      issued_at: L.issued_at, expires_at: L.expires_at
    };
    var r = await API.call('/api/crypto/sm9/verify',
      { sm9_identity: PILOT_SIGNER, payload: payload, signature: L.signature });
    if (el) el.disabled = false;
    if (!box.isConnected) return;
    box.innerHTML = '';
    if (!r.ok) { box.append(P.errCard(r)); return; }   /* 1002 签名 base64 非法 */
    var ok = !!r.data.valid;
    box.append(
      P.statCards([{ label: 'SM9 验签', value: ok ? '通过' : '未通过',
        sub: ok ? '签名与执照签发材料一致' : '签名与执照材料不一致（疑似篡改）',
        tone: ok ? 'good' : 'critical' }]));
    if (P.DEBUG) box.append(UI.jsonBlock(payload, 160));   /* 规范载荷 JSON 仅调试展示 */
  }

  AU.registry = { render: render };
})();
