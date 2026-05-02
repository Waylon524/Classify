/**
 * 站点配置初始化 — 读取 config.json 并应用到页面元素
 * 引入此脚本 + /config.js 即可自动应用所有自定义配置
 */
document.addEventListener('DOMContentLoaded', function () {
  var C = window.__SITE_CONFIG__;
  if (!C) return;

  var path = window.location.pathname;

  // 确定当前 section
  var currentSection = null;
  for (var key in C.sections) {
    if (C.sections[key].page === path) { currentSection = C.sections[key]; break; }
  }

  // 1. 设置 document.title
  if (currentSection) {
    document.title = currentSection.name + ' · ' + C.site.name;
  } else if (path === '/index.html' || path === '/') {
    document.title = C.site.name + ' · ' + C.site.nameCN;
  } else if (path === '/login.html') {
    document.title = C.login.title;
  }

  // 2. 更新导航栏链接文字（桌面 + 移动端）
  var allNavLinks = document.querySelectorAll('nav .nav-links a, .mobile-menu a');
  for (var i = 0; i < allNavLinks.length; i++) {
    var a = allNavLinks[i];
    var href = a.getAttribute('href');
    for (var key in C.sections) {
      if (href === C.sections[key].page) {
        a.textContent = C.sections[key].name;
        break;
      }
    }
  }

  // 3. 更新 logo
  var logoText = document.querySelector('nav .logo a:last-child');
  if (logoText) logoText.textContent = C.site.name;

  // 4. 首页：hero 区域 + 功能卡片
  if (path === '/index.html' || path === '/') {
    var badge = document.querySelector('.hero-badge');
    if (badge) badge.textContent = C.site.heroBadge;
    var title = document.querySelector('.hero-title');
    if (title) title.textContent = C.site.heroTitle;
    var subtitle = document.querySelector('.hero-subtitle');
    if (subtitle) subtitle.textContent = C.site.heroSubtitle;

    // 更新功能卡片标题
    var cards = document.querySelectorAll('.menu-card');
    cards.forEach(function (card) {
      var onclick = card.getAttribute('onclick') || '';
      var match = onclick.match(/href='([^']+)'/);
      if (match) {
        for (var key in C.sections) {
          if (match[1] === C.sections[key].page) {
            var titleEl = card.querySelector('.title');
            if (titleEl) titleEl.textContent = C.sections[key].name;
            break;
          }
        }
      }
    });
  }

  // 5. 登录页
  if (path === '/login.html') {
    var headings = document.querySelectorAll('h1');
    headings.forEach(function (h) {
      if (h.textContent.indexOf('e 生菌落') !== -1 || h.textContent.indexOf('Ecolony') !== -1) {
        h.textContent = C.login.heading;
      }
    });
  }

  // 6. 页面标题区
  if (currentSection && currentSection.page !== '/index.html' && currentSection.page !== '/login.html') {
    var pageH1 = document.querySelector('.page-header h1');
    if (pageH1) {
      pageH1.textContent = currentSection.icon + ' ' + currentSection.name;
    }
    // 特殊：navi 页面和 add-schedule 页面没有 .page-header
    var heroH1 = document.querySelector('.hero-title');
    if (heroH1 && C.sections.navi.page === path) {
      heroH1.innerHTML = '<span>e</span> ' + C.sections.navi.name.slice(2);
    }
  }
});
