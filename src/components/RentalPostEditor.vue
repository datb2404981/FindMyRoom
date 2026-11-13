<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import Icon from './Icon.vue'
import AppDropdown from './AppDropdown.vue'
import { amenities, nearby, lifestyles } from '../data'
import { state } from '../store'
import { rentalStatuses as statuses, rentalStatus } from '../rental-status'
import { optimizeStoredPhoto } from '../image-storage'
import universities from '../../data/university.json'
import { houseDirectory, loadHouses } from '../houses'

const props = defineProps({ post: { type: Object, required: true }, saveError: { type: String, default: '' }, saving: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'save'])
const form = reactive(JSON.parse(JSON.stringify(props.post)))
const roommate = props.post.kind === 'roommate'
const universityOptions = computed(() => [...new Set([...universities.map(item => item.university_name), form.school].filter(Boolean))])
const roommateHouseOptions = computed(() => [{ value: '', label: 'Không chọn nhà trọ' }, ...houseDirectory.houses.filter(house => house.status === 'Đang hoạt động').map(house => ({ value: house.id, label: `${house.name} · ${house.address}` }))])
function selectRoommateHouse(id) {
  const house = houseDirectory.houses.find(item => item.id === id)
  form.houseId = id
  form.house = house?.name || ''
  if (house) Object.assign(form, { address: house.address, street: house.street || house.address, ward: house.ward, city: house.city, latitude: house.latitude, longitude: house.longitude })
}
const tab = ref('general'), errors = reactive({}), uploading = ref(false), imageError = ref('')
const photos = ref([...(props.post.images?.length ? props.post.images : [props.post.image])].filter(Boolean))
const dragging = ref(false)
let dragDepth = 0
function dragEnter() { dragDepth++; dragging.value = true }
function dragLeave() { dragDepth = Math.max(0, dragDepth - 1); dragging.value = dragDepth > 0 }
const tabs = [
  { id: 'general', label: 'Thông tin chung', icon: 'info' },
  { id: 'address', label: 'Địa chỉ', icon: 'pin' },
  { id: 'images', label: 'Hình ảnh', icon: 'images' },
  { id: 'amenities', label: 'Tiện ích', icon: 'grid' },
]
const numericFields = roommate ? [
  ['people', 'Số người cần tìm', 1, true], ['area', 'Diện tích (m²)', 1, true],
  ['price', 'Tiền trọ (đ)', 1, true], ['perPerson', 'Dự kiến giá/người (đ)', 1, true],
  ['electric', 'Tiền điện (đ/kWh)', 1, true], ['water', 'Tiền nước (đ/m³)', 1, true],
  ['internet', 'Tiền internet (đ/tháng)', 0, false],
] : [
  ['people', 'Số người tối đa', 1, true], ['count', 'Số phòng còn lại', 0, true],
  ['price', 'Giá thuê (đ/tháng)', 1, true], ['area', 'Diện tích (m²)', 1, true],
  ['electric', 'Giá điện (đ/kWh)', 1, true], ['water', 'Giá nước (đ/m³)', 1, true],
  ['internet', 'Tiền internet (đ/tháng)', 0, false], ['deposit', 'Tiền cọc (đ)', 0, false],
]
const amenityGroups = computed(() => [
  ['Tiện ích nội khu', 'amenities', [...new Set([...amenities, ...(form.amenities || [])])]],
  ['Tiện ích ngoại khu', 'nearby', [...new Set([...nearby, ...(form.nearby || [])])]],
  ['Khác', 'lifestyles', [...new Set([...lifestyles, ...(form.lifestyles || [])])]],
])
for (const key of ['amenities', 'nearby', 'lifestyles']) form[key] ||= []
const houseOptions = computed(() => {
  const houses = [...state.houses]
  if (form.houseId && !houses.some(h => h.id === form.houseId)) houses.push({ id: form.houseId, name: props.post.house || 'Nhà trọ hiện tại', address: props.post.address || '' })
  return houses
})
const selectedHouseAddress = computed(() => houseOptions.value.find(h => h.id === form.houseId)?.address || form.address || '')
form.status = rentalStatus(form)
let previousOverflow
onMounted(() => { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; if (roommate) loadHouses().catch(() => {}) })
onUnmounted(() => { document.body.style.overflow = previousOverflow })

async function addPhotos(event) {
  dragDepth = 0
  dragging.value = false
  const files = [...(event.dataTransfer?.files || event.target.files || [])]
  if (uploading.value || props.saving) return
  uploading.value = true
  imageError.value = ''
  try {
    for (const file of files) {
      if (photos.value.length >= 10) { imageError.value = 'Chỉ được tải tối đa 10 ảnh.'; break }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        imageError.value = 'Chỉ nhận JPG, PNG, WEBP tối đa 5 MB mỗi ảnh.'
        continue
      }
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      photos.value.push(await optimizeStoredPhoto(url))
    }
  } catch { imageError.value = 'Không đọc được ảnh. Vui lòng chọn lại.' }
  finally { uploading.value = false; if (event.target.type === 'file') event.target.value = '' }
}
async function save() {
  if (uploading.value || props.saving) return
  Object.keys(errors).forEach(key => delete errors[key])
  if (!form.title?.trim()) errors.title = 'Vui lòng nhập tiêu đề bài đăng.'
  if (!roommate && !form.houseId) errors.houseId = 'Vui lòng chọn nhà trọ.'
  if (roommate && form.houseId && !houseDirectory.houses.some(house => house.id === form.houseId && house.status === 'Đang hoạt động')) errors.houseId = 'Vui lòng chọn lại nhà trọ trong danh sách của chủ trọ.'
  if (roommate && !form.address?.trim()) errors.address = 'Vui lòng nhập địa chỉ.'
  if (roommate && !['Tất cả', 'Nam', 'Nữ'].includes(form.gender)) errors.gender = 'Vui lòng chọn đối tượng.'
  if (roommate && !/^\d{4}-\d{2}-\d{2}$/.test(form.moveIn || '')) errors.moveIn = 'Vui lòng chọn ngày có thể chuyển vào.'
  for (const [key, , min, required] of numericFields) {
    const missing = form[key] === '' || form[key] == null
    if ((required && missing) || (!missing && (!Number.isFinite(Number(form[key])) || Number(form[key]) < min))) errors[key] = `Vui lòng nhập số từ ${min} trở lên.`
    if (!missing && ['area', 'count', 'people'].includes(key) && !Number.isInteger(Number(form[key]))) errors[key] = 'Vui lòng nhập số nguyên.'
  }
  const errorKeys = Object.keys(errors)
  if (errorKeys.length) {
    const addressErrorKeys = new Set(['houseId', 'address'])
    tab.value = errorKeys.every(key => addressErrorKeys.has(key)) ? 'address' : 'general'
    await nextTick()
    document.querySelector(`.rental-editor [data-tab="${tab.value}"] [aria-invalid="true"]`)?.focus()
    return
  }
  if (!photos.value.length) { tab.value = 'images'; imageError.value = 'Giữ lại ít nhất một ảnh cho bài đăng.'; return }
  uploading.value = true
  try {
    // Also optimize photos loaded from older posts, not only newly selected files.
    const optimized = []
    for (const photo of photos.value) optimized.push(await optimizeStoredPhoto(photo))
    photos.value = optimized
  } catch (error) {
    tab.value = 'images'
    imageError.value = error.message
    return
  } finally { uploading.value = false }
  const house = houseOptions.value.find(h => h.id === form.houseId)
  const updated = { ...form, title: form.title.trim(), images: [...photos.value], image: photos.value[0] }
  if (!roommate) {
    updated.house = house.name
    updated.curfew = form.curfew || null
    if (form.houseId !== props.post.houseId && house.address) updated.address = house.address
  } else {
    updated.address = (form.address || '').trim()
    const linkedHouse = houseDirectory.houses.find(item => item.id === form.houseId)
    if (linkedHouse && updated.address !== (linkedHouse.address || '').trim()) {
      updated.houseId = ''
      updated.house = ''
    }
  }
  for (const [key] of numericFields) if (form[key] !== '' && form[key] != null) updated[key] = Number(form[key])
  if (roommate) updated.totalRent = updated.price
  emit('save', updated)
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop rental-editor-backdrop" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
      <section v-dialog-focus class="rental-editor" role="dialog" aria-modal="true" aria-labelledby="rental-edit-title">
        <aside class="editor-sidebar">
          <div class="editor-brand"><Icon name="edit" :size="20"/><strong>{{ roommate ? 'Bài đăng ghép trọ' : 'Bài đăng trọ' }}</strong></div>
          <nav aria-label="Mục chỉnh sửa bài đăng">
            <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: tab === item.id }" :aria-current="tab === item.id ? 'page' : undefined" @click="tab = item.id">
              <Icon :name="item.icon" :size="18"/>{{ item.label }}
            </button>
          </nav>
        </aside>
        <div class="editor-main">
          <header class="editor-header" :class="{ 'section-header': tab !== 'general' }">
            <div><span class="eyebrow">{{ roommate ? 'Chỉnh sửa bài ghép trọ' : 'Chỉnh sửa bài cho thuê' }}</span><h2 id="rental-edit-title">{{ tabs.find(item => item.id === tab).label }}</h2></div>
            <button type="button" class="icon-button" aria-label="Đóng chỉnh sửa bài đăng" @click="emit('close')"><Icon name="close"/></button>
          </header>
          <form id="rental-edit-form" class="editor-content" novalidate @submit.prevent="save">
            <div v-show="tab === 'general'" data-tab="general" class="editor-grid">
              <label class="field title-field"><span>Tiêu đề bài đăng *</span><input v-model="form.title" aria-label="Tiêu đề bài đăng *" maxlength="100" :aria-invalid="!!errors.title"><small v-if="errors.title" class="error">{{ errors.title }}</small></label>
              <div class="field status-field"><span>Trạng thái</span><AppDropdown v-model="form.status" label="Trạng thái" :options="statuses" /></div>
              <template v-if="roommate">
                <div class="field"><span>Đối tượng (nam/nữ) *</span><AppDropdown v-model="form.gender" label="Đối tượng (nam/nữ) *" :options="['Tất cả', 'Nam', 'Nữ']" :invalid="!!errors.gender"/><small v-if="errors.gender" class="error">{{ errors.gender }}</small></div>
                <div class="field"><span>Trường đại học nhắm tới</span><AppDropdown v-model="form.school" label="Trường đại học nhắm tới" :options="universityOptions"/></div>
                <label class="field"><span>Ngày có thể chuyển vào *</span><input v-model="form.moveIn" type="date" :aria-invalid="!!errors.moveIn"><small v-if="errors.moveIn" class="error">{{ errors.moveIn }}</small></label>
              </template>
              <template v-else>
                <label class="field"><span>Giờ giấc</span><input v-model="form.curfew" type="time"><small class="help">Để trống nếu giờ giấc tự do.</small></label>
              </template>
              <label v-for="[key, label, min, required] in numericFields" :key="key" class="field"><span>{{ label }}{{ required ? ' *' : '' }}</span><input v-model="form[key]" :aria-label="label+(required ? ' *' : '')" type="number" :min="min" :step="['area', 'count', 'people'].includes(key) ? 1 : 'any'" :aria-invalid="!!errors[key]"><small v-if="errors[key]" class="error">{{ errors[key] }}</small></label>
              <label class="field full-width"><span>Chi phí khác</span><input v-model="form.other" placeholder="Ví dụ: Giữ xe 50.000đ; rác 20.000đ"></label>
              <label class="field full-width"><span>Mô tả chi tiết phòng</span><textarea v-model="form.desc" rows="4"/></label>
              <label v-if="roommate" class="field full-width"><span>Thói quen sống / lưu ý khác</span><textarea v-model="form.habits" rows="3"/></label>
            </div>
            <div v-show="tab === 'address'" data-tab="address" class="editor-grid">
              <template v-if="roommate">
                <div class="field full-width"><span>Nhà trọ</span><AppDropdown :model-value="form.houseId || ''" @update:model-value="selectRoommateHouse" label="Nhà trọ" :options="roommateHouseOptions" :invalid="!!errors.houseId" :disabled="houseDirectory.loading"/><small v-if="houseDirectory.error || errors.houseId" class="error">{{ houseDirectory.error || errors.houseId }}</small><small v-else class="help">Chọn nhà trọ trong hệ thống để tự động điền địa chỉ hoặc nhập địa chỉ thủ công bên dưới.</small></div>
                <label class="field full-width"><span>Địa chỉ *</span><input v-model="form.address" aria-label="Địa chỉ *" placeholder="Ví dụ: 123 đường 3/2, Ninh Kiều, Cần Thơ" :aria-invalid="!!errors.address"><small v-if="errors.address" class="error">{{ errors.address }}</small></label>
              </template>
              <template v-else>
                <div class="field full-width"><span>Chọn nhà trọ *</span><AppDropdown v-model="form.houseId" label="Chọn nhà trọ *" :invalid="!!errors.houseId" :options="[{ value: '', label: 'Chọn nhà trọ' }, ...houseOptions.map(h => ({ value: h.id, label: h.name }))]" /><small v-if="errors.houseId" class="error">{{ errors.houseId }}</small></div>
                <label class="field full-width"><span>Địa chỉ</span><input :value="selectedHouseAddress" readonly aria-label="Địa chỉ"><small class="help">Địa chỉ được lấy tự động từ nhà trọ đã chọn.</small></label>
              </template>
            </div>
            <div v-show="tab === 'images'">
              <p class="muted editor-intro">Ảnh đầu tiên là ảnh bìa. Bạn có thể đặt ảnh khác làm ảnh bìa trước khi lưu.</p>
              <div class="editor-photos" :class="{ 'is-empty': !photos.length, dragging }" :aria-busy="uploading"
                @dragenter.prevent="dragEnter" @dragleave.prevent="dragLeave"
                @dragover.prevent="$event.dataTransfer.dropEffect = 'copy'" @drop.prevent="addPhotos">
                <figure v-for="(photo, index) in photos" :key="index">
                  <img :src="photo" :alt="'Ảnh phòng ' + (index + 1)">
                  <span v-if="index === 0" class="badge cream">Ảnh bìa</span>
                  <button type="button" class="photo-remove" :aria-label="'Xóa ảnh ' + (index + 1)" @click="photos.splice(index, 1)"><Icon name="close" :size="16"/></button>
                  <button v-if="index > 0" type="button" class="photo-cover" @click="photos.unshift(...photos.splice(index, 1))">Đặt làm ảnh bìa</button>
                </figure>
                <label v-if="photos.length < 10" class="editor-upload" :class="{ 'is-empty': !photos.length }">
                  <Icon name="upload" :size="photos.length ? 26 : 38"/>
                  <template v-if="!photos.length"><strong>{{ uploading ? 'Đang đọc ảnh…' : 'Nhấp để chọn hoặc kéo ảnh vào đây' }}</strong><small>JPG, PNG, WEBP · tối đa 5 MB/ảnh, 10 ảnh</small></template>
                  <span v-else class="upload-caption">{{ uploading ? 'Đang đọc ảnh…' : 'Thêm ảnh' }}</span>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" :disabled="uploading" aria-label="Thêm ảnh bài đăng" @change="addPhotos">
                </label>
              </div>
              <p v-if="imageError" class="error" role="alert">{{ imageError }}</p>
            </div>
            <div v-show="tab === 'amenities'" class="editor-amenities"><fieldset v-for="[label, key, items] in amenityGroups" :key="key"><legend>{{ label }}</legend><div><label v-for="item in items" :key="item" class="check"><input v-model="form[key]" type="checkbox" :value="item">{{ item }}</label></div></fieldset></div>
          </form>
          <footer class="editor-footer">
            <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
            <div><button type="button" class="button secondary" @click="emit('close')">Hủy</button><button type="submit" form="rental-edit-form" class="button primary" :disabled="uploading || saving"><Icon name="check" :size="18"/>{{ saving ? 'Đang lưu…' : uploading ? 'Đang xử lý ảnh…' : 'Lưu thay đổi' }}</button></div>
          </footer>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.rental-editor-backdrop { padding: 24px; }
.rental-editor { width: min(1100px, 100%); height: min(800px, calc(100dvh - 48px)); display: grid; grid-template-columns: 210px minmax(0, 1fr); background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.editor-sidebar { padding: 26px 16px; background: var(--cream); border-right: 1px solid var(--line); }
.editor-brand { display: flex; align-items: center; gap: 10px; padding: 0 10px 24px; font-size: 16px; }
.editor-sidebar nav { display: grid; gap: 8px; }
.editor-sidebar nav button { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 12px; border-radius: 9px; text-align: left; font-size: 13px; }
.editor-sidebar nav button:hover, .editor-sidebar nav button.active { background: var(--cream-deep); }
.editor-sidebar nav button.active { font-weight: 600; }
.editor-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.editor-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 30px 20px; border-bottom: 1px solid var(--line); }
.editor-header h2 { margin: 5px 0 0; font-size: 23px; }
.editor-header .icon-button { flex-shrink: 0; width: 44px; height: 44px; }
.section-header { position: relative; justify-content: center; text-align: center; padding-inline: 70px; }
.section-header .eyebrow { display: none; }
.section-header .icon-button { position: absolute; right: 20px; }
.editor-content { flex: 1; overflow-y: auto; padding: 24px 30px; min-height: 0; }
.editor-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px 22px; }
.editor-grid .field { min-width: 0; margin: 0; font-size: 13px; grid-column: span 2; }
.editor-grid .full-width { grid-column: 1 / -1; }
.editor-grid .title-field { grid-column: span 3; }
.editor-grid .status-field { grid-column: span 1; }
.editor-grid :is(input, select, textarea) { min-width: 0; width: 100%; }
.editor-grid .help { margin: 0; font-size: 12px; }
.editor-footer { padding: 18px 30px; border-top: 1px solid var(--line); background: #fff; }
.editor-footer > div { display: flex; justify-content: flex-end; gap: 12px; }
.editor-footer > p { margin: 0 0 12px; }
.editor-footer .button { min-height: 44px; font-size: 13px; }
.editor-intro { margin-top: 0; font-size: 13px; }
.editor-upload { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; aspect-ratio: 1; min-width: 0; padding: 16px; border: 1px dashed var(--muted); border-radius: 6px; background: var(--cream); text-align: center; font-size: 13px; }
.editor-upload.is-empty { aspect-ratio: auto; min-height: 340px; }
.editor-upload small { color: var(--muted); line-height: 1.6; }
.editor-upload:hover { background: var(--cream-deep); }
.editor-upload input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.editor-upload:focus-within { outline: 3px solid var(--cyan); }
.editor-photos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.editor-photos.is-empty { grid-template-columns: minmax(0, 1fr); }
.editor-photos.dragging { outline: 2px solid #638d92; outline-offset: 5px; border-radius: 6px; }
.editor-photos figure { position: relative; aspect-ratio: 1; min-width: 0; margin: 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.editor-photos img { display: block; width: 100%; height: 100%; object-fit: cover; }
.editor-photos .badge { position: absolute; top: 8px; left: 8px; }
.photo-remove { position: absolute; top: 4px; right: 4px; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 50%; background: #fff; color: var(--ink); }
.photo-remove:hover { background: var(--coral); }
.photo-cover { position: absolute; bottom: 0; left: 0; width: 100%; min-height: 44px; padding: 6px; background: #fffffff0; font-size: 12px; }
.photo-cover:hover { background: var(--cream-deep); }
.editor-amenities fieldset { margin: 0 0 24px; padding: 0; border: 0; }
.editor-amenities legend { margin-bottom: 14px; font-size: 16px; font-weight: 600; }
.editor-amenities fieldset > div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 18px; border: 1px solid var(--muted); padding: 12px 16px; }
.editor-amenities .check { min-height: 44px; margin: 0; font-size: 13px; }
@media (max-width: 700px) {
  .rental-editor-backdrop { padding: 12px; }
  .rental-editor { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); height: calc(100dvh - 24px); border-radius: 14px; }
  .editor-sidebar { padding: 10px; border-right: 0; border-bottom: 1px solid var(--line); }
  .editor-brand { display: none; }
  .editor-sidebar nav { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .editor-sidebar nav button { justify-content: center; gap: 6px; min-height: 44px; padding: 8px 10px; font-size: 12px; }
  .editor-sidebar nav button svg { width: 16px; flex-shrink: 0; }
  .editor-header { padding: 16px 18px; }
  .editor-header h2 { font-size: 20px; }
  .editor-content { padding: 20px 18px; }
  .editor-grid { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .editor-grid .field { grid-column: 1 / -1; }
  .editor-footer { padding: 14px 18px; }
  .editor-photos { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .section-header { padding-inline: 60px; }
  .section-header .icon-button { right: 10px; }
  .editor-upload.is-empty { min-height: 280px; }
  .editor-amenities fieldset > div { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 10px; }
  .editor-amenities .check { overflow-wrap: anywhere; }
}
</style>
