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

    root.append(sec('STORE 调试',
      P.actionBar([
        { label: 'note MISSION=LAB-1', run: () => STORE.note('MISSION', 'LAB-1', { demo: true }) },
        { label: 'note UAV=LAB-UAV', run: () => STORE.note('UAV', 'LAB-UAV') },
      ])));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['pui-lab'] = { render };
})();
