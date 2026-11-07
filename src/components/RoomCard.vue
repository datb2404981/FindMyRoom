<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import Icon from './Icon.vue'
import {money} from '../data'
const props=defineProps({room:Object});const route=useRoute()
const detailsTo=computed(()=>({path:'/phong/'+props.room.id,query:route.path==='/'||route.path.startsWith('/nha-tro/')?{returnTo:route.fullPath}:{}}))
</script>
<template><article class="room-card"><RouterLink :to="detailsTo" class="room-card-link" :aria-label="'Xem chi tiết ' + room.title"><div class="room-photo"><img :src="room.image" :alt="room.title" loading="lazy"><span class="badge" :class="{ 'available-badge': !room.status || room.status === 'Còn phòng' }">{{room.status||'Còn phòng'}}</span></div><div class="room-content"><div class="room-card-heading"><h3 :title="room.title">{{room.title}}</h3></div><p class="muted location"><Icon name="pin" :size="15"/>{{room.district}}, Cần Thơ</p><div class="room-meta"><span><Icon name="area" :size="15"/>{{room.area}} m²</span><span><Icon name="users" :size="15"/>{{room.people}} người</span></div><p class="price">{{money(room.price)}}<span>/ tháng</span></p></div></RouterLink></article></template>

<style scoped>
.available-badge{background:#276b50;color:#fff}
.room-card-link{display:flex;flex-direction:column;height:100%;cursor:pointer}
.room-card-link:focus-visible{outline:3px solid #638d92;outline-offset:-4px;border-radius:16px}
.room-content{display:flex;flex:1;min-width:0;flex-direction:column;gap:8px}
.room-card-heading{min-width:0}
.room-content .room-card-heading h3{display:block;width:100%;height:auto;min-height:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;line-height:1.45}
.room-content .location{min-width:0;width:100%;margin:0;justify-content:flex-start;text-align:left;font-size:12px;line-height:1.5}
.room-content .location svg{flex-shrink:0}
.room-content .room-meta{justify-content:flex-start;flex-wrap:wrap;gap:6px;margin:2px 0 0;font-size:11px}
.room-content .room-meta span{gap:5px;padding:4px 8px;border-radius:6px;background:var(--cream);white-space:nowrap}
.room-content .room-meta svg{flex-shrink:0}
.room-content > .price{width:100%;margin:auto 0 0;padding-top:12px;border-top:1px solid var(--line);text-align:right;font-size:18px;line-height:1.4;font-variant-numeric:tabular-nums}
.room-content > .price span{display:inline;margin-left:4px;font-size:12px}
</style>
