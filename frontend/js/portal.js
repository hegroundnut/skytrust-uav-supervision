/* portal.js — 三端共享薄壳（计划 B Task 5，spec §4.1）
   职责：boot() 接管全部页面 chrome 逻辑——导航构建、hash 路由（#/name?tab=… → registry）、
   三链灯 + 后端徽章心跳（15s，复刻 app.js pollChains 语义）、上下文 chip 条挂载、
   天地图 key 引导（每会话一次，Global Constraints #8）。
   页面代码（js/pages/<portal>/<name>.js）只需注册 window.XX_PAGES.name = {render(root, ctx)}。
   依赖：ui.js(UI) / pui.js(PUI) / api.js(API) / map.js(MAPX)，加载顺序见三端 HTML。 */
(function () {
  'use strict';
  var h = window.PUI.h;

  /* 链固定次序与 app.js / CLAUDE.md 一致：ChainMaker 监管 / Fabric 运营 / FISCO BCOS 管理；
     末位 irita 证照链为 Task 6 追加（四门户壳心跳灯 4 盏；index.html 旧壳仍 3 盏，app.js 冻结不动） */
  var CHAINS = [
    { key: 'chainmaker', label: '监管链' },
    { key: 'fabric', label: '运营链' },
    { key: 'fisco-bcos', label: '管理链' },
    { key: 'irita', label: 'IRITA 证照链' }
  ];
  var KEYGUIDE_FLAG = 'skytrust-keyguide-shown';   /* sessionStorage：引导每会话只弹一次 */

  /* --- 图标：引用各端 HTML 内联 SVG symbol（三端各持一份完整雪碧图） --- */
  function ico(name, extraCls) {
    return h('svg', { class: ('d-ico ' + (extraCls || '')).trim() },
      h('use', { href: '#d-ico-' + name }));
  }

  /* --- 二维码：qrcode-generator 2.0.4（仅 operator.html 加载；其余端调用恒 null） --- */
  function qrSVG(text) {
    if (!text || typeof window.qrcode !== 'function') return null;
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(String(text));
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
    } catch (e) { return null; }   /* 内容超长等 → null，调用方渲染兜底文案，不 crash */
  }
  /* renderQR：成功把 SVG 写进 el（保留 el 自身类）；失败 el 变 .d-qr-none + 兜底文案。
     兜底文案默认对准登记标志为空的场景（Global Constraints #9：不 crash 不渲染空 QR）。 */
  function renderQR(el, text, noneText) {
    var svg = qrSVG(text);
    if (svg) { el.innerHTML = svg; return true; }
    el.className = 'd-qr-none';
    el.textContent = noneText || '未发放登记标志（无二维码内容）';
    return false;
  }

  /* ================= boot：门户唯一入口 ================= */
  function boot(opts) {
    var o = opts || {};
    var registry = window[o.registry] || (window[o.registry] = {});
    var navEl = document.getElementById('d-nav');
    var rootEl = document.getElementById('d-page');
    var chipsEl = document.getElementById('d-chips');
    var lampsEl = document.getElementById('d-lamps');
    var backendEl = document.getElementById('d-backend');

    /* --- 导航构建（top/side 布局共用 .d-nav-item，样式由容器决定） --- */
    var navItems = [];
    (o.nav || []).forEach(function (item) {
      var a = h('a', { class: 'd-nav-item', href: '#/' + item.key, 'data-page': item.key },
        item.ico ? ico(item.ico) : null,
        h('span', {}, item.label));
      navEl.append(a);
      navItems.push(a);
    });

    /* --- 上下文 chip 条（STORE 驱动；重绘/复制/清空由 pui.chipBar 自理） --- */
    if (chipsEl) chipsEl.append(window.PUI.chipBar({}));

    /* --- 三链状态灯（.d-lampwrap > .d-lamp + 文字标签，永不单靠颜色） --- */
    CHAINS.forEach(function (c) {
      lampsEl.append(h('span', { class: 'd-lampwrap' },
        h('span', { class: 'd-lamp', 'data-chain': c.key, title: c.key + ': 探测中…' }),
        c.label));
    });
    function lampsAll(state) {
      lampsEl.querySelectorAll('.d-lamp').forEach(function (l) {
        l.className = 'd-lamp ' + state;
      });
    }

    /* --- 心跳：立即 + 每 15s 轮询 chain/status（语义复刻 app.js pollChains） --- */
    async function heartbeat() {
      try {
        var r = await window.API.call('/api/chain/status', {});
        if (r.ok && r.data && r.data.chains) {
          backendEl.textContent = '后端 ' + r.latencyMs + 'ms';
          backendEl.className = 'd-backend ok';
          lampsEl.querySelectorAll('.d-lamp').forEach(function (l) {
            var st = r.data.chains[l.dataset.chain];
            l.className = 'd-lamp ' + (st === 'ONLINE' ? 'on' : 'off');
            l.title = l.dataset.chain + ': ' + st;
          });
        } else {
          backendEl.textContent = '后端异常 code=' + r.code;
          backendEl.className = 'd-backend bad';
          lampsAll('err');
        }
      } catch (err) {   /* API.call 永不 throw；此 catch 只兜 DOM 意外 */
        backendEl.textContent = '后端不可达';
        backendEl.className = 'd-backend bad';
        lampsAll('err');
      }
    }
    /* 每次业务调用刷新徽章延迟（app.js API.onCall 同语义） */
    window.API.onCall(function (r) {
      backendEl.textContent = '后端 ' + r.latencyMs + 'ms' + (r.ok ? '' : ' · code=' + r.code);
      backendEl.className = 'd-backend ' + (r.ok ? 'ok' : 'bad');
    });

    /* --- 天地图 key 引导（Global Constraints #8：每会话一次；无 key 跳过=退化底图） --- */
    function keyGuideOnce() {
      if (window.MAPX.hasKey()) return;
      try {
        if (sessionStorage.getItem(KEYGUIDE_FLAG)) return;
        sessionStorage.setItem(KEYGUIDE_FLAG, '1');
      } catch (e) { return; }   /* 隐私模式 sessionStorage 不可用 → 不弹引导 */
      var input = h('input', {
        type: 'text', placeholder: '粘贴天地图浏览器端密钥',
        value: window.MAPX.getKey()
      });
      var mask = h('div', { class: 'p-modal-mask' },
        h('div', { class: 'p-modal' },
          h('div', { class: 'p-modal-title' }, '🗺 配置天地图密钥'),
          h('div', { class: 'p-modal-msg' },
            '地图底图使用天地图（免费政务地图服务）。在天地图控制台（console.tianditu.gov.cn）申请「浏览器端」密钥，粘贴到此处保存。',
            '密钥仅保存在本地浏览器，绝不上传服务器、绝不写入代码仓库；未配置时地图自动切换为简化底图，不影响任何业务操作。',
            h('div', { class: 'd-keyform' }, input)),
          h('div', { class: 'p-modal-btns' },
            h('button', { class: 'p-btn p-btn-ghost', onClick: close }, '跳过（简化底图）'),
            h('button', {
              class: 'p-btn p-btn-primary',
              onClick: function () {
                var v = input.value.trim();
                if (!v) { window.UI.toast('密钥不能为空', 'err'); return; }
                window.MAPX.setKey(v);
                close();
                location.reload();     /* 重载使地图以新 key 重建瓦片层 */
              }
            }, '保存并重载'))));
      function close() { document.removeEventListener('keydown', onEsc); mask.remove(); }
      function onEsc(ev) { if (ev.key === 'Escape') close(); }
      document.addEventListener('keydown', onEsc);
      document.body.append(mask);
    }

    /* --- hash 路由：#/name?tab=x → registry[name].render(rootEl, ctx) ---
       pui.setTabParam 写回 hash → hashchange → 重入 route()（tab 切换即重渲染语义不变）。 */
    function current() {
      var raw = (location.hash || '').replace(/^#\/?/, '');
      var qi = raw.indexOf('?');
      return {
        name: (qi >= 0 ? raw.slice(0, qi) : raw) || o.defaultPage,
        query: new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '')
      };
    }
    function route() {
      var cur = current();
      navItems.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-page') === cur.name);
      });
      rootEl.innerHTML = '';
      var page = registry[cur.name];
      if (!page || typeof page.render !== 'function') {
        rootEl.append(window.PUI.pageHead({
          title: '页面暂未开通',
          sub: '该功能页面暂未在本端开通'
        }));
        rootEl.append(window.PUI.empty('请从导航选择功能'));
        return;
      }
      try {
        page.render(rootEl, { query: cur.query, name: cur.name, portal: o.portal });
      } catch (err) {   /* 页面崩溃不拖垮壳：错误卡 + 堆栈（Global Constraints #13） */
        rootEl.innerHTML = '';
        rootEl.append(h('section', { class: 'p-card' },
          h('h3', { class: 'p-card-title' }, '页面渲染异常'),
          h('pre', { class: 'json-block' }, String((err && err.stack) || err))));
      }
      window.scrollTo(0, 0);
      if ((o.mapPages || []).indexOf(cur.name) >= 0) keyGuideOnce();
    }

    window.addEventListener('hashchange', route);
    if (!location.hash || location.hash === '#') {
      history.replaceState(null, '', '#/' + o.defaultPage);   /* 不触发 hashchange，首屏只渲染一次 */
    }
    route();
    heartbeat();
    setInterval(heartbeat, 15000);
    return { route: route, registry: registry };
  }

  /* --- 共享数据助手（端点契约档案 §28 裁决 2/3：14+ 页面同用，收口在 PORTAL） --- */
  /* 响应侧 JSON 字符串字段（route_segments/zones/scope/position/neighbors/current_path/
     path/evidence/rules_hit/result/detail/suggestion/config/failure_reasons）统一经 jp 解析；
     解析失败回退 fallback（惯例传原文或 []），绝不 throw。 */
  function jp(str, fallback) {
    if (str === null || str === undefined) return fallback;
    if (typeof str !== 'string') return str;              /* 已是真数组/对象（少数端点）直接放行 */
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }
  /* success_rate / 比率类字段是 0..1 小数（旧页 +'%' 显示 "1%" 是缺陷，新页禁止重蹈） */
  function fmtRate(x) {
    return (typeof x === 'number' && isFinite(x)) ? (x * 100).toFixed(1) + '%' : '--';
  }
  /* 必填校验：缺字段 toast 并返回 null（runOp 收到 null 不发请求）——wb-* 同款惯例收口 */
  function need(v, ...names) {
    if (!v) return null;
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { window.UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }

  window.PORTAL = {
    boot: boot, ico: ico, qrSVG: qrSVG, renderQR: renderQR,
    jp: jp, fmtRate: fmtRate, need: need,
    CHAINS: CHAINS, KEYGUIDE_FLAG: KEYGUIDE_FLAG
  };
})();
