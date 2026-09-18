/* explorer.js —— API 浏览器：64 端点全量（来自 docs/apifox openapi 生成），
   左侧按 tag 分组可搜索，右侧编辑请求 JSON 实发、查看响应与录制样例。 */
(function () {
  'use strict';
  const { h, metaLine, jsonBlock, toast, asyncBtn } = UI;
  const call = API.call;

  function render(root) {
    root.append(h('div', { class: 'page-head' },
      h('h1', {}, 'API 浏览器（64 端点全量）'),
      h('p', {}, '数据源 ', h('code', {}, 'docs/apifox/skytrust-backend.openapi.json'),
        ' → 生成 ', h('code', {}, 'frontend/js/data/endpoints.js'),
        '。所有端点均为 POST + JSON，信封 {code, message, data, trace_id, timestamp}，code=0 为成功。',
        '左侧检索选择，右侧可直接编辑请求体实发（对真实后端生效，谨慎对待写操作），下方附 openapi 录制的成功/错误样例。每次实发与每个端点均附「成功证明了什么 / 失败为何被拒」解说（EXPLAIN 词典，与三幕监控台同源）。')));

    const eps = window.ENDPOINTS || [];
    const EX = window.EXPLAIN || { codes: {}, paths: {} };
    const byTag = new Map(); // ENDPOINTS 已按 TAG_ORDER 排序，Map 保持插入序即分组序
    eps.forEach(e => { if (!byTag.has(e.tag)) byTag.set(e.tag, []); byTag.get(e.tag).push(e); });

    const listEl = h('div', { class: 'ep-list' });
    const detailEl = h('div', { class: 'card' }, h('div', { class: 'empty-hint' }, '← 选择一个端点'));
    root.append(h('div', { class: 'explorer' },
      h('div', {},
        h('input', { class: 'ep-search', type: 'search', placeholder: '搜索 path / 摘要 / tag…（如 pass、虫洞）',
          onInput: e => drawList(e.target.value.trim().toLowerCase()) }),
        listEl),
      detailEl));

    let current = null;
    function drawList(q) {
      listEl.innerHTML = '';
      let shown = 0;
      byTag.forEach((items, tag) => {
        const hit = items.filter(e => !q ||
          e.path.toLowerCase().includes(q) || (e.summary || '').toLowerCase().includes(q) || tag.toLowerCase().includes(q));
        if (!hit.length) return;
        shown += hit.length;
        listEl.append(h('div', { class: 'ep-tag' }, tag + ' · ' + hit.length));
        hit.forEach(e => {
          const it = h('button', { class: 'ep-item' + (current === e ? ' active' : ''),
            onClick: () => { current = e; drawList(q); drawDetail(e); } },
            h('div', { class: 'ep-path' }, e.path.replace('/api/', '')),
            h('div', { class: 'ep-sum' }, e.summary || ''));
          listEl.append(it);
        });
      });
      if (!shown) listEl.append(h('div', { class: 'empty-hint' }, '无匹配端点'));
    }
    drawList('');

    function drawDetail(e) {
      detailEl.innerHTML = '';
      const ta = h('textarea', { rows: 10, spellcheck: false,
        style: { width: '100%', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12.5px' } },
        JSON.stringify(e.req || {}, null, 2));
      const respBox = h('div', { class: 'mt8' });
      const send = asyncBtn('▶ 发送请求（实发后端）', async () => {
        let body;
        try { body = JSON.parse(ta.value || '{}'); }
        catch (err) { toast('请求体不是合法 JSON：' + err.message, 'err', 5000); return; }
        respBox.innerHTML = '';
        respBox.append(h('div', { class: 'small muted' }, '⏳ POST ' + e.path + ' …'));
        const r = await call(e.path, body);
        respBox.innerHTML = '';
        const why = r.ok ? EX.paths[e.path] : (EX.codes[r.code] || r.message);
        respBox.append(h('div', { class: 'small muted mb8' }, h('b', {}, '实际响应')), metaLine(r),
          why ? h('div', { class: 'run-why' }, h('b', {}, r.ok ? '✔ 成功解说 · ' : '✖ 失败解说 · '), why) : null,
          jsonBlock(r.raw, 420));
      }, 'btn-primary');

      detailEl.append(
        h('div', { class: 'ep-detail-head' },
          h('span', { class: 'method-pill' }, 'POST'),
          h('span', { class: 'path-big' }, e.path),
          h('span', { class: 'badge' }, e.tag)),
        h('div', { class: 'card-sub' }, e.summary || '', e.operationId ? ' · operationId ' + e.operationId : ''),
        EX.paths[e.path] ? h('div', { class: 'run-why' }, h('b', {}, '✔ 成功证明了什么 · '), EX.paths[e.path]) : null,
        h('div', { class: 'field mt8' }, h('label', {}, '请求体（可编辑，来自 openapi 录制样例）'), ta),
        h('div', { class: 'btn-row' }, send,
          h('button', { class: 'btn btn-sm btn-ghost', onClick: () => { ta.value = JSON.stringify(e.req || {}, null, 2); } }, '还原样例')),
        respBox,
        h('details', { class: 'mt8' }, h('summary', { class: 'small muted' }, '录制样例 · 成功响应'), jsonBlock(e.resp, 320)),
        e.err && e.err.code ? h('details', { class: 'mt8' }, h('summary', { class: 'small muted' },
          '录制样例 · 错误响应（code=' + e.err.code + '）'),
          EX.codes[e.err.code] ? h('div', { class: 'run-why' }, h('b', {}, '✖ 该错误码为何被拒 · '), EX.codes[e.err.code]) : null,
          jsonBlock(e.err, 320)) : null);
      detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.explorer = { render };
})();
