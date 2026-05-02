#!/usr/bin/env python3
"""Extract font sizes from Word document for styling - reads from stdin"""
import sys
import json
import base64
from docx import Document
from docx.shared import Pt
from io import BytesIO

def extract_docx_font_sizes(docx_base64):
    """Extract font sizes from Word document"""
    try:
        doc_bytes = base64.b64decode(docx_base64)
        doc = Document(BytesIO(doc_bytes))
        
        style_sizes = {}
        for style in doc.styles:
            if hasattr(style, 'font') and style.font.size:
                try:
                    size_pt = style.font.size.pt
                    style_sizes[style.name] = round(size_pt * 1.333)  # Convert pt to px
                except:
                    pass
        
        # If no styles found, return default
        if not style_sizes:
            style_sizes = {'Normal': 14}  # Default ~10.5pt
        
        return {'success': True, 'styleSizes': style_sizes}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    # Read base64 content from stdin
    base64_content = sys.stdin.read().strip()
    if not base64_content:
        print(json.dumps({'error': 'No base64 content provided'}))
        sys.exit(1)
    
    result = extract_docx_font_sizes(base64_content)
    print(json.dumps(result))
