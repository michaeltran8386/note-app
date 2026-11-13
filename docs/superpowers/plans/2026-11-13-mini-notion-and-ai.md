# Mini-Notion UX & Local/Cloud AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi trải nghiệm soạn thảo NoteLocal từ cơ chế quy tắc gõ cứng sang tương tác mượt mà chuẩn Notion (Thanh công cụ nổi Bubble Toolbar, Menu lệnh nhanh `/` Slash Commands, Block Drag Handles `⋮⋮`, Caret Boundary Smoothing), đồng thời tích hợp hệ thống Trí tuệ Nhân tạo linh hoạt hỗ trợ cả Local AI (Ollama) lẫn Cloud AI (External API Keys: Gemini, OpenAI, DeepSeek, Groq).

**Architecture:** Mở rộng WebView2 UI frontend với các overlay tương tác linh hoạt (Selection Bubble Toolbar, Slash Command Popover, AI Prompt Streamer), tích hợp HTTP Client tương thích OpenAI format (`/v1/chat/completions`) để kết nối thống nhất cả Ollama localhost lẫn Cloud API. Đồng bộ cài đặt qua `localStorage` và `config.json`. Giữ vững hiệu năng C++ Native, RAM < 60MB và tính năng lưu trữ Markdown 100% cục bộ.

**Tech Stack:** C++17, Win32 API, WebView2 Evergreen, Vanilla JavaScript (ES6+), HTML5 ContentEditable, CSS3 Fluent Dark Theme, OpenAI-compatible REST API (fetch/streaming SSE).

**Spec:** [docs/notion_outputs_reference/05_mini_notion_architecture_proposal.md](../../notion_outputs_reference/05_mini_notion_architecture_proposal.md)

## Global Constraints
- Không phụ thuộc vào thư viện runtime cồng kềnh ngoài; giữ kích thước bộ nhớ RAM luôn dưới 60MB.
- Toàn bộ ghi chú tiếp tục được lưu trữ dưới dạng Markdown cục bộ trong thư mục `notes/` của người dùng.
- Hoạt động 100% offline bình thường kể cả khi không cấu hình AI hoặc khi mất mạng.
- Tuân thủ quy tắc bảo mật: Không bao giờ gửi dữ liệu ghi chú lên mạng trừ khi người dùng chủ động bấm yêu cầu AI hoặc dùng tính năng Share.
- API Key được lưu an toàn trong máy người dùng, không bao giờ lộ ra ngoài.

## Review Focus
1. Bôi đen văn bản nhưng không làm mất con trỏ soạn thảo hoặc vùng chọn khi click các nút trên Bubble Toolbar.
2. Gõ `/` trong ô bảng Table hoặc trong văn bản thường không bị xung đột với phím gõ URL hoặc ký tự `/` thông thường (chỉ kích hoạt ở đầu dòng hoặc sau dấu cách).
3. Local AI (Ollama) không chạy hoặc bị tắt: Ứng dụng phải hiển thị thông báo nhẹ nhàng, không gây đơ treo ứng dụng.
4. Cloud AI trả về lỗi (hết quota, sai API key): Hiển thị Toast thông báo lỗi rõ ràng và giữ nguyên văn bản gốc.
5. Thoát menu Slash hoặc AI bar bằng phím <kbd>Esc</kbd> phải trả lại con trỏ chính xác về vị trí đang gõ.

---

### Task 1: Floating Selection Bubble Toolbar & Smart Caret Boundaries

**Files:**
- Modify: `src/ui/assets/index.html` (Thêm markup HTML cho `#bubble-toolbar`)
- Modify: `src/ui/assets/style.css` (Style cho `#bubble-toolbar`, animation nổi, nút bấm)
- Modify: `src/ui/assets/editor.js` (Bắt sự kiện `selectionchange` / `mouseup`, định vị toolbar theo tọa độ selection, các lệnh Bold, Italic, Strikethrough, To-Do, Bullet, Link, AI Prompt)
- Test: `scratch/test_bubble_toolbar.js`

**Interfaces:**
- Consumes: `window.getSelection()`, `Range.getBoundingClientRect()`, `document.execCommand()`
- Produces: `showBubbleToolbar(rect)`, `hideBubbleToolbar()`, `formatSelection(command)`

- [ ] **Step 1: Write the failing test for Bubble Toolbar logic**

```javascript
// scratch/test_bubble_toolbar.js
const assert = require('assert');
// Test range detection and command formatting
function shouldShowToolbar(selectionText) {
    return selectionText && selectionText.trim().length > 0;
}
assert.strictEqual(shouldShowToolbar(""), false);
assert.strictEqual(shouldShowToolbar("   "), false);
assert.strictEqual(shouldShowToolbar("hello world"), true);
console.log("Test 1 passed!");
```

- [ ] **Step 2: Run test to verify behavior**

Run: `node scratch/test_bubble_toolbar.js`
Expected: PASS

- [ ] **Step 3: Implement Bubble Toolbar HTML & CSS & JS in `src/ui/assets/`**
  - Thêm thẻ `<div id="bubble-toolbar" class="bubble-toolbar hidden">...</div>` vào `index.html`.
  - Thêm styling CSS dark mode với viền sáng, đổ bóng Fluent, bo góc 8px trong `style.css`.
  - Thêm listener `selectionchange` và `mouseup` trong `editor.js` để tính tọa độ và hiển thị toolbar ngay trên đoạn bôi đen.

- [ ] **Step 4: Verify visually and test interactions**
  - Đảm bảo click vào nút Bold/Italic/Strike/Todo/Bullet/Link áp dụng đúng định dạng mà không làm mất focus.

- [ ] **Step 5: Commit**

```bash
git add src/ui/assets/index.html src/ui/assets/style.css src/ui/assets/editor.js
git commit -m "feat: add floating selection bubble toolbar and smooth caret boundaries"
```

---

### Task 2: Slash Command Menu (`/`) & Block Drag Handles (`⋮⋮`)

**Files:**
- Modify: `src/ui/assets/index.html` (Thêm markup `#slash-menu` và `#block-drag-handle`)
- Modify: `src/ui/assets/style.css` (Style cho dropdown menu `/` và biểu tượng tay cầm `⋮⋮`)
- Modify: `src/ui/assets/editor.js` (Bắt ký tự `/` đầu dòng, điều hướng phím mũi tên, chèn khối tương ứng)
- Test: `scratch/test_slash_menu.js`

**Interfaces:**
- Consumes: `editor.addEventListener("keydown")`, `editor.addEventListener("input")`
- Produces: `openSlashMenu(coords, query)`, `closeSlashMenu()`, `selectSlashItem(index)`

- [ ] **Step 1: Write test for slash trigger query matching**

```javascript
// scratch/test_slash_menu.js
const assert = require('assert');
const items = [
    { id: 'text', label: 'Văn bản thường', keywords: ['text', 'p'] },
    { id: 'todo', label: 'Việc cần làm', keywords: ['todo', 'task', 'check'] },
    { id: 'bullet', label: 'Gạch đầu dòng', keywords: ['bullet', 'ul', 'list'] },
    { id: 'number', label: 'Danh sách đánh số', keywords: ['number', 'ol'] },
    { id: 'table', label: 'Bảng biểu', keywords: ['table', 'bang'] },
    { id: 'quote', label: 'Trích dẫn', keywords: ['quote'] },
    { id: 'callout', label: 'Hộp nổi bật', keywords: ['callout', 'box'] },
    { id: 'divider', label: 'Đường phân cách', keywords: ['divider', 'hr', 'line'] },
    { id: 'ai', label: 'Trí tuệ nhân tạo (AI)', keywords: ['ai', 'ask', 'prompt'] }
];
function filterItems(query) {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it => it.id.includes(q) || it.keywords.some(k => k.includes(q)));
}
assert.strictEqual(filterItems('to').length, 1);
assert.strictEqual(filterItems('ai')[0].id, 'ai');
console.log("Slash menu filter tests passed!");
```

- [ ] **Step 2: Run test to verify behavior**

Run: `node scratch/test_slash_menu.js`
Expected: PASS

- [ ] **Step 3: Implement Slash Menu & Block Handles in `editor.js` & `style.css`**
  - Khi gõ `/` ở đầu đoạn hoặc sau dòng trống, mở popover `#slash-menu`.
  - Cho phép dùng <kbd>↑</kbd> <kbd>↓</kbd> để di chuyển, <kbd>Enter</kbd> để chọn khối.
  - Hỗ trợ chuột rê qua dòng hiển thị tay cầm `⋮⋮` ở mép lề trái.

- [ ] **Step 4: Verify keyboard navigation & block conversion**

- [ ] **Step 5: Commit**

```bash
git add src/ui/assets/index.html src/ui/assets/style.css src/ui/assets/editor.js
git commit -m "feat: add slash command menu and block action handles"
```

---

### Task 3: Local AI & Cloud AI Configuration in Settings Modal

**Files:**
- Modify: `src/ui/assets/index.html` (Thêm tab/mục Cấu hình AI trong `#settings-modal`)
- Modify: `src/ui/assets/style.css` (Giao diện cấu hình radio/dropdown, inputs, status badges)
- Modify: `src/ui/assets/editor.js` (Lưu/đọc cấu hình AI từ `localStorage`: provider, localUrl, localModel, cloudUrl, cloudKey, cloudModel, nút Test Connection)
- Test: `scratch/test_ai_config.js`

**Interfaces:**
- Consumes: `localStorage.getItem("note_local_ai_config")`
- Produces: `getAIConfig()`, `saveAIConfig(cfg)`, `testAIConnection(provider, cfg)`

- [ ] **Step 1: Write test for AI Config normalization and default fallbacks**

```javascript
// scratch/test_ai_config.js
const assert = require('assert');
function normalizeAIConfig(raw) {
    return {
        provider: raw.provider || 'local', // 'local' | 'cloud' | 'off'
        localUrl: raw.localUrl || 'http://localhost:11434/v1',
        localModel: raw.localModel || 'llama3.2',
        cloudUrl: raw.cloudUrl || 'https://generativelanguage.googleapis.com/v1beta/openai/',
        cloudKey: raw.cloudKey || '',
        cloudModel: raw.cloudModel || 'gemini-1.5-flash'
    };
}
const cfg = normalizeAIConfig({});
assert.strictEqual(cfg.provider, 'local');
assert.strictEqual(cfg.localUrl, 'http://localhost:11434/v1');
assert.strictEqual(cfg.cloudModel, 'gemini-1.5-flash');
console.log("AI config normalization tests passed!");
```

- [ ] **Step 2: Run test to verify**

Run: `node scratch/test_ai_config.js`
Expected: PASS

- [ ] **Step 3: Implement Settings UI & Test Connection handler**
  - Thêm form chọn Local AI / Cloud AI / Off vào Settings modal.
  - Nút "Kiểm tra kết nối" gửi request ping thử nghiệm (tới `/models` hoặc request completion test) và hiển thị badge xanh/đỏ phản hồi.

- [ ] **Step 4: Verify saving and loading settings**

- [ ] **Step 5: Commit**

```bash
git add src/ui/assets/index.html src/ui/assets/style.css src/ui/assets/editor.js
git commit -m "feat: add local and cloud AI provider configuration in settings"
```

---

### Task 4: AI Prompt Bar, Streaming Execution & Presets

**Files:**
- Modify: `src/ui/assets/index.html` (Thêm popup `#ai-prompt-bar` với input prompt và chip preset)
- Modify: `src/ui/assets/style.css` (Styling AI bar với viền tím/cyan gradient, typing indicator)
- Modify: `src/ui/assets/editor.js` (Xử lý gọi API `/v1/chat/completions` hỗ trợ streaming text hoặc batch text, chèn kết quả trực tiếp vào editor)
- Test: `scratch/test_ai_client.js`

**Interfaces:**
- Consumes: `getAIConfig()`, `fetch(endpoint, options)`
- Produces: `executeAIPrompt(prompt, contextText, onChunk, onDone, onError)`

- [ ] **Step 1: Write test for AI request payload generation**

```javascript
// scratch/test_ai_client.js
const assert = require('assert');
function buildChatPayload(model, userPrompt, contextText) {
    const messages = [
        { role: 'system', content: 'You are NoteLocal AI assistant. Provide concise, clean markdown output.' }
    ];
    if (contextText) {
        messages.push({ role: 'user', content: `Context:\n${contextText}\n\nTask: ${userPrompt}` });
    } else {
        messages.push({ role: 'user', content: userPrompt });
    }
    return { model, messages, stream: true };
}
const p = buildChatPayload('llama3.2', 'Tóm tắt', 'Nội dung dài...');
assert.strictEqual(p.model, 'llama3.2');
assert.strictEqual(p.messages.length, 2);
console.log("Chat payload tests passed!");
```

- [ ] **Step 2: Run test to verify**

Run: `node scratch/test_ai_client.js`
Expected: PASS

- [ ] **Step 3: Implement AI Prompt Bar & Streaming in `editor.js`**
  - Hỗ trợ phím tắt <kbd>Ctrl + J</kbd> hoặc lệnh `/ai` hoặc nút `✨ AI` trên Bubble toolbar.
  - Hiển thị chip preset nhanh: "Viết tiếp", "Tóm tắt", "Sửa ngữ pháp & chính tả", "Dịch sang tiếng Anh/Việt".
  - Chèn văn bản do AI sinh ra mượt mà theo thời gian thực (streaming text typing) kèm nút "Chấp nhận", "Thử lại", "Hủy".

- [ ] **Step 4: Verify interactions and error handling**

- [ ] **Step 5: Commit**

```bash
git add src/ui/assets/index.html src/ui/assets/style.css src/ui/assets/editor.js
git commit -m "feat: implement AI prompt bar with streaming execution and quick presets"
```

---

### Task 5: C++ Serialization Verification, Web Viewer Sync & Unit Tests

**Files:**
- Modify: `docs/index.html` & `docs/app.js` & `docs/style.css` (Đồng bộ các định dạng mới trên Web Viewer)
- Modify: `tests/test_markdown_engine.cpp` (Bảo đảm 100% tests pass)
- Run: Tất cả 8 bộ test suite C++

- [ ] **Step 1: Run C++ test suite to verify no regressions**

Run: `Get-ChildItem -Path "build\bin\test_*.exe" | ForEach-Object { & $_.FullName }`
Expected: All 8 test suites pass 100%.

- [ ] **Step 2: Bump cache version to `v=2.8`** in `index.html` and `docs/index.html`

- [ ] **Step 3: Commit**

```bash
git add docs/ tests/ src/ui/assets/
git commit -m "chore: sync web viewer and verify C++ unit test suites"
```

---

### Task 6: Build Release Binary, Live Testing, Documentation & Graphify

**Files:**
- Modify: `README.md` (Cập nhật toàn bộ tính năng Bubble Toolbar, Slash Commands, AI Local/Cloud)
- Execute: `cmake --build build --config Release --target NoteLocal`
- Execute: Khởi chạy `NoteLocal.exe` mới
- Execute: `graphify update .`

- [ ] **Step 1: Build Release binary**
- [ ] **Step 2: Verify process launch via WMI**
- [ ] **Step 3: Run `graphify update .`**
- [ ] **Step 4: Commit and Push to `origin/main`**

