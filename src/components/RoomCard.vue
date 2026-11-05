<script setup>
import {computed} from 'vue'
import {useRouter,useRoute} from 'vue-router'
import Icon from './Icon.vue'
import {money} from '../data'
import {state,toggleFavorite} from '../store'
const props=defineProps({room:Object});const router=useRouter(),route=useRoute()
const detailsTo=computed(()=>({path:'/phong/'+props.room.id,query:route.path==='/'||route.path.startsWith('/nha-tro/')?{returnTo:route.fullPath}:{}}))
function save(){if(!state.user)return router.push('/dang-nhap?redirect='+encodeURIComponent(router.currentRoute.value.fullPath));toggleFavorite(props.room.id)}
</script>
<template><article class="room-card"><RouterLink :to="detailsTo" class="room-photo"><img :src="room.image" :alt="room.title" loading="lazy"><span class="badge" :class="{ 'available-badge': !room.status || room.status === 'Còn phòng' }">{{room.status||'Còn phòng'}}</span></RouterLink><button class="save-button icon-button" :class="{saved:state.favorites.includes(room.id)}" @click="save" :aria-label="state.favorites.includes(room.id)?'Bỏ lưu tin':'Lưu tin'"><Icon name="heart" :size="18"/></button><div class="room-content"><p class="price">{{money(room.price)}}<span>/ tháng</span></p><RouterLink :to="detailsTo"><h3>{{room.title}}</h3></RouterLink><p class="muted location"><Icon name="pin" :size="15"/>{{room.district}}, Cần Thơ</p><div class="room-meta"><span><Icon name="area" :size="15"/>{{room.area}} m²</span><span><Icon name="users" :size="15"/>{{room.people}} người</span></div><RouterLink class="button secondary card-link" :to="detailsTo">Xem chi tiết <Icon name="diagonal" :size="17"/></RouterLink></div></article></template>

<style scoped>
.available-badge{background:#276b50;color:#fff}
</style>
