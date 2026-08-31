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
const percentage = defineModel('percentage', { type: Number, default: 0 })
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

const timeUnits = ['Millisecond', 'Seconds', 'Minute', 'Hours', 'Days', 'Months', 'Years']

function toPercentage(input) {
  const number = Number(input)
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0
}

function toNonNegativeInteger(input) {
  const number = Number(input)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}
</script>

<template>
  <article class="percentage-card">
    <OperationPicker v-model="operation" />

    <label class="field">
      <span>Percentage</span>
      <span class="percentage-input">
        <input
          v-model.number="percentage"
          name="percentage"
          type="number"
          min="0"
          max="100"
          step="0.1"
          @change="percentage = toPercentage(percentage)"
        />
        <span class="percentage-symbol" aria-hidden="true">%</span>
      </span>
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
.percentage-card {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  flex-direction: column;
  gap: 1rem;
  padding: 1.75rem;
  border: 1px solid #1d3a2a;
  border-radius: 0.75rem;
  background:
    radial-gradient(circle at 20% 10%, rgb(43 139 87 / 14%), transparent 28%),
    radial-gradient(circle at 84% 90%, rgb(10 78 42 / 22%), transparent 38%),
    radial-gradient(circle at 48% 42%, #0a160f 0%, #050c08 58%, #010302 100%);
  box-shadow:
    inset 0 1px 0 rgb(159 235 190 / 6%),
    inset -1.75rem -1.75rem 3.25rem rgb(0 0 0 / 34%),
    0 0.7rem 2rem rgb(0 16 8 / 34%),
    0 0 1.75rem rgb(12 82 43 / 7%);
  color: #edf7f0;
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
  border: 1px solid #203d2d;
  border-radius: 0.55rem;
  background: rgb(4 13 8 / 92%);
  box-shadow: inset 0 1px 0 rgb(151 224 181 / 7%);
  color: #edf7f0;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 400;
}

input::placeholder,
textarea::placeholder {
  color: #6f8878;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #397555;
  outline: 2px solid rgb(69 166 108 / 17%);
  outline-offset: 1px;
}

textarea {
  resize: vertical;
}

.percentage-input {
  position: relative;
  display: block;
}

.percentage-input input {
  padding-right: 2.5rem;
}

.percentage-symbol {
  position: absolute;
  top: 50%;
  right: 1rem;
  color: #72907f;
  font-weight: 400;
  transform: translateY(-50%);
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
  border: 1px solid #294d38;
  border-radius: 999px;
  background: #0b1b12;
  transition: background 160ms ease;
}

.switch-thumb {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: #688376;
  transition: transform 160ms ease, background 160ms ease;
}

.switch-label input:checked + .switch-track {
  background: #5aba82;
}

.switch-label input:checked + .switch-track .switch-thumb {
  background: #050c08;
  transform: translateX(1.32rem);
}

.switch-label input:focus-visible + .switch-track {
  outline: 2px solid #478862;
  outline-offset: 2px;
}

.percentage-card :deep(.operation-picker select) {
  padding: 0.78rem 0.9rem;
  border-width: 1px;
  border-radius: 0.55rem;
  border-color: #294d38;
  background: rgb(4 13 8 / 92%);
  box-shadow: inset 0 1px 0 rgb(151 224 181 / 7%);
  color: #edf7f0;
}

.percentage-card :deep(.operation-picker select:focus) {
  border-color: #397555;
  outline-color: rgb(69 166 108 / 17%);
}

.percentage-card :deep(.time-limit) {
  border-color: #203d2d;
  background: rgb(3 10 6 / 78%);
}

.percentage-card :deep(.time-limit input),
.percentage-card :deep(.time-limit select) {
  padding: 0.68rem 0.78rem;
  border-radius: 0.5rem;
  border-color: #203d2d;
  background: #07120b;
  box-shadow: inset 0 1px 0 rgb(151 224 181 / 7%);
  color: #edf7f0;
}

@media (max-width: 28rem) {
  .time-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
