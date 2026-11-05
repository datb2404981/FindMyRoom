<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import Icon from './Icon.vue'
import {money} from '../data'
const props=defineProps({room:Object});const route=useRoute()
const detailsTo=computed(()=>({path:'/phong/'+props.room.id,query:route.path==='/'||route.path.startsWith('/nha-tro/')?{returnTo:route.fullPath}:{}}))
</script>
<template><article class="room-card"><RouterLink :to="detailsTo" class="room-card-link" :aria-label="'Xem chi tiết ' + room.title"><div class="room-photo"><img :src="room.image" :alt="room.title" loading="lazy"><span class="badge" :class="{ 'available-badge': !room.status || room.status === 'Còn phòng' }">{{room.status||'Còn phòng'}}</span></div><div class="room-content"><div class="room-card-heading"><h3>{{room.title}}</h3><p class="price">{{money(room.price)}}<span>/ tháng</span></p></div><p class="muted location"><Icon name="pin" :size="15"/>{{room.district}}, Cần Thơ</p><div class="room-meta"><span><Icon name="area" :size="15"/>{{room.area}} m²</span><span><Icon name="users" :size="15"/>{{room.people}} người</span></div></div></RouterLink></article></template>

<style scoped>
.available-badge{background:#276b50;color:#fff}
.room-card-link{display:block;height:100%;cursor:pointer}
.room-card-link:focus-visible{outline:3px solid #638d92;outline-offset:-4px;border-radius:16px}
.room-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.room-content .room-card-heading h3{flex:1;min-width:0;margin:0}
.room-content .room-card-heading .price{flex:none;margin:0;text-align:right;white-space:nowrap;font-size:15px;line-height:1.4}
.room-content .room-card-heading .price span{display:block;margin:2px 0 0;font-size:11px}
</style>
