# 🏗️ Đề Xuất Kiến Trúc "Mini-Notion": Bản Thiết Kế Khả Thi & Lộ Trình Xây Dựng (Mini-Notion Proposal)

Dựa trên toàn bộ phân tích kỹ thuật đảo ngược từ Notion chính thức, tài liệu này đề xuất một kiến trúc hệ thống **"Mini-Notion" (Local-first, Siêu nhẹ, Đầy đủ tính năng cốt lõi)** mà bạn hoàn toàn có thể tự xây dựng hoặc tích hợp mở rộng trực tiếp từ dự án `NOTE_LOCAL`.

---

## 1. Triết Lý Thiết Kế: "Notion Core, Không Cồng Kềnh" (Philosophy)

Notion rất mạnh nhưng ngốn RAM (300MB - 1GB do Electron) và phụ thuộc nặng nề vào đám mây. Bản thiết kế **Mini-Notion** hướng đến:
- 🚀 **Hiệu năng cực cao**: Viết trên nền **C++ Win32 + WebView2** (kế thừa NoteLocal) hoặc **Tauri/Rust + WebView**, tiêu thụ RAM **< 80MB** và khởi động tức thì < 0.3s.
- 🔒 **Local-first 100%**: Dữ liệu lưu hoàn toàn trên SQLite nội bộ máy bạn, hoạt động trơn tru không cần internet.
- 🧱 **Vạn vật là Block**: Cấu trúc Block linh hoạt, hỗ trợ kéo thả (`⋮⋮`), lệnh gõ nhanh (`/`), và Rich Text.
- 📊 **Cơ sở dữ liệu đa góc nhìn**: Hỗ trợ Database với 3 view cơ bản nhất: **Table**, **Kanban Board** và **List**.
- 🤖 **Tích hợp AI & MCP Cục bộ**: Kết nối trực tiếp với Ollama (LLM local miễn phí) hoặc qua giao thức chuẩn mở **MCP (Model Context Protocol)**.

---

## 2. Kiến Trúc Phân Lớp (Layered Architecture Blueprint)

```
┌────────────────────────────────────────────────────────┐
│                   GIAO DIỆN NGƯỜI DÙNG                 │
│  (HTML5 + Vanilla JS / React + Tailwind + Pragmatic DND) │
│                                                        │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ Block Canvas     │  │ Database View Engine       │  │
│  │ (Text, H1-3,     │  │ (Table: TanStack Table,   │  │
│  │  Todo, Toggle,   │  │  Board: Kanban drag-drop,  │  │
│  │  Callout, Code)  │  │  List: Clean list)         │  │
│  └──────────────────┘  └────────────────────────────┘  │
│             ▲                         ▲                │
└─────────────┼─────────────────────────┼────────────────┘
              │ JSON-RPC / IPC Message  │
┌─────────────▼─────────────────────────▼────────────────┐
│               TẦNG ĐIỀU PHỐI (CORE SERVICE)             │
│                 (C++ Native / Rust Host)                │
│                                                        │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │ Transaction Manager    │  │ Local Query Engine   │  │
│  │ (Micro-mutations,      │  │ (Filter, Sort,       │  │
│  │  Undo/Redo Stack)      │  │  Aggregation, Group) │  │
│  └────────────────────────┘  └──────────────────────┘  │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │ AI & MCP Client Worker │  │ Share & Sync Service │  │
│  │ (Ollama / Local LLM,   │  │ (Serverless Hash     │  │
│  │  MCP Tool Execution)   │  │  hoặc P2P / WebDAV)  │  │
│  └────────────────────────┘  └──────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               TẦNG LƯU TRỮ (STORAGE ENGINE)             │
│               SQLite Embedded Database                  │
│               (mini_notion.db / SQLite3)               │
└────────────────────────────────────────────────────────┘
```

---

## 3. Lược Đồ Cơ Sở Dữ Liệu Tinh Gọn (Minimal SQLite Schema)

Chỉ cần **4 bảng cốt lõi** để mô phỏng hoàn hảo 90% sức mạnh của Notion:

```sql
-- 1. BẢNG KHỐI NỘI DUNG (BLOCKS)
CREATE TABLE blocks (
    id TEXT PRIMARY KEY,             -- UUID định danh khối
    parent_id TEXT,                  -- ID khối cha (hoặc ID trang cha)
    parent_table TEXT DEFAULT 'blocks', -- 'blocks' hoặc 'collections'
    type TEXT NOT NULL,              -- 'text', 'header_1', 'header_2', 'to_do', 'toggle', 'callout', 'collection_view'
    properties TEXT DEFAULT '{}',    -- JSON: {"title": [["Nội dung"]], "checked": [["yes"]]}
    content TEXT DEFAULT '[]',       -- JSON Array các UUID khối con: ["id_1", "id_2"]
    format TEXT DEFAULT '{}',        -- JSON: {"color": "gray", "page_icon": "📝"}
    created_time INTEGER NOT NULL,
    last_edited_time INTEGER NOT NULL
);

-- 2. BẢNG CƠ SỞ DỮ LIỆU (COLLECTIONS)
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    schema TEXT NOT NULL             -- JSON định nghĩa cột: {"prop_1": {"name": "Status", "type": "status"}}
);

-- 3. BẢNG CHẾ ĐỘ XEM DATABASE (COLLECTION_VIEWS)
CREATE TABLE collection_views (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    type TEXT NOT NULL,              -- 'table', 'board', 'list'
    name TEXT NOT NULL,
    query2 TEXT DEFAULT '{}',        -- JSON: {"filter": {...}, "sort": [...], "group_by": "prop_status"}
    format TEXT DEFAULT '{}',        -- JSON: cấu hình ẩn hiện cột, độ rộng cột
    FOREIGN KEY (collection_id) REFERENCES collections(id)
);

-- 4. BẢNG GIAO DỊCH & UNDO/REDO (TRANSACTIONS)
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    operations TEXT NOT NULL         -- JSON Array các lệnh: [{"table":"blocks","id":"...","path":["properties","title"],"command":"set","args":"..."}]
);
```

---

## 4. Các Dịch Vụ Cần Xây Dựng (Required Services)

### 4.1 Local Storage Service (Dịch vụ Lưu trữ & Truy vấn Cục bộ)
- **Công nghệ**: SQLite3 C++ Native (đã có sẵn trong NoteLocal hoặc nhúng SQLite3 amalgation).
- **Nhiệm vụ**:
  - Đọc ghi cây khối theo cấu trúc phân cấp nhanh dưới 2ms.
  - Hỗ trợ câu lệnh SQL truy vấn Database: `SELECT * FROM blocks WHERE parent_id = ? AND parent_table = 'collections' ORDER BY ...`

### 4.2 Block Canvas & Interactive Editor (Dịch vụ Dựng hình Khối)
- **Công nghệ**: Vanilla JavaScript + HTML5 ContentEditable + `@atlaskit/pragmatic-drag-and-drop`.
- **Cơ chế trải nghiệm mượt mà**:
  - **Menu `/` (Slash Commands)**: Gõ `/` hiện popup chọn khối (Heading, To-Do, Bullet, Toggle, Callout, Table).
  - **Tay cầm `⋮⋮`**: Rê chuột hiện tay cầm kéo thả thay đổi vị trí khối.
  - **Phím tắt chuyển khối**: Nhấn <kbd>Enter</kbd> tạo khối tiếp theo, nhấn <kbd>Backspace</kbd> ở dòng rỗng biến khối về văn bản thường.

### 4.3 Database View Engine (Dịch vụ Hiển thị Cơ sở Dữ liệu)
- **Table View**: Sử dụng `@tanstack/react-table` (hoặc module bảng tùy biến siêu nhẹ):
  - Kéo giãn cột, sắp xếp khi click tiêu đề cột, lọc dữ liệu.
- **Kanban Board View**:
  - Các cột tự động nhóm theo thuộc tính `status` hoặc `select`.
  - Kéo thả thẻ giữa các cột tự động cập nhật thuộc tính của thẻ đó.

### 4.4 Local AI & MCP Integration (Dịch vụ Trí tuệ Nhân tạo & Công cụ)
- **Kết nối Ollama Cục bộ**: Gọi qua API `http://localhost:11434/api/generate` (chạy mô hình Llama 3.2, Qwen 2.5 hoặc DeepSeek cục bộ không tốn một xu phí API).
- **Hỗ trợ Giao thức MCP (Model Context Protocol)**:
  - Mini-Notion tích hợp một MCP Client đơn giản.
  - Khi người dùng yêu cầu: *"Tóm tắt các issue từ GitHub vào bảng dự án"*, AI tự gọi MCP tool của GitHub để lấy dữ liệu nạp thẳng vào SQLite của Mini-Notion.

### 4.5 Share & Export Service (Dịch vụ Chia sẻ & Xuất bản)
- Kế thừa giải pháp **Serverless URL Hash (`deflate-raw`)** xuất sắc của NoteLocal:
  - Cho phép xuất bất kỳ trang hoặc database nào thành một URL rút gọn độc lập.
  - Người nhận mở trên trình duyệt web tĩnh (GitHub Pages) là xem và tương tác được ngay mà không cần máy chủ.

---

## 5. Lộ Trình Triển Khai 3 Giai Đoạn (Phased Roadmap)

### Giai đoạn 1: Nền Tảng Khối & Biên Tập (Block Foundations - 1 tuần)
- Thay thế bộ Editor một thẻ `contenteditable` hiện tại bằng kiến trúc **Block List**: mỗi dòng là một thẻ `<div class="block" data-id="...">`.
- Hỗ trợ menu gõ nhanh `/` (`/todo`, `/bullet`, `/h1`, `/h2`, `/toggle`, `/callout`).
- Thêm tay cầm kéo thả `⋮⋮` ở đầu mỗi dòng.
- Lưu trữ dữ liệu vào bảng SQLite `blocks`.

### Giai đoạn 2: Cơ Sở Dữ Liệu & Chế Độ Xem (Database & Views - 2 tuần)
- Xây dựng bảng `collections` và `collection_views`.
- Cho phép gõ `/database` để chèn một bảng dữ liệu vào trang.
- Hỗ trợ các kiểu thuộc tính cơ bản: Text, Status, Select, Date, Checkbox, Number.
- Xây dựng 2 giao diện: **Table View** (Lưới bảng) và **Board View** (Thẻ Kanban kéo thả).

### Giai đoạn 3: Trí Tuệ Nhân Tạo & Xuất Bản (AI, MCP & Export - 1 tuần)
- Tích hợp nút bấm Notion AI: Bấm phím cách (<kbd>Space</kbd>) ở dòng rỗng để gọi Ollama / DeepSeek cục bộ viết tiếp hoặc tóm tắt.
- Tích hợp xuất bản Serverless Web Viewer kế thừa từ `docs/` của NoteLocal.

---

## 6. Kết Luận
Bằng việc chắt lọc tinh hoa từ kết quả dịch ngược Notion chính thức (kiến trúc Block Entity + SQLite Cục bộ + Transaction Micro-mutations) và loại bỏ sự cồng kềnh của server đám mây, bạn hoàn toàn có thể xây dựng một **Mini-Notion** độc bản: **Tốc độ nhanh gấp 10 lần, RAM < 60MB, bảo mật dữ liệu tuyệt đối và làm chủ 100% công nghệ**.

