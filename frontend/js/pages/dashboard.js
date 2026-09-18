/* dashboard.js —— 总览驾驶舱：三链健康、聚合统计瓦片、跨链流水与延迟、最近告警、演示复位。 */
(function () {
  'use strict';
  const { h, card, statusBadge, chainTag, table, metaLine, hbarChart, toast, toastResult, asyncBtn } = UI;
  const call = API.call;

  function tile(label, value, sub, tone, icon) {
    return h('div', { class: 'tile' },
      h('div', { class: 't-label' }, h('span', {}, icon || '▦'), label),
      h('div', { class: 't-value ' + (tone || '') }, String(value)),
      sub ? h('div', { class: 't-sub' }, sub) : null);
  }

  async function render(root) {
    root.append(h('div', { class: 'page-head' },
      h('h1', {}, '总览驾驶舱'),
      h('p', {}, '一屏聚合三大系统运行态势：三链健康、告警/授权/会话/虫洞事件统计、跨链流水与延迟。数据来自 ',
        h('code', {}, '/api/dashboard/summary'), '、', h('code', {}, '/api/chain/status'), '、',
        h('code', {}, '/api/crosschain/list'), '，点击右上「刷新」或每 15s 自动更新三链灯。')));

    const bar = h('div', { class: 'btn-row', style: { marginBottom: '14px' } });
    const refresh = asyncBtn('⟳ 刷新全部', load, 'btn-primary');
    bar.append(refresh,
      asyncBtn('▶ 一键跑通三幕全流程', runThreeActs, 'btn-primary'),
      asyncBtn('demo/reset 复位业务库', async () => {
        if (!confirm('将清空 20 张业务表并重灌基线（真实链数据不受影响，P6-R6）。继续？')) return;
        const r = await call('/api/demo/reset', {});
        toastResult(r, '已复位：清空 ' + (r.data && r.data.tables_cleared) + ' 张表');
        const r2 = await call('/api/demo/init', {});
        toastResult(r2, '基线已重灌');
        load();
      }, 'btn-danger'),
      asyncBtn('demo/init 重灌基线', async () => {
        const r = await call('/api/demo/init', {});
        toastResult(r, '基线已重灌（幂等）');
        load();
      }));

    const chainBox = h('div', { class: 'grid cols-3' });
    const tilesBox = h('div', { class: 'tiles' });
    const cxBox = h('div', {});
    const alertBox = h('div', {});
    root.append(bar, chainBox, h('div', { style: { height: '16px' } }), tilesBox,
      h('div', { class: 'grid cols-2 mt16' }, cxBox, alertBox));

    async function load() {
      // ---- 三链健康 ----
      chainBox.innerHTML = '';
      const cs = await call('/api/chain/status', {});
      if (cs.ok) {
        for (const [name, st] of Object.entries(cs.data.chains || {})) {
          chainBox.append(card(null, null,
            h('div', { class: 'row', style: { justifyContent: 'space-between' } },
              chainTag(name), statusBadge(st)),
            h('div', { class: 'small muted mt8' }, name === 'chainmaker' ? '监管链 · 跨链中继/审计存证/身份索引'
              : name === 'fabric' ? '运营链 · 任务申请/审核结果/许可'
              : '管理链 · 审核决策/许可签发/厂商主数据'),
            metaLine(cs)));
        }
      } else {
        chainBox.append(card('三链状态', null, h('div', { class: 'callout danger' }, 'code=' + cs.code + ' ' + cs.message)));
      }

      // ---- 聚合瓦片 ----
      tilesBox.innerHTML = '';
      const ds = await call('/api/dashboard/summary', {});
      if (ds.ok) {
        const d = ds.data;
        tilesBox.append(
          tile('告警总数', d.alerts.total, 'HIGH 未结案 ' + d.alerts.high_open + ' · ' +
            Object.entries(d.alerts.by_type || {}).map(([k, v]) => k + '×' + v).join('，'),
            d.alerts.high_open > 0 ? 'critical' : '', '⚠'),
          tile('核验授权', d.authorizations.total, '已授权 ' + d.authorizations.authorized +
            ' · 待审 ' + d.authorizations.pending, '', '🗝'),
          tile('链下会话', d.sessions.total, 'ACTIVE ' + d.sessions.active + ' · DEGRADED ' +
            d.sessions.degraded + ' · RECOVERED ' + d.sessions.recovered, '', '⇄'),
          tile('虫洞事件', d.wormhole_events.total, 'DETECT ' + d.wormhole_events.detect +
            ' · ISOLATE ' + d.wormhole_events.isolate + ' · RECOVER ' + d.wormhole_events.recover,
            d.wormhole_events.detect > 0 ? 'critical' : 'good', '🕳'));
      } else {
        tilesBox.append(h('div', { class: 'callout danger' }, 'dashboard/summary code=' + ds.code));
      }

      // ---- 跨链流水 + 延迟图 ----
      cxBox.innerHTML = '';
      const cx = await call('/api/crosschain/list', { page: 1, page_size: 10 });
      if (cx.ok) {
        const recs = cx.data.records || [];
        const okN = recs.filter(r => r.status === 'SUCCESS').length;
        const chart = recs.length ? hbarChart(
          recs.slice(0, 8).map(r => ({
            label: r.message_type,
            value: r.latency_ms,
            display: r.latency_ms + 'ms',
            tip: r.cross_tx_id + ' · ' + r.source_chain + '→' + r.final_target_chain,
          })),
          { unit: 'ms', seriesName: '跨链单程延迟', max: Math.max(1000, ...recs.map(r => r.latency_ms)) * 1.1 }) : null;
        cxBox.append(card('跨链流水（最近 ' + recs.length + ' / 共 ' + cx.data.total + '）',
          '两跳四段：源链上链 → 监管链签收 → 监管链中继 → 目标链存证；点行查看完整存证。',
          recs.length ? h('div', { class: 'row mb8' },
            h('span', { class: 'badge good' }, '✓ SUCCESS ' + okN + '/' + recs.length),
            h('span', { class: 'small muted' }, '延迟条形图为单系列量值（顺序蓝），阈值线 1000ms 为验收 p95 上限')) : null,
          chart,
          recs.length ? table([
            { title: 'cross_tx_id', render: r => h('code', { class: 'mono' }, UI.trunc(r.cross_tx_id, 20)) },
            { title: '消息类型', key: 'message_type' },
            { title: '链路', render: r => h('span', { class: 'row', style: { gap: '4px' } },
                chainTag(r.source_chain), '→', chainTag(r.final_target_chain)) },
            { title: '业务ID', render: r => h('code', { class: 'mono' }, UI.trunc(r.business_id, 22)) },
            { title: '状态', render: r => statusBadge(r.status) },
            { title: '延迟', num: true, render: r => r.latency_ms + 'ms' },
          ], recs, { onRowClick: r => showCxDetail(r) })
            : h('div', { class: 'empty-hint' }, '暂无跨链流水 —— 到「幕一」跑一遍任务协同即可产生。')));
      }

      // ---- 最近告警 ----
      alertBox.innerHTML = '';
      const al = await call('/api/alert/list', { page: 1, page_size: 8 });
      if (al.ok) {
        const recs = al.data.records || [];
        alertBox.append(card('最近告警（共 ' + al.data.total + '）', '监管侧安全事件，幕三剧情的入口。',
          recs.length ? table([
            { title: 'alert_id', render: r => h('code', { class: 'mono' }, UI.trunc(r.alert_id, 24)) },
            { title: '类型', key: 'event_type' },
            { title: '等级', render: r => statusBadge(r.risk_level) },
            { title: '状态', render: r => statusBadge(r.status) },
            { title: '伪名', render: r => h('code', { class: 'mono' }, r.uav_pseudonym || '—') },
          ], recs) : h('div', { class: 'empty-hint' }, '暂无告警。')));
      }
    }

    async function showCxDetail(r) {
      const q = await call('/api/crosschain/query', { cross_tx_id: r.cross_tx_id });
      if (!q.ok) { toast('查询失败 code=' + q.code, 'err'); return; }
      const d = q.data;
      const dlg = card(h('span', {}, '跨链存证详情 ', h('code', { class: 'mono' }, d.cross_tx_id)), null,
        UI.cxFlow(d),
        UI.kv([
          ['业务ID', d.business_id], ['监管记录', d.reg_record_id],
          ['SM3 摘要', h('code', { class: 'mono' }, UI.trunc(d.sm3_hash, 40))],
          ['SM9 身份', d.sm9_identity],
          ['验签/策略', d.verify_result + ' / ' + d.policy_result],
          ['幂等键', h('code', { class: 'mono' }, UI.trunc(d.idempotency_key, 32))],
        ]),
        h('details', { class: 'mt8' }, h('summary', { class: 'small muted' }, '完整 JSON'), UI.jsonBlock(d)),
        metaLine(q));
      const old = root.querySelector('.card.cx-detail');
      if (old) old.remove();
      dlg.classList.add('cx-detail');
      root.append(dlg);
      dlg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ---------- 一键跑通三幕全流程：固定悬浮总控（挂 body 上跨页存活），
       依次导航到每幕并触发其「一键实跑」；尾流实时滚动显示每次 API 调用，
       每幕页面内还有粘性监控台，逐步展示该步的参数/返回 JSON。 ---------- */
    async function runThreeActs() {
      if (window.SKYTRUST_RUN && window.SKYTRUST_RUN.active) { toast('已有剧本在运行中，请等待完成', 'err'); return; }
      const acts = [
        ['act1', '幕一 · 任务跨域协同（14 步 · 6 次真实跨链）'],
        ['act2', '幕二 · 虫洞攻防剧本（11 步 · 拓扑/风险/实验）'],
        ['act3', '幕三 · 监管密文核查（11 步 · 追踪/授权/开箱/审计）'],
      ];
      let cancelled = false;
      const t0 = Date.now();
      const elapsed = h('span', { class: 'run-elapsed' }, '⏱ 0s');
      const rows = acts.map(([k, name], i) => {
        const ico = h('span', { class: 'rs-ico' }, '○');
        const meta = h('span', { class: 'rs-meta' }, '');
        const row = h('div', { class: 'run-step' }, ico,
          h('span', { class: 'rs-name' }, (i + 1) + '. ' + name),
          h('span', { class: 'rs-right' }, meta));
        return { row, ico, meta };
      });
      const tail = h('div', { class: 'gro-tail' });
      const overlay = h('div', { class: 'card global-run-overlay' },
        h('div', { class: 'run-head' },
          h('b', {}, '▶ 三幕全流程 · 总控'), elapsed,
          h('button', { class: 'btn btn-sm btn-ghost gro-close',
            onClick: () => {
              cancelled = true; overlay.remove(); offTail();
              toast('已取消后续幕（当前幕剧本会自行跑完）', 'err');
            } }, '✕ 取消')),
        h('div', { class: 'run-steps' }, rows.map(r => r.row)),
        h('div', { class: 'small muted', style: { marginTop: '8px' } },
          '实时调用尾流（进入每幕页面可查看逐步监控台：API / 参数 / 返回 / 延迟）：'),
        tail);
      document.body.append(overlay);
      const tick = setInterval(() => { elapsed.textContent = '⏱ ' + Math.round((Date.now() - t0) / 1000) + 's'; }, 500);
      const offTail = API.onCall(r => {
        if (r.path === '/api/chain/status') return;   // 顶部链状态灯的后台心跳
        tail.append(h('div', { class: 'gt-row' },
          r.ok ? h('span', { class: 'badge good' }, h('i', { class: 'bi' }, '✓'))
               : h('span', { class: 'badge critical' }, h('i', { class: 'bi' }, '✕'), String(r.code)),
          h('code', { class: 'mono' }, 'POST ' + r.path),
          h('span', { class: 'rc-ms' }, r.latencyMs + 'ms')));
        while (tail.children.length > 8) tail.firstChild.remove();
        overlay.scrollTop = overlay.scrollHeight;
      });
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      let okAll = true;
      try {
        for (let i = 0; i < acts.length; i++) {
          if (cancelled) break;
          const [key] = acts[i];
          rows[i].ico.textContent = '⏳'; rows[i].row.className = 'run-step running';
          const tAct = Date.now();
          window.SKYTRUST_RUN = null;
          location.hash = '#/' + key;
          await sleep(100);   // 让 hashchange 先触发路由切换
          /* 按幕名精确匹配按钮：切页是异步的，此刻 #page 可能还是上一幕的残留，
             用通用「一键实跑」会误点旧页按钮，导致旧幕脚本重跑而新幕从未启动。 */
          const label = '一键实跑' + (key === 'act1' ? '幕一' : key === 'act2' ? '幕二' : '幕三');
          let btn = null;
          for (let w = 0; w < 100 && !btn; w++) {   // 等待目标幕渲染出其专属按钮
            btn = [...document.querySelectorAll('#page .btn')].find(b => b.textContent.includes(label));
            if (!btn) await sleep(200);
          }
          if (!btn) {
            rows[i].ico.textContent = '✕'; rows[i].row.className = 'run-step error';
            rows[i].meta.textContent = '未找到一键按钮'; okAll = false; continue;
          }
          await sleep(400);   // 等页面异步渲染落定，避免分区未构建完就点击
          btn.click();
          let done = false;
          for (let w = 0; w < 800 && !done && !cancelled; w++) {  // 每幕最长 240s
            done = !!(window.SKYTRUST_RUN && window.SKYTRUST_RUN.active === false && window.SKYTRUST_RUN.act === key);
            if (!done) await sleep(300);
          }
          rows[i].ico.textContent = done ? '✓' : cancelled ? '—' : '✕';
          rows[i].row.className = 'run-step ' + (done ? 'done' : cancelled ? '' : 'error');
          rows[i].meta.textContent = ((Date.now() - tAct) / 1000).toFixed(1) + 's' + (done || cancelled ? '' : ' · 超时');
          if (!done && !cancelled) okAll = false;
        }
      } finally {
        clearInterval(tick); offTail();
        if (!cancelled) {
          location.hash = '#/dashboard';
          const total = Math.round((Date.now() - t0) / 1000);
          overlay.append(h('div', { class: 'run-foot' },
            h('span', { class: 'badge ' + (okAll ? 'good' : 'critical') },
              h('i', { class: 'bi' }, okAll ? '✓' : '✕'), okAll ? '三幕全部完成' : '存在失败步骤'),
            h('span', { class: 'small muted' }, '总耗时 ' + total + 's · 逐步详情见各幕监控台'),
            h('button', { class: 'btn btn-sm btn-ghost gro-close', onClick: () => overlay.remove() }, '关闭')));
          toast(okAll ? '三幕全流程跑通 ✓（总耗时 ' + total + 's）' : '三幕全流程存在失败步骤，详见总控与各幕监控台', okAll ? 'ok' : 'err', 8000);
        }
      }
    }

    load();
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.dashboard = { render };
})();
