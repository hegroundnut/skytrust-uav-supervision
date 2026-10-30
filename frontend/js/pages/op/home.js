/* home.js — 运营商端·服务首页（计划 B Task 6，spec §5.1）
   hero 大地图（空域 zone 着色 + 航线网 + 网络节点（过滤 ATTACKER）+ 已登记航空器实时位置）+ 六张服务入口卡
   + 静态政策公告区。端点：topology/get、route/list、uav/list、telemetry/latest、chain/status。
   公告区为静态装饰（spec §5.1「政策公告装饰区（静态）」），不调端点、不编造新闻源。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  var mx = null;   /* 模块级地图引用：重渲染入口先 destroy（Task 5 页面契约） */

  var ENTRIES = [
    { page: 'realname', ico: 'id',    title: '实名登记',         desc: '个人/企业主体登记与操控员执照即申即发，选定身份后信息自动填写' },
    { page: 'aircraft', ico: 'drone', title: '航空器登记',       desc: '登记标志与二维码注册即发，跨链四段 TxID 全程留痕' },
    { page: 'flight',   ico: 'map',   title: '飞行活动申请',     desc: '地图勾选航段建任务，跨链提交跨域申请，冲突协调可视' },
    { page: 'license',  ico: 'cert',  title: '电子飞行许可',     desc: '电子许可卡 + 飞行前自查：绿灯可以起飞，红灯列明原因' },
    { page: 'ops',      ico: 'radar', title: '运行识别·飞行动态', desc: '起飞报备，无人机沿航线实时移动，降落报备' },
    { page: 'airspace', ico: 'globe', title: '空域查询',         desc: '全屏空域地图：空域着色、航线网、网络节点图层开关' }
  ];

  var NOTICES = [
    { date: '2026-09-30', text: '依照《无人驾驶航空器飞行管理暂行条例》，民用无人驾驶航空器须完成实名登记并取得电子飞行许可后方可实施飞行活动。' },
    { date: '2026-09-18', text: '本平台已全面启用「登记即上链」：航空器登记、任务申请、许可签发均在三链留痕，跨链存证可在本页地图与各详情页查验。' },
    { date: '2026-09-02', text: '莫干山空域走廊数据已更新（Zone-A / Zone-B），飞行前请在「空域查询」页确认走廊状态（开放 / 限制 / 关闭）。' }
  ];

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    /* --- hero：政务门户题头 + 大地图 --- */
    var mapEl = h('div', { class: 'd-hero-map d-map' });
    root.append(h('section', { class: 'd-hero' },
      h('div', { class: 'd-hero-head' },
        h('h1', { class: 'd-hero-title' }, '民用无人驾驶航空器综合服务门户'),
        h('p', { class: 'd-hero-sub' }, '实名登记 · 航空器登记 · 飞行申请 · 电子许可 · 运行识别 · 空域查询 —— 一站式办理，登记即上链')),
      mapEl));
    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });

    /* --- 空域态势条（chain/status + 计数）--- */
    var strip = h('div', { class: 'd-mt' }, h('div', { class: 'p-empty' }, '空域态势加载中…'));
    root.append(strip);

    /* --- 三大核心能力（绩效目标自然嵌入：实时证据 + 实验自证 + 官方原文小字）--- */
    root.append(CAPX.section('cards'));

    /* --- 服务入口卡片（UOM 首页对位）--- */
    root.append(h('div', { class: 'd-entry-grid d-mt2' }, ENTRIES.map(function (e) {
      return h('div', { class: 'd-entry-card', title: '进入 ' + e.title,
        onClick: function () { location.hash = '#/' + e.page; } },
        h('span', { class: 'd-entry-ico' }, PORTAL.ico(e.ico)),
        h('div', {}, h('h3', {}, e.title), h('p', {}, e.desc)));
    })));

    /* --- 政策公告（静态装饰区）--- */
    root.append(h('div', { class: 'd-notice d-mt2' },
      h('h3', {}, '政策公告'),
      h('ul', {}, NOTICES.map(function (n) {
        return h('li', {}, n.text, h('span', { class: 'd-notice-date' }, n.date));
      }))));

    loadLive(strip);
  }

  /* 数据装配：航线/节点画地图；每架航空器取 telemetry/latest 落无人机标记；态势条汇总。
     红线 #9：坐标未设（双零/NaN）的遥测点不落标记（GEO.telemetryCoord 返回 null 即跳过）。
     裁决 17：telemetry/latest 的 {telemetry:null} 是成功空结果，不走错误分支。 */
  async function loadLive(strip) {
    var routesR = await API.call('/api/route/list', { page: 1, page_size: 200 });
    var topoR = await API.call('/api/topology/get', {});
    if (mx && routesR.ok) {
      var routes = routesR.data.records || [];
      mx.drawZones(routes);
      mx.drawRoutes(routes, {});
    }
    /* Task 8 Produces 信息边界：运营商端不渲染 ATTACKER 节点与虫洞边——模拟攻击节点
       属管理当局 netsec 视角，运营商端只见正常网络（虫洞伪造边只随 ATTACKER 全量视图出现） */
    var visNodes = topoR.ok
      ? (topoR.data.nodes || []).filter(function (n) { return n.node_type !== 'ATTACKER'; })
      : [];
    if (mx && topoR.ok) {
      mx.drawNodes(visNodes, {});
    }
    var uavsR = await API.call('/api/uav/list', { page: 1, page_size: 200 });
    var drones = 0;
    if (uavsR.ok) {
      var uavs = uavsR.data.records || [];
      var latest = await Promise.all(uavs.map(function (u) {
        return API.call('/api/telemetry/latest', { uav_id: u.uav_id });
      }));
      latest.forEach(function (r, i) {
        var t = r.ok && r.data ? r.data.telemetry : null;
        if (!t) return;                        /* 无遥测=正常（未飞过的机） */
        var c = GEO.telemetryCoord(t);
        if (!c || !mx) return;                 /* 坐标未设不画（红线 #9） */
        if (mx.drone(uavs[i].uav_id, c[0], c[1], t.heading)) drones++;
      });
    }
    var chainR = await API.call('/api/chain/status', {});
    if (!strip.isConnected) return;            /* 加载中用户已离开本页 */
    strip.innerHTML = '';
    var cards = [];
    PORTAL.CHAINS.forEach(function (c) {
      var st = (chainR.ok && chainR.data && chainR.data.chains) ? chainR.data.chains[c.key] : '未知';
      cards.push({ label: c.label, value: P.statusZh(st), title: st,
        tone: st === 'ONLINE' ? 'good' : 'critical' });
    });
    cards.push({ label: '空域走廊', value: routesR.ok ? String(routesR.data.total || 0) : '--', sub: '已发布走廊总数' });
    cards.push({ label: '网络节点', value: topoR.ok ? String(visNodes.length) : '--', sub: '平台服务节点统计' });
    cards.push({ label: '在飞航空器', value: String(drones), sub: '实时位置上报', tone: drones > 0 ? 'good' : null });
    strip.append(P.statCards(cards));
    if (!chainR.ok) strip.append(P.errCard(chainR));     /* -1 时 errCard 自带启动指引 */
    else if (!routesR.ok) strip.append(P.errCard(routesR));
  }

  OP.home = { render: render };
})();
