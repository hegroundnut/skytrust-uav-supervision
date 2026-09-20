/* pui.js —— 新产品组件库：p- 前缀类 + --p-* 令牌（样式在 css/product.css）。
   只复用旧 ui.js 的纯函数（h/jsonBlock/toast/showTip/hideTip/datetimeLocal/tsSuffix）
   与 EXPLAIN 词典；不复用旧组件的 DOM/类名——两套视觉互不渗透。 */
(function () {
  'use strict';
  const h = UI.h;

  /* ---------- 状态徽章（映射表与旧系统语义一致，视觉为新令牌） ---------- */
  const STATUS_MAP = {
    ONLINE: ['good', '●'], VERIFIED: ['good', '●'], SUCCESS: ['good', '✓'], VALID: ['good', '✓'],
    ACTIVE: ['good', '●'], APPROVED: ['good', '✓'], RESOLVED: ['good', '✓'], AUTHORIZED: ['good', '✓'],
    RECOVERED: ['good', '✓'], DONE: ['good', '✓'], PASS: ['good', '✓'],
    ROUTE_OK: ['good', '✓'], PAYLOAD_OK: ['good', '✓'], QUALIFIED: ['good', '✓'], RELAYED: ['good', '⇄'],
    PENDING: ['warning', '◔'], DRAFT: ['warning', '◔'], DEGRADED: ['warning', '⚠'],
    SENT: ['warning', '◔'], SUBMITTED: ['warning', '◔'], REVIEWING: ['warning', '◔'],
    COORDINATING: ['warning', '◔'], SUSPENDED: ['warning', '◸'], NEED_COORDINATION: ['warning', '⚠'],
    SEALED: ['critical', '🔒'], OFFLINE: ['critical', '○'], ISOLATED: ['critical', '⛔'],
    REVOKED: ['critical', '✕'], FAILED: ['critical', '✕'], REJECTED: ['critical', '✕'],
    DENIED: ['critical', '✕'], DETECT: ['critical', '⚠'], BLOCK: ['critical', '⛔'],
    ROUTE_DEVIATION: ['critical', '⚠'], EXPIRED: ['critical', '◷'], ABORTED: ['critical', '✕'],
    REGISTERED: ['info', '◌'], GENERATING: ['info', '◌'], USED: ['info', '✔'],
    MISSION_MISMATCH: ['serious', '⚠'], COMPLETED: ['info', '▣'], ARCHIVED: ['warning', '▣'],
    OPEN: ['serious', '◉'], IDENTIFIED: ['serious', '◉'], TRACED: ['serious', '◉'],
    REVIEWED: ['serious', '◉'], HIGH: ['critical', '▲'], MEDIUM: ['warning', '▲'], LOW: ['good', '▲'],
    BROKEN: ['critical', '✕'],
  };
  function badge(status) {
    const s = String(status ?? '—');
    const m = STATUS_MAP[s] || ['', '·'];
    return h('span', { class: 'p-badge p-tone-' + (m[0] || 'neutral'), title: s }, m[1] + ' ' + s);
  }
  const CHAIN_NAME = { chainmaker: 'ChainMaker 监管链', fabric: 'Fabric 运营链', 'fisco-bcos': 'FISCO BCOS 管理链' };
  function chainTag(chain) {
    const c = String(chain || '').toLowerCase();
    const key = c === 'fisco' ? 'fisco-bcos' : c;
    if (!CHAIN_NAME[key]) return h('span', { class: 'p-badge p-tone-neutral' }, String(chain || '—'));
    return h('span', { class: 'p-chain-tag', 'data-chain': key }, CHAIN_NAME[key]);
  }
  function kv(pairs) {
    return h('dl', { class: 'p-kv' }, pairs.filter(Boolean).map(p => [
      h('dt', {}, p[0]),
      h('dd', {}, p[1] && p[1].nodeType ? p[1] : String(p[1] ?? '—')),
    ]));
  }
  function empty(text) { return h('div', { class: 'p-empty' }, text || '暂无记录'); }
  function metaLine(r) {
    if (!r) return null;
    return h('div', { class: 'p-meta' },
      r.ok ? h('span', { class: 'p-badge p-tone-good' }, '✓ code=0')
           : h('span', { class: 'p-badge p-tone-critical' }, '✕ code=' + r.code),
      h('span', {}, '⏱ ' + r.latencyMs + 'ms'),
      r.trace_id ? h('span', {}, 'trace ', h('code', { class: 'p-mono' }, r.trace_id)) : null,
      r.timestamp ? h('span', { class: 'p-meta-ts' }, r.timestamp) : null);
  }
  function errCard(r) {
    const why = (window.EXPLAIN && EXPLAIN.codes[r.code]) || '';
    return h('div', { class: 'p-err' },
      h('div', { class: 'p-err-head' }, '✕ code=' + r.code + ' · ' + (r.message || '')),
      r.code === -1
        ? h('div', { class: 'p-err-why' }, '后端不可达：请确认 go run ./cmd/server（:8080）与 ./scripts/serve-frontend.sh（:8090）已启动。')
        : why ? h('div', { class: 'p-err-why' }, why) : null);
  }
  function resultPanel() {
    const root = h('div', { class: 'p-result' });
    function show(r, renderFn) {
      root.innerHTML = '';
      root.append(metaLine(r));
      if (!r.ok) root.append(errCard(r));
      else if (renderFn) { const v = renderFn(r.data, r); if (v) root.append(v); }
      root.append(h('details', { class: 'p-rawjson' },
        h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
      return r;
    }
    return { root, show };
  }
  function confirm(title, msg, okLabel) {
    return new Promise(res => {
      const mask = h('div', { class: 'p-modal-mask' });
      function close(v) {
        mask.remove(); document.removeEventListener('keydown', onKey); res(v);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }
      mask.append(h('div', { class: 'p-modal' },
        h('div', { class: 'p-modal-title' }, title),
        h('div', { class: 'p-modal-msg' }, msg),
        h('div', { class: 'p-modal-btns' },
          h('button', { class: 'p-btn p-btn-ghost', onClick: () => close(false) }, '取消'),
          h('button', { class: 'p-btn p-btn-danger', onClick: () => close(true) }, okLabel || '确认执行'))));
      mask.addEventListener('click', e => { if (e.target === mask) close(false); });
      document.addEventListener('keydown', onKey);
      document.body.append(mask);
    });
  }
  function drawer(title, ...body) {
    const panel = h('div', { class: 'p-drawer' },
      h('div', { class: 'p-drawer-head' },
        h('h3', {}, title),
        h('button', { class: 'p-btn p-btn-ghost p-btn-sm', onClick: () => close() }, '✕')),
      h('div', { class: 'p-drawer-body' }, ...body));
    const mask = h('div', { class: 'p-drawer-mask' }, panel);
    function close() { mask.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    mask.addEventListener('click', e => { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(mask);
    return { root: mask, close };
  }
  function actionBar(btns) {
    return h('div', { class: 'p-actions' }, btns.map(b => {
      const el = h('button', {
        class: 'p-btn' + (b.kind ? ' p-btn-' + b.kind : ''), title: b.title || null,
      }, b.label);
      el.addEventListener('click', async () => {
        if (b.confirm && !(await confirm(b.confirm.title || '请确认', b.confirm.msg, b.confirm.ok))) return;
        el.disabled = true; const old = el.textContent; el.textContent = '⏳ ' + old;
        try { await b.run(el); } finally { el.disabled = false; el.textContent = old; }
      });
      return el;
    }));
  }
  /* chipBar：STORE 单一全局订阅（避免路由重绘泄漏监听器） */
  let chipWrap = null;
  STORE.onChange(list => { if (chipWrap && chipWrap.isConnected) drawChips(chipWrap); });
  function drawChips(wrap) {
    const opts = wrap.__opts || {};
    const ents = STORE.all();
    wrap.innerHTML = '';
    wrap.append(h('span', { class: 'p-chipbar-label' }, '当前业务对象'));
    if (!ents.length) {
      wrap.append(h('span', { class: 'p-chip p-chip-empty' }, '（尚无——完成操作后自动汇集，点击可复制 ID）'));
      return;
    }
    ents.forEach(e => {
      const chip = h('button', {
        class: 'p-chip',
        title: (STORE.KIND_LABEL[e.kind] || e.kind) + ' · ' + e.id +
          (e.extra ? '\n' + JSON.stringify(e.extra) : '') + '\n点击复制 ID',
        onClick: () => {
          if (navigator.clipboard) navigator.clipboard.writeText(e.id);
          UI.toast('已复制 ' + e.id);
          if (opts.onPick) opts.onPick(e);
        },
      }, h('i', {}, STORE.KIND_LABEL[e.kind] || e.kind), h('b', { class: 'p-mono' }, e.id));
      wrap.append(chip);
    });
    wrap.append(h('button', {
      class: 'p-chip p-chip-clear', title: '清空本地业务上下文（不影响后端数据）',
      onClick: () => STORE.clear(),
    }, '✕ 清空'));
  }
  function chipBar(opts) {
    const wrap = h('div', { class: 'p-chipbar' });
    wrap.__opts = opts || {};
    chipWrap = wrap; drawChips(wrap);
    return wrap;
  }
  function pageHead(o) {
    return h('div', { class: 'p-page-head' },
      h('div', {}, h('h1', {}, o.title), o.sub ? h('p', { class: 'p-page-sub' }, o.sub) : null),
      o.actions && o.actions.length ? h('div', { class: 'p-page-actions' }, ...o.actions) : null);
  }
  /* ---------- tabs：active 同步 ?tab= 参数；切入即重新 render（每次拉新数据） ---------- */
  function tabParam() {
    const qs = (location.hash.split('?')[1]) || '';
    return new URLSearchParams(qs).get('tab');
  }
  function setTabParam(key) {
    const raw = (location.hash || '#/').replace(/^#\//, '');
    const base = raw.split('?')[0];
    const p = new URLSearchParams(raw.split('?')[1] || '');
    p.set('tab', key);
    location.hash = '#/' + base + '?' + p.toString();
  }
  function tabs(items) {
    const cur = tabParam() || (items[0] && items[0].key);
    const box = h('div', { class: 'p-tab-body' });
    const nav = h('div', { class: 'p-tabs' }, items.map(it =>
      h('button', {
        class: 'p-tab' + (it.key === cur ? ' active' : ''),
        onClick: () => { if (tabParam() !== it.key) setTabParam(it.key); },
      }, it.label)));
    const item = items.find(i => i.key === cur) || items[0];
    if (item) item.render(box);
    return h('div', { class: 'p-tabs-wrap' }, nav, box);
  }

  /* ---------- runOp：变更类操作统一管线（Task 5-9 所有写操作按钮共用） ---------- */
  function runOp(o) {
    return async () => {
      const body = await o.body();
      if (!body) return null;                    // body() 返回 null = 校验失败/用户放弃，不发请求
      const r = await API.call(o.path, body);
      o.rp.show(r, d => {
        const parts = [];
        if (o.successText) parts.push(h('div', { class: 'p-ok-line' }, '✓ ' + o.successText));
        if (o.render) { const v = o.render(d); if (v) parts.push(v); }
        return parts.length ? h('div', {}, ...parts) : null;
      });
      if (r.ok) {
        if (o.note) {
          const id = typeof o.note.id === 'function' ? o.note.id(r.data) : o.note.id;
          const extra = o.note.extra ? o.note.extra(r.data) : null;
          STORE.note(o.note.kind, id, extra);
        }
        if (o.onOk) await o.onOk(r.data, r);
      }
      return r;
    };
  }

  window.PUI = {
    h, badge, chainTag, kv, empty, metaLine, errCard, resultPanel, actionBar,
    confirm, drawer, chipBar, pageHead, tabs, tabParam, setTabParam, runOp,
  };
})();
