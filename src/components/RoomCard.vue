<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import Icon from './Icon.vue'
import {money} from '../data'
const props=defineProps({room:Object});const route=useRoute()
const detailsTo=computed(()=>({path:'/phong/'+props.room.id,query:route.path==='/'||route.path.startsWith('/nha-tro/')?{returnTo:route.fullPath}:{}}))
</script>
<template><article class="room-card"><RouterLink :to="detailsTo" class="room-photo"><img :src="room.image" :alt="room.title" loading="lazy"><span class="badge">{{room.status||'Còn phòng'}}</span></RouterLink><div class="room-content"><p class="price">{{money(room.price)}}<span>/ tháng</span></p><RouterLink :to="detailsTo"><h3>{{room.title}}</h3></RouterLink><p class="muted location"><Icon name="pin" :size="15"/>{{room.district}}, Cần Thơ</p><div class="room-meta"><span><Icon name="area" :size="15"/>{{room.area}} m²</span><span><Icon name="users" :size="15"/>{{room.people}} người</span></div><RouterLink class="button secondary card-link" :to="detailsTo">Xem chi tiết <Icon name="diagonal" :size="17"/></RouterLink></div></article></template>
