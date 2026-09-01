<script setup>
import OperationPicker from './shared/OperationPicker.vue'
import TimeLimit from './shared/TimeLimit.vue'

defineProps({
  timeLimitType: {
    type: String,
    default: 'duration',
    validator: (value) => ['duration', 'dateTime'].includes(value),
  },
})

const operation = defineModel('operation', { type: String, default: '+' })
const name = defineModel('name', { type: String, default: '' })
const description = defineModel('description', { type: String, default: '' })
const value = defineModel('value', { type: Number, default: 0 })
const time = defineModel('time', { type: Number, default: 0 })
const timeUnit = defineModel('timeUnit', { type: String, default: 'Seconds' })
const timeLimitEnabled = defineModel('timeLimitEnabled', { type: Boolean, default: false })
const timeLimit = defineModel('timeLimit', {
  type: Object,
  default: () => ({
    from: {
      value: 0,
      unit: 'Seconds',
      date: '',
      hours: '00',
      minutes: '00',
      seconds: '00',
    },
    until: {
      value: 0,
      unit: 'Seconds',
      date: '',
      hours: '00',
      minutes: '00',
      seconds: '00',
    },
  }),
})

const timeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

function toFiniteNumber(input) {
  const number = Number(input)
  return Number.isFinite(number) ? number : 0
}

function toNonNegativeInteger(input) {
  const number = Number(input)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}
</script>

<template>
  <article class="value-card">
    <OperationPicker v-model="operation" />

    <label class="field">
      <span>Value</span>
      <input
        v-model.number="value"
        name="value"
        type="number"
        step="any"
        @change="value = toFiniteNumber(value)"
      />
    </label>

    <div class="field">
      <span>Time</span>
      <div class="time-inputs">
        <input
          v-model.number="time"
          name="time"
          type="number"
          min="0"
          step="1"
          @change="time = toNonNegativeInteger(time)"
        />
        <select v-model="timeUnit" name="timeUnit" aria-label="Time unit">
          <option v-for="unit in timeUnits" :key="unit" :value="unit">
            {{ unit }}
          </option>
        </select>
      </div>
    </div>

    <div class="time-limit-control">
      <span>Time limit</span>
      <label class="switch-label">
        <input v-model="timeLimitEnabled" type="checkbox" role="switch" />
        <span class="switch-track" aria-hidden="true">
          <span class="switch-thumb"></span>
        </span>
        <span>{{ timeLimitEnabled ? 'On' : 'Off' }}</span>
      </label>
    </div>

    <TimeLimit v-if="timeLimitEnabled" v-model="timeLimit" :type="timeLimitType" />

    <label class="field">
      <span>Name</span>
      <input v-model.trim="name" name="name" type="text" placeholder="Enter a name" />
    </label>

    <label class="field">
      <span>Description</span>
      <textarea
        v-model.trim="description"
        name="description"
        rows="3"
        placeholder="Enter a description"
      ></textarea>
    </label>
  </article>
</template>

<style scoped>
.value-card {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  flex-direction: column;
  gap: 1rem;
  padding: 1.75rem;
  border: 1px solid #ffb46d;
  border-radius: 0.75rem;
  background: #f28a2a;
  box-shadow: 0 0.7rem 2rem rgb(210 101 18 / 24%);
  color: #fffaf4;
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  font-weight: 600;
}

input,
textarea,
select {
  box-sizing: border-box;
  width: 100%;
  padding: 0.68rem 0.82rem;
  border: 1px solid #f0d4bd;
  border-radius: 0.55rem;
  background: rgb(255 249 243 / 97%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 72%);
  color: #5b2500;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 400;
}

input::placeholder,
textarea::placeholder {
  color: #aa8061;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #fff1e1;
  outline: 2px solid rgb(255 244 232 / 52%);
  outline-offset: 1px;
}

textarea {
  resize: vertical;
}

.time-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(9rem, 0.8fr);
  gap: 0.75rem;
}

.time-limit-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-weight: 600;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}

.switch-label input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.switch-track {
  display: flex;
  width: 3rem;
  height: 1.65rem;
  box-sizing: border-box;
  align-items: center;
  padding: 0.18rem;
  border: 1px solid #f5d2af;
  border-radius: 999px;
  background: #eaae75;
  transition: background 160ms ease;
}

.switch-thumb {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: #fff0df;
  transition: transform 160ms ease, background 160ms ease;
}

.switch-label input:checked + .switch-track {
  background: #f4d1ae;
}

.switch-label input:checked + .switch-track .switch-thumb {
  background: #a95d28;
  transform: translateX(1.32rem);
}

.switch-label input:focus-visible + .switch-track {
  outline: 2px solid #fff1e1;
  outline-offset: 2px;
}

.value-card :deep(.operation-picker select) {
  padding: 0.78rem 0.9rem;
  border-width: 1px;
  border-radius: 0.55rem;
  border-color: #f0d4bd;
  background: rgb(255 249 243 / 97%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 72%);
  color: #5b2500;
}

.value-card :deep(.operation-picker select:focus) {
  border-color: #fff1e1;
  outline-color: rgb(255 244 232 / 52%);
}

.value-card :deep(.time-limit) {
  border-color: #ffb46d;
  background: rgb(244 126 31 / 90%);
}

.value-card :deep(.time-limit input),
.value-card :deep(.time-limit select) {
  padding: 0.68rem 0.78rem;
  border-radius: 0.5rem;
  border-color: #f0d4bd;
  background: #fff9f3;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 72%);
  color: #5b2500;
}

@media (max-width: 28rem) {
  .time-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
