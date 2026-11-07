<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  label: { type: String, required: true },
  placeholder: { type: String, default: 'Chọn' },
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  id: { type: String, default: undefined },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null), trigger = ref(null), open = ref(false), opensUp = ref(false), optionRefs = ref([])
const items = computed(() => props.options.map(item => typeof item === 'object' ? item : ({ value: item, label: String(item) })))
const selected = computed(() => items.value.find(item => item.value === props.modelValue))
function close(restore = false) {
  open.value = false
  if (restore) nextTick(() => trigger.value?.focus())
}
function toggle() {
  if (props.disabled) return
  if (!open.value) {
    document.dispatchEvent(new CustomEvent('app-dropdown-open', { detail: root.value }))
    const rect = trigger.value?.getBoundingClientRect()
    opensUp.value = !!rect && window.innerHeight - rect.bottom < Math.min(300, items.value.length * 44 + 24) && rect.top > window.innerHeight - rect.bottom
  }
  open.value = !open.value
  if (open.value) nextTick(() => optionRefs.value[Math.max(0, items.value.findIndex(item => item.value === props.modelValue))]?.focus())
}
function choose(value) { emit('update:modelValue', value); close(true) }
function onKeydown(event, index) {
  const key = event.key
  if (key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
  else if (key === 'ArrowDown' || key === 'ArrowUp') {
    event.preventDefault()
    const len = items.value.length
    if (len) optionRefs.value[(index + (key === 'ArrowDown' ? 1 : -1) + len) % len]?.focus()
  } else if (key === 'Home' || key === 'End') {
    event.preventDefault()
    optionRefs.value[key === 'Home' ? 0 : items.value.length - 1]?.focus()
  } else if (key === 'Tab') close()
}
function outside(event) { if (!root.value?.contains(event.target)) close() }
function otherOpened(event) { if (event.detail !== root.value) close() }
watch(() => props.disabled, value => { if (value) close() })
onMounted(() => { document.addEventListener('pointerdown', outside); document.addEventListener('app-dropdown-open', otherOpened) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', outside); document.removeEventListener('app-dropdown-open', otherOpened) })
</script>

<template>
  <div ref="root" class="app-dropdown" :class="{ 'is-open': open, 'opens-up': opensUp, 'is-invalid': invalid, 'is-disabled': disabled }">
    <button :id="id" ref="trigger" type="button" class="app-dropdown-trigger" :aria-label="label" :aria-invalid="invalid || undefined" aria-haspopup="listbox" :aria-expanded="open" :disabled="disabled" @click="toggle" @keydown.down.prevent="!open && toggle()" @keydown.up.prevent="!open && toggle()" @keydown.esc.stop="close(true)">
      <span class="app-dropdown-value" :class="{ placeholder: !selected }">{{ selected?.label ?? placeholder }}</span>
      <span class="app-dropdown-arrow" aria-hidden="true"><Icon name="down" :size="16" /></span>
    </button>
    <Transition name="app-dropdown-pop">
      <div v-if="open" class="app-dropdown-menu" role="listbox" :aria-label="label">
        <button v-for="(item, index) in items" :key="item.value" :ref="el => optionRefs[index] = el" type="button" role="option" class="app-dropdown-option" :aria-selected="modelValue === item.value" :class="{ selected: modelValue === item.value }" @click="choose(item.value)" @keydown="onKeydown($event, index)">
          <span>{{ item.label }}</span><Icon v-if="modelValue === item.value" name="check" :size="16" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-dropdown{position:relative;width:100%;min-width:0}
.app-dropdown-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:50px;padding:0 16px;text-align:left;background:#fff;border:1px solid rgba(140,148,150,.5);border-radius:8px;color:var(--ink,#131414);font:inherit;font-size:14px;cursor:pointer;transition:border-color .2s,box-shadow .2s}
.app-dropdown-trigger:hover:not(:disabled){border-color:#5d6769}
.app-dropdown-trigger:focus-visible,.is-open .app-dropdown-trigger{outline:none;border-color:#638d92;box-shadow:0 0 0 3px rgba(143,200,207,.45)}
.is-invalid .app-dropdown-trigger{border-color:#c54c42}
.is-disabled .app-dropdown-trigger{cursor:not-allowed;opacity:.65;background:#f5f5f2}
.app-dropdown-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.app-dropdown-value.placeholder{color:var(--muted,#647076)}
.app-dropdown-arrow{display:inline-flex;flex-shrink:0;color:var(--muted,#647076);transition:transform .2s}
.is-open .app-dropdown-arrow{transform:rotate(180deg)}
.app-dropdown-menu{position:absolute;z-index:100;top:calc(100% + 6px);left:0;right:0;max-height:min(300px,45vh);overflow-y:auto;padding:6px;background:#fff;border:1px solid rgba(19,20,20,.12);border-radius:12px;box-shadow:0 4px 6px -1px rgba(19,20,20,.06),0 12px 24px -4px rgba(19,20,20,.12);display:flex;flex-direction:column;gap:3px;transform-origin:top center}
.opens-up .app-dropdown-menu{top:auto;bottom:calc(100% + 6px);transform-origin:bottom center}
.app-dropdown-option{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:40px;padding:10px 14px;border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;font:inherit;font-size:14px;color:var(--ink,#131414);cursor:pointer;transition:background-color .15s}
.app-dropdown-option:hover,.app-dropdown-option:focus-visible{background:var(--cream,#faf7f0);outline:none}
.app-dropdown-option.selected{background:var(--cream-deep,#f8eed3);font-weight:600}
.app-dropdown-option.selected svg{flex-shrink:0;color:#b4831e}
.app-dropdown-pop-enter-active,.app-dropdown-pop-leave-active{transition:opacity .18s,transform .18s}
.app-dropdown-pop-enter-from,.app-dropdown-pop-leave-to{opacity:0;transform:translateY(-4px) scale(.98)}
@media(max-width:600px){.app-dropdown-trigger,.app-dropdown-option{font-size:16px}.app-dropdown-option{padding:12px 14px}}
@media(prefers-reduced-motion:reduce){.app-dropdown-trigger,.app-dropdown-arrow,.app-dropdown-option,.app-dropdown-pop-enter-active,.app-dropdown-pop-leave-active{transition:none!important}}
</style>
