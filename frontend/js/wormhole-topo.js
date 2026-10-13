/* wormhole-topo.js — 虫洞攻击抽象拓扑模块 window.WTOPO（Task 9，验收展示项：虫洞攻击拓扑直观化）
   纯 SVG 零依赖（无第三方库、无 fetch——数据由调用方传入）；消费 /api/topology/get 响应：
   nodes（position{x,y} JSON 字符串/对象双形态、x/X y/Y 大小写双兼容；type MANAGEMENT/EDGE/
   UAV/ATTACKER；status ONLINE/OFFLINE/ISOLATED）与 edges（wormhole_edge、advertised_latency_ms、
   distance）。
   坐标红线（本模块核心纪律）：
   - 只渲染服务端提供的抽象 position，**绝不读写 lat/lon**——经纬度 0=未设语义归 GEO/map.js
     地理层独家裁决，抽象拓扑层与之无关（position 的 0 是合法坐标值，如种子 UAV-A-001-NODE）；
   - 无 position（或不可解析）的节点一律不入图，列入图侧「未布点」清单——绝不猜测、绝不编造
     默认坐标（对照 pui.js topoSVG 的 parsePos 缺省 (50,50) 旧行为，本模块明确不继承）；
   - 涉及未布点节点的边同步不画，计数如实披露。
   契约：WTOPO.svg(topo, opts) → SVGElement，是 (topo, opts) 的纯函数（无 IO、无状态、
   同入同出）；opts = {hlPath?: string[], onPickNode?: fn}；viewBox 700×470，position
   min-max 线性归一化，边距 40px（单点/退化轴 → 居中）。
   视觉语义（图例块 icon+文字自述，永不仅靠颜色）：
   - 节点类型着色走 CSS var（drone.css Task 9 追加块 .d-wtopo-t-*）：紫 MANAGEMENT / 蓝 EDGE /
     青 UAV / 红 ATTACKER（--d-critical + ⚠ ATTACKER 标签）。节点色=节点类型语义，与三链链色
     无关——链色语义不挪用（链是另一根轴）；未知类型中性色不猜测。
   - 边三态：正常 p-topo-edge 灰实线 / 虫洞 p-topo-wormhole 红虚线 + d-wormhole-flow 流动动画 +
     中点 ⚠ / 会话路径 p-topo-active（hlPath 相邻对）加粗；虫洞边同时在会话路径上 → 保持红虚线
     流动 + d-wtopo-onpath 加粗（虫洞优先级最高——被诱入隧道的路径必须仍然显眼是攻击边）。
   - ISOLATED 红虚线描边 + ⛔ 标签 + d-pulse-hit 检测命中脉冲环（隔离=risk/evaluate 检出落地）；
     OFFLINE 空心（描边保留类型色，与地理层 map.js drawNodes 同语义）。
   - hover UI.showTip：边 distance/advertised_latency_ms/⚠ 虫洞伪造边；节点类型/状态/拓扑坐标/
     邻居/风险分/SM9。插值一律 UI.esc（node_id 可由注册表单写入）。
   依赖面：仅 document.createElementNS/createElement + UI（showTip/hideTip/esc/trunc，且只在
   事件回调内引用）；无 API/STORE/PORTAL/MAPX/PUI 依赖。DOM-less 核验经 WTOPO._pure 纯函数
   （posOf/layout/plan/edgeClass/nodeClass），渲染同走此处（Task 8 CXV._pure 先例）。
   挂载：authority.html（au/netsec tabTopo，Leaflet 地理层下方区块）。 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var W = 700, H = 470, PAD = 40;                 /* viewBox 与归一化边距（brief Produces 钉死） */
  var RADIUS = { MANAGEMENT: 13, ATTACKER: 11 };  /* 其余（EDGE/UAV/未知）= 10 */
  var R_DEFAULT = 10;
  var TYPE_CLS = {
    MANAGEMENT: 'd-wtopo-t-mgmt', EDGE: 'd-wtopo-t-edge',
    UAV: 'd-wtopo-t-uav', ATTACKER: 'd-wtopo-t-atk'
  };

  /* ---------- 纯函数（经 WTOPO._pure 暴露，DOM-less 核验只走这里；渲染同走此处） ---------- */

  function numOf(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim() !== '') {
      var n = Number(v);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  /* position 解析：JSON 字符串或对象双形态；x/X、y/Y 大小写双兼容（种子小写、API 注册回显大写
     ——netsec 节点台账标题即此事实）。缺失/空串/不可解析/非数值 → null（绝不给缺省值）。
     红线自证：本函数只读 n.position，从不触碰 n.lat / n.lon。 */
  function posOf(n) {
    if (!n) return null;
    var p = n.position;
    if (typeof p === 'string') {
      var s = p.trim();
      if (!s) return null;
      try { p = JSON.parse(s); } catch (e) { return null; }
    }
    if (!p || typeof p !== 'object') return null;
    var x = numOf(p.x != null ? p.x : p.X);
    var y = numOf(p.y != null ? p.y : p.Y);
    if (x == null || y == null) return null;
    return { x: x, y: y };
  }

  function r2(v) { return Math.round(v * 100) / 100; }

  /* layout(nodes) → {placed:[{node,px,py,x,y}], unplaced:[node]}
     px/py = 服务端抽象原值；x/y = 归一化后 viewBox 坐标（min-max 缩放置 PAD 边距；
     单点或全同值轴 → 该轴居中，不猜测展开）。无 id / 无 position → unplaced（诚实清单）。 */
  function layout(nodes) {
    var raw = [], unplaced = [];
    (nodes || []).forEach(function (n) {
      if (!n || n.node_id == null || n.node_id === '') { if (n) unplaced.push(n); return; }
      var p = posOf(n);
      if (!p) { unplaced.push(n); return; }
      raw.push({ node: n, px: p.x, py: p.y });
    });
    var placed = [];
    if (raw.length) {
      var minX = raw[0].px, maxX = raw[0].px, minY = raw[0].py, maxY = raw[0].py;
      raw.forEach(function (d) {
        if (d.px < minX) minX = d.px;
        if (d.px > maxX) maxX = d.px;
        if (d.py < minY) minY = d.py;
        if (d.py > maxY) maxY = d.py;
      });
      var spanX = maxX - minX, spanY = maxY - minY;
      placed = raw.map(function (d) {
        return {
          node: d.node, px: d.px, py: d.py,
          x: r2(spanX > 0 ? PAD + (d.px - minX) / spanX * (W - 2 * PAD) : W / 2),
          y: r2(spanY > 0 ? PAD + (d.py - minY) / spanY * (H - 2 * PAD) : H / 2)
        };
      });
    }
    return { placed: placed, unplaced: unplaced };
  }

  /* hlPath → 相邻对集合（双向查询由 onPath 承担） */
  function hlPairs(hlPath) {
    var set = {};
    if (hlPath && hlPath.length > 1) {
      for (var i = 0; i < hlPath.length - 1; i++) set[hlPath[i] + '|' + hlPath[i + 1]] = true;
    }
    return set;
  }
  function onPath(set, a, b) { return !!(set[a + '|' + b] || set[b + '|' + a]); }

  /* 边三态类名（纯）：虫洞 > 会话路径 > 正常；虫洞且在路径上 → 追加 d-wtopo-onpath 加粗 */
  function edgeClass(wormhole, op) {
    var c = 'p-topo-edge';
    if (wormhole) {
      c += ' p-topo-wormhole d-wtopo-flow';
      if (op) c += ' d-wtopo-onpath';
    } else if (op) {
      c += ' p-topo-active';
    }
    return c;
  }

  /* 节点圆类名（纯）：类型色 + 状态修饰（ISOLATED 红虚线描边 / OFFLINE 空心）；未知类型不加类
     → 基础中性色（不猜测语义） */
  function nodeClass(type, status) {
    var c = 'd-wtopo-dot';
    if (TYPE_CLS[type]) c += ' ' + TYPE_CLS[type];
    if (status === 'ISOLATED') c += ' d-wtopo-isolated';
    else if (status === 'OFFLINE') c += ' d-wtopo-offline';
    return c;
  }

  /* plan(topo, hlPath) → 渲染唯一事实源（svg 与 block 共用；纯函数）：
     {placed, unplaced, edges:[{e,a,b,wormhole,onPath}], skippedEdges, whCount}
     任一端点未布点/未知的边 → 不画，计入 skippedEdges（如实披露，不猜测端点）。 */
  function plan(topo, hlPath) {
    var nodes = (topo && topo.nodes) || [];
    var lay = layout(nodes);
    var byId = {};
    lay.placed.forEach(function (d) { byId[d.node.node_id] = d; });
    var set = hlPairs(hlPath);
    var edges = [], skipped = 0, whCount = 0;
    ((topo && topo.edges) || []).forEach(function (e) {
      if (!e || !e.from || !e.to) { skipped++; return; }
      if (e.wormhole_edge) whCount++;
      var a = byId[e.from], b = byId[e.to];
      if (!a || !b) { skipped++; return; }
      edges.push({ e: e, a: a, b: b, wormhole: !!e.wormhole_edge, onPath: onPath(set, e.from, e.to) });
    });
    return {
      placed: lay.placed, unplaced: lay.unplaced, edges: edges,
      skippedEdges: skipped, whCount: whCount, nodeCount: nodes.length
    };
  }

  /* neighbors JSON 字符串 → 顿号列表（双形态兼容；空/坏 → '—'，不猜测） */
  function neighborsText(v) {
    var arr = v;
    if (typeof v === 'string') {
      try { arr = JSON.parse(v); } catch (e) { return v.trim() || '—'; }
    }
    if (Array.isArray(arr)) return arr.length ? arr.join('、') : '—';
    return (v != null && v !== '') ? String(v) : '—';
  }

  /* ---------- SVG 构建原语（最小 DOM 面：createElementNS + setAttribute + append +
     textContent + addEventListener——DOM-less 桩可完整承载） ---------- */
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, String(attrs[k]));
    });
    return el;
  }
  function svgText(tag, attrs, str) {
    var el = svgEl(tag, attrs);
    el.textContent = str;
    return el;
  }
  function tipOn(el, htmlOf) {
    el.addEventListener('mousemove', function (ev) {
      UI.showTip(htmlOf(), ev.clientX, ev.clientY);
    });
    el.addEventListener('mouseleave', function () { UI.hideTip(); });
  }

  /* ---------- WTOPO.svg(topo, opts) → SVGElement（(topo, opts) 的纯函数） ---------- */
  function svg(topo, opts) {
    opts = opts || {};
    var pl = plan(topo, opts.hlPath);
    var root = svgEl('svg', {
      class: 'p-topo d-wtopo-svg', viewBox: '0 0 ' + W + ' ' + H,
      role: 'img', 'aria-label': '链下可信网络抽象拓扑（全节点含攻击者；仅抽象 position，非地理投影）'
    });

    /* 边层（先画，节点覆盖其上） */
    pl.edges.forEach(function (d) {
      var e = d.e;
      var line = svgEl('line', {
        class: edgeClass(d.wormhole, d.onPath),
        x1: d.a.x, y1: d.a.y, x2: d.b.x, y2: d.b.y
      });
      tipOn(line, function () {
        return '<b>' + UI.esc(e.from) + ' ⇄ ' + UI.esc(e.to) + '</b><br>' +
          '距离 ' + (e.distance != null ? Number(e.distance).toFixed(1) : '—') +
          ' · 宣告时延 ' + (e.advertised_latency_ms != null ? UI.esc(e.advertised_latency_ms) + 'ms' : '—') +
          (d.wormhole ? '<br>⚠ 虫洞伪造边（宣告时延为谎报值）' : '') +
          (d.onPath ? '<br>● 当前会话路径' : '');
      });
      root.append(line);
      if (d.wormhole) {
        /* 中点 ⚠（icon+文字；halo 描边保证压在红虚线上仍可辨） */
        root.append(svgText('text', {
          class: 'd-wtopo-wh-mid',
          x: r2((d.a.x + d.b.x) / 2), y: r2((d.a.y + d.b.y) / 2),
          'dominant-baseline': 'central'
        }, '⚠'));
      }
    });

    /* 节点层 */
    pl.placed.forEach(function (d) {
      var n = d.node;
      var type = n.node_type, status = n.status;
      var isolated = status === 'ISOLATED', offline = status === 'OFFLINE';
      var r = RADIUS[type] || R_DEFAULT;
      var g = svgEl('g', { class: 'p-topo-node d-wtopo-g' });
      if (isolated) {
        /* 检测命中脉冲环（d-pulse-hit）：隔离 = risk/evaluate 检出落地，环在节点身后脉冲 */
        g.append(svgEl('circle', { class: 'd-wtopo-hit', cx: d.x, cy: d.y, r: r + 6 }));
      }
      g.append(svgEl('circle', { class: nodeClass(type, status), cx: d.x, cy: d.y, r: r }));
      if (type === 'ATTACKER') {
        g.append(svgText('text', { class: 'd-wtopo-atk-tag', x: d.x, y: r2(d.y - r - 6) }, '⚠ ATTACKER'));
      }
      g.append(svgText('text', {
        class: 'p-topo-label' + (isolated ? ' d-wtopo-label-hit' : ''),
        x: d.x, y: r2(d.y + 24)
      }, (isolated ? '⛔ ' : offline ? '○ ' : '') + String(n.node_id)));
      tipOn(g, function () {
        var p = posOf(n);
        return '<b>' + UI.esc(n.node_id) + '</b><br>' +
          '类型 ' + UI.esc(type || '—') + ' · 状态 ' + UI.esc(status || '—') + '<br>' +
          '拓扑坐标 (' + (p ? p.x + ', ' + p.y : '—') + ')（抽象 position，非经纬度）<br>' +
          '邻居 ' + UI.esc(neighborsText(n.neighbors)) + '<br>' +
          '风险分 ' + (n.risk_score != null ? Number(n.risk_score).toFixed(2) : '—') + '<br>' +
          'SM9 ' + UI.esc(UI.trunc(n.sm9_identity || '—', 30));
      });
      if (typeof opts.onPickNode === 'function') {
        g.addEventListener('click', function () { opts.onPickNode(n); });
      }
      root.append(g);
    });

    return root;
  }

  /* ---------- 图例块（icon+文字；链色语义不挪用的显式声明随附） ---------- */
  function swatchDot(cls, extra) {
    var s = svgEl('svg', { class: 'd-wtopo-svg d-wtopo-swatch', viewBox: '0 0 16 16', 'aria-hidden': 'true' });
    (extra || []).forEach(function (e) { s.append(e); });
    s.append(svgEl('circle', { class: 'd-wtopo-dot ' + cls, cx: 8, cy: 8, r: 5.5 }));
    return s;
  }
  function swatchLine(cls) {
    var s = svgEl('svg', { class: 'd-wtopo-svg d-wtopo-swatch-line', viewBox: '0 0 26 10', 'aria-hidden': 'true' });
    s.append(svgEl('line', { class: cls, x1: 1, y1: 5, x2: 25, y2: 5 }));
    return s;
  }
  function el(tag, attrs, kids, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (attrs[k] != null) node.setAttribute(k, String(attrs[k]));
    });
    if (text != null) node.textContent = text;
    (kids || []).forEach(function (c) { if (c) node.append(c); });
    return node;
  }
  function legend() {
    var box = el('div', { class: 'd-wtopo-legend' });
    var items = [
      [swatchDot('d-wtopo-t-mgmt'), 'MANAGEMENT 管理节点（紫）'],
      [swatchDot('d-wtopo-t-edge'), 'EDGE 边缘中继（蓝）'],
      [swatchDot('d-wtopo-t-uav'), 'UAV 航空器节点（青）'],
      [swatchDot('d-wtopo-t-atk'), 'ATTACKER 攻击节点（红 + ⚠ 标签）'],
      [swatchDot('d-wtopo-offline'), 'OFFLINE 离线（空心）'],
      [swatchDot('d-wtopo-isolated', [svgEl('circle', { class: 'd-wtopo-hit', cx: 8, cy: 8, r: 6.5 })]),
        'ISOLATED 隔离（⛔ 红虚线描边 + 脉冲环 = 检测命中）'],
      [swatchLine('p-topo-edge'), '正常边（灰实线）'],
      [swatchLine('p-topo-edge p-topo-wormhole d-wtopo-flow'), '虫洞伪造边（红虚线流动 + 中点 ⚠）'],
      [swatchLine('p-topo-edge p-topo-active'), '当前会话路径（hlPath 加粗）']
    ];
    items.forEach(function (it) {
      var s = el('span', { class: 'd-wtopo-lg-item' }, [it[0], el('span', {}, null, it[1])]);
      box.append(s);
    });
    return box;
  }

  /* ---------- 未布点侧清单（诚实规则：不画不猜，逐节点列出 + 连带边计数） ---------- */
  function unplacedAside(pl) {
    var box = el('div', { class: 'd-wtopo-unplaced' });
    box.append(el('div', {}, null,
      '⚠ 未布点节点（无拓扑坐标 position——不入图、不猜测坐标）：'));
    var chips = el('div', { class: 'd-wtopo-unplaced-chips' });
    pl.unplaced.forEach(function (n) {
      chips.append(el('span', { class: 'd-wtopo-chip' }, null,
        String(n.node_id || '（无 ID）') + '（' + (n.node_type || '—') + ' · ' + (n.status || '—') + '）'));
    });
    box.append(chips);
    if (pl.skippedEdges > 0) {
      box.append(el('div', { class: 'd-wtopo-unplaced-edges' }, null,
        '涉及未布点/未知端点的边 ' + pl.skippedEdges + ' 条同步不画（如实计数）。'));
    }
    return box;
  }

  /* ---------- WTOPO.block(topo, opts) → HTMLElement（SVG + 图例 + 未布点清单 + 红线小字） ---------- */
  function block(topo, opts) {
    opts = opts || {};
    var pl = plan(topo, opts.hlPath);
    var root = el('div', { class: 'd-wtopo' });

    /* 元信息行：全部计数来自本次响应/plan，不猜测 */
    var whState = topo && topo.wormhole_enabled === true ? '⚠ 虫洞攻击开启中'
      : topo && topo.wormhole_enabled === false ? '虫洞未开启' : '虫洞状态未知（响应缺 wormhole_enabled）';
    var hl = (opts.hlPath && opts.hlPath.length > 1)
      ? '会话路径高亮：' + opts.hlPath.join(' → ')
      : '无会话路径高亮（无当前会话上下文或未匹配到会话——不猜测）';
    root.append(el('div', { class: 'd-wtopo-meta' }, [
      el('span', {}, null, '节点 ' + pl.nodeCount + ' · 布点 ' + pl.placed.length + ' · 未布点 ' + pl.unplaced.length),
      el('span', {}, null, '边 ' + ((topo && topo.edges) || []).length + '（虫洞 ' + pl.whCount +
        (pl.skippedEdges ? ' · 端点缺失不画 ' + pl.skippedEdges : '') + '）'),
      el('b', {}, null, whState),
      el('span', { class: 'd-wtopo-meta-hl' }, null, hl)
    ]));

    if (!pl.nodeCount) {
      root.append(el('div', { class: 'p-empty' }, null, '暂无节点（demo/init 灌种后出现）'));
    } else if (!pl.placed.length) {
      root.append(el('div', { class: 'p-empty' }, null,
        '全部 ' + pl.unplaced.length + ' 个节点均无拓扑坐标——不画不猜（见下方未布点清单）'));
    } else {
      var box = el('div', { class: 'p-topo-box' });
      box.append(svg(topo, opts));
      root.append(box);
    }

    root.append(legend());
    if (pl.unplaced.length) root.append(unplacedAside(pl));
    root.append(el('p', { class: 'd-wtopo-note' }, null,
      '节点色仅为节点类型语义（紫 MANAGEMENT / 蓝 EDGE / 青 UAV / 红 ATTACKER），与三链链色无关——链色语义不挪用。' +
      '本图仅消费服务端抽象 position{x,y}（大小写双兼容），绝不读写经纬度；上图（Leaflet 地理层）与本图的分工：' +
      '地理层只落有经纬度的节点，本图落全部有拓扑坐标的节点（含攻击者）。'));
    return root;
  }

  window.WTOPO = {
    svg: svg,          /* (topo, opts) → SVGElement —— 纯函数契约 */
    block: block,      /* (topo, opts) → HTMLElement —— svg + 图例 + 未布点清单 + 红线小字 */
    legend: legend,
    VIEW: { W: W, H: H, PAD: PAD },
    /* 纯函数裁决点暴露（Task 8 CXV._pure 先例）：DOM-less 核验走这里，渲染同走此处 */
    _pure: {
      posOf: posOf, layout: layout, plan: plan,
      hlPairs: hlPairs, onPath: onPath,
      edgeClass: edgeClass, nodeClass: nodeClass, neighborsText: neighborsText
    }
  };
})();
