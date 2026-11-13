# Graph Report - NOTE_LOCAL  (2026-11-13)

## Corpus Check
- 111 files · ~164,927 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .css 2, .iss 1)

## Summary
- 1422 nodes · 2497 edges · 125 communities (70 shown, 55 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21f0bee5`
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
- storage_manager.cpp
- triggerSave
- markdown_engine.cpp
- devDependencies
- common.ps1
- README.md
- steps
- rbegin
- app.js
- Tasks: Unified Notes, To-Do with Reminders & 100% Web Share
- dependencies
- Tasks: [FEATURE NAME]
- notion_package.json
- get_impl_ptr
- 2. Hệ Thống Cơ Sở Dữ Liệu (Databases & Views)
- value_t
- speckit-analyze/SKILL.md
- Execution Steps
- basic_json
- TodoItem
- operator<
- note-local.md
- NotificationService
- 🔍 Lần Dấu Vận Hành Bên Trong Ứng Dụng (Trace How Features Work Inside Notion)
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
- 📖 Phân Tích Chuyên Sâu Các Tính Năng Cốt Lõi Của Notion (Features Deep-Dive)
- speckit-constitution/SKILL.md
- [CHECKLIST TYPE] Checklist: [FEATURE NAME]
- 🔬 Báo Cáo Phân Tích Kỹ Thuật Đảo Ngược Notion (REA Evidence Report)
- 🏗️ Đề Xuất Kiến Trúc "Mini-Notion": Bản Thiết Kế Khả Thi & Lộ Trình Xây Dựng (Mini-Notion Proposal)
- .Serialize
- ⚖️ Ma Trận Kiểm Chứng Kỹ Thuật (Proven vs. Inferred vs. Hidden)
- Entities & Schemas
- Quickstart: Validation & Verification Guide
- scripts
- notion_outputs_reference/README.md
- Contract: Web Share Payload & Universal Viewer Schema
- Technical Unknowns & Decisions
- main.cpp
- 4. Các Dịch Vụ Cần Xây Dựng (Required Services)
- namespace
- 2. TÀI LIỆU BÀN GIAO CHUYÊN SÂU CHO CHATGPT 6.1 SOL
- 5. Cộng Tác Thời Gian Thực & Chia Sẻ (Collaboration & Sharing)
- handle_value
- .SetAlwaysOnTop
- @electron/packager
- bindings@1.5.0
- classnames@2.3.2
- colord@2.9.3
- @common/ai@file:../common/ai
- test_framework.h
- @common/crdt@file:../common/crdt
- @common/i18n@file:../common/i18n
- createTodoElement
- Review Focus
- @common/ndsIcons@file:../common/ndsIcons
- @common/ndsToaster@file:../common/ndsToaster
- @common/oauthPopup@file:../common/oauthPopup
- editor_interactions.mjs
- @common/resourceScheduler@file:../common/resourceScheduler
- bindLinkEvents
- sendIPC
- serializeEditorToMarkdown
- initSlashMenu
- electron-store@8.2.0
- electron-updater@6.8.9
- @electron/windows-sign@1.2.0
- @eneris/push-receiver@4.3.1
- @common/applecartRouting@file:../common/applecartRouting
- @hitarth-gg/devtron@0.0.0-development.11
- @common/lazyDependency@file:../common/lazyDependency
- js-yaml@3.13.1
- loudness@0.4.2
- @noble/hashes@1.7.1
- node-addon-api@6.1.0
- @common/nds@file:../common/nds
- @common/recordModels@file:../common/recordModels
- @notionhq/shared-icons@file:../shared-icons
- @notionhq/shared-intl@file:../shared-intl
- @common/utils@file:../common/utils
- date-fns@4.1.0
- @photon-ai/imessage-kit@3.0.0
- dbus-next@0.10.2
- react-dom@19.3.0-canary-2dc7da79-20260828
- react-intl@6.6.8
- semver@7.3.5
- @sentry/electron@7.11.0
- electron-log@4.4.8
- url@0.11.0
- events@3.3.0
- @jasonscheirer/native-progress-bar@1.1.2
- @notionhq/shared@file:../shared
- @notionhq/shared-clientMcp@file:../shared-clientMcp
- @notionhq/shared-mcpFileTransfer@file:../shared-mcpFileTransfer
- @notionhq/shared-sqlite@file:../shared-sqlite
- react@19.3.0-canary-2dc7da79-20260828
- @statsig/client-core@3.17.1

## God Nodes (most connected - your core abstractions)
1. `string` - 58 edges
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
- `Task 2: Core Data Types & Markdown Engine in C++` --references--> `MarkdownEngine`  [INFERRED]
  docs/superpowers/plans/2026-11-07-note-local-windows11.md → src/core/markdown_engine.h
- `5.1 Kiến trúc Đồng Bộ Thời Gian Thực (CRDT & Transactions)` --references--> `update()`  [INFERRED]
  docs/notion_outputs_reference/02_notion_features_deep_dive.md → third_party/json/json.hpp
- `1. Windows Notification Architecture: Native Win32 vs C++/WinRT` --references--> `WndProc()`  [INFERRED]
  specs/001-unified-notes-reminders/research.md → src/main.cpp
- `Self-Review Checklist` --references--> `AppConfig`  [INFERRED]
  docs/superpowers/plans/2026-11-07-note-local-windows11.md → src/core/storage_manager.h
- `Task 5: Win32 WebView2 Host & C++ IPC Bridge` --references--> `IPCBridge`  [INFERRED]
  docs/superpowers/plans/2026-11-07-note-local-windows11.md → src/platform/ipc_message.h

## Import Cycles
- None detected.

## Communities (125 total, 55 thin omitted)

### Community 0 - "ControllerCompletedHandler"
Cohesion: 0.06
Nodes (18): ControllerCompletedHandler, m_cb, m_ref, STDMETHODCALLTYPE, EnvironmentCompletedHandler, m_cb, m_ref, STDMETHODCALLTYPE (+10 more)

### Community 1 - "share_service.h"
Cohesion: 0.11
Nodes (14): GenerateShareId(), ReadBinaryFile(), ShareImageAttachment, local_path, mime_type, width, ShareResult, error_message (+6 more)

### Community 2 - "steps"
Cohesion: 0.06
Nodes (30): args, inputs, integration, spec, default, prompt, type, any (+22 more)

### Community 3 - "json.hpp"
Cohesion: 0.04
Nodes (20): adl_serializer, clear(), dump_integer(), from_json(), get_error_message(), get_number_unsigned(), get_position(), is_negative_number() (+12 more)

### Community 4 - "end"
Cohesion: 0.15
Nodes (27): begin(), cbegin(), cend(), contains(), count(), diff(), emplace(), end() (+19 more)

### Community 5 - "ReminderManager"
Cohesion: 0.13
Nodes (13): MakeKey(), ReminderEntry, display_time, item_id, note_id, notified_at, status, target_timestamp (+5 more)

### Community 6 - "editor.js"
Cohesion: 0.11
Nodes (19): closeTab(), closeTabSearchModal(), cycleTab(), extractUrlsFromText(), getDomainOrTitleFromUrl(), handleIPC(), hideImageResizer(), insertImage() (+11 more)

### Community 7 - "pages.yml"
Cohesion: 0.08
Nodes (25): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+17 more)

### Community 8 - "storage_manager.cpp"
Cohesion: 0.10
Nodes (15): Task 3: Local Storage Manager & Tab Lifecycle, AppConfig, active_tab_id, always_on_top, tabs, window_h, window_w, window_x (+7 more)

### Community 9 - "triggerSave"
Cohesion: 0.20
Nodes (18): appendColumn(), appendRow(), closeLinkEditPopover(), createTableElement(), deleteColumn(), deleteRow(), deleteTable(), initLinkControls() (+10 more)

### Community 10 - "markdown_engine.cpp"
Cohesion: 0.18
Nodes (15): EscapeHtml(), MarkdownEngine, StripHtmlTags(), Trim(), UnescapeHtml(), main(), test_bullet_and_numbered_lists(), test_extract_todos() (+7 more)

### Community 11 - "devDependencies"
Cohesion: 0.04
Nodes (53): devDependencies, css-loader@6.10.0, devtools-protocol@0.0.1527314, electron@45.3.1, @electron-forge/cli@7.8.1, @electron-forge/core@7.8.1, @electron-forge/maker-dmg@7.8.1, @electron-forge/maker-zip@7.8.1 (+45 more)

### Community 12 - "common.ps1"
Cohesion: 0.16
Nodes (19): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-NormalizedPriority(), Get-Python3Command(), Get-RepoRoot() (+11 more)

### Community 13 - "README.md"
Cohesion: 0.08
Nodes (24): 1. Chuẩn bị WebView2 SDK (Nếu chưa có), 1. Chạy 7 bộ kiểm thử C++ Native:, 2. Chạy 29 kịch bản kiểm thử E2E Giao diện & Tương tác Notion (Headless Browser):, 2. Cấu hình và Biên dịch, 🧪 Chạy Kiểm thử tự động (Test Suites), 🤖 CI/CD Workflow, 🔨 Các bước biên dịch từ mã nguồn (Build with CMake), Hướng dẫn Kỹ thuật & Biên dịch NoteLocal (Development Guide) (+16 more)

### Community 14 - "steps"
Cohesion: 0.07
Nodes (28): permissions, runs-on, steps, GITHUB_TOKEN, tag, jobs, build-and-release, name (+20 more)

### Community 15 - "rbegin"
Cohesion: 0.53
Nodes (4): crbegin(), crend(), rbegin(), rend()

### Community 16 - "app.js"
Cohesion: 0.27
Nodes (7): decompress(), escapeHtml(), extractTitle(), loadFromHash(), parseInline(), renderMarkdown(), updateDisplay()

### Community 17 - "Tasks: Unified Notes, To-Do with Reminders & 100% Web Share"
Cohesion: 0.11
Nodes (18): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description with exact file paths`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation Strategy, Incremental Delivery, MVP First (User Story 1 Only) (+10 more)

### Community 18 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, app-builder-lib@24.13.3, @atlaskit/pragmatic-drag-and-drop-hitbox@1.0.3, @base-ui/react@1.6.0, better-sqlite3@13.0.1, cf-prefs@2.0.1, @common/importEntitySizeLimits@file:../common/importEntitySizeLimits, debug@4.4.0 (+37 more)

### Community 19 - "Tasks: [FEATURE NAME]"
Cohesion: 0.07
Nodes (26): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation Strategy, Incremental Delivery, MVP First (User Story 1 Only) (+18 more)

### Community 20 - "notion_package.json"
Cohesion: 0.06
Nodes (33): author, @atlaskit/pragmatic-drag-and-drop@1.4.0, @common/ndsTokens@file:../common/ndsTokens, @common/subscriptions@file:../common/subscriptions, @common/suspense@file:../common/suspense, email-validator@2.0.4, luxon@git://github.com/makenotion/luxon.git..., @notionhq/ai-meetingNotes@file:../ai-meetingNotes (+25 more)

### Community 21 - "get_impl_ptr"
Cohesion: 0.18
Nodes (13): binary(), binary_t, get_impl_ptr(), get_ptr(), is_binary(), is_boolean(), is_number(), is_number_float() (+5 more)

### Community 22 - "2. Hệ Thống Cơ Sở Dữ Liệu (Databases & Views)"
Cohesion: 0.50
Nodes (4): 2.1 Cấu trúc Schema Động (`collection.schema`), 2.2 Sáu Chế độ hiển thị trực quan (6 Collection Views), 2.3 Bộ máy Truy vấn và Lọc Dữ Liệu (`query2`), 2. Hệ Thống Cơ Sở Dữ Liệu (Databases & Views)

### Community 23 - "value_t"
Cohesion: 0.18
Nodes (11): type(), value_t, array, binary, boolean, discarded, null, number_float (+3 more)

### Community 24 - "speckit-analyze/SKILL.md"
Cohesion: 0.08
Nodes (25): 1. Initialize Analysis Context, 2. Load Artifacts (Progressive Disclosure), 3. Build Semantic Models, 4. Detection Passes (Token-Efficient Analysis), 5. Severity Assignment, 6. Produce Compact Analysis Report, 7. Provide Next Actions, 8. Offer Remediation (+17 more)

### Community 25 - "Execution Steps"
Cohesion: 0.12
Nodes (15): 1. Initialize Convergence Context, 2. Load Artifacts (Progressive Disclosure), 3. Build the Intent Inventory, 4. Assess the Codebase and Classify Findings, 5. Assign Severity, 6. Present the In-Session Findings Summary, 7. Append Convergence Tasks (or report converged), 8. Provide Next Actions (Handoff) (+7 more)

### Community 26 - "basic_json"
Cohesion: 0.13
Nodes (21): accept(), array(), basic_json(), decode(), flatten(), from_bjdata(), from_bson(), from_cbor() (+13 more)

### Community 27 - "TodoItem"
Cohesion: 0.09
Nodes (25): Phase 2: Foundational (Blocking Prerequisites), NoteDoc, id, raw_markdown, title, todos, ReminderSchedule, display_datetime (+17 more)

### Community 28 - "operator<"
Cohesion: 0.10
Nodes (13): at(), compares_unordered(), convert(), emplace_back(), front(), if(), is_array(), json_pointer (+5 more)

### Community 30 - "NotificationService"
Cohesion: 0.10
Nodes (8): NotificationService, m_callback_msg, m_hwnd, m_icon, m_icon_added, m_last_item_id, m_last_note_id, NotificationService::NotificationService()

### Community 31 - "🔍 Lần Dấu Vận Hành Bên Trong Ứng Dụng (Trace How Features Work Inside Notion)"
Cohesion: 0.14
Nodes (13): 1. Kiến Trúc Tiến Trình Electron (Process Architecture Trace), 2. Lần Dấu Chu Trình Render Giao Diện (UI Rendering Pipeline), 3. Lần Dấu Cơ Chế Biến Đổi Dữ Liệu & Giao Dịch (Transactions & Mutation Pipeline), 4. Lần Dấu Cơ Chế Offline-First (Offline Synchronization Trace), 5.1 Quản lý Phiên Hội Thoại & Suy Luận (Thread & Inference Lease), 5.2 Cơ chế MCP Client Host (.webpack/main/ClientMcpHostWorker.js), 5. Lần Dấu Tính Năng Notion AI & Tác Tử MCP (AI & Agents Execution Trace), Bằng chứng từ bảng `offline_page` & `offline_action`: (+5 more)

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

### Community 44 - "📖 Phân Tích Chuyên Sâu Các Tính Năng Cốt Lõi Của Notion (Features Deep-Dive)"
Cohesion: 0.12
Nodes (16): 1.1 Cấu trúc phân cấp vô hạn (Infinite Tree Hierarchy), 1.2 Định dạng Rich Text dạng mảng 2D (Rich Text Representation), 1.3 Canvas tự do & Trang trí (Page Aesthetics), 1. Ghi Chú & Tài Liệu (Notes & Documents), 3.1 Bảng tổng hợp các loại khối phổ biến, 3.2 Tương tác Khối (Block Interaction), 3. Hệ Thống Khối (The Block System), 4. Hệ Thống Biểu Mẫu Mẫu (Templates) (+8 more)

### Community 45 - "speckit-constitution/SKILL.md"
Cohesion: 0.33
Nodes (5): Outline, Post-Execution Checks, Pre-Execution Checks, Scope Guard, User Input

### Community 46 - "[CHECKLIST TYPE] Checklist: [FEATURE NAME]"
Cohesion: 0.40
Nodes (4): [Category 1], [Category 2], [CHECKLIST TYPE] Checklist: [FEATURE NAME], Notes

### Community 47 - "🔬 Báo Cáo Phân Tích Kỹ Thuật Đảo Ngược Notion (REA Evidence Report)"
Cohesion: 0.18
Nodes (11): 1. Thông Tin Nhận Dạng Mục Tiêu (Target Artifact Identification), 2. Kiểm Tra Cầu Chì Bảo Mật Electron (Electron Fuses Inspection), 3.1 Cây thư mục cấp cao, 3. Phân Tích Gói Mã Nguồn Ứng Dụng (ASAR Structure Analysis), 4. Bằng Chứng Phụ Thuộc Cốt Lõi (Core Dependencies Evidence), 5.1 Danh sách 23 Bảng cơ sở dữ liệu thực tế (Verified Tables), 5. Phân Tích Cơ Sở Dữ Liệu Cục Bộ (SQLite Database Inspection), 6. Trích Xuất Các Loại Khối Thực Tế (Block Types Census) (+3 more)

### Community 48 - "🏗️ Đề Xuất Kiến Trúc "Mini-Notion": Bản Thiết Kế Khả Thi & Lộ Trình Xây Dựng (Mini-Notion Proposal)"
Cohesion: 0.22
Nodes (9): 1. Triết Lý Thiết Kế: "Notion Core, Không Cồng Kềnh" (Philosophy), 2. Kiến Trúc Phân Lớp (Layered Architecture Blueprint), 3. Lược Đồ Cơ Sở Dữ Liệu Tinh Gọn (Minimal SQLite Schema), 5. Lộ Trình Triển Khai 3 Giai Đoạn (Phased Roadmap), 6. Kết Luận, Giai đoạn 1: Nền Tảng Khối & Biên Tập (Block Foundations - 1 tuần), Giai đoạn 2: Cơ Sở Dữ Liệu & Chế Độ Xem (Database & Views - 2 tuần), Giai đoạn 3: Trí Tuệ Nhân Tạo & Xuất Bản (AI, MCP & Export - 1 tuần) (+1 more)

### Community 49 - ".Serialize"
Cohesion: 0.24
Nodes (9): Task 5: Win32 WebView2 Host & C++ IPC Bridge, Task 7: Multi-Tab UI, Tab Renaming & Clipboard Image Paste (`Ctrl+V`), IPCBridge, main(), test_ipc_base64_roundtrip(), test_ipc_copy_to_clipboard_message(), test_ipc_malformed_json(), test_ipc_open_url_message() (+1 more)

### Community 50 - "⚖️ Ma Trận Kiểm Chứng Kỹ Thuật (Proven vs. Inferred vs. Hidden)"
Cohesion: 0.25
Nodes (7): 1. Bảng Ma Trận Tổng Hợp, 2.1 Bằng chứng nhị phân & Hệ điều hành, 2.2 Bằng chứng cơ sở dữ liệu `notion.db`, 2. Chi Tiết Các Bằng Chứng Đã Được Chứng Minh (Proven Evidence), 3. Các Điểm Suy Luận Có Căn Cứ Cao (Inferred Insights), 4. Những Phần Ẩn Kín Hoàn Toàn (Hidden Domains), ⚖️ Ma Trận Kiểm Chứng Kỹ Thuật (Proven vs. Inferred vs. Hidden)

### Community 51 - "Entities & Schemas"
Cohesion: 0.22
Nodes (8): 1. Note (Document Entity), 2. ToDoItem (Task Entity), 3. ReminderSchedule (Value Object), 4. EmbeddedImage (Asset Entity), 5. ShareSnapshot (Transfer Entity), Data Model: Unified Notes, To-Do with Reminders & 100% Web Share, Entities & Schemas, State Transitions:

### Community 52 - "Quickstart: Validation & Verification Guide"
Cohesion: 0.25
Nodes (7): Build & Run, Prerequisites, Quickstart: Validation & Verification Guide, Scenario 1: Inline To-Do with Scheduled Reminder (P1), Scenario 2: 1-Click Web Sharing with 100% Content & Images (P2), Scenario 3: Pinning & Ultra-Fast Desktop Scratchpad (P3), Verification Scenarios

### Community 53 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, ci-dummy-job1, ci-dummy-job2, make, package, playwright, postinstall, start

### Community 54 - "notion_outputs_reference/README.md"
Cohesion: 0.20
Nodes (5): 📚 Bộ Tài Liệu Nghiên Cứu Kỹ Thuật Đảo Ngược Notion (Notion Reverse Engineering Reference), 🛠️ Công Cụ Phân Tích Đã Sử Dụng, 🗂️ Danh Mục Tài Liệu, Global Constraints, Mini-Notion UX & Local/Cloud AI Integration Implementation Plan

### Community 55 - "Contract: Web Share Payload & Universal Viewer Schema"
Cohesion: 0.50
Nodes (3): 1. Web Share Payload Schema (Cloud Document), 2. Universal Web Viewer Requirements, Contract: Web Share Payload & Universal Viewer Schema

### Community 56 - "Technical Unknowns & Decisions"
Cohesion: 0.29
Nodes (6): 1. Windows Notification Architecture: Native Win32 vs C++/WinRT, 2. Background Reminder Scheduler Engine, 3. Inline Reminder Syntax & Storage Representation, 4. 100% Web Share Architecture & Image Hosting, Research: Unified Notes, To-Do with Reminders & 100% Web Share, Technical Unknowns & Decisions

### Community 57 - "main.cpp"
Cohesion: 0.15
Nodes (6): HandleWebMessage(), PostWebMessageSafe(), ResolveRedirectUrl(), SendInitState(), ShortenUrlWithTinyUrl(), WndProc()

### Community 58 - "4. Các Dịch Vụ Cần Xây Dựng (Required Services)"
Cohesion: 0.33
Nodes (6): 4.1 Local Storage Service (Dịch vụ Lưu trữ & Truy vấn Cục bộ), 4.2 Block Canvas & Interactive Editor (Dịch vụ Dựng hình Khối), 4.3 Database View Engine (Dịch vụ Hiển thị Cơ sở Dữ liệu), 4.4 Local AI & MCP Integration (Dịch vụ Trí tuệ Nhân tạo & Công cụ), 4.5 Share & Export Service (Dịch vụ Chia sẻ & Xuất bản), 4. Các Dịch Vụ Cần Xây Dựng (Required Services)

### Community 59 - "namespace"
Cohesion: 0.08
Nodes (20): add(), data, m_type, m_value, dump_float(), get(), get_number_float(), get_token_string() (+12 more)

### Community 60 - "2. TÀI LIỆU BÀN GIAO CHUYÊN SÂU CHO CHATGPT 6.1 SOL"
Cohesion: 0.13
Nodes (14): 1. BÁO CÁO BUG & PHÂN TÍCH KỸ THUẬT GỐC RỄ (ROOT CAUSE ANALYSIS), 2.1 Tổng quan kiến trúc NoteLocal & Ràng buộc phi chức năng, 2.2 Cấu trúc tệp tin trọng yếu trong repository, 2.3 Luồng dữ liệu IPC (Win32 C++ <-> WebView2 ES6), 2.4 Thiết kế kiến trúc giải pháp chuẩn hóa, 2. TÀI LIỆU BÀN GIAO CHUYÊN SÂU CHO CHATGPT 6.1 SOL, 3. PROMPT CHUẨN HÓA ĐỂ GỬI CHO OPENAI CODEX, Bug 1: Cloud AI không phản hồi khi dán API Key (+6 more)

### Community 61 - "5. Cộng Tác Thời Gian Thực & Chia Sẻ (Collaboration & Sharing)"
Cohesion: 0.50
Nodes (4): 5.1 Kiến trúc Đồng Bộ Thời Gian Thực (CRDT & Transactions), 5.2 Thảo Luận, Bình Luận & Phản Hồi, 5.3 Chia sẻ công khai & Phân quyền (Permissions), 5. Cộng Tác Thời Gian Thực & Chia Sẻ (Collaboration & Sharing)

### Community 62 - "handle_value"
Cohesion: 0.11
Nodes (28): back(), boolean(), empty(), end_array(), end_object(), handle_value(), is_discarded(), json_sax_dom_callback_parser (+20 more)

### Community 63 - ".SetAlwaysOnTop"
Cohesion: 0.08
Nodes (26): Global Constraints, Note Local Windows 11 Implementation Plan, Review Focus, Self-Review Checklist, Task 1: Environment Scaffolding, CMake & Git Setup, Task 2: Core Data Types & Markdown Engine in C++, Task 4: Win32 Window Controller & Always-on-Top Pin, Task 6: Smart Inline Note Editor Frontend (`[]` -> Checkbox & Backspace) (+18 more)

### Community 64 - "@electron/packager"
Cohesion: 0.67
Nodes (3): @electron/packager@18.3.5, electron-packager@17.1.2, @electron/packager

### Community 72 - "createTodoElement"
Cohesion: 0.26
Nodes (11): checkAndApplyReminder(), collapseCaret(), createTodoElement(), exitListItem(), expandMarkdownBlock(), initBlockHandles(), insertTodoAtCaret(), openReminderModal() (+3 more)

### Community 73 - "Review Focus"
Cohesion: 0.24
Nodes (11): Review Focus, Task 1: Floating Selection Bubble Toolbar & Smart Caret Boundaries, Task 2: Slash Command Menu (`/`) & Block Drag Handles (`⋮⋮`), Task 3: Local AI & Cloud AI Configuration in Settings Modal, Task 4: AI Prompt Bar, Streaming Execution & Presets, Task 5: C++ Serialization Verification, Web Viewer Sync & Unit Tests, Task 6: Build Release Binary, Live Testing, Documentation & Graphify, getAIConfig() (+3 more)

### Community 79 - "bindLinkEvents"
Cohesion: 0.40
Nodes (5): bindLinkEvents(), createLinkElement(), initBubbleToolbar(), openLinkEditPopover(), setupAllLinks()

### Community 80 - "sendIPC"
Cohesion: 0.40
Nodes (6): closeSharePopover(), decompressFromTxtUrl(), extractMarkdownFromUrl(), handleApplyUpdate(), resolveShortUrlViaIPC(), sendIPC()

### Community 81 - "serializeEditorToMarkdown"
Cohesion: 0.40
Nodes (6): compressImageViaCanvas(), getImageShareSrc(), getNoteMarkdown(), serializeEditorToMarkdown(), serializeListNode(), serializeTableToCleanHtml()

### Community 82 - "initSlashMenu"
Cohesion: 0.60
Nodes (4): initSlashMenu(), executeSlashCommand(), openSlashMenuAtCaret(), renderSlashItems()

## Knowledge Gaps
- **78 isolated node(s):** `m_cb`, `m_ref`, `STDMETHODCALLTYPE`, `m_cb`, `m_ref` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 581 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `string` connect `ReminderManager` to `ControllerCompletedHandler`, `share_service.h`, `json.hpp`, `test_framework.h`, `storage_manager.cpp`, `markdown_engine.cpp`, `.Serialize`, `value_t`, `main.cpp`, `TodoItem`, `NotificationService`, `.SetAlwaysOnTop`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `m_cb`, `m_ref`, `STDMETHODCALLTYPE` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ControllerCompletedHandler` be split into smaller, more focused modules?**
  _Cohesion score 0.05639097744360902 - nodes in this community are weakly interconnected._
- **Why does `update()` connect `end` to `namespace`, `json.hpp`, `operator<`, `5. Cộng Tác Thời Gian Thực & Chia Sẻ (Collaboration & Sharing)`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `share_service.h` be split into smaller, more focused modules?**
  _Cohesion score 0.11396011396011396 - nodes in this community are weakly interconnected._
- **Why does `📖 Phân Tích Chuyên Sâu Các Tính Năng Cốt Lõi Của Notion (Features Deep-Dive)` connect `📖 Phân Tích Chuyên Sâu Các Tính Năng Cốt Lõi Của Notion (Features Deep-Dive)` to `5. Cộng Tác Thời Gian Thực & Chia Sẻ (Collaboration & Sharing)`, `notion_outputs_reference/README.md`, `2. Hệ Thống Cơ Sở Dữ Liệu (Databases & Views)`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `steps` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._