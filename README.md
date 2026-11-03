# FindMyRoom — website Vue 3

Frontend được viết trực tiếp bằng Vue 3, Vue Router và Vite, dựa trên bộ wireframe trong thư mục cha và phong cách của `DESIGN.md`. Không dùng mô hình tạo website của OpenDesign Cloud.

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
- `/#/dang-nhap`, `/#/dang-ky`, `/#/xac-thuc`: form kiểm tra dữ liệu, lựa chọn sinh viên/chủ trọ, OTP demo có hạn 120 giây và giới hạn 5 lần sai.
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

## Dữ liệu demo

Đăng nhập bằng email hợp lệ và mật khẩu bất kỳ ít nhất 8 ký tự; chọn sinh viên hoặc chủ trọ. OTP demo: `246810`. Không gửi email/SMS, không tạo tài khoản thật, không gọi Google/Facebook OAuth. Các nút social giải thích trạng thái chưa kết nối. Không lưu mật khẩu. Phiên đăng nhập chỉ tồn tại trong tab và mất khi tải lại; dữ liệu mẫu, hồ sơ, tin đã lưu, tương tác, bài đăng và bản nháp chữ lưu tại localStorage của trình duyệt.

Bản đồ là sơ đồ minh họa, không dùng API định vị địa chỉ. Nút lấy vị trí hiện tại chỉ yêu cầu trình duyệt cấp quyền và hiển thị tọa độ khi được cho phép. Liên kết Google Maps mở địa chỉ để xem riêng.

Ảnh tải lên được kiểm tra loại tệp và dung lượng, có xem trước/xóa/ảnh bìa trong phiên. Chưa có backend lưu ảnh; tải lại cần chọn lại ảnh, bài đăng mẫu sau khi lưu dùng hình SVG minh họa. Ảnh đại diện cũng chỉ xem trước trong phiên. Chưa có chat, gửi liên hệ, kiểm duyệt hoặc thuật toán tương thích phía máy chủ.

## Kiểm tra

```sh
npm test
```

Bộ kiểm tra Playwright xác minh luồng tìm kiếm và không kết quả, đăng nhập demo/lưu tin/hồ sơ, ghép trọ, CRUD nhà trọ, form đăng bài và tải ảnh, đủ 140 nguồn AST, cùng tràn ngang ở desktop và mobile. Khởi động `npm run dev` trước khi chạy. Nếu máy khác chưa có Chromium, chạy `npx playwright install chromium`; bỏ `executablePath` trong `playwright.config.js` để Playwright chọn trình duyệt của máy đó, hoặc truyền biến `CHROME_PATH`.
