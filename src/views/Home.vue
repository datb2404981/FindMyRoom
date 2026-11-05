<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, Coins } from '@lucide/vue'
import Icon from '../components/Icon.vue'
import RoomCard from '../components/RoomCard.vue'
import SearchFilters from '../components/SearchFilters.vue'
import { rooms, districts } from '../data'
import { state } from '../store'
import { emptyFilters, filtersFromQuery, queryFromFilters, matchesFilters, searchQueryError } from '../search-filters'
import { publicRentals, searchableText } from '../listings'

const route = useRoute(), router = useRouter()
const keyword = ref(''), filters = ref(emptyFilters())
const filterControl = ref(null)
const featuredTrack = ref(null), locationTrack = ref(null)
const pageSize = 8
const isMobile = ref(false), mobileLimit = ref(pageSize), loadMoreTrigger = ref(null)
let mobileMedia, loadObserver
function updateMobile() { isMobile.value = mobileMedia.matches }
onMounted(() => {
  mobileMedia = window.matchMedia('(max-width: 600px)')
  updateMobile()
  mobileMedia.addEventListener('change', updateMobile)
  if ('IntersectionObserver' in window) {
    loadObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) mobileLimit.value += pageSize
    }, { rootMargin: '200px' })
    if (loadMoreTrigger.value) loadObserver.observe(loadMoreTrigger.value)
  }
})
onUnmounted(() => { mobileMedia?.removeEventListener('change', updateMobile); loadObserver?.disconnect() })
watch([loadMoreTrigger, mobileLimit, isMobile], ([element]) => {
  loadObserver?.disconnect()
  if (element && isMobile.value) loadObserver?.observe(element)
}, { flush: 'post' })
const districtImages = ['ninh-kieu', 'cai-rang', 'binh-thuy', 'o-mon', 'thot-not', 'phong-dien', 'co-do', '', 'vinh-thanh']
const searchKeys = ['search', 'q', 'school', 'district', 'prices', 'amenity', 'price', 'page']
const isSearching = computed(() => searchKeys.some(key => Object.hasOwn(route.query, key)))
const queryError = computed(() => searchQueryError(route.query))
const hasCriteria = computed(() => searchKeys.some(key => !['search', 'page'].includes(key) && Object.hasOwn(route.query, key)))
const appliedFilters = computed(() => filtersFromQuery(route.query))
const appliedKeyword = computed(() => searchableText({ title: typeof route.query.q === 'string' ? route.query.q.trim() : '' }))
const rentals = computed(() => publicRentals(state.posts))
const priceOrder = computed(() => ['asc', 'desc'].includes(route.query.sort) ? route.query.sort : '')
const featuredRooms = computed(() => rooms.slice(0, 6))
function scrollTrack(track, direction) {
  if (!track) return
  const card = track.firstElementChild
  const distance = card ? card.getBoundingClientRect().width + 20 : track.clientWidth
  track.scrollBy({ left: direction * distance, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}
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
const visibleGroups = computed(() => groups.value.map(group => {
  const items = priceOrder.value ? [...group.items].sort((a, b) => (Number(a.price) - Number(b.price)) * (priceOrder.value === 'asc' ? 1 : -1)) : group.items
  return { ...group, visible: isMobile.value ? items.slice(0, mobileLimit.value) : items.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize) }
}))
function setPriceOrder(order) {
  const query = { ...route.query }
  delete query.page
  if (priceOrder.value !== order) query.sort = order
  else delete query.sort
  router.push({ path: '/', query })
}
watch(() => route.query, query => {
  mobileLimit.value = pageSize
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
        <div class="section-heading"><h2>Tìm trọ theo khu vực</h2></div>
        <div class="featured-carousel">
          <button type="button" class="icon-button featured-arrow featured-arrow-prev" aria-label="Địa điểm trước" aria-controls="location-track" @click="scrollTrack(locationTrack, -1)"><Icon name="left" /></button>
          <div id="location-track" ref="locationTrack" class="location-grid" role="region" aria-label="Các khu vực tìm trọ" tabindex="0"><RouterLink v-for="(district, index) in districts" :key="district" :to="{ path: '/', query: { search: '1', district } }" class="location-card"><img :src="districtImages[index] ? '/images/districts/' + districtImages[index] + '.jpg' : '/illustrations/district-1.svg'" alt="" loading="lazy"><div><h3>{{ district }}</h3><Icon name="diagonal" :size="18" /></div></RouterLink></div>
          <button type="button" class="icon-button featured-arrow featured-arrow-next" aria-label="Địa điểm tiếp theo" aria-controls="location-track" @click="scrollTrack(locationTrack, 1)"><Icon name="right" /></button>
        </div>
      </section>
      <section class="container section featured">
        <div class="section-heading"><h2>Phòng trọ nổi bật</h2></div>
        <div class="featured-carousel">
          <button type="button" class="icon-button featured-arrow featured-arrow-prev" aria-label="Cuộn đến phòng trước" aria-controls="featured-rooms" @click="scrollTrack(featuredTrack, -1)"><Icon name="left" /></button>
          <div id="featured-rooms" ref="featuredTrack" class="featured-track" role="region" aria-label="Danh sách phòng trọ nổi bật" tabindex="0"><RoomCard v-for="room in featuredRooms" :key="room.id" :room="room" /></div>
          <button type="button" class="icon-button featured-arrow featured-arrow-next" aria-label="Cuộn đến phòng tiếp theo" aria-controls="featured-rooms" @click="scrollTrack(featuredTrack, 1)"><Icon name="right" /></button>
        </div>
      </section>
    </template>

    <section id="home-listings" class="container home-listings" :class="{ 'search-listings': isSearching }" aria-label="Danh sách chỗ ở">
      <p v-if="route.query.guide" class="notice">Không chuyển cọc trước khi xem phòng và xác minh người cho thuê.</p>
      <div class="home-listings-heading">
        <div><h2>{{ isSearching ? 'Kết quả tìm kiếm' : 'Danh sách phòng trọ' }}</h2><p v-if="isSearching && !queryError && resultCount" class="muted" role="status">{{ resultCount + ' phòng cho thuê' + (route.query.q ? ' cho “' + route.query.q + '”' : '') + '.' }}</p></div>
        <div v-if="isSearching" class="home-listings-actions"><button v-if="hasCriteria && resultCount && !queryError" type="button" class="text-button" @click="reset">Xóa bộ lọc</button><RouterLink to="/" class="text-button">Về trang chủ</RouterLink></div>
      </div>
      <div v-if="queryError" class="home-empty-state" role="alert"><span class="empty-icon"><Icon name="info" :size="32" /></span><h2>Dữ liệu không hợp lệ!</h2><p id="home-search-error">{{ queryError }}</p><button type="button" class="button primary" @click="reset">Nhập lại tìm kiếm</button></div>
      <div v-else-if="!resultCount" class="home-empty-state" role="status"><span class="empty-icon"><Icon name="search" :size="32" /></span><h2>Không tìm thấy kết quả phù hợp!</h2><p>Thử thay đổi từ khóa, khu vực, khoảng giá hoặc tiện ích nhé.</p><button type="button" class="button primary" @click="reset">Xóa bộ lọc</button></div>
      <template v-else>
        <section v-for="group in visibleGroups" :key="group.id" class="home-listing-group" :class="'group-' + group.id" :aria-labelledby="'heading-' + group.id">
          <div class="listing-group-heading"><div><span class="listing-group-icon"><Icon :name="group.icon" :size="20" /></span><h2 :id="'heading-' + group.id">{{ group.title }}</h2></div><div class="listing-group-controls" role="group" aria-label="Sắp xếp theo giá"><button type="button" aria-label="Giá tăng dần" title="Giá tăng dần" :aria-pressed="priceOrder === 'asc'" @click="setPriceOrder('asc')"><Coins :size="18" aria-hidden="true" /><ArrowUp :size="15" aria-hidden="true" /></button><button type="button" aria-label="Giá giảm dần" title="Giá giảm dần" :aria-pressed="priceOrder === 'desc'" @click="setPriceOrder('desc')"><Coins :size="18" aria-hidden="true" /><ArrowDown :size="15" aria-hidden="true" /></button></div></div>
          <div v-if="group.visible.length" class="home-listing-grid">
            <RoomCard v-for="listing in group.visible" :key="listing.id" :room="listing" />
          </div>
          <p v-else class="group-empty">{{ group.items.length ? 'Các kết quả của nhóm này đã hiển thị ở trang trước.' : group.empty }}</p>
        </section>
        <button v-if="isMobile && mobileLimit < resultCount" ref="loadMoreTrigger" type="button" class="button secondary mobile-load-more" @click="mobileLimit += pageSize">Xem thêm phòng trọ</button>
        <nav v-if="!isMobile" class="home-pagination" aria-label="Phân trang kết quả">
          <button type="button" class="page-button" :disabled="currentPage === 1" aria-label="Trang trước" @click="goToPage(currentPage - 1)"><Icon name="left" :size="18" /></button>
          <button v-for="page in pageNumbers" :key="page" type="button" class="page-button" :class="{ 'is-current': currentPage === page }" :aria-current="currentPage === page ? 'page' : undefined" :aria-label="'Trang ' + page" @click="goToPage(page)">{{ page }}</button>
          <button type="button" class="page-button" :disabled="currentPage === pageCount" aria-label="Trang tiếp theo" @click="goToPage(currentPage + 1)"><Icon name="right" :size="18" /></button>
        </nav>
      </template>
    </section>


  </div>
</template>

<style scoped>
.hero h1{text-wrap:balance;letter-spacing:-.03em}
.hero-content>p{line-height:1.5}
.search-box{box-shadow:0 8px 24px #13141412}
.locations .location-card:focus-visible{border-radius:16px}
.locations .location-grid{display:flex;gap:20px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;padding:4px;scrollbar-width:none}
.locations .location-card{display:block;flex:0 0 calc((100% - 60px)/4);min-width:0;scroll-snap-align:start}
.locations .location-card:not(:first-child){display:block}
@media(max-width:800px){.locations .location-card{flex-basis:calc((100% - 20px)/2)}}
@media(max-width:600px){.locations .location-card{flex-basis:85%}}
.locations .location-card>div svg{transition:transform .2s}
.locations .location-card:hover>div svg{transform:translate(3px,-3px)}
.home-page :deep(.room-card){height:100%}
.home-page :deep(.room-content h3){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;height:2lh;min-height:0}
.home-page :deep(.card-link){transition:background-color .2s,border-color .2s}
.home-page :deep(.card-link:hover){background:var(--cream-deep)}
.featured-carousel{position:relative}
.featured-arrow{position:absolute;top:50%;z-index:1;width:44px;height:44px;background:var(--cream);border:1px solid var(--line);box-shadow:0 2px 8px #0002;transform:translateY(-50%)}
.featured-arrow-prev{left:-22px}.featured-arrow-next{right:-22px}
@media(hover:hover){.featured-arrow{opacity:0;transition:opacity .2s,background .2s}.featured-arrow::before{content:'';position:absolute;inset:-60px -12px}.featured-arrow:hover,.featured-arrow:focus-visible{opacity:1}}
@media(prefers-reduced-motion:reduce){.featured-arrow{transition:none}}
.featured-track{display:flex;gap:20px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;padding:4px;scrollbar-width:none}
.featured-track::-webkit-scrollbar{display:none}
.featured-track :deep(.room-card){flex:0 0 calc((100% - 60px)/4);min-width:0;scroll-snap-align:start}
@media(max-width:800px){.featured-track :deep(.room-card){flex-basis:calc((100% - 20px)/2)}}
@media(max-width:600px){
  .featured-track{scroll-padding-inline:calc((100% - min(280px, 82vw))/2);padding-inline:calc((100% - min(280px, 82vw))/2)}
  .featured-track :deep(.room-card){flex-basis:min(280px,82vw);scroll-snap-align:center}
  .featured-track :deep(.room-content){padding:14px}
  .featured-track :deep(.room-content .price){font-size:17px}
  .featured-track :deep(.room-content h3){font-size:14px}
  .featured-track :deep(.room-meta){margin:12px 0}
  .featured-arrow-prev{left:-10px}.featured-arrow-next{right:-10px}
}
.home-listings{padding-block:44px 52px;scroll-margin-top:24px}
.home-listings-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:28px}
.home-listings-heading h2{font-size:30px}
.home-listings-heading p{font-size:14px;line-height:1.5}
.home-listings-heading .text-button{flex-shrink:0}
.home-listings-actions{display:flex;align-items:center;gap:18px;flex-shrink:0}
@media(max-width:600px){.home-listings-actions{flex-direction:column;align-items:flex-end;gap:12px}}
.home-listing-group{padding:24px;border:1px solid var(--line);border-radius:22px;background:#f8f2e5;margin-bottom:26px}
.listing-group-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
.listing-group-heading>div{display:flex;align-items:center;gap:10px}
.listing-group-heading h2{font-size:24px}
.listing-group-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#fff9ec;border:1px solid var(--line)}
.listing-group-heading .listing-group-controls{display:flex;gap:8px}
.listing-group-controls button{display:flex;align-items:center;justify-content:center;gap:1px;width:48px;height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;transition:background-color .2s,border-color .2s}
.listing-group-controls button:hover{background:var(--cream-deep)}
.listing-group-controls button[aria-pressed=true]{background:var(--gold);border-color:#b4831e}
.home-listing-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.group-empty{padding:35px 15px;background:#fffcf6;border:1px dashed #ccc8b9;border-radius:14px;text-align:center;color:#526065;font-size:14px}
.home-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;min-height:280px;padding:44px 24px;text-align:center;border:1px solid var(--line);border-radius:22px;background:var(--cream-deep)}
.home-empty-state h2{font-size:26px}
.home-empty-state p{margin:0;color:#526065;max-width:520px}
.home-pagination{display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 0}
.page-button{display:grid;place-items:center;width:44px;height:44px;border:1px solid transparent;border-radius:50%;background:transparent;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;transition:background-color .2s,border-color .2s,color .2s}
.page-button:first-child,.page-button:last-child{border-color:var(--line);background:#fff}
.page-button:first-child{margin-right:8px}.page-button:last-child{margin-left:8px}
.page-button.is-current{background:var(--gold);color:var(--ink)}
.page-button:hover:not(:disabled):not(.is-current){background:var(--cream-deep);border-color:var(--line)}
.page-button:disabled{opacity:.4}
@media(prefers-reduced-motion:reduce){.page-button{transition:none}}
@media(max-width:1100px){.home-listing-group{padding:20px}.home-listing-grid{gap:14px}}
@media(max-width:800px){.home-listing-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.hero-content>p{font-size:15px}.locations>.section-heading>.inline>.icon-button{width:44px;height:44px}.home-listings{padding-block:28px 35px}.home-listings-heading{align-items:flex-start;gap:12px;margin-bottom:22px}.home-listings-heading h2{font-size:24px}.home-listings-heading p{font-size:14px}.home-listings-heading .text-button{font-size:13px;min-height:44px}.home-listing-group{padding:16px 12px;border-radius:16px;margin-bottom:20px}.listing-group-heading{gap:10px;margin-bottom:16px}.listing-group-heading h2{font-size:19px}.listing-group-icon{width:30px;height:30px}.listing-group-count{font-size:12px}.home-listing-grid{gap:12px}.home-listing-grid :deep(.room-content h3){font-size:14px;min-height:0}.home-listing-grid :deep(.room-content .location),.home-listing-grid :deep(.room-meta){font-size:11px}.home-listing-grid :deep(.card-link){font-size:12px;min-height:44px}.home-listing-grid :deep(.save-button){width:44px;height:44px}.home-empty-state{padding:35px 18px;min-height:260px}.home-empty-state h2{font-size:23px}.home-empty-state p{font-size:14px}}
@media(prefers-reduced-motion:reduce){.locations .location-card>div svg,.home-page :deep(.room-card),.home-page :deep(.location-card img){transition:none}.home-page :deep(.room-card:hover),.home-page :deep(.location-card:hover img){transform:none}}
@media(max-width:600px){.listing-group-heading{flex-wrap:wrap}.listing-group-heading .listing-group-controls{margin-left:auto}}
@media(max-width:600px){
  .home-listing-grid{grid-template-columns:minmax(0,280px);justify-content:center;gap:16px}
  .mobile-load-more{display:flex;margin:0 auto}
  .home-listing-grid :deep(.room-card){display:flex;flex-direction:column}
  .home-listing-grid :deep(.room-content){display:flex;flex:1;flex-direction:column;padding:14px 12px}
  .home-listing-grid :deep(.price){font-size:15px;line-height:1.3}
  .home-listing-grid :deep(.price span){font-size:11px;margin-top:2px}
  .home-listing-grid :deep(.room-content h3){line-height:1.4;margin-top:10px}
  .home-listing-grid :deep(.room-content .location){line-height:1.4;margin-top:10px}
  .home-listing-grid :deep(.room-meta){flex-wrap:wrap;gap:6px 12px;margin:12px 0}
  .home-listing-grid :deep(.card-link){margin-top:auto;gap:4px;white-space:normal;line-height:1.3;text-align:left}
  .home-listing-grid :deep(.save-button){border:0;background:transparent}
  .home-listing-grid :deep(.save-button::before){content:'';position:absolute;inset:5px;border:1px solid var(--line);border-radius:50%;background:var(--cream)}
  .home-listing-grid :deep(.save-button.saved::before){background:var(--coral)}
  .home-listing-grid :deep(.save-button svg){position:relative;width:17px;height:17px}
}
@media(prefers-reduced-motion:reduce){.listing-group-controls button{transition:none}}
</style>
