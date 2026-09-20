/* wb-manager.js —— 管理方审核台 #/wb-manager：待审队列 / 审核记录 / 许可管理。
   待审队列由跨链台账驱动（crosschain/list MISSION_APPLICATION），不依赖本地缓存——
   换浏览器、清缓存、重启后端后队列依然完整。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));

  function render(root) {
    root.append(P.pageHead({
      title: '管理方审核台',
      sub: '跨链台账驱动的待审队列 · 审核裁决回传 · 飞行许可签发与吊销',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'queue', label: '待审队列', render: tabQueue },
      { key: 'records', label: '审核记录', render: tabRecords },
      { key: 'passes', label: '许可管理', render: tabPasses },
    ]));
  }

  /* ================= Tab 1：待审队列 ================= */
  function tabQueue(box) {
    box.append(h('div', { class: 'p-note' },
      '队列发现机制：跨链台账 crosschain/list（message_type=MISSION_APPLICATION, status=SUCCESS）的',
      h('b', {}, ' business_id 即申请号'),
      '；逐行 review/query 标注已审/待审。任务详情面板独立来自 mission/list（status=SUBMITTED），两者均以链上台账为准，与本地缓存无关。'));

    let tblA = null, tblB = null;
    const reloadAll = () => { if (tblA) tblA.reload(); if (tblB) tblB.reload(); };

    /* --- 面板 A：跨链申请台账 --- */
    tblA = P.dataTable({
      endpoint: '/api/crosschain/list',
      baseBody: { message_type: 'MISSION_APPLICATION', status: 'SUCCESS' },
      columns: [
        { title: '申请号（business_id）', render: r => UI.trunc(r.business_id, 24), mono: true },
        { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 18), mono: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '申请时间', key: 'created_at' },
        { title: '审核状态', render: r => h('span', { 'data-rv': r.business_id }, '⏳') },
        { title: '操作', render: r => h('span', { class: 'p-row' },
          h('button', { class: 'p-btn p-btn-sm p-btn-primary',
            onClick: e => { e.stopPropagation(); reviewDrawer(r.business_id, reloadAll); } }, '审核'),
          h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: e => { e.stopPropagation(); P.openCxDetail(r.cross_tx_id); } }, '存证')) },
      ],
      onLoaded: recs => {
        recs.forEach(rec => {
          API.call('/api/review/query', { application_id: rec.business_id }).then(r => {
            const el = tblA.querySelector('[data-rv="' + CSS.escape(rec.business_id) + '"]');
            if (!el) return;
            el.innerHTML = '';
            el.append(r.ok && r.data.total > 0 ? P.badge('REVIEWED') : P.badge('PENDING'));
            if (r.ok && r.data.total > 0) el.title = '已审 ' + r.data.total + ' 次';
          });
        });
      },
      emptyText: '暂无跨链申请（运营商提交任务后自动出现）',
    });
    box.append(card('跨链申请台账（MISSION_APPLICATION · SUCCESS）', tblA));

    /* --- 面板 B：待审任务详情面板 --- */
    tblB = P.dataTable({
      endpoint: '/api/mission/list',
      baseBody: { status: 'SUBMITTED' },
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '描述（脱敏）', key: 'masked_value' },
        { title: '时窗', render: r => UI.trunc(r.start_time, 16) + ' → ' + UI.trunc(r.end_time, 16) },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); missionDrawer(r.mission_id); } }, '详情') },
      ],
      emptyText: '暂无待审任务',
    });
    box.append(card('待审任务面板（mission/list · SUBMITTED；管理方只见脱敏值）', tblB));
  }

  /* 审核抽屉：历史 + 裁决表单 + 跨链回传存证 */
  function reviewDrawer(applicationId, onDone) {
    const rp = P.resultPanel();
    const histBox = h('div', {}, P.empty('⏳ 加载审核历史…'));
    const f = P.form([
      { name: 'result', label: '裁决', type: 'select', value: 'APPROVED',
        options: ['APPROVED', 'REJECTED', 'NEED_COORDINATION'] },
      { name: 'reviewer', label: '审核员', type: 'text', required: true, value: 'Manager-A' },
      { name: 'rules_hit', label: '命中规则（逗号分隔，可留空）', type: 'text',
        placeholder: '如 ZONE_LIMIT,TIME_WINDOW' },
      { name: 'comment', label: '审核意见', type: 'textarea' },
    ]);
    const d = P.drawer('审核裁决 · 申请 ' + applicationId,
      h('div', { class: 'p-drawer-sec' }, '审核历史 review/query', histBox),
      h('div', { class: 'p-drawer-sec' }, '裁决 review/submit（MISSION_REVIEW_RESULT 跨链回传源链）',
        f.root,
        P.actionBar([{ label: '提交裁决', kind: 'primary',
          confirm: { title: '提交裁决', msg: '裁决将跨链回传源链并推进任务状态机，确认提交？', ok: '提交' },
          run: P.runOp({
            path: '/api/review/submit',
            body: () => {
              const v = need(f.read(), 'result', 'reviewer');
              if (!v) return null;
              return {
                application_id: applicationId,
                result: v.result, reviewer: v.reviewer,
                comment: v.comment || '',
                rules_hit: v.rules_hit
                  ? String(v.rules_hit).split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
              };
            },
            rp, successText: '裁决已提交并跨链回传',
            render: x => h('div', {},
              P.kv([
                ['审核号', monoTrunc(x.review.review_id, 32)],
                ['裁决', P.badge(x.review.result)],
                ['任务号', x.mission.mission_id],
                ['任务新状态', P.badge(x.mission.status)],
                ['任务描述（管理方视角）', x.mission.masked_value]]),
              P.cxTrail(x.crosschain)),
            onOk: x => {
              STORE.note('CROSS_TX', x.crosschain.cross_tx_id, { business_id: applicationId });
              loadHist(); if (onDone) onDone();
            } }) }]),
        rp.root));
    function loadHist() {
      histBox.innerHTML = ''; histBox.append(P.empty('⏳ 加载审核历史…'));
      API.call('/api/review/query', { application_id: applicationId }).then(r => {
        histBox.innerHTML = '';
        if (!r.ok) { histBox.append(P.errCard(r)); return; }
        if (!r.data.total) { histBox.append(P.empty('尚无审核记录（待审）')); return; }
        (r.data.records || []).forEach(x => histBox.append(P.kv([
          ['审核号', monoTrunc(x.review_id, 32)], ['裁决', P.badge(x.result)],
          ['审核员', x.reviewer], ['规则', (x.rules_hit || []).join('、') || '—'],
          ['意见', x.comment || '—'], ['时间', x.review_time]])));
      });
    }
    loadHist();
    return d;
  }

  async function missionDrawer(missionId) {
    const d = P.drawer('待审任务 ' + missionId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/mission/query', { mission_id: missionId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const m = r.data;
    body.append(
      h('div', { class: 'p-note' }, '隐私说明：任务描述以 SM9 密文入库，管理方视角仅见脱敏值——明文只在监管授权开箱后出现。'),
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['状态', P.badge(m.status)],
        ['运营商', m.operator_id], ['无人机', m.uav_id],
        ['类型 / 载荷', m.mission_type + ' / ' + m.payload_type],
        ['描述（脱敏）', m.masked_value],
        ['航段', (m.route_segments || []).join('、')],
        ['空域', (m.zones || []).join('、')],
        ['高度层(m)', m.altitude_min + ' – ' + m.altitude_max],
        ['时窗', m.start_time + ' → ' + m.end_time]]),
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  /* ================= Tab 2：审核记录 ================= */
  function tabRecords(box) {
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'application_id', label: '申请号', type: 'text', required: true, hint: '可点上方 chips 复制（APPLICATION）' },
    ]);
    box.append(card('按申请号查审核记录 review/query', f.root,
      P.actionBar([{ label: '查询', run: P.runOp({
        path: '/api/review/query', body: () => need(f.read(), 'application_id'), rp,
        render: d => h('div', {},
          P.statCards([{ label: '审核次数', value: d.total }]),
          h('div', {}, (d.records || []).map(x => P.kv([
            ['审核号', monoTrunc(x.review_id, 32)], ['裁决', P.badge(x.result)],
            ['审核员', x.reviewer], ['规则', (x.rules_hit || []).join('、') || '—'],
            ['意见', x.comment || '—'], ['时间', x.review_time]])))),
      }) }]), rp.root));
    box.append(card('裁决回传存证（MISSION_REVIEW_RESULT）',
      P.dataTable({
        endpoint: '/api/crosschain/list',
        baseBody: { message_type: 'MISSION_REVIEW_RESULT' },
        filters: [{ name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] }],
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 22), mono: true },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 20), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '时延(ms)', key: 'latency_ms', num: true },
          { title: '创建时间', key: 'created_at' }],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
        emptyText: '暂无裁决回传记录',
      })));
  }

  /* ================= Tab 3：许可管理 ================= */
  function tabPasses(box) {
    const tbl = P.dataTable({
      endpoint: '/api/pass/list',
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] }],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '生效', key: 'valid_from' }, { title: '失效', key: 'valid_to' }],
    });

    /* --- 签发 --- */
    const rpIs = P.resultPanel();
    const fIs = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true, placeholder: 'PASS-XXX' },
      { name: 'mission_id', label: '任务号', type: 'text', required: true, hint: '可点上方 chips 复制（MISSION）' },
      { name: 'issuer', label: '签发人', type: 'text', required: true, value: 'Manager-A' },
      { name: 'valid_from', label: '生效时间', type: 'datetime', value: UI.datetimeLocal(0) },
      { name: 'valid_to', label: '失效时间', type: 'datetime', value: UI.datetimeLocal(480) },
    ]);
    box.append(card('许可签发 pass/issue（FLIGHT_PASS：管理链 → 监管链 → 运营链）', fIs.root,
      h('p', { class: 'p-field-hint' },
        '同 pass_id 重复签发 = 复用既有许可的幂等重试（不产生第二张证）；签发前提是任务已 APPROVED。'),
      P.actionBar([{ label: '签发许可', kind: 'primary', run: P.runOp({
        path: '/api/pass/issue',
        body: () => need(fIs.read(), 'pass_id', 'mission_id', 'issuer', 'valid_from', 'valid_to'),
        rp: rpIs, successText: '许可已签发并跨链送达运营链',
        render: d => h('div', {},
          P.kv([['许可号', d.pass.pass_id], ['状态', P.badge(d.pass.status)],
            ['任务号', d.pass.mission_id], ['无人机', d.pass.uav_id],
            ['SM3 摘要', monoTrunc(d.pass.sm3_hash, 40)]]),
          P.cxTrail(d.crosschain)),
        note: { kind: 'PASS', id: d => d.pass.pass_id, extra: d => ({ mission_id: d.pass.mission_id }) },
        onOk: d => { STORE.note('CROSS_TX', d.crosschain.cross_tx_id); tbl.reload(); } }) }]),
      rpIs.root));

    /* --- 吊销 --- */
    const rpRv = P.resultPanel();
    const fRv = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Manager-A' },
      { name: 'reason', label: '吊销原因', type: 'textarea', required: true },
    ]);
    box.append(card('许可吊销 pass/revoke（PASS_REVOKE 跨链重发，本地先行）', fRv.root,
      h('p', { class: 'p-field-hint' },
        '本地 REVOKED 立即生效，跨链重发结果见 crosschain_status（FAILED 时会留痕但不回滚本地吊销）。'),
      P.actionBar([{ label: '吊销许可', kind: 'danger',
        confirm: { title: '确认吊销', msg: '吊销后该许可立即失效（valid=false），跨链重发 PASS_REVOKE。', ok: '确认吊销' },
        run: P.runOp({
          path: '/api/pass/revoke', body: () => need(fRv.read(), 'pass_id', 'operator', 'reason'),
          rp: rpRv, successText: '许可已吊销',
          render: d => h('div', {},
            P.kv([['许可号', d.pass.pass_id], ['状态', P.badge(d.pass.status)],
              ['跨链重发', P.badge(d.crosschain_status)]]),
            P.cxTrail(d.crosschain)),
          note: { kind: 'PASS', id: d => d.pass.pass_id },
          onOk: () => tbl.reload() }) }]),
      rpRv.root));

    /* --- 验证 --- */
    const rpVf = P.resultPanel();
    const fVf = P.form([{ name: 'pass_id', label: '许可号', type: 'text', required: true }]);
    box.append(card('许可验证 pass/verify', fVf.root,
      P.actionBar([{ label: '验证', kind: 'primary', run: P.runOp({
        path: '/api/pass/verify', body: () => need(fVf.read(), 'pass_id'), rp: rpVf,
        render: d => h('div', {},
          P.statCards([{ label: 'valid', value: String(d.valid), tone: d.valid ? 'good' : 'critical' }]),
          P.kv([['状态', P.badge(d.status)], ['原因', (d.reasons || []).join('；') || '—']])) }) }]),
      rpVf.root));

    box.append(card('许可台账 pass/list', tbl));
    box.append(card('许可跨链存证（FLIGHT_PASS / PASS_REVOKE）',
      P.dataTable({
        endpoint: '/api/crosschain/list',
        filters: [{ name: 'message_type', label: '类型', type: 'select',
          options: ['FLIGHT_PASS', 'PASS_REVOKE'] }],
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 22), mono: true },
          { title: '类型', key: 'message_type' },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 20), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '时延(ms)', key: 'latency_ms', num: true }],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
        emptyText: '暂无许可存证',
      })));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-manager'] = { render };
})();
