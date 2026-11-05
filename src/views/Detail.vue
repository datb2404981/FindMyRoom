<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import MapPanel from '../components/MapPanel.vue'
import { rooms, money } from '../data'
import { roommateListings } from '../listings'
import { state, toggleFavorite } from '../store'

const route = useRoute(), router = useRouter()
const room = computed(() => {
  const id = route.params.id
  const all = [...state.posts, ...roommateListings, ...rooms]
  return all.find(r => r.id === id || r.personId === id || r.id === `ghep-${id}`)
})
const isRoommate = computed(() => room.value?.kind === 'roommate')
const slide = ref(0), contact = ref(false)

const contactPhone = computed(() => {
  const post = room.value
  if (!post) return ''
  const original = [...rooms, ...roommateListings].find(item => item.id === post.id)
  return (post.ownerId === state.user?.id ? (state.profile.phone || state.user?.phone) : '') || post.phone || original?.phone || ''
})

const remainingRooms = computed(() => room.value?.count ?? rooms.find(item => item.id === route.params.id)?.count)
const internetPrice = computed(() => room.value?.internet ?? rooms.find(item => item.id === route.params.id)?.internet)

function act(kind) {
  if (!state.user) return router.push('/dang-nhap?redirect=' + encodeURIComponent(route.fullPath))
  if (kind === 'save') toggleFavorite(room.value.id)
  else contact.value = true
}

const backTo = computed(() => {
  const path = route.query.returnTo
  return typeof path === 'string' && (path === '/' || path.startsWith('/?') || path.startsWith('/ghep-tro') || path === '/quan-ly/bai-dang' || /^\/nha-tro\/[^/?#]+$/.test(path))
    ? path
    : (state.user?.role === 'landlord' ? '/quan-ly/bai-dang' : '/?search=1')
})

function formatDate(dateStr) {
  if (!dateStr) return 'Vào ngay / Thỏa thuận'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="container page" v-if="room">
    <RouterLink :to="backTo" class="back-link">
      <Icon name="back" :size="18" />
      {{
        backTo.startsWith('/ghep-tro')
          ? 'Quay lại ghép trọ'
          : backTo === '/quan-ly/bai-dang'
          ? 'Quay lại quản lý bài đăng'
          : backTo.startsWith('/nha-tro/')
          ? 'Quay lại nhà trọ'
          : 'Quay lại tìm trọ'
      }}
    </RouterLink>

    <div class="detail-grid">
      <section>
        <!-- Ảnh bài đăng -->
        <div class="detail-photo">
          <img
            :src="slide === 0 ? room.image : '/illustrations/room-' + (slide + 1) + '.svg'"
            :alt="room.title + ' — góc nhìn ' + (slide + 1)"
          />
          <button
            class="icon-button photo-prev"
            aria-label="Ảnh trước"
            @click="slide = (slide + 3) % 4"
          >
            <Icon name="left" />
          </button>
          <button
            class="icon-button photo-next"
            aria-label="Ảnh tiếp theo"
            @click="slide = (slide + 1) % 4"
          >
            <Icon name="right" />
          </button>
          <span class="photo-counter">{{ slide + 1 }} / 4</span>
        </div>

        <!-- Tiêu đề & Badges -->
        <div class="section-heading detail-title">
          <div>
            <div class="detail-badges">
              <span class="badge">{{ room.status || 'Đang mở' }}</span>
              <span v-if="isRoommate" class="badge roommate-tag">Tìm người ở ghép</span>
              <span v-if="room.school" class="badge school-tag">{{ room.school }}</span>
            </div>
            <h1>{{ room.title }}</h1>
            <p class="muted location">
              <Icon name="pin" :size="17" />{{ room.address }}
            </p>
          </div>
          <button
            class="icon-button outlined"
            :class="{ 'saved-heart': state.favorites.includes(room.id) }"
            @click="act('save')"
            :aria-label="state.favorites.includes(room.id) ? 'Bỏ lưu tin' : 'Lưu tin'"
          >
            <Icon name="heart" />
          </button>
        </div>

        <!-- Giá hiển thị -->
        <div class="detail-price-box">
          <p class="detail-price">
            {{ money(room.price) }}
            <span>/ {{ isRoommate ? (room.perPerson ? 'người / tháng' : 'tháng') : 'tháng' }}</span>
          </p>
          <p v-if="isRoommate && room.totalRent" class="muted total-room-hint">
            Tổng giá thuê phòng: <strong>{{ money(room.totalRent) }} / tháng</strong>
          </p>
        </div>

        <!-- Thông số đặc tả -->
        <div class="spec-grid">
          <div>
            <Icon name="area" />
            <span>Diện tích<strong>{{ room.area }} m²</strong></span>
          </div>

          <div v-if="isRoommate">
            <Icon name="users" />
            <span>Cần tìm<strong>{{ room.capacity || room.people || 1 }} bạn ({{ room.gender || 'Nam/Nữ' }})</strong></span>
          </div>
          <div v-else>
            <Icon name="users" />
            <span>Số người tối đa<strong>{{ room.people }} người</strong></span>
          </div>

          <div v-if="isRoommate">
            <Icon name="calendar" />
            <span>Thời gian dọn vào<strong>{{ formatDate(room.moveIn) }}</strong></span>
          </div>
          <div v-else>
            <Icon name="calendar" />
            <span>Giờ giấc<strong>Tự do</strong></span>
          </div>

          <div class="remaining-rooms">
            <Icon name="home" />
            <span>
              {{ isRoommate ? 'Hiện tại' : 'Phòng còn lại' }}
              <strong>
                {{
                  isRoommate
                    ? (room.currentPeople ? 'Đang ở ' + room.currentPeople + ' người' : 'Đang ở ghép')
                    : (remainingRooms == null || remainingRooms === '' ? 'Chưa cập nhật' : remainingRooms + ' phòng')
                }}
              </strong>
            </span>
          </div>
        </div>

        <!-- Chi phí dịch vụ -->
        <div class="cost-grid">
          <p>
            Tiền nước
            <strong>{{ room.water ? money(room.water) + ' / m³' : 'Theo hóa đơn' }}</strong>
          </p>
          <p>
            Tiền điện
            <strong>{{ room.electric ? money(room.electric) + ' / kWh' : 'Theo hóa đơn' }}</strong>
          </p>
          <p class="internet-cost">
            Tiền internet
            <strong>{{ internetPrice == null || internetPrice === '' ? 'Miễn phí / Chia đều' : money(internetPrice) + ' / tháng' }}</strong>
          </p>
          <p>
            Tiền cọc
            <strong>{{ room.deposit ? money(room.deposit) : 'Thỏa thuận' }}</strong>
          </p>
        </div>

        <!-- Tiện ích chỗ ở -->
        <section class="detail-section">
          <h2>{{ isRoommate ? 'Tiện ích & Không gian sống' : 'Tiện ích' }}</h2>

          <!-- Tiện ích nội khu -->
          <div class="amenity-group">
            <h3 v-if="isRoommate" class="sub-heading"><Icon name="home" :size="16" /> Tiện ích nội khu</h3>
            <div class="amenity-grid">
              <span v-for="a in (room.amenities || [])" :key="a">
                <Icon name="check" :size="18" />{{ a }}
              </span>
            </div>
          </div>

          <!-- Tiện ích ngoại khu -->
          <div v-if="room.nearby && room.nearby.length" class="amenity-group">
            <h3 class="sub-heading"><Icon name="pin" :size="16" /> Tiện ích xung quanh</h3>
            <div class="amenity-grid">
              <span v-for="n in room.nearby" :key="n">
                <Icon name="check" :size="18" />{{ n }}
              </span>
            </div>
          </div>

          <!-- Phong cách sống -->
          <div v-if="(room.lifestyles && room.lifestyles.length) || (room.tags && room.tags.length)" class="amenity-group">
            <h3 class="sub-heading"><Icon name="heart" :size="16" /> Phong cách sống mong muốn</h3>
            <div class="tags">
              <span v-for="l in (room.lifestyles || room.tags)" :key="l">{{ l }}</span>
            </div>
          </div>

          <!-- Thói quen sống / lưu ý khác -->
          <div v-if="room.habits" class="habits-box">
            <h4><Icon name="info" :size="16" /> Thói quen sống & Lưu ý của người ghép</h4>
            <p>{{ room.habits }}</p>
          </div>
        </section>

        <!-- Mô tả chi tiết -->
        <section class="detail-section">
          <h2>Mô tả chi tiết</h2>
          <p>{{ room.desc }}</p>
          <p v-if="!isRoommate">Tôn trọng không gian chung, giữ vệ sinh và hạn chế tiếng ồn sau 22 giờ.</p>
        </section>

        <!-- Thẻ liên hệ -->
        <section class="contact-card">
          <div class="inline">
            <span class="avatar">
              {{ (room.owner || room.house || 'FindMyRoom').trim().split(/\s+/).map(s => s[0]).slice(-2).join('') }}
            </span>
            <div>
              <h3>{{ room.owner || room.house }}</h3>
              <p class="muted">
                {{ isRoommate ? ('Người tìm bạn ở ghép · ' + (room.school || 'Đại học Cần Thơ')) : (room.house || 'Chủ nhà trọ') }}
              </p>
            </div>
          </div>
          <div class="inline">
            <a v-if="contactPhone" class="button primary contact-phone" :href="'tel:' + contactPhone">
              <Icon name="phone" :size="18" />{{ contactPhone }}
            </a>
            <button v-else class="button primary contact-phone" disabled>
              <Icon name="phone" :size="18" />Chưa có số điện thoại
            </button>
            <button class="button secondary" @click="act('chat')">Chat Zalo</button>
          </div>
          <p v-if="contact" class="notice">
            {{
              room.phone
                ? ('Số điện thoại: ' + room.phone + (room.email ? ' · Email: ' + room.email : ''))
                : (isRoommate ? 'Chức năng liên hệ thực tế sẽ hoạt động khi kết nối tài khoản người đăng.' : 'Chức năng liên hệ thực tế sẽ hoạt động khi kết nối dữ liệu chủ trọ.')
            }}
          </p>
        </section>
      </section>

      <!-- Cột Aside bên phải -->
      <aside>
        <h2>Vị trí chỗ ở</h2>
        <MapPanel
          :label="room.house || room.title"
          :address="room.address || [room.street, room.ward, room.city].filter(Boolean).join(', ')"
        />
        <a
          class="map-external"
          :href="'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(room.address || [room.street, room.ward, room.city].filter(Boolean).join(', '))"
          target="_blank"
          rel="noopener"
        >
          Mở khu vực trên Google Maps <Icon name="external" :size="15" />
        </a>

        <!-- Thẻ tóm tắt người đăng ghép trọ (nếu là bài ghép trọ) hoặc Nhà trọ (nếu là thuê phòng) -->
        <section v-if="isRoommate" class="detail-section author-profile-card">
          <h2>Hồ sơ người đăng</h2>
          <div class="profile-compact">
            <div class="avatar-large" :style="{ background: room.color || '#8fc8cf' }">
              {{ (room.owner || 'SV').trim().split(/\s+/).map(s => s[0]).slice(-2).join('') }}
            </div>
            <div>
              <h3>{{ room.owner || 'Bạn sinh viên' }}</h3>
              <p class="muted">{{ room.age ? room.age + ' tuổi · ' : '' }}{{ room.gender || 'Sinh viên' }}</p>
              <p class="muted">{{ room.school || 'Đại học Cần Thơ' }}</p>
              <p v-if="room.major" class="muted">Ngành: {{ room.major }}</p>
            </div>
          </div>
          <div v-if="room.tags && room.tags.length" class="tags">
            <span v-for="t in room.tags" :key="t">{{ t }}</span>
          </div>
        </section>

        <section v-else class="detail-section">
          <h2>Nhà trọ</h2>
          <img class="house-preview" :src="room.image" :alt="room.house || room.title">
          <h3>{{ room.house || room.title }}</h3>
          <p class="muted">{{ room.address }}</p>
        </section>

        <!-- Đánh giá hoặc Quy tắc an toàn -->
        <section v-if="!isRoommate" class="detail-section">
          <h2>Đánh giá</h2>
          <div class="review">
            <strong>Nguyễn Minh Anh</strong>
            <div class="stars">★★★★★</div>
            <p>Phòng thoáng, khu vực đi lại thuận tiện, phù hợp cho sinh viên.</p>
            <small class="muted">Đánh giá từ người thuê đã xác thực</small>
          </div>
        </section>
      </aside>
    </div>
  </div>
  <div v-else class="container empty-state">
    <h1>Không tìm thấy bài đăng</h1>
    <RouterLink :to="backTo" class="button primary">Về trang trước</RouterLink>
  </div>
</template>

<style scoped>
.detail-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.detail-badges .roommate-tag {
  background: #dceff1;
  color: #215157;
}
.detail-badges .school-tag {
  background: #eef2f3;
  color: #3b5054;
}
.detail-price-box {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.total-room-hint {
  font-size: 13.5px;
  color: #5a686b;
  margin: 0;
}
.sub-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #334447;
  margin: 18px 0 10px;
  font-weight: 600;
}
.amenity-group {
  margin-bottom: 16px;
}
.habits-box {
  margin-top: 18px;
  padding: 16px;
  background: #f8f6f0;
  border-radius: 12px;
  border: 1px solid var(--line);
}
.habits-box h4 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  color: #283a3d;
  margin-bottom: 6px;
}
.habits-box p {
  font-size: 13px;
  color: #4f5e61;
  margin: 0;
  line-height: 1.5;
}
.author-profile-card {
  padding: 20px;
  background: #fcfbf7;
  border: 1px solid var(--line);
  border-radius: 16px;
}
.profile-compact {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.avatar-large {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 18px;
  color: #131414;
  border: 1px solid var(--ink);
  flex-shrink: 0;
}
.profile-compact h3 {
  font-size: 16px;
  margin: 0 0 3px;
}
.profile-compact p {
  font-size: 12px;
  margin: 2px 0;
  line-height: 1.4;
}
.spec-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.spec-grid > div {
  min-width: 0;
}
.cost-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 600px) {
  .spec-grid,
  .cost-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .spec-grid {
    gap: 20px 12px;
  }
  .cost-grid {
    gap: 14px 10px;
  }
}
.saved-heart {
  background: var(--coral, #f8d6cc);
  border-color: #f27058;
}
.saved-heart svg {
  fill: #c93636;
  color: #c93636;
}
</style>
