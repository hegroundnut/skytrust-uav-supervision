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
    INIT: ['info', '◌'],
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
  const CHAIN_NAME = { chainmaker: 'ChainMaker 监管链', fabric: 'Fabric 运营链', 'fisco-bcos': 'FISCO BCOS 管理链', irita: 'IRITA 证照链' };
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

  /* ---------- 表单 ---------- */
  function form(fields) {
    const els = {};
    const root = h('div', { class: 'p-form' }, fields.map(f => {
      let inp, wrap;
      if (f.type === 'select') {
        inp = h('select', { 'data-f': f.name },
          (f.options || []).map(o => optEl(o, f.value)));
      } else if (f.type === 'multi') {
        inp = (f.options || []).map(o => multiBox(o, f.value, f.name));
        // 容器引用随字段条目留存：初始 options 为空时 setOptions 仍可定位
        wrap = h('span', { class: 'p-multi' }, ...inp);
      } else if (f.type === 'textarea') {
        inp = h('textarea', { 'data-f': f.name, rows: f.rows || 3, placeholder: f.placeholder || '' },
          f.value || '');
      } else {
        inp = h('input', {
          type: f.type === 'number' ? 'number' : 'text', 'data-f': f.name,
          value: f.value ?? '', placeholder: f.placeholder || '', step: f.step || null,
        });
      }
      els[f.name] = { f, inp, wrap };
      const wide = f.type === 'textarea' || f.type === 'multi';
      return h('label', { class: 'p-field' + (wide ? ' p-field-wide' : '') },
        h('span', { class: 'p-field-label' }, f.label,
          f.required ? h('i', { class: 'p-req' }, '*') : null),
        f.type === 'multi' ? wrap : inp,
        f.hint ? h('span', { class: 'p-field-hint' }, f.hint) : null);
    }));
    function optEl(o, cur) {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: String(cur ?? '') === String(v) }, t);
    }
    // multi 的 checkbox 一律用 data-mf="<字段名>" 定位（value 可能重复跨字段）
    function multiBox(o, cur, name) {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      const arr = Array.isArray(cur) ? cur : (cur ? [cur] : []);
      return h('label', { class: 'p-multi-item' },
        h('input', { type: 'checkbox', 'data-mf': name, value: v, checked: arr.map(String).includes(String(v)) }),
        h('span', {}, t));
    }
    function read() {
      const out = {};
      fields.forEach(f => {
        const e = els[f.name];
        if (f.type === 'multi') {
          const v = Array.from(root.querySelectorAll('input[data-mf="' + f.name + '"]:checked')).map(i => i.value);
          if (v.length) out[f.name] = v;
          return;
        }
        let v = e.inp.value;
        if (f.type === 'number' && v !== '') v = Number(v);
        if (typeof v === 'string') v = f.type === 'textarea' ? v.trim() : v;
        if (v !== '' && v !== null && v !== undefined) out[f.name] = v;
      });
      return out;
    }
    function set(name, val) {
      const e = els[name]; if (!e) return;
      if (e.f.type === 'multi') {
        const arr = (Array.isArray(val) ? val : [val]).map(String);
        root.querySelectorAll('input[data-mf="' + name + '"]').forEach(i => { i.checked = arr.includes(i.value); });
        return;
      }
      e.inp.value = val ?? '';
    }
    function setOptions(name, options) {
      const e = els[name]; if (!e) return;
      if (e.f.type === 'select') {
        e.inp.innerHTML = '';
        options.forEach(o => e.inp.append(optEl(o, e.inp.value)));
      } else if (e.f.type === 'multi') {
        // 优先用建表时留存的容器引用；e.inp[0].closest 仅作兜底（原行为不变）
        const wrap = e.wrap || (e.inp[0] && e.inp[0].closest('.p-multi'));
        if (!wrap) return;
        wrap.innerHTML = '';
        options.forEach(o => {
          const [v, t] = Array.isArray(o) ? o : [o, o];
          wrap.append(h('label', { class: 'p-multi-item' },
            h('input', { type: 'checkbox', 'data-mf': name, value: v }), h('span', {}, t)));
        });
        // 刷新 e.inp 防条目过期（read/set 本就经 root+data-mf 定位，行为一致）
        e.inp = Array.from(wrap.querySelectorAll('input[data-mf="' + name + '"]'));
      }
    }
    return { root, read, set, setOptions };
  }

  /* ---------- 数据表：过滤条 + 服务端分页 ---------- */
  function dataTable(opts) {
    const st = { page: 1, pageSize: opts.pageSize || 10, total: 0, filters: {} };
    (opts.filters || []).forEach(f => { if (f.value) st.filters[f.name] = f.value; });
    const body = h('div', { class: 'p-dt-body' }, h('div', { class: 'p-empty' }, '⏳ 加载中…'));
    const pager = h('div', { class: 'p-dt-pager' });
    const fEls = {};
    const filterBar = (opts.filters && opts.filters.length) ? h('div', { class: 'p-dt-filters' },
      opts.filters.map(f => {
        const el = f.type === 'select'
          ? h('select', {}, [h('option', { value: '' }, '全部' + f.label)]
              .concat((f.options || []).map(o => h('option', { value: o, selected: st.filters[f.name] === o }, o))))
          : h('input', { type: 'text', placeholder: f.label, value: st.filters[f.name] || '' });
        fEls[f.name] = el;
        return h('label', { class: 'p-dt-filter' }, el);
      }),
      h('button', { class: 'p-btn p-btn-sm', onClick: () => { readFilters(); load(1); } }, '查询'),
      h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
        onClick: () => { Object.keys(fEls).forEach(k => fEls[k].value = ''); st.filters = {}; load(1); } }, '重置'))
      : null;
    function readFilters() {
      st.filters = {};
      Object.keys(fEls).forEach(k => { if (fEls[k].value !== '') st.filters[k] = fEls[k].value; });
    }
    const root = h('div', { class: 'p-dt' },
      h('div', { class: 'p-dt-head' }, filterBar || h('span', {}),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', title: '刷新', onClick: () => load(st.page) }, '⟳ 刷新')),
      body, pager);
    async function load(page) {
      if (page) st.page = page;
      body.innerHTML = ''; body.append(h('div', { class: 'p-empty' }, '⏳ 加载中…'));
      pager.innerHTML = '';
      const reqBody = Object.assign({}, opts.baseBody || {}, st.filters,
        { page: st.page, page_size: st.pageSize });
      const r = await API.call(opts.endpoint, reqBody);
      body.innerHTML = '';
      if (!r.ok) { body.append(errCard(r)); return; }
      const d = r.data || {};
      st.total = d.total || 0;
      const recs = d.records || [];
      if (!recs.length) body.append(empty(opts.emptyText));
      else body.append(renderRows(recs));
      renderPager();
      if (opts.onLoaded) opts.onLoaded(recs, d, r);
    }
    function renderRows(recs) {
      const cols = opts.columns;
      return h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
        h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.num ? 'num' : null }, c.title)))),
        h('tbody', {}, recs.map((rec, i) => h('tr', {
          onClick: opts.onRow ? () => opts.onRow(rec, i) : null,
          class: opts.onRow ? 'clickable' : null,
        }, cols.map(c => h('td', { class: (c.num ? 'num ' : '') + (c.mono ? 'p-mono' : '') },
          c.render ? c.render(rec, i) : String(rec[c.key] ?? '—'))))))));
    }
    function renderPager() {
      const pages = Math.max(1, Math.ceil(st.total / st.pageSize));
      pager.append(
        h('span', { class: 'p-dt-total' }, '共 ' + st.total + ' 条 · 第 ' + st.page + '/' + pages + ' 页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page <= 1,
          onClick: () => load(st.page - 1) }, '‹ 上一页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page >= pages,
          onClick: () => load(st.page + 1) }, '下一页 ›'));
    }
    root.reload = extra => { if (extra) Object.assign(st.filters, extra); load(st.page); };
    if (opts.autoLoad !== false) load(1);
    return root;
  }

  /* ---------- CSV 导出（BOM 头保证 Excel 中文兼容） ---------- */
  function csvExport(opts) {
    const b = h('button', { class: 'p-btn p-btn-sm' }, opts.label || '⤓ 导出 CSV');
    b.addEventListener('click', async () => {
      b.disabled = true;
      const body = Object.assign({}, opts.body || {}, opts.filters ? opts.filters() : {});
      const r = await API.call(opts.endpoint, body);
      b.disabled = false;
      if (!r.ok) { UI.toast('导出失败 code=' + r.code + '：' + r.message, 'err'); return; }
      const name = opts.filename || (opts.endpoint.replace(/[\/\W]+/g, '_') + '.csv');
      const url = URL.createObjectURL(new Blob(['﻿' + r.data.content],
        { type: 'text/csv;charset=utf-8' }));
      const a = h('a', { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      UI.toast('已导出 ' + (r.data.rows ?? '?') + ' 行 → ' + name);
    });
    return b;
  }

  /* ---------- 统计卡 / 条形 / 评分条 ---------- */
  function statCards(items) {
    return h('div', { class: 'p-stats' }, items.filter(Boolean).map(it =>
      h('div', { class: 'p-stat' + (it.tone ? ' p-tone-' + it.tone : '') },
        h('div', { class: 'p-stat-label' }, it.label),
        h('div', { class: 'p-stat-value' }, String(it.value ?? '—')),
        it.sub ? h('div', { class: 'p-stat-sub' }, it.sub) : null)));
  }
  function hbars(items) {
    const max = Math.max(1, ...items.map(i => Number(i.value) || 0));
    return h('div', { class: 'p-hbars' }, items.map(i =>
      h('div', { class: 'p-hbar' },
        h('span', { class: 'p-hbar-label' }, i.label),
        h('span', { class: 'p-hbar-track' },
          h('i', { class: 'p-hbar-fill' + (i.tone ? ' p-tone-' + i.tone : ''),
            style: { width: Math.round((Number(i.value) || 0) / max * 100) + '%' } })),
        h('b', { class: 'p-hbar-val' }, String(i.value ?? 0)))));
  }
  function scoreBars(dims, threshold) {
    const names = { identity: '身份一致性', adjacency: '邻接真实性', latency: '时延合理性',
      challenge: '挑战同步性', path: '路径稳定性' };
    const rows = Object.keys(dims).map(k => ({ k, v: Number(dims[k]) || 0 }));
    return h('div', { class: 'p-scores' },
      rows.map(r => h('div', { class: 'p-score-row' },
        h('span', { class: 'p-score-name' }, names[r.k] || r.k),
        h('span', { class: 'p-hbar-track' },
          h('i', { class: 'p-hbar-fill' + (r.v >= (threshold ?? 0.7) ? ' p-tone-critical' : ' p-tone-good'),
            style: { width: Math.min(100, Math.round(r.v * 100)) + '%' } }),
          threshold != null ? h('u', { class: 'p-score-thr',
            style: { left: Math.min(100, Math.round(threshold * 100)) + '%' } }) : null),
        h('b', { class: 'p-mono' }, r.v.toFixed(2)))));
  }

  /* ---------- 跨链四段存证 ---------- */
  function copyBtn(tx) {
    return tx ? h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
      onClick: e => { e.stopPropagation(); navigator.clipboard && navigator.clipboard.writeText(tx); UI.toast('已复制 TxID'); } },
      '复制') : null;
  }
  function cxSeg(idx, role, chain, tx, crossTxId) {
    return h('div', { class: 'p-cx-seg' + (tx ? '' : ' missing'), onClick: () => openCxDetail(crossTxId) },
      h('div', { class: 'p-cx-role' }, idx + ' ' + role, chain ? chainTag(chain) : null),
      h('div', { class: 'p-cx-tx p-mono' }, tx ? UI.trunc(tx, 40) : '—'),
      copyBtn(tx));
  }
  function cxTrail(cx) {
    if (!cx) return null;
    return h('div', { class: 'p-cx' },
      h('div', { class: 'p-cx-head' },
        h('code', { class: 'p-mono' }, cx.cross_tx_id), badge(cx.status),
        h('span', { class: 'p-cx-sub' }, cx.message_type, ' · ', (cx.latency_ms ?? '—') + 'ms',
          ' · verify=', cx.verify_result || '—', ' · policy=', cx.policy_result || '—',
          cx.error_code ? ' · error_code=' + cx.error_code : '')),
      h('div', { class: 'p-cx-flow' },
        cxSeg('①', '源链上链', cx.source_chain, cx.source_chain_tx_id, cx.cross_tx_id),
        cxSeg('②', '监管链签收', 'chainmaker', cx.reg_receive_tx_id, cx.cross_tx_id),
        cxSeg('③', '监管链中继', 'chainmaker', cx.reg_relay_tx_id, cx.cross_tx_id),
        cxSeg('④', '目标链存证', cx.final_target_chain, cx.target_chain_tx_id, cx.cross_tx_id)));
  }
  async function openCxDetail(crossTxId) {
    if (!crossTxId) return;
    const d = drawer('跨链存证详情 ' + crossTxId, h('div', { class: 'p-empty' }, '⏳ 查询中…'));
    const r = await API.call('/api/crosschain/query', { cross_tx_id: crossTxId });
    d.root.querySelector('.p-drawer-body').innerHTML = '';
    const body = d.root.querySelector('.p-drawer-body');
    if (!r.ok) { body.append(errCard(r)); return; }
    const x = r.data;
    body.append(cxTrail(x),
      kv([
        ['业务单号', h('code', { class: 'p-mono' }, x.business_id)],
        ['监管记录', x.reg_record_id || '—'],
        ['幂等键', h('code', { class: 'p-mono' }, UI.trunc(x.idempotency_key, 48))],
        x.retry_of ? ['重试自', h('code', { class: 'p-mono' }, x.retry_of)] : null,
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(x.sm3_hash, 48))],
        ['SM9 身份', h('code', { class: 'p-mono' }, x.sm9_identity || '—')],
        ['签名', h('code', { class: 'p-mono' }, UI.trunc(x.signature, 48))],
        ['错误码', x.error_code ? String(x.error_code) : '0'],
        ['创建/更新', x.created_at + ' → ' + x.updated_at],
      ]),
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  /* ---------- 消息逐跳时延 ---------- */
  function pathHops(hops) {
    if (!hops || !hops.length) return empty('无逐跳明细');
    const max = Math.max(1, ...hops.map(x => Number(x.latency_ms) || 0));
    return h('div', { class: 'p-hops' }, hops.map(x =>
      h('div', { class: 'p-hop' },
        h('span', { class: 'p-hop-label p-mono' }, x.from + ' → ' + x.to),
        h('span', { class: 'p-hbar-track' },
          h('i', { class: 'p-hbar-fill', style: { width: Math.max(6, Math.round((Number(x.latency_ms) || 0) / max * 100)) + '%' } })),
        h('b', { class: 'p-mono' }, (x.latency_ms ?? '—') + 'ms'))));
  }

  /* ---------- 链下拓扑 SVG（新视觉；算法照抄 act2.js topoSVG 34-100 行，仅替换类名/颜色令牌） ---------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TYPE_COLOR = { UAV: 'var(--p-chain-fabric)', EDGE: 'var(--p-good)', MANAGEMENT: 'var(--p-chain-chainmaker)', ATTACKER: 'var(--p-critical)' };
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }
  function parsePos(p) {
    try { const o = typeof p === 'string' ? JSON.parse(p) : (p || {});
      return { x: Number(o.x ?? o.X ?? 50), y: Number(o.y ?? o.Y ?? 50) }; }
    catch (_) { return { x: 50, y: 50 }; }
  }
  function topoSVG(topo, hlPath) {
    const W = 700, H = 470;
    const svg = svgEl('svg', { class: 'p-topo', viewBox: '0 0 ' + W + ' ' + H });
    const pos = {};
    topo.nodes.forEach(n => {
      const p = parsePos(n.position);
      pos[n.node_id] = { X: 40 + p.x * 6.1, Y: 30 + p.y * 5.6 };
    });
    const hl = new Set();
    if (hlPath && hlPath.length > 1) for (let i = 0; i < hlPath.length - 1; i++) hl.add(hlPath[i] + '|' + hlPath[i + 1]);
    const inHl = (a, b) => hl.has(a + '|' + b) || hl.has(b + '|' + a);
    // 边
    topo.edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const line = svgEl('line', { x1: a.X, y1: a.Y, x2: b.X, y2: b.Y,
        class: 'p-topo-edge' + (e.wormhole_edge ? ' p-topo-wormhole' : (inHl(e.from, e.to) ? ' p-topo-active' : '')) });
      line.addEventListener('mousemove', ev => UI.showTip(
        '<b>' + e.from + ' ⇄ ' + e.to + '</b><br>距离 ' + Number(e.distance || 0).toFixed(1) +
        ' · 宣告延迟 ' + (e.advertised_latency_ms ?? '—') + 'ms' +
        (e.wormhole_edge ? '<br>⚠ 虫洞伪造边' : '') + (inHl(e.from, e.to) ? '<br>● 当前会话路径' : ''), ev.clientX, ev.clientY));
      line.addEventListener('mouseleave', UI.hideTip);
      svg.append(line);
    });
    // 节点
    topo.nodes.forEach(n => {
      const p = pos[n.node_id];
      const g = svgEl('g', { class: 'p-topo-node' });
      const isolated = n.status === 'ISOLATED', offline = n.status === 'OFFLINE';
      const c = svgEl('circle', { cx: p.X, cy: p.Y,
        r: n.node_type === 'MANAGEMENT' ? 13 : n.node_type === 'ATTACKER' ? 11 : 10,
        fill: offline ? 'transparent' : (TYPE_COLOR[n.node_type] || 'var(--p-ink-3)'),
        stroke: isolated ? 'var(--p-critical)' : offline ? 'var(--p-ink-3)' : 'var(--p-line-strong)',
        'stroke-width': isolated ? 3 : 2,
        'stroke-dasharray': isolated ? '4 3' : '' });
      g.append(c);
      const label = svgEl('text', { x: p.X, y: p.Y + 24, class: 'p-topo-label' });
      label.textContent = (isolated ? '⛔' : offline ? '○ ' : '') + n.node_id;
      if (isolated) label.setAttribute('fill', 'var(--p-critical)');
      g.append(label);
      if (n.node_type === 'ATTACKER') {
        const tag = svgEl('text', { x: p.X, y: p.Y - 16, 'text-anchor': 'middle', fill: 'var(--p-critical)', 'font-size': '10' });
        tag.textContent = '⚠ ATTACKER';
        g.append(tag);
      }
      g.addEventListener('mousemove', ev => UI.showTip(
        '<b>' + n.node_id + '</b><br>类型 ' + n.node_type + ' · 状态 ' + n.status +
        '<br>SM9 ' + UI.trunc(n.sm9_identity || '—', 30) +
        '<br>邻居 ' + (n.neighbors || '[]') + (n.risk_score ? '<br>风险分 ' + n.risk_score : ''), ev.clientX, ev.clientY));
      g.addEventListener('mouseleave', UI.hideTip);
      svg.append(g);
    });
    return svg;
  }

  window.PUI = {
    h, badge, chainTag, kv, empty, metaLine, errCard, resultPanel, actionBar,
    confirm, drawer, chipBar, pageHead, tabs, tabParam, setTabParam, runOp,
    form, dataTable, csvExport, statCards, scoreBars, hbars, cxTrail,
    openCxDetail, topoSVG, pathHops,
  };
})();
