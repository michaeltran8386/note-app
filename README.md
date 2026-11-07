<p align="center">
  <img src="resources/logo/logo.svg" alt="Note Local Logo" width="100" height="100">
</p>

<h1 align="center">Note Local</h1>

<p align="center">
  <b>Ứng dụng ghi chú siêu tối giản (Ultra-Minimalist) cho Windows 11</b><br>
  Được xây dựng bằng C++ Native và WebView2 Runtime. Tốc độ tức thì, không ngốn RAM, lưu trữ Markdown 100% cục bộ.
</p>

<p align="center">
  <a href="https://github.com/michaeltran8386/note-app"><img src="https://img.shields.io/badge/GitHub-note--app-18181b?logo=github" alt="GitHub"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%2011-0078d4?logo=windows" alt="Platform">
  <img src="https://img.shields.io/badge/Tech-C%2B%2B17%20%7C%20WebView2-blue" alt="C++ WebView2">
  <img src="https://img.shields.io/badge/Icons-Lucide-f59e0b" alt="Lucide Icons">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## ✨ Điểm nổi bật

- ⚡ **Siêu nhẹ & Mượt mà**: Viết bằng C++ và Win32 API native kết hợp WebView2, khởi động tức thì, tối ưu bộ nhớ gấp nhiều lần so với các ứng dụng nền Electron.
- 🎨 **Chuẩn giao diện Windows 11 & Ultra-Minimal**: Hỗ trợ bo góc DWM, dark mode tinh tế, giao diện tập trung tuyệt đối vào văn bản.
- 📝 **Soạn thảo Markdown tự nhiên**: Tự động nhận diện cú pháp `[]` để tạo checkbox việc cần làm (To-Do List).
- 🖼️ **Dán ảnh tức thì (Ctrl+V) & Lightbox**: Chèn ảnh trực tiếp từ clipboard, kéo chỉnh kích thước mượt mà, nhấp đúp để phóng to toàn màn hình xem ảnh gốc sắc nét.
- 📑 **Quản lý đa Tab trực quan**: Đổi tên tab, chuyển tab tuần hoàn (`Ctrl + Tab`), và tìm kiếm tab siêu tốc (`Ctrl + /`).
- 📌 **Ghim cửa sổ (Always on Top)**: Giữ cửa sổ ghi chú luôn nổi trên các ứng dụng khác khi làm việc.
- 🌐 **Xuất URL chia sẻ qua GitHub Gist**: Xuất ghi chú thành link web công khai chỉ với 1 click, tự động sao chép vào clipboard và mở trình duyệt.
- 🔒 **Bảo mật & Cục bộ**: Tất cả dữ liệu được lưu dưới dạng file `.md` và hình ảnh trong thư mục máy tính cá nhân.

---

## 🚀 Hướng dẫn sử dụng chi tiết

### 1. Khởi chạy ứng dụng
Sau khi build hoặc tải bản phát hành:
- Chạy tệp tin: `build/bin/NoteLocal.exe`.
- Cửa sổ ứng dụng sẽ xuất hiện ngay lập tức và nạp lại trạng thái ghi chú gần nhất của bạn.

---

### 2. Soạn thảo văn bản & Danh sách việc cần làm (To-Do)
- **Gõ văn bản thông thường**: Nhấp chuột vào khung soạn thảo và bắt đầu ghi chép. Dữ liệu được **tự động lưu ngầm** sau 300ms.
- **Tạo ô Checkbox**:
  - Gõ hai ký tự `[]` (ngoặc vuông mở rồi đóng liền) -> Hệ thống tự chuyển đổi thành ô Checkbox tương tác được.
  - Nhấp vào ô vuông để đánh dấu hoàn thành (chữ sẽ tự động gạch ngang và mờ đi).
  - Nhấn <kbd>Enter</kbd> tại dòng To-Do để tự động tạo tiếp dòng To-Do mới bên dưới.
  - Nhấn <kbd>Backspace</kbd> khi ô To-Do trống để xóa ô và đưa dòng trở lại dạng văn bản thông thường.

---

### 3. Chèn và quản lý hình ảnh
- **Dán ảnh (Ctrl + V)**:
  - Sao chép ảnh bất kỳ (chụp ảnh màn hình qua <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> hoặc copy từ web).
  - Nhấn <kbd>Ctrl</kbd> + <kbd>V</kbd> vào trình soạn thảo: Ảnh sẽ tự động được lưu vào thư mục `assets/` và hiển thị tại vị trí con trỏ.
- **Chỉnh kích thước ảnh (Resize)**:
  - Nhấp chuột 1 lần vào ảnh: Khung chọn kích thước sẽ xuất hiện.
  - Chọn nhanh các kích thước có sẵn: `30%`, `60%`, hoặc `Vừa khung (100%)`.
  - Kéo chấm tròn ở góc dưới bên phải ảnh để co giãn tự do theo ý muốn.
- **Phóng to xem ảnh gốc (Lightbox)**:
  - **Nhấp đúp (Double-click)** vào ảnh bất kỳ để phóng to toàn màn hình sắc nét.
  - Nhấn phím <kbd>Esc</kbd> hoặc nhấp chuột ra ngoài ảnh để đóng.

---

### 4. Quản lý Thẻ ghi chú (Tabs)
- **Tạo Tab mới**: Nhấn phím tắt <kbd>Ctrl</kbd> + <kbd>N</kbd> hoặc click nút `+` trên thanh tiêu đề.
- **Chuyển Tab theo trình tự (Cycle Tabs)**:
  - <kbd>Ctrl</kbd> + <kbd>Tab</kbd>: Chuyển tiếp sang tab tiếp theo.
  - <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd>: Lùi về tab phía trước.
- **Tìm kiếm Tab siêu tốc**:
  - Nhấn <kbd>Ctrl</kbd> + <kbd>/</kbd> (hoặc click icon kính lúp trên header) để mở bảng tìm kiếm.
  - Gõ tên tab cần tìm; dùng phím mũi tên <kbd>↑</kbd> / <kbd>↓</kbd> để chọn và nhấn <kbd>Enter</kbd> để nhảy ngay đến tab đó.
- **Đổi tên Tab**: Nhấp đúp chuột vào tab trên thanh tiêu đề, nhập tên mới và nhấn <kbd>Enter</kbd>.
- **Đóng Tab**: Rê chuột lên tab và nhấp vào biểu tượng `×`.

---

### 5. Chế độ Ghim cửa sổ (Always on Top)
- Nhấp vào biểu tượng **Chiếc ghim** (Lucide Pin icon) ở góc phải thanh tiêu đề.
- Khi được ghim, biểu tượng sẽ xoay nghiêng và chuyển sang màu vàng hổ phách (`#f59e0b`). Cửa sổ sẽ luôn nổi trên các ứng dụng khác để bạn dễ dàng đối chiếu thông tin khi làm việc.

---

### 6. Chia sẻ ghi chú qua Trình duyệt Web Clean Text (GitHub Pages)
- Ở tab ghi chú cần chia sẻ, nhấp vào nút **Chia sẻ URL** (icon `share-2`).
- Toàn bộ nội dung văn bản sẽ được tự động nén bằng thuật toán `deflate-raw` và mã hóa trực tiếp vào URL Hash (`#`).
- Ứng dụng hiện thông báo **"Đã sao chép URL vào Clipboard của bạn"** mà không làm gián đoạn hay tự động bật trình duyệt ngoài ý muốn.
- Đường link có dạng: `https://michaeltran8386.github.io/note-app/#<hash>`. Khi dán vào trình duyệt, nó sẽ mở ra **trình duyệt Clean Text tĩnh được lưu trữ trực tiếp ngay trong repo GitHub** của bạn (`docs/`):
  - Hỗ trợ xem Markdown sắc nét, hiển thị danh sách việc cần làm (Checkbox), xem ảnh.
  - Hỗ trợ chuyển sang chế độ **Soạn thảo** ngay trên web để chỉnh sửa và tự động cập nhật URL Hash.
  - Hỗ trợ nút **Sao chép** nội dung thô và nút **Chia sẻ**.
  - Hoạt động 100% Client-side (Zero-backend), không cần database, hoàn toàn bảo mật và miễn phí vĩnh viễn trên GitHub Pages.

> **💡 Cách bật GitHub Pages cho Repository (chỉ làm 1 lần):**
> 1. Truy cập repo của bạn: `https://github.com/michaeltran8386/note-app/settings/pages`
> 2. Tại mục **Build and deployment** -> **Source**: Chọn **Deploy from a branch** (hoặc chọn **GitHub Actions** vì dự án đã có sẵn workflow tự động deploy).
> 3. Nếu chọn *Deploy from a branch*: Chọn Branch `main` và thư mục `/docs` -> Bấm **Save**.
> 4. Sau vài giây, trang web của bạn sẽ chính thức hoạt động tại: `https://michaeltran8386.github.io/note-app/`!

---

## ⌨️ Bảng tra cứu phím tắt (Keyboard Shortcuts)

| Phím tắt | Thao tác |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | Mở thanh tìm kiếm Tab nhanh (Tab Search / Switcher) |
| <kbd>Ctrl</kbd> + <kbd>Tab</kbd> | Chuyển tiếp sang tab tiếp theo (Cycle forward) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd> | Chuyển lùi về tab trước (Cycle backward) |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Tạo tab ghi chú mới |
| `[]` | Gõ `[]` để tạo ô việc cần làm (Checkbox To-Do) |
| <kbd>Backspace</kbd> | Xóa ô To-Do trống và đưa về dạng dòng văn bản |
| <kbd>Enter</kbd> | Tạo dòng việc cần làm tiếp theo khi đang ở To-Do |
| <kbd>Double-click</kbd> vào ảnh | Mở Lightbox phóng to xem ảnh gốc sắc nét |
| <kbd>Esc</kbd> | Đóng Lightbox ảnh hoặc đóng các hộp thoại / modal |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Dán ảnh chụp màn hình trực tiếp vào vị trí con trỏ |

---

## 🛠️ Hướng dẫn cài đặt & Biên dịch (Build from Source)

### Yêu cầu môi trường:
- Hệ điều hành: Windows 10/11 (64-bit).
- Trình biên dịch C++ hỗ trợ C++17 (Clang/MinGW hoặc MSVC).
- CMake 3.20 trở lên.
- Microsoft Edge WebView2 Runtime (đã tích hợp sẵn trên Windows 11).

### Các bước biên dịch:
```powershell
# 1. Clone repository
git clone https://github.com/michaeltran8386/note-app.git
cd note-app

# 2. Tạo thư mục build và cấu hình CMake
cmake -B build -G "Ninja"  # Hoặc -G "MinGW Makefiles" / MSVC

# 3. Tiến hành biên dịch
cmake --build build

# 4. Chạy kiểm thử tự động (Unit Tests)
.\build\bin\test_markdown_engine.exe
.\build\bin\test_storage_manager.exe
.\build\bin\test_window_controller.exe
.\build\bin\test_ipc_message.exe

# 5. Khởi chạy ứng dụng
.\build\bin\NoteLocal.exe
```

---

## 📁 Cấu trúc thư mục

```text
NOTE_LOCAL/
├── assets/                     # Nơi lưu trữ các hình ảnh dán từ clipboard
├── notes/                      # Nơi lưu trữ nội dung ghi chú (.md) theo từng tab
├── resources/                  # Tài nguyên thiết kế nhận diện thương hiệu
│   └── logo/                   # Logo SVG chuẩn (100/100 audit) và các biến thể
├── src/
│   ├── core/                   # StorageManager, MarkdownEngine
│   ├── platform/               # WindowController, WebViewHost, IPCBridge
│   ├── ui/assets/              # HTML5, CSS, JS theo phong cách Ultra-Minimal
│   └── main.cpp                # Điểm khởi chạy WinMain C++
├── tests/                      # Bộ kiểm thử đơn vị tự động (59/59 passed)
├── CMakeLists.txt              # Cấu hình biên dịch dự án
└── README.md                   # Tài liệu hướng dẫn sử dụng
```

---

## 📄 Bản quyền

Dự án được phát hành theo giấy phép **MIT License**. Tự do sử dụng, chỉnh sửa và phân phối.

