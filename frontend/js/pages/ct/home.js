/* home.js — 证照中心·证照总览（Task 6 首版）
   四链状态卡（chain/status，count=4：ChainMaker 监管 / Fabric 运营 / FISCO 管理 / IRITA 证照）
   + 证照计数（pass/list：有效 VALID / 已吊销 REVOKED）+ 待签发任务数
   （mission/list APPROVED ⋈ pass/list 客户端比对：APPROVED 且无对应 mission_id 证照记录 = 待签发）。
   红线 #9（不编造数据）：计数只来自实时响应；两列表各取最近 200 条、窗口如实标注在卡片 sub，
   不外推总量；请求失败显示 '--' + errCard；空台账 = 诚实的 0。
   端点：chain/status、pass/list、mission/list。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var CT = window.CT_PAGES = window.CT_PAGES || {};

  function render(root) {
    root.append(P.pageHead({
      title: '证照总览',
      sub: '国密证照链门户：四链运行状态 · 证照计数 · 待签发任务 —— 数据实时刷新，空台账如实显示 0'
    }));
    var strip = h('div', {}, h('div', { class: 'p-empty' }, '⏳ 证照总览加载中…'));
    root.append(strip);
    loadLive(strip);
  }

  async function loadLive(strip) {
    var chainR = await API.call('/api/chain/status', {});
    var passR = await API.call('/api/pass/list', { page: 1, page_size: 200 });
    var missionR = await API.call('/api/mission/list', { page: 1, page_size: 200 });
    if (!strip.isConnected) return;            /* 加载中用户已离开本页 */
    strip.innerHTML = '';

    var cards = [];
    /* --- 四链卡：PORTAL.CHAINS 固定次序驱动（chainmaker/fabric/fisco-bcos/irita） --- */
    PORTAL.CHAINS.forEach(function (c) {
      var st = (chainR.ok && chainR.data && chainR.data.chains) ? chainR.data.chains[c.key] : null;
      cards.push({ label: c.label, value: st || '未知', tone: st === 'ONLINE' ? 'good' : 'critical' });
    });

    /* --- 证照计数：pass/list 最近 200 条内的 VALID / REVOKED（GENERATING/USED/EXPIRED 不计入两卡） --- */
    var passes = (passR.ok && passR.data) ? (passR.data.records || []) : null;
    if (passes) {
      var valid = 0, revoked = 0;
      passes.forEach(function (p) {
        if (p.status === 'VALID') valid++;
        else if (p.status === 'REVOKED') revoked++;
      });
      cards.push({ label: '有效证照', value: String(valid), tone: valid > 0 ? 'good' : null,
        sub: 'VALID（最近 200 条内，台账共 ' + (passR.data.total || 0) + ' 条）' });
      cards.push({ label: '已吊销证照', value: String(revoked), tone: revoked > 0 ? 'critical' : null,
        sub: 'REVOKED（最近 200 条内）' });
    } else {
      cards.push({ label: '有效证照', value: '--', sub: '实时数据获取失败' });
      cards.push({ label: '已吊销证照', value: '--', sub: '实时数据获取失败' });
    }

    /* --- 待签发任务：APPROVED 且 pass/list 最近 200 条内无同 mission_id 证照记录 --- */
    var missions = (missionR.ok && missionR.data) ? (missionR.data.records || []) : null;
    if (missions && passes) {
      var issued = {};
      passes.forEach(function (p) { if (p.mission_id) issued[p.mission_id] = true; });
      var pending = missions.filter(function (m) {
        return m.status === 'APPROVED' && !issued[m.mission_id];
      }).length;
      cards.push({ label: '待签发任务', value: String(pending), tone: pending > 0 ? 'warning' : null,
        sub: 'APPROVED 未签发 · 最近 200 条内' });
    } else {
      cards.push({ label: '待签发任务', value: '--', sub: '实时数据获取失败' });
    }

    strip.append(P.statCards(cards));
    [chainR, passR, missionR].forEach(function (r) { if (!r.ok) strip.append(P.errCard(r)); });
  }

  CT.home = { render: render };
})();
