/* js/pages/demo.js — 演示说明页（index.html #/demo，内部总控导航专用）。
   按立项三目标组织 21 步真实 API 演示流程（目标① 6 步 / 目标② 8 步 / 目标③ 7 步）。
   每步一张三区块卡：①现在在干什么（+系统位置指引 +链上见证点）②要发送的数据（真实
   请求体，可直接编辑：未手改时随链式状态实时刷新，手改稿按步骤号存活于页签切换，
   「恢复默认」一键回填；JSON 解析失败即中止发送并如实说明）③发送按钮 + 返回结果（元信息行/kv 摘选/原始 JSON）。
   诚实红线（同 act1/2/3）：
   - 全部调用真实后端接口，真实写库、真实上链，零 mock 零沙箱；
   - 单号链式传递：mission_id/application_id/session_id/alert_id/authorization_id 一律
     取上一步实际返回值（模块级 S），拿不到就禁用按钮并如实说明前置缺口；
   - 「按设计拒绝」机制（expect）：5002 未授权开箱 / 4001 虫洞残留 / 4002 健康会话切径
     属机制正确性证据，琥珀色如实展示，绝不当失败掩盖、更不静默重试；
   - 目标② 链下网络不写任何账本——秒级正因免共识，该目标不标链上见证（界面见证：
     管理端「链网安全运营」拓扑/演练画面），绝不编造假见证点；
   - 元信息行与原始 JSON 本页恒开（不走 P.metaLine/resultPanel 的 DEBUG 门控——本页
     即内部工程演示工具，代码/耗时/trace/报文全透明是其存在意义）。
   状态存活契约：P.tabs 经 ?tab= hash 参数 → 切页签触发 hashchange → route() 全页重渲，
   故演示状态必须模块级持有（同 act1/2/3 的 const S 模式）；「重置本页演示单号」清 S.TS
   后重生成全套新单号。依赖：UI/PUI/API/STORE/CXV.msgTypeZh(js/chainview.js)/EXPLAIN。 */
(function () {
  'use strict';
  const h = UI.h, P = PUI;

  /* ================= 模块级演示状态（页签切换/重渲存活） ================= */
  const S = {};

  function initState() {
    if (S.TS) return;
    S.TS = UI.tsSuffix();                       // HHMMSS——单号后缀，避开历史数据冲突
    S.uavId = 'UAV-DEMO-' + S.TS;
    S.missionIdLive = null;                     // ①-2 mission/create 返回
    S.applicationId = null;                     // ①-3 mission/submit 返回
    S.reviewed = false;                         // ①-4 review/submit 成功
    S.passId = null;                            // ①-5 pass/issue 返回
    S.sessionId = null;                         // ②-1 session/open 返回
    S.alertId = 'ALERT-DEMO-' + S.TS;           // ③-1 请求体预制
    S.alertIdLive = null;                       // ③-1 alert/raise 返回
    S.authId = 'AUTH-DEMO-' + S.TS;             // ③-4 请求体预制
    S.authIdLive = null;                        // ③-4 authorize/apply 返回
    S.authApproved = false;                     // ③-6 authorize/review 批准通过
    S.chainTxId = null;                         // ③-6 上链存证 TxID
    S.edits = {};                               // 每步请求体手改稿（键=步骤编号）——页签重渲存活，重置单号即全清
  }

  /* 目标③  mission_id 取值：本页 ①-2 实跑值 → 演示上下文最近任务 → 种子任务。
     种子任务若无密文记录，接口会如实报错并原样展示（绝不静默兜底假数据）。 */
  function missionOf() {
    return S.missionIdLive
      || (STORE.get('MISSION') && STORE.get('MISSION').id)
      || 'MISSION-2026-001';
  }

  /* ================= 请求体刷新注册表（链式单号变化 → 全部卡片同步） ================= */
  let REFR = [];
  function refreshAll() {
    REFR.forEach(r => {
      if (!r.dirty()) r.fill();                 // 未手改的卡随链式单号刷新默认请求体；手改稿绝不覆盖
      const gate = r.st.ready ? r.st.ready() : null;
      r.send.disabled = !!gate;
      r.hint.textContent = gate || '';
      r.hint.hidden = !gate;
    });
  }

  /* ================= 小工具 ================= */
  function dt(offsetMin) { return UI.datetimeLocal(offsetMin).slice(0, 16) + ':00'; }
  function mono(v, n) { return h('code', { class: 'p-mono' }, UI.trunc(v, n || 32)); }
  function pathText(v) {
    if (Array.isArray(v)) return v.join(' → ') || '—';
    return v === null || v === undefined || v === '' ? '—' : String(v);
  }
  /* 隧道路径注记：NODE-X/NODE-Y 为虫洞隧道节点特征（netsec 同口径） */
  function pathNote(t) {
    return /NODE-[XY]/.test(t) ? t + '（含隧道节点——攻击生效中）' : t;
  }
  function guideLine(cls, label, text) {
    return h('div', { class: 'dm-guide ' + cls }, h('b', {}, label), h('span', {}, text));
  }

  /* ================= 发送管线（三区块之第三块） ================= */
  async function onSend(st, out, send, btnLabel, ta) {
    /* 第二块可编辑：先解析 JSON——格式破坏即中止并如实说明，绝不带病发请求 */
    let body;
    try { body = JSON.parse(ta.value); }
    catch (e) {
      out.innerHTML = '';
      out.append(h('div', { class: 'dm-parseerr' },
        '请求体不是合法 JSON（' + e.message + '）——已中止发送。请修正报文，或点「恢复默认」重新取链式单号。'));
      return;
    }
    send.disabled = true;
    send.textContent = '发送中…';
    const r = await API.call(st.path, body);
    out.innerHTML = '';

    /* 元信息行——本页恒开（DEBUG 门控不适用，见文件头诚实红线） */
    const designed = !r.ok && st.expect && r.code === st.expect.code;
    out.append(h('div', { class: 'dm-meta' },
      r.ok ? P.badgeZh(0, '成功 · code=0', 'good')
        : designed ? P.badgeZh(r.code, '◈ 按设计拒绝 · code=' + r.code, 'warning')
          : P.badgeZh(r.code, '未成功 · code=' + r.code, 'critical'),
      h('span', {}, '⏱ 端到端 ' + UI.fmtMs(r.latencyMs)),
      r.trace_id ? h('span', {}, 'trace ', h('code', { class: 'p-mono' }, r.trace_id)) : null));

    const d = r.data || {};
    if (r.ok) {
      if (st.absorb) st.absorb(d);
      if (st.pick) { const rows = st.pick(d); if (rows && rows.length) out.append(P.kv(rows)); }
      if (st.renderOk) { const v = st.renderOk(d); if (v) out.append(v); }
      if (st.renderExtra) { const v = st.renderExtra(d); if (v) out.append(v); }
      if (st.witness) {
        let wit = '链上见证：' + st.witness;
        const tx = st.txOf && st.txOf(d);
        if (tx) wit += '——本步跨链流水号 cross_tx_id: ' + tx;
        out.append(h('div', { class: 'p-ok-line dm-wit' },
          h('svg', { class: 'd-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
            h('use', { href: '#d-ico-check' })), wit));
      }
    } else if (designed) {
      out.append(h('div', { class: 'dm-designed' },
        h('b', {}, '◈ 按设计拒绝——这正是本步要演示的机制点，不是故障：'),
        h('div', {}, st.expect.why)));
      if (st.pick && r.data) { const rows = st.pick(d); if (rows && rows.length) out.append(P.kv(rows)); }
      if (st.renderExtra && r.data) { const v = st.renderExtra(d); if (v) out.append(v); }
    } else {
      out.append(P.errCard(r));
    }

    /* 原始响应 JSON——恒可展开核查（含 code/message/data/trace_id 全文） */
    out.append(h('details', { class: 'dm-raw' },
      h('summary', {}, '原始响应 JSON（点击展开核查）'), UI.jsonBlock(r.raw, 340)));

    refreshAll();                               // 链式单号/门控全卡同步（含本按钮复位）
    send.textContent = btnLabel;
    const gate = st.ready ? st.ready() : null;
    send.disabled = !!gate;
  }

  /* ================= 步骤卡（三区块结构；第二块 = 可直接编辑的 JSON 报文） ================= */
  function stepCard(no, st) {
    const ta = h('textarea', {
      class: 'dm-json dm-edit', spellcheck: 'false',
      title: '可直接编辑（JSON）——链式单号自动预填，改坏可一键「恢复默认」',
    });
    function fillDefault() {
      ta.value = JSON.stringify(st.body(), null, 2);
      ta.rows = Math.min(14, Math.max(4, ta.value.split('\n').length));
    }
    const saved = S.edits[no];
    let dirty = saved !== undefined;
    if (dirty) ta.value = saved; else fillDefault();
    const restoreBtn = h('button', {
      class: 'p-btn p-btn-sm p-btn-ghost dm-restore', hidden: !dirty,
      title: '丢弃手改，按当前链式单号重新填充默认请求体',
      onClick: () => { dirty = false; delete S.edits[no]; fillDefault(); restoreBtn.hidden = true; },
    }, '恢复默认');
    ta.addEventListener('input', () => {
      dirty = true; S.edits[no] = ta.value; restoreBtn.hidden = false;
    });
    const out = h('div', { class: 'dm-result' });
    const hint = h('div', { class: 'p-field-hint', hidden: true });
    const btnLabel = '发送请求';
    const send = h('button', {
      class: 'p-btn p-btn-primary',
      title: 'POST ' + st.path,
      onClick: () => onSend(st, out, send, btnLabel, ta),
    }, btnLabel);
    const gate = st.ready ? st.ready() : null;
    if (gate) { send.disabled = true; hint.textContent = gate; hint.hidden = false; }
    REFR.push({ fill: fillDefault, send, hint, st, dirty: () => dirty });

    return h('section', { class: 'p-card dm-block' },
      h('div', { class: 'dm-head' },
        h('span', { class: 'dm-no' }, no),
        h('h3', { class: 'p-card-title dm-title' }, st.name),
        h('code', { class: 'p-mono dm-ep', title: '本步调用的真实后端接口' }, 'POST ' + st.path)),
      /* 第一块——现在在干什么（+系统位置 +链上见证） */
      h('div', { class: 'dm-label' }, '现在在干什么'),
      h('p', { class: 'dm-why' }, st.why),
      guideLine('dm-locate', '系统位置', st.locate),
      st.witness ? guideLine('dm-witness-guide', '链上见证', st.witness) : null,
      /* 第二块——要发送的数据（可直接编辑；未手改时随链式单号自动刷新） */
      h('div', { class: 'dm-label dm-labelrow' }, h('span', {}, '要发送的数据（可直接编辑）'), restoreBtn),
      ta,
      st.editHint ? h('div', { class: 'dm-edithint' }, '✎ ' + st.editHint) : null,
      /* 第三块——发送按钮 + 返回结果 */
      h('div', { class: 'dm-label' }, '发送与返回'),
      h('div', { class: 'dm-sendrow' }, send, hint),
      out);
  }

  /* ================= 目标① 6 步（商密跨链系统） ================= */
  const G1_STEPS = [
    {
      name: '航空器实名登记（SM9 身份签发 · 存证上链）',
      editHint: '可改：model、operator_id、manufacturer_id；uav_id / serial_no 已含时间戳预填（重演可再改，注意避开历史数据）。',
      why: '运营商为本次演示新登记一架无人机（编号含时间戳，避开历史数据）。后端为其生成 SM9 身份标识，并把登记证明跨链写入 ChainMaker 监管链——这是目标①「商密跨链」的起点：后续申请、审核、许可全部锚定这个国密身份。',
      locate: '运营商门户「我的航空器」→ 登记航空器（同一接口、同一表单字段）。',
      witness: '任一门户「链上浏览器」→「链上数据追踪」，消息类型选「航空器登记证明」，即可看到本步记录（SM3 摘要 + SM9 验签结果实时展示）。',
      path: '/api/uav/register',
      body: () => ({
        uav_id: S.uavId, serial_no: 'SN-DEMO-' + S.TS, model: 'DJI-M350',
        operator_id: 'Operator-A', manufacturer_id: 'Manufacturer-B',
      }),
      pick: d => [
        ['无人机编号', mono(d.uav && d.uav.uav_id, 28)],
        ['SM9 身份标识', mono(d.uav && d.uav.sm9_identity, 42)],
        ['登记状态', P.badge(d.uav && d.uav.status)],
      ],
      absorb: d => {
        STORE.note('UAV', (d.uav && d.uav.uav_id) || S.uavId);
        const tx = d.crosschain && d.crosschain.cross_tx_id;
        if (tx) STORE.note('CROSS_TX', tx);
      },
      txOf: d => d.crosschain && d.crosschain.cross_tx_id,
    },
    {
      name: '创建飞行任务（载荷密文落库 · 明文不落库）',
      editHint: '可改：route_segments、altitude_min/max、payload_type、description、start_time/end_time（格式 YYYY-MM-DD HH:MM:SS；「恢复默认」按当前时刻重算相对偏移）。uav_id / operator_id / mission_type 为种子固定值。',
      why: '运营商创建一条巡检任务：航段、时间窗、高度、载荷类型。落库时敏感字段以 SM4 密文存储，业务库只见掩码值与 SM3 摘要——明文永不落库。这是目标③「密文内容监管」的数据基础：此刻任何人（包括监管方）都看不到明文，直到走完 ③-4～③-7 的授权开箱。本步只写业务库，不产生跨链消息（如实：所以本步没有链上见证点）。',
      locate: '运营商门户「飞行活动申请」→ 新建任务草稿（同一接口、同一字段集）。',
      witness: null,
      path: '/api/mission/create',
      body: () => ({
        operator_id: 'Operator-A', uav_id: 'UAV-A-001', mission_type: 'POWER_INSPECTION',
        route_segments: ['R101', 'R205', 'R306'],
        start_time: dt(60), end_time: dt(180),
        altitude_min: 60, altitude_max: 120, payload_type: 'CAMERA',
        description: '演示说明：Zone-A 全线巡检（密文落库）',
      }),
      pick: d => [
        ['任务编号', mono(d.mission_id, 28)],
        ['状态', P.badge(d.status)],
        ['穿越空域', (d.zones || []).join('、') || '—'],
        ['航段', (d.route_segments || []).join(' → ') || '—'],
        ['密文掩码值', mono(d.masked_value, 32)],
        ['SM3 摘要', mono(d.sm3_hash, 32)],
      ],
      absorb: d => { S.missionIdLive = d.mission_id || S.missionIdLive; STORE.note('MISSION', d.mission_id); },
    },
    {
      name: '提交任务申请（Fabric → ChainMaker → FISCO 跨链中继）',
      editHint: '可改：operator。mission_id 自动取 ①-2 实跑返回值——改成不存在的单号，接口会如实报错（这本身也是可演示的诚实行为）。',
      why: '草稿提交为正式申请：申请单写入 Fabric 运营链，经 ChainMaker 监管链验签中继，送达 FISCO BCOS 管理链等待管理当局审核。目标①的商密跨链中继在这一步真实发生——每跳均 SM3 摘要 + SM9 签名，全程可在台账回查。',
      locate: '运营商门户「飞行活动申请」→ 选中草稿 → 提交申请。',
      witness: '「链上浏览器」→「链上数据追踪」，消息类型「任务申请」；点击该行可打开四段存证抽屉（源链上链 → 监管链签收 → 监管链中继 → 目标链存证）。',
      path: '/api/mission/submit',
      body: () => ({ mission_id: S.missionIdLive, operator: 'Operator-A' }),
      ready: () => S.missionIdLive ? null : '需先执行上一步「创建飞行任务」——mission_id 取自其真实返回值，不预填假单号',
      pick: d => [
        ['申请单号', mono(d.application && d.application.application_id, 28)],
        ['申请状态', P.badge(d.application && d.application.status)],
      ],
      absorb: d => {
        S.applicationId = (d.application && d.application.application_id) || S.applicationId;
        const tx = d.crosschain && d.crosschain.cross_tx_id;
        if (tx) STORE.note('CROSS_TX', tx);
      },
      txOf: d => d.crosschain && d.crosschain.cross_tx_id,
    },
    {
      name: '管理当局审核通过（FISCO → Fabric 反向回传）',
      editHint: '可改：comment、rules_hit；result 可改 REJECTED 演示「驳回」的不同跨链回传路径。application_id 自动链式传递。',
      why: '管理当局（FISCO BCOS 侧）对申请单作出 APPROVED 审核，附规则引擎命中记录；审核结果跨链回传 Fabric 运营链，任务状态随之推进。这是目标①的反向中继：管理链的审核结论成为运营链的业务事实，两链账本各自独立、证据互认可查。',
      locate: '管理当局门户「审核队列」→ 选中申请 → 通过；审核历史见「审核留痕」。',
      witness: '「链上浏览器」→「链上数据追踪」，消息类型「审核结果」（FISCO BCOS → Fabric 回传行），可用上一步申请单号直查。',
      path: '/api/review/submit',
      body: () => ({
        application_id: S.applicationId, result: 'APPROVED', reviewer: 'FISCO-ADMIN',
        comment: '演示说明：同意执行', rules_hit: ['R-ALT-001'],
      }),
      ready: () => S.applicationId ? null : '需先执行上一步「提交任务申请」——application_id 取自其真实返回值',
      pick: d => [
        ['审核单号', mono(d.review && d.review.review_id, 28)],
        ['审核结论', P.badge(d.review && d.review.result)],
        ['命中规则', ((d.review && d.review.rules_hit) || []).join('、') || '—'],
        ['回传后任务状态', P.badge(d.mission && d.mission.status)],
      ],
      absorb: d => {
        S.reviewed = true;
        const tx = d.crosschain && d.crosschain.cross_tx_id;
        if (tx) STORE.note('CROSS_TX', tx);
      },
      txOf: d => d.crosschain && d.crosschain.cross_tx_id,
    },
    {
      name: '签发电子飞行许可（第 4 条异构链 IRITA · SM2 体系）',
      editHint: '可改：issuer、valid_from/valid_to（同 YYYY-MM-DD HH:MM:SS 格式）。mission_id 自动链式传递——签发前提是 ①-4 已审核通过。',
      why: '审核通过后，为任务签发电子飞行许可（通行证）——落在 IRITA 证照链上。IRITA 是与 ChainMaker / Fabric / FISCO BCOS 并存的第 4 条异构链（SM2 商密体系）：立项要求「至少 3 种」，系统实际在网 4 种，本步就是第 4 链的现场证据。许可含航线与有效期，上链即不可篡改。',
      locate: '证照中心门户「通行证签发」；签发后运营商门户「电子飞行许可」可查验，管理当局门户「许可管理」见台账。',
      witness: '「链上浏览器」→「链上数据追踪」消息类型「电子许可」；再切「块浏览」→ 选 IRITA 证照链 → 最新块，可见本步的原始交易。',
      path: '/api/pass/issue',
      body: () => ({ mission_id: S.missionIdLive, issuer: 'FISCO-ADMIN', valid_from: dt(-60), valid_to: dt(240) }),
      ready: () => !S.missionIdLive ? '需先执行 ①-2「创建飞行任务」'
        : (!S.reviewed ? '需先执行上一步「管理当局审核通过」——审核通过前不可签发' : null),
      pick: d => [
        ['许可编号', mono(d.pass && d.pass.pass_id, 28)],
        ['绑定任务', mono(d.pass && d.pass.mission_id, 28)],
        ['绑定无人机', mono(d.pass && d.pass.uav_id, 24)],
        ['有效期', UI.fmtDT(d.pass && d.pass.valid_from) + ' ~ ' + UI.fmtDT(d.pass && d.pass.valid_to)],
        ['状态', P.badge(d.pass && d.pass.status)],
      ],
      absorb: d => {
        S.passId = (d.pass && d.pass.pass_id) || S.passId;
        STORE.note('PASS', S.passId);
        const tx = d.crosschain && d.crosschain.cross_tx_id;
        if (tx) STORE.note('CROSS_TX', tx);
      },
      txOf: d => d.crosschain && d.crosschain.cross_tx_id,
    },
    {
      name: '拉取跨链交易台账（四链全部跨链消息一屏核验）',
      editHint: '可改：page、page_size（加大 page_size 可扩大台账窗口）。',
      why: '拉取最近的跨链交易列表：每行都是一次完整的商密跨链中继（源链 → 监管链中继 → 目标链），带 SM3/SM9 验签结果与端到端耗时。前面五步应新增了 4 条以上记录——目标①不是口号，是这本可查询、可验签的台账。',
      locate: '任一门户「链上浏览器」→「链上数据追踪」（同一数据源的可视化时间线 + 四链泳道视图）。',
      witness: '本步即链上台账本体——下表任一 cross_tx_id 在「链上数据追踪」点击即可打开四段存证详情。',
      path: '/api/crosschain/list',
      body: () => ({ page: 1, page_size: 20 }),
      renderOk: d => {
        const recs = (d.records || []).slice(0, 5);
        if (!recs.length) return P.empty('台账暂无记录（如实展示——先执行前面步骤再拉取）');
        return h('div', { class: 'dm-cxrows' },
          recs.map(t => h('div', { class: 'dm-cxrow' },
            P.chainTag(t.source_chain), h('span', { class: 'dm-cx-arrow' }, '→'), P.chainTag(t.final_target_chain),
            h('code', { class: 'p-mono dm-cx-tx', title: t.cross_tx_id || '' }, UI.trunc(t.cross_tx_id, 20)),
            h('span', { class: 'dm-cx-msg' }, t.message_type ? CXV.msgTypeZh(t.message_type) : '—'),
            t.verify_result ? P.badge(t.verify_result) : h('span', {}, '验签 —'),
            h('span', { class: 'dm-cx-ms p-mono' }, UI.fmtMs(t.latency_ms)))),
          h('div', { class: 'p-field-hint' }, '台账总量 ' + (d.total != null ? d.total : '—') + ' 条（本页展示最近 ' + recs.length + ' 条）'));
      },
    },
  ];

  /* ================= 目标② 8 步（抗虫洞秒级链下网络） ================= */
  const G2_STEPS = [
    {
      name: '打开链下安全会话（SM9 双向认证 · 秒级建立）',
      editHint: '可改：uav_id（默认种子 UAV-A-001）。',
      why: '无人机节点与管理端建立链下会话：SM9 身份互认 + nonce 新鲜性挑战，不经共识、不写任何账本——会话建立即为秒级。这是目标②「秒级链下交易网络」的接入层：高频飞行动态走这一层，只有关键证据（登记/申请/许可）才落链。',
      locate: '管理当局门户「链网安全运营」→「会话·消息」→ 打开会话；运营商门户「运行识别·飞行动态」的起飞报备调用同一接口。',
      witness: null,
      path: '/api/session/open',
      body: () => ({ uav_id: 'UAV-A-001' }),
      pick: d => [
        ['会话编号', mono(d.session && d.session.session_id, 28)],
        ['会话状态', P.badge(d.session && d.session.status)],
        ['SM9 身份（互认）', mono(d.auth && d.auth.sm9_identity, 36)],
        ['新鲜性挑战 nonce', mono(d.auth && d.auth.nonce, 24)],
        ['互认通过', d.auth && d.auth.verified ? '✓ 已验证' : '—'],
        ['当前路径', pathText(d.path)],
      ],
      absorb: d => {
        S.sessionId = (d.session && d.session.session_id) || S.sessionId;
        STORE.note('SESSION', S.sessionId);
      },
    },
    {
      name: '发送飞行动态消息（毫秒级延迟基线）',
      editHint: '可改：msg_type、source_node、target_node。session_id 自动取 ②-1 返回值——改成不存在的会话将如实报错。',
      why: '会话内发送一条 POSITION_UPDATE 位置报文：返回 latency_ms 为端到端实测延迟（通常几十毫秒）——目标②「秒级」的直接证据（实际做到毫秒级）：SM3 完整性 + SM9 签名全部在链下网络内完成，零共识开销。本步先立正常基线，供 ②-4 攻击态对比。',
      locate: '管理当局门户「链网安全运营」→「会话·消息」→ 选会话 → 发送消息（运营商端「运行识别·飞行动态」位置上报同接口）。',
      witness: null,
      path: '/api/message/send',
      body: () => ({ session_id: S.sessionId, msg_type: 'POSITION_UPDATE', source_node: 'UAV-A-001-NODE', target_node: 'MGR' }),
      ready: () => S.sessionId ? null : '需先执行上一步「打开链下安全会话」——session_id 取自其真实返回值',
      pick: d => [
        ['消息编号', mono(d.message && d.message.message_id, 28)],
        ['序号 seq', d.message && d.message.seq != null ? d.message.seq : '—'],
        ['端到端延迟', h('b', { class: 'p-mono dm-lat' }, UI.fmtMs(d.message && d.message.latency_ms))],
        ['SM3 摘要', mono(d.message && d.message.sm3_hash, 32)],
        ['投递状态', P.badge(d.message && d.message.status)],
      ],
    },
    {
      name: '注入虫洞攻击（打开攻击模拟开关）',
      editHint: '可改：operator。enabled 为本步演示语义所在，保持 true。',
      why: '模拟攻击者打开虫洞隧道：伪造低延迟邻居，诱使节点改走隧道路由。若返回 4001 属按设计拒绝——上次攻防演练的 ISOLATED 隔离残留未复位，系统拒绝在残留状态上再次注入（防止演练状态互相污染），这本身就是安全机制的一部分。',
      locate: '管理当局门户「链网安全运营」→「攻防演练」→ 虫洞注入开关；「拓扑·节点」图上红色虚线虫洞边同步出现。',
      witness: null,
      path: '/api/wormhole/toggle',
      body: () => ({ enabled: true, operator: 'ATTACKER-SIM' }),
      expect: {
        code: 4001,
        why: '上次攻防演练的 ISOLATED 隔离残留未复位——按设计拒绝，不是故障。到「总览 → 演示维护」执行复位后重演本流程（复位仅清业务库演练数据，永不触碰真实链上数据）。',
      },
      pick: d => [
        ['虫洞开关', d.wormhole_enabled === true ? 'ON（已注入）' : (d.wormhole_enabled === false ? 'OFF' : '—')],
        ['受影响节点', (d.nodes_affected || []).join('、') || '—'],
      ],
    },
    {
      name: '攻击态下继续发消息（观察时延劣化与隧道路径）',
      editHint: '可改项同 ②-2（msg_type、source_node、target_node）；session_id 自动链式传递。在 ②-3 注入后发送才能观察到时延劣化。',
      why: '虫洞生效后再发一条同样的报文：latency_ms 会明显高于 ②-2 的基线（数倍起步）——这正是虫洞攻击的危害本质：制造「更快」的假象，实际物理路径被拉长、流量被劫持到隧道。实际经过路径中的 NODE-X / NODE-Y 即隧道节点特征。',
      locate: '同「会话·消息」页；管理当局门户「攻防演练」画面的时延对比曲线为同一批数据。',
      witness: null,
      path: '/api/message/send',
      body: () => ({ session_id: S.sessionId, msg_type: 'POSITION_UPDATE', source_node: 'UAV-A-001-NODE', target_node: 'MGR' }),
      ready: () => S.sessionId ? null : '需先执行 ②-1「打开链下安全会话」',
      pick: d => {
        const pd = d.path_detail || (d.message && d.message.path_detail);
        return [
          ['端到端延迟（劣化）', h('b', { class: 'p-mono dm-lat-bad' }, UI.fmtMs(d.message && d.message.latency_ms))],
          ['实际经过路径', h('code', { class: 'p-mono' }, pathNote(pathText(pd)))],
          ['投递状态', P.badge(d.message && d.message.status)],
        ];
      },
    },
    {
      name: '风险评估（五维打分 · DETECT 判定）',
      editHint: 'session_id 自动链式传递，无可改字段（评估对象即当前会话）。',
      why: '对当前会话做风险评估：身份一致性 / 邻接真实性 / 时延合理性 / 挑战同步性 / 路径稳定性五个维度分别打分，综合分越过阈值即判定 DETECT（检测到虫洞）。这是目标②「抵抗」的前半段——先能识破：不靠先验名单，靠行为证据。',
      locate: '管理当局门户「链网安全运营」→「攻防演练」→ 风险评估；五维得分条图同屏展示。',
      witness: null,
      path: '/api/risk/evaluate',
      body: () => ({ session_id: S.sessionId }),
      ready: () => S.sessionId ? null : '需先执行 ②-1「打开链下安全会话」',
      pick: d => [
        ['判定结论', P.badgeZh(d.verdict,
          d.verdict === 'DETECT' ? 'DETECT（检测到虫洞）' : (d.verdict === 'NORMAL' ? 'NORMAL（正常）' : d.verdict),
          d.verdict === 'DETECT' ? 'critical' : 'good')],
        ['风险得分', h('b', { class: 'p-mono' }, d.risk_score != null ? Number(d.risk_score).toFixed(2) : '—')],
        ['判定阈值', d.threshold != null ? Number(d.threshold).toFixed(2) : '—'],
      ],
      renderExtra: d => (d.dimensions ? P.scoreBars(d.dimensions, d.threshold) : null),
    },
    {
      name: '路径切换（避开虫洞 · 秒级恢复）',
      editHint: '可改：operator。session_id 自动链式传递；对健康会话执行将被按设计拒绝（4002）。',
      why: '对受攻击会话执行路径切换：路由避开虫洞隧道、恢复安全路径，recovery_latency_ms 为切换实测耗时（秒级）——目标②「抵抗」的后半段：识破之后能绕开，且绕开得快。注意：对健康会话执行切换会被按设计拒绝（4002），切换是应急处置动作而非常规操作。',
      locate: '管理当局门户「链网安全运营」→「攻防演练」→ 路径切换；「拓扑·节点」图上红色虚线消失、会话恢复常态色。',
      witness: null,
      path: '/api/path/switch',
      body: () => ({ session_id: S.sessionId, operator: 'OP-1' }),
      ready: () => S.sessionId ? null : '需先执行 ②-1「打开链下安全会话」',
      expect: {
        code: 4002,
        why: '会话健康（无攻击判定）时不允许切换路径——按设计拒绝：切换是应急处置动作。请先执行 ②-3「注入虫洞攻击」并完成 ②-5 风险评估后重演本步。',
      },
      pick: d => [
        ['会话状态', P.badge(d.session && d.session.status)],
        ['恢复耗时', h('b', { class: 'p-mono dm-lat' }, UI.fmtMs(d.recovery_latency_ms))],
        ['原路径', h('code', { class: 'p-mono' }, pathText(d.original_path))],
        ['新路径', h('code', { class: 'p-mono' }, pathText(d.new_path))],
        ['安全事件编号', mono(d.event && d.event.event_id, 28)],
      ],
    },
    {
      name: '恢复后验证消息（时延回落至基线）',
      editHint: '可改项同 ②-2（msg_type、source_node、target_node）；session_id 自动链式传递。',
      why: '路径切换后再发一条同样的报文对比：latency_ms 回落到 ②-2 的正常水平。攻击注入 → 行为劣化 → 风险识破 → 路径规避 → 恢复验证，全闭环完成——全程秒级、全程零账本写入（这正是链下层的设计目的）。',
      locate: '同「会话·消息」页；「攻防演练」画面的时延回落曲线为同一批数据。',
      witness: null,
      path: '/api/message/send',
      body: () => ({ session_id: S.sessionId, msg_type: 'POSITION_UPDATE', source_node: 'UAV-A-001-NODE', target_node: 'MGR' }),
      ready: () => S.sessionId ? null : '需先执行 ②-1「打开链下安全会话」',
      pick: d => [
        ['端到端延迟（恢复）', h('b', { class: 'p-mono dm-lat' }, UI.fmtMs(d.message && d.message.latency_ms))],
        ['实际经过路径', h('code', { class: 'p-mono' }, pathText(d.path_detail || (d.message && d.message.path_detail)))],
        ['投递状态', P.badge(d.message && d.message.status)],
      ],
    },
    {
      name: '关闭虫洞攻击（撤除模拟开关）',
      editHint: '可改：operator。enabled 保持 false（本步语义即撤除攻击）。',
      why: '关闭攻击模拟，网络恢复无攻击状态。如实说明：关闭开关不会自动解除受影响节点的 ISOLATED 隔离标记——解除隔离需单独操作，或经「总览 → 演示维护」复位。这是有意设计：攻击撤除不应零成本，隔离记录保留供审计复盘。',
      locate: '管理当局门户「链网安全运营」→「攻防演练」→ 虫洞注入开关关闭；监管端「监管驾驶舱」攻防事件统计同源可见。',
      witness: null,
      path: '/api/wormhole/toggle',
      body: () => ({ enabled: false, operator: 'ATTACKER-SIM' }),
      pick: d => [
        ['虫洞开关', d.wormhole_enabled === false ? 'OFF（已撤除）' : (d.wormhole_enabled === true ? '仍为 ON（如实展示）' : '—')],
        ['受影响节点', (d.nodes_affected || []).join('、') || '—'],
      ],
    },
  ];

  /* ================= 目标③ 7 步（秒级追踪 + 密文监管） ================= */
  const G3_STEPS = [
    {
      name: '发起一条高危告警（化名身份 · 密文锚点）',
      editHint: '可改：event_type、risk_level、uav_pseudonym、operator；alert_id 已含时间戳预填（重演可再改）。mission_id 依次取目标①实跑值 → 演示上下文 → 种子任务。',
      why: '监管员对航线偏离（ROUTE_DEVIATION）发起高危告警。注意告警里只有无人机化名 PSEUDO-UAV-83921——真实身份被封存在密文层，告警经手人无权直接看到。目标③「秒级身份追踪」要演示的正是：从这个化名出发，秒级还原真实身份。',
      locate: '监管门户「告警管理」→ 发起告警（同一接口）；发起后同屏列表实时可见。',
      witness: '本步写业务库（含 evidence_hash 证据摘要），不产生跨链消息——如实：无链上见证点，链上见证从 ③-3 身份追踪与 ③-6 审批存证开始。',
      path: '/api/alert/raise',
      body: () => ({
        alert_id: S.alertId, event_type: 'ROUTE_DEVIATION', risk_level: 'HIGH',
        uav_pseudonym: 'PSEUDO-UAV-83921', mission_id: missionOf(),
        operator: 'REG-01', source_system: 'MANUAL',
      }),
      pick: d => [
        ['告警编号', mono(d.alert_id, 28)],
        ['事件类型', d.event_type || '—'],
        ['风险等级', P.badge(d.risk_level)],
        ['处置状态', P.badge(d.status)],
        ['无人机化名', mono(d.uav_pseudonym, 24)],
        ['证据摘要', mono(d.evidence_hash, 32)],
      ],
      absorb: d => { S.alertIdLive = d.alert_id || S.alertIdLive; STORE.note('ALERT', S.alertIdLive); },
    },
    {
      name: '告警状态机流转（OPEN → IDENTIFIED）',
      editHint: '可改：to_status、reason、operator（可试其他合法流转）。alert_id 自动取 ③-1 返回值。',
      why: '把告警推进到「已识别」：告警状态机全程留痕（OPEN → IDENTIFIED → … → RESOLVED），每步流转记录操作者与理由——监管审计的要求落在状态机的每一次迁移上，而不是事后补录。',
      locate: '监管门户「告警管理」→ 选中告警 → 推进状态。',
      witness: null,
      path: '/api/alert/status',
      body: () => ({ alert_id: S.alertIdLive, to_status: 'IDENTIFIED', operator: 'REG-01', reason: '演示说明流程流转' }),
      ready: () => S.alertIdLive ? null : '需先执行上一步「发起一条高危告警」——alert_id 取自其真实返回值',
      pick: d => [
        ['告警编号', mono(d.alert_id, 28)],
        ['当前状态', P.badge(d.status || (d.alert && d.alert.status))],
      ],
    },
    {
      name: '秒级身份追踪（化名 → 真实身份）',
      editHint: '可改：operator。alert_id 自动链式传递。',
      why: '对告警执行身份追踪：从无人机化名逐级回溯到真实身份（entry 入口 → 逐级层级），trace_latency_ms 是实测追踪耗时——目标③「秒级」的直接证据，一个可读的数字，不是形容词。',
      locate: '监管门户「身份追踪」→ 输入告警编号 → 追踪；追踪路径逐级图同屏展示。',
      witness: '「链上浏览器」→「块浏览」→ ChainMaker 监管链 → 最新块，可见身份索引写入交易；追踪每一级的存证可在「链上数据追踪」按业务单号直查。',
      path: '/api/trace/identity',
      body: () => ({ alert_id: S.alertIdLive || S.alertId, operator: 'REG-01' }),
      ready: () => (S.alertIdLive || STORE.get('ALERT')) ? null : '需先执行 ③-1「发起一条高危告警」',
      pick: d => [
        ['追踪到真实身份', d.resolved ? '✓ 已解析' : '✕ 未解析（如实展示）'],
        ['密级破解层级', d.break_level != null ? '第 ' + d.break_level + ' 级' : '—'],
        ['追踪耗时', h('b', { class: 'p-mono dm-lat' }, UI.fmtMs(d.trace_latency_ms))],
        ['追踪入口', mono(d.entry, 30)],
        ['入口类型', d.entry_type || '—'],
        ['化名', mono(d.pseudonym, 24)],
      ],
    },
    {
      name: '申请密文开箱授权（PENDING 授权单 · 最小范围）',
      editHint: '可改：scope（少勾范围会收窄 ③-7 的开箱范围，可对比观察）、reason、target_type/target_id；authorization_id 已含时间戳预填——单号被占用（如 ③-6 改走 REJECT 后重演）可手动换个后缀重新提交。',
      why: '看到身份不等于能看内容——要开箱任务密文载荷，必须先申请授权：指定范围（scope）与目标（target），生成 PENDING 授权单等待审批。这是目标③「密文内容监管」的最小授权前半段：监管者自己被流程管住。',
      locate: '监管门户「授权中心」→ 新建授权申请（scope 勾选 / 目标选择同一字段集）。',
      witness: null,
      path: '/api/authorize/apply',
      body: () => ({
        authorization_id: S.authId, regulator_id: 'REG-01',
        scope: ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY'],
        target_type: 'MISSION', target_id: missionOf(),
        reason: '核查告警 ' + (S.alertIdLive || S.alertId),
      }),
      pick: d => [
        ['授权单号', mono(d.authorization_id, 28)],
        ['状态', P.badge(d.status)],
        ['授权范围', Array.isArray(d.scope) ? d.scope.join('、') : String(d.scope || '—')],
        ['有效期', UI.fmtDT(d.valid_from) + ' ~ ' + UI.fmtDT(d.valid_to)],
      ],
      absorb: d => { S.authIdLive = d.authorization_id || S.authIdLive; STORE.note('AUTHORIZATION', S.authIdLive); },
    },
    {
      name: '未授权直接开箱（按设计拒绝 · 越权开不了箱）',
      editHint: 'authorization_id 故意为错单号 AUTH-NOT-EXIST-WEB——换成 ③-6 已批准的有效单号，本步即变为开箱成功；payload_type、trajectory 可改。',
      why: '故意用一个不存在的授权号 AUTH-NOT-EXIST-WEB 去开箱密文：后端必须拒绝（5002）。这一步演示「密文监管」不是空承诺——监管方自己越权也开不了箱，只返回封缄态信息（掩码值 / 摘要 / 密文状态），明文一个字节都不泄。',
      locate: '监管门户「密文核验」→ 输入任务号 + 授权号 → 核验（填一个错误授权号即可复现本拒绝）；开箱尝试同步记录到「监管审计」。',
      witness: null,
      path: '/api/inspect/ciphertext',
      body: () => ({
        mission_id: missionOf(), authorization_id: 'AUTH-NOT-EXIST-WEB',
        regulator_id: 'REG-01', payload_type: 'CAMERA', trajectory: 'NORMAL',
      }),
      expect: {
        code: 5002,
        why: '授权单不存在或未生效，开箱被拒——这正是本步要演示的「越权开不了箱」。下方封缄态信息如实返回：只有掩码值与摘要，没有明文。完成 ③-6 审批后在 ③-7 用有效授权重演，对比开箱结果。',
      },
      pick: d => [
        ['开箱授权', d.authorized ? '✓ 已授权' : '✕ 被拒（按设计）'],
        ['密文状态', mono(d.sealed && d.sealed.ciphertext_status, 24)],
        ['掩码值', mono(d.sealed && d.sealed.masked_value, 32)],
        ['SM3 摘要', mono(d.sealed && d.sealed.sm3_hash, 32)],
        ['是否存有密文', d.sealed && d.sealed.has_ciphertext != null ? (d.sealed.has_ciphertext ? '是' : '否') : '—'],
      ],
    },
    {
      name: '双签审批通过（授权生效 · 审批事实上链存证）',
      editHint: '可改：comment、reviewer_id；decision 改 REJECT 可演示「拒绝不上链」路径（拒绝后 ③-7 保持门控，需换单号重走 ③-4）。authorization_id 自动取 ③-4 返回值。',
      why: '审批人对该授权单 APPROVE：授权生效、写监管审计记录，且审批事实本身上链存证（返回 chain_tx_id）——目标③的双签闭环：授权开箱的权力，自己也被链上证据管住，事后可追、不可抵赖。',
      locate: '监管门户「授权中心」→ 待审授权单 → 批准；审计记录见「监管审计」。',
      witness: '复制返回的 chain_tx_id → 「链上浏览器」→「直查」→ 链选 ChainMaker 监管链 → 粘贴查询，可见本次审批的原始存证交易。',
      path: '/api/authorize/review',
      body: () => ({ authorization_id: S.authIdLive, decision: 'APPROVE', reviewer_id: 'REG-ADMIN', comment: '同意（演示说明实跑）' }),
      ready: () => S.authIdLive ? null : '需先执行 ③-4「申请密文开箱授权」——authorization_id 取自其真实返回值',
      pick: d => [
        ['授权单状态', P.badge(d.auth && d.auth.status)],
        ['审计记录编号', mono(d.audit && d.audit.audit_id, 28)],
        ['审计动作', (d.audit && d.audit.action) || '—'],
        ['上链存证 TxID', d.chain_tx_id ? mono(d.chain_tx_id, 40) : '—'],
      ],
      absorb: d => {
        const s = String((d.auth && d.auth.status) || '').toUpperCase();
        S.authApproved = s === 'APPROVED' || s === 'ACTIVE';   // 手改 decision=REJECT 时 ③-7 保持门控（如实）
        S.chainTxId = d.chain_tx_id || S.chainTxId;
        if (d.chain_tx_id) STORE.note('CROSS_TX', d.chain_tx_id);
      },
      txOf: d => d.chain_tx_id,
    },
    {
      name: '持有效授权开箱核验（密文内容监管闭环）',
      editHint: '可改：payload_type；trajectory 改 ABNORMAL 可观察核验结论与新触发告警的变化。mission_id / authorization_id 自动链式传递。',
      why: '再用已批准的授权开箱：authorized ✓、返回明文视图 decrypted_view、SM3 摘要比对一致 + SM9 验签通过，并对航线 / 载荷出具核验结论。「未授权开不了箱（③-5）→ 授权后开箱且全程留痕（本步）」——目标③的完整闭环，每次开箱动作都进监管审计。',
      locate: '监管门户「密文核验」→ 输入任务号 + 有效授权号 → 核验开箱。',
      witness: '监管门户「监管审计」：③-5（被拒）与本步（通过）两条开箱记录均可查询、可导出 CSV——开箱动作本身全程留痕。',
      path: '/api/inspect/ciphertext',
      body: () => ({
        mission_id: missionOf(), authorization_id: S.authIdLive,
        regulator_id: 'REG-01', payload_type: 'CAMERA', trajectory: 'NORMAL',
      }),
      ready: () => !S.authIdLive ? '需先执行 ③-4「申请密文开箱授权」'
        : (!S.authApproved ? '需先执行上一步「双签审批通过」——未批准授权开箱将被按设计拒绝' : null),
      pick: d => [
        ['开箱授权', d.authorized ? '✓ 已授权' : '✕（如实展示）'],
        ['SM3 摘要比对', d.verification && d.verification.digest_match ? '✓ 一致' : '—'],
        ['SM9 验签', d.verification && d.verification.signature_valid ? '✓ 通过' : '—'],
        ['航线核验结论', P.badge(d.conclusion && d.conclusion.route_verdict)],
        ['载荷核验结论', P.badge(d.conclusion && d.conclusion.payload_verdict)],
        ['新触发告警', ((d.conclusion && d.conclusion.raised_alerts) || []).join('、') || '无'],
        ['审计记录编号', mono(d.reg_audit_id, 28)],
        ['上链存证 TxID', d.chain_tx_id ? mono(d.chain_tx_id, 40) : '—'],
      ],
      renderExtra: d => (d.decrypted_view
        ? h('div', { class: 'dm-opened' },
          h('div', { class: 'p-field-hint' }, '开箱明文视图 decrypted_view（仅在有效授权下返回）：'),
          UI.jsonBlock(d.decrypted_view, 200))
        : null),
    },
  ];

  /* ================= 三目标注册表（目标原文逐字引用，不改写） ================= */
  const GOALS = [
    {
      key: 'goal1', no: '①',
      tabLabel: '目标① 商密跨链 · 6 步',
      text: '研制支持至少 3 种异构链的基于商密算法的原型跨链系统。',
      how: '演示路径：登记（SM9 身份签发）→ 创建任务（密文落库）→ 提交申请（Fabric→ChainMaker→FISCO 中继）→ 审核回传（FISCO→Fabric）→ 签发许可（第 4 链 IRITA·SM2）→ 拉取跨链台账总验。实际在网 4 条异构链，超额覆盖「至少 3 种」。',
      note: null,
      steps: G1_STEPS,
    },
    {
      key: 'goal2', no: '②',
      tabLabel: '目标② 抗虫洞链下网络 · 8 步',
      text: '研制基于商密算法的能够抵抗虫洞攻击的秒级链下交易网络原型系统。',
      how: '演示路径：开会话（SM9 互认）→ 正常报文（毫秒级基线）→ 注入虫洞 → 攻击态劣化观察 → 风险评估（DETECT）→ 路径切换（秒级恢复）→ 恢复验证 → 撤除攻击。',
      note: '如实说明：链下网络不写任何账本——「秒级」正因免共识才成立。所以本目标没有链上见证点，见证在界面：管理当局门户「链网安全运营」拓扑图的红色虚线虫洞边与 ISOLATED 节点标记、监管门户「监管驾驶舱」的攻防事件统计，都与本页接口同源实时。',
      steps: G2_STEPS,
    },
    {
      key: 'goal3', no: '③',
      tabLabel: '目标③ 秒级追踪与密文监管 · 7 步',
      text: '研制秒级身份追踪及密文内容监管原型系统。',
      how: '演示路径：发起告警（化名）→ 状态流转 → 秒级身份追踪 → 申请开箱授权 → 未授权开箱（按设计拒绝）→ 双签审批上链 → 持授权开箱（闭环）。',
      note: 'mission_id 取值：若已跑过目标①，自动取 ①-2 创建的实跑任务；否则回落演示上下文最近任务，再回落种子任务 MISSION-2026-001——种子任务若无密文记录，接口会如实报错并原样展示，不做假兜底。',
      steps: G3_STEPS,
    },
  ];

  /* ================= 三目标实时证据卡（/api/explorer/goals 实测值） ================= */
  function goalsEvidenceCard() {
    const body = h('div', {}, h('div', { class: 'p-empty' }, '实测证据加载中…'));
    const card = h('section', { class: 'p-card' },
      h('h3', { class: 'p-card-title' }, '三目标实时证据（/api/explorer/goals 实测，非静态文案）'),
      body);
    API.call('/api/explorer/goals', {}).then(r => {
      body.innerHTML = '';
      if (!r.ok) { body.append(P.errCard(r)); return; }
      const g1 = r.data && r.data.goal1 || {}, g2 = r.data && r.data.goal2 || {}, g3 = r.data && r.data.goal3 || {};
      body.append(P.statCards([
        {
          label: '目标① 异构链在网',
          value: g1.chains_online != null ? g1.chains_online + ' / ' + g1.chains_total : '—',
          sub: '跨链交易 ' + (g1.crosschain_total != null ? g1.crosschain_total : '—') + ' 笔 · 验签通过率 '
            + (g1.verify_pass_rate_pct != null ? g1.verify_pass_rate_pct + '%' : '—'),
          tone: (g1.chains_online != null && g1.chains_online === g1.chains_total) ? 'good' : 'warning',
        },
        {
          label: '目标② 消息时延（中位）',
          value: UI.fmtMs(g2.message_latency_median_ms),
          sub: '消息 ' + (g2.messages_total != null ? g2.messages_total : '—') + ' 条 · 虫洞事件 '
            + (g2.wormhole_events_total != null ? g2.wormhole_events_total : '—') + ' 次',
        },
        {
          label: '目标② 恢复时延（中位）',
          value: UI.fmtMs(g2.recovery_latency_median_ms),
          sub: '链下会话 ' + (g2.sessions_total != null ? g2.sessions_total : '—') + ' 个',
        },
        {
          label: '目标③ 身份追踪',
          value: (g3.trace_total != null ? g3.trace_total : '—') + ' 次',
          sub: '告警 ' + (g3.alerts_total != null ? g3.alerts_total : '—') + ' · 授权 '
            + (g3.auth_total != null ? g3.auth_total : '—') + ' · 开箱 ' + (g3.inspect_total != null ? g3.inspect_total : '—'),
        },
      ]));
    });
    return card;
  }

  /* ================= 目标分节渲染 ================= */
  function renderSection(g, box) {
    box.append(h('section', { class: 'p-card dm-goal' },
      h('div', { class: 'dm-goal-no' }, '目标 ' + g.no),
      h('blockquote', { class: 'dm-goal-text' }, g.text),
      h('p', { class: 'dm-goal-how' }, g.how),
      g.note ? h('p', { class: 'dm-goal-note' }, g.note) : null));
    g.steps.forEach((st, i) => box.append(stepCard(g.no + '-' + (i + 1), st)));
  }

  /* ================= 页面入口 ================= */
  let HOST = null;

  function render(host) {
    initState();
    HOST = host;
    REFR = [];
    host.innerHTML = '';                        // route() 已清一次；「重置本页演示单号」复调本函数时同样零残留

    function resetDemo() {
      S.TS = null;
      initState();
      render(HOST);                             // 全页重渲：新单号族 + 全部门控复位
      UI.toast('已重置本页演示单号（新后缀 ' + S.TS + '）——未触碰任何链上/库内既有数据', 'ok');
    }

    host.append(P.pageHead({
      title: '演示说明 · 立项三目标实跑流程',
      sub: '本页每一步都调用真实后端接口，真实写库、真实上链（无 mock、无沙箱）。请按编号顺序执行——单号自动从上一步的真实返回值链式传递，前置缺口会如实禁用按钮并说明。请求体可在第二块直接编辑（改坏可一键恢复默认），原始响应全部可展开核查。',
      actions: [h('button', {
        class: 'p-btn p-btn-ghost', onClick: resetDemo,
        title: '重新生成本页全套演示单号（UAV/ALERT/AUTH 后缀）——仅换号，不清库、不触碰链上数据；库内演练残留请到「总览 → 演示维护」复位',
      }, '重置本页演示单号')],
    }));
    host.append(goalsEvidenceCard());
    host.append(P.tabs(GOALS.map(g => ({
      key: g.key, label: g.tabLabel, render: box => renderSection(g, box),
    }))));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.demo = { render };
})();
