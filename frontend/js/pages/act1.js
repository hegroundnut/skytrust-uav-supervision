/* act1.js —— 幕一 · 系统一：任务跨域协同（主数据 → 注册存证 → 任务申请/审核 →
   冲突检测消解 → 通行许可 → 跨链盘点）。覆盖主数据/无人机/任务/审核/冲突/许可/跨链 7 组 27 端点。 */
(function () {
  'use strict';
  const { h, card, statusBadge, chainTag, table, kv, metaLine, toast, toastResult,
          asyncBtn, readForm, field, fieldSelect, cxFlow, jsonBlock, trunc, datetimeLocal, tsSuffix } = UI;
  const call = API.call;

  const S = {}; // 页面级链式状态（ID 传递）

  /* 通用执行器：调 API → 结果区渲染 meta + 自定义视图 + 折叠 JSON */
  function run(box, path, body, render) {
    box.innerHTML = '';
    box.append(h('div', { class: 'small muted' }, '⏳ POST ' + path + ' …'));
    return call(path, body).then(r => {
      box.innerHTML = '';
      box.append(h('div', { class: 'small muted mb8' },
        h('b', {}, 'POST ' + path), ' · 请求 ', h('code', { class: 'mono' }, JSON.stringify(body).slice(0, 120))));
      box.append(metaLine(r));
      if (!r.ok && r.code !== 5002) box.append(h('div', { class: 'callout danger mt8' }, 'code=' + r.code + ' · ' + r.message));
      if (r.ok && render) { const v = render(r.data, r); if (v) box.append(v); }
      box.append(h('details', { class: 'mt8' }, h('summary', { class: 'small muted' }, '原始响应 JSON'), jsonBlock(r.raw)));
      return r;
    });
  }

  function listTable(recs, cols) {
    if (!recs || !recs.length) return h('div', { class: 'empty-hint' }, '（空）');
    return table(cols, recs);
  }

  function render(root) {
    const TS = S.ts = tsSuffix();
    S.uavId = 'UAV-WEB-' + TS;

    root.append(h('div', { class: 'page-head' },
      h('h1', {}, '幕一 · 系统一：任务跨域协同'),
      h('p', {}, '运营商在 Fabric 运营链提交任务申请，经 ChainMaker 监管链两跳中继，由 FISCO BCOS 管理链完成审核与许可签发；' +
        '航段冲突由策略引擎检测与协调。每步业务动作同步产生「两跳四段」跨链存证。'),
      h('div', { class: 'flow-steps', id: 'act1-flow' })));

    const flowNames = ['主数据', '无人机注册', '任务A申请', '审核A', '任务B冲突', '审核B', '许可签发', '吊销验证', '跨链盘点'];
    const flowBar = root.querySelector('#act1-flow');
    flowNames.forEach((n, i) => flowBar.append(h('span', { class: 'flow-step', 'data-i': i }, (i + 1) + '. ' + n)));
    function markFlow(i, cls) {
      const el = flowBar.querySelector('[data-i="' + i + '"]');
      if (el) el.className = 'flow-step ' + cls;
    }

    /* ---------- 一键幕一 ---------- */
    root.append(card(null, null, h('div', { class: 'row' },
      asyncBtn('▶ 一键实跑幕一全流程', runAll, 'btn-primary'),
      h('span', { class: 'small muted' }, '按报告剧本顺序自动执行：注册无人机 UAV-WEB-' + TS + ' → 任务A申请审核 → 任务B冲突消解 → 许可签发/吊销 → 盘点（约 8 秒，含 6 次真实跨链）'))));

    const out = {};
    function sec(id, title, sub, ...body) {
      const box = h('div', { class: 'mt8' });
      out[id] = box;
      root.append(card(title, sub, ...body, box));
      return box;
    }

    /* ===== 1. 主数据 ===== */
    const mdBtns = h('div', { class: 'btn-row' },
      asyncBtn('运营商列表 operator/list', () => run(out.md, '/api/operator/list', {}, d =>
        listTable(d.records, [
          { title: 'ID', key: 'operator_id' }, { title: '名称', key: 'name' },
          { title: '状态', render: r => statusBadge(r.status) },
          { title: '资质', render: r => statusBadge(r.qualification_status) },
          { title: '链组织', render: r => h('code', { class: 'mono' }, r.chain_org_id) }]))),
      asyncBtn('航段列表 route/list', () => run(out.md, '/api/route/list', {}, d =>
        listTable(d.records, [
          { title: 'ID', key: 'route_id' }, { title: '区域', key: 'zone' },
          { title: '起点', key: 'start_point' }, { title: '终点', key: 'end_point' },
          { title: '高度', num: true, render: r => r.altitude_min + '-' + r.altitude_max + 'm' },
          { title: '走廊', render: r => statusBadge(r.corridor_status) }]))),
      asyncBtn('厂商列表 manufacturer/list', () => run(out.md, '/api/manufacturer/list', {}, d =>
        listTable(d.records, [
          { title: 'ID', key: 'manufacturer_id' }, { title: '名称', key: 'name' },
          { title: '状态', render: r => statusBadge(r.status || 'ACTIVE') }]))),
      asyncBtn('无人机列表 uav/list', () => run(out.md, '/api/uav/list', {}, d =>
        listTable(d.records, [
          { title: 'ID', render: r => h('code', { class: 'mono' }, r.uav_id) },
          { title: '型号', key: 'model' }, { title: '运营商', key: 'operator_id' },
          { title: 'SM9 身份', render: r => h('code', { class: 'mono' }, trunc(r.sm9_identity, 26)) },
          { title: '状态', render: r => statusBadge(r.status) }]))),
      asyncBtn('任务列表 mission/list', () => run(out.md, '/api/mission/list', {}, d =>
        listTable(d.records, [
          { title: 'ID', render: r => h('code', { class: 'mono' }, r.mission_id) },
          { title: '类型', key: 'mission_type' }, { title: '运营商', key: 'operator_id' },
          { title: '窗口', render: r => h('span', { class: 'small' }, r.start_time, ' → ', r.end_time) },
          { title: '脱敏描述', render: r => h('code', { class: 'mono' }, r.masked_value) },
          { title: '状态', render: r => statusBadge(r.status) }]))));
    sec('md', '① 主数据浏览', '运营商 / 航段 / 厂商 / 无人机 / 任务五类台账（列表端点统一 records+total 分页结构）。', mdBtns);

    /* 主数据注册表单 */
    const regForm = h('div', { class: 'form-grid' },
      field('mfrId', '厂商ID manufacturer_id', { value: 'Manufacturer-WEB-' + TS }),
      field('mfrName', '厂商名称 name', { value: '网页演示制造商' }),
      field('oprId', '运营商ID operator_id', { value: 'Operator-WEB-' + TS }),
      field('oprName', '运营商名称 name', { value: '网页演示运营商' }),
      field('rtId', '航段ID route_id', { value: 'R9' + TS.slice(0, 2) }),
      field('rtZone', '区域 zone', { value: 'Zone-D' }),
      field('rtStart', '起点 start_point', { value: 'D-ENTRY(30.61,114.41)' }),
      field('rtEnd', '终点 end_point', { value: 'D-EXIT(30.64,114.44)' }),
      field('altMin', '高度下限 altitude_min', { type: 'number', value: 60 }),
      field('altMax', '高度上限 altitude_max', { type: 'number', value: 120 }));
    const regBtns = h('div', { class: 'btn-row' },
      asyncBtn('注册厂商 manufacturer/register', () => {
        const f = readForm(regForm);
        return run(out.reg, '/api/manufacturer/register', { manufacturer_id: f.mfrId, name: f.mfrName }, d => kv([['厂商ID', d.manufacturer_id], ['名称', d.name]]));
      }),
      asyncBtn('注册运营商 operator/register', () => {
        const f = readForm(regForm);
        return run(out.reg, '/api/operator/register', { operator_id: f.oprId, name: f.oprName }, d => kv([['运营商ID', d.operator_id], ['名称', d.name], ['状态', statusBadge(d.status || 'ACTIVE')]]));
      }),
      asyncBtn('创建航段 route/create', () => {
        const f = readForm(regForm);
        return run(out.reg, '/api/route/create', { route_id: f.rtId, zone: f.rtZone, start_point: f.rtStart, end_point: f.rtEnd, altitude_min: Number(f.altMin), altitude_max: Number(f.altMax) }, d => kv([['航段ID', d.route_id], ['区域', d.zone], ['高度窗', d.altitude_min + '-' + d.altitude_max + 'm'], ['状态', statusBadge(d.corridor_status || 'OPEN')]]));
      }));
    sec('reg', '①′ 主数据注册', '新增厂商 / 运营商 / 航段（幂等：重复 ID 会返回业务错误码，如实展示）。', regForm, regBtns);

    /* ===== 2. 无人机注册 ===== */
    const uavForm = h('div', { class: 'form-grid' },
      field('uavId', '无人机ID uav_id', { value: S.uavId }),
      field('sn', '序列号 serial_no', { value: 'SN-WEB-' + TS }),
      field('model', '型号 model', { value: 'DJI-M350' }),
      fieldSelect('operatorId', '运营商 operator_id', ['Operator-A', 'Operator-B', 'Operator-C'], 'Operator-A'),
      fieldSelect('mfr', '厂商 manufacturer_id', ['Manufacturer-A', 'Manufacturer-B', 'Manufacturer-C'], 'Manufacturer-B'));
    const uavBtns = h('div', { class: 'btn-row' },
      asyncBtn('注册（自动跨链存证）uav/register', () => {
        const f = readForm(uavForm);
        return run(out.uav, '/api/uav/register', { uav_id: f.uavId, serial_no: f.sn, model: f.model, operator_id: f.operatorId, manufacturer_id: f.mfr }, (d) => {
          S.regCx = d.crosschain;
          markFlow(1, 'done');
          return h('div', {},
            kv([['无人机', h('code', {}, d.uav.uav_id)], ['SM9 身份（自动派生）', h('code', {}, d.uav.sm9_identity)], ['状态', statusBadge(d.uav.status)]]),
            h('div', { class: 'mt12' }, cxFlow(d.crosschain)));
        });
      }, 'btn-primary'),
      asyncBtn('查询 uav/query', () => run(out.uav, '/api/uav/query', { uav_id: readForm(uavForm).uavId }, d =>
        kv([['无人机', d.uav_id], ['型号', d.model], ['SM9', h('code', {}, d.sm9_identity)], ['状态', statusBadge(d.status)], ['创建', d.created_at], ['更新', d.updated_at]]))),
      asyncBtn('状态切换 uav/status (ACTIVATE)', () => run(out.uav, '/api/uav/status', { uav_id: readForm(uavForm).uavId, action: 'ACTIVATE' }, d => {
        const u = d.uav || d;
        return kv([['无人机', h('code', {}, u.uav_id)], ['状态', statusBadge(u.status)],
          ['跨链存证', d.crosschain ? h('code', {}, d.crosschain.cross_tx_id) : '（状态切换不跨链）']]);
      })),
      asyncBtn('退役 uav/revoke', () => run(out.uav, '/api/uav/revoke', { uav_id: readForm(uavForm).uavId, operator: readForm(uavForm).operatorId, reason: '网页演示退役' }, d => kv([['状态', statusBadge(d.status || 'REVOKED')]]))),
      asyncBtn('存证复查 crosschain/query', () => S.regCx ? run(out.uav, '/api/crosschain/query', { cross_tx_id: S.regCx.cross_tx_id }, d => cxFlow(d)) : (toast('先执行注册', 'err'), Promise.resolve())));
    sec('uav', '② 无人机注册 + 跨链存证', '注册即派生 SM9 身份，并自动发起 UAV_REGISTER_PROOF 跨链存证（Fabric→ChainMaker，两跳四段）。', uavForm, uavBtns);

    /* ===== 3. 任务 A ===== */
    const mAForm = h('div', { class: 'form-grid' },
      fieldSelect('operatorId', '运营商', ['Operator-A', 'Operator-B', 'Operator-C'], 'Operator-A'),
      fieldSelect('uavId', '无人机', ['UAV-A-001', 'UAV-B-001', 'UAV-C-001'], 'UAV-A-001'),
      field('segs', '航段（逗号分隔）', { value: 'R101,R205,R306' }),
      field('start', '开始时间', { value: datetimeLocal(60).slice(0, 16) + ':00' }),
      field('end', '结束时间', { value: datetimeLocal(180).slice(0, 16) + ':00' }),
      field('altMin', '高度下限', { type: 'number', value: 60 }),
      field('altMax', '高度上限', { type: 'number', value: 120 }),
      field('desc', '任务描述（将密文落库）', { value: '网页演示：Zone-A 全线巡检（密文落库）' }));
    const mABtns = h('div', { class: 'btn-row' },
      asyncBtn('创建任务 mission/create', () => {
        const f = readForm(mAForm);
        return run(out.mA, '/api/mission/create', {
          operator_id: f.operatorId, uav_id: f.uavId, mission_type: 'POWER_INSPECTION',
          route_segments: f.segs.split(',').map(s => s.trim()).filter(Boolean),
          start_time: f.start, end_time: f.end,
          altitude_min: Number(f.altMin), altitude_max: Number(f.altMax),
          payload_type: 'CAMERA', description: f.desc,
        }, d => {
          S.midA = d.mission_id; markFlow(2, 'done');
          return h('div', {},
            kv([['任务ID', h('code', {}, d.mission_id)], ['状态', statusBadge(d.status)],
              ['区域（自动推导）', d.zones], ['航段', d.route_segments]]),
            h('div', { class: 'sealed-card mt12' },
              h('div', { class: 'sc-head' }, '🔒 密文落库 · 常规视图只有脱敏值'),
              h('div', { class: 'masked-view' }, d.masked_value),
              h('div', { class: 'small muted' }, 'SM3 摘要（幕三核验的完整性基线）：'),
              h('code', { class: 'mono small' }, d.sm3_hash)));
        });
      }, 'btn-primary'),
      asyncBtn('查询（验证脱敏）mission/query', () => S.midA ? run(out.mA, '/api/mission/query', { mission_id: S.midA }, d =>
        kv([['任务ID', d.mission_id], ['状态', statusBadge(d.status)], ['脱敏值', h('code', {}, d.masked_value)],
          ['SM3', h('code', { class: 'mono' }, trunc(d.sm3_hash, 44))], ['签名者', d.sm9_identity]])) : (toast('先创建任务', 'err'), Promise.resolve())),
      asyncBtn('提交申请（跨链13步闭环）mission/submit', () => S.midA ? run(out.mA, '/api/mission/submit', { mission_id: S.midA, operator: readForm(mAForm).operatorId }, d => {
        S.appA = d.application.application_id; S.cxA = d.crosschain.cross_tx_id; markFlow(2, 'done');
        return h('div', {},
          kv([['申请单', h('code', {}, d.application.application_id)], ['申请状态', statusBadge(d.application.status)]]),
          h('div', { class: 'mt12' }, cxFlow(d.crosschain)));
      }) : (toast('先创建任务', 'err'), Promise.resolve())),
      asyncBtn('审核通过 review/submit', () => S.appA ? run(out.mA, '/api/review/submit', {
        application_id: S.appA, result: 'APPROVED', reviewer: 'FISCO-ADMIN',
        comment: '网页演示：同意执行', rules_hit: ['R-ALT-001'],
      }, d => {
        markFlow(3, 'done');
        return h('div', {},
          kv([['审核单', h('code', {}, d.review.review_id)], ['结论', statusBadge(d.review.result)], ['任务状态', statusBadge(d.mission.status)], ['命中规则', d.review.rules_hit]]),
          h('div', { class: 'mt12' }, cxFlow(d.crosschain)));
      }) : (toast('先提交申请', 'err'), Promise.resolve())),
      asyncBtn('审核单查询 review/query', () => S.appA ? run(out.mA, '/api/review/query', { application_id: S.appA }, d =>
        listTable(d.records || (d.review_id ? [d] : []), [
          { title: '审核单', key: 'review_id' }, { title: '结论', render: r => statusBadge(r.result) },
          { title: '审核人', key: 'reviewer' }, { title: '时间', key: 'review_time' }])) : (toast('先提交申请', 'err'), Promise.resolve())));
    sec('mA', '③ 任务 A：申请 → 跨链 → 审核', 'Fabric 上链申请单 → ChainMaker 签收/中继 → FISCO 审核落链，审核结果反向跨链回 Fabric。', mAForm, mABtns);

    /* ===== 4. 任务 B + 冲突 ===== */
    const mBBtns = h('div', { class: 'btn-row' },
      asyncBtn('创建任务B（与A重叠R205）', () => run(out.mB, '/api/mission/create', {
        operator_id: 'Operator-B', uav_id: 'UAV-B-001', mission_type: 'POWER_INSPECTION',
        route_segments: ['R205'],
        start_time: datetimeLocal(120).slice(0, 16) + ':00', end_time: datetimeLocal(240).slice(0, 16) + ':00',
        altitude_min: 80, altitude_max: 120, payload_type: 'CAMERA',
        description: '网页演示：Operator-B 重叠窗口任务',
      }, d => { S.midB = d.mission_id; return kv([['任务ID', h('code', {}, d.mission_id)], ['状态', statusBadge(d.status)], ['脱敏', h('code', {}, d.masked_value)]]); })),
      asyncBtn('提交B mission/submit', () => S.midB ? run(out.mB, '/api/mission/submit', { mission_id: S.midB, operator: 'Operator-B' }, d => {
        S.appB = d.application.application_id;
        return h('div', {}, kv([['申请单', h('code', {}, d.application.application_id)]]), h('div', { class: 'mt12' }, cxFlow(d.crosschain)));
      }) : (toast('先创建任务B', 'err'), Promise.resolve())),
      asyncBtn('冲突检测 conflict/detect', () => S.midB ? run(out.mB, '/api/conflict/detect', { mission_id: S.midB }, d => {
        S.cfl = d.conflicts && d.conflicts[0] ? d.conflicts[0].conflict_id : null;
        markFlow(4, d.count > 0 ? 'done' : 'current');
        return h('div', {},
          h('div', { class: 'row mb8' }, h('span', { class: 'badge ' + (d.count ? 'critical' : 'good') }, d.count ? '⚠ 命中 ' + d.count + ' 条冲突' : '✓ 无冲突')),
          listTable(d.conflicts, [
            { title: '冲突ID', render: r => h('code', { class: 'mono' }, r.conflict_id) },
            { title: '类型', render: r => h('span', { class: 'badge warning' }, h('i', { class: 'bi' }, '▲'), r.conflict_type) },
            { title: 'A/B 任务', render: r => h('span', { class: 'small' }, r.mission_id_a, ' ⇄ ', r.mission_id_b) },
            { title: '状态', render: r => statusBadge(r.status) }]));
      }) : (toast('先创建任务B', 'err'), Promise.resolve())),
      asyncBtn('冲突消解 conflict/resolve', () => S.cfl ? run(out.mB, '/api/conflict/resolve', {
        conflict_id: S.cfl, operator: 'Operator-B', resolution: '时间窗后移30分钟',
      }, d => { markFlow(4, 'done'); return kv([['冲突ID', d.conflict_id], ['消解方案', d.resolution], ['状态', statusBadge(d.status)]]); })
        : (toast('先做冲突检测', 'err'), Promise.resolve())),
      asyncBtn('审核B review/submit', () => S.appB ? run(out.mB, '/api/review/submit', {
        application_id: S.appB, result: 'APPROVED', reviewer: 'FISCO-ADMIN', comment: '冲突已消解，同意', rules_hit: [],
      }, d => { markFlow(5, 'done'); return kv([['结论', statusBadge(d.review.result)], ['任务状态', statusBadge(d.mission.status)]]); })
        : (toast('先提交B', 'err'), Promise.resolve())));
    sec('mB', '④ 任务 B：冲突检测与协调消解', 'Operator-B 在同航段 R205 提交重叠时间窗任务 → 策略引擎命中 ROUTE 冲突 → 协调消解 → 放行审核。', mBBtns);

    /* ===== 5. 通行许可 ===== */
    const passBtns = h('div', { class: 'btn-row' },
      asyncBtn('签发 pass/issue', () => S.midA ? run(out.pass, '/api/pass/issue', {
        mission_id: S.midA, issuer: 'FISCO-ADMIN',
        valid_from: datetimeLocal(-60), valid_to: datetimeLocal(60),
      }, d => {
        S.passA = d.pass.pass_id; markFlow(6, 'done');
        return h('div', {},
          kv([['许可ID', h('code', {}, d.pass.pass_id)], ['任务', d.pass.mission_id], ['无人机', d.pass.uav_id],
            ['航路', d.pass.route], ['有效期', d.pass.valid_from + ' → ' + d.pass.valid_to], ['状态', statusBadge(d.pass.status)]]),
          h('div', { class: 'mt12' }, cxFlow(d.crosschain)));
      }) : (toast('先完成任务A审核', 'err'), Promise.resolve()), 'btn-primary'),
      asyncBtn('验证 pass/verify', () => S.passA ? run(out.pass, '/api/pass/verify', { pass_id: S.passA }, d =>
        h('div', { class: 'row' },
          d.valid ? h('span', { class: 'badge good' }, '✓ 许可有效') : h('span', { class: 'badge critical' }, '✕ 验证拒绝'),
          h('span', { class: 'small' }, '状态 ', d.status, d.reasons && d.reasons.length ? ' · 理由：' + d.reasons.join('；') : '')))
        : (toast('先签发许可', 'err'), Promise.resolve())),
      asyncBtn('吊销 pass/revoke', () => S.passA ? run(out.pass, '/api/pass/revoke', {
        pass_id: S.passA, operator: 'FISCO-ADMIN', reason: '网页演示：任务结束',
      }, d => { markFlow(7, 'done'); return h('div', {}, kv([['状态', statusBadge(d.pass.status)]]), h('div', { class: 'mt12' }, cxFlow(d.crosschain))); })
        : (toast('先签发许可', 'err'), Promise.resolve()), 'btn-danger'),
      asyncBtn('再验证（应拒绝）pass/verify', () => S.passA ? run(out.pass, '/api/pass/verify', { pass_id: S.passA }, d =>
        h('div', { class: 'row' },
          d.valid ? h('span', { class: 'badge good' }, '✓ 许可有效') : h('span', { class: 'badge critical' }, '✕ 验证拒绝'),
          h('span', { class: 'small' }, '状态 ', d.status, d.reasons && d.reasons.length ? ' · 理由：' + d.reasons.join('；') : '')))
        : (toast('先签发许可', 'err'), Promise.resolve())),
      asyncBtn('许可台账 pass/list', () => run(out.pass, '/api/pass/list', {}, d =>
        listTable(d.records, [
          { title: '许可ID', render: r => h('code', { class: 'mono' }, r.pass_id) },
          { title: '任务', key: 'mission_id' }, { title: '无人机', key: 'uav_id' },
          { title: '有效期', render: r => h('span', { class: 'small' }, r.valid_from, '→', r.valid_to) },
          { title: '状态', render: r => statusBadge(r.status) }]))),
      asyncBtn('许可详情 pass/query', () => S.passA ? run(out.pass, '/api/pass/query', { pass_id: S.passA }, d =>
        kv([['许可ID', d.pass_id], ['航路', d.route], ['状态', statusBadge(d.status)],
          ['SM3', h('code', { class: 'mono' }, trunc(d.sm3_hash, 40))]])) : (toast('先签发许可', 'err'), Promise.resolve())));
    sec('pass', '⑤ 通行许可：签发 → 验证 → 吊销 → 拒绝', '许可绑定任务/无人机/航路/有效期，签发与吊销都是跨链事件；吊销后验证立即拒绝（TC2-02）。', passBtns);

    /* ===== 6. 跨链网关 ===== */
    const cxBtns = h('div', { class: 'btn-row' },
      asyncBtn('跨链流水 crosschain/list', () => {
        markFlow(8, 'done');
        return run(out.cx, '/api/crosschain/list', { page: 1, page_size: 20 }, d =>
          h('div', {},
            h('div', { class: 'row mb8' }, h('span', { class: 'badge good' },
              '✓ ' + (d.records || []).filter(r => r.status === 'SUCCESS').length + '/' + (d.records || []).length + ' SUCCESS'),
              h('span', { class: 'small muted' }, '共 ' + d.total + ' 条')),
            listTable(d.records, [
              { title: 'cross_tx_id', render: r => h('code', { class: 'mono' }, trunc(r.cross_tx_id, 20)) },
              { title: '消息类型', key: 'message_type' },
              { title: '链路', render: r => h('span', { class: 'row', style: { gap: '4px' } }, chainTag(r.source_chain), '→', chainTag(r.final_target_chain)) },
              { title: '状态', render: r => statusBadge(r.status) },
              { title: '延迟', num: true, render: r => r.latency_ms + 'ms' }])));
      }),
      asyncBtn('手动跨链发送 crosschain/send', () => run(out.cx, '/api/crosschain/send', {
        message_type: 'UAV_REGISTER_PROOF', business_id: S.uavId,
        final_target_chain: 'chainmaker',
        payload: { uav_id: S.uavId, note: '网页演示手动跨链', ts: Date.now() },
      }, d => cxFlow(d.crosschain || d))));
    sec('cx', '⑥ 跨链网关盘点', '本幕全部跨链闭环流水；crosschain/send 可手动发起一条存证消息（网关通用入口）。', cxBtns);

    /* ===== 一键全流程 ===== */
    async function runAll() {
      const seq = [
        [1, () => uavBtns.children[0].click()],
        [2, () => mABtns.children[0].click()],
        [2, () => mABtns.children[2].click()],
        [3, () => mABtns.children[3].click()],
        [4, () => mBBtns.children[0].click()],
        [4, () => mBBtns.children[1].click()],
        [4, () => mBBtns.children[2].click()],
        [5, () => mBBtns.children[3].click()],
        [5, () => mBBtns.children[4].click()],
        [6, () => passBtns.children[0].click()],
        [7, () => passBtns.children[1].click()],
        [7, () => passBtns.children[2].click()],
        [7, () => passBtns.children[3].click()],
        [8, () => cxBtns.children[0].click()],
      ];
      markFlow(0, 'done');
      for (const [fi, fn] of seq) {
        markFlow(fi, 'current');
        fn();
        await waitDone();
      }
      toast('幕一全流程实跑完毕：链式 ID ' + [S.uavId, S.midA, S.appA, S.midB, S.cfl, S.passA].filter(Boolean).join(' · '), 'ok', 6000);
    }
    function waitDone() {
      return new Promise(res => {
        const t = setInterval(() => {
          const busy = document.querySelector('.btn:disabled');
          if (!busy) { clearInterval(t); setTimeout(res, 120); }
        }, 80);
        setTimeout(() => { clearInterval(t); res(); }, 20000);
      });
    }
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.act1 = { render };
})();
