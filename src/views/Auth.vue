<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { login, register, validateField, state } from '../store'

const route = useRoute(), router = useRouter()
const signup = computed(() => route.path === '/dang-ky')
const visible = ref(false), confirmVisible = ref(false), busy = ref(false), info = ref('')
const form = reactive({ name: '', email: '', phone: '', password: '', confirm: '', terms: false })
const errors = reactive({})
const rememberedAccountsKey = 'findmyroom:remembered-emails'
const remember = ref(false)
const rememberedAccounts = ref(readRememberedAccounts())
function readRememberedAccounts() {
  try {
    const emails = JSON.parse(localStorage.getItem(rememberedAccountsKey) || '[]')
    return Array.isArray(emails) ? [...new Set(emails.filter(email => typeof email === 'string' && !validateField('email', email)))] : []
  } catch { return [] }
}
watch(() => form.email, email => {
  if (!signup.value) remember.value = rememberedAccounts.value.includes(email.trim().toLowerCase())
})
function updateRememberedAccounts() {
  const email = form.email.trim().toLowerCase()
  const emails = readRememberedAccounts().filter(saved => saved !== email)
  if (remember.value) emails.unshift(email)
  try {
    localStorage.setItem(rememberedAccountsKey, JSON.stringify(emails))
    rememberedAccounts.value = emails
  } catch { /* Remembering an email must not prevent a successful login. */ }
}
watch(() => route.path, () => {
  Object.keys(errors).forEach(key => delete errors[key])
  form.password = ''; form.confirm = ''; info.value = ''
  visible.value = false; confirmVisible.value = false
})
async function submit() {
  if (busy.value) return
  Object.keys(errors).forEach(key => delete errors[key])
  for (const key of signup.value ? ['name', 'email', 'phone'] : ['email']) {
    const error = validateField(key, form[key])
    if (error) errors[key] = error
  }
  if (form.password.length < 8 || form.password.length > 128) errors.password = 'Mật khẩu cần từ 8 đến 128 ký tự.'
  if (signup.value && form.password !== form.confirm) errors.confirm = 'Mật khẩu xác nhận chưa khớp.'
  if (signup.value && !form.terms) errors.terms = 'Bạn cần đồng ý điều khoản để tiếp tục.'
  if (Object.keys(errors).length) return
  busy.value = true
  try {
    if (signup.value) await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: 'student', terms: form.terms })
    else {
      await login({ email: form.email, password: form.password })
      updateRememberedAccounts()
    }
    form.password = ''; form.confirm = ''
    const redirect = route.query.redirect
    const fallback = state.user?.role === 'landlord' ? '/quan-ly/nha-tro' : '/'
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : (signup.value ? '/ho-so' : fallback))
  } catch (error) { errors[error.field || 'submit'] = error.message }
  finally { busy.value = false }
}
</script>

<template>
  <div class="auth-page" :class="{ 'auth-signup': signup }">
    <div class="auth-illustration">
      <img src="/illustrations/friends.svg" alt="Những người bạn cùng xây dựng không gian sống">
      <div class="auth-intro">
        <span class="eyebrow">FindMyRoom · Cần Thơ</span>
        <h2>Một chỗ ở mới.<br>Một khởi đầu mới.</h2>
        <p>Tìm trọ dễ hơn. Tìm bạn ở cùng hợp hơn.</p>
      </div>
    </div>
    <section class="auth-card">
      <RouterLink to="/" class="brand auth-brand" aria-label="FindMyRoom, trang chủ">
        <span class="brand-icon"><img src="/logo.svg" alt="" class="brand-logo" width="32" height="32"></span>FindMyRoom
      </RouterLink>
      <h1>{{ signup ? 'Tạo tài khoản mới' : 'Chào mừng trở lại' }}</h1>
      <form @submit.prevent="submit" novalidate :aria-busy="busy">
        <fieldset :disabled="busy" class="auth-fields">
          <label v-if="signup" class="field auth-wide">
            <span>Họ và tên *</span>
            <input v-model.trim="form.name" aria-label="Họ và tên *" autocomplete="name" maxlength="100" placeholder="Nhập họ và tên" :aria-invalid="!!errors.name">
            <small v-if="errors.name" class="error">{{ errors.name }}</small>
          </label>
          <label class="field">
            <span>Email *</span>
            <input v-model.trim="form.email" aria-label="Email *" type="email" autocomplete="email" :list="signup ? undefined : 'remembered-emails'" maxlength="254" placeholder="ban@student.ctu.edu.vn" :aria-invalid="!!errors.email">
            <datalist v-if="!signup" id="remembered-emails">
              <option v-for="email in rememberedAccounts" :key="email" :value="email" />
            </datalist>
            <small v-if="errors.email" class="error">{{ errors.email }}</small>
          </label>
          <label v-if="signup" class="field">
            <span>Số điện thoại *</span>
            <input v-model.trim="form.phone" aria-label="Số điện thoại *" type="tel" autocomplete="tel" placeholder="09xx xxx xxx" :aria-invalid="!!errors.phone">
            <small v-if="errors.phone" class="error">{{ errors.phone }}</small>
          </label>
          <label class="field">
            <span>Mật khẩu *</span>
            <div class="password-input">
              <input v-model="form.password" aria-label="Mật khẩu *" :type="visible ? 'text' : 'password'" :autocomplete="signup ? 'new-password' : 'current-password'" maxlength="128" placeholder="Ít nhất 8 ký tự" :aria-invalid="!!errors.password">
              <button type="button" class="icon-button" @click="visible = !visible" :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"><Icon :name="visible ? 'eye-off' : 'eye'" :size="18" /></button>
            </div>
            <small v-if="errors.password" class="error">{{ errors.password }}</small>
          </label>
          <label v-if="signup" class="field">
            <span>Xác nhận mật khẩu *</span>
            <div class="password-input">
              <input v-model="form.confirm" aria-label="Xác nhận mật khẩu *" :type="confirmVisible ? 'text' : 'password'" autocomplete="new-password" maxlength="128" placeholder="Nhập lại mật khẩu" :aria-invalid="!!errors.confirm">
              <button type="button" class="icon-button" @click="confirmVisible = !confirmVisible" :aria-label="confirmVisible ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'" :aria-pressed="confirmVisible"><Icon :name="confirmVisible ? 'eye-off' : 'eye'" :size="18" /></button>
            </div>
            <small v-if="errors.confirm" class="error">{{ errors.confirm }}</small>
          </label>
          <label v-if="signup" class="check auth-wide"><input type="checkbox" v-model="form.terms">Tôi đồng ý với điều khoản dịch vụ và chính sách bảo mật.</label>
          <div v-else class="auth-options">
            <label class="check remember-account"><input type="checkbox" v-model="remember">Ghi nhớ tôi</label>
            <button type="button" class="text-button" @click="info = 'Chưa hỗ trợ đặt lại mật khẩu. Hãy liên hệ người quản lý website.'">Quên mật khẩu?</button>
          </div>
          <small v-if="errors.terms" class="error auth-wide">{{ errors.terms }}</small>
          <p v-if="errors.submit || errors.role" class="error auth-wide" role="alert">{{ errors.submit || errors.role }}</p>
          <button class="button primary full auth-wide" type="submit">{{ busy ? 'Đang xử lý…' : signup ? 'Đăng ký' : 'Đăng nhập' }} <Icon name="arrow" :size="18" /></button>
        </fieldset>
      </form>
      <div class="divider"><span>Hoặc</span></div>
      <div class="social-buttons">
        <button class="button secondary" @click="info = 'Google OAuth chưa được kết nối. Hãy dùng email và mật khẩu phía trên.'"><strong>G</strong> Google</button>
        <button class="button secondary" @click="info = 'Facebook OAuth chưa được kết nối. Hãy dùng email và mật khẩu phía trên.'"><strong>f</strong> Facebook</button>
      </div>
      <p class="center auth-switch">{{ signup ? 'Đã có tài khoản?' : 'Chưa có tài khoản?' }} <RouterLink :to="{ path: signup ? '/dang-nhap' : '/dang-ky', query: route.query }">{{ signup ? 'Đăng nhập ngay' : 'Đăng ký ngay' }}</RouterLink></p>
      <p v-if="info" class="notice" role="status">{{ info }}</p>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  padding: 0;
  background: #fff;
  min-height: max(780px, 100dvh);
}
.auth-illustration {
  display: block;
  position: relative;
  min-height: 600px;
  padding: 0;
  overflow: hidden;
  background: var(--cream);
  border-right: 1px solid var(--line);
}
.auth-illustration > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  margin: 0;
  border-radius: 0;
}
:global(#main:has(.auth-page) + .site-footer) { margin-top: 0; }
.auth-intro {
  position: absolute;
  inset: auto 0 0;
  padding: 72px clamp(28px, 4vw, 64px) 80px;
  background: linear-gradient(transparent, var(--cream) 45%);
}
.auth-intro h2 { font-size: clamp(26px, 2.8vw, 40px); line-height: 1.2; margin: 12px 0; }
.auth-intro p { color: var(--muted); margin-bottom: 0; }
.auth-card {
  align-self: start;
  justify-self: center;
  width: 100%;
  max-width: 620px;
  padding: 40px clamp(24px, 4vw, 64px);
  border: 0;
  border-radius: 0;
}
.auth-brand { display: inline-flex; margin-bottom: 20px; }
.auth-card h1 { font-size: clamp(26px, 2.5vw, 32px); line-height: 1.25; margin: 0 0 28px; }
.auth-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; min-width: 0; }
.auth-signup .auth-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; }
.auth-wide { grid-column: 1 / -1; }
.auth-card .field { min-width: 0; margin: 0; }
.auth-card input:not([type="checkbox"]) { min-width: 0; width: 100%; }
.auth-options { margin: 0; font-size: 12px; }
.auth-options .remember-account { margin: 0; align-items: center; }
.auth-card .check { font-size: 12px; align-items: flex-start; }
.auth-card .check input { flex-shrink: 0; }
.auth-switch { margin: 18px 0 0; }
.auth-card button[type="submit"],
.auth-card .social-buttons .button {
  height: 48px;
  min-height: 48px;
  padding-block: 0;
  box-sizing: border-box;
}
.auth-switch a { font-weight: 600; text-decoration: underline; }
.password-input .icon-button { width: 44px; height: 44px; right: 2px; }
@media (max-width: 767px) {
  .auth-page { grid-template-columns: minmax(0, 1fr); }
  .auth-illustration { display: none; }
  .auth-card { padding: 32px 24px 40px; }
}
@media (max-width: 480px) {
  .auth-page { min-height: max(940px, 100dvh); }
  .auth-signup .auth-fields { grid-template-columns: minmax(0, 1fr); }
}
.auth-card input::-ms-reveal {
  display: none;
}
.auth-card input[type="email"]::-webkit-calendar-picker-indicator {
  display: none !important;
}
</style>
