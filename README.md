<p align="center">
  <img src="resources/logo/logo.svg" alt="Note Local Logo" width="100" height="100">
</p>

<h1 align="center">Note Local</h1>

<p align="center">
  <b>Ứng dụng ghi chú siêu tối giản (Ultra-Minimalist) cho Windows 11</b><br>
  Được xây dựng bằng C++17 Native và Microsoft WebView2 Runtime.<br>
  Tốc độ khởi động tức thì, RAM &lt; 60MB, lưu trữ Markdown 100% cục bộ, không server phụ thuộc.
</p>

<p align="center">
  <a href="https://github.com/michaeltran8386/note-app"><img src="https://img.shields.io/badge/GitHub-note--app-18181b?logo=github" alt="GitHub"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-0078d4?logo=windows" alt="Platform">
  <img src="https://img.shields.io/badge/Tech-C%2B%2B17%20%7C%20Win32%20%7C%20WebView2-blue" alt="C++ WebView2">
  <img src="https://img.shields.io/badge/Memory-%3C%2060MB%20RAM-success" alt="Memory">
  <img src="https://img.shields.io/badge/Storage-100%25%20Local%20Markdown-orange" alt="Local Markdown">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## ✨ Điểm nổi bật

- ⚡ **Siêu nhẹ & Hiệu năng đỉnh cao**: Viết bằng C++17 và Win32 API native kết hợp Microsoft Edge WebView2 Evergreen, thời gian khởi động < 0.2s, bộ nhớ RAM tiêu thụ luôn dưới **60MB** (không giật lag, không ngốn tài nguyên như Electron).
- 🎨 **Chuẩn giao diện Windows 11 & Ultra-Minimal**: Hỗ trợ bo góc DWM, dark mode native tinh tế, thanh tab tối giản tuyệt đối, tập trung 100% không gian vào việc ghi chép.
- 📊 **Bảng biểu phong cách Office (Tables - Word / Excel / Notion)**:
  - **Tạo bảng trực quan**: Nhấp biểu tượng Table để chọn kích thước qua lưới 6x6 hoặc chọn nhanh preset (`2x2`, `3x3`, `4x3`, `5x4`).
  - **Kéo chỉnh kích thước cột thời gian thực**: Từng cột tích hợp thanh kéo `.col-resizer`, điều chỉnh độ rộng cột mượt mà bằng chuột.
  - **Thao tác nhanh chuẩn Office**: Nút `+` ở mép phải để thêm cột, nút `+` ở đáy bảng để thêm hàng.
  - **Phím tắt `Tab` thông minh**: Nhấn `Tab` để di chuyển nhanh giữa các ô; nhấn `Tab` ở ô cuối cùng sẽ **tự động thêm hàng mới** (chuẩn hành vi Word & Notion). Nhấn `Shift + Tab` để lùi lại ô trước.
  - **Menu ngữ cảnh chuột phải**: Nhấp chuột phải vào bất kỳ ô nào để thêm hàng/cột, xóa hàng/cột hoặc xóa toàn bộ bảng.
  - **Lưu trữ chuẩn Markdown**: Bảng được lưu chuẩn CommonMark HTML với thẻ `<colgroup><col style="width: ...px">`, bảo toàn nguyên vẹn độ rộng từng cột và dữ liệu.
- 🖼️ **Dán ảnh siêu tốc & Chống giật lag (Zero-lag Canvas Compression)**:
  - Tự động nén ảnh từ Clipboard bằng Canvas downscaling (tối đa 1440px, JPEG 0.85) giảm **95% dung lượng** (từ 20-30MB bitmap thô xuống ~150KB), triệt tiêu hoàn toàn tình trạng khựng giật DWM của Windows.
  - Định danh ảnh theo ID chính xác (`img_id`), loại bỏ hoàn toàn race condition hay mất ảnh khi lưu.
  - Hộp công cụ chỉnh kích thước ảnh trực tiếp: chọn nhanh `30%`, `60%`, `100%` hoặc kéo tự do ở góc ảnh.
  - Phóng to ảnh sắc nét (Lightbox): **Nhấp đúp chuột (Double-click)** vào ảnh bất kỳ để xem toàn màn hình.
- ⏰ **To-Do List & Hẹn giờ nhắc việc thông minh (Reminders & Toast Notifications)**:
  - Gõ `[]` để tạo ô việc cần làm (Checkbox To-Do).
  - Nhận diện cú pháp hẹn giờ tự nhiên: gõ `@14:30 15/11`, `@09:00`, `@mai 08:30`... Hệ thống tự tạo badge đồng hồ hẹn giờ.
  - Hộp thoại chọn ngày giờ tùy chỉnh kèm các nút tắt tiện lợi `+15 phút`, `+1 giờ`, `Ngày mai 09:00`.
  - **Thông báo Windows Native**: Windows 10/11 Action Center bật thông báo Toast nổi ngay cả khi ứng dụng đang ẩn. Nhấp vào thông báo sẽ tự động mở lại ghi chú và đưa con trỏ đến đúng dòng công việc.
- 📑 **Quản lý đa Tab trực quan & Tìm kiếm siêu tốc**:
  - Tạo tab mới (`Ctrl + N`), đổi tên tab khi nhấp đúp, chuyển tab tuần hoàn (`Ctrl + Tab` / `Ctrl + Shift + Tab`).
  - **Tìm kiếm tab nhanh (`Ctrl + /`)**: Gõ tìm theo tên tab và dùng phím mũi tên để nhảy tab tức thì.
- 📌 **Ghim cửa sổ (Always on Top)**: Giữ cửa sổ ghi chú luôn nổi trên các ứng dụng khác khi cần tra cứu/lập kế hoạch.
- 🌐 **Chia sẻ Web 1-Click Serverless (100% nội dung, ảnh & bảng)**:
  - Xuất bản ghi chú thành đường link web công khai siêu nhẹ bằng URL Hash `#<deflate-raw base64url>`.
  - Hoạt động 100% Client-side (Zero-backend), không cần máy chủ, không cần cơ sở dữ liệu.
  - Người nhận mở trên điện thoại hay máy tính xem được trọn vẹn văn bản, checkbox, bảng biểu và toàn bộ hình ảnh sắc nét thông qua Web Viewer trên GitHub Pages (`docs/`).
- 🔒 **Bảo mật & Cục bộ**: Toàn bộ dữ liệu ghi chú (`.md`), cấu hình (`config.json`) và hình ảnh (`assets/`) nằm hoàn toàn trên ổ cứng máy bạn.

---

## 🚀 Hướng dẫn sử dụng chi tiết

### 1. Khởi chạy ứng dụng
Sau khi tải hoặc biên dịch:
- Chạy tệp tin: `build/bin/NoteLocal.exe`.
- Cửa sổ ứng dụng sẽ xuất hiện ngay lập tức và tự động khôi phục tab đang mở gần nhất.

---

### 2. Soạn thảo văn bản, To-Do List & Hẹn giờ nhắc việc (Reminders)
- **Tự động lưu**: Mọi thao tác gõ văn bản được tự động lưu ngầm vào file `.md` sau 300ms (debounce).
- **Tạo ô Checkbox việc cần làm**:
  - Gõ hai ký tự `[]` liền nhau -> Hệ thống tự động chuyển đổi thành ô Checkbox.
  - Nhấp vào ô vuông để đánh dấu hoàn thành (chữ tự động gạch ngang và mờ đi).
  - Nhấn <kbd>Enter</kbd> tại dòng To-Do để tự động tạo tiếp dòng To-Do mới bên dưới.
  - Nhấn <kbd>Backspace</kbd> khi ô To-Do trống để đưa dòng trở lại văn bản thường.
- **Hẹn giờ nhắc việc (Reminders)**:
  - **Cú pháp gõ nhanh**: Gõ `@HH:mm dd/MM` (ví dụ: `[] Nộp báo cáo tài chính @14:30 15/11` hoặc `@mai 09:00`). Hệ thống sẽ tự nhận diện và hiển thị thành badge đồng hồ màu xanh.
  - **Chọn thủ công**: Nhấp vào badge đồng hồ hoặc icon đồng hồ bên phải dòng To-Do để mở popup chọn Ngày và Giờ (kèm các nút tắt `+15 phút`, `+1 giờ`, `Ngày mai 09:00`).
  - **Thông báo Windows**: Khi đến giờ hẹn, Windows Action Center sẽ bật thông báo Toast nổi ở góc màn hình. Nhấp vào thông báo sẽ tự động khôi phục cửa sổ và đưa con trỏ đến đúng dòng công việc.
  - **Tự động hủy nhắc**: Khi bạn đánh dấu hoàn thành ô việc (`[x]`), lịch nhắc nhở của việc đó sẽ tự động được tắt.

---

### 3. Bảng biểu phong cách Office (Tables)
- **Chèn bảng mới**:
  - Nhấp vào biểu tượng **Table** trên thanh Header.
  - Rê chuột trên lưới 6x6 để chọn số hàng và số cột mong muốn, hoặc nhấp vào các nút preset nhanh (`2x2`, `3x3`, `4x3`, `5x4`).
- **Thay đổi độ rộng cột**:
  - Rê chuột vào mép phải của tiêu đề cột (`<th>`), con trỏ sẽ đổi thành dạng kéo giãn `col-resize`.
  - Nhấp giữ và kéo sang trái/phải để thu nhỏ hoặc mở rộng cột theo ý muốn.
- **Thêm hàng / cột nhanh**:
  - Nhấp vào nút `+` ở cạnh phải bảng: Thêm ngay 1 cột mới.
  - Nhấp vào nút `+` ở đáy bảng: Thêm ngay 1 hàng mới.
- **Phím tắt `Tab` tiện lợi**:
  - Nhấn <kbd>Tab</kbd>: Nhảy sang ô tiếp theo.
  - Khi đang ở ô cuối cùng của hàng cuối cùng, nhấn <kbd>Tab</kbd> sẽ **tự động chèn thêm một hàng mới** và đặt con trỏ vào ô đầu tiên của hàng mới đó.
  - Nhấn <kbd>Shift</kbd> + <kbd>Tab</kbd>: Lùi về ô phía trước.
- **Menu chuột phải (Context Menu)**:
  - Nhấp chuột phải vào bất kỳ ô nào trong bảng để chọn:
    - *Thêm hàng phía trên / Thêm hàng phía dưới*
    - *Thêm cột bên trái / Thêm cột bên phải*
    - *Xóa hàng hiện tại / Xóa cột hiện tại*
    - *Xóa toàn bộ bảng*

---

### 4. Chèn & Quản lý hình ảnh
- **Dán ảnh (Ctrl + V)**:
  - Chụp ảnh màn hình qua <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> hoặc copy ảnh từ trình duyệt.
  - Nhấn <kbd>Ctrl</kbd> + <kbd>V</kbd> vào trình soạn thảo: Ảnh tự động được nén tối ưu (giảm 95% dung lượng) và lưu vào thư mục `assets/`.
- **Chỉnh kích thước ảnh**:
  - Nhấp 1 lần vào ảnh để hiển thị khung chọn kích thước: `30%`, `60%`, hoặc `Vừa khung (100%)`.
  - Kéo chấm tròn ở góc dưới bên phải ảnh để co giãn tự do.
- **Phóng to xem ảnh gốc (Lightbox)**:
  - **Nhấp đúp (Double-click)** vào ảnh bất kỳ để mở chế độ xem toàn màn hình sắc nét.
  - Nhấn phím <kbd>Esc</kbd> hoặc click ra ngoài ảnh để đóng.

---

### 5. Quản lý Thẻ ghi chú (Tabs)
- **Tạo Tab mới**: Nhấn phím tắt <kbd>Ctrl</kbd> + <kbd>N</kbd> hoặc click nút `+` trên thanh tiêu đề.
- **Chuyển Tab tuần hoàn**:
  - <kbd>Ctrl</kbd> + <kbd>Tab</kbd>: Chuyển sang tab kế tiếp.
  - <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd>: Chuyển lùi về tab phía trước.
- **Tìm kiếm Tab siêu tốc (`Ctrl + /`)**:
  - Nhấn <kbd>Ctrl</kbd> + <kbd>/</kbd> (hoặc click icon kính lúp trên header) để mở bảng tìm kiếm.
  - Nhập tên tab cần tìm; dùng phím mũi tên <kbd>↑</kbd> / <kbd>↓</kbd> để chọn và nhấn <kbd>Enter</kbd> để mở tab ngay lập tức.
- **Đổi tên Tab**: Nhấp đúp chuột vào tiêu đề tab, nhập tên mới và nhấn <kbd>Enter</kbd>.
- **Đóng Tab**: Rê chuột lên tab và nhấp vào biểu tượng `×`.

---

### 6. Ghim cửa sổ (Always on Top)
- Nhấp vào biểu tượng **Chiếc ghim** (Pin icon) ở góc phải thanh tiêu đề.
- Khi được ghim, biểu tượng chuyển sang màu vàng hổ phách (`#f59e0b`). Cửa sổ sẽ luôn nổi trên các ứng dụng khác.

---

### 7. Chia sẻ ghi chú qua Trình duyệt Web Serverless (GitHub Pages)
- Ở tab ghi chú cần chia sẻ, nhấp vào nút **Chia sẻ** (icon `share-2`).
- Toàn bộ nội dung văn bản, danh sách việc, hình ảnh và bảng biểu được nén bằng thuật toán `deflate-raw` và mã hóa thành URL Hash (`#`).
- Đường link có dạng: `https://michaeltran8386.github.io/note-app/#<hash>`. Khi mở trên trình duyệt:
  - Hiển thị 100% nội dung Markdown, Checkbox tương tác được, xem ảnh sắc nét và bảng biểu chuẩn xác.
  - Tích hợp chế độ **Soạn thảo trực tiếp trên Web** để chỉnh sửa nhanh và tự động cập nhật URL Hash.
  - Hoạt động hoàn toàn Client-side, không lưu trữ trên máy chủ nào, hoàn toàn riêng tư và miễn phí.

> **💡 Cách bật GitHub Pages cho Repository (chỉ làm 1 lần):**
> 1. Truy cập repo của bạn: `https://github.com/michaeltran8386/note-app/settings/pages`
> 2. Tại mục **Build and deployment** -> **Source**: Chọn **Deploy from a branch**.
> 3. Chọn Branch `main` và thư mục `/docs` -> Bấm **Save**.
> 4. Sau vài giây, trang web của bạn sẽ chính thức hoạt động tại: `https://michaeltran8386.github.io/note-app/`!

---

## ⌨️ Bảng tra cứu phím tắt (Keyboard Shortcuts)

| Phím tắt | Vị trí / Ngữ cảnh | Thao tác |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | Toàn ứng dụng | Mở thanh tìm kiếm Tab nhanh (Tab Search) |
| <kbd>Ctrl</kbd> + <kbd>Tab</kbd> | Toàn ứng dụng | Chuyển tiếp sang tab tiếp theo (Cycle forward) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd> | Toàn ứng dụng | Chuyển lùi về tab trước (Cycle backward) |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Toàn ứng dụng | Tạo tab ghi chú mới |
| `[]` | Trình soạn thảo | Gõ `[]` để tạo ô việc cần làm (Checkbox To-Do) |
| `@HH:mm dd/MM` | Dòng To-Do | Đặt lịch hẹn giờ nhắc việc tự động (Reminder) |
| <kbd>Backspace</kbd> | Dòng To-Do trống | Xóa ô To-Do và đưa về dạng dòng văn bản thường |
| <kbd>Enter</kbd> | Dòng To-Do | Tạo dòng việc cần làm tiếp theo bên dưới |
| <kbd>Tab</kbd> | Trong ô Bảng | Di chuyển sang ô tiếp theo (tự thêm hàng mới ở ô cuối cùng) |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Trong ô Bảng | Lùi về ô trước đó |
| <kbd>Chuột phải</kbd> | Trong ô Bảng | Mở menu ngữ cảnh thêm/xóa hàng, cột, bảng |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Trình soạn thảo | Dán ảnh từ clipboard (tự động nén tối ưu, không lag) |
| <kbd>Double-click</kbd> vào ảnh | Trên ảnh | Mở Lightbox phóng to xem ảnh gốc toàn màn hình |
| <kbd>Double-click</kbd> vào Tab | Thanh Header | Mở hộp thoại đổi tên tab |
| <kbd>Esc</kbd> | Toàn ứng dụng | Đóng Lightbox ảnh, popover bảng, menu chuột phải hoặc modal |

---

## 📁 Cấu trúc thư mục dự án

```text
NOTE_LOCAL/
├── assets/                     # Nơi lưu trữ các hình ảnh dán từ clipboard (.png, .jpg)
├── notes/                      # Nơi lưu trữ nội dung ghi chú (.md) theo từng tab
├── resources/                  # Tài nguyên nhận diện thương hiệu (Logo SVG chuẩn 100/100)
├── specs/                      # Đặc tả kỹ thuật chi tiết (spec, plan, data model, tasks)
│   └── 001-unified-notes-reminders/
├── docs/                       # Web Viewer lưu trữ trên GitHub Pages
│   ├── index.html              # Trang web xem ghi chú công khai
│   ├── app.js                  # Bộ giải nén client-side deflate-raw base64url & Markdown renderer
│   └── style.css               # Phong cách giao diện dark-mode cho Web Viewer
├── src/
│   ├── core/                   # Logic nghiệp vụ độc lập C++
│   │   ├── note_model.h        # Cấu trúc dữ liệu Note, Tab, Reminder, TodoItem
│   │   ├── markdown_engine.h/cpp # Bộ tuần tự hóa Markdown, Table, Image, To-Do, Reminders
│   │   ├── reminder_manager.h/cpp # Quản lý và lập lịch nhắc hẹn theo thời gian thực
│   │   └── share_service.h/cpp   # Dịch vụ chia sẻ ghi chú và tạo URL hash
│   ├── platform/               # Tầng tương tác hệ điều hành Windows
│   │   ├── window_controller.h/cpp # Xử lý cửa sổ Win32, DWM dark mode, Always on Top
│   │   ├── webview_host.h/cpp      # Điều khiển WebView2 Runtime
│   │   ├── notification_service.h/cpp # Windows Toast Notification & System Tray Icon
│   │   └── ipc_message.h/bridge.h  # Cầu nối truyền thông điệp JSON giữa C++ và WebView2
│   ├── ui/assets/              # Giao diện người dùng HTML5, CSS3, Vanilla JS
│   │   ├── index.html          # Cấu trúc DOM siêu tối giản (Editor, Popover bảng, Context menu)
│   │   ├── style.css           # Bảng phong cách dark-mode Windows 11
│   │   └── editor.js           # Xử lý tương tác bảng, dán ảnh nén Canvas, to-do, tabs
│   └── main.cpp                # Điểm khởi chạy WinMain, vòng lặp thông điệp Windows
├── tests/                      # Bộ kiểm thử đơn vị tự động (7/7 test suites pass 100%)
│   ├── unit/                   # Kiểm thử reminder parser, reminder manager, share contract
│   ├── test_markdown_engine.cpp # Kiểm thử tuần tự hóa Markdown, Table và Image
│   ├── test_storage_manager.cpp # Kiểm thử đọc ghi tệp tin và cấu hình
│   ├── test_window_controller.cpp
│   └── test_ipc_message.cpp
├── CMakeLists.txt              # Cấu hình biên dịch CMake đa nền tảng
└── README.md                   # Tài liệu hướng dẫn sử dụng và phát triển
```

---

## 🛠️ Hướng dẫn cài đặt & Biên dịch (Build from Source)

### Yêu cầu môi trường:
- **Hệ điều hành**: Windows 10/11 (64-bit).
- **Trình biên dịch C++**: Hỗ trợ C++17 (LLVM-MinGW, Clang, GCC hoặc MSVC).
- **CMake**: Phiên bản 3.20 trở lên.
- **Microsoft Edge WebView2 Runtime**: Đã tích hợp sẵn trên Windows 11 và Windows 10 cập nhật mới nhất.

### Các bước biên dịch:

```powershell
# 1. Clone repository
git clone https://github.com/michaeltran8386/note-app.git
cd note-app

# 2. Tạo thư mục build và cấu hình CMake
cmake -B build -G "Ninja"  # Hoặc -G "MinGW Makefiles" / MSVC

# 3. Biên dịch ứng dụng chính
cmake --build build --target NoteLocal

# 4. Chạy toàn bộ các bộ kiểm thử đơn vị tự động (Unit Tests)
.\build\bin\test_markdown_engine.exe
.\build\bin\test_reminder_parser.exe
.\build\bin\test_reminder_manager.exe
.\build\bin\test_storage_manager.exe
.\build\bin\test_share_contract.exe
.\build\bin\test_window_controller.exe
.\build\bin\test_ipc_message.exe

# 5. Khởi chạy ứng dụng
.\build\bin\NoteLocal.exe
```

---

## 📄 Bản quyền (License)

Dự án được phát hành theo giấy phép **[MIT License](LICENSE)**. Tự do sử dụng, chỉnh sửa và phân phối cho mục đích cá nhân lẫn thương mại.
