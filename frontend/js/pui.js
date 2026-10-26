/* pui.js —— 新产品组件库：p- 前缀类 + --p-* 令牌（样式在 css/product.css）。
   只复用旧 ui.js 的纯函数（h/jsonBlock/toast/showTip/hideTip/datetimeLocal/tsSuffix）
   与 EXPLAIN 词典；不复用旧组件的 DOM/类名——两套视觉互不渗透。 */
(function () {
  'use strict';
  const h = UI.h;

  /* 调试态：URL 加 ?debug=1 或 localStorage.setItem('skytrust-debug','1') 后刷新——
     演示态默认隐藏 code/trace/延迟/原始 JSON 等协议信息（去 AI 味 §4） */
  const DEBUG = /[?&]debug=1/.test(location.search) ||
                (function () { try { return localStorage.getItem('skytrust-debug') === '1'; } catch (e) { return false; } })();
  if (DEBUG) try { document.documentElement.setAttribute('data-debug', '1'); } catch (e) {}

  /* ---------- 状态徽章（语义色映射表与旧系统一致；图标由 TONE_ICON 走 SVG 雪碧图，
     不再携带字符画字形——去 AI 味 §3.1 三重编码：颜色 + 图标 + 中文） ---------- */
  const STATUS_MAP = {
    ONLINE: 'good', VERIFIED: 'good', SUCCESS: 'good', VALID: 'good',
    ACTIVE: 'good', APPROVED: 'good', RESOLVED: 'good', AUTHORIZED: 'good',
    RECOVERED: 'good', DONE: 'good', PASS: 'good',
    ROUTE_OK: 'good', PAYLOAD_OK: 'good', QUALIFIED: 'good', RELAYED: 'good',
    AUTHENTICATED: 'good', RECOVER: 'good', EXECUTING: 'good', LOW: 'good',
    PENDING: 'warning', DRAFT: 'warning', DEGRADED: 'warning',
    SENT: 'warning', SUBMITTED: 'warning', REVIEWING: 'warning',
    COORDINATING: 'warning', SUSPENDED: 'warning', NEED_COORDINATION: 'warning',
    ARCHIVED: 'warning', TIME: 'warning', ROUTE: 'warning', ALTITUDE: 'warning', MEDIUM: 'warning',
    SEALED: 'critical', OFFLINE: 'critical', ISOLATED: 'critical',
    REVOKED: 'critical', FAILED: 'critical', REJECTED: 'critical',
    DENIED: 'critical', DETECT: 'critical', BLOCK: 'critical',
    ATTACKER: 'critical', ISOLATE: 'critical',
    ROUTE_DEVIATION: 'critical', EXPIRED: 'critical', ABORTED: 'critical',
    HIGH: 'critical', BROKEN: 'critical',
    REGISTERED: 'info', GENERATING: 'info', USED: 'info', INIT: 'info', COMPLETED: 'info',
    MISSION_MISMATCH: 'serious', OPEN: 'serious', IDENTIFIED: 'serious', TRACED: 'serious',
    REVIEWED: 'serious',
  };
  /* 状态中文词典：英文枚举退出界面，降级为徽章 tooltip（去 AI 味 §3.1） */
  const STATUS_ZH = {
    ONLINE: '在线', VERIFIED: '已核验', SUCCESS: '成功', VALID: '生效中', ACTIVE: '启用',
    APPROVED: '已批准', RESOLVED: '已处置', AUTHORIZED: '已授权', RECOVERED: '已恢复',
    DONE: '已完成', PASS: '通过', ROUTE_OK: '航路合规', PAYLOAD_OK: '载荷合规',
    QUALIFIED: '合格', RELAYED: '已中继',
    PENDING: '待处理', DRAFT: '草稿', DEGRADED: '已降级', SENT: '已发送', SUBMITTED: '已提交',
    REVIEWING: '审核中', COORDINATING: '协调中', SUSPENDED: '已暂停', NEED_COORDINATION: '待协调',
    SEALED: '已封缄', OFFLINE: '离线', ISOLATED: '已隔离', REVOKED: '已吊销', FAILED: '失败',
    REJECTED: '已驳回', DENIED: '已拒绝', DETECT: '已检测', BLOCK: '已阻断',
    ROUTE_DEVIATION: '航线偏离', EXPIRED: '已过期', ABORTED: '已中止',
    INVALID_PASS: '许可无效', UNKNOWN_NODE_ACCESS: '未知节点接入',
    WORMHOLE_ALERT: '虫洞告警', IDENTITY_ANOMALY: '身份异常',
    ALERT_ID: '告警号', PSEUDO: '航空器伪名', DEVICE_ADDRESS: '设备地址',
    REGISTERED: '已登记', GENERATING: '生成中', USED: '已使用', INIT: '初始化',
    ENTERPRISE: '企业', INDIVIDUAL: '个人',
    MISSION_MISMATCH: '任务不匹配', COMPLETED: '已完成', ARCHIVED: '已归档',
    OPEN: '待处置', IDENTIFIED: '已定位', TRACED: '已追踪', REVIEWED: '已复核',
    HIGH: '高危', MEDIUM: '中风险', LOW: '低风险', BROKEN: '断链',
    SOURCE_CONFIRMED: '源链已确认', REG_RECEIVED: '监管已签收',
    REG_VERIFIED: '监管已核验', REG_RELAYED: '监管已中继',
    TARGET_CONFIRMED: '目标链已确认', RETURN_REG_RECEIVED: '回程监管已签收',
    AUTHENTICATED: '已认证', CLOSED: '已关闭', OPENED: '已开启', UNKNOWN: '未知',
    /* 节点类型 / 会话消息类型 / 安全动作 / 场景 / 实验类型（去 AI 味 §3.1 同律） */
    MANAGEMENT: '管理节点', EDGE: '边缘节点', UAV: '无人机', ATTACKER: '攻击节点',
    HEARTBEAT: '心跳', POSITION_UPDATE: '位置上报', PASS_VERIFY: '许可核验',
    NODE_CHALLENGE: '节点挑战', ROUTE_STATUS: '航路状态', EVENT_REPORT: '事件上报',
    ISOLATE: '隔离', RECOVER: '恢复', NORMAL: '正常', ATTACK: '攻击', DEFENSE: '防御',
    EXECUTING: '执行中', TIME: '时窗重叠', ROUTE: '航路交叉', ALTITUDE: '高度冲突',
    CROSSCHAIN_LOOP: '跨链全流程回环', SM3_INTEGRITY: 'SM3 摘要完整性', SM9_VERIFY: 'SM9 签名验真',
    CONFLICT_DETECT: '三维冲突检测', MESSAGE_FLOW: '消息链路三场景', RISK_SCAN: '虫洞风险扫描',
    STRESS: '链下并发压力', TRACE_BATCH: '批量身份追踪', INSPECT_UNAUTHORIZED: '未授权封缄核验',
    INSPECT_AUTHORIZED: '授权密文开箱', ALERT_BATCH: '告警批量流转',
  };
  /* 语义色 → SVG 图标（雪碧图 d-ico-*；serious 用三角警示） */
  const TONE_ICON = { good: 'check', warning: 'clock', critical: 'x',
                      serious: 'triangle-alert', info: 'dot', neutral: 'dot' };
  function statusZh(s) { return STATUS_ZH[String(s)] || String(s ?? '—'); }
  function badge(status) {
    const s = String(status ?? '—');
    const tone = STATUS_MAP[s] || 'neutral';
    return h('span', { class: 'p-badge p-tone-' + tone, title: s },   // 英文枚举降级为悬浮提示
      h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
        h('use', { href: '#d-ico-' + (TONE_ICON[tone] || 'dot') })),
      statusZh(s));
  }
  /* 领域徽章：同一枚举在不同业务域语义不同（如走廊 OPEN=开放 / 告警 OPEN=待处置）时，
     由页面给出权威中文与语义色；结构与 badge 同构（图标 + 中文 + 枚举 tooltip） */
  function badgeZh(status, zh, tone) {
    const t = tone || 'neutral';
    return h('span', { class: 'p-badge p-tone-' + t, title: String(status ?? '') },
      h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
        h('use', { href: '#d-ico-' + (TONE_ICON[t] || 'dot') })),
      String(zh ?? status ?? '—'));
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
    if (!DEBUG) return null;                       // 演示态：整行不渲染
    return h('div', { class: 'p-meta' },
      r.ok ? h('span', { class: 'p-badge p-tone-good' }, '✓ code=0')
           : h('span', { class: 'p-badge p-tone-critical' }, '✕ code=' + r.code),
      h('span', {}, '⏱ ' + r.latencyMs + 'ms'),
      r.trace_id ? h('span', {}, 'trace ', h('code', { class: 'p-mono' }, r.trace_id)) : null,
      r.timestamp ? h('span', { class: 'p-meta-ts' }, r.timestamp) : null);
  }
  function errCard(r) {
    const why = (window.EXPLAIN && EXPLAIN.codes[r.code]) || '';
    return h('div', { class: 'p-err', title: 'code=' + r.code },
      h('div', { class: 'p-err-head' }, (r.message || '操作未成功')),
      r.code === -1
        ? h('div', { class: 'p-err-why' }, '后端服务暂不可达：请确认平台服务已启动后重试。')
        : why ? h('div', { class: 'p-err-why' }, why) : null);
  }
  function resultPanel() {
    const root = h('div', { class: 'p-result' });
    function show(r, renderFn) {
      root.innerHTML = '';
      const ml = metaLine(r);
      if (ml) root.append(ml);
      if (!r.ok) root.append(errCard(r));
      else if (renderFn) { const v = renderFn(r.data, r); if (v) root.append(v); }
      if (DEBUG) root.append(h('details', { class: 'p-rawjson' },
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
        h('button', { class: 'p-btn p-btn-ghost p-btn-sm', title: '关闭', onClick: () => close() },
          h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
            h('use', { href: '#d-ico-x' })))),
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
        el.disabled = true; const old = el.textContent; el.textContent = old + '…';
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
      wrap.append(h('span', { class: 'p-chip p-chip-empty' }, '（暂无关联对象 · 办理业务后自动汇集）'));
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
      class: 'p-chip p-chip-clear', title: '清空当前业务对象标记（不影响后端数据）',
      onClick: () => STORE.clear(),
    }, h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
      h('use', { href: '#d-ico-x' })), '清空'));
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
        if (o.successText) parts.push(h('div', { class: 'p-ok-line' },
          h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
            h('use', { href: '#d-ico-check' })), o.successText));
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
    const body = h('div', { class: 'p-dt-body' }, h('div', { class: 'p-empty' }, '加载中…'));
    const pager = h('div', { class: 'p-dt-pager' });
    const fEls = {};
    const filterBar = (opts.filters && opts.filters.length) ? h('div', { class: 'p-dt-filters' },
      opts.filters.map(f => {
        const el = f.type === 'select'
          ? h('select', {}, [h('option', { value: '' }, '全部' + f.label)]
              .concat((f.options || []).map(o => {
                const [v, t] = Array.isArray(o) ? o : [o, o];   // 支持 [枚举, 中文] 对
                return h('option', { value: v, selected: st.filters[f.name] === v }, t);
              })))
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
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', title: '刷新', onClick: () => load(st.page) }, '刷新')),
      body, pager);
    async function load(page) {
      if (page) st.page = page;
      body.innerHTML = ''; body.append(h('div', { class: 'p-empty' }, '加载中…'));
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
    function chevron(dir) {   /* 分页方向图标（内联 SVG，不依赖雪碧图） */
      return h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true',
        style: { width: '12px', height: '12px' } },
        h('path', dir === 'left' ? { d: 'M14.5 5.5 8 12l6.5 6.5' } : { d: 'M9.5 5.5 16 12l-6.5 6.5' }));
    }
    function renderPager() {
      const pages = Math.max(1, Math.ceil(st.total / st.pageSize));
      pager.append(
        h('span', { class: 'p-dt-total' }, '共 ' + st.total + ' 条 · 第 ' + st.page + '/' + pages + ' 页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page <= 1,
          onClick: () => load(st.page - 1) }, chevron('left'), '上一页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page >= pages,
          onClick: () => load(st.page + 1) }, '下一页', chevron('right')));
    }
    root.reload = extra => { if (extra) Object.assign(st.filters, extra); load(st.page); };
    if (opts.autoLoad !== false) load(1);
    return root;
  }

  /* ---------- CSV 导出（BOM 头保证 Excel 中文兼容） ---------- */
  function csvExport(opts) {
    const b = h('button', { class: 'p-btn p-btn-sm' }, opts.label || '导出 CSV');
    b.addEventListener('click', async () => {
      b.disabled = true;
      const body = Object.assign({}, opts.body || {}, opts.filters ? opts.filters() : {});
      const r = await API.call(opts.endpoint, body);
      b.disabled = false;
      if (!r.ok) { UI.toast('导出失败：' + (r.message || '请稍后重试'), 'err'); return; }
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
      h('div', Object.assign({ class: 'p-stat' + (it.tone ? ' p-tone-' + it.tone : '') },
        it.title ? { title: it.title } : null),
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
        h('span', { class: 'p-cx-sub' },
          (window.CXV && CXV.msgTypeZh) ? CXV.msgTypeZh(cx.message_type) : cx.message_type,
          ' · 耗时 ' + (window.UI.fmtMs ? UI.fmtMs(cx.latency_ms) : (cx.latency_ms ?? '—')),
          ' · 验签' + (cx.verify_result === 'PASS' ? '通过' : (cx.verify_result || '—')),
          ' · 策略' + (cx.policy_result === 'PASS' ? '通过' : (cx.policy_result || '—')),
          cx.error_code ? ' · 失败码 ' + cx.error_code : '')),
      h('div', { class: 'p-cx-flow' },
        cxSeg('①', '源链上链', cx.source_chain, cx.source_chain_tx_id, cx.cross_tx_id),
        cxSeg('②', '监管链签收', 'chainmaker', cx.reg_receive_tx_id, cx.cross_tx_id),
        cxSeg('③', '监管链中继', 'chainmaker', cx.reg_relay_tx_id, cx.cross_tx_id),
        cxSeg('④', '目标链存证', cx.final_target_chain, cx.target_chain_tx_id, cx.cross_tx_id)));
  }
  async function openCxDetail(crossTxId) {
    if (!crossTxId) return;
    const d = drawer('跨链存证详情', h('div', { class: 'p-empty' }, '查询中…'));
    const r = await API.call('/api/crosschain/query', { cross_tx_id: crossTxId });
    d.root.querySelector('.p-drawer-body').innerHTML = '';
    const body = d.root.querySelector('.p-drawer-body');
    if (!r.ok) { body.append(errCard(r)); return; }
    const x = r.data;
    const hex = v => h('code', { class: 'p-mono', title: v }, UI.trunc(v, 22));
    body.append(cxTrail(x),
      kv([
        ['流水号', h('code', { class: 'p-mono', title: x.cross_tx_id }, UI.trunc(x.cross_tx_id, 22))],
        ['业务单号', h('code', { class: 'p-mono' }, x.business_id)],
        ['监管记录', x.reg_record_id || '—'],
        ['幂等键', hex(x.idempotency_key)],
        x.retry_of ? ['重试自', h('code', { class: 'p-mono' }, x.retry_of)] : null,
        ['SM3 摘要', hex(x.sm3_hash)],
        ['SM9 身份', h('code', { class: 'p-mono' }, x.sm9_identity || '—')],
        ['签名', hex(x.signature)],
        x.error_code ? ['失败码', String(x.error_code)] : null,
        ['创建/更新', UI.fmtDT(x.created_at, true) + ' → ' + UI.fmtDT(x.updated_at, true)],
      ]));
    if (DEBUG) body.append(h('details', { class: 'p-rawjson' },
      h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
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
  const TYPE_ZH = { UAV: '无人机', EDGE: '边缘节点', MANAGEMENT: '管理节点', ATTACKER: '攻击节点' };
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
        (e.wormhole_edge ? '<br>虫洞伪造边（预警）' : '') + (inHl(e.from, e.to) ? '<br>● 当前会话路径' : ''), ev.clientX, ev.clientY));
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
      label.textContent = n.node_id;
      if (isolated) label.setAttribute('fill', 'var(--p-critical)');
      g.append(label);
      if (n.node_type === 'ATTACKER') {
        const tag = svgEl('text', { x: p.X, y: p.Y - 16, 'text-anchor': 'middle', fill: 'var(--p-critical)', 'font-size': '10' });
        tag.textContent = '攻击节点';
        g.append(tag);
      }
      g.addEventListener('mousemove', ev => UI.showTip(
        '<b>' + n.node_id + '</b><br>类型 ' + (TYPE_ZH[n.node_type] || n.node_type) +
        ' · 状态 ' + statusZh(n.status) +
        '<br>SM9 ' + UI.trunc(n.sm9_identity || '—', 30) +
        '<br>邻居 ' + (n.neighbors || '[]') + (n.risk_score ? '<br>风险分 ' + n.risk_score : ''), ev.clientX, ev.clientY));
      g.addEventListener('mouseleave', UI.hideTip);
      svg.append(g);
    });
    return svg;
  }

  window.PUI = {
    h, badge, badgeZh, chainTag, kv, empty, metaLine, errCard, resultPanel, actionBar,
    confirm, drawer, chipBar, pageHead, tabs, tabParam, setTabParam, runOp,
    form, dataTable, csvExport, statCards, scoreBars, hbars, cxTrail,
    openCxDetail, topoSVG, pathHops, statusZh, DEBUG,
  };
})();
