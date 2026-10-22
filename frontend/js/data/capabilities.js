/* capabilities.js —— 三大核心能力卡数据源（纯数据 + 提取函数，零 DOM 零请求）。
   消费方：js/capability.js（CAPX 组件）；挂载点：运营商门户 #/home、管理当局 #/queue、监管当局 #/cockpit。
   项目三个绩效目标的官方原文逐字内嵌于 goal 字段，前端以卡内「项目绩效目标」折叠小字呈现；
   「开展实验验证」= experiment/run 一键自证（11 类实验注册表见 internal/experiment/registry.go）。
   红线对齐：
   - scenario 双向严格 —— 仅 MESSAGE_FLOW 接受 NORMAL/ATTACK/DEFENSE，其余 10 类 scenario 必须为空（P5-R5）；
   - MESSAGE_FLOW ATTACK/DEFENSE 与 RISK_SCAN 会在生产网络激活虫洞攻防，可能遗留 NODE-X/Y ISOLATED
     残留 → 正式演示被 4001 拦截，只能 demo/reset 清理（P6-R6：reset 永不触碰真实链）——一律配 warn 门禁文案；
   - CROSSCHAIN_LOOP 每次迭代真实写入三条链（heavy），运行前二次确认；
   - 「秒级」判定阈值 p95 < 1000ms，仅对官方目标含「秒级」的能力（cap2/cap3）出达标判定，cap1 不谎称秒级。 */
(function () {
  'use strict';

  var WORMHOLE_WARN = '该实验会在当前生产网络激活虫洞攻防：运行后 NODE-X/NODE-Y 可能遗留 ISOLATED 隔离状态，' +
    '正式演示将被安全拦截；隔离状态仅可通过「演示重置」清理（重置不影响真实链，链上数据不受任何影响）。确认现在运行？';
  var REALCHAIN_WARN = '该实验每次迭代都会真实写入三条链（13 步跨链协议：Fabric→ChainMaker→FISCO BCOS），' +
    '耗时以十秒计，并新增跨链台账记录（真实 TxID 可回溯）。确认现在运行？';

  function onlineCount(d) {
    var c = (d && d.chains) || {}, n = 0;
    Object.keys(c).forEach(function (k) { if (c[k] === 'ONLINE') n += 1; });
    return n;
  }

  window.CAPABILITIES = {
    p95ClaimMs: 1000,   /* 「秒级」判定阈值：p95_latency_ms < 1000 */
    wormholeWarn: WORMHOLE_WARN,
    caps: [
      {
        id: 'cap1', goalNo: '绩效目标一', ico: 'globe',
        title: '三链异构 · 国密跨链存证',
        pitch: '长安链（监管）× Fabric（运营）× FISCO BCOS（管理）三条异构链真实部署、协同在线：业务链之间不直连，' +
          '必经监管链中转；SM3 摘要 + SM9 签名国密算法全程保障，四段 TxID 全程留痕可回溯。',
        points: ['3 条异构链在网运行，状态实时可查', '13 步跨链协议 · 四段 TxID 存证台账', 'SM3 完整性 + SM9 验签双重国密保障'],
        claim: null,   /* 官方目标一不含「秒级」主张 —— 不出秒级判定，不谎称 */
        evidence: [
          { endpoint: '/api/chain/status', chips: function (d) {
              var n = onlineCount(d), total = (d && d.count) || 3;
              return [{ label: '异构链在线', value: n + ' / ' + total,
                sub: 'ChainMaker · Fabric · FISCO BCOS', tone: n === total ? 'good' : 'critical' }];
            } },
          { endpoint: '/api/crosschain/list', body: { page: 1, page_size: 1 }, chips: function (d) {
              var r = (d && d.records && d.records[0]) || null;
              return [
                { label: '累计跨链存证', value: (d && d.total) || 0, sub: '全量台账 · 自动去重', tone: 'info' },
                r ? { label: '最近存证', value: r.message_type || '—',
                    sub: r.status + ' · ' + (r.latency_ms != null ? r.latency_ms + 'ms' : '—'),
                    tone: r.status === 'SUCCESS' ? 'good' : 'critical' } : null
              ].filter(Boolean);
            } }
        ],
        experiments: [
          { type: 'CROSSCHAIN_LOOP', label: '跨链 13 步全流程回环', count: 2, heavy: true, warn: REALCHAIN_WARN,
            note: '每次迭代真实写入三条链' },
          { type: 'SM3_INTEGRITY', label: 'SM3 摘要完整性', count: 20 },
          { type: 'SM9_VERIFY', label: 'SM9 签名验真', count: 20 },
          { type: 'CONFLICT_DETECT', label: '三维冲突检测', count: 5 }
        ]
      },
      {
        id: 'cap2', goalNo: '绩效目标二', ico: 'shield',
        title: '抗虫洞 · 秒级链下可信网络',
        pitch: '可信路由 + SM9 挑战-响应会话认证的链下消息网络：消息毫秒级送达、不逐条上链；' +
          '虫洞隧道五维特征实时检测，受染节点隔离后自动重算干净路径恢复通信——攻防全程可实验复现。',
        points: ['链下消息毫秒级送达，实测均延见证据', '虫洞攻击五维风险检测 + 节点隔离', '路径重算自动恢复，攻防闭环一键复现'],
        claim: { text: '秒级链下交易' },
        evidence: [
          { endpoint: '/api/message/list', body: { page: 1, page_size: 50 }, chips: function (d) {
              var rs = (d && d.records) || [];
              var lat = rs.map(function (r) { return Number(r.latency_ms) || 0; })
                .filter(function (x) { return x > 0; });
              var avg = lat.length ? Math.round(lat.reduce(function (a, b) { return a + b; }, 0) / lat.length) : null;
              return [{ label: '链下消息实测均延', value: avg != null ? avg + ' ms' : '—',
                sub: '最近 ' + rs.length + ' 条 · 累计 ' + ((d && d.total) || 0) + ' 条',
                tone: avg != null && avg < 1000 ? 'good' : 'warning' }];
            } },
          { endpoint: '/api/topology/get', chips: function (d) {
              d = d || {};
              var iso = (d.isolated || []).length;
              return [
                { label: '可信网络拓扑', value: (d.nodes || []).length + ' 节点 · ' + (d.edges || []).length + ' 边',
                  sub: '活跃会话 ' + (d.active_sessions != null ? d.active_sessions : '—') + ' 个', tone: 'info' },
                { label: '虫洞演练 / 隔离', value: (d.wormhole_enabled ? '已激活' : '关闭') + ' / ' + iso,
                  sub: iso > 0 ? '存在隔离残留，可经「演示重置」清理' : '无隔离残留', tone: iso > 0 ? 'critical' : 'good' }
              ];
            } },
          { endpoint: '/api/dashboard/summary', chips: function (d) {
              var w = (d && d.wormhole_events) || {};
              return [{ label: '虫洞攻防事件', value: w.total || 0,
                sub: '检测 ' + (w.detect || 0) + ' · 隔离 ' + (w.isolate || 0) + ' · 恢复 ' + (w.recover || 0),
                tone: (w.detect || 0) > 0 ? 'serious' : 'info' }];
            } }
        ],
        experiments: [
          { type: 'MESSAGE_FLOW', label: '消息链路三场景', count: 10, scenarios: [
              { v: 'NORMAL', t: 'NORMAL · 基线吞吐（安全）' },
              { v: 'ATTACK', t: 'ATTACK · 虫洞隧道激活', warn: WORMHOLE_WARN },
              { v: 'DEFENSE', t: 'DEFENSE · 攻防闭环', warn: WORMHOLE_WARN }
            ] },
          { type: 'STRESS', label: '链下并发压力', count: 50 },
          { type: 'RISK_SCAN', label: '虫洞风险扫描', count: 3, warn: WORMHOLE_WARN,
            note: '高危：生产运行遗留虫洞/隔离残留' }
        ]
      },
      {
        id: 'cap3', goalNo: '绩效目标三', ico: 'search',
        title: '秒级追踪 · 密文内容监管',
        pitch: '7 级跨链身份追踪：化名→实名逐级回溯，断链即断点留痕，禁止拼造；' +
          'SM9 密文任务内容监管核验：未授权只见封缄，授权开箱全程上链留痕——追踪与核验均秒级出结果。',
        points: ['化名→实名 7 级追踪链路，断链诚实留痕', '未授权核验只返回密文封缄，明文绝不外泄', '授权批准/核验动作全程跨链上链留痕'],
        claim: { text: '秒级身份追踪' },
        evidence: [
          { endpoint: '/api/dashboard/summary', chips: function (d) {
              var a = (d && d.alerts) || {}, z = (d && d.authorizations) || {};
              return [
                { label: '监管告警', value: a.total || 0,
                  sub: 'OPEN ' + (a.open || 0) + ' · RESOLVED ' + (a.resolved || 0),
                  tone: (a.open || 0) > 0 ? 'serious' : 'good' },
                { label: '监管授权', value: (z.authorized || 0) + ' 授权 / ' + (z.denied || 0) + ' 拒绝',
                  sub: '批准动作跨链上链', tone: 'info' }
              ];
            } },
          { endpoint: '/api/regulatory/audit/list', body: { page: 1, page_size: 1 }, chips: function (d) {
              return [{ label: '监管审计记录', value: (d && d.total) || 0,
                sub: '授权 / 核验动作全留痕', tone: 'info' }];
            } }
        ],
        experiments: [
          { type: 'TRACE_BATCH', label: '批量身份追踪', count: 10 },
          { type: 'INSPECT_UNAUTHORIZED', label: '未授权封缄核验', count: 5,
            note: '验证未授权访问被设计性安全拒绝（封缄保护自证）' },
          { type: 'INSPECT_AUTHORIZED', label: '授权密文开箱', count: 5,
            note: '每次开箱核验上链留痕' },
          { type: 'ALERT_BATCH', label: '告警状态批量流转', count: 5 }
        ]
      }
    ]
  };
})();
