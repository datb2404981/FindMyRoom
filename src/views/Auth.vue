<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { login, register, validateField } from '../store'

const route = useRoute(), router = useRouter()
const signup = computed(() => route.path === '/dang-ky')
const role = ref('student'), visible = ref(false), busy = ref(false), info = ref('')
const form = reactive({ name: '', email: '', phone: '', password: '', confirm: '', terms: false })
const errors = reactive({})
watch(() => route.path, () => {
  Object.keys(errors).forEach(key => delete errors[key])
  form.password = ''; form.confirm = ''; info.value = ''
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
    if (signup.value) await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: role.value, terms: form.terms })
    else await login({ email: form.email, password: form.password })
    form.password = ''; form.confirm = ''
    const redirect = route.query.redirect
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/ho-so')
  } catch (error) { errors[error.field || 'submit'] = error.message }
  finally { busy.value = false }
}
</script>

<template>
  <div class="container auth-page">
    <div class="auth-illustration">
      <span class="eyebrow">FindMyRoom · Cần Thơ</span>
      <h1>Một chỗ ở mới.<br>Một khởi đầu mới.</h1>
      <img src="/illustrations/friends.svg" alt="Những người bạn cùng xây dựng không gian sống">
      <p>Tìm trọ dễ hơn.<br>Tìm bạn ở cùng hợp hơn.</p>
    </div>
    <section class="auth-card">
      <span class="eyebrow">Chào bạn,</span>
      <h2>{{ signup ? 'Tạo tài khoản mới' : 'Chào mừng bạn trở lại' }}</h2>
      <p class="muted">{{ signup ? 'Bắt đầu hành trình tìm chỗ ở của bạn.' : 'Đăng nhập để tiếp tục hành trình tìm trọ.' }}</p>
      <div v-if="signup" class="segmented" aria-label="Vai trò tài khoản">
        <button type="button" :disabled="busy" @click="role = 'student'" :class="{ active: role === 'student' }" :aria-pressed="role === 'student'">Sinh viên</button>
        <button type="button" :disabled="busy" @click="role = 'landlord'" :class="{ active: role === 'landlord' }" :aria-pressed="role === 'landlord'">Chủ trọ</button>
      </div>
      <form @submit.prevent="submit" novalidate :aria-busy="busy">
        <fieldset :disabled="busy" class="auth-fields">
          <label v-if="signup" class="field">
            <span>Họ và tên *</span>
            <input v-model.trim="form.name" aria-label="Họ và tên *" autocomplete="name" maxlength="100" placeholder="Nhập họ và tên" :aria-invalid="!!errors.name">
            <small v-if="errors.name" class="error">{{ errors.name }}</small>
          </label>
          <label class="field">
            <span>Email *</span>
            <input v-model.trim="form.email" aria-label="Email *" type="email" autocomplete="email" maxlength="254" placeholder="ban@student.ctu.edu.vn" :aria-invalid="!!errors.email">
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
              <button type="button" class="icon-button" @click="visible = !visible" :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"><Icon name="eye" :size="18" /></button>
            </div>
            <small v-if="errors.password" class="error">{{ errors.password }}</small>
          </label>
          <label v-if="signup" class="field">
            <span>Xác nhận mật khẩu *</span>
            <input v-model="form.confirm" aria-label="Xác nhận mật khẩu *" type="password" autocomplete="new-password" maxlength="128" placeholder="Nhập lại mật khẩu" :aria-invalid="!!errors.confirm">
            <small v-if="errors.confirm" class="error">{{ errors.confirm }}</small>
          </label>
          <label v-if="signup" class="check"><input type="checkbox" v-model="form.terms">Tôi đồng ý với điều khoản dịch vụ và chính sách bảo mật.</label>
          <div v-else class="auth-options">
            <span class="muted">Giữ đăng nhập trong 8 giờ</span>
            <button type="button" class="text-button" @click="info = 'Chưa hỗ trợ đặt lại mật khẩu. Hãy liên hệ người quản lý website.'">Quên mật khẩu?</button>
          </div>
          <small v-if="errors.terms" class="error">{{ errors.terms }}</small>
          <p v-if="errors.submit || errors.role" class="error" role="alert">{{ errors.submit || errors.role }}</p>
          <button class="button primary full" type="submit">{{ busy ? 'Đang xử lý…' : signup ? 'Đăng ký' : 'Đăng nhập' }} <Icon name="arrow" :size="18" /></button>
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
