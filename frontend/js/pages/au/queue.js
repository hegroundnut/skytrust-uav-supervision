/* queue.js — 管理当局端·审核队列（计划 B Task 9，spec §5.2）
   队列发现机制：跨链台账 crosschain/list（message_type=MISSION_APPLICATION, status=SUCCESS）的
   business_id 即申请号——以链上台账为准，不依赖本地缓存；逐行 review/query 标注已审/待审。
   右侧审核工作台：面板 A 行点击 → 申请存证 + 审核历史 + 裁决表单（review/submit 跨链回传源链）；
   面板 B 行点击 → 任务详情 + 航线 mini-map（管理方只见脱敏值 masked_value，明文永不出运营商域）。
   裁决 3：rules_hit/route_segments/zones 响应侧 JSON 字符串 → PORTAL.jp。
   端点：crosschain/list·query、mission/list·query、review/query·submit、route/list（mini-map）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mxMini = null;   /* 任务详情航线缩略图：页面级生命周期，render 入口与重建前必先 destroy */

  function render(root, ctx) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    root.append(P.pageHead({
      title: '审核队列',
      sub: '队列以跨链台账为准（MISSION_APPLICATION·SUCCESS 的 business_id 即申请号）· 裁决跨链回传源链' }));

    var panel = h('div', { class: 'd-col' },
      P.empty('点击左侧台账行进入审核工作台'));
    var tblA = null, tblB = null;
    function reloadAll() { if (tblA) tblA.reload(); if (tblB) tblB.reload(); }

    /* --- 面板 A：跨链申请台账（审核入口） --- */
    tblA = P.dataTable({
      endpoint: '/api/crosschain/list', pageSize: 10,
      baseBody: { message_type: 'MISSION_APPLICATION', status: 'SUCCESS' },
      columns: [
        { title: '申请号（business_id）', render: function (r) { return UI.trunc(r.business_id, 24); }, mono: true },
        { title: 'cross_tx_id', render: function (r) { return UI.trunc(r.cross_tx_id, 18); }, mono: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '申请时间', key: 'created_at' },
        { title: '审核状态', render: function (r) { return h('span', { 'data-rv': r.business_id }, '⏳'); } },
        { title: '操作', render: function (r) {
          return h('span', { class: 'd-row' },
            h('button', { class: 'p-btn p-btn-sm p-btn-primary',
              onClick: function (e) { e.stopPropagation(); openApplication(r.business_id, r.cross_tx_id, panel, reloadAll); } }, '工作台'),
            h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
              onClick: function (e) { e.stopPropagation(); P.openCxDetail(r.cross_tx_id); } }, '存证'));
        } }
      ],
      onLoaded: function (recs) {
        recs.forEach(function (rec) {
          API.call('/api/review/query', { application_id: rec.business_id }).then(function (r) {
            var el = tblA.querySelector('[data-rv="' + CSS.escape(rec.business_id) + '"]');
            if (!el) return;
            el.innerHTML = '';
            el.append(r.ok && r.data.total > 0 ? P.badge('REVIEWED') : P.badge('PENDING'));
            if (r.ok && r.data.total > 0) el.title = '已审 ' + r.data.total + ' 次';
          });
        });
      },
      onRow: function (r) { openApplication(r.business_id, r.cross_tx_id, panel, reloadAll); },
      emptyText: '暂无跨链申请（运营商提交任务后自动出现）'
    });

    /* --- 面板 B：待审任务详情面板（mission/list SUBMITTED） --- */
    tblB = P.dataTable({
      endpoint: '/api/mission/list', pageSize: 10,
      baseBody: { status: 'SUBMITTED' },
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '描述（脱敏）', render: function (r) { return r.masked_value || '—'; } },
        { title: '时窗', render: function (r) { return UI.trunc(r.start_time, 16) + ' → ' + UI.trunc(r.end_time, 16); } },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openMission(r.mission_id, panel); } }, '详情');
        } }
      ],
      onRow: function (r) { openMission(r.mission_id, panel); },
      emptyText: '暂无待审任务'
    });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('跨链申请台账（MISSION_APPLICATION · SUCCESS）', tblA),
        card('待审任务面板（mission/list · SUBMITTED；管理方只见脱敏值）', tblB)),
      h('div', { class: 'd-col' }, card('审核工作台', panel))));
  }

  /* ============ 申请工作台：存证 + 审核历史 + 裁决（review/submit） ============ */
  async function openApplication(appId, cxId, panel, reloadAll) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ 加载申请存证与审核历史…'));
    var cxR = cxId ? await API.call('/api/crosschain/query', { cross_tx_id: cxId }) : null;
    var hR = await API.call('/api/review/query', { application_id: appId });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    STORE.note('APPLICATION', appId);                  /* §29：进入工作台即记 chip */

    panel.append(P.kv([['申请号', h('code', { class: 'p-mono' }, appId)]]));
    if (cxR && cxR.ok) {
      panel.append(h('div', { class: 'd-section' }, '跨链存证（fabric → chainmaker → fisco-bcos）'),
        P.cxTrail(cxR.data));
    }
    var histWrap = h('div', {}, histBox(hR));
    panel.append(h('div', { class: 'd-section' }, '审核历史 review/query'), histWrap);

    /* 裁决表单 */
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'result', label: '裁决', type: 'select', value: 'APPROVED',
        options: ['APPROVED', 'REJECTED', 'NEED_COORDINATION'] },
      { name: 'reviewer', label: '审核员', type: 'text', required: true, value: 'Manager-A' },
      { name: 'rules_hit', label: '命中规则（逗号分隔，可留空）', type: 'text',
        placeholder: '如 R-ALT-001,TIME_WINDOW' },
      { name: 'comment', label: '审核意见', type: 'textarea', rows: 2 }
    ]);
    panel.append(h('div', { class: 'd-section' }, '裁决 review/submit（MISSION_REVIEW_RESULT 跨链回传源链）'),
      f.root,
      P.actionBar([{ label: '提交裁决', kind: 'primary',
        confirm: { title: '提交裁决', msg: '裁决将跨链回传源链并推进任务状态机（APPROVED→APPROVED / REJECTED→REJECTED / NEED_COORDINATION→COORDINATING）。审核规则拒绝 → 3003 设计内。', ok: '提交' },
        run: P.runOp({
          path: '/api/review/submit',
          body: function () {
            var v = PORTAL.need(f.read(), 'result', 'reviewer');
            if (!v) return null;
            return {
              application_id: appId,
              result: v.result, reviewer: v.reviewer,
              comment: v.comment || '',
              rules_hit: v.rules_hit
                ? String(v.rules_hit).split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : []
            };
          },
          rp: rp, successText: '裁决已提交并跨链回传',
          render: function (x) {
            return h('div', {},
              P.kv([
                ['审核号', h('code', { class: 'p-mono' }, UI.trunc(x.review.review_id, 32))],
                ['裁决', P.badge(x.review.result)],
                ['任务号', x.mission.mission_id],
                ['任务新状态', P.badge(x.mission.status)],
                ['任务描述（管理方视角）', x.mission.masked_value || '—']
              ]),
              P.cxTrail(x.crosschain));
          },
          onOk: function (x) {
            STORE.note('CROSS_TX', x.crosschain.cross_tx_id, { business_id: appId });
            reloadAll();
            /* 就地刷新历史区 */
            API.call('/api/review/query', { application_id: appId }).then(function (r2) {
              if (!histWrap.isConnected) return;
              histWrap.innerHTML = '';
              histWrap.append(histBox(r2));
            });
          } }) }]),
      rp.root);
  }

  /* 审核历史渲染：review/query {records,total} 无分页回显；rules_hit 是 JSON 字符串（裁决 3） */
  function histBox(r) {
    if (!r || !r.ok) return r ? P.errCard(r) : P.empty('无存证信息');
    if (!r.data.total) return P.empty('尚无审核记录（待审）');
    var box = h('div', { class: 'd-col' });
    (r.data.records || []).forEach(function (x) {
      box.append(P.kv([
        ['审核号', h('code', { class: 'p-mono' }, UI.trunc(x.review_id, 32))],
        ['裁决', P.badge(x.result)],
        ['审核员', x.reviewer],
        ['规则', PORTAL.jp(x.rules_hit, []).join('、') || '—'],
        ['意见', x.comment || '—'],
        ['时间', x.review_time]
      ]));
    });
    return box;
  }

  /* ============ 任务详情 + 航线 mini-map（管理方只见脱敏值） ============ */
  async function openMission(mid, panel) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ mission/query 查询中…'));
    var r = await API.call('/api/mission/query', { mission_id: mid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }
    var m = r.data;
    STORE.note('MISSION', m.mission_id, { operator_id: m.operator_id, uav_id: m.uav_id });  /* §29 */
    var ids = PORTAL.jp(m.route_segments, []);
    var mapEl = h('div', { class: 'd-map d-map-sm' });
    panel.append(
      h('p', { class: 'd-small d-muted' }, '隐私说明：任务描述以 SM9 密文入库，管理方视角仅见脱敏值——明文只在监管授权开箱后出现（密文核验页）。'),
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['状态', P.badge(m.status)],
        ['运营商 / 无人机', m.operator_id + ' / ' + m.uav_id],
        ['类型 / 载荷', m.mission_type + ' / ' + (m.payload_type || '—')],
        ['描述（脱敏）', m.masked_value || '—'],
        ['航段', ids.join('、') || '—'],
        ['空域', PORTAL.jp(m.zones, []).join('、') || '—'],
        ['高度带', m.altitude_min + '–' + m.altitude_max + ' m'],
        ['时窗', m.start_time + ' → ' + m.end_time],
        ['关联执照', m.pilot_license_id || '未关联']
      ]),
      mapEl,
      h('div', { class: 'd-map-hint' }, '任务航线缩略图（' + ids.length + ' 段高亮）'));
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
      mxMini.setEmpty('任务航线无结构化坐标（遗留数据）——不猜测、不绘制');
    }
  }

  AU.queue = { render: render };
})();
