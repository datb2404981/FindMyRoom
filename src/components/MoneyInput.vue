<script setup>
import { computed, nextTick, ref } from 'vue'

const props = defineProps({ modelValue: [Number, String], label: { type: String, required: true }, invalid: Boolean })
const emit = defineEmits(['update:modelValue'])
const input = ref(null)
const amount = computed(() => props.modelValue === '' || props.modelValue == null ? '' : Number(props.modelValue))
const display = computed(() => amount.value === '' || !Number.isFinite(amount.value) ? '' : new Intl.NumberFormat('vi-VN').format(amount.value))

function updateUnits(units, cursor) {
  const digits = units.replace(/\D/g, '').slice(0, 12)
  emit('update:modelValue', digits ? Number(digits) * 1000 : '')
  nextTick(() => {
    if (!input.value || document.activeElement !== input.value) return
    const text = input.value.value
    let index = 0, found = 0
    while (index < text.length && found < Math.min(cursor, digits.length)) {
      if (/\d/.test(text[index])) found++
      index++
    }
    input.value.setSelectionRange(index, index)
  })
}

function edit(inputType, inserted = '') {
  const element = input.value
  const units = amount.value === '' ? '' : String(Math.trunc(amount.value / 1000))
  const count = position => Math.min((element.value.slice(0, position).match(/\d/g) || []).length, units.length)
  let start = count(element.selectionStart), end = count(element.selectionEnd)
  if (inputType === 'deleteContentBackward' && start === end) start = Math.max(0, start - 1)
  if (inputType === 'deleteContentForward' && start === end) end = Math.min(units.length, end + 1)
  const digits = inserted.replace(/\D/g, '')
  updateUnits(units.slice(0, start) + digits + units.slice(end), start + digits.length)
}

function beforeInput(event) {
  if (event.isComposing) return
  if (event.inputType === 'insertText' || event.inputType === 'insertReplacementText') {
    event.preventDefault()
    if (/^\d+$/.test(event.data || '')) edit(event.inputType, event.data)
  } else if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward' || event.inputType === 'deleteByCut') {
    event.preventDefault()
    edit(event.inputType)
  }
}

function paste(event) {
  const text = event.clipboardData.getData('text').trim()
  const units = /^\d{1,3}(\.\d{3})+$/.test(text) && text.endsWith('.000')
    ? text.replace(/\D/g, '').slice(0, -3)
    : text.replace(/\D/g, '')
  if (units) edit('insertFromPaste', units)
}

function step(direction) {
  const next = Math.max(0, (Number(amount.value) || 0) + direction * 1000)
  emit('update:modelValue', Math.min(next, 999999999999000))
}
</script>

<template>
  <div class="money-input">
    <input ref="input" :value="display" type="text" inputmode="numeric" role="spinbutton"
      :aria-label="label" :aria-invalid="invalid" aria-valuemin="0" :aria-valuenow="amount === '' ? undefined : amount"
      :aria-valuetext="display ? display + ' đồng' : undefined" placeholder="Nhập giá trị"
      @beforeinput="beforeInput" @paste.prevent="paste" @input="updateUnits($event.target.value, $event.target.value.length)"
      @keydown.up.prevent="step(1)" @keydown.down.prevent="step(-1)">
    <input class="money-stepper" type="number" value="0" :aria-label="'Điều chỉnh ' + label"
      @input="step(Number($event.target.value)); $event.target.value = 0">
  </div>
</template>

<style scoped>
.money-input { position: relative; min-width: 0; }
.money-input > input:first-child { width: 100%; min-width: 0; padding-right: 42px !important; }
.money-input .money-stepper { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 22px !important; height: 30px; padding: 0 !important; border: 0 !important; background: transparent !important; color: transparent; opacity: 0; }
.money-input:hover .money-stepper, .money-stepper:focus-visible { opacity: 1; }
</style>
