/* cxv/zones.js — 第五期拆分：原 chainview.js 三区原样迁移，行为零变化（window.CXV_ZONES）。
   迁移后唯一改动（Task 6 controller-authorized，前向陷阱修复）：「⟳ 刷新全部」按钮改经
   薄壳 window.CXV.render 重渲——壳级组装自 Task 6 起含 goals 段（后续 journey/lanes），
   直调本文件局部 render 会抹掉壳级新增段；薄壳未装载时回落本地 render（如实只刷三区）。
   其余代码保持原样副本。
   三区（同页纵排，链选中态跨区共享）：
   ① 节点情况 = explorer/overview 四链卡（链色边条走 CSS var：--p-chain-* / --d-chain-irita，
      JS 绝不硬编码 hex；名称/共识显示串逐字取自后端响应，绝不转述）+ 选中链 explorer/nodes
      节点表（source 列如实展示 rpc / static+probe / sim）；
   ② 块浏览 = explorer/blocks 最近 20（新→旧），行点击 → explorer/block 抽屉（hash/time/
      tx_count/proposer/tx 列表），tx 点击 → explorer/tx 链上直查；irita「Merkle 证明可用」
      标注仅在 overview 报告 mode=real 时出现（裁决 D：绝不在模拟数据上声称证明）；
   ③ 链上数据追踪 = crosschain/list（状态=服务端过滤；类型/业务单号=最近 200 条窗口内客户端
      筛选，固定小字如实标注）+ 分页表 + 行点击 PUI.openCxDetail；直查表单（链选 + TxID →
      explorer/tx）。
   四端裁剪（opts = {portal:'op'|'au'|'rg'|'ct'|'index', defaultChain?, defaultMsgTypes?}）：
   op → defaultMsgTypes ['MISSION_APPLICATION','FLIGHT_PASS'] 聚焦芯片；ct → defaultChain 'irita'；
   rg → 监管中继段高亮由薄壳 openCx 承接（裁决 E：pui.js 零改动）；au/index → 全量。
   index 版禁用依赖（裁决 G）：index.html 不加载 PORTAL/MAPX——本模块只依赖 API/UI/PUI
   （index.html 已加载 pui.js，实证于其 script 区）。
   拆分契约：共享常量与下钻助手（CHAIN_VAR/MSG_TYPES/CX_STATUSES/merkleNote/degradeSpec/
   isDegrade/chainCard/openBlock/txView/openCx）与 SMALL_PRINT 字面量物理保留在薄壳
   chainview.js；本文件一律经运行时 window.CXV.SHARED.* / window.CXV.SMALL_PRINT 引用
   （装载序在薄壳前，调用时机在 render/点击后，无加载序问题）。
   degradeCard / queryTxInto 为三区侧私有 helper 的原样副本（薄壳 openBlock 仍用其本地副本；
   SHARED 导出面钉死、不含二者）——副本内对 degradeSpec/txView 的引用改经 window.CXV.SHARED，
   逻辑逐字不变。
   诚实红线：一切数据来自实时响应且 r.ok（code===0）门控；能力降级 code=2005（裁决 A，
   非 brief 旧字样 5003）→ 降级卡直出后端 message；空态如实；绝不硬编码块/TxID/高度/哈希。
   端点：explorer/overview、explorer/nodes、explorer/blocks、explorer/block、explorer/tx、
   crosschain/list。 */
(function () {
  'use strict';
  var h = UI.h, P = PUI;

  var CHAIN_FALLBACK = ['chainmaker', 'fabric', 'fisco-bcos', 'irita'];  /* 仅 overview 失败时的裸键兜底（显示名不派生） */
  var SOURCE_NOTE = { rpc: '链原生 RPC 实测', 'static+probe': '静态配置 + 逐节点 TCP 探活', sim: '进程内模拟链' };
  var lastChain = {};   /* portal → 最近选中链（路由重渲染后保持；仅内存） */

  function card(title) {
    var kids = Array.prototype.slice.call(arguments, 1);
    return h('section', { class: 'p-card' }, h('h3', { class: 'p-card-title' }, title), kids);
  }

  /* 三区侧私有 helper：degradeCard 原样副本（薄壳 openBlock 仍用其本地副本；SHARED 导出面
     钉死不含 degradeCard）——degradeSpec 经 window.CXV.SHARED 运行时解析，逻辑逐字不变。 */
  function degradeCard(r, chain, what) {
    var sp = window.CXV.SHARED.degradeSpec(r, chain, what);
    return h('div', { class: 'd-cxv-degrade' },
      h('div', {}, h('b', {}, sp.title)),
      sp.lines.map(function (t) { return h('div', { class: 'd-small' }, t); }));
  }

  /* 三区侧私有 helper：queryTxInto 原样副本（直查表单 runDq 用；薄壳 openBlock 仍用其本地
     副本；SHARED 导出面钉死不含 queryTxInto）——txView 经 window.CXV.SHARED 运行时解析，
     逻辑逐字不变。 */
  async function queryTxInto(slot, chain, txId) {
    slot.innerHTML = '';
    slot.append(h('div', { class: 'p-empty' }, '⏳ explorer/tx 直查中…'));
    var r = await API.call('/api/explorer/tx', { chain: chain, tx_id: txId });
    if (!slot.isConnected) return;
    slot.innerHTML = '';
    slot.append(window.CXV.SHARED.txView(r, chain));
  }

  /* ================= render ================= */
  function render(root, opts) {
    opts = opts || {};
    var portal = opts.portal || 'index';
    var state = {
      chain: opts.defaultChain || lastChain[portal] || null,
      modes: {}
    };

    var SUB = '节点情况 · 块浏览 · 链上数据追踪 —— 四链实时数据（explorer/* + crosschain/list），能力缺口如实降级（code=2005），绝不拼造';
    if (portal === 'op') SUB += '。本端聚焦：任务申请 / 飞行许可跨链留痕';
    if (portal === 'rg') SUB += '。监管端：跨链存证详情中 CHAINMAKER 监管中继段高亮';
    if (portal === 'ct') SUB += '。证照中心端：默认深钻 IRITA 证照链';
    root.append(P.pageHead({
      title: '区块链浏览器', sub: SUB,
      actions: [h('button', {
        class: 'p-btn',
        onClick: function () {
          root.innerHTML = '';
          /* 刷新全部经薄壳组装重渲（含 goals 段及后续 journey/lanes）——直调本文件局部
             render 会抹掉壳级已组装段（Task 6 前向陷阱修复）；薄壳未装载时回落本地 render。 */
          (window.CXV && window.CXV.render ? window.CXV.render : render)(root, opts);
        }
      }, '⟳ 刷新全部')]
    }));

    /* ---------- 链选择（跨区共享） ---------- */
    var chainSelects = [];
    function buildChainSelect(onChange) {
      var sel = h('select', { onChange: function () { if (onChange && sel.value) onChange(sel.value); } },
        h('option', { value: '' }, '总览加载中…'));
      chainSelects.push(sel);
      return sel;
    }
    function fillSelects(chains) {
      var list = (chains && chains.length)
        ? chains
        : CHAIN_FALLBACK.map(function (k) { return { chain: k }; });   /* overview 失败：裸键兜底，显示名不派生 */
      chainSelects.forEach(function (sel) {
        sel.innerHTML = '';
        list.forEach(function (c) {
          sel.append(h('option', { value: c.chain, selected: c.chain === state.chain }, c.name || c.chain));
        });
        if (state.chain) sel.value = state.chain;
      });
    }
    function selectChain(chain) {
      state.chain = chain;
      lastChain[portal] = chain;
      cardBox.querySelectorAll('.d-cxv-chain-card').forEach(function (el) {
        el.classList.toggle('sel', el.getAttribute('data-chain') === chain);
      });
      chainSelects.forEach(function (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === chain) { sel.value = chain; break; }
        }
      });
      z2Tag.innerHTML = '';
      z2Tag.append(P.chainTag(chain));
      loadNodes(nodesBox, chain);
      loadBlocks(blocksBox, heightEl, chain, state.modes[chain]);
    }

    /* ---------- ① 节点情况 ---------- */
    var cardBox = h('div', { class: 'd-cxv-chains' }, h('div', { class: 'p-empty' }, '⏳ explorer/overview 加载中…'));
    var nodesBox = h('div', {}, h('div', { class: 'p-empty' }, '等待总览加载…'));
    var zone1 = card('① 节点情况 · explorer/overview + explorer/nodes（点击链卡选中链，驱动节点表与块浏览）',
      cardBox, nodesBox);

    async function loadOverview() {
      var r = await API.call('/api/explorer/overview', {});
      if (!cardBox.isConnected) return;   /* 已导航离开（root.innerHTML='' 卸载本区）→ 弃填充 */
      cardBox.innerHTML = '';
      if (!r.ok) {
        cardBox.append(P.errCard(r));
        fillSelects(null);
        var fb = CHAIN_FALLBACK.indexOf(state.chain) >= 0 ? state.chain : CHAIN_FALLBACK[0];
        selectChain(fb);   /* 裸键仍可查 nodes/blocks（后端 6002/2005 如实兜底） */
        return;
      }
      var chains = (r.data && r.data.chains) || [];
      state.modes = {};
      chains.forEach(function (c) { state.modes[c.chain] = c.mode; });
      if (!chains.length) {
        cardBox.append(P.empty('overview 返回 0 链（如实展示，绝不虚构链卡）'));
        fillSelects(null);
        return;
      }
      /* 后端已按确定性次序输出（sort.Strings）——按响应原序渲染，不重排、不转述 */
      chains.forEach(function (c) {
        cardBox.append(window.CXV.SHARED.chainCard(c, c.chain === state.chain, selectChain));
      });
      fillSelects(chains);
      var keys = chains.map(function (c) { return c.chain; });
      if (!state.chain || keys.indexOf(state.chain) < 0) {
        state.chain = (opts.defaultChain && keys.indexOf(opts.defaultChain) >= 0) ? opts.defaultChain
          : (lastChain[portal] && keys.indexOf(lastChain[portal]) >= 0) ? lastChain[portal]
          : keys[0];
      }
      selectChain(state.chain);
    }

    async function loadNodes(box, chain) {
      box.innerHTML = '';
      box.append(h('div', { class: 'p-empty' }, '⏳ explorer/nodes 查询中…'));
      var r = await API.call('/api/explorer/nodes', { chain: chain });
      if (!box.isConnected) return;
      box.innerHTML = '';
      box.append(h('div', { class: 'd-cxv-zone-head' }, P.chainTag(chain),
        h('span', { class: 'd-small d-muted' }, '节点列表 explorer/nodes（source 数据源如实标注）')),
        P.metaLine(r));
      if (window.CXV.SHARED.isDegrade(r)) { box.append(degradeCard(r, chain, '节点查询')); return; }
      if (!r.ok) { box.append(P.errCard(r)); return; }
      var nodes = (r.data && r.data.nodes) || [];
      if (!nodes.length) { box.append(P.empty('该链未返回节点（如实展示，绝不虚构节点）')); return; }
      box.append(h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
        h('thead', {}, h('tr', {}, ['节点名', '角色', '地址', '在线', '数据来源 source'].map(function (t) { return h('th', {}, t); }))),
        h('tbody', {}, nodes.map(function (n) {
          return h('tr', {},
            h('td', { class: 'p-mono' }, n.name || '—'),
            h('td', {}, n.role || '—'),
            h('td', { class: 'p-mono' }, n.address || '—'),
            h('td', {}, P.badge(n.online ? 'ONLINE' : 'OFFLINE')),
            h('td', {}, h('span', { class: 'p-mono', title: SOURCE_NOTE[n.source] || '未登记来源（原值如实展示）' }, n.source || '—')));
        })))));
      box.append(h('p', { class: 'd-cxv-smallprint' },
        'source：rpc=链原生 RPC 实测 · static+probe=静态配置+逐节点探活 · sim=进程内模拟——绝不以仿真冒充真实链数据。'));
    }

    /* ---------- ② 块浏览 ---------- */
    var z2Sel = buildChainSelect(function (v) { selectChain(v); });
    var z2Tag = h('span', {});
    var heightEl = h('b', { class: 'p-mono' }, '当前高度 —');
    var blocksBox = h('div', {}, h('div', { class: 'p-empty' }, '等待总览加载…'));
    var zone2 = card('② 块浏览 · explorer/blocks（最近 20 · 新→旧 · 行点击块详情，tx 点击链上直查）',
      h('div', { class: 'd-cxv-zone-head' }, z2Sel, z2Tag, heightEl,
        h('button', {
          class: 'p-btn p-btn-sm',
          onClick: function () { if (state.chain) loadBlocks(blocksBox, heightEl, state.chain, state.modes[state.chain]); }
        }, '⟳ 重新拉取')),
      blocksBox);

    async function loadBlocks(box, hEl, chain, mode) {
      box.innerHTML = '';
      box.append(h('div', { class: 'p-empty' }, '⏳ explorer/blocks 查询中…'));
      var r = await API.call('/api/explorer/blocks', { chain: chain, limit: 20 });
      if (!box.isConnected) return;
      box.innerHTML = '';
      box.append(P.metaLine(r));
      if (window.CXV.SHARED.isDegrade(r)) { box.append(degradeCard(r, chain, '区块查询')); return; }
      if (!r.ok) { box.append(P.errCard(r)); return; }
      hEl.textContent = '当前高度 ' + String((r.data && r.data.height) ?? '—');
      var blocks = (r.data && r.data.blocks) || [];
      if (!blocks.length) {
        box.append(P.empty('该链暂无块记录（sim 链在业务写入后产生块；real 链以 RPC 实际返回为准——空态如实，绝不虚构）'));
        return;
      }
      box.append(h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
        h('thead', {}, h('tr', {},
          h('th', { class: 'num' }, '高度'), h('th', {}, '块哈希'), h('th', {}, '出块时间'),
          h('th', { class: 'num' }, '交易数'), h('th', {}, '出块者'))),
        h('tbody', {}, blocks.map(function (b) {
          return h('tr', { class: 'clickable', title: '点击查看块详情 explorer/block', onClick: function () { window.CXV.SHARED.openBlock(chain, b.height, mode); } },
            h('td', { class: 'num p-mono' }, String(b.height ?? '—')),
            h('td', { class: 'p-mono', title: b.hash || '' }, UI.trunc(b.hash || '—', 24)),
            h('td', {}, b.time || '—'),
            h('td', { class: 'num' }, String(b.tx_count ?? 0)),
            h('td', { class: 'p-mono' }, b.proposer || '—'));
        })))));
    }

    /* ---------- ③ 链上数据追踪 ---------- */
    var st = {
      status: '',
      biz: '',
      types: new Set((opts.defaultMsgTypes && opts.defaultMsgTypes.length) ? opts.defaultMsgTypes : window.CXV.SHARED.MSG_TYPES),
      recs: [], total: 0, page: 1, pageSize: 10
    };
    var metaSlot = h('div', {});
    var rowsBox = h('div', {}, h('div', { class: 'p-empty' }, '⏳ crosschain/list 查询中…'));
    var pagerBox = h('div', { class: 'd-cxv-pager' });
    var windowNote = h('span', {}, '窗口：—');

    var statusSel = h('select', { title: '服务端过滤（status）', onChange: function () { st.status = statusSel.value; loadTrace(); } },
      [h('option', { value: '' }, '全部状态（服务端）')].concat(
        window.CXV.SHARED.CX_STATUSES.map(function (s) { return h('option', { value: s }, s); })));
    var bizInp = h('input', {
      type: 'text', placeholder: '业务单号（客户端窗口筛选）', title: window.CXV.SMALL_PRINT,
      onInput: function () { st.biz = bizInp.value; st.page = 1; renderTable(); }
    });
    var filterBar = h('div', { class: 'd-cxv-filterbar' },
      h('label', { class: 'd-small d-muted' }, '状态（服务端）：'), statusSel, bizInp,
      h('button', { class: 'p-btn p-btn-sm', onClick: function () { loadTrace(); } }, '查询'),
      h('button', { class: 'p-btn p-btn-sm p-btn-ghost', onClick: resetTrace }, '重置'));

    /* 类型 = 客户端筛选芯片（icon+文字：☑/☐ 永不仅靠颜色）；op 端默认聚焦 defaultMsgTypes */
    var chipSyncs = [];
    var chipRow = h('div', { class: 'd-cxv-chips' }, h('span', { class: 'd-small d-muted' }, '类型（客户端筛选）：'));
    window.CXV.SHARED.MSG_TYPES.forEach(function (t) {
      var b = h('button', {
        type: 'button', class: 'd-cxv-chip', title: window.CXV.SMALL_PRINT,
        onClick: function () {
          if (st.types.has(t)) st.types.delete(t); else st.types.add(t);
          syncChip();
          st.page = 1; renderTable();
        }
      }, t);
      function syncChip() {
        b.className = 'd-cxv-chip' + (st.types.has(t) ? ' on' : '');
        b.textContent = (st.types.has(t) ? '☑ ' : '☐ ') + t;
      }
      syncChip();
      chipSyncs.push(syncChip);
      chipRow.append(b);
    });
    if (opts.defaultMsgTypes && opts.defaultMsgTypes.length) {
      chipRow.append(h('span', { class: 'd-small d-muted' },
        '本端默认聚焦 ' + opts.defaultMsgTypes.join(' / ') + '（客户端筛选，点选芯片可调整）'));
    }
    var smallPrint = h('p', { class: 'd-cxv-smallprint' }, window.CXV.SMALL_PRINT, ' · ', windowNote);

    async function loadTrace() {
      rowsBox.innerHTML = '';
      rowsBox.append(h('div', { class: 'p-empty' }, '⏳ crosschain/list 查询中…'));
      pagerBox.innerHTML = '';
      var body = { page: 1, page_size: 200 };
      if (st.status) body.status = st.status;
      var r = await API.call('/api/crosschain/list', body);
      if (!rowsBox.isConnected) return;
      metaSlot.innerHTML = '';
      metaSlot.append(P.metaLine(r));
      rowsBox.innerHTML = '';
      if (!r.ok) { rowsBox.append(P.errCard(r)); return; }
      st.total = (r.data && r.data.total) || 0;
      st.recs = (r.data && r.data.records) || [];
      st.page = 1;
      windowNote.textContent = '窗口：台账总量 ' + st.total + ' 条，本次取最近 ' + st.recs.length + ' 条（page_size=200）';
      renderTable();
    }
    function resetTrace() {
      st.status = ''; st.biz = ''; st.page = 1;
      st.types = new Set((opts.defaultMsgTypes && opts.defaultMsgTypes.length) ? opts.defaultMsgTypes : window.CXV.SHARED.MSG_TYPES);
      statusSel.value = ''; bizInp.value = '';
      chipSyncs.forEach(function (fn) { fn(); });
      windowNote.textContent = '窗口：—';
      loadTrace();
    }
    function traceFiltered() {
      var biz = st.biz.trim().toLowerCase();
      return st.recs.filter(function (x) {
        if (!st.types.has(x.message_type)) return false;
        if (biz && String(x.business_id || '').toLowerCase().indexOf(biz) < 0) return false;
        return true;
      });
    }
    function renderTable() {
      rowsBox.innerHTML = '';
      pagerBox.innerHTML = '';
      var recs = traceFiltered();
      if (!recs.length) {
        rowsBox.append(P.empty(st.recs.length
          ? '窗口内无符合当前筛选的跨链留痕（客户端筛选条件见上；空态如实，绝不虚构记录）'
          : '暂无跨链留痕 —— 业务操作（登记/申请/签发等）产生跨链中继后自动出现'));
        return;
      }
      var pages = Math.max(1, Math.ceil(recs.length / st.pageSize));
      if (st.page > pages) st.page = pages;
      var view = recs.slice((st.page - 1) * st.pageSize, st.page * st.pageSize);
      rowsBox.append(h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
        h('thead', {}, h('tr', {}, ['跨链号 cross_tx_id', '类型', '业务单号', '链路', '状态', '验签', '时延', '创建时间'].map(function (t) { return h('th', {}, t); }))),
        h('tbody', {}, view.map(function (x) {
          return h('tr', {
            class: 'clickable', title: '点击打开四段存证详情 openCxDetail',
            onClick: function () { window.CXV.SHARED.openCx(x.cross_tx_id, portal); }
          },
            h('td', { class: 'p-mono', title: x.cross_tx_id }, UI.trunc(x.cross_tx_id, 18)),
            h('td', {}, x.message_type || '—'),
            h('td', { class: 'p-mono' }, x.business_id || '—'),
            h('td', {}, h('span', { class: 'd-cxv-route' }, P.chainTag(x.source_chain), h('span', {}, '→'), P.chainTag(x.final_target_chain))),
            h('td', {}, P.badge(x.status)),
            h('td', {}, x.verify_result ? P.badge(x.verify_result) : '—'),
            h('td', { class: 'num' }, (x.latency_ms ?? '—') + 'ms'),
            h('td', {}, x.created_at || '—'));
        })))));
      pagerBox.append(
        h('span', {}, '筛选后 ' + recs.length + ' 条 · 第 ' + st.page + '/' + pages + ' 页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page <= 1, onClick: function () { st.page--; renderTable(); } }, '‹ 上一页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page >= pages, onClick: function () { st.page++; renderTable(); } }, '下一页 ›'));
    }

    /* 直查表单（链选 + TxID → explorer/tx） */
    var dqSel = buildChainSelect(null);
    var dqInp = h('input', { type: 'text', placeholder: '粘贴链上 TxID（可从块详情交易列表或跨链存证段复制）' });
    var dqResult = h('div', {});
    var dqBtn = h('button', { class: 'p-btn p-btn-sm', onClick: runDq }, '直查 explorer/tx');
    async function runDq() {
      var chain = dqSel.value, tx = dqInp.value.trim();
      if (!chain || !tx) { UI.toast('请选择链并输入 TxID', 'err'); return; }
      dqBtn.disabled = true;
      try { await queryTxInto(dqResult, chain, tx); } finally { dqBtn.disabled = false; }
    }

    var zone3 = card('③ 链上数据追踪 · crosschain/list + explorer/tx 直查',
      filterBar, chipRow, smallPrint,
      h('div', {}, metaSlot, rowsBox, pagerBox),
      h('div', { class: 'p-drawer-sec' }, '链上直查（链选 + TxID → explorer/tx；不存在或查询失败 → 6002 如实上报）'),
      h('div', { class: 'd-cxv-filterbar' }, dqSel, dqInp, dqBtn),
      dqResult);

    root.append(zone1, zone2, zone3);
    loadOverview();
    loadTrace();
  }

  window.CXV_ZONES = { render: render };
})();
