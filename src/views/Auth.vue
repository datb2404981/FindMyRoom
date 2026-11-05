<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { login, register, validateField, state, updateAccount } from '../store'

const route = useRoute(), router = useRouter()
const signup = computed(() => route.path === '/dang-ky')
const visible = ref(false), confirmVisible = ref(false), busy = ref(false), info = ref('')
const roleStep = ref(false)
const otpStep = ref(false)
const otpDigits = reactive(['', '', '', '', '', ''])
const otpInputs = ref([])
const otpError = ref('')
const selectedRole = ref('')
const emit = defineEmits(['role-step'])
const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  confirm: '',
  terms: false
})
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
watch(roleStep, (val) => {
  emit('role-step', val)
})

watch(() => route.path, () => {
  Object.keys(errors).forEach(key => delete errors[key])
  form.password = ''; form.confirm = ''; info.value = ''
  visible.value = false; confirmVisible.value = false
  roleStep.value = false
  otpStep.value = false
  otpError.value = ''
  for (let i = 0; i < 6; i++) otpDigits[i] = ''
})

const maskedEmail = computed(() => {
  const email = form.email.trim()
  if (!email || !email.includes('@')) return 'user*@gmail.com**'
  const [user, domain] = email.split('@')
  const visibleLen = Math.min(4, Math.floor(user.length / 2)) || 1
  return `${user.slice(0, visibleLen)}***@${domain}`
})

function handleOtpInput(index, event) {
  const val = event.target.value
  otpError.value = ''
  if (!val) {
    otpDigits[index] = ''
    return
  }
  // If user pasted or typed multiple digits
  const cleaned = val.replace(/\D/g, '')
  if (cleaned.length > 1) {
    const chars = cleaned.split('')
    for (let i = 0; i < 6; i++) {
      if (chars[i]) otpDigits[i] = chars[i]
    }
    const nextIdx = Math.min(chars.length, 5)
    otpInputs.value[nextIdx]?.focus()
    return
  }
  otpDigits[index] = cleaned.slice(-1)
  if (cleaned && index < 5) {
    otpInputs.value[index + 1]?.focus()
  }
}

function handleOtpKeydown(index, event) {
  if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
    otpInputs.value[index - 1]?.focus()
  }
}

function handleOtpPaste(event) {
  const pasteData = event.clipboardData?.getData('text') || ''
  const cleaned = pasteData.replace(/\D/g, '').slice(0, 6)
  if (cleaned) {
    event.preventDefault()
    for (let i = 0; i < 6; i++) {
      otpDigits[i] = cleaned[i] || ''
    }
    const targetIdx = Math.min(cleaned.length, 5)
    otpInputs.value[targetIdx]?.focus()
  }
}

function confirmOtp() {
  const code = otpDigits.join('').trim()
  if (!code) {
    otpError.value = 'Vui lòng nhập mã xác thực OTP.'
    return
  }
  // Cho phép nhập mã số bất kỳ như user yêu cầu
  otpStep.value = false
  roleStep.value = true
}

function closeOtp() {
  otpStep.value = false
}

async function chooseRole(role) {
  selectedRole.value = role
  busy.value = true
  try {
    if (state.user && state.user.role !== role) {
      await updateAccount({ ...state.profile, role })
    }
    const redirect = route.query.redirect
    const fallback = role === 'landlord' ? '/quan-ly/nha-tro' : '/'
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : (role === 'landlord' ? '/quan-ly/nha-tro' : '/ho-so'))
  } catch (error) {
    info.value = error.message || 'Không thể cập nhật vai trò.'
  } finally {
    busy.value = false
  }
}

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
    if (signup.value) {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: 'student', terms: form.terms })
      form.password = ''; form.confirm = ''
      otpStep.value = true
      otpError.value = ''
      for (let i = 0; i < 6; i++) otpDigits[i] = ''
      setTimeout(() => {
        otpInputs.value[0]?.focus()
      }, 50)
    } else {
      await login({ email: form.email, password: form.password })
      updateRememberedAccounts()
      form.password = ''; form.confirm = ''
      const redirect = route.query.redirect
      const fallback = state.user?.role === 'landlord' ? '/quan-ly/nha-tro' : '/'
      await router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : fallback)
    }
  } catch (error) { errors[error.field || 'submit'] = error.message }
  finally { busy.value = false }
}
</script>

<template>
  <!-- KHI ĐĂNG KÝ XONG -> CHUYỂN QUA MÀN HÌNH CHỌN ROLE TOÀN TRANG TRẮNG CĂN GIỮA CHUẨN WIREFRAME -->
  <div v-if="roleStep" class="role-standalone-page">
    <RouterLink to="/" class="brand role-standalone-brand" aria-label="FindMyRoom, trang chủ">
      <span class="brand-icon"><img src="/logo.svg" alt="" class="brand-logo" width="32" height="32"></span>FindMyRoom
    </RouterLink>

    <div class="role-standalone-card" role="radiogroup" aria-label="Bạn muốn tham gia với tư cách">
      <h1 class="role-standalone-title">Bạn muốn tham gia với tư cách</h1>
      <div class="role-standalone-options">
        <button
          type="button"
          class="role-card-box role-student"
          :class="{ selected: selectedRole === 'student' }"
          :disabled="busy"
          @click="chooseRole('student')"
          role="radio"
          :aria-checked="selectedRole === 'student'"
          aria-label="Sinh Viên"
        >
          <div class="role-card-badge">Tìm phòng & Ở ghép</div>
          <div class="role-card-icon-wrapper student-theme">
            <svg class="student-avatar-svg" viewBox="0 0 100 100" width="60" height="60" aria-hidden="true">
              <!-- Mũ tốt nghiệp (Graduation Cap) -->
              <polygon points="50,14 88,28 50,42 12,28" fill="#131414" />
              <path d="M50 42 L50 49 Q50 56 68 56 L72 56 L72 34" fill="#131414" />
              <!-- Dây tua rua mũ (Tassel) màu vàng thương hiệu -->
              <path d="M22 32 Q20 40 20 48" stroke="#f9c54d" stroke-width="2.5" fill="none" stroke-linecap="round" />
              <circle cx="20" cy="51" r="3" fill="#f9c54d" />
              <!-- Đầu & Mặt người -->
              <circle cx="50" cy="52" r="19" fill="#131414" />
              <!-- Thân áo tốt nghiệp / Áo sinh viên -->
              <path d="M24 88 C24 71 36 68 50 68 C64 68 76 71 76 88 Z" fill="#131414" />
              <!-- Cổ áo / V-neck màu xanh Cyan năng động -->
              <polygon points="50,78 40,68 60,68" fill="#8fc8cf" />
            </svg>
          </div>
          <span class="role-card-text">Sinh Viên</span>
          <span class="role-card-sub">Tìm phòng · Ghép trọ</span>
        </button>

        <span class="role-card-or">OR</span>

        <button
          type="button"
          class="role-card-box role-landlord"
          :class="{ selected: selectedRole === 'landlord' }"
          :disabled="busy"
          @click="chooseRole('landlord')"
          role="radio"
          :aria-checked="selectedRole === 'landlord'"
          aria-label="Chủ Trọ"
        >
          <div class="role-card-badge landlord-badge">Quản lý & Cho thuê</div>
          <div class="role-card-icon-wrapper landlord-theme">
            <svg class="landlord-avatar-svg" viewBox="0 0 100 100" width="60" height="60" aria-hidden="true">
              <!-- Đầu & Tóc chủ trọ -->
              <circle cx="50" cy="38" r="18" fill="#131414" />
              <!-- Thân áo vest / Blazer sang trọng lịch sự -->
              <path d="M22 86 C22 68 34 62 50 62 C66 62 78 68 78 86 Z" fill="#131414" />
              <!-- Cà vạt / Ve áo màu vàng Gold chủ trọ -->
              <polygon points="50,62 44,72 50,84 56,72" fill="#f9c54d" />
              <!-- Huy hiệu chìa khóa trao phòng / Ngôi nhà nhỏ nổi bật -->
              <circle cx="73" cy="72" r="14" fill="#f9c54d" stroke="#131414" stroke-width="2" />
              <path d="M69 72 L73 68 L77 72 V76 H69 Z" fill="#131414" />
            </svg>
          </div>
          <span class="role-card-text">Chủ Trọ</span>
          <span class="role-card-sub">Đăng tin · Quản lý trọ</span>
        </button>
      </div>
      <p v-if="busy" class="role-loading-text">Đang chuyển tiếp…</p>
    </div>
  </div>

  <!-- GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ BÌNH THƯỜNG -->
  <div v-else class="auth-page" :class="{ 'auth-signup': signup }">
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

    <!-- POPUP NHẬP MÃ XÁC THỰC OTP -->
    <div v-if="otpStep" class="otp-modal-backdrop" @click.self="closeOtp">
      <div class="otp-modal-card" role="dialog" aria-modal="true" aria-labelledby="otp-title">
        <button type="button" class="otp-modal-close" @click="closeOtp" aria-label="Đóng popup">
          <Icon name="close" :size="20" />
        </button>

        <h2 id="otp-title" class="otp-title">Nhập mã xác thực</h2>
        <p class="otp-description">
          Chúng tôi đã gửi mã xác thực đến <strong>{{ maskedEmail }}</strong>. Hãy kiểm tra hộp thư của bạn.
        </p>

        <form @submit.prevent="confirmOtp" class="otp-form">
          <div class="otp-inputs-grid" @paste="handleOtpPaste">
            <input
              v-for="(_, index) in 6"
              :key="index"
              :ref="el => (otpInputs[index] = el)"
              v-model="otpDigits[index]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              autocomplete="one-time-code"
              class="otp-digit-input"
              :aria-label="'Số thứ ' + (index + 1)"
              @input="handleOtpInput(index, $event)"
              @keydown="handleOtpKeydown(index, $event)"
            />
          </div>

          <p v-if="otpError" class="otp-error-message" role="alert">{{ otpError }}</p>

          <button type="submit" class="button primary otp-submit-button">
            Xác nhận
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Giao diện trang chọn role toàn màn hình căn giữa chuẩn Wireframe MK-44 & DESIGN.md */
.role-standalone-page {
  min-height: 100svh;
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream, #faf7f0);
  padding: 60px 24px 40px;
  box-sizing: border-box;
}

.role-standalone-brand {
  position: absolute;
  top: 28px;
  left: clamp(20px, 4vw, 48px);
  z-index: 10;
  text-decoration: none;
}

.role-standalone-card {
  width: 100%;
  max-width: 640px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1.5px solid var(--ink, #131414);
  border-radius: 16px;
  padding: 52px 48px 56px;
  box-sizing: border-box;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(19, 20, 20, 0.05), 0 2px 4px -2px rgba(19, 20, 20, 0.05);
}

.role-standalone-title {
  font-family: 'PP Pangram Sans', 'IBM Plex Sans', sans-serif;
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 700;
  color: var(--ink, #131414);
  line-height: 1.25;
  margin: 0 0 44px;
  letter-spacing: -0.02em;
}

.role-standalone-options {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.role-card-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 195px;
  min-height: 205px;
  padding: 24px 16px 20px;
  background: #ffffff;
  border: 1.5px solid var(--ink, #131414);
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 4px 4px 0px 0px rgba(19, 20, 20, 0.85);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              background-color 0.2s ease,
              border-color 0.2s ease;
  color: var(--ink, #131414);
  box-sizing: border-box;
  position: relative;
}

.role-card-badge {
  position: absolute;
  top: -11px;
  background: var(--cyan, #8fc8cf);
  color: var(--ink, #131414);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--ink, #131414);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.landlord-badge {
  background: var(--gold, #f9c54d);
}

.role-card-icon-wrapper {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 1.5px solid var(--ink, #131414);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease;
}

.student-theme {
  background: #e6f4f6;
}

.landlord-theme {
  background: #fdf5df;
}

.role-card-box:hover {
  transform: translateY(-5px) scale(1.02);
  border-color: var(--ink, #131414);
}

.role-card-box.role-student:hover {
  box-shadow: 6px 6px 0px 0px #38a5b2;
  background: #f5fbfc;
}

.role-card-box.role-student:hover .role-card-icon-wrapper {
  transform: scale(1.08) rotate(-3deg);
  background: #d4eef2;
}

.role-card-box.role-landlord:hover {
  box-shadow: 6px 6px 0px 0px var(--gold, #f9c54d);
  background: #fffdf5;
}

.role-card-box.role-landlord:hover .role-card-icon-wrapper {
  transform: scale(1.08) rotate(3deg);
  background: #faebc3;
}

.role-card-box:active {
  transform: translateY(2px) scale(0.98);
  box-shadow: 2px 2px 0px 0px var(--ink, #131414);
}

.role-card-box.selected {
  border-width: 2.5px;
  box-shadow: 5px 5px 0px 0px var(--gold, #f9c54d);
}

.role-card-text {
  font-family: 'PP Pangram Sans', 'IBM Plex Sans', sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink, #131414);
  letter-spacing: -0.01em;
}

.role-card-sub {
  font-size: 12px;
  color: var(--muted, #647076);
  margin-top: 4px;
}

.role-card-or {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--muted, #647076);
  user-select: none;
  letter-spacing: 0.05em;
  background: var(--cream, #faf7f0);
  border: 1px solid var(--line, rgba(19, 20, 20, 0.15));
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.role-loading-text {
  margin-top: 28px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted, #647076);
}

@media (max-width: 600px) {
  .role-standalone-page {
    padding: 24px 16px;
    min-height: calc(100svh - 68px);
  }
  .role-standalone-card {
    padding: 36px 20px 40px;
    border-radius: 14px;
  }
  .role-standalone-title {
    margin-bottom: 32px;
  }
  .role-standalone-options {
    gap: 16px;
  }
  .role-card-box {
    width: 136px;
    height: 142px;
    padding: 16px 10px;
    box-shadow: 3px 3px 0px 0px rgba(19, 20, 20, 0.85);
  }
  .role-card-box:hover {
    transform: translateY(-2px);
    box-shadow: 4px 4px 0px 0px var(--gold, #f9c54d);
  }
  .role-card-icon :deep(svg) {
    width: 42px;
    height: 42px;
  }
  .role-card-text {
    font-size: 15px;
  }
  .role-card-or {
    font-size: 14px;
  }
}

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

/* POPUP OTP MODAL */
.otp-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(19, 20, 20, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

.otp-modal-card {
  position: relative;
  background: #ffffff;
  border: 1.5px solid var(--ink, #131414);
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(19, 20, 20, 0.16);
  width: 100%;
  max-width: 480px;
  padding: 36px 32px 32px;
  box-sizing: border-box;
  text-align: center;
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.otp-modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--ink, #131414);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background-color 0.15s, transform 0.15s;
}

.otp-modal-close:hover {
  background: rgba(19, 20, 20, 0.06);
  transform: scale(1.08);
}

.otp-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--ink, #131414);
  margin: 0 0 12px;
}

.otp-description {
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted, #647076);
  margin: 0 0 24px;
}

.otp-description strong {
  color: var(--ink, #131414);
}

.otp-form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.otp-inputs-grid {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
  width: 100%;
}

.otp-digit-input {
  width: 44px;
  height: 58px;
  background: #edf1f2;
  border: 1.5px solid transparent;
  border-radius: 8px;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  color: var(--ink, #131414);
  transition: all 0.2s ease;
  box-sizing: border-box;
  outline: none;
}

.otp-digit-input:focus {
  background: #ffffff;
  border-color: var(--ink, #131414);
  box-shadow: 0 0 0 3px rgba(143, 200, 207, 0.35);
  transform: translateY(-2px);
}

.otp-error-message {
  color: #c92a2a;
  font-size: 13px;
  margin: -10px 0 16px;
  font-weight: 500;
}

.otp-submit-button {
  background: #212c33 !important;
  color: #ffffff !important;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid #212c33 !important;
  border-radius: 8px;
  padding: 10px 42px;
  cursor: pointer;
  min-width: 140px;
  box-shadow: none;
  transition: background-color 0.2s, transform 0.15s;
}

.otp-submit-button:hover {
  background: #131414 !important;
  color: #ffffff !important;
  transform: translateY(-1px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 480px) {
  .otp-modal-card {
    padding: 28px 20px 24px;
  }
  .otp-inputs-grid {
    gap: 8px;
  }
  .otp-digit-input {
    width: 38px;
    height: 50px;
    font-size: 18px;
  }
}
</style>
