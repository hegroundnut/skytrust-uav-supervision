/* wb-regulator.js —— 监管门户 #/wb-regulator：驾驶舱 / 告警 / 身份追踪 / 授权 / 密文核验 / 审计 / 密码工具箱。 */
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
  function simpleTable(cols, recs, emptyText) {
    if (!recs || !recs.length) return P.empty(emptyText);
    return h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
      h('thead', {}, h('tr', {}, cols.map(c => h('th', {}, c.title)))),
      h('tbody', {}, recs.map(r => h('tr', {}, cols.map(c => h('td', {}, c.render(r))))))));
  }
  function parsePayload(v) {
    try { return JSON.parse(v); }
    catch (_) { UI.toast('payload 不是合法 JSON', 'err'); return null; }
  }
  /* decrypted_view 后端为 JSON 字符串（SM9 解密临时视图，仅本次响应不落库）：
     解析后逐字段渲染；解析失败回退原文；为空 = 本次未开箱（范围不含 MISSION 或任务无密文）。 */
  function decryptedPairs(v) {
    let o = v;
    if (typeof o === 'string' && o) {
      try { o = JSON.parse(o); } catch (_) { return [['明文视图', o]]; }
    }
    if (o && typeof o === 'object') return Object.keys(o).map(k =>
      [k, typeof o[k] === 'object' ? JSON.stringify(o[k]) : String(o[k])]);
    return [['明文视图', '—（本次未开箱：授权范围不含 MISSION 或任务无密文）']];
  }
  /* RegulatoryAuth.scope 后端为 JSON 数组字符串（如 '["ROUTE","PAYLOAD"]'）：解析后顿号连接。 */
  function scopeText(sc) {
    if (Array.isArray(sc)) return sc.join('、');
    if (typeof sc === 'string' && sc) {
      try { const a = JSON.parse(sc); if (Array.isArray(a)) return a.join('、'); } catch (_) {}
      return sc;
    }
    return '—';
  }

  function render(root) {
    root.append(P.pageHead({
      title: '监管门户',
      sub: '驾驶舱 · 告警处置 · 七级身份追踪 · 授权中心 · 密文核验 · 监管审计 · 密码工具箱',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'cockpit', label: '监管驾驶舱', render: tabCockpit },
      { key: 'alerts', label: '告警管理', render: tabAlerts },
      { key: 'trace', label: '身份追踪', render: tabTrace },
      { key: 'authz', label: '授权中心', render: tabAuthz },
      { key: 'inspect', label: '密文核验', render: tabInspect },
      { key: 'audit', label: '监管审计', render: tabAudit },
      { key: 'crypto', label: '密码工具箱', render: tabCrypto },
    ]));
  }

  /* ================= Tab 1：监管驾驶舱 ================= */
  function tabCockpit(box) {
    const b1 = h('div', {}, P.empty('⏳ 加载中…'));
    const b2 = h('div', {});
    const b3 = h('div', {});
    async function load() {
      b1.innerHTML = ''; b1.append(P.empty('⏳ 加载中…')); b2.innerHTML = ''; b3.innerHTML = '';
      const r = await API.call('/api/dashboard/summary', {});
      b1.innerHTML = '';
      if (!r.ok) { b1.append(P.errCard(r)); return; }
      const s = r.data;
      b1.append(
        h('div', { class: 'p-card-sub' }, '告警 alerts'),
        P.statCards([
          { label: '总数', value: s.alerts.total },
          { label: 'OPEN', value: s.alerts.open, tone: s.alerts.open ? 'serious' : '' },
          { label: '高危未处置', value: s.alerts.high_open, tone: s.alerts.high_open ? 'critical' : 'good' },
          { label: 'IDENTIFIED', value: s.alerts.identified },
          { label: 'REVIEWED', value: s.alerts.reviewed },
          { label: 'RESOLVED', value: s.alerts.resolved, tone: 'good' },
          { label: 'ARCHIVED', value: s.alerts.archived }]),
        h('div', { class: 'p-card-sub' }, '会话 sessions'),
        P.statCards([
          { label: '总数', value: s.sessions.total },
          { label: 'ACTIVE', value: s.sessions.active, tone: 'good' },
          { label: '已认证', value: s.sessions.authenticated },
          { label: 'DEGRADED', value: s.sessions.degraded, tone: s.sessions.degraded ? 'warning' : '' },
          { label: 'RECOVERED', value: s.sessions.recovered },
          { label: 'CLOSED', value: s.sessions.closed }]),
        h('div', { class: 'p-card-sub' }, '授权与攻防'),
        P.statCards([
          { label: '待批授权', value: s.authorizations.pending, tone: s.authorizations.pending ? 'warning' : '' },
          { label: '已授权', value: s.authorizations.authorized, tone: 'good' },
          { label: '已拒绝', value: s.authorizations.denied },
          { label: '已过期', value: s.authorizations.expired },
          { label: 'DETECT', value: s.wormhole_events.detect },
          { label: 'ISOLATE', value: s.wormhole_events.isolate },
          { label: 'RECOVER', value: s.wormhole_events.recover }]),
        h('p', { class: 'p-field-hint' }, '生成时间：' + s.generated_at));
      b2.append(P.hbars(Object.keys(s.alerts.by_type || {}).map(k =>
        ({ label: k, value: s.alerts.by_type[k] }))));
      b3.append(simpleTable([
        { title: '告警号', render: a => h('code', { class: 'p-mono' }, a.alert_id) },
        { title: '类型', render: a => P.badge(a.event_type) },
        { title: '风险', render: a => P.badge(a.risk_level) },
        { title: '状态', render: a => P.badge(a.status) },
      ], s.recent_alerts, '暂无告警'));
    }
    box.append(card('监管驾驶舱 dashboard/summary',
      P.actionBar([{ label: '⟳ 刷新', run: load }]), b1,
      h('div', { class: 'p-card-sub' }, '告警类型分布 by_type'), b2,
      h('div', { class: 'p-card-sub' }, '最近告警 recent_alerts'), b3));
    load();
  }

  /* ================= Tab 2：告警管理 ================= */
  const ALERT_TYPES = ['ROUTE_DEVIATION', 'INVALID_PASS', 'UNKNOWN_NODE_ACCESS',
    'MISSION_MISMATCH', 'WORMHOLE_ALERT', 'IDENTITY_ANOMALY'];
  const ALERT_FLOW = ['IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED'];
  function tabAlerts(box) {
    const tbl = P.dataTable({
      endpoint: '/api/alert/list',
      filters: [
        { name: 'event_type', label: '类型', type: 'select', options: ALERT_TYPES },
        { name: 'status', label: '状态', type: 'select',
          options: ['OPEN'].concat(ALERT_FLOW) },
        { name: 'risk_level', label: '风险级', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
        { name: 'source_system', label: '来源系统', type: 'select',
          options: ['SYSTEM1', 'SYSTEM2', 'SYSTEM3', 'MANUAL'] },
        { name: 'mission_id', label: '任务号', type: 'text' }],
      columns: [
        { title: '告警号', key: 'alert_id', mono: true },
        { title: '类型', render: r => P.badge(r.event_type) },
        { title: '风险级', render: r => P.badge(r.risk_level) },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '来源', key: 'source_system' },
        { title: '伪名', render: r => UI.trunc(r.uav_pseudonym, 14), mono: true },
        { title: '任务号', key: 'mission_id' },
        { title: '时间', key: 'created_at' }],
    });

    const rpR = P.resultPanel();
    const fR = P.form([
      { name: 'alert_id', label: '告警号', type: 'text', required: true, placeholder: 'ALERT-XXX' },
      { name: 'event_type', label: '事件类型', type: 'select', value: 'WORMHOLE_ALERT', options: ALERT_TYPES },
      { name: 'risk_level', label: '风险级', type: 'select', value: 'HIGH', options: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'source_system', label: '来源系统', type: 'select', value: 'SYSTEM2',
        options: ['SYSTEM1', 'SYSTEM2', 'SYSTEM3', 'MANUAL'],
        hint: 'SYSTEM1=任务协同 SYSTEM2=链下攻防 SYSTEM3=密文核查 MANUAL=人工' },
      { name: 'mission_id', label: '关联任务号', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'uav_pseudonym', label: '无人机伪名', type: 'text', required: true,
        hint: '匿名化登记：库中只存伪名+证据摘要，明文身份不出运营域' },
      { name: 'operator', label: '登记人', type: 'text', required: true, value: 'Regulator-A' },
    ]);
    box.append(card('告警登记 alert/raise（匿名化：伪名 + 证据摘要）', fR.root,
      P.actionBar([{ label: '登记告警', kind: 'primary', run: P.runOp({
        path: '/api/alert/raise',
        body: () => need(fR.read(), 'alert_id', 'event_type', 'risk_level',
          'source_system', 'mission_id', 'uav_pseudonym', 'operator'),
        rp: rpR, successText: '告警已登记（status=OPEN）',
        render: d => P.kv([
          ['告警号', d.alert_id], ['类型', P.badge(d.event_type)],
          ['风险级', P.badge(d.risk_level)], ['状态', P.badge(d.status)],
          ['伪名', monoTrunc(d.uav_pseudonym, 24)],
          ['证据摘要', monoTrunc(d.evidence_hash, 48)]]),
        note: { kind: 'ALERT', id: d => d.alert_id, extra: d => ({ mission_id: d.mission_id }) },
        onOk: () => tbl.reload() }) }]),
      rpR.root));

    const rpS = P.resultPanel();
    const fS = P.form([
      { name: 'alert_id', label: '告警号', type: 'text', required: true },
      { name: 'to_status', label: '推进到', type: 'select', value: 'IDENTIFIED', options: ALERT_FLOW },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Regulator-A' },
      { name: 'reason', label: '处置说明', type: 'textarea', required: true },
    ]);
    box.append(card('状态机推进 alert/status（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED）',
      fS.root,
      h('p', { class: 'p-field-hint' }, '线性推进：跨级或重复推进将被 6002 拒绝（设计内——状态机不可跳跃）。'),
      P.actionBar([{ label: '推进状态', kind: 'primary', run: P.runOp({
        path: '/api/alert/status',
        body: () => need(fS.read(), 'alert_id', 'to_status', 'operator', 'reason'),
        rp: rpS, successText: '状态已推进',
        render: d => P.kv([['告警号', d.alert_id], ['状态', P.badge(d.status)],
          ['更新时间', d.updated_at]]),
        note: { kind: 'ALERT', id: d => d.alert_id },
        onOk: () => tbl.reload() }) }]),
      rpS.root));

    box.append(card('告警台账 alert/list（五维过滤）', tbl));
  }

  /* ================= Tab 3：身份追踪 ================= */
  function traceView(d) {
    return h('div', {},
      h('div', { class: 'p-row' },
        h('span', { class: 'p-verdict p-tone-' + (d.resolved ? 'good' : 'critical') },
          d.resolved ? '✓ 全链可溯（break_level=0）' : '⛔ 第 ' + d.break_level + ' 级断链'),
        h('span', { class: 'p-badge p-tone-neutral' }, '入口 ' + d.entry_type + '：' + d.entry),
        h('span', { class: 'p-badge p-tone-neutral' }, '伪名 ' + d.pseudonym),
        h('span', { class: 'p-badge p-tone-neutral' }, '追踪耗时 ' + d.trace_latency_ms + 'ms')),
      h('ol', { class: 'p-trace' }, (d.levels || []).map(lv =>
        h('li', { class: 'p-trace-level' + (lv.status === 'BROKEN' ? ' broken' : '') },
          h('div', { class: 'p-trace-head' },
            h('b', {}, 'L' + lv.level + ' · ' + lv.name),
            P.badge(lv.status),
            h('span', { class: 'p-trace-src' }, lv.source + ' · ' + lv.latency_ms + 'ms')),
          h('div', { class: 'p-trace-val' }, lv.value ? monoTrunc(lv.value, 56) : '—'),
          lv.reason ? h('div', { class: 'p-trace-reason' }, '⛔ ' + lv.reason) : null))));
  }
  function tabTrace(box) {
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'entry_type', label: '入口类型', type: 'select', value: 'alert_id',
        options: [['alert_id', '告警号 alert_id'], ['pseudo', '无人机伪名 pseudo'],
          ['device_address', '设备地址 device_address']],
        hint: '三入口任选其一填写下方对应字段' },
      { name: 'alert_id', label: '告警号', type: 'text', placeholder: '入口=告警号时填写' },
      { name: 'pseudo', label: '伪名', type: 'text', placeholder: '入口=伪名时填写' },
      { name: 'device_address', label: '设备地址', type: 'text', placeholder: '入口=设备地址时填写' },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Regulator-A' },
    ]);
    box.append(card('七级身份追踪 trace/identity（ChainMaker 索引 → Fabric/FISCO 明细逐级展开）',
      f.root,
      P.actionBar([{ label: '开始追踪', kind: 'primary', run: P.runOp({
        path: '/api/trace/identity',
        body: () => {
          const v = need(f.read(), 'entry_type', 'operator');
          if (!v) return null;
          if (!v[v.entry_type]) { UI.toast('请填写入口字段：' + v.entry_type, 'err'); return null; }
          const b = { operator: v.operator };
          b[v.entry_type] = v[v.entry_type];
          return b;
        },
        rp,
        render: d => traceView(d),
        note: null,
        onOk: d => { if (d.pseudonym) UI.toast('伪名 ' + d.pseudonym + ' 已可作二次追踪入口'); } }) }]),
      rp.root,
      h('p', { class: 'p-field-hint' },
        '断链（5001）不是失败：断点位置与原因被完整留痕——「查不到」本身也是可审计的监管结论。')));
  }

  /* ================= Tab 4：授权中心 ================= */
  function tabAuthz(box) {
    const rpA = P.resultPanel();
    const fA = P.form([
      { name: 'authorization_id', label: '授权号', type: 'text', required: true, placeholder: 'AUTH-XXX' },
      { name: 'regulator_id', label: '申请人（监管员）', type: 'text', required: true, value: 'Regulator-A' },
      { name: 'target_type', label: '目标类型', type: 'select', value: 'MISSION',
        options: ['MISSION', 'UAV', 'ALERT'] },
      { name: 'target_id', label: '目标 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'scope', label: '授权范围（多选）', type: 'multi', required: true, value: ['ROUTE', 'PAYLOAD'],
        options: ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY', 'EVIDENCE'],
        hint: '范围最小化：开箱时仅所见即所批' },
      { name: 'reason', label: '申请事由', type: 'textarea', required: true },
    ]);
    box.append(card('授权申请 authorize/apply（审计摘要前置生成）', fA.root,
      P.actionBar([{ label: '提交申请', kind: 'primary', run: P.runOp({
        path: '/api/authorize/apply',
        body: () => need(fA.read(), 'authorization_id', 'regulator_id', 'target_type',
          'target_id', 'scope', 'reason'),
        rp: rpA, successText: '授权申请已提交（PENDING）',
        render: d => P.kv([
          ['授权号', d.authorization_id], ['状态', P.badge(d.status)],
          ['目标', d.target_type + ' · ' + d.target_id],
          ['范围', scopeText(d.scope)],
          ['有效窗', d.valid_from + ' → ' + d.valid_to],
          ['审计摘要', monoTrunc(d.audit_hash, 48)]]),
        note: { kind: 'AUTHORIZATION', id: d => d.authorization_id,
          extra: d => ({ target_id: d.target_id }) } }) }]),
      rpA.root));

    const rpR = P.resultPanel();
    const fR = P.form([
      { name: 'authorization_id', label: '授权号', type: 'text', required: true },
      { name: 'reviewer_id', label: '审批人', type: 'text', required: true, value: 'Regulator-B' },
      { name: 'decision', label: '决定', type: 'select', value: 'APPROVE', options: ['APPROVE', 'DENY'] },
      { name: 'comment', label: '批注', type: 'textarea' },
    ]);
    box.append(card('授权审批 authorize/review（APPROVE 审计摘要上链 ChainMaker）', fR.root,
      h('p', { class: 'p-field-hint' }, '已审授权重复审批将被 6002 拒绝（设计内）。'),
      P.actionBar([{ label: '提交审批', kind: 'primary',
        confirm: { title: '提交审批', msg: '审批结果将上链存证，不可撤销。确认？', ok: '提交' },
        run: P.runOp({
          path: '/api/authorize/review',
          body: () => need(fR.read(), 'authorization_id', 'reviewer_id', 'decision'),
          rp: rpR, successText: '审批完成，审计摘要已上链',
          render: d => h('div', {},
            P.kv([
              ['授权状态', P.badge(d.auth.status)],
              ['范围', scopeText(d.auth.scope)],
              ['审计动作', d.audit.action],
              ['审计号', monoTrunc(d.audit.audit_id, 32)],
              ['链上存证', monoTrunc(d.chain_tx_id, 48)]]),
            P.chainTag('chainmaker')),
          note: { kind: 'AUTHORIZATION', id: d => d.auth.authorization_id } }) }]),
      rpR.root));
  }

  /* ================= Tab 5：密文核验 ================= */
  function inspectView(d) {
    return h('div', {},
      h('div', { class: 'p-row' },
        h('span', { class: 'p-verdict p-tone-good' }, '✓ 已授权开箱'),
        h('span', { class: 'p-badge p-tone-neutral' },
          '授权范围 scope[' + (d.scope || []).length + ']：' + (d.scope || []).join('、'))),
      h('div', { class: 'p-card-sub' }, '明文视图 decrypted_view'),
      P.kv(decryptedPairs(d.decrypted_view)),
      h('div', { class: 'p-card-sub' }, '双重验证 verification'),
      P.kv([
        ['SM3 摘要一致 digest_match', d.verification.digest_match ? '✓ 一致' : '✕ 不一致'],
        ['SM9 签名有效 signature_valid', d.verification.signature_valid ? '✓ 有效' : '✕ 无效'],
        ['审计摘要 audit_hash', monoTrunc(d.verification.audit_hash, 48)]]),
      h('div', { class: 'p-card-sub' }, '一致性结论 conclusion（已上链）'),
      P.kv([
        ['航迹核查 route_verdict', P.badge(d.conclusion.route_verdict)],
        ['载荷核查 payload_verdict', P.badge(d.conclusion.payload_verdict)],
        ['触发告警 raised_alerts', (d.conclusion.raised_alerts || []).join('、') || '无']]),
      h('div', { class: 'p-card-sub' }, '任务档案（密文字段仍不可见，仅脱敏值）'),
      P.kv([
        ['任务号', d.mission.mission_id], ['脱敏值', d.mission.masked_value],
        ['运营商', d.mission.operator_id], ['类型', d.mission.mission_type],
        ['高度层(m)', d.mission.altitude_min + ' – ' + d.mission.altitude_max]]),
      P.kv([
        ['结论存证 chain_tx_id', monoTrunc(d.chain_tx_id, 48)],
        ['监管审计号 reg_audit_id', d.reg_audit_id]]));
  }
  function tabInspect(box) {
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'regulator_id', label: '监管员', type: 'text', required: true, value: 'Regulator-A' },
      { name: 'authorization_id', label: '授权号（留空=未授权尝试）', type: 'text',
        placeholder: '留空将被 5002 封缄拒绝——这正是隐私保护的证明' },
      { name: 'payload_type', label: '申报载荷类型（可选）', type: 'text',
        placeholder: '与任务实际载荷比对，影响 payload_verdict' },
      { name: 'trajectory', label: '申报航迹（可选）', type: 'text',
        placeholder: '与任务航段比对，影响 route_verdict' },
    ]);
    box.append(card('密文核验 inspect/ciphertext（未授权=封缄视图；授权=开箱+双验证+结论上链）',
      f.root,
      P.actionBar([{ label: '执行核验', kind: 'primary', run: async () => {
        const v = need(f.read(), 'mission_id', 'regulator_id');
        if (!v) return;
        const r = await API.call('/api/inspect/ciphertext', v);
        if (r.code === 5002) {
          /* 未授权：错误卡 + 封缄视图（sealed 在错误响应的 data 里） */
          rp.root.innerHTML = '';
          rp.root.append(P.metaLine(r), P.errCard(r));
          const s = (r.data && r.data.sealed) || {};
          rp.root.append(h('div', { class: 'p-sealed' },
            h('div', { class: 'p-card-sub' }, '🔒 封缄视图 sealed（未授权——只可见元信息，明文不可见）'),
            P.kv([
              ['任务号', s.mission_id || v.mission_id],
              ['密文状态', s.ciphertext_status],
              ['has_ciphertext', String(s.has_ciphertext)],
              ['脱敏值', s.masked_value],
              ['SM3 摘要', monoTrunc(s.sm3_hash, 48)]])));
          rp.root.append(h('details', { class: 'p-rawjson' },
            h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
          return;
        }
        rp.show(r, d => inspectView(d));
        if (r.ok) STORE.note('MISSION', r.data.mission.mission_id);
      } }]), rp.root));
  }

  /* ================= Tab 6：监管审计 ================= */
  function tabAudit(box) {
    box.append(card('监管审计台账 regulatory/audit/list（INSPECT / AUTH_APPROVE 等监管动作留痕）',
      P.actionBar([P.csvExport({ endpoint: '/api/regulatory/audit/export',
        filename: 'regulatory-audit.csv', label: '⤓ 导出监管审计 CSV' })]),
      P.dataTable({
        endpoint: '/api/regulatory/audit/list',
        filters: [
          { name: 'alert_id', label: '告警号', type: 'text' },
          { name: 'authorization_id', label: '授权号', type: 'text' },
          { name: 'action', label: '动作', type: 'text', placeholder: '如 INSPECT' },
          { name: 'operator_id', label: '操作员', type: 'text' }],
        columns: [
          { title: '审计号', render: r => UI.trunc(r.audit_id, 18), mono: true },
          { title: '动作', key: 'action' },
          { title: '告警号', render: r => r.alert_id || '—' },
          { title: '授权号', render: r => r.authorization_id || '—' },
          { title: '操作员', key: 'operator_id' },
          { title: '审计摘要', render: r => UI.trunc(r.audit_hash, 16), mono: true },
          { title: '链上存证', render: r => r.chain_tx_id ? UI.trunc(r.chain_tx_id, 16) : '—', mono: true },
          { title: '时间', key: 'created_at' }],
        emptyText: '暂无监管审计记录',
      })));
    box.append(card('全域审计 audit/query（业务号/动作/行为人三维过滤）',
      P.actionBar([P.csvExport({ endpoint: '/api/audit/export',
        filename: 'audit-all.csv', label: '⤓ 导出全域审计 CSV' })]),
      P.dataTable({
        endpoint: '/api/audit/query',
        filters: [
          { name: 'business_id', label: '业务号', type: 'text' },
          { name: 'action', label: '动作', type: 'text' },
          { name: 'actor', label: '行为人', type: 'text' }],
        columns: [
          { title: 'trace_id', render: r => UI.trunc(r.trace_id, 16), mono: true },
          { title: '行为人', key: 'actor' },
          { title: '动作', key: 'action' },
          { title: '目标', render: r => (r.target_type || '') + (r.target_id ? ' · ' + r.target_id : '') },
          { title: '明细', render: r => UI.trunc(r.detail, 30) },
          { title: '时间', key: 'created_at' }],
        emptyText: '暂无审计记录',
      })));
  }

  /* ================= Tab 7：密码工具箱 ================= */
  const PAYLOAD_SAMPLE = '{"mission_id":"MISSION-DEMO","operator_id":"Operator-A","altitude_max":300}';
  function tabCrypto(box) {
    const rp1 = P.resultPanel();
    const f1 = P.form([
      { name: 'payload', label: 'payload JSON', type: 'textarea', required: true, value: PAYLOAD_SAMPLE }]);
    box.append(card('SM3 规范化摘要 crypto/sm3（canonical 化后哈希——字段顺序不影响摘要）', f1.root,
      P.actionBar([{ label: '计算摘要', run: P.runOp({
        path: '/api/crypto/sm3',
        body: () => {
          const v = need(f1.read(), 'payload'); if (!v) return null;
          const p = parsePayload(v.payload); if (!p) return null;
          return { payload: p };
        },
        rp: rp1,
        render: d => h('div', {},
          P.kv([['SM3 摘要', monoTrunc(d.sm3_hash, 64)]]),
          h('div', { class: 'p-card-sub' }, '规范化串 canonical'),
          h('pre', { class: 'p-canon' }, d.canonical)) }) }]),
      rp1.root));

    const rp2 = P.resultPanel();
    const f2 = P.form([{ name: 'entity_id', label: '实体 ID', type: 'text', required: true,
      value: 'UAV-DEMO-001' }]);
    box.append(card('SM9 身份密钥 crypto/sm9/keygen', f2.root,
      P.actionBar([{ label: '生成身份', run: P.runOp({
        path: '/api/crypto/sm9/keygen', body: () => need(f2.read(), 'entity_id'), rp: rp2,
        render: d => P.kv([['SM9 身份', monoTrunc(d.sm9_identity, 64)]]) }) }]),
      rp2.root));

    const rp3 = P.resultPanel();
    const f3 = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true },
      { name: 'payload', label: 'payload JSON', type: 'textarea', required: true, value: PAYLOAD_SAMPLE }]);
    box.append(card('SM9 签名 crypto/sm9/sign（先 SM3 摘要再签）', f3.root,
      P.actionBar([{ label: '签名', run: P.runOp({
        path: '/api/crypto/sm9/sign',
        body: () => {
          const v = need(f3.read(), 'sm9_identity', 'payload'); if (!v) return null;
          const p = parsePayload(v.payload); if (!p) return null;
          return { sm9_identity: v.sm9_identity, payload: p };
        },
        rp: rp3,
        render: d => P.kv([['签名', monoTrunc(d.signature, 64)],
          ['SM3 摘要', monoTrunc(d.sm3_hash, 64)]]) }) }]),
      rp3.root));

    const rp4 = P.resultPanel();
    const f4 = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true },
      { name: 'signature', label: '签名', type: 'text', required: true },
      { name: 'payload', label: 'payload JSON', type: 'textarea', required: true, value: PAYLOAD_SAMPLE,
        hint: '篡改演示：把 payload 里任一字符改掉再验签 → valid=false（设计内——篡改必现形）' }]);
    box.append(card('SM9 验签 crypto/sm9/verify', f4.root,
      P.actionBar([{ label: '验签', kind: 'primary', run: P.runOp({
        path: '/api/crypto/sm9/verify',
        body: () => {
          const v = need(f4.read(), 'sm9_identity', 'signature', 'payload'); if (!v) return null;
          const p = parsePayload(v.payload); if (!p) return null;
          return { sm9_identity: v.sm9_identity, signature: v.signature, payload: p };
        },
        rp: rp4,
        render: d => h('div', {},
          P.statCards([{ label: 'valid', value: String(d.valid),
            tone: d.valid ? 'good' : 'critical' }]),
          P.kv(Object.keys(d).filter(k => k !== 'valid').map(k =>
            [k, typeof d[k] === 'object' ? JSON.stringify(d[k]) : String(d[k])]))) }) }]),
      rp4.root));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-regulator'] = { render };
})();
