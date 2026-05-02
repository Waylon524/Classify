/**
 * Theme toggle — light (cream canvas) / dark mode
 * Uses event delegation, works regardless of script load order
 */
(function() {
  'use strict';
  var KEY = 'classify_theme';
  var DARK = 'dark';
  var LIGHT = 'light';
  var ICONS = {};
  ICONS[DARK] = '☀️';
  ICONS[LIGHT] = '🌙';

  // Apply saved theme
  if (localStorage.getItem(KEY) === DARK) {
    document.body.classList.add(DARK);
  }

  function getMode() {
    return document.body.classList.contains(DARK) ? DARK : LIGHT;
  }

  function setMode(mode) {
    if (mode === DARK) {
      document.body.classList.add(DARK);
    } else {
      document.body.classList.remove(DARK);
    }
    localStorage.setItem(KEY, mode);
    updateButtons();
  }

  function toggle() {
    setMode(getMode() === DARK ? LIGHT : DARK);
  }

  function updateButtons() {
    var mode = getMode();
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].textContent = ICONS[mode];
      buttons[i].title = mode === DARK ? '切换到浅色模式' : '切换到深色模式';
    }
  }

  // Event delegation — no inline onclick needed
  document.addEventListener('click', function(e) {
    if (e.target.closest('.theme-toggle-btn')) {
      toggle();
    }
  });

  // Export for programmatic use
  window.toggleTheme = toggle;

  // Update button icons once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateButtons);
  } else {
    updateButtons();
  }

  // Re-update after config-init.js modifies DOM
  document.addEventListener('DOMContentLoaded', updateButtons);
})();
