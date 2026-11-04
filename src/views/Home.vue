<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import RoomCard from '../components/RoomCard.vue'
import SearchFilters from '../components/SearchFilters.vue'
import { rooms, districts } from '../data'
import { state } from '../store'
import { emptyFilters, filtersFromQuery, queryFromFilters, matchesFilters, searchQueryError } from '../search-filters'
import { publicRentals, searchableText } from '../listings'

const route = useRoute(), router = useRouter()
const keyword = ref(''), filters = ref(emptyFilters()), offset = ref(0), roomOffset = ref(0)
const filterControl = ref(null)
const pageSize = 4
const searchKeys = ['search', 'q', 'school', 'district', 'prices', 'amenity', 'price', 'page']
const isSearching = computed(() => searchKeys.some(key => Object.hasOwn(route.query, key)))
const queryError = computed(() => searchQueryError(route.query))
const hasCriteria = computed(() => searchKeys.some(key => !['search', 'page'].includes(key) && Object.hasOwn(route.query, key)))
const appliedFilters = computed(() => filtersFromQuery(route.query))
const appliedKeyword = computed(() => searchableText({ title: typeof route.query.q === 'string' ? route.query.q.trim() : '' }))
const rentals = computed(() => publicRentals(state.posts))
const featuredRooms = computed(() => rooms.map((_, index) => rooms[(index + roomOffset.value) % rooms.length]))
function matching(listings) {
  if (!isSearching.value) return listings
  return listings.filter(listing => matchesFilters(listing, appliedFilters.value) && (!appliedKeyword.value || searchableText(listing).includes(appliedKeyword.value)))
}
const groups = computed(() => [
  { id: 'rentals', title: 'Phòng cho thuê', icon: 'home', items: matching(rentals.value), empty: 'Chưa có phòng cho thuê phù hợp với tìm kiếm này.' },
])
const resultCount = computed(() => groups.value.reduce((count, group) => count + group.items.length, 0))
const pageCount = computed(() => Math.max(1, ...groups.value.map(group => Math.ceil(group.items.length / pageSize))))
const currentPage = computed(() => Math.min(Math.max(1, Number(route.query.page) || 1), pageCount.value))
const pageNumbers = computed(() => {
  const start = Math.max(1, Math.min(currentPage.value - 2, pageCount.value - 4))
  return Array.from({ length: Math.min(5, pageCount.value) }, (_, index) => start + index)
})
const visibleGroups = computed(() => groups.value.map(group => ({ ...group, visible: group.items.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize) })))
watch(() => route.query, query => {
  keyword.value = typeof query.q === 'string' ? query.q : ''
  filters.value = filtersFromQuery(query)
  filterControl.value?.close()
}, { immediate: true })
function search() { filterControl.value?.close(); router.push({ path: '/', query: { search: '1', ...queryFromFilters(filters.value, keyword.value) } }) }
function reset() { keyword.value = ''; filters.value = emptyFilters(); router.push({ path: '/', query: { search: '1' } }) }
function goToPage(page) {
  if (page < 1 || page > pageCount.value || page === currentPage.value) return
  const query = { ...route.query, search: '1' }
  if (page === 1) delete query.page
  else query.page = String(page)
  router.push({ path: '/', query })
}
</script>

<template>
  <div class="home-page">
    <section class="hero">
      <img class="hero-art" src="/illustrations/city.svg" alt="" aria-hidden="true">
      <div class="container hero-content">
        <h1>Tìm phòng trọ ưng ý<br>tại TP Cần Thơ</h1><p>Kết nối an toàn, muôn vàn phòng tốt!</p>
        <form class="search-box" @submit.prevent="search" novalidate>
          <div class="search-input"><Icon name="search" /><input v-model="keyword" aria-label="Từ khóa tìm kiếm" placeholder="Bạn muốn tìm trọ ở đâu?" :aria-invalid="!!queryError" :aria-describedby="queryError ? 'home-search-error' : undefined"></div>
          <SearchFilters ref="filterControl" v-model="filters" />
        </form>
      </div>
    </section>

    <template v-if="!isSearching">
      <section class="container section locations">
        <div class="section-heading"><h2>Tìm trọ theo khu vực</h2><div class="inline"><button class="icon-button outlined" aria-label="Địa điểm trước" @click="offset = (offset + districts.length - 1) % districts.length"><Icon name="left" /></button><button class="icon-button outlined" aria-label="Địa điểm tiếp theo" @click="offset = (offset + 1) % districts.length"><Icon name="right" /></button></div></div>
        <div class="location-grid"><RouterLink v-for="(_, index) in districts.slice(0, 4)" :key="index" :to="{ path: '/', query: { search: '1', district: districts[(index + offset) % districts.length] } }" class="location-card"><img :src="'/illustrations/district-' + ((index + offset) % 4 + 1) + '.svg'" alt="" loading="lazy"><div><h3>{{ districts[(index + offset) % districts.length] }}</h3><Icon name="diagonal" :size="18" /></div></RouterLink></div>
        <div class="carousel-dots"><span v-for="(_, index) in districts" :key="index" :class="{ active: offset === index }"></span></div>
      </section>
      <section class="container section featured">
        <div class="section-heading"><div><h2 class="desktop-title">Phòng trọ nổi bật</h2><h2 class="mobile-title">Phòng mới đăng</h2></div><span class="muted hide-mobile">Những không gian dành cho bạn</span></div>
        <div class="mobile-room-carousel"><button class="icon-button carousel-prev" @click="roomOffset = (roomOffset + rooms.length - 1) % rooms.length" aria-label="Phòng trước"><Icon name="left" /></button><div class="room-grid"><RoomCard v-for="room in featuredRooms" :key="room.id" :room="room" /></div><button class="icon-button carousel-next" @click="roomOffset = (roomOffset + 1) % rooms.length" aria-label="Phòng tiếp theo"><Icon name="right" /></button></div>
        <div class="center section-action"><RouterLink :to="{ path: '/', query: { search: '1' } }" class="button secondary">Xem tất cả phòng trọ <Icon name="arrow" :size="18" /></RouterLink></div>
      </section>
    </template>

    <section id="home-listings" class="container home-listings" :class="{ 'search-listings': isSearching }" aria-label="Danh sách chỗ ở">
      <p v-if="route.query.guide" class="notice">Không chuyển cọc trước khi xem phòng và xác minh người cho thuê.</p>
      <div class="home-listings-heading">
        <div><span class="eyebrow">{{ isSearching ? 'Chỗ ở dành cho bạn' : 'Khám phá thêm tại Cần Thơ' }}</span><h2>{{ isSearching ? 'Kết quả tìm kiếm' : 'Danh sách phòng trọ' }}</h2><p v-if="!queryError && resultCount" class="muted" role="status">{{ isSearching ? resultCount + ' phòng cho thuê' + (route.query.q ? ' cho “' + route.query.q + '”' : '') + '.' : resultCount + ' phòng trọ đang cho thuê.' }}</p></div>
        <div v-if="isSearching" class="home-listings-actions"><button v-if="hasCriteria && resultCount && !queryError" type="button" class="text-button" @click="reset">Xóa bộ lọc</button><RouterLink to="/" class="text-button">Về trang chủ</RouterLink></div>
      </div>
      <div v-if="queryError" class="home-empty-state" role="alert"><span class="empty-icon"><Icon name="info" :size="32" /></span><h2>Dữ liệu không hợp lệ!</h2><p id="home-search-error">{{ queryError }}</p><button type="button" class="button primary" @click="reset">Nhập lại tìm kiếm</button></div>
      <div v-else-if="!resultCount" class="home-empty-state" role="status"><span class="empty-icon"><Icon name="search" :size="32" /></span><h2>Không tìm thấy kết quả phù hợp!</h2><p>Thử thay đổi từ khóa, khu vực, khoảng giá hoặc tiện ích nhé.</p><button type="button" class="button primary" @click="reset">Xóa bộ lọc</button></div>
      <template v-else>
        <section v-for="group in visibleGroups" :key="group.id" class="home-listing-group" :class="'group-' + group.id" :aria-labelledby="'heading-' + group.id">
          <div class="listing-group-heading"><div><span class="listing-group-icon"><Icon :name="group.icon" :size="20" /></span><h2 :id="'heading-' + group.id">{{ group.title }}</h2></div><span class="listing-group-count">{{ group.items.length }} bài đăng</span></div>
          <div v-if="group.visible.length" class="home-listing-grid">
            <RoomCard v-for="listing in group.visible" :key="listing.id" :room="listing" />
          </div>
          <p v-else class="group-empty">{{ group.items.length ? 'Các kết quả của nhóm này đã hiển thị ở trang trước.' : group.empty }}</p>
        </section>
        <nav class="home-pagination" aria-label="Phân trang kết quả">
          <button type="button" class="page-button" :disabled="currentPage === 1" aria-label="Trang trước" @click="goToPage(currentPage - 1)"><Icon name="left" :size="18" /></button>
          <button v-for="page in pageNumbers" :key="page" type="button" class="page-button" :class="{ 'is-current': currentPage === page }" :aria-current="currentPage === page ? 'page' : undefined" :aria-label="'Trang ' + page" @click="goToPage(page)">{{ page }}</button>
          <button type="button" class="page-button" :disabled="currentPage === pageCount" aria-label="Trang tiếp theo" @click="goToPage(currentPage + 1)"><Icon name="right" :size="18" /></button>
        </nav>
      </template>
    </section>


  </div>
</template>

<style scoped>
.home-listings{padding-block:44px 52px;scroll-margin-top:24px}
.home-listings-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:28px}
.home-listings-heading h2{font-size:30px}
.home-listings-heading p{font-size:14px}
.home-listings-heading .text-button{flex-shrink:0}
.home-listings-actions{display:flex;align-items:center;gap:18px;flex-shrink:0}
@media(max-width:600px){.home-listings-actions{flex-direction:column;align-items:flex-end;gap:12px}}
.home-listing-group{padding:24px;border:1px solid var(--line);border-radius:22px;background:#f8f2e5;margin-bottom:26px}
.listing-group-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
.listing-group-heading>div{display:flex;align-items:center;gap:10px}
.listing-group-heading h2{font-size:24px}
.listing-group-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#fff9ec;border:1px solid var(--line)}
.listing-group-count{font-size:12px;color:#526065;white-space:nowrap}
.home-listing-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.group-empty{padding:35px 15px;background:#fffcf6;border:1px dashed #ccc8b9;border-radius:14px;text-align:center;color:#526065;font-size:14px}
.home-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;min-height:280px;padding:44px 24px;text-align:center;border:1px solid var(--line);border-radius:22px;background:var(--cream-deep)}
.home-empty-state h2{font-size:26px}
.home-empty-state p{margin:0;color:#526065;max-width:520px}
.home-pagination{display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 0}
.page-button{display:grid;place-items:center;min-width:44px;height:44px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:14px}
.page-button.is-current{background:var(--ink);color:white;border-color:var(--ink)}
.page-button:hover:not(:disabled):not(.is-current){background:var(--cream-deep)}
@media(max-width:1100px){.home-listing-group{padding:20px}.home-listing-grid{gap:14px}}
@media(max-width:800px){.home-listing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.home-listings{padding-block:28px 35px}.home-listings-heading{align-items:flex-start;gap:12px;margin-bottom:22px}.home-listings-heading h2{font-size:24px}.home-listings-heading p{font-size:12px}.home-listings-heading .text-button{font-size:11px}.home-listing-group{padding:16px 12px;border-radius:16px;margin-bottom:20px}.listing-group-heading{gap:10px;margin-bottom:16px}.listing-group-heading h2{font-size:19px}.listing-group-icon{width:30px;height:30px}.listing-group-count{font-size:10px}.home-listing-grid{gap:12px}.home-empty-state{padding:35px 18px;min-height:260px}.home-empty-state h2{font-size:23px}.home-empty-state p{font-size:14px}}
</style>
