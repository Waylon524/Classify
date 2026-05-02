#!/usr/bin/env python3
"""Inject light mode theme CSS and JS into all ecolony.cn HTML files."""
import os
import re

PUBLIC_DIR = '/var/www/ecolony.cn/public'

CSS_TAG = '    <link rel="stylesheet" href="/theme-light.css">'
JS_TAG = '    <script src="/theme.js"></script>'

html_files = [f for f in os.listdir(PUBLIC_DIR) if f.endswith('.html')]

for fname in sorted(html_files):
    fpath = os.path.join(PUBLIC_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False

    # Inject CSS before </head> if not already present
    if '/theme-light.css' not in content:
        content = content.replace('</head>', CSS_TAG + '\n</head>', 1)
        modified = True

    # Inject JS before </head> (after CSS) if not already present
    if '/theme.js' not in content:
        content = content.replace('</head>', JS_TAG + '\n</head>', 1)
        modified = True

    if modified:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'✅ {fname}')
    else:
        print(f'⏭️  {fname} (already injected)')
