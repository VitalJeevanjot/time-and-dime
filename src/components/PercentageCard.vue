<script setup>
import OperationPicker from './OperationPicker.vue'

const operation = defineModel('operation', { type: String, default: '+' })
const name = defineModel('name', { type: String, default: '' })
const description = defineModel('description', { type: String, default: '' })
const percentage = defineModel('percentage', { type: Number, default: 0 })
const valueSource = defineModel('valueSource', { type: String, default: 'Original' })
const time = defineModel('time', { type: Number, default: 0 })
const timeUnit = defineModel('timeUnit', { type: String, default: 'Second' })

const timeUnits = ['Millisecond', 'Second', 'Minute', 'Hours', 'Days', 'Months', 'Years']

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

     <fieldset class="field source-field">
      <legend>Value source</legend>
      <div class="source-toggle">
        <label :class="['source-option', { active: valueSource === 'Original' }]">
          <input v-model="valueSource" name="valueSource" type="radio" value="Original" />
          <span>Original</span>
        </label>
        <label :class="['source-option', { active: valueSource === 'Current' }]">
          <input v-model="valueSource" name="valueSource" type="radio" value="Current" />
          <span>Current</span>
        </label>
      </div>
    </fieldset>

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
  color: #a0a0a0;
  font-weight: 400;
  transform: translateY(-50%);
}

.source-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.source-field legend {
  margin-bottom: 0.4rem;
  padding: 0;
}

.source-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0.25rem;
  border: 1px solid #3a3a3a;
  border-radius: 0.5rem;
  background: #181818;
}

.source-option {
  padding: 0.65rem 0.75rem;
  border-radius: 0.35rem;
  color: #a8a8a8;
  cursor: pointer;
  text-align: center;
}

.source-option.active {
  background: #f5f5f5;
  color: #111111;
}

.source-option:focus-within {
  outline: 2px solid #8a8a8a;
  outline-offset: 1px;
}

.source-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.time-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(9rem, 0.8fr);
  gap: 0.75rem;
}

@media (max-width: 28rem) {
  .time-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
