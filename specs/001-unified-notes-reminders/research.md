# Research: Unified Notes, To-Do with Reminders & 100% Web Share

**Feature Branch**: `001-unified-notes-reminders`  
**Date**: 2026-11-07  
**Status**: Completed  

---

## Technical Unknowns & Decisions

### 1. Windows Notification Architecture: Native Win32 vs C++/WinRT

**Problem**: How should Note Local deliver native desktop toast notifications reliably when a reminder is triggered, even if the main window is minimized, hidden in system tray, or out of focus?

- **Decision**: Hybrid Win32 Tray + Modern Windows Toast Notification using `Shell_NotifyIconW` with `NIF_INFO` / `NIIF_LARGE_ICON` and fallback to `SetCurrentProcessExplicitAppUserModelID` with Windows App SDK / WinRT toast if available.
- **Rationale**:
  - `Shell_NotifyIconW` is available on 100% of Windows versions (Windows 10 1809+ and Windows 11) with zero external runtime dependencies, zero COM/WinRT packaging overhead, and 0ms startup delay.
  - Windows 10 and 11 automatically map modern `Shell_NotifyIconW` calls with `NIF_INFO` into native Windows Action Center Toast notifications with rich sound, app icon, title, and body.
  - Clicking the notification dispatches `NIN_BALLOONUSERCLICK` back to `WndProc`, allowing instantaneous window restoration and navigation to the target note tab and line.
- **Alternatives Considered**:
  - *Full C++/WinRT `Windows.UI.Notifications.ToastNotificationManager`*: Requires MSVC WinRT projections (`winrt/Windows.UI.Notifications.h`), MSIX sparse package or registration of a custom COM server for toast activation callbacks. Rejected for initial phase due to build complexity and packaging friction, but kept as an optional progressive enhancement.
  - *Electron / Node-notifier*: Rejected immediately by Constitution Principle I (violates < 60MB RAM and native C++ constraint).

---

### 2. Background Reminder Scheduler Engine

**Problem**: How should the system evaluate active reminder deadlines without eating CPU cycles or skipping alerts during system sleep?

- **Decision**: Lightweight Native C++ Scheduler with Win32 Periodic Timer (`SetTimer` / `WM_TIMER` @ 15-second resolution) combined with an immediate deadline heap (`std::priority_queue<ReminderEvent>`).
- **Rationale**:
  - A 15-second polling interval consumes < 0.01% CPU and negligible battery, while providing accurate alerts within the target SC-001 (trigger within 1 second of the scheduled minute).
  - Maintains state in memory with persistence back to local note Markdown files on change.
  - On system resume from sleep (`WM_POWERBROADCAST` with `PBT_APMRESUMEAUTOMATIC`), the scheduler immediately performs an overdue audit to notify the user of any tasks whose deadline passed while asleep.
- **Alternatives Considered**:
  - *Windows Task Scheduler API (`ITaskService`)*: Heavyweight, requires COM manipulation and administrator/user rights, clutters Windows Task Scheduler with micro-todos. Rejected.
  - *JavaScript `setInterval` inside WebView2*: Suspends or throttles when the WebView2 window is minimized or occluded by Windows resource management. Cannot be trusted for background alarms. Rejected.

---

### 3. Inline Reminder Syntax & Storage Representation

**Problem**: How should reminder dates and times be represented in plain Markdown so they remain human-readable in external editors (Obsidian, VS Code) while enabling interactive badge rendering in Note Local?

- **Decision**: Standard GFM Task List extension with natural datetime tokens:
  `- [ ] <Task text> @<HH:mm> <DD/MM[/YYYY]>` or explicit ISO-friendly tag `- [ ] <Task text> @remind(YYYY-MM-DD HH:mm)`.
- **Rationale**:
  - Preserves standard Markdown task list syntax (`- [ ]`). Any external editor displays it cleanly without syntax errors.
  - The Note Local editor regex recognizes both shorthand (`@14:30 15/11`) and full dates, replacing the plain text with an interactive Lucide clock badge and status color.
  - Marking the task complete (`- [x]`) automatically transitions the reminder state to dismissed/canceled.
- **Alternatives Considered**:
  - *Hidden YAML frontmatter*: Disconnects the reminder from the specific task line; reordering or deleting lines in external editors causes desynchronization. Rejected.
  - *HTML comments `<!-- remind:... -->`*: Cluttered in plain text and difficult for users to type naturally on desktop. Rejected.

---

### 4. 100% Web Share Architecture & Image Hosting

**Problem**: The user requires that shared notes show **100% of all content** (including all attached images) in any browser without installing apps. Current URL-hash compression (`TxtUrl`) truncates large notes and fails on multi-megabyte image payloads.

- **Decision**: Multi-tier High-Fidelity Share Pipeline:
  1. **Image Hosting**: When sharing, any local images (`assets/img_*.png`) referenced in the note are converted/uploaded via a reliable zero-auth public CDN / image storage API (such as ImgBB API / Cloudinary / or bundled into a dedicated serverless worker endpoint).
  2. **Document Snapshot**: The rendered Markdown and image manifest are published to a public lightweight document store or GitHub Gist with a permanent short ID.
  3. **Universal Web Viewer**: Hosted on GitHub Pages (`https://michaeltran8386.github.io/note-app/?share=<id>`), the viewer pulls the snapshot, hydrates full Markdown, and renders checkboxes and high-resolution responsive images with full zoom/lightbox capability.
- **Rationale**:
  - Generates compact, clean URLs (e.g., `https://michaeltran8386.github.io/note-app/?share=abc123xyz`) suitable for copying and sending via Zalo, Telegram, or Email.
  - Ensures 100% image fidelity regardless of size, completely bypassing browser URL hash limits.
  - Viewers on iOS Safari, Android Chrome, and Desktop see identical styling to Note Local.
- **Alternatives Considered**:
  - *Direct base64 inside single HTML download*: Great for offline archiving, but cannot be easily shared as a short clickable link via messaging apps.
  - *Self-hosted Node/Postgres backend*: Adds maintenance cost and server operational dependency. Serverless/Gist/CDN approach is zero-cost and maintenance-free.

