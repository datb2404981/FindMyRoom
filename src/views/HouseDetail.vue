<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import RoomCard from '../components/RoomCard.vue'
import { state } from '../store'

const route = useRoute()
const house = computed(() => state.houses.find(item => item.id === route.params.id))
const posts = computed(() => house.value ? state.posts.filter(post => post.kind === 'rental' && (post.houseId === house.value.id || (!post.houseId && post.house === house.value.name))) : [])
</script>

<template>
  <div class="container page house-detail-page">
    <RouterLink to="/quan-ly/nha-tro" class="back-link"><Icon name="back" :size="18" />Quay lại quản lý nhà trọ</RouterLink>
    <template v-if="house">
      <span class="eyebrow">Thông tin nhà trọ</span>
      <h1>{{ house.name }}</h1>
      <div class="house-detail-summary">
        <div><img class="house-detail-image" :src="house.image || '/illustrations/room-1.svg'" :alt="house.name"><p v-if="!house.image" class="help">Ảnh minh họa</p></div>
        <section class="house-detail-info" aria-label="Thông tin chi tiết nhà trọ">
          <h2>Chi tiết nhà trọ</h2>
          <p class="location"><Icon name="pin" :size="18" />{{ house.address }}</p>
          <p class="location"><Icon name="home" :size="18" /><strong>{{ house.rooms }} phòng</strong></p>
          <h3>Mô tả</h3>
          <p>{{ house.desc || 'Chưa có mô tả nhà trọ.' }}</p>
        </section>
      </div>
      <section class="house-detail-posts" aria-label="Bài đăng của nhà trọ">
        <h2>Bài đăng của nhà trọ</h2>
        <div v-if="posts.length" class="room-grid"><RoomCard v-for="post in posts" :key="post.id" :room="post" /></div>
        <p v-else class="muted">Nhà trọ này chưa có bài đăng phòng.</p>
      </section>
    </template>
    <div v-else class="empty-state"><h1>Không tìm thấy nhà trọ</h1><p>Nhà trọ không còn trong danh sách quản lý của bạn.</p></div>
  </div>
</template>

<style scoped>
.house-detail-summary{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;margin-top:28px;align-items:start}
.house-detail-image{width:100%;max-height:360px;object-fit:cover;border-radius:16px;border:1px solid var(--line)}
.house-detail-info{padding:24px;border:1px solid var(--line);border-radius:16px;background:#fff;overflow-wrap:anywhere}
.house-detail-info h2{font-size:24px;margin-bottom:20px}
.house-detail-info h3{margin-top:28px}
.house-detail-info p{line-height:1.7}
.house-detail-posts{margin-top:40px}
.house-detail-posts h2{margin-bottom:24px}
@media(max-width:700px){.house-detail-summary{grid-template-columns:minmax(0,1fr);gap:20px}.house-detail-page h1{font-size:28px}.house-detail-info{padding:20px}.house-detail-posts h2{font-size:24px}}
</style>
