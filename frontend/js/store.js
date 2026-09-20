/* store.js —— DemoContext：跨工作台共享业务对象上下文（localStorage 便利层）。
   唯一事实源永远是后端：store 丢失/清空不影响任何工作台功能（管理方待审队列
   有独立的跨链台账发现机制）。每 kind 单槽（最新覆盖），多标签页经 storage 事件同步。 */
(function () {
  'use strict';
  const KEY = 'skytrust-ctx-v1';
  const KINDS = ['OPERATOR', 'MANUFACTURER', 'ROUTE', 'UAV', 'MISSION', 'APPLICATION',
    'PASS', 'CONFLICT', 'SESSION', 'NODE', 'ALERT', 'AUTHORIZATION', 'CROSS_TX'];
  const KIND_LABEL = {
    OPERATOR: '运营商', MANUFACTURER: '厂商', ROUTE: '航段', UAV: '无人机',
    MISSION: '任务', APPLICATION: '申请', PASS: '许可', CONFLICT: '冲突',
    SESSION: '会话', NODE: '节点', ALERT: '告警', AUTHORIZATION: '授权', CROSS_TX: '跨链单',
  };
  let mem = load();
  const subs = [];
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (_) {}
  }
  function emit() {
    const list = all();
    subs.slice().forEach(fn => { try { fn(list); } catch (_) {} });
  }
  function note(kind, id, extra) {
    if (KINDS.indexOf(kind) < 0 || !id) return;
    mem[kind] = { kind: kind, id: String(id), extra: extra || null, at: Date.now() };
    persist(); emit();
  }
  function get(kind) { return mem[kind] || null; }
  function all() {
    return Object.keys(mem).map(k => mem[k]).sort((a, b) => b.at - a.at);
  }
  function clear() { mem = {}; persist(); emit(); }
  function onChange(fn) {
    subs.push(fn);
    return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
  }
  window.addEventListener('storage', e => {
    if (e.key === KEY) { mem = load(); emit(); }
  });
  window.STORE = { note, get, all, clear, onChange, KINDS, KIND_LABEL };
})();
