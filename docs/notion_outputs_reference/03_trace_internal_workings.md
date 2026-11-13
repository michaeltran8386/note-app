# 🔍 Lần Dấu Vận Hành Bên Trong Ứng Dụng (Trace How Features Work Inside Notion)

Tài liệu này truy vết (trace) chi tiết luồng xử lý dữ liệu, vòng lặp sự kiện, kiến trúc đa tiến trình và cơ chế đồng bộ vận hành bên trong Notion Desktop App dựa trên mã nguồn và cơ sở dữ liệu đã phân tích.

---

## 1. Kiến Trúc Tiến Trình Electron (Process Architecture Trace)

Notion Desktop không phải là một cửa sổ trình duyệt đơn lẻ mà là một hệ thống đa tiến trình phối hợp chặt chẽ:

```
[ Notion.exe (Main Process) ]
  ├── Cửa sổ chính (BrowserWindow)
  │     ├── Header Tabs Renderer (.webpack/renderer/tabs/)
  │     └── Tab BrowserViews (.webpack/renderer/tab_browser_view/)
  │           └── Web Client App (React 19 + Redux + TanStack Table)
  │
  ├── SQLite Server Worker (.webpack/main/SqliteServer.js)
  │     └── better-sqlite3 native driver -> notion.db (Local Disk)
  │
  ├── Client MCP Host Worker (.webpack/main/ClientMcpHostWorker.js)
  │     └── Kết nối Local MCP Servers & Tool Execution
  │
  └── Native Audio Host Process (notion-meeting-notes-host.exe)
        └── Ghi âm cuộc họp Zoom/Meet & trạng thái micro
```

### Chi tiết luồng khởi động:
1. Khi chạy `Notion.exe`, tiến trình Main nạp `.webpack/main/index.js`.
2. Khởi tạo `SqliteServer.js` kết nối file `AppData\Roaming\Notion\notion.db`.
3. Kiểm tra các cờ bảo mật (Electron fuses) và thiết lập proxy mạng.
4. Mở cửa sổ chính và gắn `tabs/index.html` làm thanh điều hướng tab.
5. Tạo một `BrowserView` gắn vào vùng nội dung chính, trỏ đến `https://app.notion.com` hoặc tải trang từ bộ nhớ đệm SQLite cục bộ nếu không có mạng.

---

## 2. Lần Dấu Chu Trình Render Giao Diện (UI Rendering Pipeline)

```
[ Cây phân cấp Block trong SQLite / Cache ]
                     │
                     ▼
[ RecordStore Cache (Redux Toolkit + RecordModels) ]
                     │
                     ▼
[ BlockRenderer Component (React 19 Canary) ]
   ├── ParagraphBlock (<p contenteditable>)
   ├── ListBlock (<ul> / <ol>)
   ├── ToggleBlock (<details> / custom collapsible)
   ├── SyncedBlock (Tham chiếu container ID)
   └── CollectionViewBlock
         └── @tanstack/react-table (Ảo hóa DOM dòng và cột)
```

### Các bước dựng hình một trang:
1. **Lấy bản ghi gốc (Root Record)**:
   - Đọc bản ghi trang trong bảng `block` với `id = <page_id>`.
2. **Duyệt mảng `content`**:
   - Trường `content` chứa mảng các ID con `["block_id_1", "block_id_2", ...]`.
   - Hệ thống truy vấn nhanh các block con này từ Redux Store (được đồng bộ từ bảng `block` trong SQLite).
3. **Phân nhánh Render (Polymorphic Component Dispatch)**:
   - Dựa vào trường `block.type`, React gọi component tương ứng:
     - `type: "bulleted_list"` -> Render thẻ `li` với marker.
     - `type: "collection_view"` -> Render giao diện Database.
     - `type: "to_do"` -> Render checkbox và văn bản gạch ngang khi checked.
4. **Xử lý kéo thả (Drag & Drop)**:
   - Mỗi block gắn một tay cầm `@atlaskit/pragmatic-drag-and-drop`. Khi kéo thả, vị trí ID trong mảng `content` của block cha sẽ được sắp xếp lại.

---

## 3. Lần Dấu Cơ Chế Biến Đổi Dữ Liệu & Giao Dịch (Transactions & Mutation Pipeline)

Mọi thay đổi của người dùng (gõ 1 chữ cái, tick 1 ô checkbox, đổi tên cột database) **không bao giờ ghi đè trực tiếp toàn bộ trang**, mà được đóng gói thành các **Giao Dịch Vi Mô (Micro-Transactions)**.

### Cấu trúc một Transaction trong bảng `transactions`:
```json
{
  "id": "tx_8f92b1a0-1234",
  "space_id": "space_abc",
  "timestamp": 1731456000000,
  "operations": [
    {
      "pointer": { "table": "block", "id": "block_uuid_123" },
      "path": ["properties", "title"],
      "command": "set",
      "args": [["Nội dung mới vừa gõ"]]
    },
    {
      "pointer": { "table": "block", "id": "block_uuid_123" },
      "path": ["last_edited_time"],
      "command": "set",
      "args": 1731456000000
    }
  ]
}
```

### Chu trình xử lý 3 bước:
1. **Bước 1: Áp dụng lạc quan (Optimistic UI Update)**:
   - Thay đổi được phản ánh tức thì trên màn hình người dùng trong vòng dưới 16ms (60fps) mà không cần chờ mạng phản hồi.
2. **Bước 2: Ghi cục bộ vào SQLite (Local Commit)**:
   - Ghi vào bảng `block` trong file `notion.db`.
   - Ghi transaction vào bảng `transactions` để hỗ trợ Undo/Redo (`isUndoTransaction: 0/1`).
3. **Bước 3: Gửi lên Server (Server Sync)**:
   - Gửi payload `saveTransactions` lên endpoint `https://app.notion.com/api/v3/saveTransactions`.
   - Khi server xác nhận (ACK), giao dịch được xóa khỏi hàng đợi tạm.

---

## 4. Lần Dấu Cơ Chế Offline-First (Offline Synchronization Trace)

Notion Desktop sử dụng chiến lược **Local-First Caching kết hợp Sync Cursor**:

```
[ Người dùng thao tác ]
        │
   (Có mạng?)
   ├── CÓ  ──> Gửi thẳng transaction lên API Server
   └── KHÔNG ──> Ghi vào bảng [offline_action] và [transactions] trong SQLite
                     │
                     ▼
           [ Khi có mạng trở lại ]
                     │
                     ├── 1. Đọc [last_downloaded_sync_cursor]
                     ├── 2. Replay toàn bộ hàng đợi [transactions]
                     └── 3. Nhận các thay đổi từ người khác qua CRDT
```

### Bằng chứng từ bảng `offline_page` & `offline_action`:
- Cột `download_status`: Đánh dấu trạng thái trang đã tải xong hay đang tải (`completed`, `syncing`).
- Cột `last_downloaded_sync_cursor` & `target_sync_cursor`: Con trỏ phiên bản giúp client biết chính xác nó đang đứng ở mốc thời gian nào của server để tải về dữ liệu delta (thay đổi) nhỏ nhất, không cần tải lại toàn bộ văn bản.
- Cột `crdt_data` & `crdt_format_version`: Nếu cùng một block bị chỉnh sửa ở 2 thiết bị khi đang mất mạng, thuật toán CRDT trên client và server sẽ tự động hợp nhất các ký tự mà không gây mất chữ của bên nào.

---

## 5. Lần Dấu Tính Năng Notion AI & Tác Tử MCP (AI & Agents Execution Trace)

Đây là tính năng tối tân nhất được phát hiện trong phiên bản Notion 2026:

### 5.1 Quản lý Phiên Hội Thoại & Suy Luận (Thread & Inference Lease)
Trong bảng `thread` và `thread_message`:
- Mỗi yêu cầu người dùng gửi tới Notion AI tạo ra một bản ghi `thread`.
- Cột `current_inference_id` và `current_inference_lease_expiration`: Cơ chế khóa phân tán (Distributed Lease) đảm bảo tại một thời điểm chỉ có một worker AI suy luận và ghi kết quả vào trang, tránh đè dữ liệu.
- Cột `step` trong `thread_message`: Lưu chuỗi suy nghĩ nhiều bước (ReAct pattern: Plan -> Thought -> Action -> Observation -> Final Answer).

### 5.2 Cơ chế MCP Client Host (.webpack/main/ClientMcpHostWorker.js)
```
[ Notion Agent Engine ]
          │
          ▼ (Yêu cầu gọi công cụ bên ngoài)
[ ClientMcpHostWorker.js ]
   ├── McpRelayAccessValidator: Kiểm tra quyền hạn bảo mật
   ├── toolCatalogIsSafe: Xác thực danh mục tool an toàn
   └── McpToolDefinitionValidator: Kiểm tra schema tham số
          │
          ▼ (Giao thức JSON-RPC qua stdio / sse)
[ Local MCP Servers (GitHub, SQLite, File System, v.v.) ]
```

Worker này cho phép Notion Agent trên đám mây gọi an toàn các công cụ chạy ngay trên máy tính của người dùng (ví dụ: đọc file local, chạy code, kiểm tra cơ sở dữ liệu nội bộ) thông qua chuẩn mở MCP.

