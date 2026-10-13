/* ledger.js — 证照中心·证照台账（Task 7）
   pass/list 服务端分页表（过滤 status/mission_id/uav_id；状态徽章 PUI.STATUS_MAP
   图标+文字：GENERATING/VALID/USED/EXPIRED/REVOKED 双重编码，永不单靠颜色）。
   行展开抽屉 = pass/query 证照卡（QR 证面 renderQR）+ SM9 签名身份 + 四段 TxID
   （cxTrail 任一段点击即 openCxDetail 全量证据入口）。
   签名身份溯源（诚实红线）：FlightPass 表无签发身份字段——身份取自 FLIGHT_PASS
   跨链留痕 sm9_identity（REGISTRY-ADMIN 现行 / FISCO-ADMIN 历史，双身份过渡）；
   无留痕则如实显示「无法链上溯源」，绝不按日期猜测。
   crosschain/list 服务端仅支持 status/message_type 过滤——business_id 为最近 200 条
   窗口内客户端匹配，窗口如实标注（Review Focus 5），不外推。
   REVOKED 证照附 PASS_REVOKE 吊销留痕区（FAILED 待补发记录如实展示）。
   端点：pass/list、pass/query、crosschain/list。 */
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
    return '未登记身份（原值如实展示，不猜测）';
  }

  function render(root) {
    root.append(P.pageHead({
      title: '证照台账',
      sub: 'pass/list 服务端分页 · 状态徽章图标+文字 · 行展开：证照卡（QR 证面）+ SM9 签名身份 + 四段 TxID 存证'
    }));
    var tbl = P.dataTable({
      endpoint: '/api/pass/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
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
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openLedger(r.pass_id); } }, '展开详情'); } }
      ],
      onRow: function (r) { openLedger(r.pass_id); },
      emptyText: '暂无证照 —— 在「通行证签发」页签发后出现在此（空台账如实显示 0 条，不虚构记录）'
    });
    root.append(card('证照台账 pass/list（点击行或「展开详情」查看证照卡 + 签名身份 + 链上存证）', tbl));
  }

  /* ---------- 行展开抽屉：pass/query 详情 + QR + 签名身份 + 跨链留痕 ---------- */
  async function openLedger(passId) {
    var d = P.drawer('证照 ' + passId, h('div', { class: 'p-empty' }, '⏳ pass/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!body.isConnected) return;                       /* 抽屉已被关闭 */
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 6002 → EXPLAIN 解说 */
    var p = r.data;
    STORE.note('PASS', p.pass_id, { mission_id: p.mission_id });
    var qrEl = h('div', { class: 'd-qr' });
    body.append(
      h('div', { class: 'd-cert' },
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
            ['SM3 摘要（服务端权威）', h('code', { class: 'p-mono', title: p.sm3_hash }, UI.trunc(p.sm3_hash, 48))],
            ['SM9 签名', h('code', { class: 'p-mono', title: p.signature }, UI.trunc(p.signature, 48))],
            ['签发 / 更新', p.created_at + ' → ' + p.updated_at]
          ])),
          qrEl),
        h('div', { class: 'd-seal' }, '证照链\n签发')),
      h('p', { class: 'd-small d-muted' }, '签名身份说明：', TRANSITION_NOTE,
        '（pass/verify 先试 SM9-ID-REGISTRY-ADMIN、失败回落 SM9-ID-FISCO-ADMIN——存量证照不失效）。'));
    PORTAL.renderQR(qrEl, JSON.stringify({
      pass_id: p.pass_id, mission_id: p.mission_id, uav_id: p.uav_id, valid_to: p.valid_to }),
      'QR 生成失败（qrcode 库不可用或内容超长）——证照号等以左侧文字为准，不虚构二维码');

    var cxBox = h('div', {}, h('div', { class: 'p-empty' }, '⏳ FLIGHT_PASS 跨链留痕查询中…'));
    body.append(h('div', { class: 'd-section' },
      'SM9 签名身份 + FLIGHT_PASS 四段 TxID 存证（点击任一段打开 openCxDetail 全量证据）'), cxBox);
    await fillCx(cxBox, 'FLIGHT_PASS', p.pass_id, true);
    if (!cxBox.isConnected) return;

    if (p.status === 'REVOKED') {
      var rvBox = h('div', {}, h('div', { class: 'p-empty' }, '⏳ PASS_REVOKE 吊销留痕查询中…'));
      body.append(h('div', { class: 'd-section' }, '吊销留痕 PASS_REVOKE（链上失败/待补发记录如实展示）'), rvBox);
      await fillCx(rvBox, 'PASS_REVOKE', p.pass_id, false);
    }
  }

  /* ---------- 跨链留痕匹配 + 渲染（business_id 最近 200 条窗口内客户端匹配，如实标注） ---------- */
  async function fillCx(box, msgType, passId, showIdentity) {
    var r = await API.call('/api/crosschain/list', { message_type: msgType, page: 1, page_size: 200 });
    if (!box.isConnected) return;
    box.innerHTML = '';
    if (!r.ok) { box.append(P.errCard(r)); return; }
    var recs = (r.data.records || []).filter(function (x) { return x.business_id === passId; });
    box.append(h('p', { class: 'd-small d-muted' },
      '检索窗口：' + msgType + ' 最近 ' + (r.data.records || []).length +
      ' 条（服务端仅支持 status/message_type 过滤，business_id 为窗口内客户端匹配；台账总量 ' +
      (r.data.total || 0) + ' 条）→ 命中 ' + recs.length + ' 条。'));
    if (!recs.length) {
      box.append(P.empty(showIdentity
        ? '未找到 FLIGHT_PASS 跨链留痕 —— SM9 签名身份无法链上溯源（绝不按日期猜测）；可在跨链台账 / 链上浏览器补查'
        : '未找到 PASS_REVOKE 留痕（最近 200 条窗口外或缺失）—— 可在跨链台账补查，不猜测'));
      return;
    }
    var primary = recs.filter(function (x) { return x.status === 'SUCCESS'; })[0] || recs[0];
    if (showIdentity) {
      box.append(P.kv([
        ['SM9 签名身份（主留痕）', h('div', {},
          h('code', { class: 'p-mono' }, primary.sm9_identity || '—'),
          h('div', { class: 'd-small d-muted' }, signerNote(primary.sm9_identity)))]
      ]));
    }
    STORE.note('CROSS_TX', primary.cross_tx_id, { business_id: passId });
    recs.forEach(function (x) {
      box.append(
        h('div', { class: 'd-small d-muted d-mt' },
          '留痕 · ', x.created_at, x.retry_of ? ' · 重试自 ' + x.retry_of : '',
          ' · ', P.badge(x.status)),
        P.cxTrail(x));
    });
  }

  CT.ledger = { render: render };
})();
