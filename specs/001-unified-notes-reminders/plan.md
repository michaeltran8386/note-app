# Implementation Plan: Unified Notes, To-Do with Reminders & 100% Web Share

**Branch**: `001-unified-notes-reminders` | **Date**: 2026-11-07 | **Spec**: [specs/001-unified-notes-reminders/spec.md](file:///e:/02_Projects/NOTE_LOCAL/specs/001-unified-notes-reminders/spec.md)

**Input**: Feature specification from `specs/001-unified-notes-reminders/spec.md`

---

## Summary

Unify personal note-taking, to-dos with scheduled date/time reminders, and 1-click web sharing in Note Local for Windows 11. The implementation enhances the existing C++17/WebView2 core with:
1. **Inline To-Do & Reminder Engine**: Natural `@HH:mm dd/MM` syntax parsed into visual interactive badges in the editor, backed by a native Win32 background scheduler and `Shell_NotifyIconW` Toast Notifications.
2. **100% Web Share Pipeline**: Multi-tier asset packager that uploads local image attachments to a public CDN/storage endpoint and produces a clean, permanent web link rendered via a dedicated universal viewer.
3. **Ergonomic Desktop Scratchpad**: Always-on-top window pinning, ultra-low resource usage (< 60MB RAM), and instant local Markdown persistence.

---

## Technical Context

**Language/Version**: Modern C++ (C++17, MSVC v143 / Visual Studio 2022) + Vanilla JavaScript (ES6+ for WebView2 frontend)

**Primary Dependencies**:
- Microsoft WebView2 Runtime (`Microsoft.Web.WebView2`)
- nlohmann/json (`third_party/json/json.hpp`)
- Win32 Platform APIs (`windows.h`, `shellapi.h` for notifications & tray, `dwmapi.h`)
- Lucide Icons (SVG)

**Storage**:
- Local-first plain-text Markdown files (`notes/*.md`)
- Image assets in `assets/*.png`
- Configuration & window state in `config.json`
- Zero external database required

**Testing**:
- CTest unit testing for parser & scheduler logic
- End-to-end verification via [quickstart.md](file:///e:/02_Projects/NOTE_LOCAL/specs/001-unified-notes-reminders/quickstart.md)

**Target Platform**: Windows 10 (1809+) and Windows 11 (x64)

**Project Type**: Native Desktop Application (Win32 + WebView2 Shell)

**Performance Goals**:
- Cold startup time: < 250ms
- Memory footprint: < 60MB RAM
- Auto-save debounce: ≤ 300ms
- Reminder dispatch jitter: < 1 second of scheduled minute

**Constraints**:
- 100% offline capable for all core note-taking and reminder functions
- Zero mandatory user registration or login
- Zero data loss on unexpected power/process termination

**Scale/Scope**:
- Single-user desktop companion
- Up to 50 active tabs and thousands of local notes
- Responsive viewer accessible on mobile and desktop browsers

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Plan Alignment | Status |
|-----------|-------------|----------------|--------|
| **I. Ultra-Minimalist & High Performance** | Launch < 250ms, RAM < 60MB, C++17 Native | Win32 timer and native C++ priority queue have 0ms overhead and zero runtime bloat. | **PASS** |
| **II. Local-First & Zero Data Loss** | Plain Markdown storage, auto-save ≤ 300ms | Reminders and tasks are saved directly in `.md` files; auto-save debounce unchanged at 300ms. | **PASS** |
| **III. Deep Windows 11 Desktop Integration** | Native Toasts, DWM bo góc, Always on Top | Implements `Shell_NotifyIconW` modern Action Center toast and `SetWindowPos(HWND_TOPMOST)`. | **PASS** |
| **IV. 100% Content Fidelity in Web Sharing** | All text, checkboxes, and images rendered 100% | Multi-tier upload replaces local image paths with cloud URLs; universal viewer renders without truncation. | **PASS** |
| **V. Specification-Driven Development** | Follow Spec Kit lifecycle strictly | Follows spec -> plan -> tasks -> implementation. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-unified-notes-reminders/
├── spec.md                  # Feature Specification
├── plan.md                  # This file (/speckit-plan output)
├── research.md              # Phase 0: Technology decisions & trade-offs
├── data-model.md            # Phase 1: Entity definitions & lifecycle
├── quickstart.md            # Phase 1: Verification scenarios
├── contracts/               # Phase 1: API & schema definitions
│   ├── ipc-protocol.md      # Win32 Host <-> WebView2 IPC contracts
│   └── web-share-schema.md  # Universal Web Viewer JSON & layout schema
└── tasks.md                 # Phase 2 output (/speckit-tasks command)
```

### Source Code Layout (repository root)

```text
src/
├── core/
│   ├── markdown_engine.h / .cpp       # Markdown parsing & syntax extraction
│   ├── storage_manager.h / .cpp       # File I/O, note & asset persistence
│   ├── reminder_manager.h / .cpp      # [NEW] In-memory reminder scheduler & priority queue
│   └── share_service.h / .cpp         # [NEW] Multi-tier image upload & web share packager
├── platform/
│   ├── ipc_message.h / .cpp           # JSON IPC bridge & base64 codecs
│   ├── webview_host.h / .cpp          # WebView2 environment & host integration
│   ├── window_controller.h / .cpp     # Win32 window styles, DWM, Always-on-Top
│   └── notification_service.h / .cpp  # [NEW] Win32 Shell_NotifyIcon Toast notification service
├── ui/
│   └── assets/
│       ├── index.html                 # Main UI shell & toolbar
│       ├── editor.js                  # Editor controller, inline reminder badges, share UI
│       └── style.css                  # Modern Win11 dark theme & badge styles
└── main.cpp                           # Win32 entry, message loop, background scheduler tick

tests/
├── unit/                              # Reminder scheduler & parser unit tests
└── test_main.cpp
```

**Structure Decision**: Single native desktop project with clear separation between `core` (business logic, storage, scheduler), `platform` (Win32 OS integration, WebView2, notifications), and `ui` (WebView2 HTML/JS/CSS assets).

---

## Complexity Tracking

> *Zero violations of the Constitution. No architectural compromises required.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | *N/A* | *N/A* |
