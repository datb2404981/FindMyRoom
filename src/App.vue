<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "./components/Icon.vue";
import FooterInfoModal from "./components/FooterInfoModal.vue";
import { state, canManagePosts, logout as endSession } from "./store";
const route = useRoute(),
  router = useRouter(),
  menu = ref(false),
  accountOpen = ref(false),
  accountRoot = ref(null),
  accountTrigger = ref(null),
  logoutError = ref(""),
  loggingOut = ref(false),
  footerTopic = ref(""),
  isAuthRoleStep = ref(false);
function closeAccount(event) {
  if (!accountRoot.value?.contains(event.target)) accountOpen.value = false;
}
function dismissAccount() {
  accountOpen.value = false;
  accountTrigger.value?.focus();
}
onMounted(() => document.addEventListener("click", closeAccount));
onUnmounted(() => document.removeEventListener("click", closeAccount));
watch(
  () => route.fullPath,
  () => {
    menu.value = false;
    accountOpen.value = false;
    footerTopic.value = "";
    isAuthRoleStep.value = false;
    document.title =
      "FindMyRoom · " +
      ({
        "/": "Tìm phòng trọ tại Cần Thơ",
        "/ghep-tro": "Tìm bạn ở ghép",
        "/tim-tro": "Tìm phòng trọ",
        "/huong-dan": "Hướng dẫn sử dụng",
        "/wireframes": "Đối chiếu wireframe",
      }[route.path] || "Không gian của bạn");
  },
);
async function logout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  logoutError.value = "";
  try {
    await endSession();
    menu.value = false;
    accountOpen.value = false;
    if (!["/dang-nhap", "/dang-ky"].includes(router.currentRoute.value.path)) {
      await router.replace("/");
    }
  } catch (error) {
    logoutError.value = error.message;
  } finally {
    loggingOut.value = false;
  }
}
</script>
<template>
  <a class="skip-link" href="#main">Đến nội dung chính</a>
  <header v-if="!['/dang-nhap', '/dang-ky'].includes(route.path)" class="site-header">
    <div class="header-inner">
      <RouterLink
        :to="state.user?.role === 'landlord' ? '/quan-ly/bai-dang' : '/'"
        class="brand"
        aria-label="FindMyRoom, trang chủ"
        ><span class="brand-icon"
          ><img src="/logo.svg" alt="" class="brand-logo" width="32" height="32" /></span
        >FindMyRoom</RouterLink
      >
      <nav class="desktop-nav" aria-label="Điều hướng chính">
        <RouterLink v-if="state.user?.role !== 'landlord'" to="/ghep-tro"
          >Ghép trọ</RouterLink
        ><template v-if="state.user"
          ><RouterLink v-if="canManagePosts" to="/quan-ly/bai-dang"
            >Quản lý bài đăng</RouterLink
          ><RouterLink v-if="state.user.role === 'landlord'" to="/quan-ly/nha-tro"
            >Quản lý nhà trọ</RouterLink
          ></template
        >
      </nav>
      <div class="header-actions">
        <template v-if="!state.user">
          <RouterLink to="/dang-ky" class="text-button header-signup">Đăng ký</RouterLink>
          <RouterLink to="/dang-nhap" class="button primary small header-login"
            >Đăng nhập <Icon name="arrow" :size="17"
          /></RouterLink>
        </template>
        <div
          v-else
          ref="accountRoot"
          class="account-menu"
          @keydown.esc.stop="dismissAccount"
          @focusout="
            !$event.currentTarget.contains($event.relatedTarget) && (accountOpen = false)
          "
        >
          <button
            ref="accountTrigger"
            type="button"
            class="account-trigger"
            :aria-label="'Tài khoản ' + state.user.name"
            :aria-expanded="accountOpen"
            aria-controls="account-navigation"
            @click="
              accountOpen = !accountOpen;
              menu = false;
            "
          >
            <span class="avatar" aria-hidden="true">{{
              state.user.name
                .trim()
                .split(/\s+/)
                .map((s) => s[0])
                .slice(-2)
                .join("")
            }}</span>
            <span class="account-summary"
              ><strong>{{ state.user.name }}</strong
              ><small>{{
                state.user.role === "landlord" ? "Chủ trọ" : "Sinh viên"
              }}</small></span
            >
            <Icon name="down" :size="16" />
          </button>
          <nav
            v-if="accountOpen"
            id="account-navigation"
            class="account-dropdown"
            aria-label="Tài khoản"
          >
            <div class="account-identity">
              <strong>{{ state.user.name }}</strong
              ><span>{{ state.user.email }}</span
              ><small>{{
                state.user.role === "landlord" ? "Chủ trọ" : "Sinh viên"
              }}</small>
            </div>
            <RouterLink to="/ho-so"
              ><Icon name="user" :size="18" />Hồ sơ của tôi</RouterLink
            >
            <RouterLink v-if="canManagePosts" to="/quan-ly/bai-dang"
              ><Icon name="grid" :size="18" />Quản lý bài đăng</RouterLink
            >
            <RouterLink v-if="state.user.role === 'landlord'" to="/quan-ly/nha-tro"
              ><Icon name="building" :size="18" />Quản lý nhà trọ</RouterLink
            >
            <RouterLink
              :to="
                '/dang-bai/' + (state.user.role === 'landlord' ? 'rental' : 'roommate')
              "
              ><Icon name="plus" :size="18" />{{
                state.user.role === "landlord" ? "Đăng bài cho thuê" : "Đăng bài ghép trọ"
              }}</RouterLink
            >
            <button
              type="button"
              class="account-logout"
              :disabled="loggingOut"
              @click="logout"
            >
              <Icon name="logout" :size="18" />Đăng xuất
            </button>
          </nav>
        </div>
        <button
          class="icon-button mobile-menu"
          @click="
            menu = !menu;
            accountOpen = false;
          "
          :aria-expanded="menu"
          aria-controls="mobile-navigation"
          aria-label="Mở menu"
        >
          <Icon :name="menu ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
    <nav
      v-if="menu"
      id="mobile-navigation"
      class="mobile-dropdown"
      aria-label="Điều hướng menu điện thoại"
      @keydown.esc="menu = false"
    >
      <RouterLink v-if="state.user?.role !== 'landlord'" to="/">Trang chủ</RouterLink>
      <RouterLink v-if="state.user?.role !== 'landlord'" to="/ghep-tro"
        >Ghép trọ</RouterLink
      >
      <template v-if="state.user">
        <RouterLink to="/ho-so">Hồ sơ của tôi</RouterLink>
        <RouterLink v-if="canManagePosts" to="/quan-ly/bai-dang"
          >Quản lý bài đăng</RouterLink
        >
        <RouterLink v-if="state.user.role === 'landlord'" to="/quan-ly/nha-tro"
          >Quản lý nhà trọ</RouterLink
        >
        <RouterLink
          :to="'/dang-bai/' + (state.user.role === 'landlord' ? 'rental' : 'roommate')"
          >{{
            state.user.role === "landlord" ? "Đăng bài cho thuê" : "Đăng bài ghép trọ"
          }}</RouterLink
        >
        <button type="button" :disabled="loggingOut" @click="logout">Đăng xuất</button>
      </template>
      <template v-else>
        <RouterLink to="/dang-nhap">Đăng nhập</RouterLink>
        <RouterLink to="/dang-ky">Đăng ký</RouterLink>
      </template>
      <RouterLink to="/wireframes">Đối chiếu wireframe</RouterLink>
    </nav>
  </header>
  <p v-if="logoutError" class="container notice" role="alert">{{ logoutError }}</p>
  <main id="main" tabindex="-1"><RouterView @role-step="isAuthRoleStep = $event" /></main>
  <footer
    v-if="
      !['/wireframes', '/dang-nhap', '/dang-ky'].includes(route.path) && !isAuthRoleStep
    "
    class="site-footer"
  >
    <div class="container footer-grid">
      <div>
        <RouterLink
          :to="state.user?.role === 'landlord' ? '/quan-ly/bai-dang' : '/'"
          class="brand"
          ><span class="brand-icon"
            ><img
              src="/logo.svg"
              alt=""
              class="brand-logo"
              width="32"
              height="32" /></span
          >FindMyRoom</RouterLink
        >
        <p class="muted footer-intro">Một chỗ ở phù hợp.<br />Một khởi đầu an tâm.</p>
      </div>
      <div>
        <h4>Dịch vụ</h4>
        <template v-if="state.user?.role !== 'landlord'">
          <RouterLink to="/tim-tro">Tìm phòng trọ</RouterLink>
          <RouterLink to="/ghep-tro">Tìm bạn ở ghép</RouterLink>
        </template>
        <RouterLink
          v-if="state.user && state.user.role === 'student'"
          to="/dang-bai/roommate"
          >Đăng bài ghép trọ</RouterLink
        ><RouterLink v-else to="/dang-bai/rental">Đăng bài cho thuê</RouterLink>
      </div>
      <div>
        <h4>Hỗ trợ & An toàn</h4>
        <button
          v-if="state.user?.role !== 'landlord'"
          type="button"
          class="footer-help-button"
          @click="footerTopic = 'roommate'"
        >
          Quy tắc ghép trọ
        </button>
        <button type="button" class="footer-help-button" @click="footerTopic = 'safety'">
          Cảnh báo lừa đảo
        </button>
        <RouterLink to="/huong-dan">Hướng dẫn sử dụng</RouterLink>
      </div>
      <div>
        <h4>Thông tin liên lạc</h4>
        <p>Đại học Cần Thơ<br />Khu II, đường 3/2, Ninh Kiều<br />Cần Thơ, Việt Nam</p>
        <p class="muted">Bản demo học phần CT113</p>
      </div>
    </div>
  </footer>
  <nav
    v-if="!['/dang-nhap', '/dang-ky'].includes(route.path)"
    class="bottom-nav unified-home-nav"
    aria-label="Điều hướng điện thoại"
  >
    <RouterLink :to="state.user?.role === 'landlord' ? '/quan-ly/bai-dang' : '/'"
      ><Icon :name="state.user?.role === 'landlord' ? 'grid' : 'home'" /><span>{{
        state.user?.role === "landlord" ? "Bài đăng" : "Trang chủ"
      }}</span></RouterLink
    ><RouterLink v-if="state.user?.role === 'landlord'" to="/quan-ly/nha-tro"
      ><Icon name="building" /><span>Nhà trọ</span></RouterLink
    ><RouterLink v-if="state.user?.role !== 'landlord'" to="/ghep-tro"
      ><Icon name="users" /><span>Ghép trọ</span></RouterLink
    ><RouterLink :to="state.user ? '/ho-so' : '/dang-nhap'"
      ><Icon name="user" /><span>{{
        state.user ? "Hồ sơ" : "Đăng nhập"
      }}</span></RouterLink
    >
  </nav>
  <FooterInfoModal v-if="footerTopic" :kind="footerTopic" @close="footerTopic = ''" />
</template>
