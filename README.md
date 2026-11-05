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

- `/`: trang chủ gộp tìm trọ. Khi chưa tìm kiếm, giữ khối giới thiệu, 4 khu vực, phòng nổi bật và danh sách phòng trọ bên dưới; chưa hiển thị nhóm ghép trọ hoặc nhà trọ. Khi tìm kiếm, giữ banner, bộ lọc và đường dẫn trang chủ; phần bên dưới hiển thị kết quả của ba nhóm phòng cho thuê/ghép trọ/nhà trọ cùng phân trang.
- `/#/tim-tro`: liên kết tương thích, tự chuyển về trang chủ ở chế độ tìm kiếm và giữ query bộ lọc. Sinh viên và khách không có mục tìm trọ riêng trên thanh điều hướng.
- `/#/phong/minh-an`: chi tiết phòng, chuyển ảnh minh họa, lưu tin, yêu cầu đăng nhập khi xem liên hệ.
- `/#/ghep-tro`: bảng lọc theo trường học hoặc khu vực, giới tính, khoảng ngân sách hai đầu, tiện ích và phong cách sống. Thẻ checkbox bấm được toàn bộ; các tiêu chí lọc dựa trên dữ liệu hồ sơ mẫu. Có nút đặt lại bộ lọc; trên điện thoại, bắt đầu ghép sẽ đưa tới phần kết quả. Giữ luồng xem hồ sơ, bỏ qua và quan tâm.
- `/#/dang-nhap`, `/#/dang-ky`: đăng nhập kiểm tra email/mật khẩu trong JSON, đăng ký chọn sinh viên/chủ trọ và lưu tài khoản mới. Đường dẫn cũ `/#/xac-thuc` chuyển về đăng ký; chưa gửi email xác thực.
- `/#/ho-so`: xem, chỉnh sửa, xác nhận và lưu hồ sơ; ảnh đại diện xem trước.
- `/#/quan-ly/nha-tro`: thêm, sửa, xóa nhà trọ dành cho chủ trọ.
- `/#/quan-ly/bai-dang`: quản lý bài đăng.
- `/#/dang-bai/roommate`: 4 bước thông tin, vị trí, hình ảnh, tiện ích; xem trước và đăng.
- `/#/dang-bai/rental`: 5 bước cho thuê, gồm xem trước; kiểm tra dữ liệu trước khi qua bước, giữ bản nháp khi quay lại.
- `/#/wireframes`: danh mục 140 màn hình; lọc nhóm/thiết bị/tên; xem ảnh gốc hoặc cây AST với tọa độ gốc và màu DESIGN.md. Đây là công cụ đối chiếu, không phải 140 trang nghiệp vụ độc lập.

## Bộ lọc tìm phòng

Trang chủ có dropdown địa điểm với hai tab: trường đại học/cao đẳng và khu vực. Khoảng giá gồm 10 mức và cho phép chọn nhiều khoảng; tiện ích là checkbox chọn nhiều. Kết quả nằm ngay trong trang chủ với query `search=1`; giữ đủ bộ lọc, từ khóa và số trang khi tải lại hoặc quay lại từ chi tiết phòng. Một phòng phải thuộc một trong các khoảng giá đã chọn và có đủ các tiện ích đã đánh dấu.

Mỗi nhóm hiển thị tối đa 4 bài mỗi trang, phân trang dựa trên dữ liệu thực tế. `src/listings.js` cung cấp các bài ghép trọ mẫu và tổng hợp nhà trọ từ những phòng đang hiển thị. Bài mới ở trạng thái chờ duyệt chưa xuất hiện trong danh sách công khai. Thẻ ghép trọ/nhà trọ mở thông tin chi tiết ngay tại trang chủ; phòng cho thuê mở trang chi tiết phòng.

Không có kết quả hiển thị trạng thái riêng với nút xóa bộ lọc. Từ khóa quá 120 ký tự, chỉ có dấu câu hoặc query bộ lọc/số trang sai hiển thị “Dữ liệu không hợp lệ”; người dùng có thể nhập lại ngay trên trang chủ. Từ khóa không phân biệt chữ hoa/thường và dấu tiếng Việt.

Danh mục trường, khoảng giá và xử lý query nằm trong `src/search-filters.js`; thông tin trường liên kết với phòng qua `schoolIds` trong `src/data.js`. Đây là dữ liệu mẫu để thử lọc, không phải khoảng cách thực tế tới trường. Danh sách tên trường có liên kết nguồn trong mã; một số trường chưa có phòng mẫu nên có thể trả về danh sách trống.

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

Header hiển thị đăng nhập/đăng ký khi chưa có phiên; sau đăng nhập hiển thị avatar và menu tài khoản gồm hồ sơ, quản lý bài đăng và đăng xuất. Với sinh viên, mục quản lý bài đăng trên header, menu tài khoản và menu điện thoại chỉ hiện khi tài khoản đó có ít nhất một bài ghép trọ đã gửi đăng (kể cả đang chờ duyệt); bản nháp không được tính. Xóa bài cuối cùng sẽ ẩn mục này. Chủ trọ luôn có mục quản lý bài đăng. Mục quản lý nhà trọ chỉ hiện với vai trò chủ trọ; mục đăng bài tương ứng vai trò sinh viên/chủ trọ. Menu điện thoại cũng theo trạng thái và vai trò này.

Tên, email và số điện thoại cập nhật trong hồ sơ được ghi vào tài khoản JSON. Các trường hồ sơ còn lại, tương tác, bài đăng và bản nháp chữ lưu trong localStorage theo ID tài khoản (`findmyroom-demo-v1:<id>`). Đổi tài khoản sẽ đổi bộ dữ liệu cục bộ; những dữ liệu nghiệp vụ này chưa đồng bộ giữa các thiết bị.

Đây là bản chạy cục bộ với file JSON, chưa xác minh quyền sở hữu email. Cần server Node.js đang chạy để đăng nhập/đăng ký; chỉ đưa thư mục `dist` lên GitHub Pages sẽ không chạy được API ghi JSON. `npm run build` và `npm run preview` hỗ trợ xem bản build kèm API cục bộ. `data` không nằm trong `public`, không được đưa vào bản build và bị chặn tải qua Vite.

Bản đồ là sơ đồ minh họa, không dùng API định vị địa chỉ. Nút lấy vị trí hiện tại chỉ yêu cầu trình duyệt cấp quyền và hiển thị tọa độ khi được cho phép. Liên kết Google Maps mở địa chỉ để xem riêng.

Ảnh tải lên được kiểm tra loại tệp và dung lượng, có xem trước/xóa/ảnh bìa trong phiên. Chưa có backend lưu ảnh; tải lại cần chọn lại ảnh, bài đăng mẫu sau khi lưu dùng hình SVG minh họa. Ảnh đại diện cũng chỉ xem trước trong phiên. Chưa có chat, gửi liên hệ, kiểm duyệt hoặc thuật toán tương thích phía máy chủ.

## Kiểm tra

```sh
npm test
```

Bộ kiểm tra API xác minh ghi tài khoản vào JSON, băm mật khẩu, đăng nhập lại sau khi tạo server mới, email trùng, hủy phiên và ghi đồng thời. Playwright tự chạy server riêng tại cổng 5174 với bản sao dữ liệu trong thư mục tạm; không sửa `data/users.json` đang dùng. Các luồng còn lại gồm tìm kiếm, hồ sơ, menu theo vai trò, ghép trọ, CRUD nhà trọ, đăng bài, 140 nguồn AST và bố cục desktop/mobile. Không cần khởi động server trước khi chạy kiểm tra. Nếu máy khác chưa có Chromium, chạy `npx playwright install chromium` hoặc truyền biến `CHROME_PATH`.
