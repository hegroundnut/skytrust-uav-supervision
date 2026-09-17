/* api.js —— 统一 API 客户端：全部端点 POST+JSON，同源 /api 由 serve-frontend 代理。 */
(function () {
  'use strict';

  const listeners = [];
  let lastLatency = null;

  /**
   * call('/api/xxx', {…}) → Promise<result>
   * result = { ok, code, message, data, trace_id, timestamp, latencyMs, httpStatus, raw }
   * 网络层失败也会 resolve（ok=false, code=-1），页面统一按 result 渲染，不抛异常。
   */
  async function call(path, body) {
    const t0 = performance.now();
    let httpStatus = 0, raw = null;
    try {
      const resp = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body === undefined ? {} : body),
      });
      httpStatus = resp.status;
      const text = await resp.text();
      try { raw = JSON.parse(text); } catch (_) { raw = { code: -2, message: text.slice(0, 300), data: null }; }
    } catch (e) {
      raw = { code: -1, message: '后端不可达：' + e.message + '（请确认 start-backend-real.sh 与 serve-frontend 已启动）', data: null };
    }
    const latencyMs = Math.round(performance.now() - t0);
    lastLatency = latencyMs;
    const result = {
      ok: raw.code === 0,
      code: raw.code,
      message: raw.message || '',
      data: raw.data,
      trace_id: raw.trace_id || '',
      timestamp: raw.timestamp || '',
      latencyMs,
      httpStatus,
      raw,
    };
    listeners.forEach(fn => { try { fn(result); } catch (_) {} });
    return result;
  }

  function onCall(fn) { listeners.push(fn); }
  function getLastLatency() { return lastLatency; }

  window.API = { call, onCall, getLastLatency };
})();
