<script setup>
import Icon from './Icon.vue'
import { money } from '../data'
defineProps({ listing: { type: Object, required: true } })
defineEmits(['details'])
</script>

<template>
  <article class="listing-card">
    <button type="button" class="listing-photo" :aria-label="'Xem chi tiết ' + listing.title" @click="$emit('details', listing)">
      <img :src="listing.image" :alt="listing.title" loading="lazy"><span class="badge">{{ listing.status }}</span>
    </button>
    <div class="listing-content">
      <p class="listing-price">{{ listing.kind === 'house' ? 'Từ ' : '' }}{{ money(listing.price) }}<span>{{ listing.kind === 'house' ? '/ tháng' : '/ người / tháng' }}</span></p>
      <h3>{{ listing.title }}</h3>
      <p class="listing-location"><Icon name="pin" :size="15" />{{ listing.district }}, Cần Thơ</p>
      <p class="listing-meta"><Icon :name="listing.kind === 'house' ? 'building' : 'users'" :size="16" />{{ listing.kind === 'house' ? listing.rooms.length + ' phòng đang cho thuê' : 'Tìm ' + listing.people + ' người ở ghép' }}</p>
      <button type="button" class="button secondary card-link" @click="$emit('details', listing)">Xem chi tiết <Icon name="diagonal" :size="17" /></button>
    </div>
  </article>
</template>

<style scoped>
.listing-card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;background:#fff;overflow:hidden;min-width:0}
.listing-photo{display:block;position:relative;padding:0;text-align:left;width:100%}
.listing-photo img{width:100%;aspect-ratio:1.5;object-fit:cover}
.listing-photo .badge{position:absolute;top:12px;left:12px}
.listing-content{display:flex;flex-direction:column;flex:1;padding:20px;min-width:0}
.listing-price{font-size:21px;font-weight:700;margin:0;line-height:1.4;color:#171c1b}
.listing-price span{display:block;font-size:11px;font-weight:400;color:var(--muted);margin-top:3px}
.listing-content h3{font-size:16px;line-height:1.5;margin-top:12px;min-height:48px}
.listing-location,.listing-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);line-height:1.5}
.listing-meta{color:var(--ink);margin-bottom:18px}
.listing-content .card-link{margin-top:auto;width:100%;min-height:42px;font-size:12px;padding:9px}
@media(max-width:600px){.listing-content{padding:14px 12px}.listing-price{font-size:16px}.listing-price span{font-size:10px}.listing-content h3{font-size:13px;min-height:58px}.listing-location,.listing-meta{font-size:10px}.listing-photo .badge{font-size:8px;top:8px;left:8px}.listing-content .card-link{font-size:11px;padding:7px;gap:4px}}
</style>
