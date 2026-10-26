/* overview.js —— 平台总览 #/overview：四链状态、核心指标、跨链流水、告警摘要、演示维护。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function statChain(name, chainKey, v) {
    const st = typeof v === 'string' ? v : (v && (v.status || v.state)) || 'UNKNOWN';
    return h('div', { class: 'p-stat' },
      h('div', { class: 'p-stat-label' }, name),
      h('div', { class: 'p-row' }, P.chainTag(chainKey), P.badge(st)));
  }

  function render(root) {
    root.append(P.pageHead({
      title: '平台总览',
      sub: '四链状态 · 核心指标 · 跨链流水 · 告警摘要 · 演示维护',
      actions: [h('button', { class: 'p-btn',
        onClick: () => { root.innerHTML = ''; render(root); } }, '刷新全部')],
    }));
    root.append(P.chipBar());

    /* --- 四链状态条 --- */
    const chainBox = h('div', { class: 'p-stats' }, P.empty('正在加载四链状态…'));
    const rpHealth = P.resultPanel();
    root.append(card('四链运行状态', chainBox,
      P.actionBar([{ label: '健康自检', run: async () => {
        const r = await API.call('/api/health/check', {});
        rpHealth.show(r, d => P.kv([
          ['数据库', d.database],
          ['Fabric 运营链', d.chains && d.chains.fabric],
          ['ChainMaker 监管链', d.chains && d.chains['chainmaker']],
          ['FISCO BCOS 管理链', d.chains && d.chains['fisco-bcos']],
          ['IRITA 证照链', d.chains && d.chains.irita],
        ]));
      } }]), rpHealth.root));
    API.call('/api/chain/status', {}).then(r => {
      chainBox.innerHTML = '';
      if (!r.ok) { chainBox.append(P.errCard(r)); return; }
      const cs = r.data.chains || {};
      chainBox.append(
        statChain('监管链（不可绕过的枢纽）', 'chainmaker', cs['chainmaker']),
        statChain('运营链', 'fabric', cs.fabric),
        statChain('管理链', 'fisco-bcos', cs['fisco-bcos']),
        statChain('证照链（通行证源发链 · SM2）', 'irita', cs.irita));
    });

    /* --- 核心指标：dashboard/summary + 三本台账 total --- */
    const kpiBox = h('div', {}, P.empty('正在加载指标…'));
    root.append(card('核心指标', kpiBox));
    Promise.all([
      API.call('/api/dashboard/summary', {}),
      API.call('/api/mission/list', { page: 1, page_size: 1 }),
      API.call('/api/pass/list', { page: 1, page_size: 1 }),
      API.call('/api/crosschain/list', { page: 1, page_size: 1 }),
    ]).then(([rs, rm, rp, rc]) => {
      kpiBox.innerHTML = '';
      if (!rs.ok) { kpiBox.append(P.errCard(rs)); return; }
      const s = rs.data;
      kpiBox.append(P.statCards([
        { label: '任务', value: rm.ok ? rm.data.total : '—', sub: '任务台账' },
        { label: '飞行许可', value: rp.ok ? rp.data.total : '—', sub: '许可台账' },
        { label: '跨链交易', value: rc.ok ? rc.data.total : '—', sub: '跨链台账' },
        { label: '告警总数', value: s.alerts.total, sub: '待处置 ' + s.alerts.open,
          tone: s.alerts.high_open > 0 ? 'critical' : '' },
        { label: '高危待处置', value: s.alerts.high_open, tone: s.alerts.high_open > 0 ? 'critical' : 'good' },
        { label: '活跃会话', value: s.sessions.active, sub: '降级 ' + s.sessions.degraded,
          tone: s.sessions.degraded > 0 ? 'warning' : '' },
        { label: '待批授权', value: s.authorizations.pending,
          tone: s.authorizations.pending > 0 ? 'warning' : '' },
        { label: '攻防事件', value: s.wormhole_events.total,
          sub: '检测 ' + s.wormhole_events.detect + ' · 隔离 ' + s.wormhole_events.isolate +
               ' · 恢复 ' + s.wormhole_events.recover },
      ]));
      if (s.alerts.by_type) {
        kpiBox.append(h('div', { class: 'p-card-sub' }, '告警类型分布'),
          P.hbars(Object.keys(s.alerts.by_type).map(k =>
            ({ label: P.statusZh(k), value: s.alerts.by_type[k] }))));
      }
    });

    /* --- 最近跨链流水 --- */
    root.append(card('最近跨链流水 · 点行查看四段存证详情',
      P.dataTable({
        endpoint: '/api/crosschain/list', pageSize: 8,
        columns: [
          { title: '跨链流水号', render: r => UI.trunc(r.cross_tx_id, 24), mono: true },
          { title: '类型', render: r => CXV.msgTypeZh(r.message_type) },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 20), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '目标链', render: r => P.chainTag(r.final_target_chain) },
          { title: '耗时', render: r => UI.fmtMs(r.latency_ms), num: true },
        ],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
        emptyText: '暂无跨链记录',
      })));

    /* --- 最近告警 --- */
    root.append(card('最近告警',
      P.dataTable({
        endpoint: '/api/alert/list', pageSize: 5,
        columns: [
          { title: '告警号', key: 'alert_id', mono: true },
          { title: '类型', render: r => P.badge(r.event_type) },
          { title: '风险级', render: r => P.badge(r.risk_level) },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '来源', key: 'source_system' },
          { title: '无人机伪名', render: r => UI.trunc(r.uav_pseudonym, 16), mono: true },
        ],
        emptyText: '暂无告警',
      })));

    /* --- 演示维护 --- */
    const rpDemo = P.resultPanel();
    root.append(card('演示维护',
      h('p', { class: 'p-field-hint' },
        '灌注演示种子数据；复位仅清空本地业务库并还原模拟链状态——真实链上数据永不受影响。'),
      P.actionBar([
        { label: '灌注演示数据', run: P.runOp({
          path: '/api/demo/init', body: () => ({}), rp: rpDemo, successText: '灌注完成',
          render: d => P.kv([
            ['新增记录', h('code', { class: 'p-mono' }, JSON.stringify(d.created))],
            ['跳过', h('code', { class: 'p-mono' }, JSON.stringify(d.skipped))]]) }) },
        { label: '复位演示数据', kind: 'danger',
          confirm: { title: '复位演示数据', ok: '确认复位',
            msg: '将清空全部业务表并复位模拟链状态（真实链上数据不受影响）。确认继续？' },
          run: P.runOp({
            path: '/api/demo/reset', body: () => ({}), rp: rpDemo, successText: '复位完成',
            render: d => P.kv([
              ['清空业务表数', String(d.tables_cleared)],
              ['复位时间', UI.fmtDT(d.reset_at, true)]]) }) },
      ]), rpDemo.root));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.overview = { render };
})();
