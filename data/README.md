# Hiện trạng dữ liệu và chuẩn bị làm sạch

Báo cáo sau làm sạch ngày 13/11/2026 cho thư mục `data` trên máy hiện tại. Số lượng có thể thay đổi khi ứng dụng ghi dữ liệu. Bộ dữ liệu phục vụ phát triển và trình diễn; ảnh minh họa không xác minh nhà trọ hay danh tính ngoài thực tế.

## Danh mục tệp

Các tệp JSON đều đọc được, gốc là mảng các đối tượng. Số lượng dưới đây là số đối tượng ở cấp gốc, không phải số ảnh trong mảng `images_url`.

| Tệp | Số bản ghi | Nội dung |
| --- | ---: | --- |
| `account.json` | 31 | Tài khoản, vai trò, phương thức đăng nhập và thông tin liên hệ |
| `university.json` | 7 | Trường đại học, địa chỉ và tọa độ |
| `student_profile.json` | 11 | Hồ sơ sinh viên, liên kết tài khoản và trường |
| `landlord_profile.json` | 10 | Hồ sơ chủ trọ, gồm thông tin định danh và thuế |
| `amenity.json` | 21 | Danh mục tiện ích |
| `boarding_house.json` | 11 | Nhà trọ, địa chỉ, tọa độ và chủ sở hữu |
| `boarding_house_image.json` | 11 | Nhóm ảnh theo nhà trọ |
| `room_post.json` | 10 | Tin cho thuê phòng thuộc nhà trọ |
| `room_post_image.json` | 10 | Nhóm ảnh theo tin phòng |
| `room_post_amenity.json` | 80 | Liên kết tin phòng và tiện ích |
| `roommate_preference.json` | 10 | Sở thích tìm bạn ở ghép của sinh viên |
| `roommate_post.json` | 10 | Tin tìm bạn ở ghép |
| `roommate_post_image.json` | 10 | Nhóm ảnh theo tin ở ghép |
| `roommate_post_amenity.json` | 83 | Liên kết tin ở ghép và tiện ích |
| `review.json` | 11 | Đánh giá nhà trọ của sinh viên |
| `review_image.json` | 11 | Nhóm ảnh theo đánh giá |
| `house-reviews.json` | 0 | Kho bình luận cũ, đã lọc bản ghi `test`, không được Git theo dõi |

## Kết quả làm sạch ngày 13/11/2026

| Hạng mục | Trước | Sau | Xử lý |
| --- | ---: | ---: | --- |
| Nhà trọ | 16 | 11 | Bỏ 5 nhà tên `123`, địa chỉ nhập thử |
| Tin phòng | 13 | 10 | Bỏ 3 tin `123` thuộc các nhà đã bỏ |
| Liên kết tiện ích tin phòng | 87 | 80 | Bỏ 7 liên kết của các tin trên |
| Đánh giá | 15 | 11 | Bỏ 4 đánh giá có nội dung chỉ là `123` |
| Bình luận cũ | 1 | 0 | Bỏ nội dung chỉ là `test` |
| Nhóm ảnh nhà/tin phòng/đánh giá | 16 / 13 / 15 | 11 / 10 / 11 | Lọc cùng bản ghi cha |
| Tổng dung lượng JSON | 6.218.609 byte | 72.189 byte | Tách ảnh nhúng và lọc bản ghi nhập thử |

Tất cả 31 tài khoản được giữ lại; tên số `2312312313` của tài khoản `demo-student` được đổi thành `Sinh viên thử nghiệm`. Giữ nguyên email, vai trò và mật khẩu băm. Không xóa tài khoản chỉ vì tên ngắn hoặc thiếu hồ sơ. Đánh giá có nội dung rõ nghĩa, kể cả đánh giá tiêu cực, được giữ lại. Bổ sung mô tả còn trống cho tiện ích Quán cafe.

Tệp RAR cung cấp 29 ảnh trọ và 20 avatar. Đã chọn **18 ảnh trọ và 20 avatar**; bỏ qua 11 ảnh trọ lẫn nội dung không phù hợp, quá tối hoặc lộn xộn. Ảnh được lưu trong `public/images/demo`, có bảng đối chiếu tên nguồn và SHA-256 tại [README ảnh](../public/images/demo/README.md). Các nhà trọ mẫu, tin phòng và tin ở ghép dùng ảnh minh họa cục bộ; 20 tài khoản ACC dùng avatar tương ứng. Không thêm địa chỉ, giá, tài khoản hoặc đánh giá giả chỉ từ nội dung ảnh.

Bỏ ảnh stock ở 10 đánh giá mẫu vì chưa có bằng chứng ảnh thuộc đánh giá. Năm ảnh tải lên của các bản ghi được giữ lại được tách khỏi base64 sang tệp `upload-*`, giữ nguyên byte nội dung. Hiện còn ba URL ảnh ngoài ở nhà trọ Minh An; chưa xác minh khả dụng. Việc chia nhóm ảnh mẫu không chứng minh chúng cùng một căn phòng ngoài thực tế.

Bản sao toàn bộ dữ liệu trước thay đổi nằm trên máy tại `/Users/macos/Downloads/findmyroom-data-backup-20261113-113736`, gồm cả bình luận cũ bị Git bỏ qua. Muốn hoàn tác: dừng server rồi chép các JSON ở cấp gốc thư mục sao lưu về `data`; không dùng thư mục con `cleaned` (đó là bản sau làm sạch). Ảnh mới được thêm riêng trong `public/images/demo`.

Kiểm chứng: công cụ kiểm tra dữ liệu qua 16 bảng, 483 tham chiếu và 79 lượt tham chiếu ảnh cục bộ; API 7/7 bài kiểm tra qua; Playwright tìm kiếm/phân trang 3/3 bài qua; `npm run build` thành công. Đã thử công cụ kiểm tra với 5 tình huống dữ liệu hỏng (khóa trùng, thiếu bản ghi cha, ảnh không tồn tại, sao vượt giới hạn, ngân sách đảo ngược); cả 5 đều bị từ chối. Các tọa độ, giá, trường đại học, danh tính và địa chỉ chưa được xác minh ngoài thực tế. Ảnh không thay thế việc xác minh các thông tin này.

## Cách ứng dụng sử dụng dữ liệu

Server mặc định đọc tài khoản từ `account.json`; đăng ký ghi vào tệp này. Trường `password` lưu chuỗi băm scrypt cho tài khoản mật khẩu; tài khoản dùng nhà cung cấp khác có thể để `null`. Đừng đưa mật khẩu nguyên văn vào dữ liệu. Server hiện mặc định đọc/ghi đánh giá trong `review.json` và ảnh trong `review_image.json`, thay vì `house-reviews.json`. Tệp `house-reviews.json` là dữ liệu cục bộ cũ có cấu trúc khác, đang bị Git bỏ qua; cần đối chiếu và sao lưu trước khi quyết định xử lý, không tự động nhập hoặc xóa.

Server cũng đọc/ghi các tệp tin đăng, nhà trọ và các tệp liên kết tương ứng. Một số dữ liệu được frontend import trực tiếp qua `src/data.js` và các component; làm sạch hoặc đổi cấu trúc có thể ảnh hưởng cả giao diện lẫn API. Cấu hình server cho phép thay đường dẫn một số tệp qua biến môi trường trong `server/auth.js`. Truy cập API cần server Vite (`npm run dev` hoặc `npm run preview`); chỉ phục vụ `dist` tĩnh không cung cấp các API này.

## Kết quả khảo sát trước khi làm sạch

Các số liệu trong phần này ghi lại hiện trạng trước thay đổi; xem bảng danh mục ở trên cho số lượng hiện tại.

- Không phát hiện khóa định danh bị trùng ở 14 nhóm thực thể có mã định danh riêng đã kiểm tra; email không trùng khi bỏ khoảng trắng hai đầu và so sánh không phân biệt hoa thường. Hai bảng liên kết tiện ích không có cặp khóa trùng.
- Không phát hiện tham chiếu thiếu trong 19 mối liên hệ đã kiểm tra: tài khoản, trường, sinh viên, nhà trọ, tin đăng, đánh giá, ảnh và tiện ích. Đây không phải xác nhận toàn bộ quy tắc nghiệp vụ đều hợp lệ.
- `boarding_house.json` có 5/16 bản ghi thiếu cả hai tọa độ. `student_profile.json` có 1/11 bản ghi thiếu ngày sinh, giới tính, năm học, thời điểm xác minh và có chuyên ngành rỗng. `amenity.json` có 1 mô tả rỗng; `room_post.json` có 2 mô tả rỗng và 7 giá trị giờ giới nghiêm `null` hoặc chuỗi rỗng. Cần xác định trường nào bắt buộc trước khi bổ sung.
- `account.json` có 13 mật khẩu `null`, đúng bằng số tài khoản có provider Google/Facebook; 11 avatar và 11 liên kết Zalo là `null`. Chưa kết luận các giá trị này là lỗi.
- Bốn tệp ảnh có tổng 169 đường dẫn/ảnh: 24 ảnh dạng data URL nhúng và 145 URL HTTP(S). `review_image.json` khoảng 3 MB và `room_post_image.json` khoảng 1,6 MB. Chưa kiểm tra tính khả dụng của URL hay nội dung ảnh.
- Tình trạng tin đăng hiện dùng các chuỗi `Còn phòng`, `Ẩn`, `Hết phòng`; `is_active` ở tài khoản là boolean còn ở tùy chọn ở ghép là số. Cần thống nhất quy ước và kiểm tra mã sử dụng trước khi chuyển đổi.
- Chưa phát hiện khoảng ngân sách tối thiểu lớn hơn tối đa trong 10 bản ghi sở thích. Chưa xác minh tính hợp lệ thực tế của địa chỉ, số điện thoại, tọa độ, thời gian, giá hay danh tính.

## Các mối liên hệ chính

- `account` → `student_profile` / `landlord_profile` / `boarding_house` qua `account_id`; sinh viên tham chiếu `university` qua `university_id`.
- `boarding_house` → `room_post` và `review`; `student_profile` → `review`, `roommate_post` và `roommate_preference` qua `student_code`.
- Mỗi nhóm ảnh tham chiếu thực thể tương ứng; hai bảng `*_amenity` liên kết tin đăng với `amenity`.
- Đây là các liên kết được suy ra từ dữ liệu và mã nguồn, chưa thay thế tài liệu mô hình dữ liệu hoặc quy tắc nghiệp vụ chính thức.

## Quy trình cho các đợt làm sạch tiếp theo

1. Sao lưu toàn bộ thư mục, kể cả `house-reviews.json` bị Git bỏ qua; làm việc trên bản sao và ghi lại số bản ghi ban đầu. Dữ liệu có thông tin liên hệ và định danh, tránh đưa giá trị cá nhân vào báo cáo công khai.
2. Thống nhất nguồn dữ liệu chuẩn, đặc biệt cách xử lý bình luận cũ, trường bắt buộc, giá trị được phép, đơn vị giá/khoảng cách, múi giờ và quy ước ID. Không tự suy đoán tọa độ hay xóa giá trị thiếu có chủ ý.
3. Lập bảng lỗi theo tệp, mã bản ghi, trường, giá trị hiện tại, quy tắc kiểm tra và hướng xử lý; phân biệt lỗi chắc chắn với trường hợp cần người phụ trách xác nhận.
4. Xử lý trùng lặp và liên kết thiếu nếu có; chuẩn hóa kiểu, chuỗi, thời gian và trạng thái sau khi đã chốt quy tắc. Giữ bản đối chiếu trước/sau và không thay ID tùy tiện.
5. Kiểm tra ảnh nhúng và URL, xác định chính sách lưu trữ ảnh; kiểm tra dữ liệu nhạy cảm và quyền truy cập trước khi chia sẻ hoặc triển khai.
6. Quét lại cú pháp JSON, số lượng, khóa, liên kết và các quy tắc đã thống nhất; chạy kiểm tra ứng dụng và thử các luồng liên quan. Báo cáo số bản ghi thay đổi, lỗi đã xử lý, vấn đề còn chờ và giới hạn kiểm tra.

Chạy `node scripts/validate-data.mjs` để kiểm tra cấu trúc mảng, khóa, liên kết, email trùng, mức sao đánh giá, khoảng ngân sách và sự tồn tại của ảnh cục bộ. Công cụ chỉ đọc dữ liệu, không sửa tệp và không xác minh ảnh URL bên ngoài.
