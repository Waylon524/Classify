/**
 * Theme toggle — light (cream canvas) / dark mode
 */
(function() {
  'use strict';
  var KEY = 'classify_theme';
  var current = localStorage.getItem(KEY);

  if (current === 'dark') {
    document.body.classList.add('dark');
  }

  window.toggleTheme = function() {
    var isDark = document.body.classList.toggle('dark');
    localStorage.setItem(KEY, isDark ? 'dark' : 'light');
    updateToggleButtons();
  };

  function updateToggleButtons() {
    var isDark = document.body.classList.contains('dark');
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(function(btn) {
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.title = isDark ? '切换到浅色模式' : '切换到深色模式';
    });
  }

  document.addEventListener('DOMContentLoaded', updateToggleButtons);
})();
