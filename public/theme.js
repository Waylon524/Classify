/**
 * Theme toggle — light (cream canvas) / dark mode
 */
(function() {
  'use strict';
  var KEY = 'classify_theme';
  var DARK = 'dark';
  var LIGHT = 'light';
  var ICONS = {};
  ICONS[DARK] = '☀️';
  ICONS[LIGHT] = '🌙';

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

  // All body-dependent init must wait for DOM
  function init() {
    if (localStorage.getItem(KEY) === DARK) {
      document.body.classList.add(DARK);
    }
    updateButtons();
  }

  // Event delegation works immediately on document
  document.addEventListener('click', function(e) {
    if (e.target.closest('.theme-toggle-btn')) {
      toggle();
    }
  });

  window.toggleTheme = toggle;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
