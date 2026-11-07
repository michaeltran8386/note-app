# Graph Report - NOTE_LOCAL  (2026-11-07)

## Corpus Check
- 81 files · ~137,496 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .css 2, .ico 1)

## Summary
- 999 nodes · 1891 edges · 65 communities (54 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03771749`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ControllerCompletedHandler
- share_service.h
- steps
- json.hpp
- end
- ReminderManager
- editor.js
- pages.yml
- HandleWebMessage
- markdown_engine.cpp
- common.ps1
- 🚀 Hướng dẫn sử dụng chi tiết
- Tasks: Unified Notes, To-Do with Reminders & 100% Web Share
- empty
- app.js
- get_impl_ptr
- .SetAlwaysOnTop
- Tasks: [FEATURE NAME]
- WndProc
- rbegin
- Review Focus
- basic_json
- speckit-analyze/SKILL.md
- Execution Steps
- basic_json
- TodoItem
- operator<
- note-local.md
- NotificationService
- AppConfig
- Feature Specification: [FEATURE NAME]
- Feature Specification: Unified Notes, To-Do with Reminders & 100% Web Share
- speckit-plan/SKILL.md
- speckit-specify/SKILL.md
- speckit-tasks/SKILL.md
- Core Principles
- Core Principles
- Implementation Plan: [FEATURE]
- Implementation Plan: [FEATURE]
- speckit-checklist/SKILL.md
- speckit-clarify/SKILL.md
- speckit-implement/SKILL.md
- speckit-constitution/SKILL.md
- [CHECKLIST TYPE] Checklist: [FEATURE NAME]
- value_t
- .Serialize
- 1. Reminder Subsystem Contracts
- Entities & Schemas
- Quickstart: Validation & Verification Guide
- Review Focus
- Contract: Web Share Payload & Universal Viewer Schema
- std::string to_string
- main.cpp
- ReminderEntry
- namespace
- iostream
- handle_value
- Technical Unknowns & Decisions

## God Nodes (most connected - your core abstractions)
1. `string` - 55 edges
2. `basic_json()` - 37 edges
3. `operator<()` - 34 edges
4. `handle_value()` - 28 edges
5. `end()` - 26 edges
6. `json_sax_dom_callback_parser` - 25 edges
7. `begin()` - 25 edges
8. `push_back()` - 25 edges
9. `size()` - 24 edges
10. `namespace()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `1. Windows Notification Architecture: Native Win32 vs C++/WinRT` --references--> `WndProc()`  [INFERRED]
  specs/001-unified-notes-reminders/research.md → src/main.cpp
- `Task 5: Win32 WebView2 Host & C++ IPC Bridge` --references--> `IPCBridge`  [INFERRED]
  docs/superpowers/plans/2026-11-07-note-local-windows11.md → src/platform/ipc_message.h
- `Task 7: Multi-Tab UI, Tab Renaming & Clipboard Image Paste (`Ctrl+V`)` --references--> `IPCBridge`  [INFERRED]
  docs/superpowers/plans/2026-11-07-note-local-windows11.md → src/platform/ipc_message.h
- `Task 2: Core Data Types & Markdown Engine in C++` --references--> `MarkdownEngine`  [INFERRED]
  docs/superpowers/plans/2026-11-07-note-local-windows11.md → src/core/markdown_engine.h
- `Phase 2: Foundational (Blocking Prerequisites)` --references--> `ReminderSchedule`  [INFERRED]
  specs/001-unified-notes-reminders/tasks.md → src/core/note_model.h

## Import Cycles
- None detected.

## Communities (65 total, 11 thin omitted)

### Community 0 - "ControllerCompletedHandler"
Cohesion: 0.05
Nodes (18): ControllerCompletedHandler, m_cb, m_ref, STDMETHODCALLTYPE, EnvironmentCompletedHandler, m_cb, m_ref, STDMETHODCALLTYPE (+10 more)

### Community 1 - "share_service.h"
Cohesion: 0.15
Nodes (12): ShareImageAttachment, local_path, mime_type, width, ShareResult, error_message, public_url, share_id (+4 more)

### Community 2 - "steps"
Cohesion: 0.06
Nodes (30): args, inputs, integration, spec, default, prompt, type, any (+22 more)

### Community 3 - "json.hpp"
Cohesion: 0.04
Nodes (20): adl_serializer, array(), clear(), dump_integer(), from_json(), get_error_message(), get_number_unsigned(), get_position() (+12 more)

### Community 4 - "end"
Cohesion: 0.13
Nodes (28): at(), begin(), cbegin(), cend(), contains(), convert(), count(), diff() (+20 more)

### Community 5 - "ReminderManager"
Cohesion: 0.21
Nodes (6): MakeKey(), ReminderManager, m_mutex, m_reminders, main(), string

### Community 6 - "editor.js"
Cohesion: 0.09
Nodes (42): appendColumn(), appendRow(), checkAndApplyReminder(), closeTab(), closeTabSearchModal(), compressImageViaCanvas(), createTableElement(), createTodoElement() (+34 more)

### Community 7 - "pages.yml"
Cohesion: 0.08
Nodes (25): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+17 more)

### Community 8 - "HandleWebMessage"
Cohesion: 0.19
Nodes (9): Task 3: Local Storage Manager & Tab Lifecycle, StorageManager, HandleWebMessage(), SendInitState(), main(), test_save_and_load_markdown(), test_save_asset_image(), test_storage_config_and_utf8() (+1 more)

### Community 10 - "markdown_engine.cpp"
Cohesion: 0.23
Nodes (15): MarkdownEngine, MarkdownEngine::ExtractTodos(), MarkdownEngine::ParseReminderSchedule(), MarkdownEngine::ParseToHtml(), MarkdownEngine::SerializeToMarkdown(), StripHtmlTags(), Trim(), UnescapeHtml() (+7 more)

### Community 12 - "common.ps1"
Cohesion: 0.16
Nodes (19): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-NormalizedPriority(), Get-Python3Command(), Get-RepoRoot() (+11 more)

### Community 13 - "🚀 Hướng dẫn sử dụng chi tiết"
Cohesion: 0.12
Nodes (15): 1. Khởi chạy ứng dụng, 2. Soạn thảo văn bản, To-Do List & Hẹn giờ nhắc việc (Reminders), 3. Bảng biểu phong cách Office (Tables), 4. Chèn & Quản lý hình ảnh, 5. Quản lý Thẻ ghi chú (Tabs), 6. Ghim cửa sổ (Always on Top), 7. Chia sẻ ghi chú qua Trình duyệt Web Serverless (GitHub Pages), 📄 Bản quyền (License) (+7 more)

### Community 14 - "Tasks: Unified Notes, To-Do with Reminders & 100% Web Share"
Cohesion: 0.10
Nodes (19): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description with exact file paths`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation Strategy, Incremental Delivery, MVP First (User Story 1 Only) (+11 more)

### Community 15 - "empty"
Cohesion: 0.40
Nodes (8): empty(), end_array(), end_object(), is_discarded(), parent_pointer(), pop_back(), set_parents(), unget()

### Community 16 - "app.js"
Cohesion: 0.36
Nodes (7): decompress(), escapeHtml(), extractTitle(), loadFromHash(), parseInline(), renderMarkdown(), updateDisplay()

### Community 17 - "get_impl_ptr"
Cohesion: 0.16
Nodes (17): binary(), binary_t, erase(), get_impl_ptr(), get_ptr(), is_array(), is_binary(), is_boolean() (+9 more)

### Community 18 - ".SetAlwaysOnTop"
Cohesion: 0.25
Nodes (7): Task 4: Win32 Window Controller & Always-on-Top Pin, Task 8: Full End-to-End Integration, Config Persistence & Polish, WinMain(), WindowController, main(), test_window_null_safety(), test_window_topmost_toggle()

### Community 19 - "Tasks: [FEATURE NAME]"
Cohesion: 0.07
Nodes (26): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation Strategy, Incremental Delivery, MVP First (User Story 1 Only) (+18 more)

### Community 21 - "rbegin"
Cohesion: 0.53
Nodes (4): crbegin(), crend(), rbegin(), rend()

### Community 22 - "Review Focus"
Cohesion: 0.33
Nodes (6): Review Focus, Task 1: Environment Scaffolding, CMake & Git Setup, Task 2: Core Data Types & Markdown Engine in C++, Task 5: Win32 WebView2 Host & C++ IPC Bridge, Task 6: Smart Inline Note Editor Frontend (`[]` -> Checkbox & Backspace), Task 7: Multi-Tab UI, Tab Renaming & Clipboard Image Paste (`Ctrl+V`)

### Community 23 - "basic_json"
Cohesion: 0.15
Nodes (12): basic_json(), decode(), dump_float(), flatten(), get_impl(), patch(), to_bjdata(), to_bson() (+4 more)

### Community 24 - "speckit-analyze/SKILL.md"
Cohesion: 0.08
Nodes (25): 1. Initialize Analysis Context, 2. Load Artifacts (Progressive Disclosure), 3. Build Semantic Models, 4. Detection Passes (Token-Efficient Analysis), 5. Severity Assignment, 6. Produce Compact Analysis Report, 7. Provide Next Actions, 8. Offer Remediation (+17 more)

### Community 25 - "Execution Steps"
Cohesion: 0.12
Nodes (15): 1. Initialize Convergence Context, 2. Load Artifacts (Progressive Disclosure), 3. Build the Intent Inventory, 4. Assess the Codebase and Classify Findings, 5. Assign Severity, 6. Present the In-Session Findings Summary, 7. Append Convergence Tasks (or report converged), 8. Provide Next Actions (Handoff) (+7 more)

### Community 26 - "basic_json"
Cohesion: 0.25
Nodes (10): accept(), from_bjdata(), from_bson(), from_cbor(), from_msgpack(), from_ubjson(), operator "" _json(), operator "" _json_pointer() (+2 more)

### Community 27 - "TodoItem"
Cohesion: 0.09
Nodes (24): NoteDoc, id, raw_markdown, title, todos, ReminderSchedule, display_datetime, notified_at (+16 more)

### Community 28 - "operator<"
Cohesion: 0.12
Nodes (6): compares_unordered(), emplace_back(), if(), json_pointer operator/(), operator<(), set_parent()

### Community 30 - "NotificationService"
Cohesion: 0.10
Nodes (10): NotificationService, NotificationService::Init(), m_callback_msg, m_hwnd, m_icon, m_icon_added, m_last_item_id, m_last_note_id (+2 more)

### Community 31 - "AppConfig"
Cohesion: 0.20
Nodes (8): AppConfig, active_tab_id, always_on_top, tabs, window_h, window_w, window_x, window_y

### Community 32 - "Feature Specification: [FEATURE NAME]"
Cohesion: 0.15
Nodes (12): Assumptions, Edge Cases, Feature Specification: [FEATURE NAME], Functional Requirements, Key Entities *(include if feature involves data)*, Measurable Outcomes, Requirements *(mandatory)*, Success Criteria *(mandatory)* (+4 more)

### Community 33 - "Feature Specification: Unified Notes, To-Do with Reminders & 100% Web Share"
Cohesion: 0.15
Nodes (12): Assumptions, Edge Cases, Feature Specification: Unified Notes, To-Do with Reminders & 100% Web Share, Functional Requirements, Key Entities, Measurable Outcomes, Requirements *(mandatory)*, Success Criteria *(mandatory)* (+4 more)

### Community 34 - "speckit-plan/SKILL.md"
Cohesion: 0.18
Nodes (10): Completion Report, Done When, Key rules, Mandatory Post-Execution Hooks, Outline, Phase 0: Outline & Research, Phase 1: Design & Contracts, Phases (+2 more)

### Community 35 - "speckit-specify/SKILL.md"
Cohesion: 0.18
Nodes (10): Completion Report, Done When, For AI Generation, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, Quick Guidelines, Section Requirements (+2 more)

### Community 36 - "speckit-tasks/SKILL.md"
Cohesion: 0.18
Nodes (10): Checklist Format (REQUIRED), Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Phase Structure, Pre-Execution Checks, Task Generation Rules (+2 more)

### Community 37 - "Core Principles"
Cohesion: 0.18
Nodes (10): Core Principles, Governance, [PRINCIPLE_1_NAME], [PRINCIPLE_2_NAME], [PRINCIPLE_3_NAME], [PRINCIPLE_4_NAME], [PRINCIPLE_5_NAME], [PROJECT_NAME] Constitution (+2 more)

### Community 38 - "Core Principles"
Cohesion: 0.20
Nodes (9): Core Principles, Governance, I. Ultra-Minimalist & High Performance (Non-Negotiable), II. Local-First & Zero Data Loss, III. Deep Windows 11 Desktop Integration, IV. 100% Content Fidelity in Web Sharing, Note Local Constitution, Technology Stack & Constraints (+1 more)

### Community 39 - "Implementation Plan: [FEATURE]"
Cohesion: 0.22
Nodes (8): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: [FEATURE], Project Structure, Source Code (repository root), Summary, Technical Context

### Community 40 - "Implementation Plan: [FEATURE]"
Cohesion: 0.22
Nodes (8): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Unified Notes, To-Do with Reminders & 100% Web Share, Project Structure, Source Code Layout (repository root), Summary, Technical Context

### Community 41 - "speckit-checklist/SKILL.md"
Cohesion: 0.25
Nodes (7): Anti-Examples: What NOT To Do, Checklist Purpose: "Unit Tests for English", Example Checklist Types & Sample Items, Execution Steps, Post-Execution Checks, Pre-Execution Checks, User Input

### Community 42 - "speckit-clarify/SKILL.md"
Cohesion: 0.29
Nodes (6): Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, User Input

### Community 43 - "speckit-implement/SKILL.md"
Cohesion: 0.29
Nodes (6): Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, User Input

### Community 45 - "speckit-constitution/SKILL.md"
Cohesion: 0.33
Nodes (5): Outline, Post-Execution Checks, Pre-Execution Checks, Scope Guard, User Input

### Community 46 - "[CHECKLIST TYPE] Checklist: [FEATURE NAME]"
Cohesion: 0.40
Nodes (4): [Category 1], [Category 2], [CHECKLIST TYPE] Checklist: [FEATURE NAME], Notes

### Community 47 - "value_t"
Cohesion: 0.13
Nodes (14): data, m_type, m_value, type(), value_t, array, binary, boolean (+6 more)

### Community 49 - ".Serialize"
Cohesion: 0.28
Nodes (7): IPCBridge, main(), test_ipc_base64_roundtrip(), test_ipc_copy_to_clipboard_message(), test_ipc_malformed_json(), test_ipc_open_url_message(), test_ipc_serialize_parse()

### Community 50 - "1. Reminder Subsystem Contracts"
Cohesion: 0.20
Nodes (9): 1. Reminder Subsystem Contracts, 2. 100% Web Share Subsystem Contracts, `cancel_reminder` (Frontend -> C++ Host), Contract: Internal IPC Protocol (Win32 Host <-> WebView2 Frontend), `notification_clicked` (C++ Host -> Frontend), `publish_web_share` (Frontend -> C++ Host), `reminder_triggered` (C++ Host -> Frontend), `schedule_reminder` (Frontend -> C++ Host) (+1 more)

### Community 51 - "Entities & Schemas"
Cohesion: 0.22
Nodes (8): 1. Note (Document Entity), 2. ToDoItem (Task Entity), 3. ReminderSchedule (Value Object), 4. EmbeddedImage (Asset Entity), 5. ShareSnapshot (Transfer Entity), Data Model: Unified Notes, To-Do with Reminders & 100% Web Share, Entities & Schemas, State Transitions:

### Community 52 - "Quickstart: Validation & Verification Guide"
Cohesion: 0.25
Nodes (7): Build & Run, Prerequisites, Quickstart: Validation & Verification Guide, Scenario 1: Inline To-Do with Scheduled Reminder (P1), Scenario 2: 1-Click Web Sharing with 100% Content & Images (P2), Scenario 3: Pinning & Ultra-Fast Desktop Scratchpad (P3), Verification Scenarios

### Community 53 - "Review Focus"
Cohesion: 0.25
Nodes (6): Global Constraints, Note Local Windows 11 Implementation Plan, Self-Review Checklist, IPCMessage, action, payload

### Community 55 - "Contract: Web Share Payload & Universal Viewer Schema"
Cohesion: 0.50
Nodes (3): 1. Web Share Payload Schema (Cloud Document), 2. Universal Web Viewer Requirements, Contract: Web Share Payload & Universal Viewer Schema

### Community 57 - "main.cpp"
Cohesion: 0.14
Nodes (3): GenerateShareId(), ReadBinaryFile(), ShareService::BuildSharePayload()

### Community 58 - "ReminderEntry"
Cohesion: 0.22
Nodes (8): ReminderEntry, display_time, item_id, note_id, notified_at, status, target_timestamp, text

### Community 59 - "namespace"
Cohesion: 0.14
Nodes (7): add(), get(), json_sax_acceptor, namespace(), scan(), skip_bom(), skip_whitespace()

### Community 62 - "handle_value"
Cohesion: 0.10
Nodes (29): back(), boolean(), get_number_float(), get_token_string(), handle_value(), hex_bytes(), json_sax_dom_callback_parser, allow_exceptions (+21 more)

### Community 63 - "Technical Unknowns & Decisions"
Cohesion: 0.29
Nodes (6): 1. Windows Notification Architecture: Native Win32 vs C++/WinRT, 2. Background Reminder Scheduler Engine, 3. Inline Reminder Syntax & Storage Representation, 4. 100% Web Share Architecture & Image Hosting, Research: Unified Notes, To-Do with Reminders & 100% Web Share, Technical Unknowns & Decisions

## Knowledge Gaps
- **78 isolated node(s):** `m_cb`, `m_ref`, `STDMETHODCALLTYPE`, `m_cb`, `m_ref` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 469 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `string` connect `ReminderManager` to `ControllerCompletedHandler`, `share_service.h`, `json.hpp`, `HandleWebMessage`, `markdown_engine.cpp`, `value_t`, `.Serialize`, `WndProc`, `Review Focus`, `main.cpp`, `ReminderEntry`, `TodoItem`, `iostream`, `NotificationService`, `AppConfig`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **What connects `m_cb`, `m_ref`, `STDMETHODCALLTYPE` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ControllerCompletedHandler` be split into smaller, more focused modules?**
  _Cohesion score 0.05028248587570622 - nodes in this community are weakly interconnected._
- **Why does `ReminderSchedule` connect `TodoItem` to `markdown_engine.cpp`, `ReminderManager`, `Tasks: Unified Notes, To-Do with Reminders & 100% Web Share`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `steps` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Why does `NotificationService` connect `NotificationService` to `main.cpp`, `.SetAlwaysOnTop`, `WndProc`, `ReminderManager`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `json.hpp` be split into smaller, more focused modules?**
  _Cohesion score 0.0375462718138551 - nodes in this community are weakly interconnected._