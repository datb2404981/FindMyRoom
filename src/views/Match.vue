<script setup>
import {ref,computed,nextTick} from 'vue'
import {useRouter,useRoute} from 'vue-router'
import Icon from '../components/Icon.vue'
import MatchFilterPanel from '../components/MatchFilterPanel.vue'
import {people,money} from '../data'
import {schools} from '../search-filters'
import {state} from '../store'
const defaults=()=>({locationMode:'place',school:'',district:'',gender:'',budgetMin:500000,budgetMax:2000000,amenities:[],habits:[]})
const router=useRouter(),route=useRoute(),started=ref(!!route.query.start),detail=ref(false),preferences=ref(defaults()),notice=ref(''),stage=ref(null)
const candidates=computed(()=>{
 const f=preferences.value,school=schools.find(s=>s.id===f.school)
 return people.filter(p=>!state.passed.includes(p.id)&&!state.likes.includes(p.id)&&(!f.district||p.district===f.district)&&(!f.school||p.school===school?.name)&&(!f.gender||p.gender===f.gender)&&p.price>=f.budgetMin&&p.price<=f.budgetMax&&f.amenities.every(a=>p.amenities?.includes(a))&&f.habits.every(h=>p.tags.includes(h)))
})
const current=computed(()=>candidates.value[0])
function react(like){if(!current.value)return;if(like&&!state.user)return router.push({path:'/dang-nhap',query:{redirect:'/ghep-tro?start=1'}});(like?state.likes:state.passed).push(current.value.id);notice.value=like?'Đã lưu sự quan tâm của bạn. Chưa gửi liên hệ thực tế.':'';detail.value=false}
function resetFilters(){preferences.value=defaults();notice.value='';detail.value=false}
function restart(){state.passed=[];state.likes=[];resetFilters()}
async function begin(){started.value=true;notice.value='';detail.value=false;await nextTick();if(window.innerWidth<=800){stage.value?.focus({preventScroll:true});stage.value?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}}
</script>
<template><div class="container page"><div v-if="route.query.guide" class="notice"><Icon name="shield"/>Trao đổi rõ giờ giấc, chi phí và việc nhà. Gặp nhau ở nơi công cộng trước khi quyết định ở cùng.</div><div class="breadcrumb"><RouterLink to="/">Trang chủ</RouterLink><Icon name="right" :size="14"/>Ghép trọ</div><div class="match-layout"><MatchFilterPanel v-model="preferences" @start="begin" @reset="resetFilters"/><section ref="stage" class="match-stage" tabindex="-1" aria-label="Kết quả ghép trọ"><span class="eyebrow">Cùng một mái nhà, cùng nhịp sống</span><h1>Không chỉ tìm phòng.<br>Tìm người đồng hành.</h1><div v-if="!started" class="match-welcome"><img src="/illustrations/friends.svg" alt="Hai người bạn ở cùng"><h3>Một người bạn phù hợp đang chờ</h3><p class="muted">Chọn nơi ở, ngân sách và lối sống, rồi bắt đầu kết nối.</p></div><template v-else-if="current"><article class="person-card" :key="current.id"><div class="person-portrait" :style="{background:current.color}"><img src="/illustrations/person.svg" :alt="'Minh họa hồ sơ '+current.name"><span class="badge"><Icon name="shield" :size="13"/>Hồ sơ mẫu</span></div><div class="person-info"><div class="section-heading"><h2>{{current.name}}, {{current.age}}</h2><span class="muted">{{current.gender}}</span></div><p class="location"><Icon name="building" :size="16"/>{{current.school}}</p><p class="location muted"><Icon name="pin" :size="16"/>{{current.district}}, Cần Thơ</p><div class="tags"><span v-for="t in current.tags" :key="t">{{t}}</span></div><p class="person-budget">{{money(current.price)}}<span> / người / tháng</span></p><p v-if="detail">{{current.bio}}<br><small class="muted">Ngành học: {{current.major}}</small></p></div></article><div class="match-actions"><button class="match-action pass" @click="react(false)"><Icon name="close" :size="26"/><span>Bỏ qua</span></button><button class="match-action" @click="detail=!detail" :aria-expanded="detail"><Icon name="info" :size="25"/><span>{{detail?'Thu gọn':'Xem chi tiết'}}</span></button><button class="match-action like" @click="react(true)"><Icon name="heart" :size="26"/><span>Quan tâm</span></button></div></template><div v-else class="empty-state"><Icon name="users" :size="42"/><h2>Bạn đã xem hết hồ sơ phù hợp</h2><p>Thử đổi bộ lọc hoặc xem lại các hồ sơ mẫu.</p><button class="button primary" @click="restart">Xem lại hồ sơ</button></div><p v-if="notice" class="notice" role="status">{{notice}}</p></section></div></div></template>

<style scoped>
.match-layout{grid-template-columns:380px minmax(0,1fr);gap:52px;align-items:start}
.match-stage{min-width:0;scroll-margin-top:24px}
.match-stage:focus-visible{outline:2px solid #8fc8cf;outline-offset:8px;border-radius:18px}
@media(max-width:1100px){.match-layout{grid-template-columns:340px minmax(0,1fr);gap:28px}.match-stage h1{font-size:34px}}
@media(max-width:800px){.match-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:36px}.match-stage{padding:15px 0;scroll-margin-top:20px}}
@media(max-width:600px){.match-stage h1{font-size:28px}}
</style>
