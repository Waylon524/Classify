/**
 * 统一登录状态验证
 * 检查 localStorage 中的 token 是否有效，无效则自动跳转登录页
 */
(function () {
  var TOKEN_KEY = 'classify_token';
  var LOGIN_PAGE = '/login.html';

  var token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = LOGIN_PAGE + '?redirect=' + encodeURIComponent(window.location.href);
    return;
  }

  // 异步验证 token 是否仍然有效
  fetch('/api/check-login', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function (res) {
    if (!res.ok) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('classify_name');
      localStorage.removeItem('classify_student_id');
      window.location.href = LOGIN_PAGE + '?redirect=' + encodeURIComponent(window.location.href);
    }
  }).catch(function () {
    // 网络错误时不清除 token，可能是服务器暂时不可用
  });
})();
