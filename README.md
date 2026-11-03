# FindMyRoom — website Vue 3

Frontend được viết trực tiếp bằng Vue 3, Vue Router và Vite, dựa trên bộ wireframe trong thư mục cha và phong cách của `DESIGN.md`. API tài khoản viết bằng Node.js, lưu tại `data/users.json`, chạy cùng Vite. Không dùng mô hình tạo website của OpenDesign Cloud.

## Chạy website

```sh
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị. Phiên chạy hiện tại: http://localhost:5173/.

```sh
npm run build
npm run preview
```

## Các trang và luồng

- `/`: trang chủ, tìm theo từ khóa, địa điểm, khoảng giá, tiện ích; 4 khu vực, phòng nổi bật và khối ghép trọ.
- `/#/tim-tro`: bộ lọc kết hợp, sắp xếp theo giá, trạng thái không có kết quả và sơ đồ khu vực.
- `/#/phong/minh-an`: chi tiết phòng, chuyển ảnh minh họa, lưu tin, yêu cầu đăng nhập khi xem liên hệ.
- `/#/ghep-tro`: lọc theo khu vực, đối tượng, ngân sách, lối sống; xem hồ sơ, bỏ qua, quan tâm.
- `/#/dang-nhap`, `/#/dang-ky`: đăng nhập kiểm tra email/mật khẩu trong JSON, đăng ký chọn sinh viên/chủ trọ và lưu tài khoản mới. Đường dẫn cũ `/#/xac-thuc` chuyển về đăng ký; chưa gửi email xác thực.
- `/#/ho-so`: xem, chỉnh sửa, xác nhận và lưu hồ sơ; ảnh đại diện xem trước.
- `/#/quan-ly/nha-tro`: thêm, sửa, xóa nhà trọ dành cho chủ trọ.
- `/#/quan-ly/bai-dang`, `/#/quan-ly/da-luu`: quản lý bài đăng và tin đã lưu.
- `/#/dang-bai/roommate`: 4 bước thông tin, vị trí, hình ảnh, tiện ích; xem trước và đăng.
- `/#/dang-bai/rental`: 5 bước cho thuê, gồm xem trước; kiểm tra dữ liệu trước khi qua bước, giữ bản nháp khi quay lại.
- `/#/wireframes`: danh mục 140 màn hình; lọc nhóm/thiết bị/tên; xem ảnh gốc hoặc cây AST với tọa độ gốc và màu DESIGN.md. Đây là công cụ đối chiếu, không phải 140 trang nghiệp vụ độc lập.

## Nguồn và độ khớp

Giữ trình tự các khối và nhóm chức năng chính theo wireframe; dùng nền kem `#faf7f0`, chữ `#131414`, nút vàng `#f9c54d`, cyan `#8fc8cf`, coral `#f27058`, input 8px và card 16–18px. Các ảnh phòng, khu vực và nhân vật là SVG minh họa được vẽ trong dự án, không phải ảnh nhà trọ thật.

IBM Plex Sans được đóng gói cục bộ ở 4 trọng lượng. Chưa có tệp hoặc giấy phép PP Pangram Sans trong nguồn, nên tiêu đề dùng IBM Plex Sans dự phòng. Khi nhóm có phông PP Pangram Sans hợp lệ, có thể thêm @font-face vào `src/style.css`.

`review/coverage.json` ánh xạ toàn bộ 140 mã nguồn vào nhóm tính năng hoặc sơ đồ. Toàn bộ ảnh và AST gốc có sẵn để kiểm tra. **Không coi số lượng tham chiếu là bằng chứng độ khớp giao diện 100%.** Bản frontend được dựng bằng bố cục responsive, không phải phép sao chép từng pixel của 140 biến thể; các khác biệt gồm typography dự phòng, nội dung mẫu thay cho skeleton, kích thước và thứ tự xuống cột trên mobile, sơ đồ bản đồ, xác thực bên ngoài và một số trạng thái chỉnh sửa gộp vào cùng form. Chưa kiểm tra pixel tự động toàn bộ 140 ảnh.

Tài liệu tổng quan yêu cầu 5 bước đăng cho thuê trong khi một số wireframe desktop chỉ vẽ 4 nhãn bước. Bản ứng dụng dùng 5 bước theo luồng đặc tả, giữ nguyên phiên bản gốc trong công cụ đối chiếu. Tương tự, ràng buộc ảnh dùng 3–10 ảnh / 10 MB theo quy tắc chung thay cho nhãn 1 ảnh / 50 MB ở một vài màn hình cũ.

## Tài khoản và dữ liệu kiểm thử

Chạy `npm run dev` là đủ để mở cả frontend và API tài khoản; không cần cài cơ sở dữ liệu. Tài khoản đọc/ghi tại [`data/users.json`](data/users.json), xem hướng dẫn tại [`data/README.md`](data/README.md).

| Vai trò | Email | Mật khẩu kiểm thử |
| --- | --- | --- |
| Sinh viên | sinhvien@example.com | demopass123 |
| Chủ trọ | chutro@example.com | demopass123 |

Đăng ký bằng email mới sẽ thêm tài khoản vào file và đăng nhập ngay. Đăng nhập kiểm tra mật khẩu băm scrypt; email không phân biệt chữ hoa/thường và không được đăng ký trùng. Vai trò lấy từ tài khoản đã lưu. Không gửi OTP/email/SMS, không gọi Google/Facebook OAuth. Các nút social giải thích trạng thái chưa kết nối.

API trong `server/auth.js` cung cấp `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`, `PATCH /api/auth/profile`. Trình duyệt giữ cookie HttpOnly, SameSite=Lax, hạn 8 giờ; phiên nằm trong bộ nhớ server. F5 vẫn giữ đăng nhập; đăng xuất hủy phiên phía server. Khởi động lại server làm mất phiên nhưng giữ các tài khoản trong JSON. Mật khẩu và mã phiên không được ghi vào localStorage/sessionStorage.

Header hiển thị đăng nhập/đăng ký khi chưa có phiên; sau đăng nhập hiển thị avatar và menu tài khoản gồm hồ sơ, tin đã lưu, quản lý bài đăng và đăng xuất. Mục quản lý nhà trọ chỉ hiện với vai trò chủ trọ; mục đăng bài tương ứng vai trò sinh viên/chủ trọ. Menu điện thoại cũng theo trạng thái và vai trò này.

Tên, email và số điện thoại cập nhật trong hồ sơ được ghi vào tài khoản JSON. Các trường hồ sơ còn lại, tin đã lưu, tương tác, bài đăng và bản nháp chữ lưu trong localStorage theo ID tài khoản (`findmyroom-demo-v1:<id>`). Đổi tài khoản sẽ đổi bộ dữ liệu cục bộ; những dữ liệu nghiệp vụ này chưa đồng bộ giữa các thiết bị.

Đây là bản chạy cục bộ với file JSON, chưa xác minh quyền sở hữu email. Cần server Node.js đang chạy để đăng nhập/đăng ký; chỉ đưa thư mục `dist` lên GitHub Pages sẽ không chạy được API ghi JSON. `npm run build` và `npm run preview` hỗ trợ xem bản build kèm API cục bộ. `data` không nằm trong `public`, không được đưa vào bản build và bị chặn tải qua Vite.

Bản đồ là sơ đồ minh họa, không dùng API định vị địa chỉ. Nút lấy vị trí hiện tại chỉ yêu cầu trình duyệt cấp quyền và hiển thị tọa độ khi được cho phép. Liên kết Google Maps mở địa chỉ để xem riêng.

Ảnh tải lên được kiểm tra loại tệp và dung lượng, có xem trước/xóa/ảnh bìa trong phiên. Chưa có backend lưu ảnh; tải lại cần chọn lại ảnh, bài đăng mẫu sau khi lưu dùng hình SVG minh họa. Ảnh đại diện cũng chỉ xem trước trong phiên. Chưa có chat, gửi liên hệ, kiểm duyệt hoặc thuật toán tương thích phía máy chủ.

## Kiểm tra

```sh
npm test
```

Bộ kiểm tra API xác minh ghi tài khoản vào JSON, băm mật khẩu, đăng nhập lại sau khi tạo server mới, email trùng, hủy phiên và ghi đồng thời. Playwright tự chạy server riêng tại cổng 5174 với bản sao dữ liệu trong thư mục tạm; không sửa `data/users.json` đang dùng. Các luồng còn lại gồm tìm kiếm, hồ sơ/tin đã lưu, menu theo vai trò, ghép trọ, CRUD nhà trọ, đăng bài, 140 nguồn AST và bố cục desktop/mobile. Không cần khởi động server trước khi chạy kiểm tra. Nếu máy khác chưa có Chromium, chạy `npx playwright install chromium` hoặc truyền biến `CHROME_PATH`.
