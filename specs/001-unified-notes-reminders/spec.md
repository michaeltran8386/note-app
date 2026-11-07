# Feature Specification: Unified Notes, To-Do with Reminders & 100% Web Share

**Feature Branch**: `001-unified-notes-reminders`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User interview confirmed intent: Replace Sticky Notes & MS To-Do with a single lightweight desktop note app on Windows 11, featuring inline To-Dos with Date/Month/Time reminders, Always-on-Top screen pinning, image support, and 1-click public web sharing showing 100% content (text, to-dos, and images).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inline To-Do with Date/Month & Time Reminders (Priority: P1)

As a busy professional working on Windows 11, I want to write to-do items directly inside my freeform note and set specific reminder dates/times (e.g., `@14:30 15/11` or via a quick picker), so that Windows triggers a desktop toast notification when the deadline arrives, ensuring I never miss or confuse tasks between separate apps.

**Why this priority**: Solves the core problem that caused the user to abandon Sticky Notes and Microsoft To-Do (confusion, forgetting tasks alternating between two separate apps).

**Independent Test**: Can be fully tested by creating a To-Do item `[] Review quarterly report @14:30 15/11`, waiting or simulating the trigger time, and verifying that a native Windows Toast Notification pops up with the task title and note reference.

**Acceptance Scenarios**:

1. **Given** a note editor, **When** the user types `[] Hoàn thành báo cáo @15:00 08/11`, **Then** the system parses the checkbox and displays an interactive time pill/badge showing the reminder schedule.
2. **Given** an active reminder on a To-Do item, **When** the scheduled system time arrives, **Then** Windows fires a native Toast notification even if the Note Local window is minimized or out of focus.
3. **Given** a reminder notification on screen, **When** the user clicks the notification, **Then** Note Local restores focus and jumps directly to the note and task line.
4. **Given** a scheduled To-Do item, **When** the user marks the checkbox as completed (`[x]`), **Then** the reminder for this item is automatically canceled/silenced.

---

### User Story 2 - 1-Click Web Sharing with 100% Content Visibility (Priority: P2)

As a user collaborating or sharing notes with others, I want to click a "Share" button to immediately obtain a public URL, so that anyone receiving the link can open it in any desktop or mobile browser and see 100% of the note content—including formatted markdown text, checkbox states, and all embedded images without broken links or truncation.

**Why this priority**: Current URL hash compression techniques fail when high-resolution images or large notes are embedded. The user explicitly requires that recipients see 100% of all content without installing any software.

**Independent Test**: Can be fully tested by creating a note containing headings, checklists, and 2 pasted images, clicking "Share", copying the generated URL, opening it in an incognito web browser, and verifying that all text, checklists, and images render completely and cleanly.

**Acceptance Scenarios**:

1. **Given** a note with mixed text, to-do items, and pasted images, **When** the user clicks "Share", **Then** the app bundles and uploads/stores the note assets and copies a clean, public web viewer URL to the clipboard.
2. **Given** a generated share link, **When** a recipient opens the link in Google Chrome, Edge, or Safari (desktop or mobile), **Then** the full note displays in a clean, read-only responsive view with 100% of the images and formatting intact.
3. **Given** an offline state, **When** the user attempts to share, **Then** the app displays an informative error toast instead of crashing or generating an invalid link.

---

### User Story 3 - Unified Lightweight Floating Note Experience (Priority: P3)

As a desktop user, I want Note Local to remain ultra-fast, pinned to the screen (Always on Top) when needed, with multi-tab support and local Markdown persistence, so that I can use it as a frictionless scratchpad throughout my workday.

**Why this priority**: Maintains the core value proposition of Note Local over bloated alternatives like Notion or Electron-based apps.

**Independent Test**: Can be tested by launching the app, toggling Pin mode, verifying it stays above other full-screen windows (browser, IDE), switching tabs, and verifying all changes persist instantly to disk.

**Acceptance Scenarios**:

1. **Given** Note Local is running, **When** the user clicks the Pin icon, **Then** the window sets `HWND_TOPMOST` and remains visible above all other application windows.
2. **Given** a note with copied images in clipboard, **When** the user presses `Ctrl+V`, **Then** the image is pasted inline, saved locally, and can be resized smoothly.
3. **Given** multiple tasks across tabs, **When** the user renames or closes tabs, **Then** tab state and note files are preserved in the local storage directory.

---

### Edge Cases

- **System Sleep / Reboot**: How does the reminder engine handle reminders that expired while the PC was asleep or turned off? The system MUST check missed reminders upon app wake/launch and notify the user of overdue tasks.
- **Large Image Attachments**: When sharing notes with multiple 4K/high-res images, how does the web share handle payload limits? The share engine MUST optimize/compress images during web publishing or store them on a CDN/image host to prevent payload timeouts.
- **Multiple Reminders at the Same Minute**: If 3 to-do items have the same deadline, the system MUST group them or dispatch distinct notifications without dropping any.
- **Expired Past Dates**: If the user inputs a date/time in the past (e.g., `@10:00 01/01/2020`), the system MUST visually indicate the task is overdue rather than silently ignoring it.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow inline creation of To-Do items using `[]` syntax within the note editor.
- **FR-002**: The system MUST parse date and time syntax attached to To-Do items (supporting formats: `@HH:mm`, `@HH:mm dd/MM`, `@dd/MM/yyyy HH:mm`, and natural keywords like `@today`, `@tomorrow`).
- **FR-003**: The system MUST provide an interactive UI affordance (icon or date/time picker popup) next to To-Do items to set, edit, or remove reminder schedules.
- **FR-004**: The system MUST run a background scheduler service (via Win32 Timer / Worker thread) that monitors active reminders across all notes.
- **FR-005**: The system MUST trigger native Windows Toast Notifications (WinRT / Windows App SDK or Win32 Shell_NotifyIcon) when a reminder timestamp is reached.
- **FR-006**: The system MUST cancel/mute pending reminders immediately when the associated To-Do item is checked off (`[x]`).
- **FR-007**: The system MUST persist all reminder metadata within the local Markdown file (frontmatter or inline tags) without requiring an external database.
- **FR-008**: The system MUST support Pin / Always-on-Top window toggling using Win32 `SetWindowPos(HWND_TOPMOST)`.
- **FR-009**: The system MUST allow pasting images directly from the clipboard (`Ctrl+V`), saving them into a dedicated local `assets/` subfolder, and rendering them with adjustable dimensions and lightbox zoom.
- **FR-010**: The system MUST provide a 1-click "Share via Web" action that publishes the note content and all referenced images to a public web viewer.
- **FR-011**: The shared web page MUST render 100% of the note content (Markdown headings, lists, code blocks, checklists, and images) in a clean, responsive, read-only layout.
- **FR-012**: The system MUST copy the generated public URL to the user's clipboard upon successful share generation.
- **FR-013**: The system MUST support multiple tabs with tab creation, renaming, deletion, and fast switching (`Ctrl+Tab`, `Ctrl+/`).
- **FR-014**: The system MUST auto-save changes locally with debounce (≤ 300ms) to ensure zero data loss.

### Key Entities

- **Note**: Represents a single note document. Attributes: `id` (UUID), `title`, `filePath`, `content` (Markdown string), `createdAt`, `updatedAt`, `tabs`.
- **ToDoItem**: Represents an individual checklist task within a note. Attributes: `id`, `text`, `isCompleted` (boolean), `hasReminder` (boolean), `reminderDateTime` (ISO 8601 string or timestamp), `status` (pending | triggered | dismissed).
- **EmbeddedImage**: Represents an image asset within a note. Attributes: `id`, `localPath`, `displayDimensions` (width, height), `altText`, `remoteShareUrl` (optional, for web sharing).
- **SharePackage**: Represents the published web snapshot. Attributes: `shareId`, `publicUrl`, `markdownContent`, `imageManifest`, `publishedAt`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reminder notification fires within 1 second of the scheduled minute under normal desktop operation.
- **SC-002**: 100% of shared notes open successfully in mobile and desktop browsers with all embedded images displayed without broken image icons.
- **SC-003**: 1-click share operation completes and copies the URL to the clipboard in under 3 seconds for notes with up to 5 images.
- **SC-004**: Cold startup time of the application remains under 250 milliseconds with RAM consumption under 60MB.
- **SC-005**: Zero data loss during unexpected app crashes or power loss due to auto-save debounce ≤ 300ms.

---

## Assumptions

- Target operating system is Windows 10 (version 1809+) and Windows 11 with WebView2 Runtime pre-installed (standard on Windows 11).
- Reminders rely on local PC clock and trigger while the PC is active or upon wake from sleep.
- Public web sharing uses a serverless backend or public cloud storage service (e.g., Cloudflare Workers / GitHub Pages / Cloudinary / Supabase storage) to host the public read-only view and image assets.
- Single-user desktop architecture; multi-user editing or synchronization across multiple PCs is out of scope for this milestone.

