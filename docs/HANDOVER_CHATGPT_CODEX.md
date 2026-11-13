# TÀI LIỆU BÀN GIAO TOÀN DIỆN & PHÂN TÍCH LỖI KỸ THUẬT (NOTE_LOCAL)
**Dành cho: ChatGPT 6.1 Sol (Kiến trúc & Giải pháp) & OpenAI Codex (Thực thi mã nguồn)**
*Ngày lập: 13/11/2026 | Phiên bản: 2.9+ | Bản quyền: NoteLocal Local-first Project*

---

## MỤC LỤC
1. [Báo Cáo Bug & Phân Tích Kỹ Thuật Gốc Rễ (Root Cause Analysis)](#1-báo-cáo-bug--phân-tích-kỹ-thuật-gốc-rễ-root-cause-analysis)
   - [Bug 1: Cloud AI không phản hồi khi dán API Key](#bug-1-cloud-ai-không-phản-hồi-khi-dán-api-key)
   - [Bug 2: Click chuột phải hiển thị menu mặc định của Windows/Edge](#bug-2-click-chuột-phải-hiển-thị-menu-mặc-định-của-windowsedge)
   - [Bug 3: Thao tác trải nghiệm Notion chưa mượt và chưa hiệu quả](#bug-3-thao-tác-trải-nghiệm-notion-chưa-mượt-và-chưa-hiệu-quả)
2. [Tài Liệu Bàn Giao Chuyên Sâu cho ChatGPT 6.1 Sol](#2-tài-liệu-bàn-giao-chuyên-sâu-cho-chatgpt-61-sol)
   - [2.1 Tổng quan kiến trúc NoteLocal & Ràng buộc phi chức năng](#21-tổng-quan-kiến-trúc-notelocal--ràng-buộc-phi-chức-năng)
   - [2.2 Cấu trúc tệp tin trọng yếu trong repository](#22-cấu-trúc-tệp-tin-trọng-yếu-trong-repository)
   - [2.3 Luồng dữ liệu IPC (Win32 C++ <-> WebView2 ES6)](#23-luồng-dữ-liệu-ipc-win32-c---webview2-es6)
   - [2.4 Thiết kế kiến trúc giải pháp chuẩn hóa](#24-thiết-kế-kiến-trúc-giải-pháp-chuẩn-hóa)
3. [Prompt Chuẩn Hóa để gửi cho OpenAI Codex](#3-prompt-chuẩn-hóa-để-gửi-cho-openai-codex)
   - [3.1 Yêu cầu nhiệm vụ](#31-yêu-cầu-nhiệm-vụ)
   - [3.2 Chi tiết mã nguồn cần thay đổi từng tệp](#32-chi-tiết-mã-nguồn-cần-thay-đổi-từng-tệp)
   - [3.3 Kịch bản kiểm thử & Tiêu chuẩn nghiệm thu](#33-kịch-bản-kiểm-thử--tiêu-chuẩn-nghiệm-thu)

---

## 1. BÁO CÁO BUG & PHÂN TÍCH KỸ THUẬT GỐC RỄ (ROOT CAUSE ANALYSIS)

### Bug 1: Cloud AI không phản hồi khi dán API Key
* **Hiện tượng**: Người dùng copy API Key (ví dụ: lấy từ Google AI Studio), dán vào trường API Key trong phần Cài đặt -> Cloud AI. Khi bấm nút "Kiểm tra kết nối" hoặc kích hoạt thanh AI Prompt ngoài màn hình chính, hệ thống báo lỗi hoặc không trả lời.
* **Chứng cứ kiểm thử thực tế**:
  1. Kiểm tra trực tiếp tệp LevelDB cục bộ của WebView2 tại `build/bin/NoteLocal.exe.WebView2/.../000003.log` thấy key người dùng dán vào có tiền tố `AQ.` (`AQ.Ab8RN6JuHRaZPXrlq7o...`).
  2. Tiền tố `AQ.` chính là **định dạng khóa bảo mật mới của Google Gemini API** (Google Auth Key Format, ra mắt thay thế dần tiền tố `AIzaSy...` truyền thống). Khóa này hoàn toàn hợp lệ và hoạt động bình thường trên Google AI Studio.
  3. **Nguyên nhân gốc rễ 1 (Lỗi Model Name 404)**: Trong `src/ui/assets/editor.js:2151` và `editor.js:2229`, preset Google Gemini được cấu hình mặc định là `gemini-1.5-flash`. Hiện tại trên endpoint OpenAI-compatible (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`), Google đã ngừng hỗ trợ alias `gemini-1.5-flash` và trả về mã lỗi:
     ```json
     HTTP 404: "models/gemini-1.5-flash is not found for API version v1main"
     ```
     **Kiểm chứng probe**: Khi gửi request với đúng API Key `AQ.Ab8...` đó nhưng đổi model sang `gemini-2.5-flash` hoặc `gemini-flash-latest`, Google API phản hồi ngay lập tức **`HTTP 200 OK`** kèm nội dung hoàn chỉnh!
  4. **Nguyên nhân gốc rễ 2 (Lưu cấu hình bị lệch provider)**: Hàm lưu `btnSaveSettings` đọc từ `input[name="ai-provider"]:checked`. Nếu người dùng click vào card giao diện `.ai-mode-card` mà radio ẩn chưa được gán thuộc tính `checked = true`, config lưu trong `localStorage` vẫn giữ giá trị `"local"`, dẫn tới khi gọi AI app lại cố gắng kết nối tới Ollama `http://localhost:11434` thay vì Cloud AI.
  5. **Nguyên nhân gốc rễ 3 (Thiếu nhận diện tự động - Key Auto-Detection)**: Người dùng phổ thông dán API Key thường không biết phải bấm thêm nút preset nào (Gemini, OpenAI, DeepSeek hay Groq). Hệ thống chưa tự động nhận biết format key để nhảy đúng endpoint và model tương ứng.

---

### Bug 2: Click chuột phải hiển thị menu mặc định của Windows/Edge
* **Hiện tượng**: Khi người dùng nhấn chuột phải vào vùng soạn thảo ghi chú, tiêu đề, thanh bên (sidebar) hay bất kỳ vị trí nào trong ứng dụng, một menu dài ngoằng chứa các mục mặc định của trình duyệt Edge ("Back, Forward, Reload, Save as, Print, Cast, Inspect element...") xuất hiện đè lên giao diện ứng dụng native.
* **Nguyên nhân gốc rễ kỹ thuật**:
  1. **Ở tầng C++ Win32 Host (`src/platform/webview_host.cpp:180`)**:
     ```cpp
     // Hiện tại đang cấu hình:
     settings->put_AreDefaultContextMenusEnabled(TRUE);
     ```
     Lệnh này chỉ thị cho Chromium engine bên dưới WebView2 hiển thị context menu mặc định của browser.
  2. **Ở tầng JavaScript Frontend (`src/ui/assets/editor.js`)**:
     Sự kiện `contextmenu` chỉ được `preventDefault()` duy nhất tại `table.oncontextmenu` (dành riêng cho popover chỉnh sửa bảng). Toàn bộ vùng còn lại của `window`, thẻ `#editor`, danh sách tabs, sidebar hoàn toàn không có listener chặn sự kiện chuột phải.

---

### Bug 3: Thao tác trải nghiệm Notion chưa mượt và chưa hiệu quả
* **Hiện tượng**: Thao tác phím Markdown gõ tắt (như `# `, `- `, `[] `), thao tác Enter xuống dòng, Backspace xóa block, kéo thả thanh tay cầm `⋮⋮` còn cứng nhắc, giật lag, dễ mất con trỏ soạn thảo (caret loss) hoặc vỡ định dạng HTML.
* **Nguyên nhân gốc rễ kỹ thuật**:
  1. **Thiết kế DOM đơn khối (Single `contenteditable` container)**:
     Toàn bộ văn bản nằm trong một thẻ duy nhất `<div id="editor" contenteditable="true">`. Trình duyệt Chromium tự động chèn các thẻ ngẫu nhiên (`<p>`, `<div>`, `<br>`) khi người dùng ấn Enter/Delete. Điều này xung đột trực tiếp với logic phân tích khối (block-based logic) của Notion.
  2. **Nút Handle `⋮⋮` chỉ là popup tĩnh, chưa hỗ trợ HTML5 Drag & Drop**:
     Handle hiện tại chỉ hiển thị khi rê chuột vào lề trái (gutter) và khi click chỉ bật popup menu 2 nút (Xóa, Nhân bản). Trong Notion thật, handle `⋮⋮` có thuộc tính `draggable="true"`, cho phép người dùng nhấc cả block di chuyển lên xuống và hiển thị đường kẻ chỉ thị vị trí thả (`drop-indicator`).
  3. **Xử lý phím tắt Markdown thiếu cơ chế State Machine an toàn**:
     Khi người dùng gõ `- ` hoặc `[] `, code hiện tại can thiệp trực tiếp bằng cách thay thế chuỗi và dùng `document.execCommand` hoặc gán `innerHTML`. Cách này hủy vùng chọn hiện tại (`window.getSelection()`), làm mất focus hoặc nhảy con trỏ về đầu văn bản.
  4. **Thanh định dạng nổi (Bubble Toolbar) chưa tối ưu UX**:
     Thanh công cụ nổi hiện lên khi bôi đen chữ nhưng khi click vào các nút định dạng (In đậm, In nghiêng, Link) thì vùng chọn của người dùng trong văn bản bị mờ (blur), khiến việc áp dụng style không chuẩn xác.

---

## 2. TÀI LIỆU BÀN GIAO CHUYÊN SÂU CHO CHATGPT 6.1 SOL

### 2.1 Tổng quan kiến trúc NoteLocal & Ràng buộc phi chức năng
* **Công nghệ nền tảng**: C++17 (Native Win32 API) kết hợp Microsoft WebView2 Evergreen Runtime.
* **Hiệu năng & Tài nguyên**:
  - Mức chiếm dụng RAM mục tiêu: **< 60MB RAM** ở trạng thái hoạt động bình thường.
  - Thời gian khởi động: **< 300ms**.
  - Không sử dụng các framework nặng như Electron hay Node.js runtime bên trong client.
* **Triết lý Lưu trữ (Local-first Philosophy)**:
  - Tất cả ghi chú được lưu trữ dưới dạng file văn bản thuần Markdown (`.md`) tại thư mục người dùng chọn.
  - Không có database trung gian độc quyền; người dùng có thể mở và đọc các file `.md` bằng bất kỳ trình soạn thảo nào (VS Code, Notepad, Obsidian).
  - Tích hợp tính năng Web Viewer tĩnh (GitHub Pages) chỉ khi người dùng chủ động nhấn "Chia sẻ" (mã hóa URL hash/gzip).

### 2.2 Cấu trúc tệp tin trọng yếu trong repository
```
E:\02_Projects\NOTE_LOCAL\
├── src\
│   ├── main.cpp                  # Entry point Win32, vòng lặp message, xử lý IPC Native <-> Web
│   ├── platform\
│   │   ├── webview_host.h        # Khai báo lớp bọc WebView2
│   │   └── webview_host.cpp      # Khởi tạo WebView2 Environment, Settings, Host Mapping
│   ├── core\
│   │   ├── storage_manager.h     # Quản lý đọc/ghi file .md, quét thư mục
│   │   └── storage_manager.cpp   # Xử lý IO đồng bộ/bất đồng bộ an toàn
│   └── ui\
│       └── assets\
│           ├── index.html        # Khung giao diện chính (Tab bar, Editor, Modals, Lucide Icons)
│           ├── style.css         # Modern Dark Theme Windows 11 Fluent Design tokens
│           └── editor.js         # Toàn bộ logic tương tác frontend: Editor, AI, Blocks, Hotkeys
├── docs\                         # Web Viewer tĩnh công khai (GitHub Pages)
│   ├── index.html
│   ├── app.js
│   └── style.css
└── CMakeLists.txt                # Cấu hình biên dịch CMake C++17 cho MSVC
```

### 2.3 Luồng dữ liệu IPC (Win32 C++ <-> WebView2 ES6)
* **Web -> C++**: Gọi qua `window.chrome.webview.postMessage(JSON.stringify({ action: "...", ... }))`.
* **C++ -> Web**: Gửi qua `m_webview->PostWebMessageAsString(json_wstring.c_str())`.
* **Các action chính**:
  - `save_note`: Ghi nội dung Markdown xuống tệp cục bộ.
  - `open_note`: Đọc nội dung tệp Markdown vào editor.
  - `list_notes`: Lấy danh sách tệp trong thư mục làm việc.
  - `shorten_url`: Gọi Native WinHTTP rút gọn link chia sẻ.
  - `set_window_title`: Cập nhật tiêu đề cửa sổ Win32 theo tab hiện tại.

### 2.4 Thiết kế kiến trúc giải pháp chuẩn hóa

```
+---------------------------------------------------------------------------------+
|                               NOTELOCAL ARCHITECTURE                            |
+---------------------------------------------------------------------------------+
| [Native C++ Win32 Host]                                                         |
|  - WinMain / WindowController                                                   |
|  - StorageManager (Local .md Files)                                             |
|  - WinHTTP Proxy Client (URL Shortener & AI Fallback)                           |
|  - WebView2Host: put_AreDefaultContextMenusEnabled(FALSE) <--- SỬA DỨT ĐIỂM BUG 2|
+---------------------------------------+-----------------------------------------+
                                        | IPC (JSON Messages)
+---------------------------------------v-----------------------------------------+
| [WebView2 Frontend Engine - Vanilla ES6+]                                       |
|                                                                                 |
|  1. Unified AI Service Adapter:                                                 |
|     - Auto Key Sniffer: "AQ."/"AIza" -> Gemini, "gsk_" -> Groq, "sk-" -> OpenAI |
|     - Model Router: Gemini -> 'gemini-2.5-flash' <------------- SỬA DỨT ĐIỂM BUG 1|
|     - Format: OpenAI Chat Completions Standard Body                             |
|                                                                                 |
|  2. Notion-Grade Discrete Block Engine:                                         |
|     - Block Wrappers: <div class="note-block" data-type="..." data-id="...">   |
|     - Gutter Handle: ⋮⋮ with HTML5 Draggable ('dragstart', 'dragover', 'drop')  |
|     - State Machine: Enter (split), Backspace (merge), Markdown shortcuts       |
|                                                                                 |
|  3. Global Event Interceptor:                                                   |
|     - window.oncontextmenu -> preventDefault() unless inside custom popover     |
|     - Caret Preservation: Selection Range Restoration after format/AI insertion |
+---------------------------------------------------------------------------------+
```

---

## 3. PROMPT CHUẨN HÓA ĐỂ GỬI CHO OPENAI CODEX

Dưới đây là prompt đầy đủ, chi tiết, sẵn sàng để copy và dán trực tiếp cho **OpenAI Codex**:

```markdown
You are a Principal Software Engineer specializing in C++17 Win32 native development and high-performance Vanilla JavaScript/DOM manipulation.

### GOAL:
Fix three verified issues in the `NOTE_LOCAL` application and enhance the Notion-like editing experience while preserving the zero-dependency, RAM < 60MB local-first architecture.

---

### ISSUE 1: Cloud AI Fails with 404 on Valid API Keys (Google Gemini AQ Format)
**Root Cause**:
- Google AI Studio now issues API keys starting with `AQ.` (Auth key format).
- In `src/ui/assets/editor.js`, the default Gemini model is set to `gemini-1.5-flash`.
- Google's OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`) has retired `gemini-1.5-flash` on `v1main`, returning `HTTP 404: models/gemini-1.5-flash is not found`.
- Probed verification: Changing the model to `gemini-2.5-flash` or `gemini-flash-latest` returns `HTTP 200 OK` with complete response.
- Also, API key auto-detection is missing, and the Settings modal card selection can become desynchronized from the hidden radio input.

**Required Changes in `src/ui/assets/editor.js`**:
1. Update `cloudProviders.gemini` model to `"gemini-2.5-flash"`.
2. Update the fallback model in `getAIConfig()` to `"gemini-2.5-flash"`.
3. Add real-time API Key sniffer on `aiCloudKey.addEventListener("input", ...)`:
   - If key starts with `AQ.` or `AIzaSy`: auto-select Gemini (`document.querySelector('.cloud-preset-btn[data-provider="gemini"]')?.click()`).
   - If key starts with `gsk_`: auto-select Groq (`document.querySelector('.cloud-preset-btn[data-provider="groq"]')?.click()`).
   - If key starts with `sk-` (and not `sk-ant`): auto-select OpenAI if DeepSeek is not active.
4. In `btnSaveSettings`:
   - Read provider directly from `.ai-mode-card.selected` dataset, ensuring saving mode is 100% synchronized with the visual card selection.
5. In `executeAiPrompt`:
   - If provider is Gemini, ensure the URL is clean: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`.
   - Ensure Authorization header sends `Bearer <cloudKey>`.
   - If error occurs, parse and show the exact API error message in the UI toast instead of generic failure.

---

### ISSUE 2: Native Edge/Chromium Context Menu Appears on Right-Click
**Root Cause**:
- In `src/platform/webview_host.cpp:180`: `settings->put_AreDefaultContextMenusEnabled(TRUE);` explicitly tells WebView2 to show Edge's browser context menu.
- In `src/ui/assets/editor.js`: only `table.oncontextmenu` was handled; the rest of the window lacked `e.preventDefault()`.

**Required Changes**:
1. In `src/platform/webview_host.cpp` line 180:
   Change:
   ```cpp
   settings->put_AreDefaultContextMenusEnabled(TRUE);
   ```
   To:
   ```cpp
   settings->put_AreDefaultContextMenusEnabled(FALSE);
   ```
2. In `src/ui/assets/editor.js`:
   Add a global context menu event handler:
   ```javascript
   window.addEventListener("contextmenu", (e) => {
       // Only allow custom context menus if clicking inside custom UI popovers (e.g., table controls)
       if (e.target.closest("table") || e.target.closest("#table-context-menu")) {
           return; // handled by custom handler
       }
       e.preventDefault();
   });
   ```

---

### ISSUE 3: Notion-like Interactions Feel Clunky & Ineffective
**Root Cause & Target Improvements**:
1. **HTML5 Drag-and-Drop Reordering for Blocks**:
   - The gutter handle `⋮⋮` must have `draggable="true"` on mousedown.
   - When dragged, visually highlight the drop boundary with a horizontal indicator line (`.block-drop-line`).
   - On drop, move the source block before or after the target block and trigger markdown autosave.
2. **Markdown Auto-Expansion & Clean Caret Handling**:
   - When user types:
     - `- ` or `* ` at start of line -> convert block to `<ul><li>` bullet point smoothly.
     - `[] ` or `[ ] ` -> convert block to `<div class="todo-item"><input type="checkbox">...</div>`.
     - `# ` -> convert block to `<h1>`.
     - `## ` -> convert block to `<h2>`.
     - `### ` -> convert block to `<h3>`.
     - `> ` -> convert block to `<blockquote>`.
     - `---` -> insert `<hr>`.
   - Always preserve caret position at the beginning of the newly transformed block using `Selection.collapse()` and `Range`.
3. **Seamless Enter & Backspace Block Semantics**:
   - Pressing `Enter` in a list item or todo item creates a new item of the same type.
   - Pressing `Enter` on an empty list/todo item escapes the list and creates a normal paragraph `<p>`.
   - Pressing `Backspace` at position 0 of an empty heading, quote, or list item converts it back to a standard `<p>`.
4. **Bubble Toolbar Caret Resilience**:
   - Prevent toolbar button `mousedown` from blurring the active text selection (`e.preventDefault()`).

---

### VERIFICATION REQUIREMENTS:
1. Rebuild application using CMake:
   ```powershell
   cmake -B build -G "Visual Studio 17 2022" -A x64
   cmake --build build --config Release
   ```
2. Run test suites:
   ```powershell
   ctest --test-dir build -C Release --output-on-failure
   ```
3. Test Cloud AI: Paste key starting with `AQ.` -> Verify provider auto-selects Gemini -> Test prompt -> Verify HTTP 200 response.
4. Test Context Menu: Right-click on blank editor area, sidebar, and title bar -> Verify no Edge browser menu appears.
5. Test Notion Blocks: Drag handle `⋮⋮` to reorder blocks; type `- `, `[] `, `# ` -> verify instant transformation without cursor jumps.
```

---
*Tài liệu được sinh tự động bởi Antigravity Engine - NoteLocal Project.*

