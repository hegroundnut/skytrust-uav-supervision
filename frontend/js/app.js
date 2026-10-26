/* app.js —— SPA 路由与全局装裱：主题切换、四链状态灯、后端延迟徽章。 */
(function () {
  'use strict';
  const { h } = window.UI;
  const PAGES = window.PAGES || {};

  /* ---------- 主题：显式切换 > OS 偏好 ---------- */
  const saved = localStorage.getItem('skytrust-theme');
  const theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', theme);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('skytrust-theme', next);
    route(); // 重绘当前页以应用新 var()（SVG 内联色等）
  });

  /* ---------- 四链状态灯 + 后端徽章（lamps 由 #chain-lamps 子元素 data-chain 驱动，链数增减零改码） ---------- */
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

  /* ---------- hash 路由（支持 #/name?tab=key；新页面消费 query，旧页面忽略第二参） ---------- */
  function route() {
    const raw = (location.hash || '#/overview').replace(/^#\//, '');
    const qi = raw.indexOf('?');
    const name = (qi >= 0 ? raw.slice(0, qi) : raw) || 'overview';
    const query = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
    const page = PAGES[name] || PAGES.overview;   // 未挂载/旧哈希路由（act/wb/explorer 等已下线）一律回落总览
    document.querySelectorAll('.nav-item').forEach(a =>
      a.classList.toggle('active', a.dataset.page === name));
    const root = document.getElementById('page');
    root.innerHTML = '';
    hideTipSafe();
    try {
      page.render(root, { query: query, name: name });
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
