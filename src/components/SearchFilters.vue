<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { amenities, districts } from '../data'
import { priceRanges, schools } from '../search-filters'

const model = defineModel({ required: true })
const root = ref(null), panel = ref(null), active = ref('')
const opensUp = ref(false), popupMaxHeight = ref('')
const locationTab = ref(model.value.district ? 'region' : 'school'), locationListOpen = ref(true)
watch(() => [model.value.school, model.value.district], ([school, district]) => {
  if (district) locationTab.value = 'region'
  else if (school) locationTab.value = 'school'
})
const triggers = {}
let pointerInside = false
const selectedSchool = computed(() => schools.find(school => school.id === model.value.school))
const locationLabel = computed(() => selectedSchool.value?.shortName || model.value.district || 'Địa điểm')
const fullLocation = computed(() => selectedSchool.value?.name || model.value.district || '')
const priceLabel = computed(() => model.value.prices.length === 1 ? priceRanges.find(range => range.id === model.value.prices[0])?.label : 'Khoảng giá')
const locationOptions = computed(() => locationTab.value === 'school'
  ? schools.map(school => ({ value: school.id, label: school.name }))
  : districts.map(district => ({ value: district, label: district })))
const selectedLocation = computed(() => locationTab.value === 'school' ? model.value.school : model.value.district)

function patch(value) { model.value = { ...model.value, ...value } }
function close(restoreFocus = false) {
  const trigger = triggers[active.value]
  active.value = ''
  if (restoreFocus) trigger?.focus()
}
async function toggle(name) {
  if (active.value === name) return close()
  active.value = name
  locationListOpen.value = true
  await positionPanel()
  panel.value?.querySelector('button, input')?.focus()
}
async function positionPanel() {
  if (!active.value) return
  popupMaxHeight.value = ''
  opensUp.value = false
  await nextTick()
  const trigger = triggers[active.value]
  if (!trigger || !panel.value) return
  const rect = trigger.getBoundingClientRect()
  const headerBottom = Math.max(0, document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0)
  const bottomNav = document.querySelector('.bottom-nav')?.getBoundingClientRect().height || 0
  const above = rect.top - headerBottom - 24
  const below = window.innerHeight - bottomNav - rect.bottom - 24
  opensUp.value = panel.value.getBoundingClientRect().height > below && above > below
  popupMaxHeight.value = Math.max(140, opensUp.value ? above : below) + 'px'
}
function outside(event) {
  const inside = root.value?.contains(event.target)
  if (event.type === 'pointerdown') pointerInside = !!inside
  // A label can briefly focus the outer <main> before forwarding its click to
  // the checkbox. Keep the panel mounted until that pointer interaction ends.
  if (event.type === 'focusin' && pointerInside) return
  if (!inside) close()
}
function endPointer() { pointerInside = false }
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  document.addEventListener('pointerup', endPointer)
  document.addEventListener('pointercancel', endPointer)
  window.addEventListener('resize', positionPanel)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('focusin', outside)
  document.removeEventListener('pointerup', endPointer)
  document.removeEventListener('pointercancel', endPointer)
  window.removeEventListener('resize', positionPanel)
})
function changeLocationTab(tab) {
  if (locationTab.value === tab) return
  locationTab.value = tab
  locationListOpen.value = true
  patch({ school: '', district: '' })
  positionPanel()
}
function openFromKeyboard(name) {
  if (active.value === name) panel.value?.querySelector('button, input')?.focus()
  else toggle(name)
}
function tabKeys(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  changeLocationTab(event.key === 'Home' ? 'school' : event.key === 'End' ? 'region' : locationTab.value === 'school' ? 'region' : 'school')
  nextTick(() => panel.value?.querySelector('[role=tab][aria-selected=true]')?.focus())
}
function selectLocation(value) {
  patch(locationTab.value === 'school' ? { school: value, district: '' } : { school: '', district: value })
  close(true)
}
function toggleChoice(key, value) {
  patch({ [key]: model.value[key].includes(value) ? model.value[key].filter(item => item !== value) : [...model.value[key], value] })
}
defineExpose({ close })
</script>

<template>
  <div ref="root" class="hero-search-filters" @keydown.esc.stop.prevent="close(true)">
    <div class="filter-control">
      <button :ref="el => triggers.location = el" type="button" class="filter-trigger"
        :class="{ 'is-active': active === 'location', 'has-value': fullLocation }"
        :aria-label="fullLocation ? 'Địa điểm: ' + fullLocation : 'Địa điểm'"
        :aria-expanded="active === 'location'" aria-haspopup="dialog" aria-controls="home-location-filter"
        :title="fullLocation || 'Chọn trường học hoặc khu vực'" @click="toggle('location')" @keydown.down.prevent="openFromKeyboard('location')">
        <Icon name="pin" :size="21" /><span class="trigger-label">{{ locationLabel }}</span><Icon class="filter-chevron" name="down" :size="18" />
      </button>
      <section v-if="active === 'location'" id="home-location-filter" ref="panel" class="filter-popover location-popover" :class="{ 'opens-up': opensUp }" :style="{ maxHeight: popupMaxHeight }" role="dialog" aria-label="Chọn địa điểm">
        <div class="location-tabs" role="tablist" aria-label="Cách chọn địa điểm" @keydown="tabKeys">
          <button id="location-school-tab" type="button" role="tab" :tabindex="locationTab === 'school' ? 0 : -1" :aria-selected="locationTab === 'school'" aria-controls="location-options" @click="changeLocationTab('school')">Theo địa điểm</button>
          <button id="location-region-tab" type="button" role="tab" :tabindex="locationTab === 'region' ? 0 : -1" :aria-selected="locationTab === 'region'" aria-controls="location-options" @click="changeLocationTab('region')">Theo khu vực</button>
        </div>
        <div id="location-options" role="tabpanel" :aria-labelledby="locationTab === 'school' ? 'location-school-tab' : 'location-region-tab'">
          <p class="filter-hint">{{ locationTab === 'school' ? 'Chọn trường đại học, cao đẳng' : 'Chọn khu vực bạn muốn ở' }}</p>
          <button type="button" class="location-select" :aria-expanded="locationListOpen" aria-controls="location-choice-list" @click="locationListOpen = !locationListOpen">
            <span>{{ selectedLocation ? fullLocation : locationTab === 'school' ? 'Theo tất cả địa điểm' : 'Tất cả khu vực' }}</span><Icon name="down" :size="18" :class="{ 'is-rotated': locationListOpen }" />
          </button>
          <div v-if="locationListOpen" id="location-choice-list" class="location-options" role="group" :aria-label="locationTab === 'school' ? 'Trường đại học, cao đẳng' : 'Khu vực'">
            <button type="button" :aria-pressed="!selectedLocation" @click="selectLocation('')"><span>{{ locationTab === 'school' ? 'Tất cả trường học' : 'Tất cả khu vực' }}</span><Icon v-if="!selectedLocation" name="check" :size="18" /></button>
            <button v-for="option in locationOptions" :key="option.value" type="button" :aria-pressed="selectedLocation === option.value" @click="selectLocation(option.value)"><span>{{ option.label }}</span><Icon v-if="selectedLocation === option.value" name="check" :size="18" /></button>
          </div>
        </div>
      </section>
    </div>

    <div class="filter-control">
      <button :ref="el => triggers.price = el" type="button" class="filter-trigger" :class="{ 'is-active': active === 'price', 'has-value': model.prices.length }"
        :aria-label="model.prices.length ? 'Khoảng giá: ' + model.prices.length + ' khoảng đã chọn' : 'Khoảng giá'"
        :aria-expanded="active === 'price'" aria-haspopup="dialog" aria-controls="home-price-filter" @click="toggle('price')" @keydown.down.prevent="openFromKeyboard('price')">
        <span class="currency-icon" aria-hidden="true">₫</span><span class="trigger-label">{{ priceLabel }}</span><span v-if="model.prices.length > 1" class="filter-count">{{ model.prices.length }}</span><Icon class="filter-chevron" name="down" :size="18" />
      </button>
      <section v-if="active === 'price'" id="home-price-filter" ref="panel" class="filter-popover price-popover" :class="{ 'opens-up': opensUp }" :style="{ maxHeight: popupMaxHeight }" role="dialog" aria-labelledby="home-price-heading">
        <div class="filter-popover-heading"><h3 id="home-price-heading">Khoảng giá</h3><button type="button" class="clear-selection" aria-label="Bỏ chọn" title="Bỏ chọn tất cả khoảng giá" :disabled="!model.prices.length" @click="patch({ prices: [] })"><Icon name="reset" :size="22" /></button></div><p class="filter-hint">Giá thuê mỗi tháng · Có thể chọn nhiều khoảng</p>
        <div class="filter-checkbox-grid">
          <label v-for="range in priceRanges" :key="range.id" class="filter-checkbox" :class="{ 'is-checked': model.prices.includes(range.id) }"><input type="checkbox" :checked="model.prices.includes(range.id)" @change="toggleChoice('prices', range.id)"><span>{{ range.label }}</span></label>
        </div>
        <div class="filter-popover-footer selection-footer"><button type="button" class="finish-filter" @click="close(true)">Xong<Icon name="check" :size="16" /></button></div>
      </section>
    </div>

    <div class="filter-control">
      <button :ref="el => triggers.amenities = el" type="button" class="filter-trigger" :class="{ 'is-active': active === 'amenities', 'has-value': model.amenities.length }"
        :aria-label="model.amenities.length ? 'Tiện ích: ' + model.amenities.length + ' tiện ích đã chọn' : 'Tiện ích'"
        :aria-expanded="active === 'amenities'" aria-haspopup="dialog" aria-controls="home-amenities-filter" @click="toggle('amenities')" @keydown.down.prevent="openFromKeyboard('amenities')">
        <Icon name="filter" :size="21" /><span class="trigger-label">Tiện ích</span><span v-if="model.amenities.length" class="filter-count">{{ model.amenities.length }}</span><Icon class="filter-chevron" name="down" :size="18" />
      </button>
      <section v-if="active === 'amenities'" id="home-amenities-filter" ref="panel" class="filter-popover amenities-popover" :class="{ 'opens-up': opensUp }" :style="{ maxHeight: popupMaxHeight }" role="dialog" aria-labelledby="home-amenities-heading">
        <div class="filter-popover-heading"><h3 id="home-amenities-heading">Tiện ích</h3><button type="button" class="clear-selection" aria-label="Bỏ chọn" title="Bỏ chọn tất cả tiện ích" :disabled="!model.amenities.length" @click="patch({ amenities: [] })"><Icon name="reset" :size="22" /></button></div><p class="filter-hint">Chọn các tiện ích bạn cần cho căn phòng</p>
        <div class="filter-checkbox-grid">
          <label v-for="amenity in amenities" :key="amenity" class="filter-checkbox" :class="{ 'is-checked': model.amenities.includes(amenity) }"><input type="checkbox" :checked="model.amenities.includes(amenity)" @change="toggleChoice('amenities', amenity)"><span>{{ amenity }}</span></label>
        </div>
        <div class="filter-popover-footer selection-footer"><button type="button" class="finish-filter" @click="close(true)">Xong<Icon name="check" :size="16" /></button></div>
      </section>
    </div>
    <button type="submit" class="button primary search-submit">Tìm kiếm <Icon name="arrow" :size="21" /></button>
  </div>
</template>

<style scoped>
.hero-search-filters{display:grid;grid-template-columns:minmax(0,1.2fr) repeat(2,minmax(0,1fr)) auto;gap:12px;margin-top:18px;text-align:left}
.filter-control{position:relative;min-width:0}
.filter-trigger{display:flex;align-items:center;gap:10px;width:100%;height:50px;padding:0 14px;background:#fff;border:1px solid #d9d9d9;border-radius:999px;text-align:left;font-size:15px;transition:border-color .18s,background-color .18s,box-shadow .18s}
.filter-trigger:hover,.filter-trigger.is-active{border-color:var(--ink);background:#fffdf7}
.filter-trigger.has-value{border-color:#7b9694}
.filter-trigger>svg,.currency-icon{flex-shrink:0}
.trigger-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.filter-chevron{margin-left:auto;transition:transform .18s}
.filter-trigger.is-active .filter-chevron,.is-rotated{transform:rotate(180deg)}
.currency-icon{font-size:23px;line-height:1;font-weight:600;width:21px;text-align:center}
.filter-count{display:grid;place-items:center;min-width:22px;height:22px;padding:0 5px;border-radius:999px;background:var(--cream-deep);font-size:12px;font-weight:600;flex-shrink:0}
.hero-search-filters>.search-submit{min-height:50px;padding:0 22px;font-size:15px;gap:14px;white-space:nowrap}
.filter-popover{display:flex;flex-direction:column;position:absolute;z-index:30;top:calc(100% + 12px);width:430px;max-width:calc(100vw - 48px);padding:20px;border:1px solid #b9b9ad;border-radius:20px;background:var(--cream);box-shadow:0 14px 38px #1314141f;text-align:left;animation:appear .18s ease-out}
.filter-popover.opens-up{top:auto;bottom:calc(100% + 12px)}
.filter-popover>h3,.filter-popover>.filter-hint,.filter-popover-footer,.location-tabs,.location-select{flex-shrink:0}
#location-options{display:flex;flex-direction:column;min-height:0}
.location-popover{left:0}
.price-popover{left:50%;transform:translateX(-50%);animation:none}
.amenities-popover{right:0}
.filter-popover h3{margin:0;font-family:inherit;font-size:20px;line-height:1.4}
.filter-popover-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0}
.clear-selection{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:50%;transition:background-color .18s}
.clear-selection:hover:not(:disabled){background:var(--cream-deep)}
.filter-popover-footer.selection-footer{justify-content:flex-end}
.filter-hint{margin:6px 0 16px;color:#526065;font-size:13px;line-height:1.5}
.location-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid #c6c8c0;border-radius:12px;background:#eeeade}
.location-tabs button{min-height:44px;padding:8px;font-size:14px;border:1px solid transparent;border-radius:9px}
.location-tabs button[aria-selected=true]{background:white;border-color:var(--ink);font-weight:600;box-shadow:0 2px 4px #13141409}
.location-select{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:12px 14px;border:1px solid #b9b9ad;border-radius:12px;background:#fff;text-align:left;font-size:15px}
.location-select svg{flex-shrink:0;transition:transform .18s}
.location-options{min-height:0;max-height:290px;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;border:1px solid #d4d5ca;border-radius:12px;margin-top:10px;padding:5px;background:#fff}
.location-options button{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;width:100%;padding:10px;text-align:left;border-radius:7px;font-size:15px;line-height:1.5}
.location-options button:hover{background:var(--cream)}
.location-options button[aria-pressed=true]{background:var(--cream-deep);font-weight:600}
.location-options svg{flex-shrink:0}
.location-options,.filter-checkbox-grid{scrollbar-width:thin;scrollbar-color:#a6aea8 #f1f0e8}
.location-options::-webkit-scrollbar,.filter-checkbox-grid::-webkit-scrollbar{width:7px}
.location-options::-webkit-scrollbar-thumb,.filter-checkbox-grid::-webkit-scrollbar-thumb{background:#a6aea8;border-radius:8px}
.filter-checkbox-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;min-height:0;max-height:310px;overflow-y:auto;overscroll-behavior:contain}
.filter-checkbox{display:flex;align-items:center;gap:10px;min-height:48px;padding:8px 5px;border-radius:8px;font-size:15px;line-height:1.5;cursor:pointer}
.filter-checkbox:hover{background:#f0ecdf}
.filter-checkbox.is-checked{background:var(--cream-deep)}
.filter-checkbox input{width:19px;height:19px;flex-shrink:0;accent-color:#365f62;cursor:pointer}
.filter-popover-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:14px;margin-top:14px;border-top:1px solid var(--line)}
.clear-filter,.finish-filter{min-height:44px;padding:9px 16px;border-radius:999px;font-size:14px}
.clear-filter{text-decoration:underline;text-underline-offset:3px}
.clear-filter:disabled{opacity:.45;cursor:default}
.finish-filter{display:flex;align-items:center;gap:10px;background:var(--gold);font-weight:600}
.finish-filter:hover{background:var(--gold-hover)}
button:focus-visible,input:focus-visible{outline:2px solid #365f62;outline-offset:3px}
@media(max-width:800px){.hero-search-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.price-popover{left:auto;right:0;transform:none}.amenities-popover{left:0;right:auto}}
@media(max-width:600px){.hero-search-filters{grid-template-columns:minmax(0,1fr);gap:10px;margin-top:14px}.filter-trigger{height:48px;font-size:16px}.hero-search-filters>.search-submit{min-height:48px;font-size:16px}.filter-popover{left:0;right:auto;width:100%;max-width:none;padding:16px;border-radius:16px}.filter-checkbox-grid{max-height:240px;gap:4px 8px}.filter-checkbox{font-size:16px;gap:8px;min-height:52px}.filter-hint{font-size:14px}.location-options{max-height:240px}.location-options button,.location-select{font-size:16px}.location-tabs button{font-size:14px}}
@media(prefers-reduced-motion:reduce){.filter-popover{animation:none}.filter-chevron,.location-select svg,.filter-trigger{transition:none}}
</style>
