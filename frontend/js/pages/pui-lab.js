/* pui-lab.js —— PUI 组件自检页（#/pui-lab，不进侧边栏；开发/回归用）。 */
(function () {
  'use strict';
  const { h, toast } = UI, P = PUI;

  function render(root) {
    root.append(P.pageHead({ title: 'PUI 组件自检', sub: '新设计系统组件画廊（开发工具页）' }));
    root.append(P.chipBar({ onPick: e => toast('onPick: ' + e.kind + '=' + e.id) }));

    const sec = (title, ...body) => h('section', { class: 'p-card' },
      h('h3', { class: 'p-card-title' }, title), ...body);

    root.append(sec('徽章画廊',
      h('div', { class: 'p-row' }, ['ONLINE', 'VERIFIED', 'SUCCESS', 'VALID', 'PENDING', 'DRAFT',
        'DEGRADED', 'ISOLATED', 'REVOKED', 'FAILED', 'OPEN', 'TRACED', 'ARCHIVED', 'HIGH', 'BROKEN',
        'ROUTE_OK', 'PASS', 'DETECT', '未知状态'].map(s => P.badge(s))),
      h('div', { class: 'p-row' }, ['chainmaker', 'fabric', 'fisco-bcos'].map(c => P.chainTag(c)))));

    const rp = P.resultPanel();
    root.append(sec('结果面板（live：health/ping）',
      P.actionBar([
        { label: '调用 health/ping', kind: 'primary', run: () => API.call('/api/health/ping', {}).then(r => rp.show(r, d => P.kv([['ping', d.ping]]))) },
        { label: '模拟 code=4001 错误卡', run: () => rp.show({ ok: false, code: 4001, message: '虫洞部署被拒', latencyMs: 3, raw: { code: 4001 } }) },
        { label: '危险操作（confirm）', kind: 'danger',
          confirm: { title: '确认演示', msg: '这是 PUI.confirm 的确认文案。', ok: '执行' },
          run: () => toast('确认后执行') },
        { label: '打开抽屉', run: () => P.drawer('详情抽屉', P.kv([['组件', 'PUI.drawer'], ['关闭', 'ESC / 点遮罩 / ✕']])) },
      ]), rp.root));

    root.append(sec('tabs（?tab= 同步）', P.tabs([
      { key: 'a', label: '页签 A', render: box => box.append(h('p', {}, 'A 内容；URL 应为 ?tab=a')) },
      { key: 'b', label: '页签 B', render: box => box.append(h('p', {}, 'B 内容')) },
    ])));

    /* ---- Task 4 数据组件 live 自检（需后端 sim 运行） ---- */
    const mf = P.form([
      { name: 'operator_id', label: '运营商过滤', type: 'text', placeholder: 'Operator-A' },
      { name: 'status', label: '状态', type: 'select', options: ['VERIFIED', 'ACTIVE', 'REVOKED'] },
      { name: 'scope', label: 'scope 多选', type: 'multi', options: ['MISSION', 'ROUTE', 'PAYLOAD'], value: ['ROUTE'] },
      { name: 'count', label: '数量', type: 'number', value: 5 },
      { name: 'when', label: '时间', type: 'datetime', value: UI.datetimeLocal(60) },
      { name: 'note', label: '备注', type: 'textarea', placeholder: '多行' },
    ]);
    const rp2 = P.resultPanel();
    root.append(sec('form（read/set/setOptions）', mf.root,
      P.actionBar([
        { label: 'read() 打印', run: () => rp2.show({ ok: true, code: 0, latencyMs: 0, raw: mf.read(), data: mf.read() }, d => UI.jsonBlock(d)) },
        { label: 'set(status=ACTIVE)', run: () => { mf.set('status', 'ACTIVE'); } },
        { label: 'setOptions(status 换源)', run: () => mf.setOptions('status', ['DRAFT', 'SUBMITTED']) },
      ]), rp2.root));

    root.append(sec('dataTable（live：uav/list，过滤 operator_id/status）',
      P.dataTable({
        endpoint: '/api/uav/list',
        filters: [
          { name: 'operator_id', label: '运营商', type: 'text' },
          { name: 'status', label: '状态', type: 'select', options: ['REGISTERED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] },
        ],
        columns: [
          { title: 'ID', key: 'uav_id', mono: true }, { title: '型号', key: 'model' },
          { title: '运营商', key: 'operator_id' },
          { title: '状态', render: r => P.badge(r.status) },
        ],
        pageSize: 5,
        onRow: rec => P.drawer('无人机 ' + rec.uav_id, P.kv([['型号', rec.model], ['状态', P.badge(rec.status)]])),
      })));

    root.append(sec('csvExport（live：audit/export）',
      P.csvExport({ endpoint: '/api/audit/export', body: {}, filename: 'audit.csv' })));

    root.append(sec('statCards / hbars / scoreBars / pathHops（静态样例）',
      P.statCards([
        { label: '成功率', value: '99.2%', sub: 'p95 42ms', tone: 'good' },
        { label: '高危告警', value: 2, tone: 'critical' },
        { label: '会话', value: 3, sub: '1 降级', tone: 'warning' },
      ]),
      P.hbars([{ label: 'HEARTBEAT', value: 42 }, { label: 'POSITION_UPDATE', value: 17, tone: 'info' }]),
      P.scoreBars({ identity: 1.0, adjacency: 0.35, latency: 0.25, challenge: 0, path: 0.15 }, 0.7),
      P.pathHops([{ from: 'A', to: 'N1', latency_ms: 8 }, { from: 'N1', to: 'N2', latency_ms: 11 }])));

    root.append(sec('cxTrail（live：crosschain/list 首行）',
      (() => { const box = h('div', {});
        API.call('/api/crosschain/list', { page: 1, page_size: 1 }).then(r => {
          box.innerHTML = '';
          const rec = r.ok && r.data.records && r.data.records[0];
          box.append(rec ? P.cxTrail(rec) : P.empty('无跨链记录（先在幕一注册一架无人机）'));
        });
        return box; })()));

    root.append(sec('STORE 调试',
      P.actionBar([
        { label: 'note MISSION=LAB-1', run: () => STORE.note('MISSION', 'LAB-1', { demo: true }) },
        { label: 'note UAV=LAB-UAV', run: () => STORE.note('UAV', 'LAB-UAV') },
      ])));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['pui-lab'] = { render };
})();
