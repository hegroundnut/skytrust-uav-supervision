/* app.js —— SPA 路由与全局装裱：主题切换、三链状态灯、后端延迟徽章。 */
(function () {
  'use strict';
  const { h } = window.UI;
  const PAGES = window.PAGES || {};

  /* ---------- 主题：显式切换 > OS 偏好 ---------- */
  const saved = localStorage.getItem('skytrust-theme');
  if (saved) document.body.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('skytrust-theme', next);
    route(); // 重绘当前页以应用新 var()（SVG 内联色等）
  });

  /* ---------- 三链状态灯 + 后端徽章 ---------- */
  async function pollChains() {
    const lamps = document.querySelectorAll('#chain-lamps .lamp');
    try {
      const r = await window.API.call('/api/chain/status', {});
      const badge = document.getElementById('backend-badge');
      if (r.ok && r.data && r.data.chains) {
        badge.textContent = '后端 ' + r.latencyMs + 'ms';
        badge.className = 'backend-badge ok';
        lamps.forEach(l => {
          const st = r.data.chains[l.dataset.chain];
          l.className = 'lamp ' + (st === 'ONLINE' ? 'on' : 'off');
          l.title = l.dataset.chain + ': ' + st;
        });
      } else {
        badge.textContent = '后端异常 code=' + r.code;
        badge.className = 'backend-badge bad';
        lamps.forEach(l => l.className = 'lamp err');
      }
    } catch (_) {
      const badge = document.getElementById('backend-badge');
      badge.textContent = '后端不可达';
      badge.className = 'backend-badge bad';
      lamps.forEach(l => l.className = 'lamp err');
    }
  }
  // 每次业务调用后刷新徽章延迟显示
  window.API.onCall(r => {
    const badge = document.getElementById('backend-badge');
    badge.textContent = '后端 ' + r.latencyMs + 'ms' + (r.ok ? '' : ' · code=' + r.code);
    badge.className = 'backend-badge ' + (r.ok ? 'ok' : 'bad');
  });
  pollChains();
  setInterval(pollChains, 15000);

  /* ---------- hash 路由 ---------- */
  function route() {
    const hash = location.hash || '#/dashboard';
    const name = hash.replace(/^#\//, '') || 'dashboard';
    const page = PAGES[name] || PAGES.dashboard;
    document.querySelectorAll('.nav-item').forEach(a =>
      a.classList.toggle('active', a.dataset.page === name));
    const root = document.getElementById('page');
    root.innerHTML = '';
    hideTipSafe();
    try {
      page.render(root);
    } catch (e) {
      root.append(h('div', { class: 'card' }, '页面渲染失败：' + e.message));
      console.error(e);
    }
    window.scrollTo(0, 0);
  }
  function hideTipSafe() { try { window.UI.hideTip(); } catch (_) {} }
  window.addEventListener('hashchange', route);
  route();
})();
