<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { amenities, nearby, districts, money } from '../data'
import { schools } from '../search-filters'

const model = defineModel({ required: true })
const emit = defineEmits(['start', 'reset'])
const locationOpen = ref(false), locationButton = ref(null), activeHandle = ref('max')
const lowerLimit = 500_000, upperLimit = 5_000_000, step = 100_000
const lifestyleOptions = [
  'Giờ giấc tự do',
  'Yên tĩnh',
  'Không hút thuốc',
  'Gọn gàng',
  'Nuôi thú cưng',
  'Người thân qua đêm',
  'Nam nữ ở chung',
  'Ưu tiên nữ',
  'Thích thể thao',
]
const selectedSchool = computed(() => schools.find(school => school.id === model.value.school))
const locationLabel = computed(() => model.value.locationMode === 'place' ? selectedSchool.value?.name || 'Tất cả trường học' : model.value.district || 'Tất cả khu vực')
const locationOptions = computed(() => model.value.locationMode === 'place' ? schools.map(school => ({ value: school.id, label: school.name })) : districts.map(district => ({ value: district, label: district })))
const selectedLocation = computed(() => model.value.locationMode === 'place' ? model.value.school : model.value.district)
const fromPercent = computed(() => (model.value.budgetMin - lowerLimit) / (upperLimit - lowerLimit) * 100)
const toPercent = computed(() => (model.value.budgetMax - lowerLimit) / (upperLimit - lowerLimit) * 100)
function patch(value) { model.value = { ...model.value, ...value } }
function changeMode(mode) {
  if (model.value.locationMode === mode) return
  patch({ locationMode: mode, school: '', district: '' })
  locationOpen.value = true
}
function chooseLocation(value) {
  patch(model.value.locationMode === 'place' ? { school: value, district: '' } : { school: '', district: value })
  locationOpen.value = false
  locationButton.value?.focus()
}
function toggle(key, value) {
  const current = model.value[key] || []
  patch({ [key]: current.includes(value) ? current.filter(item => item !== value) : [...current, value] })
}
function updateMinimum(value) { patch({ budgetMin: Math.max(lowerLimit, Math.min(Number(value), model.value.budgetMax - step)) }) }
function updateMaximum(value) { patch({ budgetMax: Math.min(upperLimit, Math.max(Number(value), model.value.budgetMin + step)) }) }
function chooseBudget(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const value = Math.round((lowerLimit + ratio * (upperLimit - lowerLimit)) / step) * step
  if (Math.abs(value - model.value.budgetMin) < Math.abs(value - model.value.budgetMax)) updateMinimum(value)
  else updateMaximum(value)
}
function reset() { locationOpen.value = false; emit('reset') }
</script>

<template>
  <aside class="match-filters" aria-label="Bộ lọc ghép trọ">
    <header class="match-filter-header">
      <div class="match-filter-kicker"><span><Icon name="users" :size="17" />GHÉP TRỌ CÙNG GU</span><button type="button" class="match-reset" aria-label="Đặt lại bộ lọc ghép trọ" title="Đặt lại bộ lọc" @click="reset"><Icon name="reset" :size="20" /></button></div>
      <h2>Tìm người hợp mình</h2><p>Bắt đầu từ những điều nhỏ<br class="desktop-break"> trong cuộc sống.</p>
    </header>

    <div class="match-filter-body">
      <section class="match-location-group" aria-labelledby="match-location-heading">
        <div class="match-section-heading"><h3 id="match-location-heading"><Icon name="pin" :size="18" />Địa điểm</h3></div>
        <div class="match-location-tabs" aria-label="Cách chọn địa điểm">
          <button type="button" :aria-pressed="model.locationMode === 'place'" @click="changeMode('place')">Theo địa điểm</button>
          <button type="button" :aria-pressed="model.locationMode === 'area'" @click="changeMode('area')">Theo khu vực</button>
        </div>
        <p class="match-field-label">{{ model.locationMode === 'place' ? 'Trường đại học, cao đẳng' : 'Khu vực muốn ở' }}</p>
        <button ref="locationButton" type="button" class="match-location-select" :aria-expanded="locationOpen" aria-controls="match-location-options" :aria-label="(model.locationMode === 'place' ? 'Chọn trường học: ' : 'Chọn khu vực: ') + locationLabel" @click="locationOpen = !locationOpen" @keydown.esc="locationOpen = false">
          <span>{{ locationLabel }}</span><Icon name="down" :size="18" :class="{ 'turned': locationOpen }" />
        </button>
        <div v-if="locationOpen" id="match-location-options" class="match-location-options" role="group" :aria-label="model.locationMode === 'place' ? 'Danh sách trường học' : 'Danh sách khu vực'" @keydown.esc.stop="locationOpen = false; locationButton?.focus()">
          <button type="button" :aria-pressed="!selectedLocation" @click="chooseLocation('')"><span>{{ model.locationMode === 'place' ? 'Tất cả trường học' : 'Tất cả khu vực' }}</span><Icon v-if="!selectedLocation" name="check" :size="17" /></button>
          <button v-for="option in locationOptions" :key="option.value" type="button" :aria-pressed="selectedLocation === option.value" @click="chooseLocation(option.value)"><span>{{ option.label }}</span><Icon v-if="selectedLocation === option.value" name="check" :size="17" /></button>
        </div>
        <label for="match-gender" class="match-field-label gender-label">Bạn muốn ở cùng</label>
        <div class="match-select-wrapper"><select id="match-gender" :value="model.gender" @change="patch({ gender: $event.target.value })"><option value="">Không giới hạn</option><option value="Nam">Bạn nam</option><option value="Nữ">Bạn nữ</option></select><Icon name="down" :size="18" /></div>
      </section>

      <section class="match-budget-group" aria-labelledby="match-budget-heading">
        <div class="match-section-heading"><h3 id="match-budget-heading"><Icon name="wallet" :size="18" />Ngân sách mỗi người</h3><span class="match-unit">/ tháng</span></div>
        <div class="budget-values"><div><span>Từ</span><strong>{{ money(model.budgetMin) }}</strong></div><span class="budget-separator">—</span><div><span>Đến</span><strong>{{ money(model.budgetMax) }}</strong></div></div>
        <div class="budget-sliders" @pointerdown="chooseBudget">
          <div class="budget-track"></div><div class="budget-selection" :style="{ left: fromPercent + '%', right: (100 - toPercent) + '%' }"></div>
          <input type="range" :min="lowerLimit" :max="upperLimit" :step="step" :value="model.budgetMin" aria-label="Giá tối thiểu mỗi người" :aria-valuetext="money(model.budgetMin)" :style="{ zIndex: activeHandle === 'min' ? 3 : 2 }" @pointerdown.stop="activeHandle = 'min'" @focus="activeHandle = 'min'" @input="updateMinimum($event.target.value)">
          <input type="range" :min="lowerLimit" :max="upperLimit" :step="step" :value="model.budgetMax" aria-label="Giá tối đa mỗi người" :aria-valuetext="money(model.budgetMax)" :style="{ zIndex: activeHandle === 'max' ? 3 : 2 }" @pointerdown.stop="activeHandle = 'max'" @focus="activeHandle = 'max'" @input="updateMaximum($event.target.value)">
        </div>
        <div class="budget-limits"><span>500 nghìn</span><span>5 triệu</span></div>
      </section>

      <section class="match-choice-group" aria-label="Tiện ích">
        <div class="match-section-heading"><h3 id="match-amenities-heading"><Icon name="filter" :size="18" />Tiện ích nội khu</h3></div>
        <div class="match-choice-grid"><label v-for="amenity in amenities" :key="amenity" class="match-choice" :class="{ selected: (model.amenities || []).includes(amenity) }"><input type="checkbox" :checked="(model.amenities || []).includes(amenity)" @change="toggle('amenities', amenity)"><span>{{ amenity }}</span></label></div>
      </section>

      <section class="match-choice-group" aria-labelledby="match-nearby-heading">
        <div class="match-section-heading"><h3 id="match-nearby-heading"><Icon name="building" :size="18" />Tiện ích ngoại khu</h3></div>
        <div class="match-choice-grid"><label v-for="item in nearby" :key="item" class="match-choice" :class="{ selected: (model.nearby || []).includes(item) }"><input type="checkbox" :checked="(model.nearby || []).includes(item)" @change="toggle('nearby', item)"><span>{{ item }}</span></label></div>
      </section>

      <section class="match-choice-group" aria-labelledby="match-lifestyle-heading">
        <div class="match-section-heading"><h3 id="match-lifestyle-heading"><Icon name="heart" :size="18" />Phong cách sống</h3></div>
        <div class="match-choice-grid"><label v-for="habit in lifestyleOptions" :key="habit" class="match-choice" :class="{ selected: (model.habits || []).includes(habit) }"><input type="checkbox" :checked="(model.habits || []).includes(habit)" @change="toggle('habits', habit)"><span>{{ habit }}</span></label></div>
      </section>
    </div>

    <footer class="match-filter-footer"><button type="button" class="button primary full match-start" @click="locationOpen = false; emit('start')">Bắt đầu ghép trọ <Icon name="arrow" :size="19" /></button></footer>
  </aside>
</template>

<style scoped>
.match-filters{min-width:0;align-self:start;border:1px solid #dedfd5;border-radius:24px;background:#fff;box-shadow:0 5px 22px #252a2005;overflow:hidden}
.match-filter-header{padding:22px 24px 20px;border-bottom:1px solid #e8e6dd;background:linear-gradient(120deg,#fffdf7,#f9f5e9)}
.match-filter-kicker{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.match-filter-kicker>span{display:flex;align-items:center;gap:7px;color:#3c6264;font-size:10px;font-weight:600;letter-spacing:.1em}
.match-reset{display:grid;place-items:center;flex-shrink:0;min-width:44px;height:44px;border-radius:50%;color:#526065;border:1px solid #dedfd5;background:#fff}
.match-reset:hover{background:var(--cream-deep);color:var(--ink)}
.match-filter-header h2{font-size:25px;line-height:1.3;letter-spacing:-.6px}
.match-filter-header p{font-size:14px;color:#617071;line-height:1.65;margin-top:9px}
.match-filter-body{display:grid;gap:22px;padding:24px}
.match-section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}
.match-section-heading h3{display:flex;align-items:center;gap:8px;font-family:inherit;font-size:15px;font-weight:600;letter-spacing:0;line-height:1.4}
.match-section-heading h3 svg{color:#4c6967}
.match-unit{font-size:10px;color:#617071;white-space:nowrap}
.match-location-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid #dddfd3;border-radius:12px;background:#f5f3eb;margin-bottom:16px}
.match-location-tabs button{min-height:42px;padding:7px 3px;border-radius:9px;font-size:12px;font-weight:500;transition:background .18s,box-shadow .18s}
.match-location-tabs button[aria-pressed=true]{background:#fff;border:1px solid #dedfd5;box-shadow:0 2px 5px #13141409;font-weight:600;color:#273f3e}
.match-field-label{display:block;font-size:12px;font-weight:500;margin:0 0 8px;color:#455452}
.match-location-select{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;width:100%;padding:11px 13px;border:1px solid #d8dcd3;border-radius:12px;background:#fff;font-size:13px;line-height:1.5;text-align:left}
.match-location-select>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.match-location-select>svg{color:#526b69;transition:transform .18s}
.turned{transform:rotate(180deg)}
.match-location-options{max-height:218px;margin-top:8px;padding:5px;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:#a8b2a6 #f5f3eb;border:1px solid #dedfd5;border-radius:12px;background:#faf9f4}
.match-location-options button{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:44px;padding:10px;border-radius:8px;text-align:left;font-size:12px;line-height:1.5}
.match-location-options button:hover{background:#f1eedf}
.match-location-options button[aria-pressed=true]{background:var(--cream-deep);font-weight:600}
.gender-label{margin-top:16px}
.match-select-wrapper{position:relative}
.match-select-wrapper select{appearance:none;-webkit-appearance:none;background-image:none;border:1px solid #d8dcd3;border-radius:12px;padding:12px 38px 12px 13px;min-height:48px;font-size:13px}
.match-select-wrapper>svg{position:absolute;right:13px;top:50%;transform:translateY(-50%);pointer-events:none;color:#526b69}
.match-budget-group{padding-top:20px;border-top:1px solid #e8e6dd}
.budget-values{display:flex;align-items:center;gap:10px}
.budget-values>div{flex:1;display:grid;gap:3px;background:#faf8f0;border:1px solid #e8e3d3;border-radius:11px;padding:10px 12px}
.budget-values>div>span{font-size:10px;color:#617071}
.budget-values strong{font-size:15px;white-space:nowrap;font-weight:600}
.budget-separator{color:#8d968f}
.budget-sliders{height:44px;position:relative;margin:13px 10px 0;cursor:pointer}
.budget-track,.budget-selection{position:absolute;top:20px;height:4px;border-radius:999px;left:0;right:0;background:#e3e5db}
.budget-selection{background:#d5ad4c}
.budget-sliders input[type=range]{position:absolute;inset:0;appearance:none;-webkit-appearance:none;width:100%;height:44px;margin:0;padding:0;background:transparent;border:0;pointer-events:none;outline:none;box-shadow:none}
.budget-sliders input[type=range]::-webkit-slider-runnable-track{height:4px;background:transparent}
.budget-sliders input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:21px;height:21px;border:2px solid #365f62;border-radius:50%;background:#fff;box-shadow:0 2px 5px #13141415;margin-top:-8px;pointer-events:auto;cursor:grab}
.budget-sliders input[type=range]::-moz-range-track{height:4px;background:transparent}
.budget-sliders input[type=range]::-moz-range-thumb{width:18px;height:18px;border:2px solid #365f62;border-radius:50%;background:white;pointer-events:auto;cursor:grab}
.budget-sliders input:focus-visible::-webkit-slider-thumb{outline:3px solid #8fc8cf;outline-offset:3px}
.budget-sliders input:focus-visible::-moz-range-thumb{outline:3px solid #8fc8cf;outline-offset:3px}
.budget-limits{display:flex;justify-content:space-between;font-size:10px;color:#718077}
.match-choice-group{padding:16px 12px 12px;border:1px solid #e5e3d8;border-radius:16px;background:#fcfbf6}
.match-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.match-choice{display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 7px;border:1px solid transparent;border-radius:9px;font-size:13px;line-height:1.5;cursor:pointer;transition:background .18s,border-color .18s}
.match-choice:hover{background:#f1eee2}
.match-choice.selected{background:#f7eccb;border-color:#e7d59f}
.match-choice input{width:16px;height:16px;accent-color:#365f62;flex-shrink:0;cursor:pointer}
.match-filter-footer{padding:0 24px 22px}
.match-filter-footer .match-start{min-height:48px;font-size:13px;gap:12px;margin-top:0}
button:focus-visible,a:focus-visible,input[type=checkbox]:focus-visible{outline:2px solid #365f62;outline-offset:3px}
@media(min-width:601px) and (max-width:800px){.match-filter-body{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.match-budget-group{border-top:0;padding-top:0}.desktop-break{display:none}}
@media(max-width:600px){.match-filter-header{padding:20px}.match-filter-header h2{font-size:25px}.match-filter-header p{font-size:16px}.match-filter-body{padding:20px;gap:20px}.match-filter-kicker>span{font-size:10px}.match-reset{width:44px;height:44px}.desktop-break{display:none}.match-section-heading h3{font-size:16px}.match-location-tabs button{font-size:14px;min-height:44px}.match-location-select,.match-select-wrapper select{font-size:16px}.match-location-options button{font-size:16px}.match-field-label{font-size:14px}.match-choice-group{padding:14px 10px 10px}.match-choice{font-size:16px;min-height:48px;padding:8px 4px;gap:7px}.match-choice input{width:18px;height:18px}.budget-values strong{font-size:16px}.match-filter-footer{padding:0 20px 20px}.match-filter-footer .match-start{font-size:15px}}
@media(prefers-reduced-motion:reduce){.match-location-tabs button,.match-location-select>svg,.match-choice{transition:none}}
</style>
