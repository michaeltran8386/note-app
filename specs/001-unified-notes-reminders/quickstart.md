# Quickstart: Validation & Verification Guide

**Feature Branch**: `001-unified-notes-reminders`  
**Date**: 2026-11-07  
**Status**: Ready for Verification  

---

## Prerequisites

- **OS**: Windows 10 (1809+) or Windows 11 (x64)
- **Toolchain**: Visual Studio 2022 (MSVC v143), CMake ≥ 3.20
- **Runtime**: Microsoft Edge WebView2 Evergreen Runtime (installed by default on Windows 11)

---

## Build & Run

```powershell
# 1. Generate build directory
cmake -B build -G "Visual Studio 17 2022" -A x64

# 2. Compile the binary
cmake --build build --config Release

# 3. Launch Note Local
./build/bin/Release/NoteLocal.exe
```

---

## Verification Scenarios

### Scenario 1: Inline To-Do with Scheduled Reminder (P1)

1. Launch Note Local.
2. In the editor, type:
   ```text
   [] Kiểm tra tiến độ dự án @2 phút nữa
   ```
   *(or type the current time + 2 minutes, e.g. `@15:35 08/11`)*
3. **Verify**:
   - The plain text `@...` converts into a visual reminder pill badge with a clock icon.
   - The reminder is registered in C++ Native Scheduler.
4. Minimize or switch focus away from Note Local to another window.
5. Wait for the scheduled minute to arrive.
6. **Verify**:
   - Windows fires an Action Center Toast notification with title *"Nhắc việc Note Local"* and text *"Kiểm tra tiến độ dự án"*.
   - Clicking the notification restores Note Local into focus and highlights the task.
7. Click the checkbox to mark it done (`[x]`).
8. **Verify**: Text is struck through and the reminder badge is muted/canceled.

---

### Scenario 2: 1-Click Web Sharing with 100% Content & Images (P2)

1. In Note Local, create a note with:
   - A title: `Báo cáo thiết kế`
   - Several bullet points and checkboxes.
   - Paste an image from clipboard (`Ctrl+V`).
2. Click the **Share** button in the top toolbar.
3. **Verify**:
   - The button shows a brief loading spinner, then a toast *"Đã sao chép link chia sẻ vào clipboard!"*.
4. Open Google Chrome, Edge, or mobile browser in Incognito mode.
5. Paste the copied URL from the clipboard and press Enter.
6. **Verify**:
   - The note renders 100% of the content cleanly in dark mode.
   - The pasted image is completely visible, sharp, and can be clicked to view full-size.
   - All checkbox states (`[ ]` and `[x]`) match the desktop editor exactly.

---

### Scenario 3: Pinning & Ultra-Fast Desktop Scratchpad (P3)

1. Click the **Pin (Ghim)** button in the toolbar.
2. Open another full-screen application (e.g. Chrome or Word).
3. **Verify**:
   - Note Local window stays strictly on top of all other windows.
4. Press `Ctrl+Tab` to cycle tabs or create a new tab (`Ctrl+T`).
5. Close Note Local, then immediately re-launch.
6. **Verify**:
   - Cold start takes < 250ms.
   - All tabs, notes, images, and active reminder schedules restore accurately.

