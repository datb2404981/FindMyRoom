# Dữ liệu tài khoản

`users.json` là nơi server đọc tài khoản khi đăng nhập và ghi tài khoản mới khi đăng ký. Thư mục này nằm ngoài `public` và bị chặn truy cập trực tiếp từ trình duyệt.

| Vai trò | Email | Mật khẩu kiểm thử |
| --- | --- | --- |
| Sinh viên | sinhvien@example.com | demopass123 |
| Chủ trọ | chutro@example.com | demopass123 |

Chạy `npm install` và `npm run dev`, mở `http://localhost:5173`, rồi đăng nhập bằng một tài khoản ở bảng trên. Để thử đăng ký, nhập một email mới, chọn vai trò và hoàn tất form; tài khoản được thêm vào `users.json` và đăng nhập ngay. Sau đó mở menu avatar để đăng xuất và thử đăng nhập lại.

Mỗi tài khoản có `id`, `name`, `email`, `phone`, `role`, `passwordHash` và `createdAt`. `passwordHash` dùng scrypt và salt riêng, không phải mật khẩu gốc. Tạo tài khoản bằng form đăng ký để server tự sinh các trường này; không thay `passwordHash` bằng mật khẩu nguyên văn.

Email không phân biệt chữ hoa/thường và không được trùng. Vai trò đăng nhập lấy từ file, không lấy từ lựa chọn trên trình duyệt. Đăng xuất hủy phiên phía server, không xóa tài khoản trong file. Khởi động lại server giữ tài khoản đã đăng ký nhưng cần đăng nhập lại.

Các tài khoản trong file ban đầu là dữ liệu mẫu. Bộ kiểm tra tự tạo bản sao tạm của file, nên chạy `npm test` không thêm hay sửa tài khoản trong file đang dùng.
