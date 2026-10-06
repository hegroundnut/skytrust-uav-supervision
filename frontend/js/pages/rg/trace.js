/* trace.js — 监管当局端·身份追踪（计划 B Task 11，spec §5.3）
   trace/identity 三入口（告警号/伪名/设备地址）→ 七级跨链身份解析时间线：
   L1 PSEUDO → L2 DEVICE_ADDRESS → L3 PASS_ID → L4 SM9_IDENTITY（以上 CHAINMAKER_INDEX 监管链索引）
   → L5 UAV_ID → L6 OPERATOR_ID（FABRIC_DETAIL 运营链）→ L7 MANUFACTURER_ID（FISCO_BCOS_DETAIL 管理链）。
   断链 5001 特判（spec 吸收旧终审 C14）：errCard 解说 + 其下补渲 data 里的部分时间线——
   断点级 status=BROKEN+reason、后续级 reason='skipped: break at level N'。
   宁可展示断链，也不拼造身份（红线）；「查不到」本身也是可审计的监管结论。
   note:null——追踪结果不落 STORE（契约档案 §29 惯例）。追踪不做授权门禁，但行为被审计（TRACE_IDENTITY）。
   监管端 operator 惯例：恒 'REG-01'。
   端点：trace/identity。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var SOURCE_CHAIN = { CHAINMAKER_INDEX: 'chainmaker', FABRIC_DETAIL: 'fabric', FISCO_BCOS_DETAIL: 'fisco-bcos' };

  function render(root, ctx) {
    var slotA = STORE.get('ALERT');
    var resultBox = h('div', {}, P.empty('选择入口后开始追踪——七级时间线将显示在这里'));

    root.append(P.pageHead({
      title: '身份追踪',
      sub: '伪名 → 七级跨链解析：设备地址 / 通行许可 / SM9 身份 / 航空器 / 运营商 / 厂商' }));

    var fTr = P.form([
      { name: 'entry_type', label: '追踪入口', type: 'select', required: true, value: 'ALERT_ID',
        options: [['ALERT_ID', '告警号（alert_id）'], ['PSEUDO', '航空器伪名（pseudo）'],
          ['DEVICE_ADDRESS', '设备地址（device_address）']],
        hint: '服务端优先级 alert_id > pseudo > device_address（本表单只发单键，不触发多键裁决）' },
      { name: 'entry', label: '入口值', type: 'text', required: true,
        value: slotA ? slotA.id : '',
        placeholder: 'ALERT-2026-… / PSEUDO-UAV-83921 / 0xADDR83921' },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'REG-01' }
    ]);

    /* 手写 run（非 runOp）：5001 需要拿 r.data 补渲断点时间线，runOp 的 rp 只渲染成功态 */
    async function doTrace(el) {
      var v = PORTAL.need(fTr.read(), 'entry_type', 'entry', 'operator');
      if (!v) return;
      var body = { operator: v.operator };
      if (v.entry_type === 'ALERT_ID') body.alert_id = v.entry;
      else if (v.entry_type === 'PSEUDO') body.pseudo = v.entry;
      else body.device_address = v.entry;
      el.disabled = true;
      var r = await API.call('/api/trace/identity', body);
      el.disabled = false;
      if (!resultBox.isConnected) return;
      resultBox.innerHTML = '';
      if (r.code === 0) {
        resultBox.append(traceView(r.data));
      } else if (r.code === 5001 && r.data) {
        /* 断链特判：错误解说 + 断点时间线补渲（后端已留痕，前端有义务展示） */
        resultBox.append(P.errCard(r), traceView(r.data));
      } else {
        resultBox.append(P.errCard(r));
      }
      /* note:null——追踪结果不落 STORE（§29） */
    }

    root.append(card('发起追踪 trace/identity（三入口任选其一）',
      fTr.root,
      P.actionBar([{ label: '开始七级追踪', kind: 'primary', run: doTrace }]),
      h('p', { class: 'd-small d-muted' }, '断链（5001）不是失败——「查不到」本身也是可审计的监管结论。追踪行为已写入全局审计（TRACE_IDENTITY / 断链 TRACE_IDENTITY_BROKEN）。')));
    root.append(card('追踪结果（七级时间线）', resultBox));
  }

  function traceView(d) {
    var levels = d.levels || [];
    return h('div', {},
      P.statCards([
        { label: '追踪结论', value: d.resolved ? '✓ 全链可溯' : '⛔ 断链 L' + d.break_level,
          sub: d.resolved ? '七级全部解析（break_level=0）' : '第 ' + d.break_level + ' 级中断——后续级不拼造',
          tone: d.resolved ? 'good' : 'critical' },
        { label: '追踪时延', value: d.trace_latency_ms != null ? d.trace_latency_ms + ' ms' : '—' },
        { label: '解析伪名', value: d.pseudonym || '—' }
      ]),
      P.kv([
        ['入口', h('span', { class: 'd-row' }, P.badge(d.entry_type), h('code', { class: 'p-mono' }, d.entry))],
        ['resolved / break_level', String(d.resolved) + ' / ' + String(d.break_level) + '（0=七级全通）']
      ]),
      h('div', { class: 'd-col' }, levels.map(function (lv) {
        return h('div', { class: 'd-section' },
          h('div', { class: 'd-row' },
            h('b', {}, 'L' + lv.level + ' · ' + lv.name),
            P.badge(lv.status),
            SOURCE_CHAIN[lv.source] ? P.chainTag(SOURCE_CHAIN[lv.source])
              : h('span', { class: 'd-small d-muted' }, lv.source || '—'),
            h('span', { class: 'd-small d-muted' }, lv.latency_ms != null ? lv.latency_ms + ' ms' : '')),
          h('div', { class: 'p-mono d-small' }, lv.value || '—'),
          lv.reason ? h('div', { class: 'd-small d-muted' }, '⛔ ' + lv.reason) : null);
      })));
  }

  RG.trace = { render: render };
})();
