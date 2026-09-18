/* act3.js —— 幕三 · 系统三：监管穿透核查与密文合规。
   覆盖告警/追踪/授权/核查/监管审计/审计/密码学 7 组端点：alert/raise·status·list、
   trace/identity、authorize/apply·review、inspect/ciphertext、regulatory/audit/list、
   audit/query·export、crypto/sm3·sm9/keygen·sm9/sign·sm9/verify。 */
(function () {
  'use strict';
  const { h, card, statusBadge, chainTag, table, kv, metaLine, toast, toastResult, asyncBtn,
          readForm, field, fieldSelect, jsonBlock, trunc, cxFlow, esc } = UI;
  const call = API.call;

  const TS = UI.tsSuffix();
  const S = { alertId: 'ALERT-WEB-' + TS, authId: 'AUTH-WEB-' + TS, missionId: 'MISSION-2026-001' };

  function run(box, path, body, render, opts) {
    opts = opts || {};
    box.innerHTML = '';
    box.append(h('div', { class: 'small muted' }, '⏳ POST ' + path + ' …'));
    return call(path, body).then(r => {
      box.innerHTML = '';
      box.append(h('div', { class: 'small muted mb8' },
        h('b', {}, 'POST ' + path), ' · 请求 ', h('code', { class: 'mono' }, JSON.stringify(body).slice(0, 150))));
      box.append(metaLine(r));
      if (!r.ok && !(opts.expectCode && r.code === opts.expectCode))
        box.append(h('div', { class: 'callout danger mt8' }, 'code=' + r.code + ' · ' + r.message));
      // data 为 null（多数业务错误）时跳过自定义渲染，只展示错误横幅 + 原始 JSON
      if (render && r.data != null) { const v = render(r.data, r); if (v) box.append(v); }
      box.append(h('details', { class: 'mt8' }, h('summary', { class: 'small muted' }, '原始响应 JSON'), jsonBlock(r.raw)));
      return r;
    });
  }

  /* ---- 七级追踪时间线 ---- */
  const SRC_CLS = { CHAINMAKER_INDEX: 'src-chainmaker', FABRIC_DETAIL: 'src-fabric', FISCO_BCOS_DETAIL: 'src-fisco' };
  const SRC_CHAIN = { CHAINMAKER_INDEX: 'chainmaker', FABRIC_DETAIL: 'fabric', FISCO_BCOS_DETAIL: 'fisco-bcos' };
  function traceTimeline(d) {
    const items = (d.levels || []).map(lv => h('div', { class: 'trace-item ' + (SRC_CLS[lv.source] || '') },
      h('div', { class: 'trace-lv' }, lv.status === 'RESOLVED' ? String(lv.level) : '✕'),
      h('div', { class: 'trace-name' }, lv.name.replace(/_/g, ' ')),
      h('div', { class: 'trace-val mono' }, lv.value),
      h('div', { class: 'trace-src' }, chainTag(SRC_CHAIN[lv.source] || ''), statusBadge(lv.status)),
      h('div', { class: 'trace-ms' }, lv.latency_ms + 'ms')));
    return h('div', { class: 'trace-line' }, items);
  }

  function render(root) {
    root.append(h('div', { class: 'page-head' },
      h('h1', {}, '幕三 · 系统三：监管穿透核查与密文合规'),
      h('p', {}, '监管方收到告警后：七级跨链追踪锁定真实身份（伪名→设备地址→许可→SM9→无人机→运营方→厂商），' +
        '但任务载荷密文未经核验授权不可解 —— 申请授权、双签审批后开箱核验，全程审计上链（ChainMaker 监管链存证）。'),
      h('div', { class: 'flow-steps', id: 'act3-flow' })));
    const flowNames = ['告警登记', '状态流转', '七级追踪', '授权申请', '封缄拒绝 5002', '授权批准', '开箱核验', '偏航复测', '审计流水', 'CSV 导出'];
    const flowBar = root.querySelector('#act3-flow');
    flowNames.forEach((n, i) => flowBar.append(h('span', { class: 'flow-step', 'data-i': i }, (i + 1) + '. ' + n)));
    const markFlow = (i, cls) => { const el = flowBar.querySelector('[data-i="' + i + '"]'); if (el) el.className = 'flow-step ' + cls; };

    const out = {};
    function sec(id, title, sub, ...body) {
      const box = h('div', { class: 'mt8' });
      out[id] = box;
      root.append(card(title, sub, ...body, box));
      return box;
    }

    /* ===== 一键幕三 ===== */
    const runCard = card(null, null, h('div', { class: 'row' },
      asyncBtn('▶ 一键实跑幕三监管剧本', runAll, 'btn-primary'),
      h('span', { class: 'small muted' }, '默认目标为演示种子任务 MISSION-2026-001（幕一产生；若已 demo/reset 请先跑幕一）。自动执行 13 步（含 2 个理论失败步：未授权核查必被 5002 封缄拒绝、篡改载荷后验签必 valid=false），约 8 秒。监控台逐步展示每次调用的 API / 参数 / 返回 / 延迟，并附成功/失败解说。')));
    root.append(runCard);

    /* ===== ① 告警 ===== */
    const aForm = h('div', { class: 'form-grid' },
      field('alertId', '告警ID alert_id（留空自动生成）', { value: S.alertId }),
      fieldSelect('eventType', '事件类型 event_type', ['ROUTE_DEVIATION', 'ALTITUDE_VIOLATION', 'ZONE_INTRUSION', 'IDENTITY_MISMATCH', 'PAYLOAD_ANOMALY'], 'ROUTE_DEVIATION'),
      fieldSelect('riskLevel', '等级 risk_level', ['HIGH', 'MEDIUM', 'LOW'], 'HIGH'),
      field('uavPseudonym', '无人机伪名 uav_pseudonym', { value: 'PSEUDO-UAV-83921' }),
      field('missionId', '任务 mission_id', { value: S.missionId }),
      field('operator', '操作人 operator', { value: 'REG-01' }));
    sec('alert', '① 告警登记与状态机', 'source_system 合法枚举 MANUAL/SYSTEM1/SYSTEM2/SYSTEM3；状态机 OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED（alert/status 逐级流转）。同 mission+event_type 的未结案告警会去重复用（raiseAutoAlert），手工 raise 指定 alert_id 则新建。',
      aForm,
      h('div', { class: 'btn-row' },
        asyncBtn('登记告警 alert/raise', () => {
          const f = readForm(aForm);
          S.alertId = f.alertId; S.missionId = f.missionId;
          return run(out.alert, '/api/alert/raise', {
            alert_id: f.alertId, event_type: f.eventType, risk_level: f.riskLevel,
            uav_pseudonym: f.uavPseudonym, mission_id: f.missionId, operator: f.operator, source_system: 'MANUAL',
          }, d => { markFlow(0, 'done'); return alertRow(d); });
        }, 'btn-primary'),
        asyncBtn('告警台账 alert/list', () => run(out.alert, '/api/alert/list', { page: 1, page_size: 10 }, d =>
          table([{ title: 'alert_id', render: r => h('code', { class: 'mono' }, trunc(r.alert_id, 22)) },
            { title: '类型', key: 'event_type' },
            { title: '等级', render: r => statusBadge(r.risk_level) },
            { title: '状态', render: r => statusBadge(r.status) },
            { title: '伪名', render: r => h('code', { class: 'mono' }, r.uav_pseudonym || '—') },
            { title: '来源', key: 'source_system' },
            { title: '时间', render: r => h('span', { class: 'small' }, r.created_at) }], d.records || [])))));
    const stForm = h('div', { class: 'form-grid' },
      fieldSelect('toStatus', '目标状态 to_status', ['IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED'], 'IDENTIFIED'),
      field('reason', '理由 reason', { value: '网页演示流转' }));
    const stBtn = asyncBtn('流转状态', () => {
      const f = readForm(stForm);
      return run(out.alert, '/api/alert/status', { alert_id: S.alertId, to_status: f.toStatus, operator: 'REG-01', reason: f.reason }, d => {
        if (f.toStatus === 'IDENTIFIED') markFlow(1, 'done');
        return alertRow(d);
      });
    });
    root.append(card('告警状态流转 alert/status', null, stForm, h('div', { class: 'btn-row' }, stBtn)));
    function alertRow(a) {
      return kv([['告警', h('code', {}, a.alert_id)], ['类型', a.event_type], ['等级', statusBadge(a.risk_level)],
        ['状态', statusBadge(a.status)], ['伪名', h('code', {}, a.uav_pseudonym || '—')],
        ['证据 SM3', h('code', { class: 'mono' }, trunc(a.evidence_hash, 40))]]);
    }

    /* ===== ② 追踪 ===== */
    const tForm = h('div', { class: 'form-grid' },
      field('traceAlert', '入口 alert_id（也接受伪名/许可/SM9/UAV 等任意一级标识）', { value: S.alertId }),
      field('traceOp', '操作人 operator', { value: 'REG-01' }));
    sec('trace', '② 七级跨链身份追踪', 'trace/identity 从告警逐级解链：监管链索引（1-4 级：伪名→设备地址→许可→SM9）→ 运营链明细（5-6 级：无人机→运营方）→ 管理链明细（7 级：厂商）。层级圆点色 = 数据来源链（图例同全局链色），全部 RESOLVED 且 break_level=0 才算完整穿透。',
      tForm,
      h('div', { class: 'btn-row' },
        asyncBtn('执行追踪 trace/identity', () => {
          const f = readForm(tForm);
          return run(out.trace, '/api/trace/identity', { alert_id: f.traceAlert || S.alertId, operator: f.traceOp }, d => {
            markFlow(2, d.resolved ? 'done' : 'current');
            return h('div', {},
              h('div', { class: 'row mb8' },
                h('span', { class: 'small muted' }, '入口 ', h('code', {}, d.entry), '（' + d.entry_type + '）· 伪名 ', h('code', {}, d.pseudonym || '—')),
                d.resolved ? h('span', { class: 'badge good' }, '✓ 完整穿透 resolved') : h('span', { class: 'badge critical' }, '✕ 第 ' + d.break_level + ' 级断链'),
                h('span', { class: 'small muted' }, '⏱ ' + d.trace_latency_ms + 'ms')),
              traceTimeline(d));
          });
        }, 'btn-primary')));

    /* ===== ③ 授权 ===== */
    const scopeChecks = ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY'].map(s =>
      h('label', { class: 'row', style: { gap: '4px', fontSize: '13px' } },
        h('input', { type: 'checkbox', checked: true, 'data-scope': s }), s));
    const zForm = h('div', { class: 'form-grid' },
      field('authId', '授权单 authorization_id', { value: S.authId }),
      field('regulator', '监管方 regulator_id', { value: 'REG-01' }),
      fieldSelect('targetType', '目标类型 target_type', ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY'], 'MISSION'),
      field('targetId', '目标 target_id', { value: S.missionId }),
      field('zReason', '申请理由 reason', { value: '核查告警 ' + S.alertId }));
    sec('auth', '③ 核验授权（申请 → 双签审批）', 'authorize/apply 生成 PENDING 授权单；authorize/review 由审批人 APPROVE/REJECT，批准后写监管审计并上链存证（chain_tx_id）。scope 限定开箱范围。',
      zForm,
      h('div', { class: 'row', style: { gap: '14px', marginBottom: '10px' } },
        h('span', { class: 'small muted' }, '授权范围 scope：'), ...scopeChecks),
      h('div', { class: 'btn-row' },
        asyncBtn('提交申请 authorize/apply', () => {
          const f = readForm(zForm);
          const scope = scopeChecks.map(el => el.firstChild.checked ? el.firstChild.dataset.scope : null).filter(Boolean);
          S.authId = f.authId;
          return run(out.auth, '/api/authorize/apply', {
            authorization_id: f.authId, regulator_id: f.regulator, scope,
            target_type: f.targetType, target_id: f.targetId, reason: f.zReason,
          }, d => { markFlow(3, 'done'); return authRow(d); });
        }, 'btn-primary'),
        asyncBtn('批准 authorize/review APPROVE', () => run(out.auth, '/api/authorize/review',
          { authorization_id: S.authId, decision: 'APPROVE', reviewer_id: 'REG-ADMIN', comment: '同意（网页演示）' }, d => {
            markFlow(5, 'done');
            return h('div', {}, authRow(d.auth),
              h('div', { class: 'small muted mt8' }, '监管审计 ', h('code', {}, d.audit.audit_id), ' · 动作 ', d.audit.action,
                ' · 存证链上交易：'),
              h('div', { class: 'small mono mt8' }, '🔗 ', trunc(d.chain_tx_id, 60)));
          })),
        asyncBtn('拒绝 authorize/review REJECT', () => run(out.auth, '/api/authorize/review',
          { authorization_id: S.authId, decision: 'REJECT', reviewer_id: 'REG-ADMIN', comment: '不同意（演示分支）' }, d => authRow(d.auth)), 'btn-danger')));
    function authRow(a) {
      return kv([['授权单', h('code', {}, a.authorization_id)], ['状态', statusBadge(a.status)],
        ['监管方', a.regulator_id], ['目标', a.target_type + ' / ' + a.target_id],
        ['范围', (typeof a.scope === 'string' ? JSON.parse(a.scope) : a.scope).join('、')],
        ['有效期', a.valid_from + ' ~ ' + a.valid_to]]);
    }

    /* ===== ④ 核查 ===== */
    const iForm = h('div', { class: 'form-grid' },
      field('iMission', 'mission_id', { value: S.missionId }),
      field('iAuth', 'authorization_id（未授权演示可清空）', { value: S.authId }),
      field('iReg', 'regulator_id', { value: 'REG-01' }),
      fieldSelect('iPayload', '载荷 payload_type', ['CAMERA', 'LIDAR', 'MULTISPECTRAL', 'CARGO'], 'CAMERA'),
      fieldSelect('iTraj', '航迹 trajectory', ['NORMAL', 'DEVIATION'], 'NORMAL'));
    sec('insp', '④ 密文开箱核查 inspect/ciphertext', '无有效 AUTHORIZED 授权 → code=5002，只返回封缄元数据（密文状态/SM3/掩码），这是隐私保护的刻意设计而非故障；授权后开箱返回明文视图 + SM3 摘要比对 + SM9 验签 + 航路/载荷结论，偏航自动触发告警（去重复用）。',
      iForm,
      h('div', { class: 'btn-row' },
        asyncBtn('🔒 未授权核查（预期 5002 封缄卡）', () => {
          const f = readForm(iForm);
          return run(out.insp, '/api/inspect/ciphertext', {
            mission_id: f.iMission, authorization_id: 'AUTH-NOT-EXIST-WEB', regulator_id: f.iReg,
            payload_type: f.iPayload, trajectory: f.iTraj,
          }, d => sealedCard(d), { expectCode: 5002 });
        }, 'btn-danger'),
        asyncBtn('🔓 授权后核查', () => {
          const f = readForm(iForm);
          return run(out.insp, '/api/inspect/ciphertext', {
            mission_id: f.iMission, authorization_id: f.iAuth || S.authId, regulator_id: f.iReg,
            payload_type: f.iPayload, trajectory: f.iTraj,
          }, d => {
            markFlow(f.iTraj === 'DEVIATION' ? 7 : 6, 'done');
            return openedCard(d);
          });
        }, 'btn-primary'),
        asyncBtn('⚠ 偏航复测 trajectory=DEVIATION', () => {
          const f = readForm(iForm);
          return run(out.insp, '/api/inspect/ciphertext', {
            mission_id: f.iMission, authorization_id: f.iAuth || S.authId, regulator_id: f.iReg,
            payload_type: f.iPayload, trajectory: 'DEVIATION',
          }, d => { markFlow(7, 'done'); return openedCard(d); });
        }, 'btn-danger')));
    function sealedCard(d) {
      const s = d.sealed || {};
      markFlow(4, 'done');
      return h('div', { class: 'sealed-card mt8' },
        h('div', { class: 'sc-head' }, '🔒 SEALED · code=5002 未授权拒绝开箱（隐私保护设计）'),
        h('div', { class: 'masked-view' }, s.masked_value || '****'),
        kv([['任务', s.mission_id], ['密文状态', statusBadge(s.ciphertext_status)],
          ['SM3 摘要（可验证不可读）', h('code', { class: 'mono' }, trunc(s.sm3_hash, 48))],
          ['密文在库', s.has_ciphertext ? '✓ 是' : '✕ 否'],
          ['authorized', String(d.authorized)]]),
        h('div', { class: 'small muted mt8' }, '→ 走「③ 核验授权」拿到 AUTHORIZED 授权单后再开箱。'));
    }
    function openedCard(d) {
      const v = d.verification || {}, c = d.conclusion || {};
      return h('div', {},
        h('div', { class: 'opened-card mt8' },
          h('div', { class: 'sc-head' }, '🔓 OPENED · authorized=true 授权开箱'),
          h('div', { class: 'plain-view' }, '明文视图：' + (d.decrypted_view || '—')),
          kv([['密文状态', statusBadge((d.sealed || {}).ciphertext_status)],
            ['授权范围', (d.scope || []).join('、')],
            ['SM3 摘要比对', v.digest_match ? h('span', { class: 'badge good' }, '✓ digest_match') : h('span', { class: 'badge critical' }, '✕ 不匹配')],
            ['SM9 验签', v.signature_valid ? h('span', { class: 'badge good' }, '✓ signature_valid') : h('span', { class: 'badge critical' }, '✕ 无效')],
            ['航路结论', statusBadge(c.route_verdict)], ['载荷结论', statusBadge(c.payload_verdict)],
            ['触发告警', (c.raised_alerts || []).length ? c.raised_alerts.map(x => h('code', {}, x)) : '（无）'],
            ['监管审计', h('code', {}, d.reg_audit_id || '—')]]),
          h('div', { class: 'small muted mt8' }, '🔗 核查动作存证链上交易：'),
          h('div', { class: 'small mono' }, trunc(d.chain_tx_id, 64))),
        d.mission ? h('details', { class: 'mt8' }, h('summary', { class: 'small muted' }, '任务全文（含掩码字段）'),
          kv([['任务', d.mission.mission_id + ' · ' + d.mission.mission_type],
            ['运营方/无人机', d.mission.operator_id + ' / ' + d.mission.uav_id],
            ['航段', d.mission.route_segments], ['高度', d.mission.altitude_min + '-' + d.mission.altitude_max + 'm'],
            ['掩码值', h('span', { class: 'masked-view', style: { display: 'inline-block', padding: '2px 8px' } }, d.mission.masked_value)],
            ['SM9 身份', h('code', {}, d.mission.sm9_identity)]])) : null);
    }

    /* ===== ⑤ 审计 ===== */
    const gForm = h('div', { class: 'form-grid' },
      fieldSelect('gAction', '动作过滤 action（留空=全部）', [['', '（全部）'], 'INSPECT', 'AUTH_APPROVE', 'AUTH_REJECT', 'ALERT_RAISE', 'TRACE'], ''),
      fieldSelect('qType', 'audit/query 过滤维度', ['business_id', 'action', 'actor'], 'business_id'),
      field('qVal', '取值 value', { value: S.missionId }));
    sec('audit', '⑤ 监管审计流水与导出', 'regulatory/audit/list 按动作过滤监管审计台账（每条含 audit_hash 链式哈希 + chain_tx_id 链上存证）；regulatory/audit/export 导出台账 CSV；audit/query / audit/export 面向通用审计日志（trace 级流水，维度 business_id/action/actor）。CSV 均触发浏览器直接下载。',
      gForm,
      h('div', { class: 'btn-row' },
        asyncBtn('审计台账 regulatory/audit/list', () => {
          const f = readForm(gForm);
          const body = f.gAction ? { action: f.gAction } : {};
          return run(out.audit, '/api/regulatory/audit/list', body, d => {
            markFlow(8, 'done');
            return table([{ title: 'audit_id', render: r => h('code', { class: 'mono' }, trunc(r.audit_id, 18)) },
              { title: '动作', key: 'action' },
              { title: '操作人', key: 'operator_id' },
              { title: '目标', render: r => h('span', { class: 'small mono' }, trunc(r.target, 26)) },
              { title: 'audit_hash', render: r => h('code', { class: 'mono' }, trunc(r.audit_hash, 20)) },
              { title: '🔗 chain_tx_id', render: r => h('code', { class: 'mono' }, trunc(r.chain_tx_id, 24)) },
              { title: '时间', render: r => h('span', { class: 'small' }, r.created_at) }], d.records || []);
          });
        }, 'btn-primary'),
        asyncBtn('导出 CSV regulatory/audit/export', () => run(out.audit, '/api/regulatory/audit/export', {}, d => {
          markFlow(9, 'done');
          downloadText('skytrust-regulatory-audit.csv', d.content, 'text/csv');
          return h('div', {},
            h('div', { class: 'callout' }, '已触发浏览器下载（format=' + d.format + '，rows=' + d.rows + '）。'),
            h('pre', { class: 'json-block', style: { maxHeight: '180px' } }, d.content));
        })),
        asyncBtn('通用审计导出 audit/export', () => run(out.audit, '/api/audit/export', {}, d => {
          downloadText('skytrust-audit-log.csv', d.content, 'text/csv');
          return h('div', {},
            h('div', { class: 'callout' }, '已触发浏览器下载（trace 级通用审计流水，format=' + d.format + '，rows=' + d.rows + '）。'),
            h('pre', { class: 'json-block', style: { maxHeight: '180px' } }, d.content));
        })),
        asyncBtn('按维度检索 audit/query', () => {
          const f = readForm(gForm);
          const body = {}; body[f.qType || 'mission_id'] = f.qVal || S.missionId;
          return run(out.audit, '/api/audit/query', body, d => jsonBlock(d));
        })));

    /* ===== ⑥ 国密工具箱 ===== */
    const cPayload = h('textarea', { 'data-field': 'payload', rows: 4, spellcheck: false,
      style: { width: '100%', fontFamily: 'var(--mono, monospace)', fontSize: '12.5px' } },
      '{"mission_id":"MISSION-2026-001","operator_id":"Operator-A","altitude_max":120}');
    const cForm = h('div', { class: 'form-grid' },
      field('entityId', 'entity_id（keygen/sign/verify）', { value: 'UAV-WEB-' + TS }),
      field('sm9Id', 'sm9_identity（sign/verify）', { value: 'SM9-ID-UAV-A-001' }),
      field('signature', 'signature（verify，粘贴 sign 输出）', { value: '' }));
    sec('crypto', '⑥ 国密算法工具箱', 'SM3 杂凑 / SM9 标识密码（keygen → sign → verify 全链路自证）。payload 为 JSON 对象，sign 输出 signature 可粘回 verify 校验；篡改 payload 或 signature 则验签失败。',
      h('div', { class: 'field' }, h('label', {}, 'payload（JSON）'), cPayload), cForm,
      h('div', { class: 'btn-row' },
        asyncBtn('SM3 摘要 crypto/sm3', () => run(out.crypto, '/api/crypto/sm3', { payload: parsePayload(cPayload) }, d =>
          kv([['SM3', h('code', { class: 'mono' }, d.sm3_hash || d.hash || JSON.stringify(d))]]))),
        asyncBtn('SM9 生成密钥 crypto/sm9/keygen', () => run(out.crypto, '/api/crypto/sm9/keygen', { entity_id: readForm(cForm).entityId }, d =>
          kv([['SM9 身份', h('code', {}, d.sm9_identity)], ['（私钥仅服务端持有，不回传 —— 符合密钥托管设计）', '']]))),
        asyncBtn('SM9 签名 crypto/sm9/sign', () => run(out.crypto, '/api/crypto/sm9/sign',
          { payload: parsePayload(cPayload), sm9_identity: readForm(cForm).sm9Id }, d => {
            const sig = d.signature || '';
            const sigIn = cForm.querySelector('[data-field="signature"]');
            if (sig && sigIn) sigIn.value = sig;
            return kv([['签名', h('code', { class: 'mono' }, trunc(sig, 64))], ['（已自动填入下方 signature 输入框，可直接验签）', '']]);
          })),
        asyncBtn('SM9 验签 crypto/sm9/verify', () => run(out.crypto, '/api/crypto/sm9/verify',
          { payload: parsePayload(cPayload), signature: readForm(cForm).signature, sm9_identity: readForm(cForm).sm9Id }, d =>
          kv([['验签结果', d.valid ? h('span', { class: 'badge good' }, '✓ valid=true') : h('span', { class: 'badge critical' }, '✕ valid=false')],
            ['身份', h('code', {}, d.sm9_identity || readForm(cForm).sm9Id)]])))));
    function parsePayload(ta) {
      try { return JSON.parse(ta.value); } catch (_) { toast('payload 不是合法 JSON', 'err'); throw new Error('bad payload'); }
    }

    function downloadText(name, text, mime) {
      const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.append(a); a.click(); a.remove();
    }

    /* ===== 一键剧本（runMonitor 可视化 + 理论失败步：预期拒绝按「◈ 按设计」展示并附解说） ===== */
    const RUN_STEPS = [
      { fi: 0, sec: 'alert', i: 0, name: '告警登记（匿名化：伪名+证据摘要）', api: 'alert/raise' },
      { fi: 1, el: () => stBtn, name: '状态流转 OPEN→IDENTIFIED', api: 'alert/status' },
      { fi: 1, sec: 'alert', i: 1, name: '告警台账确认', api: 'alert/list' },
      { fi: 2, sec: 'trace', i: 0, name: '七级跨链身份追踪', api: 'trace/identity' },
      { fi: 3, sec: 'auth', i: 0, name: '核验授权申请（scope 最小化）', api: 'authorize/apply' },
      { fi: 4, sec: 'insp', i: 0, name: '未授权核查（理论失败：封缄拒绝 5002）', api: 'inspect/ciphertext',
        expectCode: 5002 },
      { fi: 5, sec: 'auth', i: 1, name: '授权批准（双签 + 链上存证）', api: 'authorize/review' },
      { fi: 6, sec: 'insp', i: 1, name: '开箱核验 trajectory=NORMAL（应 ROUTE_OK）', api: 'inspect/ciphertext',
        expectFn: d => d && d.authorized === true && d.conclusion && d.conclusion.route_verdict === 'ROUTE_OK' },
      { fi: 7, sec: 'insp', i: 2, name: '偏航复测 trajectory=DEVIATION（应 ROUTE_DEVIATION + 自动告警）', api: 'inspect/ciphertext',
        expectFn: d => d && d.conclusion && d.conclusion.route_verdict === 'ROUTE_DEVIATION' },
      { fi: 8, sec: 'audit', i: 0, name: '监管审计台账', api: 'regulatory/audit/list' },
      { fi: 9, sec: 'audit', i: 1, name: '监管审计 CSV 导出', api: 'regulatory/audit/export' },
      { fi: 10, sec: 'crypto', i: 2, name: 'SM9 签名（取得有效签名自动回填）', api: 'crypto/sm9/sign' },
      { fi: 10, sec: 'crypto', i: 3, name: '篡改载荷后验签（理论失败：必须 valid=false）', api: 'crypto/sm9/verify',
        expectData: { valid: false },
        pre: () => {
          try {
            const o = JSON.parse(cPayload.value);
            o.altitude_max = (Number(o.altitude_max) || 120) + 879;   // 篡改一个字段
            cPayload.value = JSON.stringify(o);
          } catch (_) { cPayload.value = '{"mission_id":"MISSION-2026-001","tampered":true}'; }
        },
        whyOk: '签名与载荷强绑定：篡改 altitude_max 后验签必须失败——valid=false 是「理论失败」的数据化表达（恒 code=0；畸形签名才是 1002）。' },
    ];
    async function runAll() {
      /* 前置自检：幕三全程以幕一产生的种子任务 MISSION-2026-001 为核查对象
         （demo/init 不落库任务；demo/reset 后必须先跑幕一）。缺失则明确提示，
         避免 13 步连环失败刷屏。 */
      const preM = await call('/api/mission/query', { mission_id: S.missionId });
      if (!preM.ok) {
        toast('未找到演示种子任务 ' + S.missionId + '（code=' + preM.code + '）——请先跑「一键实跑幕一」或用总控「一键跑通三幕全流程」，再回来跑幕三', 'err', 9000);
        window.SKYTRUST_RUN = { active: false, act: 'act3', aborted: 'missing-seed-mission' };  // 别让三幕总控空等 240s
        return;
      }
      /* 只盯被点的那个按钮：一键实跑按钮自身在整个 runAll 期间保持 disabled，
         全局轮询 .btn:disabled 会永远命中它，导致每步空等 25s 超时。 */
      const wait = (btn) => new Promise(res => {
        const t = setInterval(() => { if (!btn.disabled) { clearInterval(t); setTimeout(res, 150); } }, 80);
        setTimeout(() => { clearInterval(t); res(); }, 25000);
      });
      const mon = UI.runMonitor(RUN_STEPS, { title: '▶ 幕三实跑监控台' });
      runCard.after(mon.el);
      mon.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.SKYTRUST_RUN = { active: true, act: 'act3' };
      try {
        for (let i = 0; i < RUN_STEPS.length; i++) {
          const st = RUN_STEPS[i];
          mon.begin(i);
          if (st.pre) st.pre();
          const btn = st.el ? st.el() : out[st.sec].parentElement.querySelectorAll('.btn-row .btn')[st.i];
          btn.click();
          await wait(btn);
          mon.end(i);
        }
        toast('幕三监管剧本实跑完毕（告警 ' + S.alertId + ' · 授权 ' + S.authId + '）', 'ok', 6000);
      } finally {
        mon.finish([h('span', { class: 'small muted' }, '告警 ', h('code', {}, S.alertId), ' · 授权 ', h('code', {}, S.authId))]);
        window.SKYTRUST_RUN = { active: false, act: 'act3' };
      }
    }
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.act3 = { render };
})();
