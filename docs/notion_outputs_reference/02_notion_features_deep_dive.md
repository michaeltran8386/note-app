# 📖 Phân Tích Chuyên Sâu Các Tính Năng Cốt Lõi Của Notion (Features Deep-Dive)

Tài liệu này trình bày chi tiết và toàn diện 9 nhóm tính năng trụ cột của Notion, đối chiếu giữa tài liệu chính thức từ hãng và cấu trúc dữ liệu thực tế thu thập qua REA.

---

## 1. Ghi Chú & Tài Liệu (Notes & Documents)

### 1.1 Cấu trúc phân cấp vô hạn (Infinite Tree Hierarchy)
- **Không phân biệt Folder và Document**: Trong Notion, không có khái niệm "Thư mục" truyền thống. **Mọi trang (Page) đều có thể chứa các trang con bên trong nó**. Cấu trúc này mở rộng vô tận không giới hạn cấp độ.
- **Biểu diễn dữ liệu thực tế**:
  Trong bảng `block`, mỗi trang là một bản ghi với `type: "page"`.
  Quan hệ phân cấp được thiết lập qua cặp thuộc tính:
  - `parent_id`: ID của trang hoặc database cha.
  - `parent_table`: Bảng của đối tượng cha (`"block"`, `"space"`, hoặc `"collection"`).
  - `content`: Danh sách mảng các UUID con `["id-1", "id-2", ...]`.

### 1.2 Định dạng Rich Text dạng mảng 2D (Rich Text Representation)
Khác với Markdown thô lưu chuỗi văn bản với cú pháp đặc biệt, Notion lưu nội dung text dưới dạng mảng 2 chiều JSON linh hoạt:
```json
{
  "title": [
    ["Đoạn văn có từ "],
    ["in đậm", [["b"]]],
    [" và "],
    ["chèn liên kết", [["a", "https://notion.so"]]],
    [", "],
    ["màu đỏ", [["c", "red"]]]
  ]
}
```
Cấu trúc này cho phép:
- Áp dụng chồng lấn nhiều hiệu ứng định dạng (vừa đậm, vừa nghiêng, vừa có link, vừa đổi màu) mà không sợ vỡ cú pháp đóng/mở thẻ như Markdown hay HTML.
- Hỗ trợ `@-mentions` trực tiếp trong chuỗi text: trỏ đến một `notion_user`, một `page`, hoặc một mốc `date` nhắc việc.

### 1.3 Canvas tự do & Trang trí (Page Aesthetics)
- Mỗi trang đều có `icon` (emoji, icon SVG hoặc hình ảnh tải lên) và `cover` (ảnh bìa toàn khổ).
- Thuộc tính `format` trong bảng `block` lưu trữ cấu hình:
  - `page_full_width`: Bật/tắt chế độ tràn viền màn hình (Full width).
  - `page_small_text`: Bật/tắt font chữ nhỏ.
  - `page_font`: Kiểu chữ (`default`, `serif`, `mono`).

---

## 2. Hệ Thống Cơ Sở Dữ Liệu (Databases & Views)

Databases là "trái tim" biến Notion từ một app ghi chú đơn thuần thành một hệ điều hành công việc. Cơ sở dữ liệu trong Notion là tập hợp các trang có cấu trúc thuộc tính đồng nhất.

### 2.1 Cấu trúc Schema Động (`collection.schema`)
Mỗi Database được định nghĩa trong bảng `collection`. Cột `schema` chứa định nghĩa JSON của các trường dữ liệu:
```json
{
  "title": { "name": "Tên nhiệm vụ", "type": "title" },
  "prop_status": { "name": "Trạng thái", "type": "status" },
  "prop_due": { "name": "Hạn chót", "type": "date" },
  "prop_assignee": { "name": "Người phụ trách", "type": "person" },
  "prop_priority": { "name": "Mức ưu tiên", "type": "select" },
  "prop_estimate": { "name": "Thời gian (h)", "type": "number" },
  "prop_parent_task": { "name": "Nhiệm vụ cha", "type": "relation" }
}
```

### 2.2 Sáu Chế độ hiển thị trực quan (6 Collection Views)
Được định nghĩa trong bảng `collection_view` qua cột `type`:
1. **Table View (`type: "table"`)**:
   - Giao diện bảng tính dạng lưới.
   - Sử dụng thư viện `@tanstack/react-table` v8 kết hợp ảo hóa DOM (DOM virtualization).
   - Cho phép kéo giãn độ rộng cột, khóa cột tiêu đề, tính tổng/trung bình (Calculations) ở chân cột.
2. **Board View (`type: "board"`)**:
   - Giao diện thẻ Kanban.
   - Nhóm (Group by) theo cột `select`, `status`, hoặc `person`.
   - Sử dụng `@atlaskit/pragmatic-drag-and-drop` để kéo thả thẻ giữa các cột cực kỳ mượt mà.
3. **List View (`type: "list"`)**:
   - Giao diện danh sách tối giản, hiển thị tiêu đề và một vài thuộc tính quan trọng bên phải.
4. **Gallery View (`type: "gallery"`)**:
   - Giao diện thẻ trực quan với ảnh xem trước (Card preview) lấy từ ảnh bìa trang, ảnh đầu tiên trong nội dung hoặc tệp đính kèm.
5. **Calendar View (`type: "calendar"`)**:
   - Hiển thị theo lịch tháng/tuần dựa trên trường `date`. Kéo thả để đổi ngày hạn chót.
6. **Timeline View (`type: "timeline"`)**:
   - Biểu đồ Gantt trực quan thể hiện tiến độ dự án, ngày bắt đầu - kết thúc và phụ thuộc giữa các công việc (Task dependencies).

### 2.3 Bộ máy Truy vấn và Lọc Dữ Liệu (`query2`)
Trong bảng `collection_view`, cột `query2` lưu trữ cấu hình truy vấn của người dùng:
- **Filters**: Bộ lọc lồng nhau (`and` / `or`), lọc theo điều kiện text, ngày tháng, trạng thái, người phụ trách.
- **Sorts**: Sắp xếp đa tầng theo nhiều cột (tăng dần/giảm dần).
- **Aggregations**: Hàm tổng hợp (Count all, Count unique, Sum, Average, Min, Max, Percent checked).

---

## 3. Hệ Thống Khối (The Block System)

Trong Notion, **"Vạn vật đều là Block" (Everything is a Block)**. Một trang là một block, một dòng chữ là một block, một bức ảnh là một block, và một database cũng là một block.

### 3.1 Bảng tổng hợp các loại khối phổ biến
| Tên Block (type) | Mô tả tính năng | Cấu trúc dữ liệu nội bộ |
| :--- | :--- | :--- |
| `text` | Đoạn văn bản cơ bản | `properties.title`: Rich text array |
| `header`, `sub_header`, `sub_sub_header`, `header_4` | Tiêu đề H1, H2, H3, H4 | Có thêm thuộc tính `toggle: true` nếu là toggle heading |
| `to_do` | Ô việc cần làm kèm checkbox | `properties.checked`: `[["yes"]]` hoặc `[["no"]]` |
| `bulleted_list` | Gạch đầu dòng chấm tròn | `properties.title`: Rich text |
| `numbered_list` | Danh sách đánh số tự tăng | Tự tính thứ tự dựa vào anh chị em liền kề |
| `toggle` | Khối thu gọn / mở rộng | `content`: Mảng ID các block con ẩn bên trong |
| `quote` | Khối trích dẫn viền đứng | `properties.title` |
| `divider` | Khối vạch kẻ ngang chia phần | Không có nội dung text, chỉ đóng vai trò phân cách |
| `callout` | Hộp lưu ý nổi bật | `format.page_icon` (emoji/icon) + `properties.title` |
| `table` & `table_row` | Bảng nội dòng đơn giản | `table_row` chứa mảng các ô `properties[col_id]` |
| `code` | Khối mã lập trình | `properties.language`: `'javascript'`, `'cpp'`, `'python'...` |
| `embed` | Khối nhúng URL / iframe | `properties.source`: URL gốc; `format.block_aspect_ratio` |
| `column_list` & `column` | Bố cục chia nhiều cột | `column_list` chứa 2+ `column`, mỗi column chứa các block con |
| `transclusion_container` & `transclusion_reference` | **Khối đồng bộ (Synced Blocks)** | Reference trỏ tới Container ID gốc, sửa ở một nơi sẽ tự cập nhật mọi nơi |
| `ai_block` | Khối kết quả do AI sinh ra | Lưu prompt và nội dung AI render |
| `button` | Nút bấm thực thi tương tác | Lưu workflow triggers (tạo trang mới, sửa property) |

### 3.2 Tương tác Khối (Block Interaction)
- **Tay cầm 6 chấm (`⋮⋮`)**: Cho phép click giữ để kéo thả tự do, sắp xếp lại trật tự dòng hoặc kéo ngang để tự động biến thành 2 cột (`column_list`).
- **Phím tắt biến hình (`/turn`)**: Chuyển đổi qua lại giữa các loại block (ví dụ từ Text thành Heading, To-Do hay Bullet) mà không làm mất nội dung text bên trong.

---

## 4. Hệ Thống Biểu Mẫu Mẫu (Templates)

Notion có 2 cấp độ template:
1. **Page Templates (Cấp Workspace / Cộng đồng)**:
   - Các trang mẫu được tạo sẵn cho các mục đích: Quản lý dự án, Ghi chép bài giảng, CRM, OKR...
   - Lưu trữ trong cơ sở dữ liệu với cờ `is_template: 1`.
2. **Database Templates (Cấp Cơ sở dữ liệu)**:
   - Trong bảng `collection`, cột `template_pages` chứa danh sách UUID các trang mẫu của riêng Database đó.
   - Khi tạo một bản ghi mới trong Database, người dùng chỉ cần chọn 1 template: hệ thống kích hoạt transaction `isTemplateInstantiationTransaction: 1` để nhân bản toàn bộ cấu trúc block mẫu vào bản ghi mới.
   - Hỗ trợ **Repeating Templates**: Tự động sinh trang mới theo chu kỳ (mỗi sáng thứ Hai, mỗi ngày vào lúc 09:00).

---

## 5. Cộng Tác Thời Gian Thực & Chia Sẻ (Collaboration & Sharing)

### 5.1 Kiến trúc Đồng Bộ Thời Gian Thực (CRDT & Transactions)
- Bảng `transactions` ghi nhận từng thao tác (`operations`) dưới dạng JSON:
  - `set`: Gán giá trị thuộc tính.
  - `update`: Cập nhật cục bộ.
  - `listAfter` / `listRemove`: Chèn/xóa ID trong mảng con `content`.
- Sự xuất hiện của module `@common/crdt` và các cột `crdt_format_version`, `crdt_data` trong bảng `block` cho thấy Notion dùng cấu trúc dữ liệu không xung đột (CRDT) để giải quyết xung đột khi nhiều người cùng gõ chữ trên một dòng hoặc chỉnh sửa khi mất mạng.

### 5.2 Thảo Luận, Bình Luận & Phản Hồi
- **Thảo luận nội dòng (Inline Discussions)**: Người dùng có thể bôi đen một từ/câu để để lại bình luận. Bảng `discussion` lưu vị trí neo (`anchored_runs`) và block cha.
- **Bình luận chi tiết (`comment`)**: Lưu nội dung bình luận, người tạo, thời gian, trạng thái đã giải quyết (`resolved`).
- **Thả cảm xúc (`reaction`)**: Lưu icon emoji và danh sách user phản hồi.

### 5.3 Chia sẻ công khai & Phân quyền (Permissions)
- Mỗi block/page có cột `permissions` lưu mảng các quyền:
  - `role`: `'read_and_write'`, `'comment_only'`, `'read_only'`.
  - `type`: `'user_permission'`, `'public_permission'`, `'space_permission'`.
- Hỗ trợ xuất bản trang web tĩnh công khai lên tên miền `*.notion.site` kèm công tắc cho phép người khác duplicate thành template của họ.

---

## 6. Tính Năng Trí Tuệ Nhân Tạo (Notion AI & Notion Agents)

Theo cấu hình `config.json` và code trích xuất từ `app.asar`:

### 6.1 Notion AI Truyền Thống
- **Viết tiếp / Tóm tắt / Biên tập**: Kích hoạt bằng phím cách (<kbd>Space</kbd>) ở dòng rỗng hoặc menu chuột phải.
- **Q&A Workspace Search**: Đặt câu hỏi tự nhiên để AI tổng hợp câu trả lời từ toàn bộ các trang và database có trong workspace của bạn.

### 6.2 Notion Agents & Applecart Subsystem (Thế hệ mới 2026)
REA phát hiện Notion đang triển khai kiến trúc tác tử AI quy mô lớn:
- **Applecart Protocol**: `notion-agents` chạy trên domain `next.notion.com`.
- **Bảng lưu trữ hội thoại AI**:
  - `thread`: Phiên làm việc với AI (`current_inference_id`, `current_inference_lease_expiration`).
  - `thread_message`: Từng bước suy luận và hành động của Agent (`step`, `data`).
- **Giao thức MCP (Model Context Protocol)**:
  - File `.webpack/main/ClientMcpHostWorker.js` và module `@notionhq/shared-clientMcp` chứng minh Notion Desktop đóng vai trò là một **MCP Client Host**.
  - Cho phép Notion kết nối trực tiếp với các MCP Server bên ngoài (Local tools, Database tools, GitHub MCP...) để AI tự động thực thi các công việc đa bước (Multi-step Agentic Workflows).

### 6.3 Ghi Âm Cuộc Họp Tự Động (AI Meeting Notes)
- File thực thi đi kèm: `notion-meeting-notes-host.exe`.
- IPC Channels: `notion:zoom-meeting-joined`, `notion:running-input-audio-processes-changed`, `notion:meeting-notes-mic-mute-state`.
- Tự động nhận diện khi người dùng tham gia cuộc họp Zoom / Google Meet, thu âm, chuyển đổi giọng nói thành văn bản và tự động tạo trang ghi chép tóm tắt cuộc họp bằng Notion AI.

---

## 7. Tích Hợp & Nhúng (Integrations & Embeds)

- **Khối nhúng đa dạng (Embed Blocks)**: Nhúng tương tác trực tiếp Figma, Google Drive, Miro, Loom, CodePen, PDF, video YouTube...
- **Database đồng bộ 2 chiều (Synced Databases)**: Đồng bộ danh sách Pull Request từ GitHub, Issue từ Jira, Ticket từ GitLab trực tiếp vào Database của Notion.
- **REST API & Webhooks**: Bảng `bot` và `workflow` quản lý các token tích hợp ngoài (Zapier, Make, custom scripts).

---

## 8. Trải Nghiệm Ứng Dụng Desktop & Mobile (Desktop & Mobile Experience)

- **Kiến trúc Đa Tab & Đa Cửa Sổ (Multi-window / Multi-tab)**:
  - Quản lý qua `.webpack/renderer/tabs/` và `.webpack/renderer/windows_and_tabs/`.
  - Mỗi Tab là một `BrowserView` riêng biệt, có khả năng cô lập lỗi (một tab crash không làm sập toàn bộ app).
- **Hoạt động Offline Đỉnh Cao (Offline-First via SQLite)**:
  - Máy tính người dùng lưu toàn bộ dữ liệu trang trong `notion.db`.
  - Khi mất mạng, app đọc dữ liệu tức thì từ SQLite nội bộ, người dùng vẫn xem và sửa ghi chú bình thường.
  - Khi có mạng trở lại, hàng đợi `offline_action` và `transactions` sẽ tự động đồng bộ lên server.
- **Native Windows Integrations**:
  - Tích hợp biểu tượng thanh tiến trình taskbar qua `@jasonscheirer/native-progress-bar`.
  - Tích hợp Windows Registry qua `@vscode/windows-registry`.
  - Tích hợp Audio Monitoring qua Windows Core Audio APIs.

---

## 9. Không Gian Làm Việc Doanh Nghiệp (Workspace & Team Features)

- **Không gian làm việc (`space`)**: Đơn vị quản lý cấp cao nhất cho cả tổ chức.
- **Teamspaces (`team`)**: Các phòng ban chuyên biệt (Kỹ thuật, Marketing, Nhân sự, Thiết kế) có trang chủ và phân quyền riêng.
- **Nhóm quyền hạn nâng cao (`space_permission_group`)**: Quản lý truy cập theo vai trò (RBAC), SSO SAML, SCIM identity provisioning.
- **Audit Logs & Analytics**: Giám sát nhật ký truy cập, xem trang, tải file và kiểm soát tuân thủ dữ liệu doanh nghiệp.
- **Custom Emoji (`custom_emoji`)**: Tùy biến bộ emoji riêng của công ty trên toàn bộ workspace.

