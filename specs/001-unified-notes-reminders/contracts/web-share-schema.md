# Contract: Web Share Payload & Universal Viewer Schema

**Feature Branch**: `001-unified-notes-reminders`  
**Date**: 2026-11-07  
**Status**: Completed  

---

## 1. Web Share Payload Schema (Cloud Document)

When a note is shared, the published JSON snapshot conforms to this schema:

```json
{
  "$schema": "https://notelocal.app/schemas/share-v1.json",
  "version": "1.0",
  "shareId": "nl_share_7b9a2c",
  "publishedAt": "2026-11-07T13:15:00Z",
  "meta": {
    "title": "Kế hoạch tuần 46",
    "theme": "dark",
    "generator": "NoteLocal Win11 v1.0"
  },
  "content": {
    "markdown": "# Kế hoạch tuần 46\n\n- [ ] Họp đối tác @14:30 15/11\n- [x] Gửi hợp đồng\n\n![image|400px](https://i.ibb.co/xyz123/img_1.png)",
    "images": [
      {
        "originalName": "img_1.png",
        "url": "https://i.ibb.co/xyz123/img_1.png",
        "dimensions": { "width": "400px" }
      }
    ]
  }
}
```

---

## 2. Universal Web Viewer Requirements

The GitHub Pages / Web Viewer client (`index.html?share=<id>`) implements the following rendering guarantees:

1. **Zero Registration / Zero Friction**: Recipient requires no account, login, or cookies to view.
2. **100% Visual Fidelity**:
   - Headings, italics, bold, code blocks rendered via standard Markdown parser.
   - Checkboxes rendered with interactive-looking checkmarks (read-only for recipients).
   - Images loaded via HTTPS CDN URLs, automatically scaled to viewport with double-click lightbox modal.
   - Time/reminder tags rendered as subtle badge pills (e.g. `[14:30 15/11]`).
3. **Responsive Mobile & Desktop**:
   - Max readable container width (720px) centered on screen.
   - High contrast Dark Mode matching Note Local's desktop theme `#18181b`.
4. **Copy Link & Action Buttons**:
   - Header includes "Copy Link", "Raw Markdown", and "Download as .md".

