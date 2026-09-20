/* wb-operator.js —— 运营商工作台 #/wb-operator：主数据 / 无人机管理 / 任务管理 / 许可与存证。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  /* 必填校验：缺字段 toast 并返回 null（runOp 收到 null 不发请求） */
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));

  function render(root) {
    root.append(P.pageHead({
      title: '运营商工作台',
      sub: '主体建档 · 无人机全生命周期 · 任务申请与冲突协调 · 许可自查与跨链存证',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'master', label: '主数据', render: tabMaster },
      { key: 'uavs', label: '无人机管理', render: tabUavs },
      { key: 'missions', label: '任务管理', render: tabMissions },
      { key: 'passes', label: '许可与存证', render: tabPasses },
    ]));
  }

  /* ================= Tab 1：主数据 ================= */
  function tabMaster(box) {
    /* --- 制造商 --- */
    const rpMf = P.resultPanel();
    const fMf = P.form([
      { name: 'manufacturer_id', label: '制造商 ID', type: 'text', required: true, placeholder: 'MF-XXX' },
      { name: 'name', label: '制造商名称', type: 'text', required: true },
    ]);
    const tblMf = P.dataTable({ endpoint: '/api/manufacturer/list', columns: [
      { title: 'ID', key: 'manufacturer_id', mono: true },
      { title: '名称', key: 'name' },
      { title: '状态', render: r => P.badge(r.status) },
      { title: '链适配器', key: 'adapter_type' },
      { title: '创建时间', key: 'created_at' }] });
    box.append(card('制造商注册 manufacturer/register', fMf.root,
      P.actionBar([{ label: '注册制造商', kind: 'primary', run: P.runOp({
        path: '/api/manufacturer/register',
        body: () => need(fMf.read(), 'manufacturer_id', 'name'), rp: rpMf,
        successText: '制造商已注册',
        render: d => P.kv([['ID', d.manufacturer_id], ['状态', P.badge(d.status)]]),
        note: { kind: 'MANUFACTURER', id: d => d.manufacturer_id },
        onOk: () => tblMf.reload() }) }]),
      rpMf.root, tblMf));

    /* --- 运营商 --- */
    const rpOp = P.resultPanel();
    const fOp = P.form([
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true, placeholder: 'OP-XXX' },
      { name: 'name', label: '运营商名称', type: 'text', required: true },
    ]);
    const tblOp = P.dataTable({ endpoint: '/api/operator/list', columns: [
      { title: 'ID', key: 'operator_id', mono: true },
      { title: '名称', key: 'name' },
      { title: '资质', render: r => P.badge(r.qualification_status) },
      { title: '链上组织', render: r => monoTrunc(r.chain_org_id, 24) },
      { title: '状态', render: r => P.badge(r.status) }] });
    box.append(card('运营商注册 operator/register（自动分配链上组织身份）', fOp.root,
      P.actionBar([{ label: '注册运营商', kind: 'primary', run: P.runOp({
        path: '/api/operator/register',
        body: () => need(fOp.read(), 'operator_id', 'name'), rp: rpOp,
        successText: '运营商已注册',
        render: d => P.kv([
          ['ID', d.operator_id], ['资质', P.badge(d.qualification_status)],
          ['链上组织', monoTrunc(d.chain_org_id, 32)]]),
        note: { kind: 'OPERATOR', id: d => d.operator_id },
        onOk: () => tblOp.reload() }) }]),
      rpOp.root, tblOp));

    /* --- 航段 --- */
    const rpRt = P.resultPanel();
    const fRt = P.form([
      { name: 'route_id', label: '航段 ID', type: 'text', required: true, placeholder: 'R-XXX' },
      { name: 'zone', label: '空域 Zone', type: 'text', required: true, placeholder: 'Zone-A' },
      { name: 'start_point', label: '起点', type: 'text', required: true },
      { name: 'end_point', label: '终点', type: 'text', required: true },
      { name: 'altitude_min', label: '高度下限(m)', type: 'number', value: 120 },
      { name: 'altitude_max', label: '高度上限(m)', type: 'number', value: 300 },
    ]);
    const tblRt = P.dataTable({ endpoint: '/api/route/list', pageSize: 20, columns: [
      { title: 'ID', key: 'route_id', mono: true },
      { title: '空域', key: 'zone' },
      { title: '走向', render: r => r.start_point + ' → ' + r.end_point },
      { title: '高度层(m)', render: r => r.altitude_min + '–' + r.altitude_max, num: true },
      { title: '走廊状态', render: r => P.badge(r.corridor_status) }] });
    box.append(card('航段创建 route/create', fRt.root,
      P.actionBar([{ label: '创建航段', kind: 'primary', run: P.runOp({
        path: '/api/route/create',
        body: () => need(fRt.read(), 'route_id', 'zone', 'start_point', 'end_point'), rp: rpRt,
        successText: '航段已创建（corridor_status=OPEN）',
        render: d => P.kv([
          ['ID', d.route_id], ['空域', d.zone],
          ['走向', d.start_point + ' → ' + d.end_point],
          ['走廊状态', P.badge(d.corridor_status)]]),
        note: { kind: 'ROUTE', id: d => d.route_id, extra: d => ({ zone: d.zone }) },
        onOk: () => tblRt.reload() }) }]),
      rpRt.root, tblRt));
  }

  /* ================= Tab 2：无人机管理 ================= */
  function tabUavs(box) {
    const tbl = P.dataTable({
      endpoint: '/api/uav/list',
      filters: [
        { name: 'operator_id', label: '运营商', type: 'text' },
        { name: 'manufacturer_id', label: '制造商', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['REGISTERED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] },
      ],
      columns: [
        { title: 'ID', key: 'uav_id', mono: true },
        { title: '型号', key: 'model' },
        { title: '序列号', key: 'serial_no', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); openUav(r.uav_id); } }, '详情') },
      ],
    });

    /* --- 注册（含跨链存证） --- */
    const rpReg = P.resultPanel();
    const fReg = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true, placeholder: 'UAV-X-001' },
      { name: 'serial_no', label: '序列号', type: 'text', required: true },
      { name: 'model', label: '型号', type: 'text', required: true },
      { name: 'manufacturer_id', label: '制造商 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true },
    ]);
    box.append(card('无人机注册 uav/register（自动生成 UAV_REGISTER_PROOF 三链存证）', fReg.root,
      P.actionBar([{ label: '注册无人机', kind: 'primary', run: P.runOp({
        path: '/api/uav/register',
        body: () => need(fReg.read(), 'uav_id', 'serial_no', 'model', 'manufacturer_id', 'operator_id'),
        rp: rpReg, successText: '注册成功，跨链存证已生成',
        render: d => h('div', {},
          P.kv([['ID', d.uav.uav_id], ['状态', P.badge(d.uav.status)],
            ['SM9 身份', monoTrunc(d.uav.sm9_identity, 40)]]),
          P.cxTrail(d.crosschain)),
        note: { kind: 'UAV', id: d => d.uav.uav_id, extra: d => ({ operator_id: d.uav.operator_id }) },
        onOk: d => {
          STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
          tbl.reload();
        } }) }]),
      rpReg.root));

    /* --- 状态机 --- */
    const rpSt = P.resultPanel();
    const fSt = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'action', label: '动作', type: 'select', value: 'VERIFY',
        options: ['VERIFY', 'ACTIVATE', 'SUSPEND', 'RESUME'] },
    ]);
    box.append(card('状态机 uav/status（REGISTERED →VERIFY→ VERIFIED →ACTIVATE→ ACTIVE；SUSPEND ⇄ RESUME）',
      fSt.root,
      h('p', { class: 'p-field-hint' },
        'VERIFY 的跨链中继可能失败（FAILED）——同动作重发即幂等重试，跨链台账会留 retry_of 痕迹；重复 VERIFY 已核验机器返回 2004 幂等拒绝。'),
      P.actionBar([{ label: '执行状态动作', kind: 'primary', run: P.runOp({
        path: '/api/uav/status', body: () => need(fSt.read(), 'uav_id', 'action'), rp: rpSt,
        render: d => h('div', {},
          P.kv([['ID', d.uav.uav_id], ['状态', P.badge(d.uav.status)]]),
          d.crosschain ? P.cxTrail(d.crosschain) : null),
        note: { kind: 'UAV', id: d => d.uav.uav_id },
        onOk: () => tbl.reload() }) }]),
      rpSt.root));

    /* --- 注销 --- */
    const rpRv = P.resultPanel();
    const fRv = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Operator-A' },
      { name: 'reason', label: '注销原因', type: 'textarea', required: true },
    ]);
    box.append(card('无人机注销 uav/revoke（不可逆，状态→REVOKED）', fRv.root,
      P.actionBar([{ label: '注销', kind: 'danger',
        confirm: { title: '确认注销', msg: '注销后该无人机不可再用于新任务（状态→REVOKED）。', ok: '确认注销' },
        run: P.runOp({
          path: '/api/uav/revoke', body: () => need(fRv.read(), 'uav_id', 'operator', 'reason'),
          rp: rpRv, render: d => P.kv([['ID', d.uav_id], ['状态', P.badge(d.status)]]),
          note: { kind: 'UAV', id: d => d.uav_id }, onOk: () => tbl.reload() }) }]),
      rpRv.root));

    box.append(card('无人机台账 uav/list', tbl));
  }

  async function openUav(uavId) {
    const d = P.drawer('无人机详情 ' + uavId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/uav/query', { uav_id: uavId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const u = r.data;
    body.append(P.kv([
      ['ID', h('code', { class: 'p-mono' }, u.uav_id)],
      ['型号', u.model], ['序列号', u.serial_no],
      ['制造商', u.manufacturer_id], ['运营商', u.operator_id],
      ['状态', P.badge(u.status)],
      ['SM9 身份', monoTrunc(u.sm9_identity, 48)],
      ['创建时间', u.created_at], ['更新时间', u.updated_at],
    ]), h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
    STORE.note('UAV', u.uav_id, { operator_id: u.operator_id });
  }

  /* ================= Tab 3：任务管理 ================= */
  function tabMissions(box) {
    const tbl = P.dataTable({
      endpoint: '/api/mission/list',
      filters: [
        { name: 'operator_id', label: '运营商', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['DRAFT', 'SUBMITTED', 'REVIEWING', 'COORDINATING', 'APPROVED',
            'REJECTED', 'EXECUTING', 'COMPLETED', 'ABORTED'] },
      ],
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '描述（脱敏）', key: 'masked_value' },
        { title: '时窗', render: r => UI.trunc(r.start_time, 16) + ' → ' + UI.trunc(r.end_time, 16) },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); openMission(r.mission_id); } }, '详情') },
      ],
    });

    /* --- 创建 --- */
    const rpCr = P.resultPanel();
    const fCr = P.form([
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true },
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true },
      { name: 'mission_type', label: '任务类型', type: 'text', required: true,
        placeholder: 'INSPECTION / MEDICAL / LOGISTICS…' },
      { name: 'payload_type', label: '载荷类型', type: 'text', required: true,
        placeholder: 'CARGO / CAMERA…' },
      { name: 'description', label: '任务描述', type: 'textarea', required: true,
        hint: '描述经 SM9 加密入库——界面与台账只显示脱敏值 masked_value，明文不出运营商域' },
      /* 注记：pui.js setOptions 的 multi 分支经 e.inp[0].closest('.p-multi') 定位容器，
         初始 options 不能为空数组——放占位项保证容器存在；route/list 返回后被整体替换。 */
      { name: 'route_segments', label: '航段（多选）', type: 'multi',
        options: [['', '⏳ 加载航段中…']], required: true,
        hint: '选项自动取自 route/list' },
      { name: 'altitude_min', label: '高度下限(m)', type: 'number', value: 120 },
      { name: 'altitude_max', label: '高度上限(m)', type: 'number', value: 300 },
      { name: 'start_time', label: '开始时间', type: 'datetime', value: UI.datetimeLocal(60) },
      { name: 'end_time', label: '结束时间', type: 'datetime', value: UI.datetimeLocal(240) },
    ]);
    API.call('/api/route/list', { page: 1, page_size: 200 }).then(r => {
      if (r.ok) fCr.setOptions('route_segments', (r.data.records || []).map(x =>
        [x.route_id, x.route_id + ' · ' + x.zone + ' · ' + x.corridor_status]));
    });
    box.append(card('任务创建 mission/create（描述密文入库，脱敏展示）', fCr.root,
      P.actionBar([{ label: '创建任务', kind: 'primary', run: P.runOp({
        path: '/api/mission/create',
        body: () => need(fCr.read(), 'operator_id', 'uav_id', 'mission_type',
          'payload_type', 'description', 'route_segments'),
        rp: rpCr, successText: '任务已创建（DRAFT），描述已密文入库',
        render: d => P.kv([
          ['任务号', h('code', { class: 'p-mono' }, d.mission_id)],
          ['状态', P.badge(d.status)],
          ['脱敏值', d.masked_value],
          ['涉及空域', (d.zones || []).join('、')],
          ['航段', (d.route_segments || []).join('、')],
          ['SM3 摘要', monoTrunc(d.sm3_hash, 40)]]),
        note: { kind: 'MISSION', id: d => d.mission_id,
          extra: d => ({ operator_id: d.operator_id, uav_id: d.uav_id }) },
        onOk: () => tbl.reload() }) }]),
      rpCr.root));

    /* --- 提交 --- */
    const rpSb = P.resultPanel();
    const fSb = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'operator', label: '提交人', type: 'text', required: true, value: 'Operator-A' },
    ]);
    box.append(card('任务提交 mission/submit（源链交易 + MISSION_APPLICATION 跨链中继至管理链）',
      fSb.root,
      P.actionBar([{ label: '提交审核', kind: 'primary', run: P.runOp({
        path: '/api/mission/submit', body: () => need(fSb.read(), 'mission_id', 'operator'),
        rp: rpSb, successText: '已提交，跨链申请存证已生成',
        render: d => h('div', {},
          P.kv([
            ['申请号', h('code', { class: 'p-mono' }, d.application.application_id)],
            ['源链', P.chainTag(d.application.source_chain)],
            ['源链 TxID', monoTrunc(d.application.source_tx_id, 40)],
            ['申请状态', P.badge(d.application.status)]]),
          P.cxTrail(d.crosschain)),
        note: { kind: 'APPLICATION', id: d => d.application.application_id,
          extra: d => ({ mission_id: d.application.mission_id }) },
        onOk: d => { STORE.note('CROSS_TX', d.crosschain.cross_tx_id); tbl.reload(); } }) }]),
      rpSb.root));

    /* --- 冲突检测 / 消解 --- */
    const rpCf = P.resultPanel();
    const fCf = P.form([
      { name: 'mission_id', label: '任务号（主动方）', type: 'text', required: true },
    ]);
    const rpRs = P.resultPanel();
    const fRs = P.form([
      { name: 'conflict_id', label: '冲突 ID', type: 'text', required: true },
      { name: 'operator', label: '处置人', type: 'text', required: true, value: 'Operator-A' },
      { name: 'resolution', label: '处置方案', type: 'textarea', required: true,
        placeholder: '如：错峰 30 分钟 / 变更高度层 / 改航段' },
    ]);
    box.append(card('空域冲突 conflict/detect · conflict/resolve（时间×航路×高度三维重叠判定）',
      fCf.root,
      P.actionBar([{ label: '检测冲突', run: P.runOp({
        path: '/api/conflict/detect', body: () => need(fCf.read(), 'mission_id'), rp: rpCf,
        render: d => h('div', {},
          P.statCards([{ label: '命中冲突', value: d.count, tone: d.count > 0 ? 'warning' : 'good' }]),
          h('div', {}, (d.conflicts || []).map(c => P.kv([
            ['冲突 ID', h('code', { class: 'p-mono' }, c.conflict_id)],
            ['类型', P.badge(c.conflict_type)],
            ['任务 A / B', c.mission_id_a + '  ×  ' + c.mission_id_b],
            ['状态', P.badge(c.status)],
            ['协调建议', c.suggestion || '—']])))),
        onOk: () => tbl.reload() }) }]),
      rpCf.root,
      h('hr', { class: 'p-hr' }),
      fRs.root,
      h('p', { class: 'p-field-hint' },
        '检测命中后主动方任务进入 COORDINATING；消解成功→RESOLVED。同一冲突重复消解将被 3004 拒绝（幂等保护，设计内）。'),
      P.actionBar([{ label: '消解冲突', kind: 'primary', run: P.runOp({
        path: '/api/conflict/resolve',
        body: () => need(fRs.read(), 'conflict_id', 'operator', 'resolution'), rp: rpRs,
        successText: '冲突已消解',
        note: { kind: 'CONFLICT', id: d => (d && d.conflict_id) || '' },
        onOk: () => tbl.reload() }) }]),
      rpRs.root));

    box.append(card('任务台账 mission/list', tbl));
  }

  async function openMission(missionId) {
    const d = P.drawer('任务详情 ' + missionId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/mission/query', { mission_id: missionId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const m = r.data;
    body.append(P.kv([
      ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
      ['状态', P.badge(m.status)],
      ['运营商', m.operator_id], ['无人机', m.uav_id],
      ['类型 / 载荷', m.mission_type + ' / ' + m.payload_type],
      ['描述（脱敏）', m.masked_value],
      ['航段', (m.route_segments || []).join('、')],
      ['空域', (m.zones || []).join('、')],
      ['高度层(m)', m.altitude_min + ' – ' + m.altitude_max],
      ['时窗', m.start_time + ' → ' + m.end_time],
      ['SM3 摘要', monoTrunc(m.sm3_hash, 48)],
      ['SM9 身份', monoTrunc(m.sm9_identity, 32)],
      ['签名', monoTrunc(m.signature, 48)],
    ]), h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
    STORE.note('MISSION', m.mission_id, { operator_id: m.operator_id, uav_id: m.uav_id });
  }

  /* ================= Tab 4：许可与存证 ================= */
  function tabPasses(box) {
    const tbl = P.dataTable({
      endpoint: '/api/pass/list',
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
      ],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '生效', key: 'valid_from' },
        { title: '失效', key: 'valid_to' },
      ],
    });
    const rpQ = P.resultPanel();
    const fQ = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true, hint: '可点上方 chips 复制' },
    ]);
    box.append(card('飞行前自查 pass/query · pass/verify', fQ.root,
      P.actionBar([
        { label: '查询详情', run: P.runOp({
          path: '/api/pass/query', body: () => need(fQ.read(), 'pass_id'), rp: rpQ,
          render: d => P.kv([
            ['许可号', d.pass_id], ['状态', P.badge(d.status)],
            ['任务号', d.mission_id], ['无人机', d.uav_id],
            ['航路', d.route], ['生效', d.valid_from], ['失效', d.valid_to],
            ['SM3 摘要', monoTrunc(d.sm3_hash, 40)]]),
          note: { kind: 'PASS', id: d => d.pass_id } }) },
        { label: '验证有效性', kind: 'primary', run: P.runOp({
          path: '/api/pass/verify', body: () => need(fQ.read(), 'pass_id'), rp: rpQ,
          render: d => h('div', {},
            P.statCards([{ label: 'valid（可否起飞）', value: String(d.valid),
              tone: d.valid ? 'good' : 'critical' }]),
            P.kv([['许可状态', P.badge(d.status)],
              ['原因', (d.reasons || []).join('；') || '—']])) }) },
      ]), rpQ.root));
    box.append(card('许可台账 pass/list', tbl));
    box.append(card('跨链存证台账 crosschain/list（点行看四段 TxID 详情）',
      P.dataTable({
        endpoint: '/api/crosschain/list',
        filters: [
          { name: 'message_type', label: '类型', type: 'select',
            options: ['UAV_REGISTER_PROOF', 'MISSION_APPLICATION', 'MISSION_REVIEW_RESULT',
              'FLIGHT_PASS', 'PASS_REVOKE'] },
          { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] },
        ],
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 22), mono: true },
          { title: '类型', key: 'message_type' },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 18), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '验签', key: 'verify_result' },
          { title: '时延(ms)', key: 'latency_ms', num: true },
          { title: '创建时间', key: 'created_at' },
        ],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
      })));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-operator'] = { render };
})();
