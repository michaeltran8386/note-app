# Tasks: Unified Notes, To-Do with Reminders & 100% Web Share

**Input**: Design documents from `specs/001-unified-notes-reminders/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: `plan.md` (completed), `spec.md` (completed), `research.md` (completed), `data-model.md` (completed), `contracts/` (completed)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description with exact file paths`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project configuration and shared build/IPC infrastructure

- [X] T001 Update build configuration in `CMakeLists.txt` to link `shell32.lib` for Win32 notification APIs and configure unit test targets in `tests/`
- [X] T002 [P] Create missing directory structure for new modules in `src/core/`, `src/platform/`, and `tests/unit/`
- [X] T003 [P] Update IPC serialization structures in `src/platform/ipc_message.h` and `src/platform/ipc_message.cpp` with action strings for reminder scheduling and web sharing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core notification and parsing infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: User story implementation cannot begin until this phase is complete.

- [X] T004 Implement native Windows Toast Notification service in `src/platform/notification_service.h` and `src/platform/notification_service.cpp` using `Shell_NotifyIconW` with `NIF_INFO` and `NIIF_LARGE_ICON`
- [X] T005 [P] Define `ReminderSchedule` (enum status: `PENDING`, `TRIGGERED`, `DISMISSED`, `OVERDUE`) and `ToDoItem` entities in `src/core/note_model.h`
- [X] T006 [P] Extend Markdown parsing engine in `src/core/markdown_engine.h` and `src/core/markdown_engine.cpp` with regex extractors for date/time reminder syntax (`@HH:mm`, `@HH:mm dd/MM`, `@dd/MM/yyyy HH:mm`, and natural keywords `@today`, `@tomorrow`)
- [X] T007 Implement background timer tick loop (`WM_TIMER` @ 15s) and notification click dispatch (`NIN_BALLOONUSERCLICK`) in `src/main.cpp`

**Checkpoint**: Foundation ready - notification engine, data structures, and timer loop are available for story implementations.

---

## Phase 3: User Story 1 - Inline To-Do with Date/Month & Time Reminders (Priority: P1) 🎯 MVP

**Goal**: Deliver inline To-Do creation with scheduled reminders (Day/Month & Time), automatic Windows Toast notification firing, and reminder cancellation upon task completion.

**Independent Test**: Add task `[] Họp ban giám đốc @15:30 15/11` (or current time + 1 min), verify reminder pill badge renders, wait for Windows Action Center Toast to pop up, click toast to restore window focus, and check `[x]` to cancel.

### Tests for User Story 1

- [X] T008 [P] [US1] Unit test for inline date/time reminder parsing across formats (`@HH:mm`, `@HH:mm dd/MM`, `@tomorrow`) in `tests/unit/test_reminder_parser.cpp`
- [X] T009 [P] [US1] Unit test for in-memory priority queue scheduling and overdue detection in `tests/unit/test_reminder_manager.cpp`

### Implementation for User Story 1

- [X] T010 [US1] Implement `ReminderManager` in `src/core/reminder_manager.h` and `src/core/reminder_manager.cpp` managing `std::priority_queue` of active reminders and missed alerts on system wake
- [X] T011 [US1] Wire IPC message dispatchers (`schedule_reminder`, `cancel_reminder`, `reminder_triggered`) in `src/main.cpp` connecting Win32 scheduler with WebView2
- [X] T012 [US1] Update frontend editor parser in `src/ui/assets/editor.js` to convert inline `@...` text tokens into interactive visual badges with Lucide clock icons
- [X] T013 [P] [US1] Add reminder badge CSS styling, animation, and overdue alert indicator styles in `src/ui/assets/style.css`
- [X] T014 [US1] Implement interactive reminder date/time picker popup modal in `src/ui/assets/editor.js` and `src/ui/assets/index.html` allowing manual date/time selection
- [X] T015 [US1] Hook task completion toggle (`- [x]`) in `src/ui/assets/editor.js` to automatically dispatch `cancel_reminder` IPC to `src/main.cpp`

**Checkpoint**: User Story 1 is 100% complete and testable independently as the core MVP.

---

## Phase 4: User Story 2 - 1-Click Web Sharing with 100% Content Visibility (Priority: P2)

**Goal**: Enable 1-click web sharing of any note to a public URL where recipients on desktop or mobile see 100% of formatted Markdown, checkboxes, and all embedded images without URL truncation.

**Independent Test**: Create note with text, checkboxes, and pasted images, click Share, copy generated public URL, open in Incognito browser, and verify 100% content and images render cleanly.

### Tests for User Story 2

- [X] T016 [P] [US2] Contract verification test for web share payload serialization conforming to schema in `tests/unit/test_share_contract.cpp`

### Implementation for User Story 2

- [X] T017 [US2] Implement `ShareService` in `src/core/share_service.h` and `src/core/share_service.cpp` to resolve local image files, upload to public cloud CDN, and construct `ShareSnapshot` bundle
- [X] T018 [US2] Implement `publish_web_share` IPC handler in `src/main.cpp` and post back `web_share_completed` with generated public URL
- [X] T019 [US2] Add Share toolbar button progress indicator and clipboard copy toast in `src/ui/assets/editor.js` and `src/ui/assets/index.html`
- [X] T020 [US2] Create universal web viewer template in `docs/viewer/index.html` (for GitHub Pages hosting) rendering Markdown, checkbox states, and high-resolution responsive lightbox images

**Checkpoint**: User Stories 1 AND 2 are both fully functional and testable independently.

---

## Phase 5: User Story 3 - Unified Lightweight Floating Note Experience (Priority: P3)

**Goal**: Guarantee Note Local remains an ultra-fast (<250ms, <60MB RAM), always-on-top desktop scratchpad with multi-tab persistence and seamless image paste/resize.

**Independent Test**: Toggle Pin mode, paste images with `Ctrl+V`, resize images smoothly, switch tabs with `Ctrl+Tab`, restart app, and verify zero data loss.

### Implementation for User Story 3

- [X] T021 [P] [US3] Verify `WindowController::SetAlwaysOnTop` in `src/platform/window_controller.cpp` and synchronize Pin button state in `src/ui/assets/editor.js`
- [X] T022 [US3] Optimize clipboard image paste (`Ctrl+V`) and smooth dimension resizing in `src/ui/assets/editor.js` and `src/core/storage_manager.cpp`
- [X] T023 [US3] Ensure multi-tab note auto-save debounce (≤ 300ms) preserves reminder metadata and tab list in `src/ui/assets/editor.js` and `src/core/storage_manager.cpp`

**Checkpoint**: All three user stories are complete, integrated, and verified against project principles.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, end-to-end validation, and performance verification

- [X] T024 [P] Update user guide in `README.md` and `docs/` detailing inline reminder syntax (`@HH:mm dd/MM`) and web sharing features
- [X] T025 Execute end-to-end validation scenarios documented in `specs/001-unified-notes-reminders/quickstart.md`
- [X] T026 Benchmark cold startup time (< 250ms) and idle memory footprint (< 60MB RAM) on Windows 11

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001-T003) — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion (T004-T007). Delivers primary MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Can run in parallel with US1 or sequentially after US1.
- **User Story 3 (Phase 5)**: Depends on Foundational completion. Enhances desktop UX.
- **Polish (Phase 6)**: Depends on all user stories being implemented.

### Parallel Opportunities

- **Setup**: `T002` and `T003` can execute in parallel once `T001` begins.
- **Foundational**: `T005` (data model) and `T006` (markdown engine) can execute in parallel while `T004` (notification service) is built.
- **User Story 1**: Tests `T008` and `T009` can run in parallel before implementation; `T013` (CSS) can run in parallel with `T010`/`T012`.
- **User Story 2**: `T016` (contract test) can run in parallel with `T017` (share service).
- **Polish**: `T024` (documentation) can run in parallel with `T025` and `T026`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001` - `T003`)
2. Complete Phase 2: Foundational (`T004` - `T007`)
3. Complete Phase 3: User Story 1 (`T008` - `T015`)
4. **STOP and VALIDATE**: Test User Story 1 independently using Scenario 1 from `quickstart.md`.
5. You now have a working MVP that eliminates the Sticky Notes / MS To-Do confusion!

### Incremental Delivery

1. Base app + Inline To-Do & Reminders (MVP).
2. Add 1-Click 100% Web Share (US2).
3. Enhance Pinning, Tab navigation, and Image resize ergonomics (US3).
4. Run final verification and benchmarks (Phase 6).
