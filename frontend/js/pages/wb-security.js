/* wb-security.js —— 链网安全运营中心 #/wb-security：拓扑 / 会话 / 流量 / 攻防 / 实验。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '');
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));
  const splitList = s => String(s || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);

  function render(root) {
    root.append(P.pageHead({
      title: '链网安全运营中心',
      sub: '链下可信网络：拓扑与会话 · 消息流量与时延 · 虫洞攻防处置 · 性能实验',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'topo', label: '网络拓扑', render: tabTopo },
      { key: 'sessions', label: '会话监控', render: tabSessions },
      { key: 'traffic', label: '消息流量', render: tabTraffic },
      { key: 'drill', label: '攻防演练', render: tabDrill },
      { key: 'lab', label: '性能实验', render: tabLab },
    ]));
  }

  /* ================= Tab 1：网络拓扑 ================= */
  function tabTopo(box) {
    const svgBox = h('div', { class: 'p-topo-box' }, P.empty('⏳ 加载拓扑…'));
    const metaBox = h('div', { class: 'p-row' });
    async function loadTopo() {
      svgBox.innerHTML = ''; svgBox.append(P.empty('⏳ 加载拓扑…')); metaBox.innerHTML = '';
      const r = await API.call('/api/topology/get', {});
      svgBox.innerHTML = '';
      if (!r.ok) { svgBox.append(P.errCard(r)); return; }
      const t = r.data;
      svgBox.append(P.topoSVG(t, null));
      metaBox.append(
        h('span', { class: 'p-badge ' + (t.wormhole_enabled ? 'p-tone-critical' : 'p-tone-good') },
          t.wormhole_enabled ? '⚠ 虫洞开启' : '● 虫洞关闭'),
        h('span', { class: 'p-badge p-tone-neutral' }, '活跃会话 ' + t.active_sessions),
        h('span', { class: 'p-badge p-tone-neutral' },
          '节点 ' + t.nodes.length + ' · 边 ' + t.edges.length),
        (t.isolated && t.isolated.length)
          ? h('span', { class: 'p-badge p-tone-critical' }, '⛔ 隔离中：' + t.isolated.join('、'))
          : null);
    }
    const rpWh = P.resultPanel();
    box.append(card('实时拓扑 topology/get（悬停边看距离/时延；⛔ 红虚线=被隔离节点）',
      P.actionBar([
        { label: '⟳ 刷新拓扑', run: loadTopo },
        { label: '开启虫洞攻击', kind: 'danger',
          confirm: { title: '开启虫洞', msg: '将在 NODE-X/Y 间建立攻击隧道，后续消息可能被诱入。确认？', ok: '开启' },
          run: P.runOp({ path: '/api/wormhole/toggle',
            body: () => ({ enabled: true, operator: 'SecOps' }), rp: rpWh,
            successText: '虫洞已开启',
            render: d => P.kv([['wormhole_enabled', String(d.wormhole_enabled)],
              ['受影响节点', (d.nodes_affected || []).join('、')]]),
            onOk: loadTopo }) },
        { label: '关闭虫洞', run: P.runOp({ path: '/api/wormhole/toggle',
          body: () => ({ enabled: false, operator: 'SecOps' }), rp: rpWh,
          successText: '虫洞已关闭', onOk: loadTopo }) },
      ]),
      rpWh.root, metaBox, svgBox));

    /* --- 节点注册 --- */
    const rpNd = P.resultPanel();
    const fNd = P.form([
      { name: 'node_id', label: '节点 ID', type: 'text', required: true,
        hint: '无人机端节点约定 <uav_id>-NODE（会话建立缺省源节点）' },
      { name: 'node_type', label: '类型', type: 'select', value: 'UAV',
        options: ['UAV', 'EDGE', 'MANAGEMENT', 'ATTACKER'] },
      { name: 'posX', label: '坐标 X', type: 'number', value: 0 },
      { name: 'posY', label: '坐标 Y', type: 'number', value: 0 },
      { name: 'neighbors', label: '邻居（逗号分隔）', type: 'text', placeholder: '如 N1；图为无向，单边声明即连通' },
      { name: 'status', label: '初始状态', type: 'select', value: 'ONLINE', options: ['ONLINE', 'OFFLINE'],
        hint: 'ISOLATED 由攻防处置产生，注册不可指定' },
    ]);
    const tblNd = P.dataTable({
      endpoint: '/api/node/list',
      filters: [
        { name: 'node_type', label: '类型', type: 'select', options: ['UAV', 'EDGE', 'MANAGEMENT', 'ATTACKER'] },
        { name: 'status', label: '状态', type: 'select', options: ['ONLINE', 'OFFLINE', 'ISOLATED'] }],
      columns: [
        { title: '节点 ID', key: 'node_id', mono: true },
        { title: '类型', key: 'node_type' },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '风险分', key: 'risk_score', num: true },
        { title: '邻居', render: r => r.neighbors },
        { title: 'SM9 身份', render: r => UI.trunc(r.sm9_identity, 20), mono: true }],
      onLoaded: () => loadTopo(),
    });
    box.append(card('节点注册 node/register（SM9 身份未提供时自动派生）', fNd.root,
      P.actionBar([{ label: '注册节点', kind: 'primary', run: P.runOp({
        path: '/api/node/register',
        body: () => {
          const v = need(fNd.read(), 'node_id', 'node_type');
          if (!v) return null;
          return { node_id: v.node_id, node_type: v.node_type,
            position: { X: Number(v.posX) || 0, Y: Number(v.posY) || 0 },
            neighbors: splitList(v.neighbors), status: v.status || 'ONLINE' };
        },
        rp: rpNd, successText: '节点已注册',
        render: d => P.kv([
          ['节点 ID', d.node_id], ['类型', d.node_type], ['状态', P.badge(d.status)],
          ['SM9 身份', monoTrunc(d.sm9_identity, 36)], ['风险分', String(d.risk_score)]]),
        note: { kind: 'NODE', id: d => d.node_id, extra: d => ({ node_type: d.node_type }) },
        onOk: () => tblNd.reload() }) }]),
      rpNd.root, tblNd));
    loadTopo();
  }

  /* ================= Tab 2：会话监控 ================= */
  function tabSessions(box) {
    const tbl = P.dataTable({
      endpoint: '/api/session/list',
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['ACTIVE', 'DEGRADED', 'RECOVERED', 'CLOSED'] }],
      columns: [
        { title: '会话 ID', render: r => UI.trunc(r.session_id, 20), mono: true },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '任务号', key: 'mission_id' },
        { title: '许可号', key: 'pass_id' },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '当前路径', render: r => UI.trunc(r.current_path, 30), mono: true },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          disabled: r.status === 'CLOSED',
          onClick: e => { e.stopPropagation(); closeSession(r.session_id, () => tbl.reload()); } }, '关闭') },
      ],
    });
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true,
        hint: '缺省源节点 <uav_id>-NODE；该节点须已在拓扑注册' },
      { name: 'mission_id', label: '任务号（可选）', type: 'text' },
      { name: 'pass_id', label: '许可号（可选）', type: 'text' },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省 <uav_id>-NODE' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省 MGR' },
    ]);
    box.append(card('会话建立 session/open（SM9 挑战认证 + Dijkstra 初始可信路径）', f.root,
      P.actionBar([{ label: '建立会话', kind: 'primary', run: P.runOp({
        path: '/api/session/open', body: () => need(f.read(), 'uav_id'), rp,
        successText: '会话已建立（挑战认证通过）',
        render: d => h('div', {},
          P.kv([
            ['会话 ID', h('code', { class: 'p-mono' }, d.session.session_id)],
            ['状态', P.badge(d.session.status)],
            ['认证结论', d.auth.verified ? '✓ SM9 挑战通过' : '✕ 未通过'],
            ['SM9 身份', monoTrunc(d.auth.sm9_identity, 36)],
            ['nonce', monoTrunc(d.auth.nonce, 24)],
            ['初始路径', (d.path || []).join(' → ')]]),
          h('p', { class: 'p-field-hint' },
            '虫洞开启期间建立的会话，初始路径可能已含隧道边——正是后续检测演练的前提。')),
        note: { kind: 'SESSION', id: d => d.session.session_id,
          extra: d => ({ uav_id: d.session.uav_id, mission_id: d.session.mission_id }) },
        onOk: () => tbl.reload() }) }]),
      rp.root, card('会话台账 session/list', tbl)));
  }
  function closeSession(sessionId, onDone) {
    P.confirm('关闭会话', '关闭后该会话再发消息将被 4002 拒绝（设计内）。确认关闭 ' + sessionId + '？', '关闭会话')
      .then(async ok => {
        if (!ok) return;
        const r = await API.call('/api/session/close',
          { session_id: sessionId, operator: 'SecOps', reason: '手动关闭' });
        UI.toastResult(r);
        if (r.ok) { STORE.note('SESSION', r.data.session_id); if (onDone) onDone(); }
      });
  }

  /* ================= Tab 3：消息流量 ================= */
  function tabTraffic(box) {
    const statsBox = h('div', {});
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'session_id', label: '会话 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'msg_type', label: '消息类型', type: 'select', value: 'HEARTBEAT',
        options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省会话路径首端' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省会话路径末端' },
    ]);
    const tbl = P.dataTable({
      endpoint: '/api/message/list',
      filters: [
        { name: 'session_id', label: '会话', type: 'text' },
        { name: 'msg_type', label: '类型', type: 'select',
          options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
        { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] }],
      columns: [
        { title: '消息 ID', render: r => UI.trunc(r.message_id, 18), mono: true },
        { title: '类型', render: r => P.badge(r.msg_type) },
        { title: '路径', render: r => UI.trunc(r.source_node + ' → ' + r.target_node, 26), mono: true },
        { title: 'seq', key: 'seq', num: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '时间', key: 'created_at' }],
      onRow: rec => {
        P.drawer('消息 ' + rec.message_id,
          P.kv([['会话', rec.session_id], ['类型', P.badge(rec.msg_type)],
            ['seq', String(rec.seq)], ['时延', rec.latency_ms + 'ms'],
            ['实际路径', rec.path], ['SM3 摘要', UI.trunc(rec.sm3_hash, 48)]]),
          h('details', { class: 'p-rawjson' }, h('summary', {}, 'evidence / 原始 JSON'),
            UI.jsonBlock(rec)));
      },
      onLoaded: (recs, d) => {
        statsBox.innerHTML = '';
        const s = d.stats;
        if (!s) return;
        statsBox.append(P.statCards([
          { label: '消息数', value: s.count },
          { label: '成功率', value: s.success_rate + '%', tone: s.success_rate >= 99 ? 'good' : 'warning' },
          { label: 'p50', value: s.p50_latency_ms + 'ms' },
          { label: 'p95', value: s.p95_latency_ms + 'ms' },
          { label: 'max', value: s.max_latency_ms + 'ms', tone: 'info' },
        ]));
      },
    });
    box.append(card('消息发送 message/send（亚秒级链下通道，返回逐跳时延 path_detail）', f.root,
      P.actionBar([{ label: '发送消息', kind: 'primary', run: P.runOp({
        path: '/api/message/send', body: () => need(f.read(), 'session_id', 'msg_type'), rp,
        render: d => h('div', {},
          P.kv([
            ['消息 ID', monoTrunc(d.message.message_id, 28)],
            ['类型', P.badge(d.message.msg_type)],
            ['seq', String(d.message.seq)],
            ['时延', d.message.latency_ms + 'ms'],
            ['实际路径', d.message.path]]),
          h('div', { class: 'p-card-sub' }, '逐跳时延 path_detail'),
          P.pathHops(d.path_detail)),
        onOk: () => tbl.reload() }) }]),
      rp.root));
    box.append(card('流量统计 message/list stats', statsBox));
    box.append(card('消息台账 message/list（点行看详情）', tbl));
  }

  /* ================= Tab 4：攻防演练 ================= */
  function tabDrill(box) {
    const rpWh = P.resultPanel();
    box.append(card('虫洞攻击开关 wormhole/toggle（NODE-X ⇄ NODE-Y 隧道）',
      h('p', { class: 'p-field-hint' },
        'X/Y 一旦被隔离（ISOLATED），重开虫洞将被 4001 拒绝——残留只能由 demo/reset 复原（设计内：隔离是不可绕过的处置）。'),
      P.actionBar([
        { label: '开启虫洞', kind: 'danger',
          confirm: { title: '开启虫洞攻击', msg: '在 NODE-X/Y 间建立攻击隧道？', ok: '开启' },
          run: P.runOp({ path: '/api/wormhole/toggle',
            body: () => ({ enabled: true, operator: 'SecOps' }), rp: rpWh,
            render: d => P.kv([['wormhole_enabled', String(d.wormhole_enabled)],
              ['受影响节点', (d.nodes_affected || []).join('、')]]) }) },
        { label: '关闭虫洞', run: P.runOp({ path: '/api/wormhole/toggle',
          body: () => ({ enabled: false, operator: 'SecOps' }), rp: rpWh,
          render: d => P.kv([['wormhole_enabled', String(d.wormhole_enabled)]]) }) },
      ]), rpWh.root));

    const rpRk = P.resultPanel();
    const fRk = P.form([{ name: 'session_id', label: '会话 ID', type: 'text', required: true }]);
    box.append(card('会话风险评估 risk/evaluate（5 维评分 + 阈值判定 PASS/DETECT）', fRk.root,
      P.actionBar([{ label: '评估', kind: 'primary', run: P.runOp({
        path: '/api/risk/evaluate', body: () => need(fRk.read(), 'session_id'), rp: rpRk,
        render: d => h('div', {},
          h('div', { class: 'p-row' },
            h('span', { class: 'p-verdict p-tone-' + (d.verdict === 'PASS' ? 'good' : 'critical') },
              d.verdict === 'PASS' ? '✓ PASS 无异常' : '⚠ DETECT 检出攻击'),
            h('span', { class: 'p-badge p-tone-neutral' },
              'risk_score ' + Number(d.risk_score).toFixed(2) + ' / 阈值 ' + d.threshold),
            P.badge(d.session_status)),
          P.scoreBars(d.dimensions, d.threshold),
          (d.events && d.events.length)
            ? h('div', {}, h('div', { class: 'p-card-sub' }, '联动安全事件'),
                ...d.events.map(ev => P.kv([
                  ['动作', P.badge(ev.action)], ['X / Y 节点', ev.node_x + ' / ' + ev.node_y],
                  ['风险分', String(ev.risk_score)]])))
            : null) }) }]),
      rpRk.root));

    const rpSw = P.resultPanel();
    const fSw = P.form([
      { name: 'session_id', label: '会话 ID', type: 'text', required: true },
      { name: 'operator', label: '操作人', type: 'text', value: 'SecOps' },
    ]);
    box.append(card('路径规避切换 path/switch（仅 DEGRADED 会话可切；健康会话被拒 4002=设计内）', fSw.root,
      P.actionBar([{ label: '切换路径', kind: 'primary', run: P.runOp({
        path: '/api/path/switch', body: () => need(fSw.read(), 'session_id'), rp: rpSw,
        successText: '路径已切换，会话恢复',
        render: d => P.kv([
          ['原路径', d.original_path], ['新路径', d.new_path],
          ['恢复时延', d.recovery_latency_ms + 'ms'],
          ['会话状态', P.badge(d.session && d.session.status)],
          ['事件动作', d.event ? P.badge(d.event.action) : '—']]),
        note: { kind: 'SESSION', id: d => (d.session && d.session.session_id) || '' } }) }]),
      rpSw.root));

    box.append(card('安全事件台账 event/list（DETECT / ISOLATE / RECOVER 全程留痕）',
      P.dataTable({
        endpoint: '/api/event/list',
        filters: [
          { name: 'session_id', label: '会话', type: 'text' },
          { name: 'action', label: '动作', type: 'select', options: ['DETECT', 'ISOLATE', 'RECOVER'] }],
        columns: [
          { title: '事件 ID', render: r => UI.trunc(r.event_id, 18), mono: true },
          { title: '动作', render: r => P.badge(r.action) },
          { title: 'X / Y', render: r => r.node_x + ' / ' + r.node_y, mono: true },
          { title: '风险分', key: 'risk_score', num: true },
          { title: '恢复时延(ms)', key: 'recovery_latency_ms', num: true },
          { title: '时间', key: 'created_at' }],
        onRow: rec => P.drawer('安全事件 ' + rec.event_id,
          P.kv([['会话', rec.session_id], ['动作', P.badge(rec.action)],
            ['X / Y', rec.node_x + ' / ' + rec.node_y], ['风险分', String(rec.risk_score)],
            ['原路径', rec.original_path || '—'], ['新路径', rec.new_path || '—'],
            ['恢复时延', (rec.recovery_latency_ms ?? '—') + 'ms']]),
          h('details', { class: 'p-rawjson' }, h('summary', {}, '5 维评分 / 原始 JSON'),
            UI.jsonBlock(rec))),
        emptyText: '暂无安全事件',
      })));
  }

  /* ================= Tab 5：性能实验 ================= */
  const EXP_TYPES = ['CROSSCHAIN_LOOP', 'SM3_INTEGRITY', 'SM9_VERIFY', 'CONFLICT_DETECT',
    'MESSAGE_FLOW', 'RISK_SCAN', 'STRESS', 'TRACE_BATCH', 'INSPECT_UNAUTHORIZED',
    'INSPECT_AUTHORIZED', 'ALERT_BATCH'];
  function tabLab(box) {
    const tbl = P.dataTable({
      endpoint: '/api/experiment/list',
      columns: [
        { title: 'run_id', render: r => UI.trunc(r.run_id, 18), mono: true },
        { title: '类型', key: 'experiment_type' },
        { title: '场景', render: r => r.scenario || '—' },
        { title: 'count', key: 'count', num: true },
        { title: '成功率', render: r => r.success_rate + '%', num: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '开始时间', key: 'started_at' },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); openExp(r.run_id); } }, '结果') }],
    });
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'experiment_type', label: '实验类型', type: 'select', value: 'MESSAGE_FLOW', options: EXP_TYPES },
      { name: 'scenario', label: '场景（仅 MESSAGE_FLOW）', type: 'select', value: 'NORMAL',
        options: ['NORMAL', 'ATTACK', 'DEFENSE'],
        hint: '双向严格：MESSAGE_FLOW 必填其一，其余类型必须留空——非 MESSAGE_FLOW 时本字段自动不发送' },
      { name: 'count', label: '样本数 count（1..1000）', type: 'number', value: 10 },
      { name: 'concurrency', label: '并发（1..20，可选）', type: 'number' },
      { name: 'config', label: 'config JSON（可选）', type: 'textarea', placeholder: '{"key":"value"}' },
    ]);
    box.append(card('运行实验 experiment/run（11 类）', f.root,
      P.actionBar([{ label: '运行', kind: 'primary', run: P.runOp({
        path: '/api/experiment/run',
        body: () => {
          const v = need(f.read(), 'experiment_type', 'count');
          if (!v) return null;
          const body = { experiment_type: v.experiment_type, count: Number(v.count) };
          if (v.experiment_type === 'MESSAGE_FLOW') {
            if (!v.scenario) { UI.toast('MESSAGE_FLOW 必须选择场景 NORMAL/ATTACK/DEFENSE', 'err'); return null; }
            body.scenario = v.scenario;
          }
          if (v.concurrency) body.concurrency = Number(v.concurrency);
          if (v.config) {
            try { body.config = JSON.parse(v.config); }
            catch (_) { UI.toast('config 不是合法 JSON', 'err'); return null; }
          }
          return body;
        },
        rp, successText: '实验完成',
        render: d => h('div', {},
          P.statCards([
            { label: '成功率', value: d.success_rate + '%', tone: d.success_rate >= 99 ? 'good' : 'warning' },
            { label: '样本数', value: d.count },
            { label: '失败数', value: d.failed_count, tone: d.failed_count > 0 ? 'critical' : 'good' }]),
          P.kv([
            ['run_id', monoTrunc(d.run_id, 32)], ['类型 / 场景', d.experiment_type + ' / ' + (d.scenario || '—')],
            ['状态', P.badge(d.status)],
            ['时延 avg/p50/p95/max', [d.avg_latency_ms, d.p50_latency_ms, d.p95_latency_ms, d.max_latency_ms].join(' / ') + 'ms'],
            ['失败原因', (d.failure_reasons || []).join('；') || '无']]),
          (d.experiment_type === 'MESSAGE_FLOW' && d.scenario === 'ATTACK')
            ? h('p', { class: 'p-field-hint' }, 'ATTACK 场景的低成功率恰是检测体系生效的证明。') : null),
        onOk: () => tbl.reload() }) }]),
      rp.root));

    const fEx = P.form([{ name: 'run_id', label: 'run_id（留空=导出全部）', type: 'text' }]);
    box.append(card('实验台账与导出 experiment/list · experiment/export',
      fEx.root,
      P.csvExport({ endpoint: '/api/experiment/export', filters: () => fEx.read(),
        filename: 'experiments.csv', label: '⤓ 导出实验 CSV' }),
      tbl));
  }
  async function openExp(runId) {
    const d = P.drawer('实验结果 ' + runId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/experiment/result', { run_id: runId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const x = r.data;
    body.append(
      P.statCards([
        { label: '成功率', value: x.success_rate + '%', tone: x.success_rate >= 99 ? 'good' : 'warning' },
        { label: '成功 / 失败', value: x.success_count + ' / ' + x.failed_count }]),
      P.kv([
        ['run_id', monoTrunc(x.run_id, 40)],
        ['类型 / 场景', x.experiment_type + ' / ' + (x.scenario || '—')],
        ['count', String(x.count)], ['状态', P.badge(x.status)],
        ['时延 avg', x.avg_latency_ms + 'ms'], ['p50', x.p50_latency_ms + 'ms'],
        ['p95', x.p95_latency_ms + 'ms'], ['max', x.max_latency_ms + 'ms'],
        ['失败原因', (x.failure_reasons || []).join('；') || '无'],
        ['开始 / 完成', x.started_at + ' → ' + x.completed_at],
        ['config', x.config ? JSON.stringify(x.config) : '—']]),
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-security'] = { render };
})();
