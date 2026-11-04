<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import RoomCard from '../components/RoomCard.vue'
import ListingCard from '../components/ListingCard.vue'
import SearchFilters from '../components/SearchFilters.vue'
import { rooms, districts, money } from '../data'
import { state } from '../store'
import { emptyFilters, filtersFromQuery, queryFromFilters, matchesFilters, searchQueryError } from '../search-filters'
import { publicRentals, publicRoommates, housesFromRooms, searchableText } from '../listings'

const route = useRoute(), router = useRouter()
watch(() => state.user?.role, role => {
  if (role === 'landlord') router.replace('/quan-ly/nha-tro')
}, { immediate: true })
const keyword = ref(''), filters = ref(emptyFilters()), offset = ref(0), roomOffset = ref(0), selectedListing = ref(null)
const filterControl = ref(null)
const listingDialog = ref(null)
const pageSize = 4
const searchKeys = ['search', 'q', 'school', 'district', 'prices', 'amenity', 'price', 'page']
const isSearching = computed(() => searchKeys.some(key => Object.hasOwn(route.query, key)))
const queryError = computed(() => searchQueryError(route.query))
const hasCriteria = computed(() => searchKeys.some(key => !['search', 'page'].includes(key) && Object.hasOwn(route.query, key)))
const appliedFilters = computed(() => filtersFromQuery(route.query))
const appliedKeyword = computed(() => searchableText({ title: typeof route.query.q === 'string' ? route.query.q.trim() : '' }))
const rentals = computed(() => publicRentals(state.posts))
const roommates = computed(() => publicRoommates(state.posts))
const houses = computed(() => housesFromRooms(rentals.value))
const featuredRooms = computed(() => rooms.map((_, index) => rooms[(index + roomOffset.value) % rooms.length]))
function matching(listings) {
  if (!isSearching.value) return listings
  return listings.filter(listing => {
    const candidates = listing.kind === 'house' ? listing.rooms : [listing]
    return candidates.some(candidate => matchesFilters(candidate, appliedFilters.value) && (!appliedKeyword.value || searchableText(listing).includes(appliedKeyword.value) || searchableText(candidate).includes(appliedKeyword.value)))
  })
}
const groups = computed(() => [
  { id: 'rentals', title: 'Phòng cho thuê', icon: 'home', items: matching(rentals.value), empty: 'Chưa có phòng cho thuê phù hợp với tìm kiếm này.' },
  ...(isSearching.value ? [
  { id: 'roommates', title: 'Ghép trọ', icon: 'users', items: matching(roommates.value), empty: 'Chưa có bài ghép trọ phù hợp với tìm kiếm này.' },
  { id: 'houses', title: 'Nhà trọ', icon: 'building', items: matching(houses.value), empty: 'Chưa có nhà trọ phù hợp với tìm kiếm này.' },
  ] : []),
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
  selectedListing.value = null
  filterControl.value?.close()
}, { immediate: true })
watch(selectedListing, async listing => {
  if (!listing) return
  await nextTick()
  listingDialog.value?.querySelector('button')?.focus()
})
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
        <div class="location-grid"><RouterLink v-for="(_, index) in districts" :key="index" :to="{ path: '/', query: { search: '1', district: districts[(index + offset) % districts.length] } }" class="location-card"><img :src="'/illustrations/district-' + ((index + offset) % districts.length + 1) + '.svg'" alt="" loading="lazy"><div><h3>{{ districts[(index + offset) % districts.length] }}</h3><Icon name="diagonal" :size="18" /></div></RouterLink></div>
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
        <div><span class="eyebrow">{{ isSearching ? 'Chỗ ở dành cho bạn' : 'Khám phá thêm tại Cần Thơ' }}</span><h2>{{ isSearching ? 'Kết quả tìm kiếm' : 'Danh sách phòng trọ' }}</h2><p v-if="!queryError && resultCount" class="muted" role="status">{{ isSearching ? resultCount + ' kết quả trong 3 nhóm' + (route.query.q ? ' cho “' + route.query.q + '”' : '') + '.' : resultCount + ' phòng trọ đang cho thuê.' }}</p></div>
        <div v-if="isSearching" class="home-listings-actions"><button v-if="hasCriteria && resultCount && !queryError" type="button" class="text-button" @click="reset">Xóa bộ lọc</button><RouterLink to="/" class="text-button">Về trang chủ</RouterLink></div>
      </div>
      <div v-if="queryError" class="home-empty-state" role="alert"><span class="empty-icon"><Icon name="info" :size="32" /></span><h2>Dữ liệu không hợp lệ!</h2><p id="home-search-error">{{ queryError }}</p><button type="button" class="button primary" @click="reset">Nhập lại tìm kiếm</button></div>
      <div v-else-if="!resultCount" class="home-empty-state" role="status"><span class="empty-icon"><Icon name="search" :size="32" /></span><h2>Không tìm thấy kết quả phù hợp!</h2><p>Thử thay đổi từ khóa, khu vực, khoảng giá hoặc tiện ích nhé.</p><button type="button" class="button primary" @click="reset">Xóa bộ lọc</button></div>
      <template v-else>
        <section v-for="group in visibleGroups" :key="group.id" class="home-listing-group" :class="'group-' + group.id" :aria-labelledby="'heading-' + group.id">
          <div class="listing-group-heading"><div><span class="listing-group-icon"><Icon :name="group.icon" :size="20" /></span><h2 :id="'heading-' + group.id">{{ group.title }}</h2></div><span class="listing-group-count">{{ group.items.length }} {{ group.id === 'houses' ? 'nhà trọ' : 'bài đăng' }}</span></div>
          <div v-if="group.visible.length" class="home-listing-grid">
            <template v-for="listing in group.visible" :key="listing.id"><RoomCard v-if="group.id === 'rentals'" :room="listing" /><ListingCard v-else :listing="listing" @details="selectedListing = $event" /></template>
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

    <Teleport to="body">
      <div v-if="selectedListing" class="modal-backdrop" @click.self="selectedListing = null" @keydown.esc="selectedListing = null">
        <section ref="listingDialog" class="modal large home-listing-modal" v-dialog-focus role="dialog" aria-modal="true" aria-labelledby="listing-detail-title">
          <div class="section-heading"><h2 id="listing-detail-title">{{ selectedListing.title }}</h2><button type="button" class="icon-button" aria-label="Đóng chi tiết" @click="selectedListing = null"><Icon name="close" /></button></div>
          <img class="listing-detail-image" :src="selectedListing.image" :alt="selectedListing.title">
          <p class="listing-detail-price">{{ selectedListing.kind === 'house' ? 'Từ ' : '' }}{{ money(selectedListing.price) }}<span>{{ selectedListing.kind === 'house' ? ' / tháng' : ' / người / tháng' }}</span></p>
          <p><Icon name="pin" :size="16" /> {{ selectedListing.address }}</p>
          <p v-if="selectedListing.owner"><strong>Người đăng:</strong> {{ selectedListing.owner }}</p>
          <p>{{ selectedListing.desc }}</p><div class="tags"><span v-for="amenity in selectedListing.amenities" :key="amenity">{{ amenity }}</span></div>
          <template v-if="selectedListing.kind === 'house'"><h3>Phòng đang cho thuê</h3><div class="house-room-links"><RouterLink v-for="room in selectedListing.rooms" :key="room.id" :to="{ path: '/phong/' + room.id, query: { returnTo: route.fullPath } }">{{ room.title }}<Icon name="arrow" :size="16" /></RouterLink></div></template>
          <div v-else class="form-actions"><RouterLink v-if="selectedListing.roomId" :to="{ path: '/phong/' + selectedListing.roomId, query: { returnTo: route.fullPath } }" class="button secondary">Xem phòng</RouterLink><RouterLink to="/ghep-tro" class="button primary">Tìm bạn ở ghép <Icon name="arrow" :size="18" /></RouterLink></div>
        </section>
      </div>
    </Teleport>
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
.home-listing-modal{max-height:calc(100dvh - 48px);overflow:auto}
.home-listing-modal>.section-heading{align-items:flex-start;margin-bottom:20px}
.home-listing-modal>.section-heading h2{font-size:25px;line-height:1.4}
.listing-detail-image{width:100%;max-height:300px;object-fit:cover;border-radius:12px}
.listing-detail-price{font-size:24px;font-weight:700}
.listing-detail-price span{font-size:13px;font-weight:400}
.house-room-links{display:grid;gap:10px;margin-top:15px}
.house-room-links a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border:1px solid var(--line);border-radius:10px;font-size:14px}
@media(max-width:1100px){.home-listing-group{padding:20px}.home-listing-grid{gap:14px}}
@media(max-width:800px){.home-listing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.home-listings{padding-block:28px 35px}.home-listings-heading{align-items:flex-start;gap:12px;margin-bottom:22px}.home-listings-heading h2{font-size:24px}.home-listings-heading p{font-size:12px}.home-listings-heading .text-button{font-size:11px}.home-listing-group{padding:16px 12px;border-radius:16px;margin-bottom:20px}.listing-group-heading{gap:10px;margin-bottom:16px}.listing-group-heading h2{font-size:19px}.listing-group-icon{width:30px;height:30px}.listing-group-count{font-size:10px}.home-listing-grid{gap:12px}.home-empty-state{padding:35px 18px;min-height:260px}.home-empty-state h2{font-size:23px}.home-empty-state p{font-size:14px}.home-listing-modal{max-height:calc(100dvh - 36px)}}
</style>
