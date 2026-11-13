# ⚖️ Ma Trận Kiểm Chứng Kỹ Thuật (Proven vs. Inferred vs. Hidden)

Theo chuẩn mực nghiên cứu kỹ thuật đảo ngược của bộ kỹ năng **REA (Reverse Engineer Anything)**, tài liệu này phân định rạch ròi 3 mức độ tri thức về Notion:
1. **Proven (Đã chứng minh 100% bằng chứng thực)**
2. **Inferred (Suy luận logic có căn cứ kỹ thuật cao)**
3. **Hidden (Bí mật ẩn kín phía Server hoặc phần cứng)**

---

## 1. Bảng Ma Trận Tổng Hợp

| Thành Phần / Tính Năng | Trạng Thái | Bằng Chứng Xác Thực / Căn Cứ Kỹ Thuật | Giới Hạn Nghiên Cứu |
| :--- | :--- | :--- | :--- |
| **Electron Runtime & Fuses** | **PROVEN** | REA `inspect_electron_fuses` đọc trực tiếp PE binary `Notion.exe`: `OnlyLoadAppFromAsar=1`, `RunAsNode=0`, `NodeCliInspect=0`. | Không bao gồm các cờ runtime động do script tự đặt qua `app.commandLine`. |
| **Cơ sở dữ liệu cục bộ** | **PROVEN** | REA `inspect_sqlite_database` trên file `notion.db`: Khẳng định cấu trúc 23 bảng (`block`, `collection`, `collection_view`, `transactions`, `offline_page`...). | Các trang người dùng chưa từng mở trên máy thì không có dữ liệu trong SQLite local. |
| **Cấu trúc Dữ liệu Block** | **PROVEN** | 47 cột trong bảng `block` (chứa `type`, `properties`, `content`, `parent_id`, `crdt_data`...) và truy vấn ra 26 loại block thực tế. | Chưa chứng minh được toàn bộ logic tính toán runtime của các loại block thử nghiệm nội bộ. |
| **Thư viện UI cốt lõi** | **PROVEN** | Trích xuất `package.json` trong `app.asar`: `@tanstack/react-table` 8.21.3, `@atlaskit/pragmatic-drag-and-drop` 1.4.0, `better-sqlite3` 13.0.1, React 19 canary. | Các bản build Webpack đã minify mã nguồn JS của từng component React. |
| **MCP Client Host** | **PROVEN** | File `.webpack/main/ClientMcpHostWorker.js` và `@notionhq/shared-clientMcp` với các validator `McpRelayAccessValidator`, `toolCatalogIsSafe`. | Danh sách chính xác các server MCP bên thứ 3 mà người dùng đã kích hoạt trên cloud. |
| **AI Meeting Notes Native** | **PROVEN** | File thực thi nhúng `notion-meeting-notes-host.exe`, module `loudness`, các kênh IPC `notion:zoom-meeting-joined`, `notion:running-input-audio-processes-changed`. | Thuật toán AI nhận diện giọng nói (Speech-to-Text Whisper hoặc server-side stream). |
| **Thuật toán Đồng bộ CRDT** | **INFERRED** | Xuất hiện module `@common/crdt`, cột `crdt_data`, `crdt_format_version` trong bảng `block` và cơ chế `transactions`. Suy luận: Notion dùng Yjs hoặc cấu trúc LWW-Element-Set / Automerge tùy biến. | Mã nguồn giải thuật toán giải quyết xung đột chi tiết bên trong module `@common/crdt` (đã bundle/mangle). |
| **Kiến trúc Tác tử Applecart** | **INFERRED** | Domain `next.notion.com`, routes `/agent/:id`, `/browse/agents`, bảng `thread` với `current_inference_id`. Suy luận: Notion đang xây dựng Agent Store và chạy mô hình Autonomous Agents. | Quy trình lập kế hoạch (Planning prompt, System instructions) của Agent trên server. |
| **Cơ chế Truy vấn Database** | **INFERRED** | Cột `query2` trong `collection_view` chứa JSON filter/sort. Client lọc dữ liệu bằng TanStack Table kết hợp bộ lọc local SQLite khi offline. | Bộ engine tính toán Formula phức tạp trên server đối với các database hàng trăm ngàn dòng. |
| **Mô hình LLM Phía Sau Notion AI** | **HIDDEN** | Ứng dụng client chỉ gửi yêu cầu qua HTTPS API và nhận stream SSE kết quả. Không chứa trọng số mô hình LLM. | Trọng số mô hình (Weights), Fine-tuning data (GPT-4o, Claude 3.5 Sonnet hay Gemini 1.5 Pro do server Notion định tuyến). |
| **Hạ tầng Cơ sở Dữ liệu Server** | **HIDDEN** | Ứng dụng Desktop chỉ tương tác qua REST endpoint `v3/saveTransactions`, `v3/syncRecordValues`. | Kiến trúc backend phân tán (PostgreSQL Sharding, Redis Cache, Kafka Message Broker, S3/R2 storage). |
| **Thuật toán Tìm kiếm Semantic** | **HIDDEN** | Giao diện gửi chuỗi tìm kiếm lên API Q&A; client không tự tính toán vector embeddings cục bộ. | Vector Database (Pinecone, Qdrant hay pgvector), Embedding Model (text-embedding-3 hay Cohere). |

---

## 2. Chi Tiết Các Bằng Chứng Đã Được Chứng Minh (Proven Evidence)

### 2.1 Bằng chứng nhị phân & Hệ điều hành
- **Desktop Executable**: `Notion.exe` (250 MB) là một container Electron chuẩn hóa cao độ với các cầu chì bảo mật được khóa chặt nhằm ngăn chặn mã độc tiêm vào runtime (`RunAsNode=0`, `NodeOptions=0`, `Inspect=0`).
- **Phân tách Native**: Các tác vụ nhạy cảm về phần cứng Windows (quản lý Registry, icon thanh tác vụ, âm thanh cuộc họp) được tách riêng thành các native addon C++ (`win_utils.node`, `better_sqlite3.node`, `progress_bar.node`, `winregistry.node`) và tiến trình riêng (`notion-meeting-notes-host.exe`).

### 2.2 Bằng chứng cơ sở dữ liệu `notion.db`
- **Mô hình Entity-Record**: Bảng `records` và `block` là minh chứng hùng hồn nhất cho thấy Notion lưu trữ toàn bộ dữ liệu dưới dạng các bản ghi JSON linh hoạt có quan hệ `parent_id` - `parent_table`.
- **Độc lập người dùng**: Hầu hết các bảng đều có khóa chính phức hợp gồm `(id, meta_user_id)`. Điều này chứng minh Notion hỗ trợ chuyển đổi đa tài khoản (Multi-account) trên cùng một máy tính mà không làm lộ dữ liệu giữa các tài khoản khác nhau.

---

## 3. Các Điểm Suy Luận Có Căn Cứ Cao (Inferred Insights)

1. **Từ pure OT sang Hybrid CRDT**:
   Ban đầu Notion dùng Operational Transformation trên Postgres. Tuy nhiên sự xuất hiện của cột `crdt_data` trong SQLite và package `@common/crdt` chỉ ra rằng Notion đã áp dụng CRDT để biến app thành **Local-First Editor**. Nhờ đó, người dùng có thể gõ ghi chú khi ở trên máy bay, và khi hạ cánh kết nối Wi-Fi, dữ liệu sẽ tự động sáp nhập mà không gặp lỗi "Conflict version mismatch".

2. **TanStack Table là động cơ hiển thị Database**:
   Sự hiện diện của `@tanstack/react-table` giải thích vì sao Database Table của Notion có thể cuộn hàng ngàn dòng mượt mà, hỗ trợ ghim cột, ẩn hiện cột và tính toán nhanh chóng mà không gây nghẽn luồng UI.

---

## 4. Những Phần Ẩn Kín Hoàn Toàn (Hidden Domains)

1. **Server-side Permissions Enforcement**: Toàn bộ hệ thống kiểm tra quyền hạn (Role-based access control, Guest access, Public share verification) đều được kiểm tra nghiêm ngặt lần cuối trên server Notion qua API gateway. Client chỉ lưu trữ cache `permissions` phục vụ việc hiển thị UI.
2. **Private AI Agent Execution**: Logic điều phối agent nội bộ, memory graph dài hạn của Notion AI và cơ chế gọi API các mô hình nền tảng (Foundation Models) đều nằm 100% trong hạ tầng đám mây riêng của Notion Labs.

