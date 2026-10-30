/* login.js — 四端门户演示登录门（配合 css/login.css；挂载于四端 HTML 雪碧图之后、壳层之前）。
   定位：纯前端演示门槛——不进数据库、不注册账号，账号 test / 密码 test 写死；
   四端登录态互相独立、不共享（四个独立前端系统），按端存 sessionStorage
   （skytrust-login-<端id>），会话级：关标签页/关浏览器后需重新登录。
   index.html 内部总控导航页不挂登录门。
   诚实注记：这是演示观感门槛，不是安全边界——直接改 sessionStorage 即可绕过，
   系统内亦无任何真实用户数据可泄露。
   防误挂保护：页面 body 无 d-op/d-au/d-rg/d-ct 任一类名时本模块整体不动作。 */
(function () {
  'use strict';
  var CONF = {
    'd-op': { id: 'op', name: '云巡信链 · 无人机综合服务', sub: '运营商端 · 实名登记 / 飞行申请 / 运行识别', icon: 'd-ico-drone' },
    'd-au': { id: 'au', name: '云巡信链 · 管理当局', sub: '管理端 · 审核签发 / 链网安全运营', icon: 'd-ico-shield' },
    'd-rg': { id: 'rg', name: '云巡信链 · 跨域可信监管', sub: '监管端 · 全域态势 / 全生命周期审计', icon: 'd-ico-radar' },
    'd-ct': { id: 'ct', name: '云巡信链 · 证照中心', sub: '证照链端 · 通行证签发 / 证照查验', icon: 'd-ico-cert' }
  };
  var cls = Object.keys(CONF).filter(function (c) {
    return document.body.classList.contains(c);
  })[0];
  if (!cls) return;   /* 非四端门户页面：不挂登录门 */
  var KEY = 'skytrust-login-' + CONF[cls].id;

  /* 「退出登录」委托监听（四端侧栏底部 data-logout 入口；清本端登录态并整页重载） */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-logout]');
    if (!t) return;
    e.preventDefault();
    try { sessionStorage.removeItem(KEY); } catch (_) {}
    location.reload();
  });

  try {
    if (sessionStorage.getItem(KEY) === '1') return;   /* 本标签页已登录：直通 */
  } catch (_) { /* 隐私模式等取不到 sessionStorage：照常出登录页，只是不记状态 */ }

  var c = CONF[cls];
  var veil = document.createElement('div');
  veil.className = 'lg-veil';
  veil.innerHTML =
    '<div class="lg-card">' +
      '<div class="lg-brand"><svg class="d-ico"><use href="#' + c.icon + '"></use></svg>' + c.name + '</div>' +
      '<div class="lg-sub">' + c.sub + '</div>' +
      '<form class="lg-form" autocomplete="off">' +
        '<div class="lg-field"><label for="lg-user">账号</label>' +
          '<input id="lg-user" value="test" autocomplete="username"></div>' +
        '<div class="lg-field"><label for="lg-pass">密码</label>' +
          '<input id="lg-pass" type="password" placeholder="请输入密码" autocomplete="current-password"></div>' +
        '<button class="lg-btn" type="submit">登 录</button>' +
        '<div class="lg-err" id="lg-err" role="alert"></div>' +
      '</form>' +
      '<div class="lg-hint">演示环境 · 账号 test · 密码 test</div>' +
    '</div>';
  document.body.appendChild(veil);
  document.body.classList.add('lg-locked');

  var passEl = veil.querySelector('#lg-pass');
  passEl.focus();
  veil.querySelector('.lg-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = veil.querySelector('#lg-user').value.trim();
    if (u === 'test' && passEl.value === 'test') {
      try { sessionStorage.setItem(KEY, '1'); } catch (_) {}
      document.body.classList.remove('lg-locked');
      veil.classList.add('lg-out');
      setTimeout(function () { veil.remove(); }, 260);
    } else {
      veil.querySelector('#lg-err').textContent = '账号或密码不正确——演示环境仅受理 test / test';
      passEl.value = '';
      passEl.focus();
    }
  });
})();
