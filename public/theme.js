/**
 * Theme Manager for ecolony.cn
 * Handles light/dark mode toggle with localStorage persistence
 */
(function() {
    'use strict';

    var STORAGE_KEY = 'ecolony_theme';
    var LIGHT = 'light';
    var DARK = 'dark';

    // Apply saved theme immediately (before DOM renders)
    function applySavedTheme() {
        var saved = localStorage.getItem(STORAGE_KEY) || DARK;
        if (saved === LIGHT) {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    // Toggle between light and dark
    function toggleTheme() {
        var current = document.documentElement.getAttribute('data-theme');
        var next = current === LIGHT ? DARK : LIGHT;
        if (next === LIGHT) {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem(STORAGE_KEY, next);
        updateIcons(next);
    }

    // Update icon display
    function updateIcons(theme) {
        document.querySelectorAll('.theme-toggle-icon').forEach(function(el) {
            el.textContent = theme === LIGHT ? '🌙' : '☀️';
        });
        document.querySelectorAll('.theme-toggle-label').forEach(function(el) {
            el.textContent = theme === LIGHT ? '深色模式' : '浅色模式';
        });
    }

    // Find logout button in a container (works across all pages)
    function findLogoutBtn(container) {
        // Try by class first
        var btn = container.querySelector('.logout-btn-nav');
        if (btn) return btn;
        // Try by onclick attribute
        btn = container.querySelector('button[onclick*="logout"]');
        if (btn) return btn;
        // Try by text content
        var buttons = container.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            var text = buttons[i].textContent || '';
            if (text.indexOf('退出') !== -1 || text.indexOf('登出') !== -1) {
                return buttons[i];
            }
        }
        return null;
    }

    // Inject toggle button into nav-links (desktop)
    function injectNavToggle() {
        var navLinks = document.querySelector('nav .nav-links');
        if (!navLinks) return;

        var current = localStorage.getItem(STORAGE_KEY) || DARK;
        var btn = document.createElement('button');
        btn.className = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.innerHTML = '<span class="theme-toggle-icon">' + (current === LIGHT ? '🌙' : '☀️') + '</span>';
        btn.addEventListener('click', toggleTheme);

        // Insert before logout button, or append at end
        var logoutBtn = findLogoutBtn(navLinks);
        if (logoutBtn) {
            navLinks.insertBefore(btn, logoutBtn);
        } else {
            navLinks.appendChild(btn);
        }
    }

    // Inject toggle button into nav bar (mobile) — before hamburger button
    function injectMobileToggle() {
        var nav = document.querySelector('nav');
        if (!nav) return;

        var menuToggle = nav.querySelector('.menu-toggle');
        if (!menuToggle) return;

        var current = localStorage.getItem(STORAGE_KEY) || DARK;
        var btn = document.createElement('button');
        btn.className = 'theme-toggle-mobile';
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.innerHTML = '<span class="theme-toggle-icon">' + (current === LIGHT ? '🌙' : '☀️') + '</span>';
        btn.style.cssText = 'display:none;background:none;border:1px solid rgba(200,215,240,0.15);color:rgba(200,215,240,0.6);cursor:pointer;font-size:16px;padding:6px 8px;border-radius:10px;line-height:1;align-items:center;justify-content:center;margin-left:auto;margin-right:20px;';
        btn.addEventListener('click', function() {
            toggleTheme();
        });

        // Insert before menu-toggle button
        nav.insertBefore(btn, menuToggle);

        // Inject responsive CSS to show/hide on appropriate breakpoints
        var style = document.createElement('style');
        style.textContent = '@media(min-width:769px){.theme-toggle-mobile{display:none!important}}@media(max-width:768px){.theme-toggle-mobile{display:flex!important}}';
        document.head.appendChild(style);
    }

    // Initialize
    applySavedTheme();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            injectNavToggle();
            injectMobileToggle();
        });
    } else {
        injectNavToggle();
        injectMobileToggle();
    }
})();
