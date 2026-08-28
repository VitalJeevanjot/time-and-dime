<script setup>
import OperationPicker from './OperationPicker.vue'
import TimeLimit from './TimeLimit.vue'

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
    mode: 'duration',
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

// Keep negative for value because sometimes people might want to change value without chaging the node operation.
function toInteger(input, minimum = Number.NEGATIVE_INFINITY) {
  const number = Number(input)
  return Number.isFinite(number) ? Math.max(minimum, Math.trunc(number)) : 0
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
        step="1"
        @change="value = toInteger(value)"
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
          @change="time = toInteger(time, 0)"
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

    <TimeLimit v-if="timeLimitEnabled" v-model="timeLimit" />

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
  border: 1px solid #292929;
  border-radius: 0.75rem;
  background: #0a0a0a;
  box-shadow: 0 0.6rem 1.75rem rgb(0 0 0 / 20%);
  color: #f5f5f5;
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
}

input,
textarea,
select {
  box-sizing: border-box;
  width: 100%;
  padding: 0.95rem;
  border: 1px solid #3a3a3a;
  border-radius: 0.4rem;
  background: #181818;
  color: #f5f5f5;
  font: inherit;
  font-weight: 400;
}

input::placeholder,
textarea::placeholder {
  color: #8c8c8c;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #737373;
  outline: 2px solid rgb(255 255 255 / 16%);
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
  border: 1px solid #4a4a4a;
  border-radius: 999px;
  background: #222222;
  transition: background 160ms ease;
}

.switch-thumb {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: #a0a0a0;
  transition: transform 160ms ease, background 160ms ease;
}

.switch-label input:checked + .switch-track {
  background: #f5f5f5;
}

.switch-label input:checked + .switch-track .switch-thumb {
  background: #111111;
  transform: translateX(1.32rem);
}

.switch-label input:focus-visible + .switch-track {
  outline: 2px solid #8a8a8a;
  outline-offset: 2px;
}

@media (max-width: 28rem) {
  .time-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
