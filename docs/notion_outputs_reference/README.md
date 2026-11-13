# 📚 Bộ Tài Liệu Nghiên Cứu Kỹ Thuật Đảo Ngược Notion (Notion Reverse Engineering Reference)

Thư mục này chứa bộ tài liệu chuyên sâu được trích xuất và phân tích trực tiếp từ ứng dụng **Notion Desktop (Windows x86_64, Version 7.43.2)** thông qua bộ kỹ năng và công cụ **REA (Reverse Engineer Anything)**, kết hợp tài liệu kiến trúc chính thức từ Notion.

---

## 🗂️ Danh Mục Tài Liệu

1. **[01_notion_architecture_rea_evidence.md](01_notion_architecture_rea_evidence.md)**:
   - *Báo cáo bằng chứng thực nghiệm REA*: Bằng chứng mã nhị phân PE `Notion.exe`, cầu chì Electron Fuses, gói lưu trữ `app.asar`, danh mục dependency (`package.json`, `@common/crdt`, `@tanstack/react-table`, `better-sqlite3`), cấu hình routing (`config.json`), và cấu trúc 23 bảng cơ sở dữ liệu `notion.db`.
2. **[02_notion_features_deep_dive.md](02_notion_features_deep_dive.md)**:
   - *Phân tích chi tiết 9 nhóm tính năng cốt lõi*: Notes & Documents, Databases (Table, Board, List, Gallery, Calendar, Timeline), Hệ thống Khối (Blocks System), Templates, Cộng tác & Chia sẻ, Tính năng AI (Notion AI, AI Meeting Notes, Notion Agents, MCP), Tích hợp & Nhúng, Trải nghiệm Desktop/Mobile, và Tính năng Doanh nghiệp (Teamspaces, RBAC).
3. **[03_trace_internal_workings.md](03_trace_internal_workings.md)**:
   - *Lần dấu cơ chế vận hành bên trong*: Kiến trúc đa tiến trình Electron, chu trình render giao diện từ SQLite lên Redux/React 19, đường ống biến đổi dữ liệu (Micro-transactions), cơ chế đồng bộ ngoại tuyến (Offline-first sync cursors), và worker điều phối tác tử MCP.
4. **[04_proven_inferred_hidden_matrix.md](04_proven_inferred_hidden_matrix.md)**:
   - *Ma trận kiểm chứng kỹ thuật theo chuẩn REA*: Phân định rạch ròi 3 mức độ tri thức: Đã chứng minh bằng chứng thực tế (Proven), Suy luận kỹ thuật có căn cứ cao (Inferred), và Bí mật ẩn kín phía server (Hidden).
5. **[05_mini_notion_architecture_proposal.md](05_mini_notion_architecture_proposal.md)**:
   - *Bản đề xuất thiết kế & kiến trúc "Mini-Notion"*: Bản thiết kế khả thi cao giúp bạn tự xây dựng một phiên bản Notion thu nhỏ siêu nhẹ (RAM < 80MB, Local-first SQLite, Canvas khối kéo thả, Database 3 view, tích hợp Ollama / MCP local), kèm lộ trình 3 giai đoạn triển khai.

---

## 🛠️ Công Cụ Phân Tích Đã Sử Dụng
- **REA (Reverse Engineer Anything)**: `inspect_electron_fuses`, `analyze_javascript_application`, `inspect_sqlite_database`.
- **Node.js Native SQLite Engine**: `node:sqlite` (`DatabaseSync`).
- **PowerShell & PE Inspection**: Win32 PE metadata examination.
- **Web Search Grounding**: Đối chiếu thông tin chính thức từ `notion.so` (Notion Agents, MCP integration, TanStack Table).

