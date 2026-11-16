# AI Fast Context: NoteLocal

> **Target Audience:** AI Assistants (Antigravity, Claude, ChatGPT, Cursor, Copilot) & New Developers.  
> **Purpose:** Instant context bootstrapping without having to read dozens of source files.

---

## 1. Project Mission & Core Philosophy

**NoteLocal** is a lightweight, Notion-style, local-first personal note-taking desktop application for Windows and macOS.

* **Ultra-low Resource Footprint:** RAM consumption stays under **60 MB** (often 30–45 MB), compared to 500 MB–1 GB for Electron apps.
* **Instant Startup:** Cold launch in **< 0.2 seconds**.
* **Zero Electron / Zero Node.js in Production:** Pure native host (C++17 / Win32 / Cocoa) driving system webviews (Edge WebView2 on Windows, WebKit WKWebView on macOS).
* **100% Local-First & Private:** Data stored on disk as plain text Markdown files (`.md`). No mandatory cloud, no login, no lock-in.
* **Notion-like Fluidity:** Slash menu (`/`), floating bubble toolbar, dual gutter controls (`+` quick-add, `⋮⋮` drag-handle), multi-column block dragging, checklists, Office-style tables, and AI assistant integration.

---

## 2. System Architecture & Component Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend UI Layer (Pure Web Standards)                │
│  src/ui/assets/index.html | style.css | editor.js                      │
│  - Rich Text / Markdown Editor (ContentEditable)                       │
│  - Notion UX Engine: Dual Gutter, Multi-column Flexbox, Block Popover  │
│  - Vietnamese IME Protection (isGlobalComposing)                       │
│  - Office Tables, Reminder Parser, Inline AI Assistant                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC (JSON over postMessage)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    IPC Bridge (src/platform/ipc_message)               │
│  - Dual Adapter: chrome.webview (Win) & webkit.messageHandlers (Mac)   │
│  - Action Router & Base64 Asset Serializer                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     Windows Native Host         │   │       macOS Native Host         │
│  src/main.cpp                   │   │  src/main_mac.mm                │
│  src/platform/webview_host.cpp  │   │  src/platform/macos/            │
│    - Microsoft Edge WebView2    │   │    - Apple WebKit (WKWebView)   │
│  src/platform/window_controller │   │    - Cocoa NSWindow & Vibrancy  │
│    - Mica/Acrylic & AlwaysOnTop │   │    - NSFloatingWindowLevel      │
│  src/platform/notification_svc  │   │    - NSUserNotification         │
│    - Windows Action Center Toast│   │                                 │
└────────────────┬────────────────┘   └────────────────┬────────────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Platform-Agnostic C++17 Core Engine                 │
│  - src/core/markdown_engine.cpp : DOM <-> Markdown serializer & parser │
│  - src/core/storage_manager.cpp : Local files, notes, assets, config   │
│  - src/core/reminder_manager.cpp: Scheduling, due detection, cron loop │
│  - src/core/share_service.cpp   : Web share contract & tinyurl export  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Local Disk File Structure                         │
│  Windows : %LOCALAPPDATA%\NoteLocal\                                   │
│  macOS   : ~/Library/Application Support/NoteLocal/                    │
│    ├── config.json         (Window bounds, active tab, tabs list)      │
│    ├── notes/              (<tab_id>.md plain text notes)              │
│    └── assets/             (Embedded images: img_<epoch>_<rand>.png)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Technical Invariants (Do Not Break)

1. **Static C++ Runtime (`/MT`) on Windows:**
   - In `CMakeLists.txt`, `CMAKE_MSVC_RUNTIME_LIBRARY` is set to `MultiThreaded$<$<CONFIG:Debug>:Debug>`.
   - **Never** switch to `/MD`. Statically linking the CRT guarantees NoteLocal runs on fresh Windows machines without requiring `VCRUNTIME140_1.dll` redistributables.
2. **Vietnamese IME Typing Safety:**
   - `isGlobalComposing` in `src/ui/assets/editor.js` tracks `compositionstart` and `compositionend`.
   - `triggerSave()` and DOM normalization are paused during composition to prevent Telex/VNI letter jumping or caret corruption.
3. **Pure Web Frontend (No Bundlers):**
   - `src/ui/assets/` uses raw HTML5, CSS3, and ES6. There is no Webpack, Vite, or npm build step for the frontend.
   - In dev mode on Windows WebView2, `https://notelocal.app/` maps directly to disk via virtual host mapping. Editing `editor.js` or `style.css` updates the app immediately upon reload.
4. **Block Structure & Multi-Column Layout:**
   - Top-level blocks inside `#editor`: `<p>`, `<h1>`–`<h3>`, `<ul>`, `<ol>`, `<blockquote>`, `.block-todo`, `.block-callout`, `<table>`, and `.block-columns`.
   - Multi-column container: `<div class="block-columns"><div class="block-column">...</div></div>`.
   - Horizontal drag line: `.block-drop-line`. Vertical drag line for columns: `.block-drop-line-v`.
5. **Two-Way Markdown Fidelity:**
   - Editor DOM must cleanly serialize to standard Markdown (`serializeEditorToMarkdown()`) and restore without losing tables, callouts, or checklist state.

---

## 4. Developer Cheat Sheet & Commands

### Build on Windows (MSVC or Clang-MinGW)
```powershell
# Configure
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release

# Compile NoteLocal.exe & all test suites
cmake --build build

# Executable output
.\build\bin\NoteLocal.exe
```

### Build on macOS (Universal: Apple Silicon + Intel)
```bash
# Configure Universal Binary
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"

# Compile NoteLocal.app
cmake --build build --config Release
```

### Run Tests
```powershell
# 1. Native C++ Unit Tests (7 tests)
ctest --test-dir build --output-on-failure

# 2. Automated Notion Interaction & Regression Tests (CDP)
node tools/verify_notion_interactions.mjs

# 3. Comprehensive 29-Scenario E2E Browser Suite
node tests/editor_interactions.mjs
```

### Packaging & Release
```powershell
# Package Windows Installer (.exe) with Inno Setup
& "$env:LocalAppData\Programs\Inno Setup 6\ISCC.exe" installer.iss
# Output: dist/NoteLocal-Setup-x64.exe

# Package Portable Windows Archive
powershell -Command "Compress-Archive -Path 'build\bin\NoteLocal.exe', 'build\bin\WebView2Loader.dll', 'src\ui\assets', 'resources\app.ico' -DestinationPath 'dist\NoteLocal-portable-x64.zip' -Force"
```

### Knowledge Graph Maintenance (Mandatory)
```powershell
# Run after modifying code files to keep graphify AST current
graphify update .
```

---

## 5. IPC Protocol Quick Reference

Communication between Frontend JS and C++ Native Host uses JSON payloads:

### Frontend ➔ Native (`sendIPC(action, payload)`)
| Action | Key Payload Fields | Description |
| :--- | :--- | :--- |
| `request_init` | `{}` | Request tabs list, active tab, and content |
| `save_note` | `{ tab_id, html, markdown }` | Debounced auto-save of current note |
| `switch_tab` | `{ tab_id }` | Switch active tab |
| `create_tab` | `{ id, title }` | Create a new note tab |
| `rename_tab` | `{ tab_id, title }` | Rename note tab |
| `delete_tab` | `{ tab_id }` | Delete note tab and its `.md` file |
| `toggle_pin` | `{ always_on_top: bool }` | Toggle Always On Top window state |
| `copy_to_clipboard` | `{ text }` | Native clipboard write |
| `open_url` | `{ url }` | Open link in user's default browser |
| `schedule_reminder`| `{ note_id, item_id, text, target_timestamp, display_time }` | Register notification timer |
| `cancel_reminder`  | `{ note_id, item_id }` | Cancel registered notification timer |
| `save_image`       | `{ data: base64, ext, img_id }` | Save pasted/dropped image to `assets/` |
| `publish_web_share`| `{ note_id, title, markdown_content, referenced_images }` | Export share package |

### Native ➔ Frontend (`PostWebMessage(json)`)
| Action | Key Payload Fields | Description |
| :--- | :--- | :--- |
| `init_state` | `{ tabs, active_tab_id, always_on_top, markdown }` | Initial application state on startup |
| `update_pin` | `{ always_on_top: bool }` | Synchronize UI pin icon state |
| `image_saved`| `{ path, img_id }` | Replace base64 preview with local relative URL |
| `web_share_completed` | `{ success, share_id, public_url, error_message }` | Share publishing feedback |
| `shorten_url_result`  | `{ short_url, long_url }` | TinyURL asynchronous result |

---

## 6. Directory Structure at a Glance

```text
NOTE_LOCAL/
├── .github/workflows/          # CI/CD: release.yml (multi-arch Win + Mac)
├── dist/                       # Output installers & portable zips
├── docs/                       # Architectural blueprints & reverse engineering notes
├── resources/                  # App icon (.ico, .svg, .rc), media demos
├── src/
│   ├── core/                   # Pure C++17 logic (Platform-agnostic)
│   │   ├── markdown_engine.cpp # HTML/DOM to Markdown serialization
│   │   ├── storage_manager.cpp # Notes & config disk I/O
│   │   ├── reminder_manager.cpp# Notification scheduling & due detection
│   │   └── share_service.cpp   # TinyURL & web share export
│   ├── platform/               # OS integration layers
│   │   ├── ipc_message.cpp     # Cross-platform JSON IPC protocol
│   │   ├── webview_host.cpp    # Windows WebView2 host
│   │   ├── window_controller.cpp# Win32 styling & Always-On-Top
│   │   ├── notification_service.cpp # Windows Action Center Toast
│   │   └── macos/              # macOS WebKit & Cocoa integration
│   │       ├── webview_host_mac.mm
│   │       ├── window_controller_mac.mm
│   │       └── platform_utils_mac.mm
│   ├── ui/assets/              # Web frontend (HTML/CSS/JS)
│   │   ├── index.html          # Main application frame & popovers
│   │   ├── style.css           # Premium Notion-dark design system
│   │   └── editor.js           # Core block editor, tables, AI, and IPC
│   ├── main.cpp                # Windows entry point (wWinMain)
│   └── main_mac.mm             # macOS entry point (NSApplication)
├── tests/                      # C++ unit tests & JS integration tests
├── tools/                      # Automated verification & recording scripts
├── CMakeLists.txt              # Cross-platform CMake build configuration
└── installer.iss               # Inno Setup 6 packaging script
```

---

## 7. AI Debugging & Common Pitfalls

* **Port/Process Conflict in Tests:** If running `tools/verify_notion_interactions.mjs`, always ensure no orphan `NoteLocal.exe` instances are running beforehand:
  ```powershell
  Stop-Process -Name NoteLocal -Force -ErrorAction SilentlyContinue
  ```
* **HTML/JS Escaping in Transformations:** Always use `escapeHtml(text)` when converting raw text into HTML blocks (e.g. `turn-callout`, `turn-bullet`, `turn-h1`) to prevent XSS or broken tag structures.
* **Proximity Gutter Hit Testing:** The gutter `#block-gutter-controls` floats beside `#editor`. When mouse enters the left 55px margin, hit-testing uses `document.elementFromPoint(75, e.clientY)` to select the nearest top block.
* **Keep AST Knowledge Graph in Sync:** Always run `graphify update .` immediately following any C++, Objective-C++, or JavaScript code modifications.
