<script setup>
import Icon from '../components/Icon.vue'
</script>

<template>
  <div class="container page guide-page">
    <div class="breadcrumb">
      <RouterLink to="/">Trang chủ</RouterLink>
      <Icon name="right" :size="14" />
      <span>Hướng dẫn sử dụng</span>
    </div>

    <div class="section-heading">
      <div>
        <span class="eyebrow">Hỗ trợ & Hướng dẫn</span>
        <h1>Hướng dẫn sử dụng FindMyRoom</h1>
        <p class="muted">Tất cả những điều bạn cần biết để tìm trọ, ghép trọ và đăng tin hiệu quả.</p>
      </div>
    </div>

    <div class="guide-grid">
      <article class="guide-card">
        <div class="guide-icon">
          <Icon name="search" :size="24" />
        </div>
        <h2>1. Tìm phòng trọ</h2>
        <ul>
          <li>Truy cập mục <strong>Tìm trọ</strong> từ thanh điều hướng chính.</li>
          <li>Sử dụng thanh tìm kiếm để gõ khu vực, tên đường hoặc trường học gần bạn.</li>
          <li>Lọc nhanh theo <strong>Khu vực</strong>, <strong>Khoảng giá</strong> và các <strong>Tiện ích</strong> (máy lạnh, wifi, gác lửng, camera,...).</li>
          <li>Nhấn vào từng phòng để xem chi tiết chi phí (điện, nước, cọc) và thông tin liên hệ chủ trọ.</li>
        </ul>
      </article>

      <article class="guide-card">
        <div class="guide-icon">
          <Icon name="users" :size="24" />
        </div>
        <h2>2. Tìm bạn ở ghép</h2>
        <ul>
          <li>Vào mục <strong>Ghép trọ</strong> để tìm kiếm người bạn cùng phòng phù hợp.</li>
          <li>Lọc theo tiêu chí lối sống: giờ giấc tự do, yên tĩnh, không hút thuốc, nuôi thú cưng,...</li>
          <li>Bấm <strong>Quan tâm</strong> để lưu hồ sơ bạn ưng ý hoặc <strong>Bỏ qua</strong> để chuyển sang hồ sơ tiếp theo.</li>
          <li>Chủ động đăng bài tìm bạn ở ghép với thông tin rõ ràng về bản thân.</li>
        </ul>
      </article>

      <article class="guide-card">
        <div class="guide-icon">
          <Icon name="edit" :size="24" />
        </div>
        <h2>3. Đăng bài cho thuê & Ghép trọ</h2>
        <ul>
          <li>Đăng nhập tài khoản của bạn (tài khoản Chủ trọ hoặc Sinh viên).</li>
          <li>Bấm <strong>Đăng bài</strong> và điền thông tin qua 5 bước trực quan.</li>
          <li>Tải lên hình ảnh thực tế rõ ràng để bài đăng tiếp cận nhiều người hơn.</li>
          <li>Dễ dàng quản lý, chỉnh sửa hoặc gỡ bài đăng trong mục <strong>Quản lý bài đăng</strong>.</li>
        </ul>
      </article>

      <article class="guide-card">
        <div class="guide-icon">
          <Icon name="shield" :size="24" />
        </div>
        <h2>4. Nguyên tắc an toàn</h2>
        <ul>
          <li>Luôn đến xem phòng trực tiếp và xác minh chủ trọ trước khi đặt cọc.</li>
          <li>Đọc kỹ hợp đồng thuê trọ: quy định hoàn cọc, giá điện/nước và giờ giấc.</li>
          <li>Khi tìm bạn ở ghép, hãy hẹn gặp ở nơi công cộng để trao đổi trước khi chuyển vào ở chung.</li>
        </ul>
      </article>
    </div>
  </div>
</template>

<style scoped>
.guide-page {
  max-width: 1000px;
}
.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 24px;
}
.guide-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 28px;
  box-shadow: var(--shadow);
}
.guide-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--cream-deep);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--ink);
}
.guide-card h2 {
  font-size: 20px;
  margin-bottom: 14px;
}
.guide-card ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--muted);
  font-size: 14.5px;
  line-height: 1.6;
}
.guide-card ul strong {
  color: var(--ink);
}
@media (max-width: 700px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>

