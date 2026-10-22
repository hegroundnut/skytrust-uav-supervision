/* geo.js — 演示地理数据层（计划 B Task 3，spec §3.1/§4.1）
   纯函数 + 常量，零 DOM/Leaflet 依赖；map.js 与三端页面消费。
   node 断言方式：global.window = {}; require(本文件) → window.GEO。
   坐标红线（Global Constraints #9）：lat/lon 双零=「未设」，hasCoord() 为唯一裁决——
   未设一律不画不连不猜；抽象 position{x,y} 非地理坐标，本模块不消费不投影。 */
(function () {
  'use strict';

  /* 默认视图：浙江工业大学莫干山校区（30.55254 N, 120.036690 E）——2026-10-22 用户裁定；
     原武汉演示空域取中值 30.55/114.37 弃用。seed 航线坐标仍在武汉域，页面 fitPoints
     到数据坐标时会随数据走，本视图仅决定初始/无数据时的底图中心。 */
  var DEFAULT_VIEW = { lat: 30.55254, lon: 120.03669, zoom: 14 };

  /* 走廊状态语义（RouteSegment.corridor_status） */
  var ZONES = ['OPEN', 'RESTRICTED', 'CLOSED'];
  var ZONE_COLOR = { OPEN: '#15803d', RESTRICTED: '#b45309', CLOSED: '#b91c1c' };
  var ZONE_FILL = {
    OPEN: 'rgba(21,128,61,.14)',
    RESTRICTED: 'rgba(180,83,9,.14)',
    CLOSED: 'rgba(185,28,28,.16)'
  };
  var ZONE_LABEL = { OPEN: '开放走廊', RESTRICTED: '限制走廊', CLOSED: '关闭走廊' };

  /* 节点类型样式（NetworkNode.node_type；链色语义见 Global Constraints #6） */
  var NODE_STYLE = {
    MANAGEMENT: { color: '#7c3aed', radius: 9, label: '管理节点' },
    EDGE:       { color: '#2563eb', radius: 7, label: '边缘中继' },
    UAV:        { color: '#0891b2', radius: 7, label: '航空器节点' },
    ATTACKER:   { color: '#b91c1c', radius: 8, label: '攻击节点' },
    DEFAULT:    { color: '#4a5568', radius: 6, label: '节点' }
  };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* 单点坐标有效性：lat 与 lon 均为有限数且非双零
     （双零=未设；单零=赤道/本初子午线，与后端既有惯例一致视为显式设定） */
  function hasCoord(lat, lon) {
    return isNum(lat) && isNum(lon) && !(lat === 0 && lon === 0);
  }

  /* 航线（route/list 行）→ 两端点坐标；任一端点缺 → null
     （与后端 corridorOf 逐端点判缺同语义：内嵌解析失败仅该端点两值留 0） */
  function segmentCoords(r) {
    if (!r) return null;
    if (!hasCoord(r.start_lat, r.start_lon)) return null;
    if (!hasCoord(r.end_lat, r.end_lon)) return null;
    return [[r.start_lat, r.start_lon], [r.end_lat, r.end_lon]];
  }

  /* 航线列表 → 折线点序（相邻共享端点去重；缺坐标航线整条跳过不造假） */
  function routePoints(routes) {
    var pts = [];
    (routes || []).forEach(function (r) {
      var c = segmentCoords(r);
      if (!c) return;
      var last = pts[pts.length - 1];
      if (!last || last[0] !== c[0][0] || last[1] !== c[0][1]) pts.push(c[0]);
      pts.push(c[1]);
    });
    return pts;
  }

  /* zone 缓冲多边形（spec §3.1：由前端从航线坐标生成，不入库）。
     航线两侧走廊带：垂直偏移 widthDeg（默认 0.004° ≈ 440m）；返回闭合环（首尾同点）。
     缺坐标航线 → null；零长段退化为小方块。平面近似，演示尺度失真可忽略。 */
  function zonePolygon(route, widthDeg) {
    var c = segmentCoords(route);
    if (!c) return null;
    var w = isNum(widthDeg) && widthDeg > 0 ? widthDeg : 0.004;
    var a = c[0], b = c[1];
    var dLat = b[0] - a[0], dLon = b[1] - a[1];
    var len = Math.sqrt(dLat * dLat + dLon * dLon);
    if (len === 0) {
      return [[a[0] - w, a[1] - w], [a[0] - w, a[1] + w], [a[0] + w, a[1] + w],
              [a[0] + w, a[1] - w], [a[0] - w, a[1] - w]];
    }
    var px = -dLon / len, py = dLat / len;   /* 垂直单位向量 */
    return [
      [a[0] + px * w, a[1] + py * w],
      [b[0] + px * w, b[1] + py * w],
      [b[0] - px * w, b[1] - py * w],
      [a[0] - px * w, a[1] - py * w],
      [a[0] + px * w, a[1] + py * w]
    ];
  }

  /* 点集 → 包围盒；空集/全缺坐标 → null */
  function boundsOf(points) {
    var pts = (points || []).filter(function (p) { return p && hasCoord(p[0], p[1]); });
    if (!pts.length) return null;
    var b = [[pts[0][0], pts[0][1]], [pts[0][0], pts[0][1]]];
    pts.forEach(function (p) {
      if (p[0] < b[0][0]) b[0][0] = p[0];
      if (p[1] < b[0][1]) b[0][1] = p[1];
      if (p[0] > b[1][0]) b[1][0] = p[0];
      if (p[1] > b[1][1]) b[1][1] = p[1];
    });
    return b;
  }

  /* 节点 → 坐标；lat/lon 未设（双零）→ null（不投影抽象 position，不造假） */
  function nodeCoord(n) {
    return n && hasCoord(n.lat, n.lon) ? [n.lat, n.lon] : null;
  }

  /* 遥测行（telemetry/list|latest 的 telemetry 对象）→ 坐标；同红线 */
  function telemetryCoord(t) {
    return t && hasCoord(t.lat, t.lon) ? [t.lat, t.lon] : null;
  }

  function nodeStyle(n) {
    return NODE_STYLE[(n && n.node_type) || ''] || NODE_STYLE.DEFAULT;
  }

  function fmtCoord(v) { return isNum(v) ? v.toFixed(5) : '--'; }
  function fmtCoordPair(lat, lon) {
    return hasCoord(lat, lon) ? fmtCoord(lat) + ', ' + fmtCoord(lon) : '坐标未设';
  }

  window.GEO = {
    DEFAULT_VIEW: DEFAULT_VIEW, ZONES: ZONES,
    ZONE_COLOR: ZONE_COLOR, ZONE_FILL: ZONE_FILL, ZONE_LABEL: ZONE_LABEL,
    NODE_STYLE: NODE_STYLE,
    isNum: isNum, hasCoord: hasCoord, segmentCoords: segmentCoords,
    routePoints: routePoints, zonePolygon: zonePolygon, boundsOf: boundsOf,
    nodeCoord: nodeCoord, telemetryCoord: telemetryCoord, nodeStyle: nodeStyle,
    fmtCoord: fmtCoord, fmtCoordPair: fmtCoordPair
  };
})();
