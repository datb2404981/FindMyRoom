<script setup>
import {ref,computed,nextTick} from 'vue'
import {useRouter,useRoute} from 'vue-router'
import Icon from '../components/Icon.vue'
import MatchFilterPanel from '../components/MatchFilterPanel.vue'
import {people,money} from '../data'
import {schools} from '../search-filters'
import {state} from '../store'
import {roommateListings} from '../listings'

const defaults=()=>({locationMode:'place',school:'',district:'',gender:'',budgetMin:500000,budgetMax:2000000,amenities:[],habits:[]})
const router=useRouter(),route=useRoute()
const started=ref(!!route.query.start),preferences=ref(defaults()),notice=ref(''),stage=ref(null)
const history=ref([])

const candidates=computed(()=>{
 const f=preferences.value,school=schools.find(s=>s.id===f.school)
 return people.filter(p=>
  !state.passed.includes(p.id)&&
  (!f.district||p.district===f.district)&&
  (!f.school||p.school===school?.name)&&
  (!f.gender||p.gender===f.gender)&&
  p.price>=f.budgetMin&&
  p.price<=f.budgetMax&&
  f.amenities.every(a=>p.amenities?.includes(a))&&
  f.habits.every(h=>p.tags.includes(h))
 )
})

const current=computed(()=>candidates.value[0])
const currentPost=computed(()=>{
 const post=roommateListings.find(item=>item.personId===current.value?.id)
 return state.posts.find(item=>item.kind==='roommate'&&item.id===post?.id)||post
})
const canGoBack=computed(()=>history.value.length>0||state.passed.length>0)

function skip(){
 if(!current.value)return
 history.value.push(current.value.id)
 if(!state.passed.includes(current.value.id)){
  state.passed.push(current.value.id)
 }
 notice.value=''
}

function goBack(){
 const lastId=history.value.length?history.value.pop():state.passed.pop()
 if(!lastId)return
 const idx=state.passed.lastIndexOf(lastId)
 if(idx>=0)state.passed.splice(idx,1)
 notice.value=''
}

function viewDetail(){
 if(!currentPost.value)return
 router.push({
  path:'/phong/'+currentPost.value.id,
  query:{returnTo:'/ghep-tro?start=1'}
 })
}

function resetFilters(){
 preferences.value=defaults()
 notice.value=''
}

function restart(){
 history.value=[]
 state.passed=[]
 resetFilters()
}

async function begin(){
 started.value=true
 notice.value=''
 await nextTick()
 stage.value?.focus({preventScroll:true})
 const controls=stage.value?.querySelector('.match-actions')
 const target=controls||stage.value
 target?.scrollIntoView({
  behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
  block:controls?'end':'start'
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
      <MatchFilterPanel v-model="preferences" @start="begin" @reset="resetFilters" />

      <section ref="stage" class="match-stage" tabindex="-1" aria-label="Kết quả ghép trọ">
        <span class="eyebrow">Cùng một mái nhà, cùng nhịp sống</span>
        <h1>Không chỉ tìm phòng.<br>Tìm người đồng hành.</h1>

        <div v-if="!started" class="match-welcome">
          <img src="/illustrations/friends.svg" alt="Hai người bạn ở cùng">
          <h3>Một người bạn phù hợp đang chờ</h3>
          <p class="muted">Chọn nơi ở, ngân sách và lối sống, rồi bắt đầu kết nối.</p>
        </div>

        <template v-else-if="current && currentPost">
          <article class="person-card" :key="currentPost.id" :data-post-id="currentPost.id">
            <div class="person-portrait">
              <img :src="currentPost.image" :alt="currentPost.title">
              <span class="badge">{{ currentPost.status }}</span>
            </div>
            <div class="person-info">
              <div class="section-heading">
                <h2>{{ currentPost.title }}</h2>
                <span class="muted">{{ current.gender }}</span>
              </div>
              <p class="location"><Icon name="building" :size="16" />{{ current.school }} · {{ current.major }}</p>
              <p class="location muted"><Icon name="pin" :size="16" />{{ current.district }}, Cần Thơ</p>
              <div class="tags"><span v-for="t in current.tags" :key="t">{{ t }}</span></div>
              <p class="person-budget">{{ money(current.price) }}<span> / người / tháng</span></p>
              <p class="person-bio">{{ currentPost.desc }}</p>
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
              <span>Quay lại</span>
            </button>

            <button
              type="button"
              class="match-action detail"
              @click="viewDetail"
              aria-label="Xem trang chi tiết bài đăng ghép trọ này"
              title="Xem trang chi tiết bài đăng ghép trọ"
            >
              <Icon name="info" :size="24" />
              <span>Xem chi tiết</span>
            </button>

            <button
              type="button"
              class="match-action pass"
              @click="skip"
              aria-label="Bỏ qua hồ sơ này để chuyển sang người kế tiếp"
              title="Bỏ qua hồ sơ này"
            >
              <Icon name="close" :size="24" />
              <span>Bỏ qua</span>
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
.match-layout {
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 52px;
  align-items: start;
}
.match-stage {
  min-width: 0;
  scroll-margin-top: 24px;
}
.match-stage > h1 { position: relative; top: 12px; }
.person-portrait > img { object-fit: cover; object-position: center; }
.person-info .section-heading { align-items: flex-start; gap: 12px; }
.person-info h2 { font-size: 21px; line-height: 1.4; overflow-wrap: anywhere; }
.person-info .section-heading > span { flex-shrink: 0; font-size: 12px; padding-top: 4px; }
.match-stage:focus-visible {
  outline: 2px solid #8fc8cf;
  outline-offset: 8px;
  border-radius: 18px;
}
.person-bio {
  font-size: 13.5px;
  line-height: 1.6;
  color: #3f5054;
  margin-top: 10px;
}
.match-actions {
  scroll-margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  margin: 28px auto 0;
}
.match-action {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #334447;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  transition: opacity .2s, transform .2s;
}
.match-action svg {
  width: 24px;
  height: 24px;
  padding: 13px;
  border: 1px solid var(--line);
  box-sizing: content-box;
  border-radius: 50%;
  background: #f0ece1;
  transition: transform .2s, box-shadow .2s, background-color .2s;
}
.match-action:hover:not(:disabled) svg {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(19, 20, 20, 0.1);
}
.match-action:active:not(:disabled) svg {
  transform: translateY(0);
}
.match-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.match-action.back svg {
  background: #eef2f3;
  color: #3b5054;
}
.match-action.back:hover:not(:disabled) svg {
  background: #e0e7e9;
}
.match-action.detail svg {
  background: #dceff1;
  color: #215157;
}
.match-action.detail:hover:not(:disabled) svg {
  background: #c7e3e7;
}
.match-action.pass svg {
  background: #f8d6cc;
  color: #913625;
}
.match-action.pass:hover:not(:disabled) svg {
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
  .match-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }
  .match-stage {
    padding: 15px 0;
    scroll-margin-top: 20px;
  }
}
@media (max-width: 600px) {
  .match-stage h1 {
    font-size: 28px;
  }
  .match-actions {
    gap: 24px;
    scroll-margin-bottom: calc(96px + env(safe-area-inset-bottom));
  }
  .match-action {
    font-size: 12px;
  }
  .match-action svg {
    width: 20px;
    height: 20px;
    padding: 11px;
  }
}
</style>
