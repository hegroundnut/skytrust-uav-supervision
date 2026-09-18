/* ui.js —— 共享 UI 工具：元素构建、状态徽章（图标+文字，永不单靠颜色）、
   表格、JSON 高亮、横向条形图（hover 提示 + 表格视图）、toast、跨链四段流。 */
(function () {
  'use strict';

  /* ---------- 元素构建 ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(9)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function trunc(s, n) { s = String(s ?? ''); return s.length > n ? s.slice(0, n) + '…' : s; }
  function mono(s, n) { return h('code', { class: 'mono' }, trunc(s, n || 24)); }

  /* ---------- 状态徽章：语义色 + 图标 + 文字三重编码 ---------- */
  const STATUS_MAP = {
    ONLINE: ['good', '●'], VERIFIED: ['good', '●'], SUCCESS: ['good', '✓'], VALID: ['good', '✓'],
    ACTIVE: ['good', '●'], APPROVED: ['good', '✓'], RESOLVED: ['good', '✓'], AUTHORIZED: ['good', '✓'],
    RECOVERED: ['good', '✓'], OPENED: ['good', '🔓'], DONE: ['good', '✓'], PASS: ['good', '✓'],
    ROUTE_OK: ['good', '✓'], PAYLOAD_OK: ['good', '✓'], QUALIFIED: ['good', '✓'], RELAYED: ['good', '⇄'],
    PENDING: ['warning', '◔'], DRAFT: ['warning', '◔'], DEGRADED: ['warning', '⚠'],
    INIT: ['warning', '◔'], AUTHENTICATED: ['warning', '◔'], SEALED: ['critical', '🔒'],
    OFFLINE: ['critical', '○'], ISOLATED: ['critical', '⛔'], REVOKED: ['critical', '✕'],
    FAILED: ['critical', '✕'], REJECTED: ['critical', '✕'], DENIED: ['critical', '✕'],
    DETECT: ['critical', '⚠'], ROUTE_DEVIATION: ['critical', '⚠'], MISSION_MISMATCH: ['serious', '⚠'],
    OPEN: ['serious', '◉'], IDENTIFIED: ['serious', '◉'], TRACED: ['serious', '◉'],
    REVIEWED: ['serious', '◉'], ARCHIVED: ['warning', '▣'], EXPIRED: ['critical', '◷'],
    HIGH: ['critical', '▲'], MEDIUM: ['warning', '▲'], LOW: ['good', '▲'],
  };
  function statusBadge(status) {
    const s = String(status ?? '—');
    const [tone, icon] = STATUS_MAP[s] || ['', '·'];
    return h('span', { class: 'badge ' + tone, title: s }, h('i', { class: 'bi' }, icon), s);
  }

  /* ---------- 链身份徽章（色随实体，固定映射，永不互换） ---------- */
  const CHAIN_META = {
    'fabric':     { cls: 'fabric',     name: 'Fabric 运营链' },
    'chainmaker': { cls: 'chainmaker', name: 'ChainMaker 监管链' },
    'fisco-bcos': { cls: 'fisco',      name: 'FISCO BCOS 管理链' },
    'fisco':      { cls: 'fisco',      name: 'FISCO BCOS 管理链' },
  };
  function chainTag(chain) {
    const m = CHAIN_META[String(chain || '').toLowerCase()];
    if (!m) return h('span', { class: 'badge' }, String(chain || '—'));
    return h('span', { class: 'chain-tag ' + m.cls }, h('i'), m.name);
  }
  function chainVar(chain) { // SVG 等需要 var() 颜色时
    const c = String(chain || '').toLowerCase();
    if (c.includes('fabric')) return 'var(--series-1)';
    if (c.includes('chainmaker')) return 'var(--series-2)';
    if (c.includes('fisco')) return 'var(--series-3)';
    return 'var(--ink-3)';
  }

  /* ---------- JSON 高亮块 ---------- */
  function jsonBlock(obj, maxH) {
    let text;
    try { text = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2); } catch (_) { text = String(obj); }
    const html = esc(text)
      .replace(/&quot;([^&\n]*?)&quot;(\s*:)/g, '<span class="jk">&quot;$1&quot;</span>$2')
      .replace(/:\s*&quot;((?:[^&]|&(?!quot;))*)&quot;/g, m => m.replace(/&quot;((?:[^&]|&(?!quot;))*)&quot;/, '<span class="js">&quot;$1&quot;</span>'))
      .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="jn">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="jb">$1</span>');
    return h('pre', { class: 'json-block', html, style: maxH ? { maxHeight: maxH + 'px' } : null });
  }

  /* ---------- 响应元信息行 ---------- */
  function metaLine(r) {
    if (!r) return null;
    return h('div', { class: 'meta-line' },
      r.ok ? h('span', { class: 'badge good' }, h('i', { class: 'bi' }, '✓'), 'code=0')
           : h('span', { class: 'badge critical' }, h('i', { class: 'bi' }, '✕'), 'code=' + r.code),
      h('span', {}, '⏱ ', h('b', {}, r.latencyMs + 'ms')),
      r.trace_id ? h('span', {}, 'trace: ', h('code', { class: 'mono' }, r.trace_id)) : null,
      r.timestamp ? h('span', {}, r.timestamp) : null,
    );
  }

  /* ---------- 通用表格 ---------- */
  function table(columns, rows, opts) {
    opts = opts || {};
    const thead = h('thead', {}, h('tr', {}, columns.map(c =>
      h('th', { class: c.num ? 'num' : null }, c.title))));
    const tbody = h('tbody', {}, rows.map((row, i) =>
      h('tr', { onClick: opts.onRowClick ? () => opts.onRowClick(row, i) : null,
                style: opts.onRowClick ? { cursor: 'pointer' } : null },
        columns.map(c => h('td', { class: c.num ? 'num' : null },
          c.render ? c.render(row, i) : String(row[c.key] ?? '—'))))));
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, thead, tbody));
  }

  /* ---------- 键值对 ---------- */
  function kv(pairs) {
    return h('dl', { class: 'kv' }, pairs.filter(Boolean).map(([k, v]) => [
      h('dt', {}, k), h('dd', {}, v && v.nodeType ? v : String(v ?? '—')),
    ]));
  }

  /* ---------- 卡片 ---------- */
  function card(title, sub, ...body) {
    const kids = [];
    if (title !== null) kids.push(h('div', { class: 'card-title' },
      typeof title === 'string' ? h('h3', {}, title) : title));
    if (sub) kids.push(h('div', { class: 'card-sub' }, sub));
    kids.push(...body.flat(9).filter(Boolean));
    return h('div', { class: 'card' }, kids);
  }

  /* ---------- toast ---------- */
  function toast(msg, kind, ms) {
    const box = document.getElementById('toast-box');
    const el = h('div', { class: 'toast ' + (kind || '') }, msg);
    box.append(el);
    setTimeout(() => el.remove(), ms || 3600);
  }
  function toastResult(r, okMsg) {
    if (r.ok) toast(okMsg || ('成功 ' + r.latencyMs + 'ms'), 'ok');
    else toast('code=' + r.code + ' ' + r.message, 'err', 5200);
  }

  /* ---------- hover 提示浮层（全页共用一个） ---------- */
  let tipEl = null;
  function showTip(html, x, y) {
    if (!tipEl) { tipEl = h('div', { class: 'tip' }); document.body.append(tipEl); }
    tipEl.innerHTML = html;
    tipEl.classList.add('show');
    const pad = 14, w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
    let left = x + pad, top = y + pad;
    if (left + w > innerWidth - 8) left = x - w - pad;
    if (top + hh > innerHeight - 8) top = y - hh - pad;
    tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }

  /* ---------- 横向条形图（单系列量值：单色相；≥2 系列才上图例）
     items: [{label, value, display, tone}]  tone: ''|'good'|'warn'|'critical'
     opts: {max, threshold:{value,label}, unit, seriesName, colorVar} ---------- */
  function hbarChart(items, opts) {
    opts = opts || {};
    const max = opts.max || Math.max(...items.map(d => d.value), 1e-9) * 1.12;
    const rows = items.map(d => {
      const pct = Math.max(0, Math.min(100, (d.value / max) * 100));
      const fill = h('div', { class: 'hbar-fill ' + (d.tone ? 'c-' + d.tone : ''),
        style: { width: pct + '%', background: d.tone ? null : (opts.colorVar || null) } });
      const track = h('div', { class: 'hbar-track' }, fill,
        opts.threshold ? h('div', { class: 'hbar-threshold',
          style: { left: (opts.threshold.value / max * 100) + '%' },
          'data-label': opts.threshold.label || '' }) : null);
      const row = h('div', { class: 'hbar-row' },
        h('div', { class: 'hbar-label', title: d.label }, d.label),
        track,
        h('div', { class: 'hbar-val' }, d.display ?? (d.value + (opts.unit || ''))));
      row.addEventListener('mousemove', e => showTip(
        '<b>' + esc(d.label) + '</b><br>' + esc(d.display ?? d.value + (opts.unit || '')) +
        (d.tip ? '<br>' + esc(d.tip) : ''), e.clientX, e.clientY));
      row.addEventListener('mouseleave', hideTip);
      return row;
    });
    const chart = h('div', { class: 'hbar-chart' }, rows);
    // 表格视图（无障碍兜底：图不可读时数据仍在）
    const tbl = h('div', { style: { display: 'none' } },
      table([{ title: opts.seriesName || '项目', key: 'label' },
             { title: '数值', num: true, render: d => d.display ?? (d.value + (opts.unit || '')) }],
            items));
    const toggle = h('button', { class: 'btn btn-sm btn-ghost',
      onClick: e => { const show = tbl.style.display === 'none';
        tbl.style.display = show ? 'block' : 'none';
        chart.style.display = show ? 'none' : 'flex';
        e.target.textContent = show ? '图形视图' : '表格视图'; } }, '表格视图');
    return h('div', {}, h('div', { class: 'row', style: { justifyContent: 'flex-end', marginBottom: '4px' } }, toggle), chart, tbl);
  }

  /* ---------- 跨链四段存证流 ---------- */
  function cxFlow(cx) {
    if (!cx) return null;
    const seg = (role, chain, tx) => h('div', { class: 'cx-seg' },
      h('div', { class: 'cx-role' }, h('span', {}, role), chainTag(chain)),
      h('div', { class: 'cx-tx mono' }, tx ? trunc(tx, 44) : '—'),
      tx ? h('div', { class: 'cx-tx' }, h('button', { class: 'btn btn-sm btn-ghost',
        onClick: () => { navigator.clipboard && navigator.clipboard.writeText(tx); toast('已复制 TxID'); } }, '复制完整 TxID')) : null);
    return h('div', {},
      h('div', { class: 'row mb8' },
        h('code', { class: 'mono' }, cx.cross_tx_id),
        statusBadge(cx.status),
        h('span', { class: 'small muted' }, cx.message_type, ' · ', cx.latency_ms + 'ms',
          ' · verify=', cx.verify_result || '—', ' · policy=', cx.policy_result || '—')),
      h('div', { class: 'cx-flow' },
        seg('① 源链上链', cx.source_chain, cx.source_chain_tx_id),
        seg('② 监管链签收', 'chainmaker', cx.reg_receive_tx_id),
        seg('③ 监管链中继', 'chainmaker', cx.reg_relay_tx_id),
        seg('④ 目标链存证', cx.final_target_chain, cx.target_chain_tx_id)));
  }

  /* ---------- 异步按钮包装：点击 → loading → 调 API → 渲染 ---------- */
  function asyncBtn(label, fn, cls) {
    const b = h('button', { class: 'btn ' + (cls || '') }, label);
    b.addEventListener('click', async () => {
      b.disabled = true;
      const old = b.textContent;
      b.textContent = '⏳ ' + old;
      try { await fn(); } finally { b.disabled = false; b.textContent = old; }
    });
    return b;
  }

  /* ---------- 表单读取 ---------- */
  function readForm(root) {
    const out = {};
    root.querySelectorAll('[data-field]').forEach(el => {
      let v = el.value;
      if (el.type === 'number' && v !== '') v = Number(v);
      if (el.type === 'checkbox') v = el.checked;
      if (v !== '') out[el.dataset.field] = v;
    });
    return out;
  }
  function field(name, label, attrs) {
    const inp = h('input', Object.assign({ type: 'text', 'data-field': name }, attrs || {}));
    return h('div', { class: 'field' }, h('label', {}, label), inp);
  }
  function fieldSelect(name, label, options, cur) {
    const sel = h('select', { 'data-field': name }, options.map(o => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: String(cur) === String(v) }, t);
    }));
    return h('div', { class: 'field' }, h('label', {}, label), sel);
  }

  /* ---------- 时间戳后缀（演示 ID 用） ---------- */
  function tsSuffix() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join('');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function datetimeLocal(offsetMin) {
    const d = new Date(Date.now() + (offsetMin || 0) * 60000);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  /* ---------- 一键实跑监控台：逐步展示每次 API 调用的路径/参数/返回/延迟 ----------
     steps: [{name, detail?}]；begin(i)/end(i,ok,note) 驱动步骤状态；
     begin 期间自动订阅 API.onCall，把该步骤触发的所有调用实时渲染为子行。 */
  const SUM_KEYS = /(_id$|^status$|^verdict$|^valid$|^count$|latency_ms$|^risk_score$|success_rate$|^route_verdict$|^payload_verdict$|^resolved$|^wormhole_enabled$|^ciphertext_status$|^conclusion$)/;
  function summarizeData(data, limit) {
    if (!data || typeof data !== 'object') return [];
    const chips = [];
    const walk = (o, pre) => {
      for (const [k, v] of Object.entries(o)) {
        if (chips.length >= (limit || 6)) return;
        if (v && typeof v === 'object' && !Array.isArray(v) && pre < 1) { walk(v, pre + 1); continue; }
        if (!SUM_KEYS.test(k)) continue;
        let s = Array.isArray(v) ? '[' + v.length + ']' : String(v);
        chips.push([k, trunc(s, 34)]);
      }
    };
    walk(data, 0);
    return chips;
  }
  /* 顶部链状态灯每 15s 轮询 chain/status，属后台心跳，不计入步骤调用行 */
  const BG_PATHS = ['/api/chain/status'];
  function runMonitor(steps, opts) {
    opts = opts || {};
    const t0 = Date.now();
    let timer = null, off = null, ended = 0, failed = 0;
    const progressEl = h('span', { class: 'run-progress' }, '0/' + steps.length);
    const elapsedEl = h('span', { class: 'run-elapsed' }, '⏱ 0.0s');
    const body = h('div', { class: 'run-steps' });
    const panel = h('div', { class: 'card run-panel' },
      h('div', { class: 'run-head' },
        h('b', {}, opts.title || '▶ 实跑监控台'),
        progressEl, elapsedEl,
        h('span', { class: 'small muted' }, '每步展示实际调用的 API / 参数 / 返回，点 ▸ 看原始 JSON')));
    const foot = h('div', { class: 'run-foot', style: { display: 'none' } });
    panel.append(body, foot);
    const rows = steps.map((s, i) => {
      const ico = h('span', { class: 'rs-ico' }, '○');
      const api = h('span', { class: 'rs-api' }, '');
      const meta = h('span', { class: 'rs-meta' }, '');
      const calls = h('div', { class: 'rs-calls' });
      const row = h('div', { class: 'run-step' },
        ico,
        h('span', { class: 'rs-name' }, (i + 1) + '. ' + s.name, s.detail ? h('span', { class: 'small muted' }, ' · ' + s.detail) : null),
        h('span', { class: 'rs-right' }, api, meta),
        calls);
      body.append(row);
      return { row, ico, api, meta, calls, n: 0, ok: null };
    });
    function tick() { elapsedEl.textContent = '⏱ ' + ((Date.now() - t0) / 1000).toFixed(1) + 's'; }
    function begin(i) {
      const R = rows[i];
      R.row.className = 'run-step running';
      R.ico.textContent = '⏳';
      if (!timer) timer = setInterval(tick, 100);
      // 面板内滚动到当前步骤（不牵动整页）
      body.parentElement.scrollTop = R.row.offsetTop - 60;
      off = window.API.onCall(r => {
        if (BG_PATHS.includes(r.path)) return;
        R.n++;
        R.api.textContent = r.path;
        if (R.ok === null) R.ok = r.ok; else R.ok = R.ok && r.ok;
        const chips = summarizeData(r.data);
        const callRow = h('div', { class: 'run-call' },
          h('span', { class: 'rc-line' },
            r.ok ? h('span', { class: 'badge good' }, h('i', { class: 'bi' }, '✓'), 'code=0')
                 : h('span', { class: 'badge critical' }, h('i', { class: 'bi' }, '✕'), 'code=' + r.code),
            h('code', { class: 'mono' }, 'POST ' + r.path),
            h('span', { class: 'rc-ms' }, r.latencyMs + 'ms')),
          chips.length ? h('div', { class: 'run-sum' }, chips.map(([k, v]) =>
            h('span', { class: 'chip' }, h('b', {}, k), '=', v))) : null,
          h('details', {},
            h('summary', { class: 'small muted' }, '▸ 参数 / 返回 JSON'),
            h('div', { class: 'small muted mt8' }, '请求参数：'), jsonBlock(r.reqBody, 200),
            h('div', { class: 'small muted mt8' }, '返回结果：'), jsonBlock(r.raw, 300)));
        R.calls.append(callRow);
        body.parentElement.scrollTop = R.row.offsetTop - 60 + R.calls.scrollHeight;
      });
    }
    function end(i, ok, note) {
      const R = rows[i];
      if (off) { off(); off = null; }
      const good = ok === undefined ? R.ok !== false && R.n > 0 : ok;
      R.row.className = 'run-step ' + (good ? 'done' : 'error');
      R.ico.textContent = good ? '✓' : '✕';
      R.meta.textContent = (note || '') + (R.n ? (note ? ' · ' : '') + R.n + ' 次调用' : '');
      ended++; if (!good) failed++;
      progressEl.textContent = ended + '/' + steps.length;
      tick();
    }
    function finish(summaryNodes) {
      if (timer) { clearInterval(timer); timer = null; }
      if (off) { off(); off = null; }
      tick();
      foot.style.display = 'block';
      foot.innerHTML = '';
      foot.append(h('span', { class: 'badge ' + (failed ? 'critical' : 'good') },
        failed ? '✕ ' + failed + ' 步含失败调用' : '✓ 全部 ' + ended + ' 步完成'),
        h('span', { class: 'small muted' }, '总耗时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's'),
        ...(summaryNodes || []));
    }
    return { el: panel, begin, end, finish, rows };
  }

  window.UI = {
    h, esc, trunc, mono, statusBadge, chainTag, chainVar, jsonBlock, metaLine, table, kv, card,
    toast, toastResult, showTip, hideTip, hbarChart, cxFlow, asyncBtn, readForm, field, fieldSelect,
    tsSuffix, datetimeLocal, CHAIN_META, runMonitor, summarizeData,
  };
})();
