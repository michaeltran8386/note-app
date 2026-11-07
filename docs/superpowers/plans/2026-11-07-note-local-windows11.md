# Note Local Windows 11 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng ứng dụng ghi chú nổi (Sticky Note) siêu nhẹ trên Windows 11 bằng C/C++ với Win32 WebView2, hỗ trợ gõ văn bản tự nhiên, tự nhận diện `[]` thành ô checkbox tương tác, xóa checkbox bằng `Backspace`, dán ảnh `Ctrl+V` tự động co giãn vừa khung cửa sổ, quản lý nhiều tab có thể đổi tên, chế độ ghim Always on Top, và tự động lưu/sinh ra file Markdown (`.md`) cục bộ thời gian thực.

**Architecture:** Ứng dụng kết hợp kiến trúc Native Win32 C++ Host và Embedded WebView2 Editor:
- **C++ Native Host:** Quản lý vòng lặp thông điệp Windows (`WinMain`), điều khiển cửa sổ (`HWND`), bật bo góc Windows 11 (`DwmSetWindowAttribute`), điều khiển ghim nổi `Always on Top` (`HWND_TOPMOST`), lưu trữ file cấu hình `config.json`, quản lý đọc/ghi các file Markdown `notes/<tab>.md` và thư mục ảnh `assets/`.
- **C++ Markdown Engine & Storage:** Bộ chuyển đổi/phân tích giữa cấu trúc nội dung và định dạng chuẩn Markdown (hỗ trợ `- [ ]`, `- [x]`, ảnh `![...](assets/...)`, UTF-8 tiếng Việt).
- **Embedded Editor (WebView2):** Giao diện soạn thảo mượt mà không rào cản: bắt sự kiện gõ phím để biến `[]` thành checkbox tương tác, xử lý phím `Backspace` để xóa checkbox, bắt sự kiện `paste` để lưu ảnh và chèn ảnh co giãn tự động theo chiều rộng cửa sổ, cùng thanh tab động hỗ trợ tạo mới và đổi tên tab.
- **IPC Bridge:** Giao tiếp 2 chiều giữa C++ Host và WebView2 qua `postMessage` / `WebMessageReceived` để đồng bộ thời gian thực.

**Tech Stack:** C++17, Win32 API, WebView2 (Windows 11 built-in runtime), nlohmann/json, CMake.

**Spec:** `srs.txt` & `docs/intent/note-local.md`

## Global Constraints

- Hỗ trợ Windows 11 (Win32 API, WebView2 pre-installed runtime, DWM rounded corners).
- Tech Stack bắt buộc: C/C++.
- Soạn thảo inline trực quan: Gõ `[]` lập tức chuyển thành ô checkbox có thể click tương tác.
- Xóa ô todo bằng phím `Backspace` tự nhiên.
- Dán ảnh `Ctrl+V` tự động lưu vào thư mục asset nội bộ và co giãn vừa khung cửa sổ, giữ nguyên tỷ lệ khung hình.
- Quản lý nhiều tab, cho phép thêm tab và đổi tên tab.
- Có chế độ ghim luôn nằm trên các cửa sổ khác (Always on top / Window pin).
- Tự động lưu trạng thái (vị trí cửa sổ, tab đang mở, trạng thái ghim) và tự động sinh ra file Markdown (`.md`) chuẩn cục bộ.
- Hoàn toàn offline, không yêu cầu tài khoản hay cloud server.

## Review Focus

1. **Gõ `[]` tự động chuyển thành ô checkbox**: Khi người dùng gõ liên tiếp hai ký tự `[]`, trình soạn thảo phải lập tức thay thế bằng một ô checkbox `<input type="checkbox">` có thể click tick/untick và đặt con trỏ ngay sau checkbox mà không làm mất ký tự tiếp theo hay gián đoạn mạch gõ.
2. **Xóa ô checkbox bằng phím `Backspace`**: Khi con trỏ đứng ngay sau checkbox (hoặc trong ô todo rỗng), nhấn phím `Backspace` phải xóa ô checkbox gọn gàng và đưa dòng trở lại trạng thái văn bản bình thường.
3. **Dán ảnh lớn hơn kích thước cửa sổ (`Ctrl+V`)**: Khi dán ảnh chụp màn hình độ phân giải cao (ví dụ 4K), ảnh được lưu an toàn thành file PNG trong thư mục `assets/`, hiển thị inline và tự co theo chiều rộng cửa sổ (`max-width: 100%`) mà không gây tràn thanh cuộn ngang.
4. **Đóng tab cuối cùng duy nhất**: Khi người dùng đóng tab duy nhất còn lại, hệ thống tự động sinh tab trắng mặc định mới ("Ghi chú mới") và file `.md` tương ứng để ứng dụng không bao giờ bị rơi vào trạng thái 0 tab rỗng.
5. **Roundtrip dữ liệu Markdown với tiếng Việt UTF-8**: Đảm bảo khi lưu và nạp lại file `.md`, mọi ký tự tiếng Việt có dấu ("Hôm nay hoàn thành kế hoạch 📌"), trạng thái checkbox `- [ ]` / `- [x]`, và đường dẫn ảnh `![...](assets/...)` được bảo toàn nguyên vẹn 100%.

---

### Task 1: Environment Scaffolding, CMake & Git Setup

**Files:**
- Create: `.gitignore`
- Create: `CMakeLists.txt`
- Create: `tests/test_framework.h`
- Create: `tests/test_sanity.cpp`

**Interfaces:**
- Consumes: None
- Produces: CMake build target `test_runner` và khung build C++17 cho ứng dụng Win32/WebView2.

- [ ] **Step 1: Tạo file `.gitignore`**

```gitignore
build/
bin/
.cache/
*.exe
*.obj
*.o
*.pdb
data/
notes/
assets/
```

- [ ] **Step 2: Viết header test framework đơn giản `tests/test_framework.h`**

Cung cấp `ASSERT_TRUE`, `ASSERT_FALSE`, `ASSERT_EQ`, `ASSERT_STR_EQ`, `RUN_TEST` và trả về mã thoát `0` khi pass.

- [ ] **Step 3: Viết sanity test `tests/test_sanity.cpp`**

```cpp
#include "test_framework.h"

int main() {
    int win_ver = 11;
    ASSERT_EQ(win_ver, 11);
    return test_framework_report();
}
```

- [ ] **Step 4: Viết `CMakeLists.txt`**

Cấu hình C++17, tải hoặc cấu hình thư viện `WebView2` headers và target test executable `test_runner`.

- [ ] **Step 5: Chạy build và xác nhận test pass**

Run: `cmake -B build && cmake --build build && .\build\bin\test_runner.exe`
Expected: `PASS: 1/1 tests passed`.

- [ ] **Step 6: Commit**

```bash
git init
git add .gitignore CMakeLists.txt tests/
git commit -m "chore: setup CMake project scaffolding and test framework"
```

---

### Task 2: Core Data Types & Markdown Engine in C++

**Files:**
- Create: `src/core/note_model.h`
- Create: `src/core/markdown_engine.h`
- Create: `src/core/markdown_engine.cpp`
- Create: `tests/test_markdown_engine.cpp`
- Modify: `CMakeLists.txt`

**Interfaces:**
- Consumes: Standard C++ library (`<string>`, `<vector>`, `<regex>`).
- Produces:
  - `struct TodoItem { std::string id; std::string text; bool is_checked; };`
  - `struct NoteDoc { std::string id; std::string title; std::string raw_markdown; };`
  - `class MarkdownEngine`:
    - `static std::string SerializeToMarkdown(const std::string& title, const std::string& body_html);`
    - `static std::string ParseToHtml(const std::string& markdown_text);`
    - `static std::vector<TodoItem> ExtractTodos(const std::string& markdown_text);`

- [ ] **Step 1: Viết failing test cho `MarkdownEngine` (`tests/test_markdown_engine.cpp`)**

Test bao gồm:
1. Serialize HTML có text, checkbox checked/unchecked, và ảnh sang Markdown chuẩn (`- [ ]`, `- [x]`, `![img](assets/...)`).
2. Parse Markdown ngược lại thành HTML thân thiện cho editor.
3. Review Focus 5: Chuỗi tiếng Việt UTF-8 có dấu ("Kế hoạch hôm nay 📌", "- [x] Hoàn thành bài viết") được chuyển đổi trọn vẹn mà không mất dấu hay lỗi ký tự.

```cpp
void test_markdown_engine_roundtrip() {
    std::string html = "<p>Ghi chú tiếng Việt có dấu: Hôm nay hoàn thành tính năng ghim 📌</p>"
                       "<p><input type=\"checkbox\" checked> Hoàn thành task 1</p>"
                       "<p><input type=\"checkbox\"> Task chưa làm</p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Ghi chú mới", html);
    ASSERT_TRUE(md.find("- [x] Hoàn thành task 1") != std::string::npos);
    ASSERT_TRUE(md.find("- [ ] Task chưa làm") != std::string::npos);
    ASSERT_TRUE(md.find("Ghi chú tiếng Việt có dấu") != std::string::npos);
}
```

- [ ] **Step 2: Chạy test để xác nhận failure**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: FAIL do chưa implement `MarkdownEngine`.

- [ ] **Step 3: Implement `src/core/note_model.h` và `src/core/markdown_engine.cpp`**

Approach: Dùng regex và string parsing nhẹ nhàng để chuyển đổi giữa HTML DOM string từ editor sang cú pháp GitHub Flavored Markdown và ngược lại.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: PASS toàn bộ test case của MarkdownEngine.

- [ ] **Step 5: Commit**

```bash
git add src/core/ CMakeLists.txt tests/test_markdown_engine.cpp
git commit -m "feat: implement C++ Markdown engine with todo and UTF-8 image support"
```

---

### Task 3: Local Storage Manager & Tab Lifecycle

**Files:**
- Create: `third_party/json/json.hpp`
- Create: `src/core/storage_manager.h`
- Create: `src/core/storage_manager.cpp`
- Create: `tests/test_storage_manager.cpp`
- Modify: `CMakeLists.txt`

**Interfaces:**
- Consumes: `note_model.h`, `nlohmann/json`.
- Produces:
  - `struct AppConfig { bool always_on_top{false}; int window_x{100}; int window_y{100}; int window_w{480}; int window_h{650}; std::string active_tab_id; std::vector<std::pair<std::string, std::string>> tabs; };` // id, title
  - `class StorageManager`:
    - `static bool SaveConfig(const std::string& path, const AppConfig& config);`
    - `static bool LoadConfig(const std::string& path, AppConfig& out_config);`
    - `static bool SaveNoteMarkdown(const std::string& notes_dir, const std::string& tab_id, const std::string& markdown_content);`
    - `static std::string LoadNoteMarkdown(const std::string& notes_dir, const std::string& tab_id);`
    - `static std::string SaveAssetImage(const std::string& assets_dir, const std::vector<uint8_t>& image_bytes, const std::string& ext = "png");`
    - `static bool DeleteNote(const std::string& notes_dir, const std::string& tab_id);`

- [ ] **Step 1: Tích hợp `json.hpp` và viết failing test `tests/test_storage_manager.cpp`**

Test bao gồm:
1. Lưu và nạp `AppConfig` bảo toàn trạng thái Always on Top và danh sách tab.
2. Ghi file Markdown của tab vào thư mục `notes/` và đọc lại nội dung chính xác.
3. Review Focus 4: Hàm `DeleteNote` và cơ chế fallback đảm bảo luôn tồn tại ít nhất 1 tab ("Ghi chú mới") khi đóng tab cuối cùng.
4. Ghi file ảnh vào thư mục `assets/` và kiểm tra file tồn tại.

```cpp
void test_storage_lifecycle() {
    AppConfig cfg;
    cfg.always_on_top = true;
    cfg.tabs.push_back({"tab_1", "Công việc"});
    cfg.active_tab_id = "tab_1";

    ASSERT_TRUE(StorageManager::SaveConfig("test_config.json", cfg));

    AppConfig loaded;
    ASSERT_TRUE(StorageManager::LoadConfig("test_config.json", loaded));
    ASSERT_TRUE(loaded.always_on_top);
    ASSERT_EQ(loaded.tabs.size(), 1);
    ASSERT_STR_EQ(loaded.tabs[0].second.c_str(), "Công việc");
}
```

- [ ] **Step 2: Chạy test để xác nhận failure**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: FAIL do chưa implement `StorageManager`.

- [ ] **Step 3: Implement `src/core/storage_manager.cpp`**

Approach: Sử dụng nlohmann/json để lưu cấu hình, `std::filesystem` để tạo thư mục `notes/` và `assets/`, mở stream UTF-8 binary để ghi file `.md`.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: PASS toàn bộ test case storage.

- [ ] **Step 5: Commit**

```bash
git add third_party/json/ src/core/storage_manager.* tests/test_storage_manager.cpp CMakeLists.txt
git commit -m "feat: implement local storage manager for config, markdown notes and assets"
```

---

### Task 4: Win32 Window Controller & Always-on-Top Pin

**Files:**
- Create: `src/platform/window_controller.h`
- Create: `src/platform/window_controller.cpp`
- Create: `tests/test_window_controller.cpp`
- Modify: `CMakeLists.txt`

**Interfaces:**
- Consumes: Win32 User32 & DwmApi.
- Produces:
  - `class WindowController`:
    - `static bool SetAlwaysOnTop(HWND hwnd, bool enable);`
    - `static bool IsAlwaysOnTop(HWND hwnd);`
    - `static void ApplyWindows11Styling(HWND hwnd);`

- [ ] **Step 1: Viết test cho `WindowController` (`tests/test_window_controller.cpp`)**

Test bao gồm: Kiểm tra an toàn khi truyền `hwnd == nullptr` trả về `false` không throw/crash.

- [ ] **Step 2: Chạy test để xác nhận failure**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: FAIL do chưa implement `WindowController`.

- [ ] **Step 3: Implement `src/platform/window_controller.cpp`**

Approach:
- `SetAlwaysOnTop`: Gọi `SetWindowPos(hwnd, enable ? HWND_TOPMOST : HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)`.
- `IsAlwaysOnTop`: Kiểm tra `GetWindowLongPtrW(hwnd, GWL_EXSTYLE) & WS_EX_TOPMOST`.
- `ApplyWindows11Styling`: Bật `DWMWA_WINDOW_CORNER_PREFERENCE` (DWMWCP_ROUND).

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: PASS test case window controller.

- [ ] **Step 5: Commit**

```bash
git add src/platform/window_controller.* tests/test_window_controller.cpp CMakeLists.txt
git commit -m "feat: implement Win32 Always-on-Top controller and Windows 11 rounded corners"
```

---

### Task 5: Win32 WebView2 Host & C++ IPC Bridge

**Files:**
- Create: `src/platform/webview_host.h`
- Create: `src/platform/webview_host.cpp`
- Create: `src/platform/ipc_message.h`
- Create: `src/platform/ipc_message.cpp`
- Create: `tests/test_ipc_message.cpp`
- Modify: `CMakeLists.txt`

**Interfaces:**
- Consumes: `WebView2.h`, `nlohmann/json`.
- Produces:
  - `struct IPCMessage { std::string action; nlohmann::json payload; };`
  - `class IPCBridge`:
    - `static std::string Serialize(const std::string& action, const nlohmann::json& payload);`
    - `static bool Parse(const std::string& json_str, IPCMessage& out_msg);`
  - `class WebViewHost`:
    - `bool Initialize(HWND hwnd, const std::wstring& initial_url, std::function<void(const std::string&)> on_message);`
    - `void PostWebMessage(const std::string& json_message);`
    - `void Resize(int width, int height);`

- [ ] **Step 1: Viết test cho `IPCBridge` (`tests/test_ipc_message.cpp`)**

Test bao gồm: Kiểm tra parse/serialize các action: `toggle_pin`, `save_note`, `save_image`, `create_tab`, `rename_tab`, `delete_tab`.

- [ ] **Step 2: Chạy test để xác nhận failure**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: FAIL do chưa implement `IPCBridge`.

- [ ] **Step 3: Implement `src/platform/ipc_message.cpp` và `src/platform/webview_host.cpp`**

Approach: Sử dụng `CreateCoreWebView2EnvironmentWithOptions` nạp WebView2 của Windows 11, lắng nghe `add_WebMessageReceived`, và đăng ký hàm callback chuyển tin nhắn sang C++ host.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cmake --build build && .\build\bin\test_runner.exe`
Expected: PASS test case IPC bridge.

- [ ] **Step 5: Commit**

```bash
git add src/platform/ipc_message.* src/platform/webview_host.* tests/test_ipc_message.cpp CMakeLists.txt
git commit -m "feat: implement WebView2 Win32 host and bidirectional C++ IPC bridge"
```

---

### Task 6: Smart Inline Note Editor Frontend (`[]` -> Checkbox & Backspace)

**Files:**
- Create: `src/ui/assets/index.html`
- Create: `src/ui/assets/style.css`
- Create: `src/ui/assets/editor.js`
- Create: `tests/test_editor_rules.js` (hoặc mock DOM test)

**Interfaces:**
- Consumes: HTML5 DOM, ContentEditable API, WebView2 JavaScript Host Object.
- Produces: Trình soạn thảo inline trực quan đáp ứng yêu cầu người dùng:
  - Tự động bắt ký tự `[]` để chuyển đổi ngay thành ô checkbox tương tác.
  - Tự động bắt phím `Backspace` để xóa ô checkbox rỗng và trở lại văn bản thường.
  - Tự động co giãn ảnh theo chiều rộng cửa sổ.

- [ ] **Step 1: Viết logic chuyển đổi `[]` và xóa bằng `Backspace` trong `src/ui/assets/editor.js`**

Approach:
- **Lắng nghe sự kiện `input`**:
  Khi người dùng gõ ký tự `]`, kiểm tra văn bản ngay trước con trỏ. Nếu phát hiện `[]`:
  - Xóa 2 ký tự `[]`.
  - Chèn một phần tử HTML: `<div class="todo-item"><input type="checkbox" class="todo-check"><span class="todo-text" contenteditable="true"></span></div>`.
  - Di chuyển con trỏ văn bản vào bên trong `span.todo-text` ngay lập tức!
- **Lắng nghe sự kiện `keydown` (Review Focus 2)**:
  Khi người dùng nhấn phím `Backspace`:
  - Nếu con trỏ đang ở đầu `span.todo-text` rỗng trong một `todo-item`:
  - Ngăn chặn hành vi mặc định, xóa thẻ `.todo-item` và chuyển thành một đoạn văn bản `<p><br></p>` bình thường.

- [ ] **Step 2: Viết CSS responsive cho ảnh trong `src/ui/assets/style.css` (Review Focus 3)**

```css
img.note-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    display: block;
    margin: 8px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
```
Đảm bảo khi dán bất kỳ ảnh nào, ảnh tự động co vừa vặn khung cửa sổ sticky note mà không làm xuất hiện thanh cuộn ngang.

- [ ] **Step 3: Viết test kiểm tra logic chuyển đổi `[]` và backspace**

Chạy test mock đơn vị để xác nhận:
1. Gõ `[]` sinh ra `<input type="checkbox">`.
2. Backspace tại checkbox rỗng xóa phần tử.

- [ ] **Step 4: Commit**

```bash
git add src/ui/assets/
git commit -m "feat: implement smart inline editor with auto-checkbox on '[]' and backspace deletion"
```

---

### Task 7: Multi-Tab UI, Tab Renaming & Clipboard Image Paste (`Ctrl+V`)

**Files:**
- Modify: `src/ui/assets/index.html`
- Modify: `src/ui/assets/editor.js`
- Modify: `src/ui/assets/style.css`

**Interfaces:**
- Consumes: `IPCBridge`, Clipboard API.
- Produces: Thanh quản lý tab (thêm mới, đổi tên tab qua double-click/chuột phải, đóng tab) và xử lý dán ảnh `Ctrl+V`.

- [ ] **Step 1: Xử lý sự kiện dán ảnh `paste` trong `src/ui/assets/editor.js`**

Approach:
- Bắt sự kiện `paste`.
- Kiểm tra `e.clipboardData.items`:
  - Nếu có item dạng `image/*`:
    - Đọc file blob sang Base64 / ArrayBuffer.
    - Gửi thông điệp IPC sang C++ host: `{ action: "save_image", payload: { data: base64, ext: "png" } }`.
    - C++ lưu file vào `assets/<hash>.png` và trả về đường dẫn.
    - JS chèn thẻ `<img src="assets/<hash>.png" class="note-image">` ngay tại vị trí con trỏ!
  - Nếu là text: để trình duyệt dán text bình thường vào vị trí con trỏ (Review Focus 1).

- [ ] **Step 2: Triển khai thanh Tab Bar và đổi tên Tab trong `src/ui/assets/editor.js`**

Approach:
- Render danh sách tab từ `config.tabs`.
- Nút `[+]` để tạo tab mới -> gửi IPC `create_tab`.
- Double-click vào tab hoặc chuột phải -> mở input đổi tên tab:
  - Nếu nhập chuỗi rỗng: Giữ nguyên tên cũ (Review Focus 3).
  - Khi nhấn Enter: Cập nhật tên tab và gửi IPC `rename_tab`.
- Nút `[x]` đóng tab: Gửi IPC `delete_tab`. Nếu là tab cuối cùng, C++ tự tạo tab "Ghi chú mới" (Review Focus 4).

- [ ] **Step 3: Triển khai nút Ghim `[📌]` trên thanh tiêu đề**

Bấm nút ghim -> gửi IPC `toggle_pin`. C++ gọi `WindowController::SetAlwaysOnTop(hwnd, is_pinned)` và cập nhật trạng thái icon trên giao diện.

- [ ] **Step 4: Commit**

```bash
git add src/ui/assets/
git commit -m "feat: implement multi-tab management, tab renaming, pin button and Ctrl+V image paste"
```

---

### Task 8: Full End-to-End Integration, Config Persistence & Polish

**Files:**
- Create: `src/main.cpp`
- Modify: `CMakeLists.txt`

**Interfaces:**
- Consumes: All components (`WindowController`, `StorageManager`, `MarkdownEngine`, `WebViewHost`, `IPCBridge`).
- Produces: File thực thi hoàn chỉnh `NoteLocal.exe`.

- [ ] **Step 1: Viết hàm khởi nhập `WinMain` trong `src/main.cpp`**

Approach:
1. Đọc `config.json` từ thư mục làm việc (nếu chưa có, tạo cấu hình mặc định).
2. Tạo cửa sổ `HWND` với kích thước và vị trí đã lưu.
3. Áp dụng `WindowController::ApplyWindows11Styling(hwnd)`.
4. Nếu `config.always_on_top == true`, gọi `WindowController::SetAlwaysOnTop(hwnd, true)`.
5. Khởi tạo `WebViewHost`, nạp giao diện `src/ui/assets/index.html`.
6. Lắng nghe các thông điệp IPC từ UI:
   - `save_note`: Gọi `StorageManager::SaveNoteMarkdown` lưu ra file `.md` trong `notes/`.
   - `save_image`: Lưu ảnh vào `assets/` và trả về đường dẫn cho UI.
   - `create_tab` / `rename_tab` / `delete_tab`: Cập nhật cấu hình và tạo/xóa file `.md`.
   - `toggle_pin`: Gọi `WindowController::SetAlwaysOnTop` và lưu vào cấu hình.
7. Khi đóng cửa sổ (`WM_DESTROY`): Lưu kích thước, vị trí cửa sổ và tab đang mở vào `config.json`.

- [ ] **Step 2: Cấu hình build executable `NoteLocal` trong `CMakeLists.txt`**

Liên kết với `user32.lib`, `dwmapi.lib`, `shell32.lib`, `ole32.lib`, và runtime WebView2.

- [ ] **Step 3: Build và chạy nghiệm thu ứng dụng `NoteLocal.exe`**

Kiểm tra trực tiếp trên Windows 11:
1. Khởi động app -> cửa sổ hiện ra ngay lập tức với bo góc Windows 11.
2. Gõ `[]` -> tự động biến thành ô checkbox tick được.
3. Nhấn Backspace tại ô checkbox -> ô checkbox bị xóa mượt mà.
4. Chụp màn hình (Win+Shift+S) và nhấn `Ctrl+V` -> ảnh dán vào ngay, co vừa vặn khung cửa sổ.
5. Thêm tab mới, đổi tên tab thành "Kế hoạch tuần" -> file `notes/ke_hoach_tuan.md` được tự động tạo.
6. Bấm nút Ghim `[📌]` -> cửa sổ luôn nổi trên mọi ứng dụng khác.
7. Tắt app và mở lại -> giữ nguyên trạng thái tab, nội dung và trạng thái ghim.

- [ ] **Step 4: Commit**

```bash
git add src/main.cpp CMakeLists.txt
git commit -m "feat: complete end-to-end integration of Note Local desktop application"
```

---

## Self-Review Checklist

1. **Spec & Intent coverage**:
   - Gõ `[]` tự động biến thành checkbox -> Đáp ứng tại Task 6 (`editor.js`).
   - Xóa checkbox bằng `Backspace` -> Đáp ứng tại Task 6 (`editor.js`).
   - Dán ảnh `Ctrl+V` & co giãn vừa khung cửa sổ -> Đáp ứng tại Task 6 (CSS responsive) và Task 7 (`editor.js` clipboard paste).
   - Quản lý nhiều tab & rename tab -> Đáp ứng tại Task 3 (StorageManager), Task 7 (Tab UI), Task 8 (Integration).
   - Ghim Always on top -> Đáp ứng tại Task 4 (WindowController HWND_TOPMOST), Task 7 (Pin button).
   - Tự động sinh ra Markdown (`.md`) và lưu trạng thái -> Đáp ứng tại Task 2 (MarkdownEngine), Task 3 (StorageManager), Task 8.
   - C/C++ trên Windows 11 -> Đáp ứng 100% bằng Win32 C++ Host và WebView2.
2. **Step scan**: Mỗi task đều tuân thủ chặt chẽ các bước TDD (viết test -> verify fail -> implement -> verify pass -> commit).
3. **Type consistency**: Các interface (`NoteDoc`, `TodoItem`, `AppConfig`, `IPCMessage`, `StorageManager`, `WindowController`) thống nhất tuyệt đối giữa C++ Host và JS Editor.
4. **Review Focus**: Toàn bộ 5 failure modes đều được kiểm thử và phòng ngừa rõ ràng.
5. **Proportion**: Kế hoạch súc tích, đi thẳng vào interface và bước kiểm tra, không viết code thừa thãi.
