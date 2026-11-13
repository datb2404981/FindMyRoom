<script setup>
import { computed, reactive, ref, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import RentalPostEditor from '../components/RentalPostEditor.vue'
import AppDropdown from '../components/AppDropdown.vue'
import { canThoUrbanWards } from '../data/can-tho-wards'
import { rooms, money } from '../data'
import { state, validateField, updateManagedPost } from '../store'
import { saveHouse, deleteHouse } from '../houses'
import { deleteRental, rentalDirectory } from '../rentals'
import { deleteRoommate, roommateDirectory } from '../roommates'

const route = useRoute(),
  router = useRouter(),
  houses = computed(() => route.params.kind === 'nha-tro'),
  modal = ref(''),
  deleting = ref(null),
  editingId = ref(null),
  notice = ref(''),
  errors = reactive({}),
  more = ref(false),
  housesMore = ref(false)

let noticeTimer
function showNotice(message) {
  clearTimeout(noticeTimer)
  notice.value = message
  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 5000)
}
onUnmounted(() => clearTimeout(noticeTimer))

const editingPost = ref(null),
  postEditError = ref(''),
  postSaving = ref(false)

function editRental(post) {
  postEditError.value = ''
  editingPost.value = post
}

async function saveRental(post) {
  if (postSaving.value) return
  postSaving.value = true
  try {
    postEditError.value = ''
    await updateManagedPost(post)
    editingPost.value = null
    showNotice('Đã lưu thay đổi bài đăng.')
  } catch (error) {
    postEditError.value = error.message
  } finally { postSaving.value = false }
}

const list = computed(() => {
  if (!state.user) return []
  const expectedKind = state.user.role === 'student' ? 'roommate' : 'rental'
  return state.posts.filter(post => post.kind === expectedKind && post.ownerId === state.user.id)
})

/* House Form State (Wireframe HH-21, HH-37, HH-38, HH-39, HH-34, HH-36) */
const houseCity = 'Cần Thơ'
const form = reactive({
  name: '',
  address: '',
  rooms: 1,
  status: 'Đang hoạt động',
  desc: '',
  rules: '',
  ward: '',
  street: '',
  nearby: 'Đại học Cần Thơ',
  latitude: null,
  longitude: null,
  images: [],
})

const houseStep = ref(1)
const houseSaving = ref(false), houseSaveError = ref('')
const houseTabs = [
  { step: 1, label: 'Thông tin chung', icon: 'info' },
  { step: 2, label: 'Vị trí & Địa lý', icon: 'pin' },
  { step: 3, label: 'Hình ảnh', icon: 'images' },
]
let housePreviousOverflow
watch(modal, (value, previous) => {
  if (value === 'house' && previous !== 'house') {
    housePreviousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else if (previous === 'house') document.body.style.overflow = housePreviousOverflow
})
onUnmounted(() => {
  if (modal.value === 'house') document.body.style.overflow = housePreviousOverflow
})
const locating = ref(false)
const locationNotice = ref('')
const locationState = ref('')
let locationRequest = 0
const uploadError = ref('')
const fileInput = ref(null)
const nearbyOptions = ['Đại học Cần Thơ', 'Đại học Y Dược Cần Thơ', 'Đại học FPT Cần Thơ', 'Đại học Kỹ thuật - Công nghệ Cần Thơ', 'Đại học Nam Cần Thơ', 'Bến Ninh Kiều', 'Chợ nổi Cái Răng']
const wardOptions = computed(() => [
  { value: '', label: 'Chọn phường / xã' },
  ...canThoUrbanWards.map(ward => ({ value: ward, label: `Phường ${ward}` })),
  ...(form.ward && !canThoUrbanWards.includes(form.ward)
    ? [{ value: form.ward, label: `${form.ward} (địa chỉ cũ)` }]
    : []),
])
const nearbyChoices = computed(() => [...new Set([...nearbyOptions, form.nearby].filter(Boolean))])

function open(h) {
  houseSaveError.value = ''
  houseStep.value = 1
  locationRequest++
  locating.value = false
  locationNotice.value = ''
  uploadError.value = ''
  editingId.value = h?.id || null

  const address = h?.address || ''
  const parts = address.split(',').map(s => s.trim())
  const street = h?.street || parts[0] || ''
  const ward = h?.ward || (parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[0] : ''))

  const initialImages = Array.isArray(h?.images) && h.images.length
    ? [...h.images]
    : (h?.image ? [h.image] : [])

  Object.assign(form, {
    name: h?.name || '',
    address: address,
    rooms: h?.rooms || 1,
    status: h?.status || 'Đang hoạt động',
    desc: h?.desc || '',
    rules: h?.rules || '',
    ward: ward || '',
    street: street || address,
    nearby: h?.nearby || 'Đại học Cần Thơ',
    latitude: h?.latitude || null,
    longitude: h?.longitude || null,
    images: initialImages,
  })

  Object.keys(errors).forEach(k => delete errors[k])
  modal.value = 'house'
}

function locate() {
  if (locating.value) return;
  if (!navigator.geolocation) {
    locationState.value = "error";
    locationNotice.value =
      "Trình duyệt này không hỗ trợ định vị. Vui lòng nhập địa chỉ bên trên.";
    return;
  }
  const request = ++locationRequest;
  locating.value = true;
  locationState.value = "loading";
  locationNotice.value = "Đang lấy tọa độ hiện tại…";
  const failed = (error) => {
    if (request !== locationRequest) return;
    locating.value = false;
    locationState.value = "error";
    locationNotice.value =
      error?.code === 1
        ? "Bạn chưa cho phép truy cập vị trí. Hãy bật quyền định vị trên trình duyệt rồi thử lại."
        : error?.code === 3
          ? "Lấy vị trí quá thời gian chờ. Vui lòng thử lại."
          : "Chưa xác định được vị trí. Bạn có thể thử lại hoặc nhập địa chỉ bên trên.";
  };
  try {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== locationRequest) return;
        form.latitude = position.coords.latitude;
        form.longitude = position.coords.longitude;
        locating.value = false;
        locationState.value = "success";
        locationNotice.value = "Đã lấy tọa độ thành công!";
      },
      failed,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  } catch {
    failed();
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

function onFileSelect(e) {
  uploadError.value = ''
  const files = Array.from(e.target.files || [])
  processFiles(files)
  if (e.target) e.target.value = ''
}

function onDrop(e) {
  uploadError.value = ''
  const files = Array.from(e.dataTransfer?.files || [])
  processFiles(files)
}

function processFiles(files) {
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      uploadError.value = 'Chỉ hỗ trợ định dạng JPG, PNG, WEBP.'
      continue
    }
    if (file.size > 5 * 1024 * 1024) {
      uploadError.value = 'Dung lượng ảnh tối đa 5MB.'
      continue
    }
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) {
        form.images.push(ev.target.result)
      }
    }
    reader.readAsDataURL(file)
  }
}

function removeImage(idx) {
  form.images.splice(idx, 1)
}

function validateStep1() {
  let valid = true
  delete errors.name

  if (!form.name.trim()) {
    errors.name = 'Vui lòng nhập tên nhà trọ.'
    valid = false
  }
  return valid
}

function validateStep2() {
  let valid = true
  delete errors.street
  delete errors.address
  const streetVal = form.street.trim() || form.address.trim()
  if (!streetVal) {
    errors.street = 'Vui lòng điền thông tin này.'
    errors.address = 'Vui lòng điền thông tin này.'
    valid = false
  }
  return valid
}

function nextStep() {
  if (houseStep.value === 1) {
    if (validateStep1()) houseStep.value = 2
  } else if (houseStep.value === 2) {
    if (validateStep2()) houseStep.value = 3
  }
}

function prevStep() {
  if (houseStep.value > 1) {
    houseStep.value--
    Object.keys(errors).forEach(k => delete errors[k])
  }
}

function goToStep(target) {
  if (target === houseStep.value) return
  if (target > houseStep.value) {
    if (houseStep.value === 1 && !validateStep1()) return
    if (houseStep.value === 2 && !validateStep2()) return
  }
  Object.keys(errors).forEach(k => delete errors[k])
  houseStep.value = target
}

async function save() {
  if (houseSaving.value) return
  houseSaveError.value = ''
  Object.keys(errors).forEach(k => delete errors[k])
  if (!validateStep1()) {
    houseStep.value = 1
    return
  }
  if (!validateStep2()) {
    houseStep.value = 2
    return
  }

  const streetVal = form.street.trim() || form.address.trim()
  const addressParts = [streetVal, form.ward, houseCity].filter(Boolean)
  const fullAddress = addressParts.join(', ') || streetVal
  const images = form.images.length ? [...form.images] : ['/illustrations/room-1.svg']

  const item = {
    ...form,
    id: editingId.value || 'house-' + Date.now(),
    name: form.name.trim(),
    desc: form.desc.trim() || 'Trọ sạch sẽ, thoáng mát, an ninh tốt.',
    rules: form.rules.trim() || 'Giờ giấc tự do, giữ gìn vệ sinh chung.',
    rooms: editingId.value ? (state.houses.find(h => h.id === editingId.value)?.rooms ?? form.rooms ?? 0) : (form.rooms || 0),
    status: form.status || 'Đang hoạt động',
    city: houseCity,
    ward: form.ward,
    street: streetVal,
    address: fullAddress,
    nearby: form.nearby,
    image: images[0],
    images: images,
    latitude: form.latitude,
    longitude: form.longitude,
  }

  houseSaving.value = true
  try {
  const savedHouse = await saveHouse(item)
  if (editingId.value) {
    const idx = state.houses.findIndex(h => h.id === editingId.value)
    if (idx >= 0) Object.assign(state.houses[idx], savedHouse)
  } else {
    state.houses.push(savedHouse)
  }

  modal.value = ''
  showNotice(editingId.value ? 'Thông tin nhà trọ được chỉnh sửa thành công.' : 'Tạo nhà trọ thành công.')
  } catch (error) { houseSaveError.value = error.message }
  finally { houseSaving.value = false }
}

const relatedPostsCount = computed(() => {
  if (!houses.value || !deleting.value) return 0
  const allPosts = [...state.posts, ...rooms]
  return allPosts.filter(p => p.houseId === deleting.value.id || (!p.houseId && p.house === deleting.value.name)).length
})

async function remove() {
  if (houses.value) {
    if (relatedPostsCount.value > 0) {
      showNotice('Không thể xóa nhà trọ vì đang có bài đăng liên quan.')
      return
    }
    if (deleting.value.ownerId) {
      try { await deleteHouse(deleting.value.id) }
      catch (error) { showNotice(error.message); return }
    }
    state.houses = state.houses.filter(h => h.id !== deleting.value.id)
  } else {
    if (deleting.value.kind === 'rental' && rentalDirectory.posts.some(post => post.id === deleting.value.id)) {
      try { await deleteRental(deleting.value.id) }
      catch (error) { showNotice(error.message); return }
    }
    if (deleting.value.kind === 'roommate' && roommateDirectory.posts.some(post => post.id === deleting.value.id)) {
      try { await deleteRoommate(deleting.value.id) }
      catch (error) { showNotice(error.message); return }
    }
    state.posts = state.posts.filter(p => p.id !== deleting.value.id)
  }
  deleting.value = null
  showNotice('Đã xóa và cập nhật danh sách.')
}
</script>

<template>
  <div v-if="!state.user" class="container empty-state">
    <Icon name="building" :size="42" />
    <h1>Quản lý không gian của bạn</h1>
    <p>Đăng nhập để quản lý nhà trọ và bài đăng.</p>
    <RouterLink :to="'/dang-nhap?redirect=' + encodeURIComponent(route.fullPath)" class="button primary">
      Đăng nhập
    </RouterLink>
  </div>

  <div v-else-if="houses && state.user.role !== 'landlord'" class="container empty-state">
    <Icon name="building" :size="42" />
    <h1>Không gian dành cho chủ trọ</h1>
    <p>Bạn đang đăng nhập với vai trò sinh viên.</p>
    <RouterLink to="/ho-so" class="button secondary">Về hồ sơ</RouterLink>
  </div>

  <div v-else class="container page">
    <div class="section-heading">
      <div>
        <span class="eyebrow">Không gian của bạn</span>
        <h1>{{ houses ? 'Quản lý nhà trọ' : (state.user.role === 'landlord' ? 'Bài đăng cho thuê' : 'Bài đăng ghép trọ') }}</h1>
      </div>
      <button v-if="houses" class="button primary add-house" @click="open()">
        <Icon name="plus" :size="18" />Thêm nhà trọ
      </button>
      <RouterLink
        v-else
        :to="'/dang-bai/' + (state.user.role === 'landlord' ? 'rental' : 'roommate')"
        class="button primary"
      >
        <Icon name="plus" :size="18" />{{ state.user.role === 'landlord' ? 'Đăng bài cho thuê' : 'Đăng bài ghép trọ' }}
      </RouterLink>
    </div>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <!-- Houses List (HH-20) -->
    <template v-if="houses">
      <div v-if="state.houses.length" class="table-header">
        <span>Thông tin nhà trọ</span>
        <span>Địa chỉ</span>
        <span>Số phòng</span>
        <span>Thao tác</span>
      </div>

      <article
        v-for="h in state.houses.slice(0, housesMore ? state.houses.length : 3)"
        :key="h.id"
        class="house-row"
      >
        <div class="house-summary">
          <img :src="h.image || '/illustrations/room-1.svg'" :alt="h.name" />
          <div>
            <h3>
              <RouterLink :to="'/nha-tro/' + h.id" class="house-detail-link">{{ h.name }}</RouterLink>
            </h3>
            <p class="muted">{{ h.desc }}</p>
          </div>
        </div>
        <p class="house-address"><Icon name="pin" :size="16" />{{ h.address }}</p>
        <span class="house-room-count"><Icon name="home" :size="16" />{{ h.rooms }} phòng</span>
        <div class="inline house-actions">
          <button
            class="icon-button manage-edit"
            @click="open(h)"
            :aria-label="'Chỉnh sửa ' + h.name"
          >
            <Icon name="edit" :size="17" />
          </button>
          <button
            class="icon-button manage-delete"
            @click="deleting = h"
            :aria-label="'Xóa ' + h.name"
          >
            <Icon name="trash" :size="17" />
          </button>
        </div>
      </article>

      <div v-if="state.houses.length > 3" class="center section-action">
        <button
          type="button"
          class="button secondary"
          :aria-expanded="housesMore"
          @click="housesMore = !housesMore"
        >
          {{ housesMore ? 'Thu gọn' : 'Xem thêm' }}<Icon name="down" :size="18" />
        </button>
      </div>

      <div v-if="!state.houses.length" class="empty-state">
        <span class="empty-icon"><Icon name="building" :size="38" /></span>
        <h2>Chưa có nhà trọ</h2>
        <p>Thêm nhà trọ đầu tiên để bắt đầu đăng tin cho thuê.</p>
        <button class="button primary" @click="open()">Tạo nhà trọ</button>
      </div>
    </template>

    <!-- Posts List -->
    <template v-else-if="list.length">
      <div class="manage-list">
        <article
          v-for="r in list.slice(0, more ? list.length : 3)"
          :key="r.id"
          class="manage-post"
        >
          <img :src="r.image" :alt="r.title" />
          <div class="manage-post-info">
            <span class="badge cream">{{ r.status }}</span>
            <h3>
              <RouterLink
                :to="{ path: '/phong/' + r.id, query: { returnTo: route.fullPath } }"
                class="manage-post-detail"
              >
                {{ r.title }}
              </RouterLink>
            </h3>
            <p class="muted">{{ r.address || 'Cần Thơ' }} · {{ r.area }} m²</p>
            <p class="price">{{ money(r.price) }}<span> / tháng</span></p>
          </div>
          <div class="manage-post-actions">
            <button
              type="button"
              class="icon-button manage-edit"
              aria-label="Chỉnh sửa"
              title="Chỉnh sửa"
              @click="editRental(r)"
            >
              <Icon name="edit" :size="17" />
            </button>
            <button
              class="icon-button manage-delete"
              @click="deleting = r"
              :aria-label="'Xóa bài ' + r.title"
            >
              <Icon name="trash" :size="18" />
            </button>
          </div>
        </article>
      </div>

      <div class="center section-action" v-if="list.length > 3">
        <button class="button secondary" @click="more = !more">
          {{ more ? 'Thu gọn' : 'Xem thêm' }}<Icon name="down" :size="18" />
        </button>
      </div>
    </template>

    <div v-else class="empty-state">
      <span class="empty-icon"><Icon name="grid" :size="38" /></span>
      <h2>Chưa có bài đăng</h2>
      <p>Bắt đầu bằng một bài đăng giới thiệu không gian của bạn.</p>
      <RouterLink
        :to="'/dang-bai/' + (state.user.role === 'landlord' ? 'rental' : 'roommate')"
        class="button primary"
      >
        Tạo bài đăng
      </RouterLink>
    </div>

    <RentalPostEditor
      v-if="editingPost"
      :post="editingPost"
      :save-error="postEditError"
      @close="editingPost = null"
      @save="saveRental"
      :saving="postSaving"
    />

    <Teleport to="body">
      <!-- Delete Confirm Modal (HH-22, HH-23) -->
      <div
        v-if="deleting"
        class="modal-backdrop"
        @click.self="deleting = null"
        @keydown.esc="deleting = null"
      >
        <section
          class="modal delete-confirm-modal"
          v-dialog-focus
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <h2 id="delete-title">
            {{ houses && relatedPostsCount > 0 ? 'Không thể xóa nhà trọ' : 'Xác nhận xóa' }}
          </h2>
          <p>{{ deleting.name || deleting.title }}</p>
          <p class="muted" :class="{ 'error': houses && relatedPostsCount > 0 }">
            {{
              houses && relatedPostsCount > 0
                ? 'Nhà trọ này đang có ' + relatedPostsCount + ' bài đăng liên quan. Bạn cần xóa các bài đăng này trước khi xóa nhà trọ.'
                : (houses
                    ? 'Toàn bộ thông tin nhà trọ sẽ bị xóa khỏi danh sách.'
                    : 'Bài đăng sẽ được gỡ khỏi danh sách trên thiết bị này.')
            }}
          </p>
          <div class="form-actions" :class="{ 'single-action': houses && relatedPostsCount > 0 }">
            <button class="button secondary" @click="deleting = null">
              {{ houses && relatedPostsCount > 0 ? 'Đóng' : 'Hủy' }}
            </button>
            <button
              v-if="!houses || relatedPostsCount === 0"
              class="button danger"
              @click="remove"
            >
              Xác nhận xóa
            </button>
          </div>
        </section>
      </div>

      <!-- House Form Modal / Full Page Wizard -->
      <div
        v-if="modal === 'house'"
        :class="editingId ? 'modal-backdrop house-editor-backdrop' : ''"
        @click.self="editingId && (modal = '')"
        @keydown.esc="modal = ''"
      >
      <section
        :class="editingId ? 'house-editor' : 'house-wizard-overlay modal large house-wizard-modal'"
        v-dialog-focus
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-title"
      >
        <aside v-if="editingId" class="house-editor-sidebar">
          <strong class="house-editor-brand"><Icon name="building" :size="20" />Nhà trọ</strong>
          <nav aria-label="Các phần chỉnh sửa nhà trọ">
            <button v-for="item in houseTabs" :key="item.step" type="button"
              :class="{ active: houseStep === item.step }"
              :aria-current="houseStep === item.step ? 'page' : undefined"
              @click="houseStep = item.step">
              <Icon :name="item.icon" :size="18" />{{ item.label }}
            </button>
          </nav>
        </aside>
        <div :class="editingId ? 'house-editor-main' : 'house-wizard-page container page post-page'">
          <header v-if="editingId" class="house-editor-header">
            <div><span id="house-title" class="eyebrow">Chỉnh sửa nhà trọ</span>
              <h2>{{ houseTabs[houseStep - 1].label }}</h2></div>
            <button type="button" class="icon-button" aria-label="Đóng" @click="modal = ''"><Icon name="close" :size="22" /></button>
          </header>
          <!-- Top bar with Back/Close button -->
          <div v-if="!editingId" class="house-wizard-topbar">
            <button
              type="button"
              class="button secondary house-back-btn"
              @click="modal = ''"
              aria-label="Quay lại danh sách"
            >
              <Icon name="back" :size="16" /> Quay lại danh sách
            </button>
            <button
              type="button"
              class="icon-button house-modal-close"
              @click="modal = ''"
              aria-label="Đóng"
            >
              <Icon name="close" :size="20" />
            </button>
          </div>

          <!-- Hero Heading (giống PostForm) -->
          <div v-if="!editingId" class="center house-wizard-hero">
            <span class="eyebrow">QUẢN LÝ NHÀ TRỌ · BƯỚC {{ houseStep }}/3</span>
            <h1 id="house-title" class="house-wizard-title">
              {{ editingId ? 'Chỉnh sửa nhà trọ' : 'Tạo nhà trọ' }}
            </h1>
            <p class="muted house-wizard-description">
              {{ ['Điền thông tin cơ bản về không gian của bạn.', 'Xác định địa chỉ và địa điểm thuận tiện gần nhà trọ.', 'Thêm hình ảnh để giới thiệu nhà trọ rõ ràng hơn.'][houseStep - 1] }}
            </p>
          </div>

          <!-- Desktop Stepper (HH-21, HH-37, HH-38, HH-39) -->
          <nav v-if="!editingId" class="house-stepper desktop-stepper stepper" aria-label="Các bước tạo nhà trọ">
            <div class="stepper-item" :class="{ active: houseStep === 1, current: houseStep === 1, completed: houseStep > 1, complete: houseStep > 1 }">
              <button
                type="button"
                class="step-circle step-number"
                @click="goToStep(1)"
                :aria-current="houseStep === 1 ? 'step' : undefined"
              >
                <Icon v-if="houseStep > 1" name="check" :size="16" />
                <span v-else>1</span>
              </button>
              <span class="step-title">Thông tin chung</span>
            </div>
            <div class="stepper-line" :class="{ filled: houseStep > 1 }"></div>
            <div class="stepper-item" :class="{ active: houseStep === 2, current: houseStep === 2, completed: houseStep > 2, complete: houseStep > 2 }">
              <button
                type="button"
                class="step-circle step-number"
                @click="goToStep(2)"
                :aria-current="houseStep === 2 ? 'step' : undefined"
              >
                <Icon v-if="houseStep > 2" name="check" :size="16" />
                <span v-else>2</span>
              </button>
              <span class="step-title">Vị trí và tiện ích</span>
            </div>
            <div class="stepper-line" :class="{ filled: houseStep > 2 }"></div>
            <div class="stepper-item" :class="{ active: houseStep === 3, current: houseStep === 3 }">
              <button
                type="button"
                class="step-circle step-number"
                @click="goToStep(3)"
                :aria-current="houseStep === 3 ? 'step' : undefined"
              >
                <span>3</span>
              </button>
              <span class="step-title">Hình ảnh</span>
            </div>
          </nav>

          <!-- Mobile Tabs Bar (HH-34, HH-36) -->
          <div v-if="!editingId" class="mobile-tabs-bar" role="tablist" aria-label="Các bước thông tin">
            <button
              type="button"
              role="tab"
              class="mobile-tab"
              :class="{ active: houseStep === 1 }"
              :aria-selected="houseStep === 1"
              @click="goToStep(1)"
            >
              Thông tin chi tiết
            </button>
            <button
              type="button"
              role="tab"
              class="mobile-tab"
              :class="{ active: houseStep === 2 }"
              :aria-selected="houseStep === 2"
              @click="goToStep(2)"
            >
              Địa chỉ
            </button>
            <button
              type="button"
              role="tab"
              class="mobile-tab"
              :class="{ active: houseStep === 3 }"
              :aria-selected="houseStep === 3"
              @click="goToStep(3)"
            >
              Hình ảnh
            </button>
          </div>

          <form id="house-form" class="form-panel post-panel house-wizard-form" @submit.prevent="editingId || houseStep === 3 ? save() : nextStep()" novalidate>
            <p v-if="houseSaveError && !editingId" class="error" role="alert">{{ houseSaveError }}</p>
            <!-- Step 1: Thông tin chung (HH-21, HH-34) -->
            <div v-show="houseStep === 1" class="wizard-step-pane">
              <h2>Thông tin chung</h2>
              <div class="form-fields-vertical">
                <div class="field-block">
                  <label class="field">
                    <span>Tên nhà trọ <b class="required">*</b></span>
                    <input
                      v-model="form.name"
                      placeholder="Ví dụ: Nhà trọ Minh An"
                      :aria-invalid="!!errors.name"
                    />
                  </label>
                  <small class="error" v-if="errors.name">{{ errors.name }}</small>
                </div>

                <div class="field-block">
                  <label class="field">
                    <span>Mô tả <b class="required">*</b></span>
                    <textarea
                      v-model="form.desc"
                      rows="4"
                      placeholder="Mô tả về không gian, an ninh, tiện nghi…"
                      :aria-invalid="!!errors.desc"
                    ></textarea>
                  </label>
                  <small class="error" v-if="errors.desc">{{ errors.desc }}</small>
                </div>

                <div class="field-block">
                  <label class="field">
                    <span>Nội quy chung <b class="required">*</b></span>
                    <textarea
                      v-model="form.rules"
                      rows="3"
                      placeholder="Giờ giấc tự do, không ồn ào sau 23h, giữ gìn vệ sinh chung…"
                      :aria-invalid="!!errors.rules"
                    ></textarea>
                  </label>
                  <small class="error" v-if="errors.rules">{{ errors.rules }}</small>
                </div>
              </div>

              <div class="form-actions wizard-actions">
                <button
                  type="button"
                  class="button secondary"
                  @click="modal = ''"
                  aria-label="Đóng"
                >
                  <Icon name="back" :size="16" /> Hủy
                </button>
                <div class="inline">
                  <button
                    v-if="editingId"
                    type="button"
                    class="button secondary"
                    @click="save"
                  >
                    Lưu nhà trọ
                  </button>
                  <button
                    type="button"
                    class="button primary step-btn-next"
                    @click="nextStep"
                  >
                    Tiếp theo <Icon name="arrow" :size="16" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 2: Vị trí và tiện ích (HH-37, HH-34 step 2) -->
            <div v-show="houseStep === 2" class="wizard-step-pane">
              <h2>Vị trí & Địa lý</h2>
              <div class="address-box">
                <h3 class="address-box-title">Địa chỉ</h3>
                <div class="address-box-grid">
                  <div class="field-block">
                    <div class="field">
                      <label for="house-city">Tỉnh/Thành phố <b class="required">*</b></label>
                      <input id="house-city" :value="`TP. ${houseCity}`" readonly />
                    </div>
                  </div>

                  <div class="field-block">
                    <div class="field">
                      <span>Phường/Xã <b class="required">*</b></span>
                      <AppDropdown v-model="form.ward" label="Phường/Xã *" :options="wardOptions" />
                    </div>
                  </div>

                  <div class="field-block">
                    <label class="field">
                      <span>Địa chỉ <b class="required">*</b></span>
                      <input
                        v-model="form.street"
                        aria-label="Địa chỉ *"
                        placeholder="Vd: 123 Đường ABC"
                        :aria-invalid="!!errors.street"
                      />
                    </label>
                    <small class="error" v-if="errors.street">{{ errors.street }}</small>
                  </div>
                </div>
              </div>

              <div class="nearby-location-row">
                <div class="field nearby-field">
                  <span>Địa điểm gần đó</span>
                  <AppDropdown v-model="form.nearby" label="Địa điểm gần đó" :options="nearbyChoices" />
                </div>

                <div class="location-btn-col">
                  <button
                    type="button"
                    class="button secondary location-button"
                    :disabled="locating"
                    :aria-busy="locating"
                    @click="locate"
                  >
                    <Icon name="pin" :size="18" />{{
                      locating ? "Đang lấy vị trí…" : "Vị trí hiện tại"
                    }}
                  </button>
                </div>
              <div
                v-if="locationNotice"
                class="location-feedback"
                :class="locationState"
                :role="locationState === 'error' ? 'alert' : 'status'"
              >
                <Icon :name="locationState === 'success' ? 'check' : 'info'" :size="19" />
                <p>{{ locationNotice }}</p>
              </div>
              </div>

              <div class="form-actions wizard-actions">
                <button
                  type="button"
                  class="button secondary step-btn-prev"
                  @click="prevStep"
                >
                  <Icon name="back" :size="16" /> Trước
                </button>
                <div class="inline">
                  <button
                    v-if="editingId"
                    type="button"
                    class="button secondary"
                    @click="save"
                  >
                    Lưu nhà trọ
                  </button>
                  <button
                    type="button"
                    class="button primary step-btn-next"
                    @click="nextStep"
                  >
                    Tiếp theo <Icon name="arrow" :size="16" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 3: Hình ảnh (HH-38, HH-39, HH-36) -->
            <div v-show="houseStep === 3" class="wizard-step-pane">
              <h2>Hình ảnh nhà trọ</h2>
              <p class="house-cover-hint">Ảnh đầu tiên là ảnh bìa. Bạn có thể đặt ảnh khác làm ảnh bìa trước khi lưu.</p>
              <input
                ref="fileInput"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                style="display:none"
                @change="onFileSelect"
              />

              <div class="step-instruction-mobile">
                <p class="instruction-text">Tải lên ít nhất 1 ảnh</p>
              </div>

              <div
                class="images-step-layout"
                :class="{ 'with-previews': form.images.length > 0 }"
              >
                <!-- Khi không có hình: hiển thị khung upload lớn ở giữa (HH-38) -->
                <div
                  v-if="form.images.length === 0"
                  class="upload-dropzone is-empty"
                  @click="triggerUpload"
                  @dragover.prevent
                  @drop.stop.prevent="onDrop"
                  role="button"
                  tabindex="0"
                  @keydown.enter.prevent="triggerUpload"
                  @keydown.space.prevent="triggerUpload"
                >
                  <div class="upload-dropzone-icon">
                    <Icon name="upload" :size="32" />
                  </div>
                  <p class="upload-dropzone-title">Nhấp duyệt file ảnh chi tiết từ máy</p>
                  <p class="upload-dropzone-subtitle">
                    <span class="upload-formats">
                      Hỗ trợ
                      <span class="file-type-tag">JPG</span>,
                      <span class="file-type-tag">PNG</span>,
                      <span class="file-type-tag">WEBP</span>
                    </span>
                    <span class="upload-bullet">·</span>
                    <span class="upload-limit-badge">Tối đa 5MB</span>
                  </p>
                </div>

                <!-- Khi đã có hình: hiển thị grid ảnh 3 cột kèm ô upload (HH-39) -->
                <div
                  v-else
                  class="thumbnails-grid"
                  @dragover.prevent
                  @drop.stop.prevent="onDrop"
                >
                  <div
                    v-for="(img, idx) in form.images"
                    :key="idx"
                    class="thumbnail-card"
                  >
                    <img :src="img" :alt="'Ảnh ' + (idx + 1)" />
                    <span v-if="idx === 0" class="badge cream thumb-cover-badge">Ảnh bìa</span>
                    <button v-else type="button" class="thumb-cover-btn" @click="form.images.unshift(...form.images.splice(idx, 1))">Đặt làm ảnh bìa</button>
                    <button
                      type="button"
                      class="thumb-delete-btn"
                      @click="removeImage(idx)"
                      :aria-label="'Xóa ảnh ' + (idx + 1)"
                    >
                      <Icon name="close" :size="14" />
                    </button>
                  </div>

                  <!-- Ô upload nằm cùng hàng trong Grid -->
                  <div
                    v-if="form.images.length < 10"
                    class="upload-dropzone thumbnail-upload-card"
                    @click="triggerUpload"
                    @dragover.prevent
                    @drop.stop.prevent="onDrop"
                    role="button"
                    tabindex="0"
                    aria-label="Thêm ảnh"
                    title="Thêm ảnh"
                    @keydown.enter.prevent="triggerUpload"
                    @keydown.space.prevent="triggerUpload"
                  >
                    <div class="upload-dropzone-icon mini-icon">
                      <Icon name="upload" :size="24" />
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="uploadError" class="upload-error-text">{{ uploadError }}</p>

              <div class="form-actions wizard-actions">
                <button
                  type="button"
                  class="button secondary step-btn-prev"
                  @click="prevStep"
                >
                  <Icon name="back" :size="16" /> Trước
                </button>
                <div class="inline">
                  <button
                    type="button"
                    class="button primary submit-house-btn"
                    @click="save"
                  >
                    <Icon v-if="!editingId" name="plus" :size="16" />
                    {{ editingId ? 'Lưu nhà trọ' : 'Tạo nhà trọ' }}
                  </button>
                </div>
              </div>
            </div>
          </form>
          <footer v-if="editingId" class="house-editor-footer">
            <p v-if="houseSaveError" class="error" role="alert">{{ houseSaveError }}</p>
            <button type="button" class="button secondary" @click="modal = ''">Hủy</button>
            <button type="submit" form="house-form" class="button primary" :disabled="houseSaving"><Icon name="check" :size="18" />{{ houseSaving ? 'Đang lưu…' : 'Lưu thay đổi' }}</button>
          </footer>
        </div>
      </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.delete-confirm-modal {
  width: min(440px, 100%);
  padding: 32px;
  text-align: center;
}
.delete-confirm-modal h2 {
  font-size: 26px;
  margin-bottom: 24px;
}
.delete-confirm-modal h2::after {
  content: "";
  display: block;
  width: 180px;
  max-width: 75%;
  height: 1px;
  background: var(--line);
  margin: 12px auto 0;
}
.delete-confirm-modal p {
  overflow-wrap: anywhere;
}
.delete-confirm-modal p.error {
  color: var(--error, #e53e3e);
  font-weight: 500;
}
.delete-confirm-modal .form-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
}
.delete-confirm-modal .form-actions.single-action {
  grid-template-columns: minmax(0, 1fr);
}
.delete-confirm-modal .form-actions .button {
  width: 100%;
  min-width: 0;
  padding-inline: 12px;
  white-space: normal;
}
@media (max-width: 480px) {
  .delete-confirm-modal {
    padding: 24px 20px;
  }
  .delete-confirm-modal h2 {
    font-size: 23px;
  }
  .delete-confirm-modal .form-actions {
    gap: 12px;
  }
}

.table-header,
.house-row {
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.4fr) 100px 100px;
  gap: 20px;
}
.table-header {
  margin-bottom: 12px;
}
.house-row {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  margin-bottom: 16px;
}
.house-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.house-summary > img {
  width: 92px;
  height: 72px;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 6px;
  flex-shrink: 0;
}
.house-summary > div {
  min-width: 0;
}
.house-summary h3 {
  font-size: 16px;
  overflow-wrap: anywhere;
}
.house-summary p {
  font-size: 11px;
  line-height: 1.5;
}
.house-row .house-address,
.house-room-count {
  display: flex;
  align-items: center;
  gap: 7px;
  line-height: 1.6;
  margin: 0;
}
.house-address {
  overflow-wrap: anywhere;
}
.house-actions {
  justify-content: flex-end;
}
.house-actions .icon-button,
.manage-post-actions .icon-button {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 7px;
}
.manage-edit {
  border: 1px solid #59646b;
  background: #f4f5f6;
  color: #25313b;
}
.manage-edit:hover {
  background: #e8ecee;
}
.manage-delete {
  background: #c93636;
  color: #fff;
  border: 1px solid #c93636;
}
.manage-delete:hover {
  background: #ad2929;
  border-color: #ad2929;
}
@media (pointer: coarse) {
  .house-actions .icon-button,
  .manage-post-actions .icon-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }
}
@media (max-width: 800px) {
  .house-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    padding: 16px;
  }
  .house-summary,
  .house-row .house-address {
    grid-column: 1 / -1;
  }
  .house-row > .house-room-count {
    grid-column: 1;
    grid-row: auto;
  }
  .house-row > .house-actions {
    grid-column: 2;
    grid-row: auto;
  }
  .house-summary > img {
    width: 76px;
    height: 64px;
  }
}
.manage-post,
.house-row {
  position: relative;
  transition:
    transform 0.4s ease-in-out,
    border-color 0.4s ease-in-out,
    box-shadow 0.4s ease-in-out;
}
.manage-post-detail::after,
.house-detail-link::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 1;
}
.manage-post-detail:hover,
.house-detail-link:hover {
  text-decoration: none;
}
.manage-post-detail:focus-visible::after,
.house-detail-link:focus-visible::after {
  outline: 3px solid #638d92;
  outline-offset: 4px;
}
.manage-post-actions,
.house-actions {
  position: relative;
  z-index: 2;
}
.manage-post-actions {
  flex-direction: row;
}
@media (hover: hover) and (pointer: fine) {
  .manage-post:hover,
  .house-row:hover {
    border-color: #638d92;
    box-shadow:
      0 0 0 1px #638d92,
      0 6px 18px #365f621a;
    transform: scale(1.01);
  }
}
@media (prefers-reduced-motion: reduce) {
  .manage-post,
  .house-row {
    transition: none;
  }
  .manage-post:hover,
  .house-row:hover {
    transform: none;
  }
}

/* ==========================================================================
   House Wizard Page / Dialog Styles (Consistent with PostForm / Đăng bài)
   ========================================================================== */
.house-wizard-overlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
  background: var(--bg, #faf8f5) !important;
  z-index: 1000 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.house-wizard-page {
  padding-top: 36px;
  padding-bottom: 96px;
  min-height: 100vh;
}

.house-wizard-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.house-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  padding: 8px 16px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  border-radius: 999px;
  transition: all 0.2s;
  cursor: pointer;
}

.house-back-btn:hover {
  background: var(--cream-deep, #f0eae1);
}

.house-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.2s;
}

.house-modal-close:hover {
  background: var(--cream-deep, #f0eae1);
  transform: rotate(90deg);
}

.house-wizard-hero {
  margin-bottom: 36px;
}

.house-wizard-title {
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 10px;
  color: var(--ink);
}

.house-wizard-description {
  font-size: 15px;
  color: var(--muted);
  max-width: 580px;
  margin: 0 auto;
  line-height: 1.5;
}

/* Stepper synced with PostForm styles */
.house-stepper.stepper {
  display: flex;
  list-style: none;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0 auto 40px;
  max-width: 680px;
  gap: 0;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 2;
  cursor: pointer;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid #b8c1c4;
  background: #ffffff;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.step-circle:hover {
  border-color: var(--ink);
}

.stepper-item.current .step-circle,
.stepper-item.active .step-circle {
  background: var(--gold, #e2ba68);
  border-color: var(--ink);
  color: var(--ink);
  box-shadow: 0 0 0 4px rgba(226, 186, 104, 0.25);
}

.stepper-item.complete .step-circle,
.stepper-item.completed .step-circle {
  background: var(--cyan, #8fc8cf);
  border-color: var(--cyan, #8fc8cf);
  color: var(--ink);
}

.step-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
}

.stepper-item.current .step-title,
.stepper-item.active .step-title {
  color: var(--ink);
  font-weight: 700;
}

.stepper-line {
  flex: 1;
  height: 2px;
  background: var(--line, rgba(19, 20, 20, 0.14));
  margin: 0 12px;
  margin-bottom: 24px;
  transition: background 0.3s ease-in-out;
}

.stepper-line.filled {
  background: var(--cyan, #8fc8cf);
}

/* Mobile Tabs Bar */
.mobile-tabs-bar {
  display: none;
  border-bottom: 1px solid var(--line);
  margin-bottom: 24px;
  gap: 4px;
}

.mobile-tab {
  flex: 1;
  padding: 12px 6px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--muted);
  border-bottom: 2.5px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.mobile-tab.active {
  color: var(--ink);
  font-weight: 700;
  border-bottom-color: var(--gold, #e2ba68);
}

/* Step Panes */
.wizard-step-pane {
  display: flex;
  flex-direction: column;
}

.wizard-step-pane > h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 28px;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.house-wizard-form {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 40px 48px;
  box-shadow: 0 4px 20px rgba(19, 20, 20, 0.04);
}

.form-fields-vertical {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 12px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-fields-vertical .field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 0;
}

.field span {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.required {
  color: var(--error, #e53e3e);
}

.field input,
.field textarea,
.custom-select {
  width: 100%;
  padding: 13px 16px;
  border: 1px solid rgba(19, 20, 20, 0.2);
  border-radius: 10px;
  font-size: 14.5px;
  background: #ffffff;
  color: var(--ink);
  line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field textarea {
  min-height: 96px;
  resize: vertical;
}

.field input:focus,
.field textarea:focus,
.custom-select:focus {
  outline: none;
  border-color: #638d92;
  box-shadow: 0 0 0 3px rgba(143, 200, 207, 0.35);
}

.field input[aria-invalid="true"],
.field textarea[aria-invalid="true"] {
  border-color: var(--error, #e53e3e);
}

/* Address Box (HH-37) */
.address-box {
  background: #f8faf9;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}

.address-box-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 18px;
  color: var(--ink);
}

.address-box-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.nearby-location-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 28px;
}

.post-panel .nearby-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 0;
}

.nearby-field > span {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.location-btn-col .location-button {
  width: 100%;
  min-height: 50px;
}

.nearby-location-row > .location-feedback {
  grid-column: 2;
  margin-top: -12px;
}

/* Step 3 Layout (HH-38, HH-39, HH-36) */
.step-instruction-mobile {
  display: none;
  margin-bottom: 14px;
}

.instruction-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.images-step-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 28px;
}

.images-step-layout.with-previews {
  display: block;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.thumbnail-card {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #f4f5f6;
  box-shadow: 0 1px 3px rgba(19, 20, 20, 0.05);
}

.thumbnail-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.house-cover-hint { margin: 0 0 16px; font-size: 13px; color: var(--muted); line-height: 1.6; }
.thumb-cover-badge { position: absolute; top: 8px; left: 8px; }
.thumb-cover-btn { position: absolute; bottom: 0; left: 0; width: 100%; min-height: 44px; padding: 8px; background: #fffffff0; color: var(--ink); font-size: 12px; }
.thumb-cover-btn:hover { background: var(--cream-deep); }

.thumb-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #374151;
  border: 1px solid rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.thumb-delete-btn:hover {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}

.upload-dropzone {
  border: 2px dashed #9ca3af;
  border-radius: 16px;
  background: #fafafa;
  padding: 44px 24px;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
  min-height: 240px;
}

.upload-dropzone.is-empty {
  min-height: 320px;
  width: 100%;
}

.upload-dropzone:hover,
.upload-dropzone:focus-visible {
  border-color: #638d92;
  background: #f3f8f8;
  outline: none;
}

.thumbnail-upload-card {
  aspect-ratio: 4 / 3;
  min-height: auto;
  padding: 0;
  border-radius: 12px;
  border: 2px dashed #9ca3af;
  background: #fafafa;
}

.thumbnail-upload-card:hover {
  border-color: #638d92;
  background: #f3f8f8;
}

.thumbnail-upload-card .mini-icon {
  margin: 0;
  width: 44px;
  height: 44px;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
}

.upload-dropzone-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  margin-bottom: 4px;
}

.upload-dropzone-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.upload-dropzone-subtitle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin: 2px 0 0;
  flex-wrap: wrap;
}

.upload-formats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 12.5px;
}

.file-type-tag {
  display: inline-block;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  background: #edf1f2;
  color: #3b5055;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.upload-bullet {
  color: rgba(140, 148, 150, 0.6);
}

.upload-limit-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 600;
  color: #1e6b45;
  background: #edf7f0;
  border: 1px solid #cce8d4;
  border-radius: 999px;
}

.upload-error-text {
  color: var(--error, #e53e3e);
  font-size: 13px;
  margin-bottom: 16px;
}

/* Actions footer */
.wizard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.wizard-actions .inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wizard-actions .button {
  min-height: 48px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 999px;
}

.step-btn-next,
.submit-house-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: var(--gold, #e2ba68) !important;
  color: var(--ink) !important;
  border: 1px solid transparent !important;
  box-shadow: 0 1px 2px rgba(19, 20, 20, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.step-btn-next:hover,
.submit-house-btn:hover {
  background: var(--gold-hover, #d4a953) !important;
}

.step-btn-prev,
.wizard-actions .button.secondary {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  border: 1px solid var(--ink) !important;
  background: transparent !important;
  color: var(--ink) !important;
  cursor: pointer;
  transition: all 0.2s;
}

.step-btn-prev:hover,
.wizard-actions .button.secondary:hover {
  background: var(--cream-deep, #f0eae1) !important;
}

/* Responsive */
@media (max-width: 640px) {
  .house-wizard-page {
    padding-top: 16px;
    padding-bottom: 48px;
    width: calc(100% - 24px);
  }
  .house-wizard-form {
    padding: 24px 18px;
    border-radius: 16px;
  }
  .desktop-stepper {
    display: none;
  }
  .mobile-tabs-bar {
    display: flex;
  }
  .address-box-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .nearby-location-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .nearby-location-row > .location-feedback {
    grid-column: 1;
  }
  .step-instruction-mobile {
    display: block;
  }
  .images-step-layout.with-previews {
    grid-template-columns: minmax(0, 1fr);
  }
  .wizard-actions {
    flex-wrap: wrap;
    gap: 10px;
  }
  .wizard-actions .inline {
    width: 100%;
    justify-content: flex-end;
  }
}
.house-editor-backdrop { padding: 24px; }
.house-editor { display: grid; grid-template-columns: 210px minmax(0, 1fr); width: min(1100px, 100%); height: min(800px, calc(100dvh - 48px)); overflow: hidden; background: #fff; border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); }
.house-editor-sidebar { padding: 26px 16px; background: var(--cream); border-right: 1px solid var(--line); }
.house-editor-brand { display: flex; align-items: center; gap: 10px; padding: 0 10px 24px; font-size: 16px; }
.house-editor-sidebar nav { display: grid; gap: 8px; }
.house-editor-sidebar nav button { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 12px; border-radius: 9px; text-align: left; font-size: 13px; }
.house-editor-sidebar nav button:hover, .house-editor-sidebar nav button.active { background: var(--cream-deep); }
.house-editor-sidebar nav button.active { font-weight: 600; }
.house-editor-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.house-editor-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 30px 20px; border-bottom: 1px solid var(--line); }
.house-editor-header h2 { margin: 5px 0 0; font-size: 23px; }
.house-editor-header .icon-button { flex-shrink: 0; width: 44px; height: 44px; }
.house-editor .house-wizard-form { flex: 1; min-height: 0; width: 100%; max-width: none; margin: 0; overflow-y: auto; padding: 24px 30px; border: 0; border-radius: 0; box-shadow: none; scroll-padding-block: 20px; }
.house-editor .wizard-step-pane > h2, .house-editor .wizard-actions { display: none; }
.house-editor .address-box-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.house-editor .address-box-grid > :last-child { grid-column: 1 / -1; }
.house-editor-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 18px 30px; border-top: 1px solid var(--line); background: #fff; }
.house-editor-footer .button { min-height: 44px; font-size: 13px; }
.house-editor-footer { flex-wrap: wrap; }
.house-editor-footer > p { flex-basis: 100%; margin: 0; }
@media (max-width: 700px) {
  .house-editor-backdrop { padding: 12px; }
  .house-editor { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); height: calc(100dvh - 24px); border-radius: 14px; }
  .house-editor-sidebar { padding: 10px; border-right: 0; border-bottom: 1px solid var(--line); }
  .house-editor-brand { display: none; }
  .house-editor-sidebar nav { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
  .house-editor-sidebar nav button { justify-content: center; gap: 5px; padding: 10px 4px; font-size: 12px; }
  .house-editor-sidebar nav button svg { width: 16px; flex-shrink: 0; }
  .house-editor-header { padding: 16px 18px; }
  .house-editor-header h2 { font-size: 20px; }
  .house-editor .house-wizard-form { padding: 20px 18px; }
  .house-editor .address-box-grid, .house-editor .nearby-location-row { grid-template-columns: minmax(0, 1fr); }
  .house-editor .nearby-location-row > .location-feedback { grid-column: 1; }
  .thumbnails-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .house-editor-footer { padding: 14px 18px; }
}
</style>
