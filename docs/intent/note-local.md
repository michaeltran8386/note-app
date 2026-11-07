# Statement of Intent: Note Local (Windows 11)

- **Outcome:** Ứng dụng sticky note siêu nhẹ trên Windows 11 bằng C/C++, luôn ghim góc màn hình, mang trải nghiệm soạn thảo tự nhiên không rào cản: gõ `[]` tự động biến thành ô checkbox click tick được ngay, nhấn `Backspace` để xóa ô checkbox, nhấn `Ctrl+V` là ảnh tự chèn và co giãn vừa khung cửa sổ; toàn bộ nội dung ngầm tự động lưu trạng thái và sinh ra file `.md` chuẩn cục bộ.
- **User:** Người dùng máy tính cần một sổ tay nháp tiện tay, gõ phím trực giác và nhanh gọn mà không cần học hay nhớ cú pháp Markdown phức tạp.
- **Why now:** Cần một công cụ vừa có sự nhẹ nhàng, khởi động tức thì của ứng dụng native C++, vừa có sự thông minh, tiện lợi của các trình soạn thảo hiện đại (tự nhận diện `[]` thành checkbox, xóa bằng Backspace) thay vì giao diện thô cứng.
- **Success:** 
  1. Gõ `[]` lập tức chuyển thành một ô checkbox bấm tick được;
  2. Đặt con trỏ ngay sau checkbox và nhấn `Backspace` thì ô checkbox bị xóa gọn gàng;
  3. Nhấn `Ctrl+V` ảnh dán vào ngay và tự động co giãn theo chiều rộng cửa sổ;
  4. Quản lý nhiều tab, đổi tên tab dễ dàng;
  5. Cửa sổ luôn ghim nổi (Always on Top) và tự động ghi nhớ vị trí, kích thước, nội dung sau khi tắt/mở lại;
  6. File sinh ra ở ổ đĩa là file `.md` sạch đẹp kèm thư mục ảnh cục bộ.
- **Constraint:** C/C++ trên Windows 11, hoạt động hoàn toàn offline, tự động co ảnh giữ nguyên tỷ lệ khung hình.
- **Out of scope:** Bắt người dùng phải nhìn hoặc sửa cú pháp mã Markdown thô, đồng bộ đám mây, tài khoản đăng nhập.
