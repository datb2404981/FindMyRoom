<script setup>
import {ref,computed,nextTick,watch,onUnmounted} from 'vue'
import {useRouter,useRoute} from 'vue-router'
import Icon from '../components/Icon.vue'
import MatchFilterPanel from '../components/MatchFilterPanel.vue'
import {people,money} from '../data'
import {schools} from '../search-filters'
import {state} from '../store'

const defaults=()=>({locationMode:'place',school:'',district:'',gender:'',budgetMin:500000,budgetMax:2000000,amenities:[],nearby:[],habits:[]})
const router=useRouter(),route=useRoute()
const started=ref(!!route.query.start),preferences=ref(defaults()),notice=ref(''),stage=ref(null)
const history=ref([])
const restoredId=ref(null)

watch(()=>route.query.start,(val)=>{
 started.value=!!val
})

watch(started,(val)=>{
 document.documentElement.classList.toggle('match-active',!!val)
 document.body.classList.toggle('match-active',!!val)
},{immediate:true})

onUnmounted(()=>{
 document.documentElement.classList.remove('match-active')
 document.body.classList.remove('match-active')
 window.removeEventListener('scroll', onWindowScroll)
})

function matchesFilters(p){
 const f=preferences.value,school=schools.find(s=>s.id===f.school)
 return (
  (!f.district||p.district===f.district)&&
  (!f.school||p.school===school?.name)&&
  (!f.gender||p.gender===f.gender)&&
  p.price>=f.budgetMin&&
  p.price<=f.budgetMax&&
  (!f.amenities?.length||f.amenities.every(a=>p.amenities?.includes(a)))&&
  (!f.nearby?.length||f.nearby.every(n=>p.nearby?.includes(n)))&&
  (!f.habits?.length||f.habits.every(h=>p.tags?.includes(h)||p.amenities?.includes(h)||p.lifestyles?.includes(h)))
 )
}

const matchingPeople=computed(()=>people.filter(matchesFilters))
const matchingIds=computed(()=>new Set(matchingPeople.value.map(p=>p.id)))

// Keep history ordered across mounts and ignore passed IDs that cannot be restored under current filters.
const restorablePassed=computed(()=>{
 const seen=new Set()
 const ordered=[]
 for(const id of [...state.passed,...history.value]){
  if(seen.has(id))continue
  if(state.passed.includes(id)&&matchingIds.value.has(id)){
   seen.add(id)
   ordered.push(id)
  }
 }
 return ordered
})

watch(matchingIds,(ids)=>{
 if(restoredId.value&&!ids.has(restoredId.value)){
  restoredId.value=null
 }
})

const candidates=computed(()=>{
 const filtered=matchingPeople.value.filter(p=>!state.passed.includes(p.id))
 if(restoredId.value){
  const idx=filtered.findIndex(p=>p.id===restoredId.value)
  if(idx>0){
   const [item]=filtered.splice(idx,1)
   filtered.unshift(item)
  }
 }
 return filtered
})

const current=computed(()=>candidates.value[0])
const canGoBack=computed(()=>restorablePassed.value.length>0)

function preserveScroll(action){
 const scrollY=window.scrollY||document.documentElement.scrollTop||0
 action()
 nextTick(()=>{
  window.scrollTo({top:scrollY,behavior:'instant'})
 })
}

function skip(){
 if(!current.value)return
 const id=current.value.id
 preserveScroll(()=>{
  restoredId.value=null
  const hIdx=history.value.lastIndexOf(id)
  if(hIdx>=0)history.value.splice(hIdx,1)
  history.value.push(id)
  if(!state.passed.includes(id)){
   state.passed.push(id)
  }
  notice.value=''
 })
}

function goBack(){
 const lastId=restorablePassed.value.at(-1)
 if(!lastId)return
 preserveScroll(()=>{
  const idx=state.passed.lastIndexOf(lastId)
  if(idx>=0)state.passed.splice(idx,1)
  const hIdx=history.value.lastIndexOf(lastId)
  if(hIdx>=0)history.value.splice(hIdx,1)
  restoredId.value=lastId
  notice.value=''
 })
}

const dragX=ref(0)
const isDragging=ref(false)
const isSwipingOut=ref(false)
const swipeDirection=ref(0)
let startX=0
let startY=0
let activePointerId=null
let lockedScrollY=0

function onWindowScroll(){
 if(isDragging.value){
  window.scrollTo({top:lockedScrollY,behavior:'instant'})
 }
}

const cardStyle=computed(()=>{
 if(isDragging.value){
  const rotation=dragX.value*0.04
  const dragDistance=Math.abs(dragX.value)
  // Khi kéo từ 0 đến khoảng 40px, card mờ dần về 0
  const opacity=Math.max(0, 1 - (dragDistance / 40))
  return{
   transform:`translate3d(${dragX.value}px, 0, 0) rotate(${rotation}deg)`,
   opacity:`${opacity}`,
   transition:'none',
   cursor:'grabbing',
   userSelect:'none',
   touchAction:'none'
  }
 }
 if(isSwipingOut.value){
  const targetX=swipeDirection.value*(window.innerWidth > 800 ? 320 : 220)
  const rotation=swipeDirection.value*10
  return{
   transform:`translate3d(${targetX}px, 0, 0) rotate(${rotation}deg)`,
   opacity:'0',
   transition:'transform 0.22s ease-out, opacity 0.22s ease-out',
   touchAction:'none'
  }
 }
 return{
  transform:'translate3d(0, 0, 0) rotate(0deg)',
  opacity:'1',
  transition:'transform 0.24s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.2s ease',
  userSelect:'none',
  touchAction:'none'
 }
})

function triggerSwipe(dir){
 if(isSwipingOut.value)return
 if(dir===1&&!canGoBack.value)return
 isDragging.value=false
 activePointerId=null
 window.removeEventListener('scroll',onWindowScroll)

 swipeDirection.value=dir
 isSwipingOut.value=true
 const currentScroll=lockedScrollY

 setTimeout(()=>{
  if(dir===-1){
   skip()
  }else if(canGoBack.value){
   goBack()
  }
  isSwipingOut.value=false
  dragX.value=0
  window.scrollTo({top:currentScroll,behavior:'instant'})
 },200)
}

function onPointerDown(e){
 if(e.button!==undefined&&e.button!==0)return
 if(e.target.closest('button, a, input, select, textarea'))return

 lockedScrollY=window.scrollY||document.documentElement.scrollTop||0
 window.addEventListener('scroll',onWindowScroll,{passive:false})

 activePointerId=e.pointerId
 startX=e.clientX
 startY=e.clientY
 dragX.value=0
 isDragging.value=true

 try{
  e.currentTarget?.setPointerCapture?.(e.pointerId)
 }catch{}
}

function onPointerMove(e){
 if(activePointerId===null||e.pointerId!==activePointerId)return
 if(!isDragging.value||isSwipingOut.value)return

 const deltaX=e.clientX-startX

 if(e.cancelable){
  e.preventDefault()
 }

 // Nếu ở hồ sơ đầu tiên (chưa có người trước đó), không cho kéo từ trái sang phải
 if(!canGoBack.value&&deltaX>0){
  dragX.value=0
  return
 }

 dragX.value=deltaX

 const currentY=window.scrollY||document.documentElement.scrollTop||0
 if(Math.abs(currentY-lockedScrollY)>0.5){
  window.scrollTo({top:lockedScrollY,behavior:'instant'})
 }

 // Khi kéo sang khoảng 40px thì card mờ dần và ẩn đi luôn
 if(Math.abs(dragX.value)>=40){
  if(dragX.value>0&&!canGoBack.value)return
  triggerSwipe(dragX.value>0?1:-1)
 }
}

function onPointerUp(e){
 if(activePointerId===null||e.pointerId!==activePointerId)return
 try{
  e.currentTarget?.releasePointerCapture?.(e.pointerId)
 }catch{}
 activePointerId=null
 window.removeEventListener('scroll',onWindowScroll)

 if(isSwipingOut.value)return

 if(!isDragging.value){
  dragX.value=0
  return
 }

 if(dragX.value>0&&!canGoBack.value){
  isDragging.value=false
  dragX.value=0
  return
 }

 if(Math.abs(dragX.value)>=35){
  triggerSwipe(dragX.value>0?1:-1)
 }else{
  isDragging.value=false
  dragX.value=0
 }
}

function onPointerCancel(e){
 if(activePointerId===null||e.pointerId!==activePointerId)return
 try{
  e.currentTarget?.releasePointerCapture?.(e.pointerId)
 }catch{}
 activePointerId=null
 window.removeEventListener('scroll',onWindowScroll)
 isDragging.value=false
 dragX.value=0
 window.scrollTo({top:lockedScrollY,behavior:'instant'})
}

function getPostId(person){
 if(!person)return ''
 return `ghep-${person.id}`
}

function viewDetail(){
 if(!current.value)return
 router.push({
  path:'/phong/'+getPostId(current.value),
  query:{returnTo:'/ghep-tro?start=1'}
 })
}

function resetFilters(){
 preferences.value=defaults()
 restoredId.value=null
 notice.value=''
}

function resetToStart(){
 started.value=false
 history.value=[]
 state.passed=[]
 resetFilters()
 if(route.query.start){
  const {start:_start,...rest}=route.query
  router.replace({path:route.path,query:rest})
 }
 const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
 window.scrollTo({ top: 0, behavior: prefersReduced ? 'instant' : 'smooth' })
}

function restart(){
 resetToStart()
}

async function begin(){
 started.value=true
 notice.value=''
 if(!route.query.start){
  router.replace({path:route.path,query:{...route.query,start:'1'}})
 }
 await nextTick()
 requestAnimationFrame(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  stage.value?.scrollIntoView({
   behavior: prefersReduced ? 'instant' : 'smooth',
   block: 'start'
  })
 })
}
</script>

<template>
  <div class="container page">
    <div v-if="route.query.guide" class="notice">
      <Icon name="shield" />
      Trao đổi rõ giờ giấc, chi phí và việc nhà. Gặp nhau ở nơi công cộng trước khi quyết định ở cùng.
    </div>
    <div class="breadcrumb">
      <RouterLink to="/">Trang chủ</RouterLink>
      <Icon name="right" :size="14" />
      Ghép trọ
    </div>

    <div class="match-layout">
      <MatchFilterPanel
        v-model="preferences"
        :class="{ 'mobile-filter-hidden': started }"
        @start="begin"
        @reset="resetFilters"
      />

      <section ref="stage" class="match-stage" aria-label="Kết quả ghép trọ" tabindex="-1">
        <div v-if="!started" class="match-stage-top">
          <div class="match-stage-title">
            <span class="eyebrow">Cùng một mái nhà, cùng nhịp sống</span>
            <h1>Không chỉ tìm phòng<br>Tìm người đồng hành</h1>
          </div>
        </div>
        <div v-else class="match-stage-top match-stage-top-started">
          <button
            type="button"
            class="button secondary reset-start-btn"
            @click="resetToStart"
            aria-label="Đặt lại về trang bắt đầu"
            title="Quay lại cài đặt bộ lọc ban đầu"
          >
            <Icon name="reset" :size="16" />
            <span>Tùy chỉnh lại bộ lọc</span>
          </button>
        </div>

        <div v-if="!started" class="match-welcome">
          <img src="/images/roommates.png?v=4" alt="Hai người bạn ở cùng">
        </div>

        <template v-else-if="current">
          <article
            :key="current.id"
            class="person-card"
            :style="cardStyle"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
            @touchmove.prevent
            @dragstart.prevent
          >
            <div v-if="isDragging && dragX < -15" class="swipe-hint pass">
              <Icon name="close" :size="18" />
              <span>BỎ QUA</span>
            </div>
            <div v-if="isDragging && dragX > 15 && canGoBack" class="swipe-hint back">
              <Icon name="back" :size="18" />
              <span>QUAY LẠI</span>
            </div>

            <div class="person-portrait" :style="{ background: current.color }">
              <img
                :src="current.image || '/illustrations/room-1.svg'"
                :alt="current.title || ('Ảnh phòng trọ ' + current.name)"
                draggable="false"
                @dragstart.prevent
              >
              <span class="badge"><Icon name="shield" :size="13" />Hồ sơ mẫu</span>
            </div>
            <div class="person-info">
              <div class="section-heading">
                <h2>{{ current.title || ('Tìm bạn ở ghép tại ' + current.district) }}</h2>
                <span class="muted">{{ current.gender }}</span>
              </div>
              <p class="person-author"><Icon name="user" :size="15" /><span>Đăng bởi: <strong>{{ current.name }}</strong> ({{ current.age }} tuổi)</span></p>
              <p class="location"><Icon name="building" :size="16" /><span>{{ current.school }} · {{ current.major }}</span></p>
              <p class="location muted"><Icon name="pin" :size="16" /><span>{{ current.district }}, Cần Thơ</span></p>
              <div class="tags"><span v-for="t in current.tags" :key="t">{{ t }}</span></div>
              <p class="person-budget">{{ money(current.price) }}<span> / người / tháng</span></p>
              <p class="person-bio">{{ current.bio }}</p>
            </div>
          </article>

          <div class="match-actions" role="toolbar" aria-label="Điều khiển hồ sơ ghép trọ">
            <button
              type="button"
              class="match-action back"
              :disabled="!canGoBack"
              @click="goBack"
              :aria-label="canGoBack ? 'Quay lại hồ sơ vừa bỏ qua' : 'Chưa có hồ sơ trước đó'"
              :title="canGoBack ? 'Quay lại hồ sơ vừa bỏ qua' : 'Chưa có hồ sơ nào bị bỏ qua'"
            >
              <Icon name="back" :size="24" />
            </button>

            <button
              type="button"
              class="match-action detail"
              @click="viewDetail"
              aria-label="Xem trang chi tiết bài đăng ghép trọ này"
              title="Xem trang chi tiết bài đăng ghép trọ"
            >
              <Icon name="info" :size="24" />
            </button>

            <button
              type="button"
              class="match-action pass"
              @click="skip"
              aria-label="Bỏ qua hồ sơ này để chuyển sang người kế tiếp"
              title="Bỏ qua hồ sơ này"
            >
              <Icon name="close" :size="24" />
            </button>
          </div>
        </template>

        <div v-else class="empty-state">
          <Icon name="users" :size="42" />
          <h2>Bạn đã xem hết hồ sơ phù hợp</h2>
          <p>Thử đổi bộ lọc hoặc xem lại các hồ sơ mẫu.</p>
          <div class="empty-actions">
            <button v-if="canGoBack" type="button" class="button secondary" @click="goBack">
              <Icon name="back" :size="18" /> Quay lại hồ sơ trước
            </button>
            <button type="button" class="button primary" @click="restart">
              Xem lại từ đầu
            </button>
          </div>
        </div>

        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
:global(html.match-active),
:global(body.match-active) {
  overflow-x: clip;
  overscroll-behavior-x: none;
}
.match-layout {
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 52px;
  align-items: start;
}
.match-stage {
  min-width: 0;
  min-height: 520px;
  scroll-margin-top: 24px;
}
.match-stage-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
  text-align: center;
}
.match-stage-title {
  text-align: center;
  width: 100%;
}
.match-stage-title .eyebrow {
  margin-inline: auto;
  text-align: center;
}
.match-stage-top h1 {
  margin-bottom: 0;
  text-align: center;
}
.match-stage-top-started {
  display: none;
}
.reset-start-btn {
  display: none;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #d5dad1;
  color: #27484a;
  box-shadow: 0 1px 3px rgba(19, 20, 20, 0.05);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.reset-start-btn:hover {
  background: var(--cream-deep);
  border-color: #365f62;
  color: var(--ink);
  transform: translateY(-1px);
}
.match-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px 0 24px;
}
.match-welcome img {
  width: min(420px, 90vw);
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  margin: 10px auto 20px;
  display: block;
}
.person-author {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #556669;
  margin: 6px 0 14px;
}
.person-author svg {
  color: #365f62;
}
.person-card {
  height: 610px;
  display: grid;
  grid-template-rows: 220px minmax(0, 1fr);
  touch-action: none !important;
  cursor: grab;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  overscroll-behavior: none;
  will-change: transform;
}
.person-card:active {
  cursor: grabbing;
}
.person-portrait {
  height: 100%;
  min-height: 0;
}
.person-portrait img {
  pointer-events: none;
  -webkit-user-drag: none;
  user-drag: none;
}
.person-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.person-info .section-heading {
  min-width: 0;
  align-items: flex-start;
  gap: 10px;
}
.person-info .section-heading h2 {
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.person-info .section-heading .muted {
  flex-shrink: 0;
}
.person-author,
.person-info .location {
  min-width: 0;
  overflow: hidden;
}
.person-author svg,
.person-info .location svg {
  flex-shrink: 0;
}
.person-author span,
.person-info .location span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-info .tags {
  max-height: 64px;
  overflow: hidden;
  flex-shrink: 0;
}
.person-info .tags span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-budget {
  margin-top: auto !important;
  flex-shrink: 0;
}
.swipe-hint {
  position: absolute;
  top: 18px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.06em;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  animation: hintPop 0.12s ease-out;
}
.swipe-hint.pass {
  right: 18px;
  background: #f8d6cc;
  color: #913625;
  border: 1.5px solid #efb2a3;
  transform: rotate(6deg);
}
.swipe-hint.back {
  left: 18px;
  background: #dceff1;
  color: #215157;
  border: 1.5px solid #b5dbe0;
  transform: rotate(-6deg);
}
@keyframes hintPop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.match-stage:focus-visible {
  outline: 2px solid #8fc8cf;
  outline-offset: 8px;
  border-radius: 18px;
}
.person-bio {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  flex-shrink: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: #3f5054;
  margin-top: 10px;
}
.match-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  margin: 28px auto 0;
}
.match-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  color: #334447;
  cursor: pointer;
  border: 0;
  border-radius: 50%;
  padding: 0;
  box-shadow: none;
  transition: opacity .2s, background-color .2s;
}
.match-action :deep(svg) {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  transform: none;
  transition: none;
}
.match-action:hover :deep(svg) { transform: none; }
.match-action:focus-visible { outline: 3px solid #365f62; outline-offset: 3px; }
.match-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.match-action.back {
  background: #fff0cb;
  color: #3b5054;
}
.match-action.back:hover:not(:disabled) {
  background: #ffe6aa;
}
.match-action.detail {
  background: #dceff1;
  color: #215157;
}
.match-action.detail:hover:not(:disabled) {
  background: #c7e3e7;
}
.match-action.pass {
  background: #f8d6cc;
  color: #913625;
}
.match-action.pass:hover:not(:disabled) {
  background: #f2c0b3;
}
.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
}
@media (max-width: 1100px) {
  .match-layout {
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 28px;
  }
  .match-stage h1 {
    font-size: 34px;
  }
}
@media (max-width: 800px) {
  .person-card {
    height: 580px;
    grid-template-rows: 210px minmax(0, 1fr);
  }
  :global(body.match-active .site-footer) {
    display: none !important;
  }
  :global(body.match-active .page) {
    padding-bottom: 96px;
  }
  .person-info {
    overflow: hidden;
    padding: 18px;
  }
  .person-info .section-heading h2 {
    font-size: 20px;
    line-height: 1.3;
  }
  .person-info .tags {
    margin: 12px 0;
  }
  .match-actions {
    width: min(390px, 100%);
    gap: 24px;
    margin: 16px auto 0;
  }
  .match-action {
    width: 54px;
    height: 54px;
  }
  .match-action :deep(svg) {
    width: 23px;
    height: 23px;
  }
  .mobile-filter-hidden {
    display: none !important;
  }
  .match-stage-top,
  .match-stage-top-started {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    text-align: center;
  }
  .reset-start-btn {
    display: inline-flex;
    align-self: center;
    min-height: 44px;
    padding: 10px 18px;
    margin: 0 auto;
  }
  .match-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .match-stage {
    padding: 10px 0;
    scroll-margin-top: 20px;
    min-height: 540px;
  }
}
@media (max-width: 600px) {
  .match-welcome img {
    width: min(300px, 85vw);
    margin: 8px auto 16px;
  }
  .match-stage h1 {
    font-size: 28px;
  }
  .match-action {
    font-size: 12px;
  }

}
</style>
