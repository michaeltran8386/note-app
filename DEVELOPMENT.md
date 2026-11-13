# Hướng dẫn Kỹ thuật & Biên dịch NoteLocal (Development Guide)

Tài liệu này dành cho các lập trình viên muốn tự biên dịch (build from source) và đóng gói mã nguồn của dự án NoteLocal.

---

## 🛠️ Yêu cầu môi trường
* **Hệ điều hành**: Windows 10/11 (64-bit).
* **Trình biên dịch C++**: MSVC (Visual Studio 2022+), Clang hoặc MinGW hỗ trợ C++17.
* **CMake**: Phiên bản 3.20 trở lên.
* **Ninja**: (Khuyên dùng) Trình tạo build siêu tốc.
* **Node.js**: Phiên bản 20+ hoặc 22+ (chỉ cần cho chạy bộ test E2E UI).
* **Inno Setup**: Phiên bản 6+ (để đóng gói file cài đặt installer).
* **Microsoft Edge WebView2 Runtime**: Đã tích hợp sẵn trên Windows 10/11.

---

## 🔨 Các bước biên dịch từ mã nguồn (Build with CMake)

### 1. Chuẩn bị WebView2 SDK (Nếu chưa có)
```powershell
Invoke-WebRequest -Uri "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.2903.40" -OutFile webview2.zip
Expand-Archive -Path webview2.zip -DestinationPath third_party/webview2 -Force
Remove-Item webview2.zip
```

### 2. Cấu hình và Biên dịch
```powershell
# Cấu hình bằng CMake với Ninja (hoặc Visual Studio)
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release

# Biên dịch ứng dụng chính và các bộ test
cmake --build build
```
File thực thi chính sẽ được sinh ra tại: `build/bin/NoteLocal.exe`.

---

## 🧪 Chạy Kiểm thử tự động (Test Suites)

### 1. Chạy 7 bộ kiểm thử C++ Native:
```powershell
ctest --test-dir build --output-on-failure
```

### 2. Chạy 29 kịch bản kiểm thử E2E Giao diện & Tương tác Notion (Headless Browser):
```powershell
node tests/editor_interactions.mjs
```

---

## 📦 Đóng gói Trình cài đặt Installer (.exe) với Inno Setup
```powershell
# Sử dụng Inno Setup để tạo ra NoteLocal-Setup-x64.exe (chỉ 2.45 MB)
& "$env:LocalAppData\Programs\Inno Setup 6\ISCC.exe" installer.iss
```
File cài đặt hoàn thiện sẽ nằm tại thư mục: `dist/NoteLocal-Setup-x64.exe`.

---

## 🤖 CI/CD Workflow
Dự án được cấu hình sẵn GitHub Actions tại `.github/workflows/release.yml`. Khi đẩy một Git tag phiên bản (ví dụ: `git tag v3.1.0 && git push origin v3.1.0`), máy chủ GitHub sẽ tự động:
1. Setup môi trường MSVC và tải WebView2 SDK.
2. Build ứng dụng Release với CMake và Ninja.
3. Chạy toàn bộ test C++ và E2E browser tests.
4. Đóng gói ra `NoteLocal-Setup-x64.exe`.
5. Tạo GitHub Release và đính kèm file cài đặt tự động.
