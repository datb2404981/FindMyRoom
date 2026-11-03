<script setup>
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "./components/Icon.vue";
import { state } from "./store";
const route = useRoute(),
  router = useRouter(),
  menu = ref(false);
watch(
  () => route.fullPath,
  () => {
    menu.value = false;
    document.title =
      "FindMyRoom · " +
      ({
        "/": "Tìm phòng trọ tại Cần Thơ",
        "/ghep-tro": "Tìm bạn ở ghép",
        "/tim-tro": "Tìm phòng trọ",
        "/wireframes": "Đối chiếu wireframe",
      }[route.path] || "Không gian của bạn");
  },
);
function logout() {
  state.user = null;
  router.push("/");
}
</script>
<template>
  <a class="skip-link" href="#main">Đến nội dung chính</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="FindMyRoom, trang chủ"
        ><span class="brand-icon"
          ><img src="/logo.svg" alt="" class="brand-logo" width="32" height="32" /></span
        >FindMyRoom<span class="brand-dot">.</span></RouterLink
      >
      <nav class="desktop-nav" aria-label="Điều hướng chính">
        <RouterLink to="/tim-tro">Tìm trọ</RouterLink
        ><RouterLink to="/ghep-tro">Ghép trọ</RouterLink
        ><template v-if="state.user"
          ><RouterLink to="/quan-ly/bai-dang">Quản lý bài đăng</RouterLink
          ><RouterLink v-if="state.user.role === 'landlord'" to="/quan-ly/nha-tro"
            >Quản lý nhà trọ</RouterLink
          ></template
        >
      </nav>
      <div class="header-actions">
        <RouterLink v-if="!state.user" to="/dang-nhap" class="button primary small"
          >Đăng nhập <Icon name="arrow" :size="17" /></RouterLink
        ><RouterLink
          v-else
          to="/ho-so"
          class="avatar"
          :aria-label="'Hồ sơ ' + state.user.name"
          >{{
            state.user.name
              .split(" ")
              .map((s) => s[0])
              .slice(-2)
              .join("")
          }}</RouterLink
        ><button
          class="icon-button mobile-menu"
          @click="menu = !menu"
          :aria-expanded="menu"
          aria-label="Mở menu"
        >
          <Icon :name="menu ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
    <nav v-if="menu" class="mobile-dropdown">
      <RouterLink to="/quan-ly/bai-dang">Quản lý bài đăng</RouterLink
      ><RouterLink to="/quan-ly/nha-tro">Quản lý nhà trọ</RouterLink
      ><RouterLink to="/dang-bai/roommate">Đăng bài ghép trọ</RouterLink
      ><RouterLink to="/dang-bai/rental">Đăng bài cho thuê</RouterLink
      ><RouterLink to="/wireframes">Đối chiếu wireframe</RouterLink
      ><button v-if="state.user" @click="logout">Đăng xuất</button>
    </nav>
  </header>
  <main id="main" tabindex="-1"><RouterView /></main>
  <footer v-if="route.path != '/wireframes'" class="site-footer">
    <div class="container footer-grid">
      <div>
        <RouterLink to="/" class="brand"
          ><span class="brand-icon"
            ><img
              src="/logo.svg"
              alt=""
              class="brand-logo"
              width="32"
              height="32" /></span
          >FindMyRoom.</RouterLink
        >
        <p class="muted footer-intro">Một chỗ ở phù hợp.<br />Một khởi đầu an tâm.</p>
      </div>
      <div>
        <h4>Dịch vụ</h4>
        <RouterLink to="/tim-tro">Tìm phòng trọ</RouterLink
        ><RouterLink to="/ghep-tro">Tìm bạn ở ghép</RouterLink
        ><RouterLink to="/dang-bai/rental">Đăng bài cho thuê</RouterLink>
      </div>
      <div>
        <h4>Hỗ trợ & An toàn</h4>
        <RouterLink to="/ghep-tro?guide=1">Quy tắc ghép trọ</RouterLink
        ><RouterLink to="/tim-tro?guide=1">Cảnh báo lừa đảo</RouterLink
        ><RouterLink to="/wireframes">Đối chiếu 140 wireframe</RouterLink>
      </div>
      <div>
        <h4>Thông tin liên lạc</h4>
        <p>Đại học Cần Thơ<br />Khu II, đường 3/2, Ninh Kiều<br />Cần Thơ, Việt Nam</p>
        <p class="muted">Bản demo học phần CT113</p>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 FindMyRoom</span><span>Được làm cho những khởi đầu mới.</span
      ><button v-if="state.user" class="text-button" @click="logout">Đăng xuất</button>
    </div>
  </footer>
  <nav class="bottom-nav" aria-label="Điều hướng điện thoại">
    <RouterLink to="/"><Icon name="home" /><span>Trang chủ</span></RouterLink
    ><RouterLink to="/tim-tro"><Icon name="search" /><span>Tìm trọ</span></RouterLink
    ><RouterLink to="/ghep-tro"><Icon name="users" /><span>Ghép trọ</span></RouterLink
    ><RouterLink to="/ho-so"><Icon name="user" /><span>Hồ sơ</span></RouterLink>
  </nav>
</template>
