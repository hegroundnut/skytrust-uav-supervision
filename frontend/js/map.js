/* map.js — Leaflet 封装（计划 B Task 4，spec §4.1）
   依赖：vendor/leaflet/leaflet.js（全局 L）与 js/data/geo.js（window.GEO），加载顺序须在两者之后。
   天地图 key：localStorage['skytrust-tianditu-key']（Global Constraints #8：绝不入 git、绝不写死源码）。
   退化契约：无 key → 不加瓦片层立即退化；tileerror 累计 ≥3 → 移除瓦片层退化。
   两类退化均：容器加 is-fallback（CSS 中性网格）+ .d-map-badge 徽章说明原因，矢量层照常自绘。
   坐标红线（Global Constraints #9）：lat/lon 双零=未设 → 不画点不连线（GEO.* 为唯一裁决）。 */
(function () {
  'use strict';
  var G = window.GEO;
  var KEY_LS = 'skytrust-tianditu-key';
  var TILE_FAIL_LIMIT = 3;

  /* 四旋翼标记 SVG（spec §4.3 quadcopter 图标族；.d-drone-ico 经 --hdg 变量按航向旋转） */
  var DRONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' +
    '<circle cx="5.5" cy="5.5" r="3.2"/><circle cx="18.5" cy="5.5" r="3.2"/>' +
    '<circle cx="5.5" cy="18.5" r="3.2"/><circle cx="18.5" cy="18.5" r="3.2"/>' +
    '<rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.4" fill="currentColor" stroke="none"/>' +
    '<line x1="7.8" y1="7.8" x2="9.8" y2="9.8"/><line x1="16.2" y1="7.8" x2="14.2" y2="9.8"/>' +
    '<line x1="7.8" y1="16.2" x2="9.8" y2="14.2"/><line x1="16.2" y1="16.2" x2="14.2" y2="14.2"/></svg>';

  function getKey() {
    try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; }
  }
  function setKey(k) {
    try { localStorage.setItem(KEY_LS, String(k || '').trim()); } catch (e) { /* 隐私模式静默 */ }
  }
  function hasKey() { return getKey() !== ''; }

  /* 天地图 WMTS：底图 vec_w + 注记 cva_w（球面墨卡托 _w 套），子域 t0-t7 */
  function tiandituLayers(key) {
    function u(layer) {
      return 'https://t{s}.tianditu.gov.cn/' + layer + '_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
        '&LAYER=' + layer + '&STYLE=default&TILEMATRIX={z}&TILEMATRIXSET=w&FORMAT=tiles' +
        '&TILECOL={x}&TILEROW={y}&tk=' + encodeURIComponent(key);
    }
    var opts = { subdomains: '01234567', maxZoom: 18, attribution: '© 天地图' };
    return [L.tileLayer(u('vec'), opts), L.tileLayer(u('cva'), opts)];
  }

  function divIcon(html, size, anchor) {
    return L.divIcon({ className: '', html: html, iconSize: size, iconAnchor: anchor });
  }

  /* create(el, opts) → MapX 包装对象（页面负责在重渲染前调 destroy()，
     否则 Leaflet 报 "Map container is already initialized"） */
  function create(el, opts) {
    var o = opts || {};
    var view = o.view || G.DEFAULT_VIEW;
    var map = L.map(el, { center: [view.lat, view.lon], zoom: view.zoom });
    var mx = {
      leaflet: map,
      el: el,
      degraded: false,
      degradeReason: '',
      _layers: {
        routes: L.layerGroup().addTo(map),
        zones: L.layerGroup().addTo(map),
        nodes: L.layerGroup().addTo(map),
        marks: L.layerGroup().addTo(map)
      },
      _drones: {},      /* uav_id → L.marker */
      _tiles: null,
      _tileFails: 0,
      _badge: null,
      _empty: null,
      _destroyed: false
    };

    function showBadge(text) {
      if (!mx._badge) {
        mx._badge = document.createElement('div');
        mx._badge.className = 'd-map-badge';
        el.appendChild(mx._badge);
      }
      mx._badge.textContent = text;
    }
    function removeTiles() {
      if (mx._tiles) {
        mx._tiles.forEach(function (t) { map.removeLayer(t); });
        mx._tiles = null;
      }
    }
    function degrade(reason) {
      if (mx.degraded) return;
      mx.degraded = true;
      mx.degradeReason = reason;
      el.classList.add('is-fallback');
      removeTiles();
      showBadge('退化底图 · ' + reason + '（矢量层照常）');
    }

    /* 瓦片层：有 key 才加；tileerror 计数超限即退化（无效 key 的 403 会快速触发） */
    var key = getKey();
    if (key) {
      mx._tiles = tiandituLayers(key);
      mx._tiles.forEach(function (t) {
        t.on('tileerror', function () {
          mx._tileFails += 1;
          if (mx._tileFails >= TILE_FAIL_LIMIT) degrade('天地图瓦片加载失败');
        });
        t.addTo(map);
      });
    } else {
      degrade('未配置天地图 key');
    }

    /* --- 视图控制 --- */
    mx.fitPoints = function (pts, pad) {
      var b = G.boundsOf(pts);
      if (!b) return mx;
      map.fitBounds(L.latLngBounds(b), { padding: [pad || 24, pad || 24] });
      return mx;
    };
    mx.setView = function (lat, lon, zoom) {
      map.setView([lat, lon], zoom || map.getZoom());
      return mx;
    };

    /* --- 图层清理（drones 独立管理，clear 不动） --- */
    mx.clear = function (kind) {
      if (!kind || kind === 'routes') mx._layers.routes.clearLayers();
      if (!kind || kind === 'zones') mx._layers.zones.clearLayers();
      if (!kind || kind === 'nodes') mx._layers.nodes.clearLayers();
      if (!kind || kind === 'marks') mx._layers.marks.clearLayers();
      return mx;
    };
    mx.clearDrones = function () {
      Object.keys(mx._drones).forEach(function (id) { map.removeLayer(mx._drones[id]); });
      mx._drones = {};
      return mx;
    };

    /* --- zone 缓冲多边形（corridor_status 着色，spec §5.1 flight 页勾选叙事的底色） --- */
    mx.drawZones = function (routes) {
      (routes || []).forEach(function (r) {
        var ring = G.zonePolygon(r);
        if (!ring) return;                       /* 红线：缺坐标不画 */
        var st = r.corridor_status || 'OPEN';
        var color = G.ZONE_COLOR[st] || G.ZONE_COLOR.OPEN;
        L.polygon(ring, {
          color: color, weight: 1, opacity: .55,
          fillColor: color, fillOpacity: .12,
          interactive: false
        }).addTo(mx._layers.zones);
      });
      return mx;
    };

    /* --- 航线折线 + tooltip + 点选回调；opts.active=[route_id] 加粗高亮 --- */
    mx.drawRoutes = function (routes, opts2) {
      var oo = opts2 || {};
      var active = {};
      (oo.active || []).forEach(function (id) { active[id] = true; });
      (routes || []).forEach(function (r) {
        var c = G.segmentCoords(r);
        if (!c) return;                          /* 红线：缺坐标不连线 */
        var st = r.corridor_status || 'OPEN';
        var line = L.polyline(c, {
          color: G.ZONE_COLOR[st] || '#0b4ea2',
          weight: active[r.route_id] ? 6 : 3,
          opacity: oo.opacity != null ? oo.opacity : .9,
          dashArray: st === 'CLOSED' ? '6 4' : null
        });
        line.bindTooltip(
          '<b>' + r.route_id + '</b> ' + (r.start_point || '') + ' → ' + (r.end_point || '') +
          '<br>空域 ' + (r.zone || '--') + ' · ' + (G.ZONE_LABEL[st] || st) +
          '<br>高度带 ' + (r.altitude_min != null ? r.altitude_min : '--') +
          '-' + (r.altitude_max != null ? r.altitude_max : '--') + ' m',
          { sticky: true }
        );
        if (oo.onPick) line.on('click', function () { oo.onPick(r); });
        line.addTo(mx._layers.routes);
      });
      return mx;
    };

    /* --- 节点 circleMarker：类型定色/半径，OFFLINE 空心、ISOLATED 红虚线+⛔、ATTACKER ⚠ --- */
    mx.drawNodes = function (nodes, opts2) {
      var oo = opts2 || {};
      (nodes || []).forEach(function (n) {
        var c = G.nodeCoord(n);
        if (!c) return;                          /* 红线：无地理坐标不画（不投影抽象 position） */
        var style = G.nodeStyle(n);
        var isolated = n.status === 'ISOLATED';
        var offline = n.status === 'OFFLINE';
        var m = L.circleMarker(c, {
          radius: style.radius,
          color: isolated ? '#b91c1c' : style.color,
          weight: 2,
          dashArray: isolated ? '4 3' : null,
          fillColor: style.color,
          fillOpacity: offline ? 0 : (n.node_type === 'ATTACKER' ? .55 : .35)
        });
        m.bindTooltip(
          (isolated ? '⛔ ' : (n.node_type === 'ATTACKER' ? '⚠ ' : '')) +
          '<b>' + n.node_id + '</b> · ' + (style.label || n.node_type || '节点') +
          '<br>状态 ' + (n.status || '--') +
          ' · 风险分 ' + (n.risk_score != null ? Number(n.risk_score).toFixed(2) : '--'),
          { sticky: true }
        );
        if (oo.onPick) m.on('click', function () { oo.onPick(n); });
        m.addTo(mx._layers.nodes);
      });
      return mx;
    };

    /* --- 虫洞伪造边：红虚线 + 中点 ⚠ 标记；任一端点缺地理坐标 → 跳过（红线） --- */
    mx.drawWormholes = function (edges, nodes) {
      var coord = {};
      (nodes || []).forEach(function (n) {
        var c = G.nodeCoord(n);
        if (c) coord[n.node_id] = c;
      });
      (edges || []).forEach(function (e) {
        if (!e || !e.wormhole_edge) return;
        var a = coord[e.from], b = coord[e.to];
        if (!a || !b) return;
        L.polyline([a, b], { color: '#b91c1c', weight: 2.5, dashArray: '5 5', opacity: .9 })
          .bindTooltip('⚠ 虫洞伪造边 ' + e.from + ' ⇄ ' + e.to, { sticky: true })
          .addTo(mx._layers.marks);
        L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], {
          icon: divIcon('<div class="d-wormhole-ico">⚠</div>', [26, 26], [13, 13]),
          interactive: false, keyboard: false
        }).addTo(mx._layers.marks);
      });
      return mx;
    };

    /* --- 无人机标记：uavId 唯一，重复调用=移动+转向（遥测轮询叙事）；
       坐标无效 → 移除既有标记并返回 false（不造假） --- */
    mx.drone = function (uavId, lat, lon, headingDeg) {
      if (!G.hasCoord(lat, lon)) { mx.removeDrone(uavId); return false; }
      var hdg = G.isNum(headingDeg) ? headingDeg : 0;
      var existing = mx._drones[uavId];
      if (existing) {
        existing.setLatLng([lat, lon]);
        var elm = existing.getElement();
        var ico = elm && elm.querySelector('.d-drone-ico');
        if (ico) ico.style.setProperty('--hdg', hdg + 'deg');
        return true;
      }
      var m = L.marker([lat, lon], {
        icon: divIcon('<div class="d-drone-ico" style="--hdg:' + hdg + 'deg">' + DRONE_SVG + '</div>',
          [30, 30], [15, 15]),
        zIndexOffset: 800,
        keyboard: false
      });
      m.bindTooltip('<b>' + uavId + '</b> · 飞行中', { direction: 'top', offset: [0, -16] });
      m.addTo(mx._layers.marks);
      mx._drones[uavId] = m;
      return true;
    };
    mx.removeDrone = function (uavId) {
      if (mx._drones[uavId]) { map.removeLayer(mx._drones[uavId]); delete mx._drones[uavId]; }
      return mx;
    };

    /* --- 告警落点（监管端驾驶舱：点击 → 详情卡） --- */
    mx.alertPin = function (lat, lon, text, onClick) {
      if (!G.hasCoord(lat, lon)) return null;
      var m = L.marker([lat, lon], {
        icon: divIcon('<div class="d-alert-pin"></div>', [14, 14], [7, 7]),
        zIndexOffset: 600, keyboard: false
      });
      if (text) m.bindTooltip(text, { direction: 'top', offset: [0, -8] });
      if (onClick) m.on('click', onClick);
      m.addTo(mx._layers.marks);
      return m;
    };

    /* --- 空数据覆盖层（「不造假」的叙事配套：说明地图为何无内容） --- */
    mx.setEmpty = function (text) {
      if (!mx._empty) {
        mx._empty = document.createElement('div');
        mx._empty.className = 'd-map-empty';
        el.appendChild(mx._empty);
      }
      mx._empty.textContent = text || '暂无可绘制的地理坐标';
      mx._empty.style.display = '';
      return mx;
    };
    mx.clearEmpty = function () {
      if (mx._empty) mx._empty.style.display = 'none';
      return mx;
    };

    /* --- 地图点选（管理端 masterdata 建航线：依次点两点定起止坐标）；返回退订函数 --- */
    mx.onMapClick = function (fn) {
      var handler = function (ev) { fn(ev.latlng.lat, ev.latlng.lng, ev.latlng); };
      map.on('click', handler);
      return function () { map.off('click', handler); };
    };
    mx.tempMarker = function (lat, lon, label) {
      if (!G.hasCoord(lat, lon)) return null;
      var m = L.circleMarker([lat, lon], {
        radius: 6, color: '#0b4ea2', weight: 2, fillColor: '#0b4ea2', fillOpacity: .5
      });
      if (label) m.bindTooltip(label, { permanent: true, direction: 'right', offset: [8, 0] });
      m.addTo(mx._layers.marks);
      return m;
    };

    /* --- 销毁（页面重渲染前必须调用） --- */
    mx.destroy = function () { mx._destroyed = true; try { map.remove(); } catch (e) { /* 已销毁容忍 */ } };

    if (o.fit && o.fit.length) mx.fitPoints(o.fit);
    /* 脱离 DOM 的容器（P.tabs 的 box 在 item.render(box) 时未挂载）尺寸为零：
       Leaflet 不会自愈——挂载后的下一帧统一 invalidateSize 校正（对已挂载容器是无害空操作） */
    requestAnimationFrame(function () { if (!mx._destroyed) map.invalidateSize(); });
    return mx;
  }

  window.MAPX = {
    create: create,
    getKey: getKey, setKey: setKey, hasKey: hasKey,
    KEY_LS: KEY_LS,
    TILE_FAIL_LIMIT: TILE_FAIL_LIMIT,
    DRONE_SVG: DRONE_SVG
  };
})();
