/* cxv/journey.js — 布局 E 第②③④段：业务对象选择器 + 旅程概要头 + 等宽节点横向链色时间线
   （第五期 Task 7，window.CXV_JOURNEY）。
   ② 选择器：pass/list + mission/list + uav/list（router.go:61/53/48，复用既有端点不新增）
      各 {page:1,page_size:10} 取 records，按 created_at 倒序合并；按端裁剪 kind 集：
      op→[pass,mission]、ct→[pass,mission]（pass 排前）、au/rg/index→[pass,mission,uav]。
      created_at 为 timex 固定格式串（Asia/Shanghai '2006-01-02 15:04:05.000'，同格式同
      时区）→ 字典序 = 时间序；sort 稳定 → 同刻值保持 kind 拼接序（pass 在前 = ct 钉死语义）。
      芯片 = kind 图标 + ID + 状态徽章（P.badge，icon+文字，Global Constraint 4）。
   默认选择（钉死）：时间倒序前 5 个候选逐一请求 explorer/journey——选第一个
      summary.hop_count>0 且 success_count==hop_count 的；无全 SUCCESS 则选第一个
      hop_count>0 的；全部为空 → 空态文案 = EMPTY_COPY 钉死字面量（本文件恰一处，
      同台账空态风格，Review Focus 1）。探测失败的候选如实跳过（不可断言 hop_count）。
   ③ 概要头一行横排（窄屏允许换行）：对象号 + 状态徽章 + 跨链消息 ×hop_count +
      端到端 end_to_end_ms（null→'—' 不带单位——handler 仅全 SUCCESS 才给值，绝不显示假值）
      + 验签 verify_pass/verify_total PASS + 监管中继 ×hop_count（非旁路）。
   ④ 时间线几何合同（spec §6.2 + 归档 mockup 钉死，Review Focus 5）：等宽节点列
      （每 hop 一列，CSS flex:1 1 0，不是时间比例轴）；列上方单条链色带按 hop 分段——
      宽业务段（源链色，「链名 · 业务动作」，业务动作 = message_type 固定中文名）+ 窄紫
      CM 中继段（宽 = 业务段 40%，CSS flex 1.2 : 3，「CM 中继」，监管链非旁路）。
      几何数值钉死在 drone.css Task 7 块（.d-cxv-jn-seg-biz/.d-cxv-jn-seg-cm/
      .d-cxv-jn-stop），本文件零几何魔数。链色只经 CXV.SHARED.CHAIN_VAR（var 引用）注入，
      未知链回落中性线色——不猜测、不编造链色。
      节点卡 = 序号 + 业务动作 + TxID 截断（cross_tx_id 前 8 后 6）+ SM 徽章（verify_result
      PASS→绿「SM3✓ SM9✓」，FAIL_SM3/FAIL_SM9→红，icon+文字）+ hop 状态徽章（icon+文字，
      附加诚实项：FAILED hop 绝不与 SUCCESS 同貌）+ latency_ms + created_at 全文字标注。
      节点点击 → CXV.SHARED.openCx(cross_tx_id, portal)（四段存证详情，rg 端 CHAINMAKER
      高亮后处理继续生效，裁决 E）。
   onSelect 契约（Task 8 依赖此签名接 LANES.update）：onSelect(journeyData|null) 在初次
      自动选择与每次点选芯片后回调——旅程加载成功回 data；空态/清空/加载失败回 null。
   诚实红线：选择器条目、概要数字、hop 明细全部来自实时响应且 r.ok 门控；journey 失败/
      6002 → 时间线区如实错误态，绝不渲染任何编造节点；list 全部失败 → 错误态（不以空态
      文案冒充「无中继」）；默认探测混合失败（部分成功且全 hop0）→ 空态文案旁附披露行
      （code+message+「该候选旅程状态未知，不以空态断言」+ metaLine trace 可溯）；
      测不到 null → '—'（绝不以 0 充数、绝不拼假单位）；迟到响应归属守卫（等待期间用户
      改选 → 弃填充）。
   装载序契约：本文件标签在 zones.js 之前、goals.js 之后（终序 goals→journey→lanes→
      zones→薄壳 chainview.js）；IIFE 顶层零 window.CXV 访问——SHARED.CHAIN_VAR/openCx
      仅 render/点击调用期解析（与 goals/zones 同约）。依赖仅 API/UI/PUI（裁决 G，index 兼容）。
   端点：pass/list、mission/list、uav/list、explorer/journey。 */
(function () {
  'use strict';
  var h = UI.h, P = PUI;

  /* 空态文案（钉死逐字，Review Focus 1；verify/静态 grep 对象——本文件恰此一处） */
  var EMPTY_COPY = '业务操作产生跨链中继后自动出现';

  /* 默认选择探测窗口：时间倒序前 5 个候选（钉死） */
  var PROBE_TOP_N = 5;

  /* kind → list 端点 + 主键（复用既有端点；ID 字段名实证自 model：pass_id/mission_id/uav_id） */
  var KIND_SRC = {
    pass: { url: '/api/pass/list', idKey: 'pass_id' },
    mission: { url: '/api/mission/list', idKey: 'mission_id' },
    uav: { url: '/api/uav/list', idKey: 'uav_id' }
  };

  /* 按端裁剪（brief 钉死；ct「pass 排前」= 拼接序 pass 先 → 稳定排序同刻值 pass 在前） */
  var KINDS_BY_PORTAL = {
    op: ['pass', 'mission'],
    ct: ['pass', 'mission'],
    au: ['pass', 'mission', 'uav'],
    rg: ['pass', 'mission', 'uav'],
    index: ['pass', 'mission', 'uav']
  };
  var KINDS_ALL = ['pass', 'mission', 'uav'];

  /* kind 图标（归档 mockup 同款：✈ 许可 / 📋 任务 / 🛩 无人机；图标+文字永不仅靠颜色） */
  var KIND_ICON = { pass: '✈', mission: '📋', uav: '🛩' };

  /* message_type → 业务动作中文名（固定架构文案非数据，口径 = 后端 README 端点表；
     未知类型原样直出不编造中文——同步注记：MSG_CN/CHAIN_CN 两表 lanes.js 存有逐字副本，
     任一侧修改必须双侧同步，否则静默分叉） */
  var MSG_CN = {
    UAV_REGISTER_PROOF: '注册证明上链',
    MISSION_APPLICATION: '任务申请上链',
    MISSION_REVIEW_RESULT: '审核结果回传',
    FLIGHT_PASS: '许可签发',
    PASS_REVOKE: '许可吊销同步'
  };
  /* 链显示名（固定架构文案，pui.js CHAIN_NAME 同口径——该表未导出，此处按钉死值本地持有；
     未知链原样直出不猜测） */
  var CHAIN_CN = {
    chainmaker: 'ChainMaker 监管链', fabric: 'Fabric 运营链',
    'fisco-bcos': 'FISCO BCOS 管理链', irita: 'IRITA 证照链'
  };
  function msgName(t) { return MSG_CN[t] || String(t || '—'); }
  function chainName(c) { return CHAIN_CN[c] || String(c || '—'); }
  /* 链色 var 引用（SHARED.CHAIN_VAR 调用期解析；未知链 → 中性线色，不猜测链色） */
  function chainVar(c) { return window.CXV.SHARED.CHAIN_VAR[c] || 'var(--d-line-strong)'; }

  /* fmtVal/fmtUnit：与 goals.js 同语义的诚实格式——null/undefined/NaN/±Infinity → '—'；
     真实 0 → '0'；测不到只出 '—' 不拼单位（绝不出现 '— ms' 假读数） */
  function fmtVal(v) {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number' && !Number.isFinite(v)) return '—';
    return String(v);
  }
  function fmtUnit(v, unit) {
    var s = fmtVal(v);
    return s === '—' ? s : s + unit;
  }

  /* TxID 截断：前 8 后 6（brief 钉死；短于 15 原样直出不硬截） */
  function truncTx(id) {
    var s = String(id || '');
    if (!s) return '—';
    return s.length > 14 ? s.slice(0, 8) + '…' + s.slice(-6) : s;
  }

  /* 序号圈码 ①②③…（mockup 同款；越界如实 '#N' 不编造） */
  function circled(n) {
    return (n >= 1 && n <= 20) ? String.fromCharCode(0x2460 + n - 1) : '#' + n;
  }

  /* SM 徽章（verify_result：PASS→绿「SM3✓ SM9✓」；FAIL_*→红；icon+文字永不仅靠颜色；
     空值如实 '—'） */
  function smBadge(vr) {
    if (vr === 'PASS') return h('span', { class: 'p-badge p-tone-good d-cxv-jn-sm' }, 'SM3✓ SM9✓');
    if (vr === 'FAIL_SM3') return h('span', { class: 'p-badge p-tone-critical d-cxv-jn-sm' }, '✕ SM3 验签失败');
    if (vr === 'FAIL_SM9') return h('span', { class: 'p-badge p-tone-critical d-cxv-jn-sm' }, '✕ SM9 验签失败');
    if (vr) return h('span', { class: 'p-badge p-tone-neutral d-cxv-jn-sm' }, '· ' + vr);
    return h('span', { class: 'd-cxv-jn-sm' }, '验签 —');
  }

  /* ================= render（薄壳 chainview.js 组装时位于 GOALS 之下 ZONES 之上） ================= */
  function render(root, opts, onSelect) {
    opts = opts || {};
    var portal = opts.portal || 'index';
    var kinds = KINDS_BY_PORTAL[portal] || KINDS_ALL;
    var state = { candidates: [], selected: null, okKinds: [] };   /* selected = 候选对象引用；okKinds = 本端查询且成功的 kind */

    var pickerBox = h('div', { class: 'd-cxv-jn-picker' },
      h('div', { class: 'p-empty' }, '⏳ 业务对象列表加载中…'));
    var metaSlot = h('div', {});
    var jhdrBox = h('div', {});
    var tlBox = h('div', {});
    root.append(h('section', { class: 'p-card d-cxv-jn-sec' },
      h('h3', { class: 'p-card-title' },
        '业务对象全链旅程（点击节点查看四段存证详情）'),
      pickerBox, metaSlot, jhdrBox, tlBox));

    function notify(data) { if (typeof onSelect === 'function') onSelect(data); }

    /* ---------- ④ 时间线（几何数值全部在 CSS Task 7 块；此处只组装结构） ---------- */
    function stopCol(hop, idx) {
      var src = hop.source_chain;
      var seq = hop.seq || (idx + 1);
      var dot = h('span', { class: 'd-cxv-jn-dot', title: chainName(src) });
      dot.style.background = chainVar(src);
      var card = h('button', {
        type: 'button', class: 'd-cxv-jn-card',
        title: '点击查看该跳四段存证详情',
        onClick: function () { window.CXV.SHARED.openCx(hop.cross_tx_id, portal); }
      },
        h('b', {}, circled(seq) + ' ' + msgName(hop.message_type)),
        h('code', { class: 'p-mono d-cxv-jn-tx', title: hop.cross_tx_id || '' }, truncTx(hop.cross_tx_id)),
        h('div', { class: 'd-cxv-jn-badges' }, smBadge(hop.verify_result), P.badge(hop.status)),
        h('span', { class: 'd-cxv-jn-time' }, fmtUnit(hop.latency_ms, ' ms'), ' · ', hop.created_at || '—'));
      return h('div', { class: 'd-cxv-jn-stop' }, dot, card);
    }
    function renderJourney(data) {
      data = data || {};
      var a = data.anchor || {}, s = data.summary || {};
      jhdrBox.innerHTML = '';
      jhdrBox.append(h('div', { class: 'd-cxv-jn-hdr' },
        h('b', {}, (a.id || '—') + ' 全链旅程'),
        h('span', {}, '状态 ', P.badge(a.status)),
        h('span', {}, '跨链消息 ×' + fmtVal(s.hop_count)),
        h('span', {}, '端到端 ' + fmtUnit(s.end_to_end_ms, ' ms')),
        h('span', {}, '验签 ' + fmtVal(s.verify_pass) + '/' + fmtVal(s.verify_total) + ' PASS'),
        h('span', {}, '监管中继 ×' + fmtVal(s.hop_count) + '（非旁路）')));
      tlBox.innerHTML = '';
      var hops = data.hops || [];
      if (!hops.length) { tlBox.append(P.empty(EMPTY_COPY)); return; }
      var rail = h('div', { class: 'd-cxv-jn-rail' });
      var stops = h('div', { class: 'd-cxv-jn-stops' });
      hops.forEach(function (hop, idx) {
        var biz = h('div', {
          class: 'd-cxv-jn-seg d-cxv-jn-seg-biz',
          title: chainName(hop.source_chain) + ' → ' + chainName(hop.final_target_chain) + ' · ' + (hop.message_type || '—')
        }, chainName(hop.source_chain) + ' · ' + msgName(hop.message_type));
        biz.style.background = chainVar(hop.source_chain);
        var cm = h('div', {
          class: 'd-cxv-jn-seg d-cxv-jn-seg-cm',
          title: '监管链 ChainMaker 签收/验签/中继——跨链必经监管链，非旁路'
        }, 'CM 中继');
        cm.style.background = chainVar('chainmaker');
        rail.append(biz, cm);
        stops.append(stopCol(hop, idx));
      });
      tlBox.append(rail, stops,
        h('div', { class: 'd-cxv-jn-hint' },
          '节点可点击查看该跳四段存证详情；节点按链上时间先后排布，时间戳与时延见卡内文字'));
    }
    function renderTimelineError(r) {
      jhdrBox.innerHTML = '';
      tlBox.innerHTML = '';
      tlBox.append(h('div', { class: 'd-cxv-jn-err' },
        h('div', {}, h('b', {}, '⚠ 旅程加载失败（code=' + r.code + '）——时间线拒绝渲染任何编造节点')),
        P.errCard(r)));
    }
    function renderTimelineEmpty(probeErrs) {
      jhdrBox.innerHTML = '';
      tlBox.innerHTML = '';
      tlBox.append(P.empty(EMPTY_COPY));
      /* 混合探测失败如实披露（诚实红线：失败候选可能正是有中继的那个——空态按省略断言
         「无中继」即 dishonest）：空态文案旁附披露行（code+message 直出），metaSlot 挂首个
         失败响应的 metaLine（trace 可溯）。全成功探测的空态不附披露（确证无中继）。 */
      if (probeErrs && probeErrs.length) {
        metaSlot.innerHTML = '';
        metaSlot.append(P.metaLine(probeErrs[0].r));
        tlBox.append(h('div', { class: 'd-cxv-jn-partial' },
          probeErrs.map(function (f) {
            return h('div', {}, '⚠ 候选 ' + f.cand.id + ' 旅程探测失败（code=' + f.r.code + '）：' + (f.r.message || '') + '——该候选旅程状态未知，如实披露');
          })));
      }
    }

    /* ---------- ② 选择器芯片 ---------- */
    var chipEls = [];
    function syncChips() {
      chipEls.forEach(function (it) {
        var sel = state.selected === it.cand;
        it.el.className = 'd-cxv-jn-chip' + (sel ? ' d-cxv-jn-sel' : '');
      });
    }
    function renderChips() {
      pickerBox.innerHTML = '';
      chipEls = [];
      pickerBox.append(h('span', { class: 'd-cxv-jn-note' }, '最近业务对象：'));
      if (!state.candidates.length) {
        /* 空态口径只对本端实际查询且成功的 list 断言（op/ct 不查 uav；失败 kind 由下方
           .d-cxv-jn-partial 警示行如实披露，绝不以「三 list 均空」以偏概全） */
        pickerBox.append(h('span', { class: 'd-cxv-jn-note' },
          '暂无业务对象（实时查询结果为空——如实展示，绝不虚构记录）'));
        return;
      }
      state.candidates.forEach(function (cand) {
        var el = h('button', {
          type: 'button', class: 'd-cxv-jn-chip',
          title: '点击查看该对象全链旅程',
          onClick: function () { selectAndLoad(cand); }
        },
          h('span', {}, KIND_ICON[cand.kind] || '·'),
          h('span', { class: 'p-mono' }, cand.id),
          P.badge(cand.status));
        chipEls.push({ cand: cand, el: el });
        pickerBox.append(el);
      });
      syncChips();
    }

    /* ---------- 旅程加载（点选芯片 / 默认自动选择共用；preloaded = 探测已得的响应 r） ---------- */
    async function selectAndLoad(cand, preloaded) {
      state.selected = cand;
      syncChips();
      if (preloaded) {
        metaSlot.innerHTML = '';
        metaSlot.append(P.metaLine(preloaded));
        renderJourney(preloaded.data || {});
        notify(preloaded.data || null);
        return;
      }
      metaSlot.innerHTML = '';
      jhdrBox.innerHTML = '';
      tlBox.innerHTML = '';
      tlBox.append(h('div', { class: 'p-empty' }, '⏳ 旅程查询中…'));
      var r = await API.call('/api/explorer/journey', { anchor_id: cand.id, anchor_kind: cand.kind });
      if (!pickerBox.isConnected) return;   /* 已导航离开/「刷新全部」卸载本区 → 弃填充 */
      if (state.selected !== cand) return;  /* 迟到响应归属守卫：等待期间用户已改选他芯片 → 弃填充（绝不把旧对象渲染进新选中态） */
      metaSlot.innerHTML = '';
      metaSlot.append(P.metaLine(r));
      if (!r.ok) { renderTimelineError(r); notify(null); return; }
      renderJourney(r.data || {});
      notify(r.data || null);
    }

    /* ---------- 默认选择（钉死规则：前 5 逐一探测，全 SUCCESS 优先 → 首个有 hop → 空态） ---------- */
    async function autoSelect() {
      var top = state.candidates.slice(0, PROBE_TOP_N);
      if (!top.length) { renderTimelineEmpty(); notify(null); return; }
      var firstWithHops = null, probeErrs = [], probed = 0;
      for (var i = 0; i < top.length; i++) {
        var cand = top[i];
        var r = await API.call('/api/explorer/journey', { anchor_id: cand.id, anchor_kind: cand.kind });
        if (!pickerBox.isConnected) return;
        if (state.selected) return;   /* 探测期间用户已点选芯片 → 让位用户选择，自动探测如实终止 */
        if (!r.ok) { probeErrs.push({ cand: cand, r: r }); continue; }   /* 探测失败如实跳过——不可断言 hop_count */
        probed++;
        var s = (r.data && r.data.summary) || {};
        if (s.hop_count > 0 && s.success_count === s.hop_count) { selectAndLoad(cand, r); return; }
        if (s.hop_count > 0 && !firstWithHops) firstWithHops = { cand: cand, r: r };
      }
      if (firstWithHops) { selectAndLoad(firstWithHops.cand, firstWithHops.r); return; }
      if (!probed && probeErrs.length) {
        /* 前 5 全部探测失败 → 如实错误态（绝不以空态文案冒充「无中继」） */
        metaSlot.innerHTML = '';
        metaSlot.append(P.metaLine(probeErrs[0].r));
        renderTimelineError(probeErrs[0].r);
        notify(null);
        return;
      }
      renderTimelineEmpty(probeErrs);   /* 混合失败（部分成功且全 hop0）→ 空态 + 披露行 */
      notify(null);
    }

    /* ---------- 选择器数据装载：三 list 端点各 page_size=10，created_at 倒序合并 ---------- */
    async function loadPicker() {
      var byKind = {}, fails = [];
      await Promise.all(kinds.map(function (k) {
        return API.call(KIND_SRC[k].url, { page: 1, page_size: 10 }).then(function (r) {
          if (!r.ok) { fails.push({ kind: k, r: r }); return; }
          byKind[k] = ((r.data && r.data.records) || []).map(function (rec) {
            return {
              kind: k, id: String(rec[KIND_SRC[k].idKey] || ''),
              status: rec.status, created_at: String(rec.created_at || '')
            };
          }).filter(function (e) { return e.id; });   /* 无主键的残行如实剔除，不猜测 */
        });
      }));
      if (!pickerBox.isConnected) return;
      if (fails.length === kinds.length) {
        /* 全部 list 失败 → 选择器/时间线如实错误态（空态文案语义 = 确实无中继，不可冒充） */
        pickerBox.innerHTML = '';
        pickerBox.append(h('div', { class: 'd-cxv-jn-err' },
          h('div', {}, h('b', {}, '⚠ 业务对象列表加载失败——选择器拒绝显示任何编造对象')),
          fails.map(function (f) { return P.errCard(f.r); })));
        renderTimelineError(fails[0].r);
        notify(null);
        return;
      }
      var merged = [];
      state.okKinds = kinds.filter(function (k) { return !!byKind[k]; });   /* 实际查询且成功的 kind（空态口径用） */
      kinds.forEach(function (k) { merged = merged.concat(byKind[k] || []); });
      /* created_at 字典序 = 时间序（timex 固定格式同时区）；sort 稳定 → 同刻值保持 kind 拼接序 */
      merged.sort(function (a, b) {
        return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
      });
      state.candidates = merged;
      renderChips();
      if (fails.length) {
        pickerBox.append(h('div', { class: 'd-cxv-jn-partial' },
          fails.map(function (f) {
            return h('div', {}, '⚠ ' + f.kind + ' 类对象列表加载失败（code=' + f.r.code + '）：' + (f.r.message || '') + '——该类对象如实缺席，不以其他类型冒充');
          })));
      }
      autoSelect();
    }

    loadPicker();
  }

  window.CXV_JOURNEY = { render: render };
})();
