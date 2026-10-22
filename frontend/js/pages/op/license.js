/* license.js — 运营商端·电子飞行许可（计划 B Task 7，spec §5.1）
   pass/list 台账（STORE UAV 槽位预填 uav_id 过滤器）→ 点行在右侧渲染电子许可卡
   （证号/有效窗/许可航线/SM3 摘要/SM9 签名/QR 装饰 + 航线缩略图 mini-map）。
   飞行前自查 pass/verify：安全红线——对存在的许可 code 恒 0，valid/reasons 是数据不是错误，
   valid=true 绿灯「可以起飞」/ valid=false 红灯 reasons 中文清单（永不走 errCard 分支）；
   仅 pass_id 不存在 → 6002 由 runOp 自动错误卡。
   端点：pass/list·query·verify、route/list（缩略图，裁决 16 式全量拉取+本地过滤）。
   裁决 4：Pass.route 是 JSON 字符串 → PORTAL.jp。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mxMini = null;   /* 许可卡航线缩略图：页面级生命周期，render 入口与重建前必先 destroy */

  function render(root, ctx) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    root.append(P.pageHead({
      title: '电子飞行许可',
      sub: '许可由管理当局签发 · 飞行前请务必完成自查 —— 绿灯方可起飞' }));

    var panel = h('div', { class: 'd-col' },
      h('div', { class: 'p-empty' }, '点击左侧台账行查看电子许可卡'));
    var slot = STORE.get('PASS');
    var fVerify = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'PASS-2026-xxx（点台账行自动预填）' }
    ]);
    var rpV = P.resultPanel();
    var uavSlot = STORE.get('UAV');
    var tbl = P.dataTable({
      endpoint: '/api/pass/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
        { name: 'uav_id', label: '航空器 ID', type: 'text', value: (uavSlot && uavSlot.id) || '' },
        { name: 'mission_id', label: '任务号', type: 'text' }
      ],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '有效窗', render: function (r) { return r.valid_from + ' → ' + r.valid_to; } },
        { title: '签发时间', key: 'created_at' }
      ],
      onRow: function (r) { showPass(r.pass_id, panel, fVerify); },
      emptyText: '暂无许可 —— 任务经管理当局审核签发后出现在此'
    });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' }, tbl,
        card('飞行前自查',
          h('p', { class: 'd-small d-muted' }, '校验有效窗、状态与航空器匹配情况；自查未通过时逐条列明原因，切实保障飞行安全。'),
          fVerify.root,
          P.actionBar([{ label: '起飞前验证', kind: 'primary', run: P.runOp({
            path: '/api/pass/verify',
            body: function () { return PORTAL.need(fVerify.read(), 'pass_id'); },
            rp: rpV, successText: '自查完成（结论见下方卡片）',
            render: function (d) { return verifyView(d); },
            note: { kind: 'PASS', id: function (d) { return d.pass_id; } } }) }]),
          rpV.root)),
      panel));
  }

  /* 裁决 6：valid=false 仍是 code=0 成功响应 —— 红灯是数据渲染，不是错误卡 */
  function verifyView(d) {
    if (d.valid) {
      return h('div', { class: 'd-cert' },
        h('div', { class: 'd-cert-head' },
          h('span', { class: 'd-cert-title', style: { color: '#15803d' } }, '✓ 自查通过 · 可以起飞'),
          h('span', { class: 'd-cert-no' }, d.pass_id)),
        h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
          P.kv([['许可状态', P.badge(d.status)], ['结论', '自查通过 · 无拒绝原因']])),
          h('div', { class: 'd-seal' }, '可以起飞')));
    }
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title', style: { color: '#b91c1c' } }, '⛔ 自查未通过 · 禁止起飞'),
        h('span', { class: 'd-cert-no' }, d.pass_id)),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([['许可状态', P.badge(d.status)], ['结论', '自查未通过']]),
        h('ul', { class: 'd-mt' }, (d.reasons || []).map(function (x) {
          return h('li', { style: { color: '#b91c1c' } }, x);
        })))));
  }

  /* 许可卡：pass/query 平铺 11 键（§13）；QR 为证面装饰；缩略图 route/list 全量拉取
     后按许可航线本地过滤（无逐段查询端点，裁决 16 同理）；坐标未设（0/缺失）不画不猜 */
  async function showPass(passId, panel, fVerify) {
    if (fVerify) fVerify.set('pass_id', passId);
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ 许可详情查询中…'));
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }    /* 6002 → EXPLAIN 解说 */
    var p = r.data;
    STORE.note('PASS', p.pass_id);                        /* §29：查询即记 chip */
    var ids = PORTAL.jp(p.route, []);
    var qrEl = h('div', { class: 'd-qr' });
    var mapEl = h('div', { class: 'd-map d-map-sm' });
    panel.append(
      h('div', { class: 'd-cert' },
        h('div', { class: 'd-cert-head' },
          h('span', { class: 'd-cert-title' }, '无人机电子飞行许可'),
          h('span', { class: 'd-cert-no' }, p.pass_id)),
        h('div', { class: 'd-cert-body' },
          h('div', { class: 'd-cert-main' }, P.kv([
            ['许可状态', P.badge(p.status)],
            ['任务号', h('code', { class: 'p-mono' }, p.mission_id)],
            ['航空器', h('code', { class: 'p-mono' }, p.uav_id || '—')],
            ['有效窗', p.valid_from + ' → ' + p.valid_to],
            ['许可航线', ids.join(' → ') || '—'],
            ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(p.sm3_hash, 48))],
            ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(p.signature, 48))],
            ['签发 / 更新', p.created_at + ' → ' + p.updated_at]
          ])),
          qrEl),
        h('div', { class: 'd-seal' }, '管理当局签发')),
      mapEl,
      h('div', { class: 'd-map-hint' }, '许可航线缩略图（' + ids.length + ' 段高亮）——起飞前对照空域'));
    PORTAL.renderQR(qrEl, JSON.stringify({
      pass_id: p.pass_id, mission_id: p.mission_id, uav_id: p.uav_id, valid_to: p.valid_to }));

    mxMini = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
    if (!rr.ok || !mxMini) return;
    var mine = (rr.data.records || []).filter(function (x) { return ids.indexOf(x.route_id) >= 0; });
    if (mine.length) {
      mxMini.drawZones(mine);
      mxMini.drawRoutes(mine, { active: ids });
      var pts = GEO.routePoints(mine);
      if (pts.length) mxMini.fitPoints(pts);
    } else {
      mxMini.setEmpty('该许可航线暂无坐标信息，地图不予展示');
    }
  }

  OP.license = { render: render };
})();
