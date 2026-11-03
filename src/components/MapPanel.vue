<script setup>
import Icon from './Icon.vue'
defineProps({label:{default:'Đại học Cần Thơ'},address:{default:'Ninh Kiều, Cần Thơ'}})
</script>
<template><div class="map-panel" role="img" :aria-label="'Sơ đồ vị trí minh họa: '+address"><div class="map-water"></div><div class="map-park"></div><span class="map-street street-one">Đường 3 tháng 2</span><span class="map-street street-two">Nguyễn Văn Cừ</span><span class="map-street street-three">Mậu Thân</span><span class="map-pin"><Icon name="pin" :size="28"/></span><span class="map-label">{{label}}</span><span class="map-note">Sơ đồ minh họa · Cần Thơ</span></div></template>
