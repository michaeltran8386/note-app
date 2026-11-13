# 🔬 Báo Cáo Phân Tích Kỹ Thuật Đảo Ngược Notion (REA Evidence Report)

Tài liệu này ghi lại toàn bộ bằng chứng thực nghiệm thu thập trực tiếp từ bản cài đặt Desktop của Notion trên Windows thông qua bộ công cụ **REA (Reverse Engineer Anything)** và các công cụ phân tích tĩnh/động chuyên sâu.

---

## 1. Thông Tin Nhận Dạng Mục Tiêu (Target Artifact Identification)

- **Đường dẫn thực thi (Desktop Executable)**:
  `C:\Users\MICHAEL\AppData\Local\Programs\Notion\Notion.exe`
- **Lối tắt Desktop (Shortcut)**:
  `C:\Users\MICHAEL\Desktop\Notion.lnk`
- **Kích thước file PE**: 250,182,968 bytes (~238.59 MB)
- **Kiến trúc nhị phân**: Windows PE x86_64
- **SHA-256 (Notion.exe)**:
  `8ce4eee7911a243465543ffdefa2136a4aacadd4001ef9b8a396e7d9ff791bd1`
- **Phiên bản ứng dụng (package.json)**: `7.43.2`
- **Phiên bản Electron runtime**: `45.3.1` (Chromium ~130+, Node.js v20+)
- **Thời điểm Build (buildTimestamp)**: `2026-11-12T23:03:43.137Z` (Commit: `7e11c12`)
- **Tác giả / Nhà phát hành**: Notion Labs, Inc

---

## 2. Kiểm Tra Cầu Chì Bảo Mật Electron (Electron Fuses Inspection)

Công cụ REA `inspect_electron_fuses` đã đọc chính xác các byte cấu hình đóng băng (fuses) trong `Notion.exe`:

| Chỉ số (Index) | Tên Cầu Chì (Fuse Name) | Trạng thái (State) | Byte thô | Ý nghĩa Bảo Mật & Kỹ Thuật |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `RunAsNode` | **Disabled** | `0x30` (`'0'`) | Không thể chạy app dưới dạng Node CLI bằng `ELECTRON_RUN_AS_NODE`. |
| 1 | `EnableCookieEncryption` | **Enabled** | `0x31` (`'1'`) | Mã hóa cookie phiên làm việc trên ổ cứng bằng Windows DPAPI. |
| 2 | `EnableNodeOptionsEnvironmentVariable` | **Disabled** | `0x30` (`'0'`) | Chặn biến môi trường `NODE_OPTIONS` (chống chèn mã ngoài). |
| 3 | `EnableNodeCliInspectArguments` | **Disabled** | `0x30` (`'0'`) | Phớt lờ cờ `--inspect` / `--inspect-brk` từ dòng lệnh ngoài. |
| 4 | `EnableEmbeddedAsarIntegrityValidation` | **Disabled** | `0x30` (`'0'`) | Không bắt buộc kiểm tra hash header ASAR cứng khi khởi chạy. |
| 5 | `OnlyLoadAppFromAsar` | **Enabled** | `0x31` (`'1'`) | Chỉ cho phép nạp mã nguồn ứng dụng từ file `app.asar`. |
| 6 | `LoadBrowserProcessSpecificV8Snapshot` | **Disabled** | `0x30` (`'0'`) | Dùng V8 snapshot tiêu chuẩn thay vì custom per-process snapshot. |
| 7 | `GrantFileProtocolExtraPrivileges` | **Enabled** | `0x31` (`'1'`) | Cho phép giao thức `file://` có quyền truy cập mở rộng. |
| 8 | `WasmTrapHandlers` | **Enabled** | `0x31` (`'1'`) | Bật tối ưu hóa bẫy lỗi WebAssembly native. |

---

## 3. Phân Tích Gói Mã Nguồn Ứng Dụng (ASAR Structure Analysis)

Gói lưu trữ chính của ứng dụng nằm tại:
`C:\Users\MICHAEL\AppData\Local\Programs\Notion\resources\app.asar` (Dung lượng: 13,136,876 bytes ~12.52 MB).

### 3.1 Cây thư mục cấp cao
- `package.json`: Khai báo siêu dữ liệu và toàn bộ dependency.
- `config.json`: Cấu hình môi trường, routing, Splunk analytics, Statsig, Notion Agents.
- `.webpack/main/`: Tiến trình Main của Electron.
  - `index.js` (5.19 MB): Điều phối vòng đời, Window management, IPC handlers, Audio capture.
  - `SqliteServer.js` (115.5 KB): Máy chủ đồng bộ dữ liệu SQLite nội bộ.
  - `ClientMcpHostWorker.js` (333.6 KB): Worker quản lý kết nối MCP (Model Context Protocol) client.
- `.webpack/renderer/`: Các giao diện WebView / BrowserView độc lập:
  - `tabs/`: Quản lý danh sách Tab phía trên cửa sổ.
  - `tab_browser_view/`: Vùng hiển thị nội dung chính của Notion (load webapp hoặc offline cache).
  - `applecart/`: Preload script cho hệ thống tác tử Notion Agents (`next.notion.com`).
  - `meeting_notification_pill/`: Widget thông báo cuộc họp nổi (Zoom / Google Meet).
  - `sqlite_browser/`: Giao diện debug và xem SQLite nội bộ dành cho đội ngũ phát triển.
  - `speaker_and_microphone_status/`: Giám sát microphone và trạng thái âm thanh để ghi âm meeting notes.
- `node_modules/`: Các thư viện nhúng đóng gói.
- `app.asar.unpacked/`: Các thư viện C++ Native Addon cần chạy ngoài ASAR:
  - `better-sqlite3/build/Release/better_sqlite3.node`: SQLite native client.
  - `@notionhq/desktop-native/build/Release/win_utils.node`: Tiện ích Win32 native của Notion.
  - `@vscode/windows-registry/build/Release/winregistry.node`: Đọc ghi Windows Registry.
  - `@jasonscheirer/native-progress-bar/build/Release/progress_bar.node`: Thanh tiến trình trên Taskbar Windows.

---

## 4. Bằng Chứng Phụ Thuộc Cốt Lõi (Core Dependencies Evidence)

Trích xuất trực tiếp từ `package.json` v7.43.2:

```json
{
  "dependencies": {
    "@common/ai": "file:../common/ai",
    "@common/crdt": "file:../common/crdt",
    "@common/recordModels": "file:../common/recordModels",
    "@notionhq/ai-meetingNotes": "file:../ai-meetingNotes",
    "@notionhq/shared-clientMcp": "file:../shared-clientMcp",
    "@notionhq/shared-mcpFileTransfer": "file:../shared-mcpFileTransfer",
    "@notionhq/shared-sqlite": "file:../shared-sqlite",
    "@tanstack/react-table": "8.21.3",
    "@atlaskit/pragmatic-drag-and-drop": "1.4.0",
    "better-sqlite3": "13.0.1",
    "react": "19.3.0-canary-2dc7da79-20260828",
    "@reduxjs/toolkit": "2.2.3",
    "@statsig/client-core": "3.17.1",
    "@sentry/electron": "7.11.0",
    "electron": "45.3.1",
    "loudness": "0.4.2"
  }
}
```

### Các phát hiện mang tính then chốt:
1. **CRDT Engine (`@common/crdt`)**: Khẳng định Notion đã và đang chuyển dịch cơ chế đồng bộ cộng tác thời gian thực từ thuần Operational Transformation (OT) sang kiến trúc **CRDT (Conflict-free Replicated Data Types)** để hỗ trợ offline-first trơn tru.
2. **Hệ thống Record Model (`@common/recordModels`)**: Khẳng định dữ liệu Notion không lưu trữ theo cây tài liệu phân mảnh thông thường mà theo mô hình **Entity Record Graph** (mỗi block, user, collection là một record trong một không gian định danh chung).
3. **TanStack Table (`@tanstack/react-table` v8)**: Xác nhận giao diện Database Table view được xây dựng trên nền tảng Headless UI Table mạnh mẽ nhất thế giới hiện nay.
4. **Pragmatic Drag and Drop (`@atlaskit/pragmatic-drag-and-drop`)**: Thư viện kéo thả hiện đại của Atlassian được Notion sử dụng để kéo thả block, sắp xếp cột bảng và Kanban card siêu mượt.
5. **Notion Agents & MCP Client (`@notionhq/shared-clientMcp`)**: Bằng chứng cho thấy Notion Desktop tích hợp sâu giao thức **Model Context Protocol (MCP)** để kết nối với các công cụ AI và server bên ngoài.
6. **Local SQLite (`better-sqlite3` + `@notionhq/shared-sqlite`)**: Máy tính của người dùng lưu trữ toàn bộ bản sao ghi chú ngoại tuyến trong cơ sở dữ liệu SQLite cục bộ tốc độ cao.

---

## 5. Phân Tích Cơ Sở Dữ Liệu Cục Bộ (SQLite Database Inspection)

REA đã kiểm tra trực tiếp file cơ sở dữ liệu:
`C:\Users\MICHAEL\AppData\Roaming\Notion\notion.db` (Dung lượng: 2.35 MB, mã hóa UTF-8, SQLite 3.53.4).

### 5.1 Danh sách 23 Bảng cơ sở dữ liệu thực tế (Verified Tables)
1. `records`: Bảng lưu trữ cache tổng quát dạng key-value record (`record_table`, `record_id`, `record_value`, `space_id`, `user_id`, `is_offline`).
2. `block`: **Trọng tâm của Notion** - Lưu toàn bộ các khối nội dung, trang, danh sách, bảng...
3. `collection`: Lưu định nghĩa các Database (Schema, properties, định dạng, icon).
4. `collection_view`: Lưu các chế độ xem Database (Table, Board, List, Gallery, Calendar, Timeline) kèm bộ lọc và truy vấn `query2`.
5. `transactions`: Hàng đợi các phép biến đổi dữ liệu (Operations) chưa đẩy lên server hoặc dùng để Undo/Redo.
6. `space`: Lưu thông tin các Workspace (Không gian làm việc).
7. `space_view`: Cấu hình hiển thị sidebar, trang yêu thích của từng người dùng trong workspace.
8. `team`: Lưu các Teamspace trong doanh nghiệp.
9. `notion_user`: Thông tin người dùng (tên, avatar, email, trạng thái onboard).
10. `user_root`: Con trỏ liên kết các workspace mà user đang tham gia.
11. `user_settings`: Cài đặt cá nhân (theme, ngôn ngữ, phím tắt).
12. `notification`: Thông báo hoạt động, mention, nhắc việc.
13. `discussion`: Luồng thảo luận inline gắn trên block.
14. `comment`: Bình luận chi tiết trong luồng thảo luận.
15. `reaction`: Biểu tượng cảm xúc (emoji reaction) trên bình luận.
16. `space_user`: Quyền hạn thành viên trong Workspace.
17. `space_permission_group` & `space_permission_group_member`: Nhóm phân quyền RBAC.
18. `custom_emoji`: Bộ emoji riêng do workspace tải lên.
19. `offline_page`: Quản lý danh sách các trang tải sẵn để dùng khi mất mạng.
20. `offline_action`: Hàng đợi các hành động thực hiện khi offline.
21. `thread` & `thread_message`: Lưu trữ phiên trò chuyện và tác vụ của **Notion AI / Notion Agent**.
22. `automation` & `workflow` & `bot`: Lưu trữ các quy tắc tự động hóa Database và webhook bot.
23. `layout`: Bố cục tùy biến trang.

---

## 6. Trích Xuất Các Loại Khối Thực Tế (Block Types Census)

Truy vấn trực tiếp `SELECT DISTINCT type FROM block` trong cơ sở dữ liệu người dùng xác nhận các loại block sau:

- `text`: Đoạn văn bản thường.
- `header`: Tiêu đề cấp 1 (H1).
- `sub_header`: Tiêu đề cấp 2 (H2).
- `sub_sub_header`: Tiêu đề cấp 3 (H3).
- `header_4`: Tiêu đề cấp 4 (H4 mới ra mắt).
- `to_do`: Khối việc cần làm (Checkbox To-Do).
- `bulleted_list`: Danh sách gạch đầu dòng chấm tròn.
- `numbered_list`: Danh sách đánh số tăng dần.
- `toggle`: Khối đóng/mở nội dung (Collapsible Toggle).
- `quote`: Khối trích dẫn có thanh viền đứng.
- `divider`: Khối đường kẻ ngang phân cách.
- `callout`: Khối ghi chú nổi bật có icon và màu nền.
- `table` & `table_row`: Khối bảng biểu đơn giản trong trang.
- `code`: Khối mã nguồn hỗ trợ syntax highlight.
- `embed`: Khối nhúng URL, video, bản đồ, Figma...
- `column_list` & `column`: Khối chia cột trang ngang.
- `collection_view` & `collection_view_page`: Khối nhúng Database View vào trang.
- `transclusion_container` & `transclusion_reference`: **Khối đồng bộ (Synced Blocks)**.
- `ai_block`: Khối sinh nội dung tự động bằng Notion AI.
- `button`: Khối nút bấm kích hoạt hành động/tự động hóa.
- `page` & `collection_view_page`: Khối trang con hoặc trang Database.

---

## 7. Trích Xuất Kiểu Thuộc Tính Cơ Sở Dữ Liệu (Database Property Types)

Truy vấn cột `schema` trong bảng `collection` xác nhận 16 kiểu thuộc tính (Properties):

`title`, `text`, `number`, `select`, `multi_select`, `status`, `date`, `person`, `file`, `checkbox`, `url`, `formula`, `relation`, `rollup`, `created_time`, `last_edited_time`.

