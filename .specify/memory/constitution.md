# Note Local Constitution

## Core Principles

### I. Ultra-Minimalist & High Performance (Non-Negotiable)
The application must remain featherweight, launching instantly (< 250ms cold start) and consuming under 60MB RAM. Avoid heavy frameworks or Electron. The core engine is written in native modern C++ (C++17) with Win32 APIs, using Microsoft WebView2 Runtime strictly for the rendered UI shell.

### II. Local-First & Zero Data Loss
User data belongs to the user. All notes, todos, and local images are stored in open, human-readable formats (standard Markdown `.md` and standard image files) in the local filesystem. Every keystroke and checkbox toggle must be debounced and committed to disk within 300ms to guarantee zero data loss.

### III. Deep Windows 11 Desktop Integration
Note Local is built natively for Windows 11. It must support modern desktop ergonomics: DWM rounded corners, Dark/Light theme sync, screen pinning (`HWND_TOPMOST`), system tray minimization, and native Windows Toast Notifications for task reminders.

### IV. 100% Content Fidelity in Web Sharing
When notes are shared via a web link, recipients on any device (desktop or mobile) must see 100% of the content without exceptions. This includes all typography, formatting, checkbox statuses, and all embedded images. Shared views are read-only, responsive, and require no account registration from the viewer.

### V. Specification-Driven Development (Spec Kit)
No code is written without a concrete specification. Features proceed through the strict Spec Kit lifecycle:
1. **Constitution**: Non-negotiable architectural constraints.
2. **Spec**: Detailed user scenarios, acceptance criteria, and edge cases (`specs/[###-feature]/spec.md`).
3. **Plan**: Technical architecture, component boundaries, and testing strategy (`plan.md`).
4. **Tasks**: Dependency-ordered, bite-sized tasks (`tasks.md`).
5. **Implementation**: Verified against unit and end-to-end tests before merging.

## Technology Stack & Constraints

- **Language**: C++17
- **Platform**: Windows 10/11 (x64)
- **UI Shell**: Microsoft Edge WebView2 (Evergreen Runtime)
- **Data Persistence**: Local Markdown files (`.md`) with frontmatter metadata
- **Build System**: CMake (≥ 3.20) + MSVC (Visual Studio 2022)
- **Notifications**: WinRT / Win32 Toast Notification APIs

## Governance

- All pull requests and feature implementations must verify compliance with this Constitution.
- Any architectural change that increases RAM footprint by > 20MB or startup time by > 100ms requires explicit justification and optimization before approval.

**Version**: 1.0.0 | **Ratified**: 2026-11-07
