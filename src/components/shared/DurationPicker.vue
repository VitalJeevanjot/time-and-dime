<script setup>
defineOptions({ name: 'DurationPicker' })

const duration = defineModel('duration', { type: Number, default: 0 })
const durationUnit = defineModel('durationUnit', { type: String, default: 'Seconds' })

const timeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

function normalizeDuration() {
  const number = Number(duration.value)
  duration.value = Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}
</script>

<template>
  <div class="duration-inputs">
    <label>
      <span class="visually-hidden">Duration value</span>
      <input
        v-model.number="duration"
        name="endDuration"
        type="number"
        min="0"
        step="1"
        aria-label="Duration value"
        @change="normalizeDuration"
      />
    </label>
    <label>
      <span class="visually-hidden">Duration unit</span>
      <select v-model="durationUnit" name="endDurationUnit" aria-label="Duration unit">
        <option v-for="unit in timeUnits" :key="unit" :value="unit">{{ unit }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.duration-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 0.8fr);
  gap: 0.75rem;
}

.duration-inputs input,
.duration-inputs select {
  box-sizing: border-box;
  width: 100%;
  height: 3.1rem;
  padding: 0.85rem;
  border: 1px solid #c8c8c8;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #181818;
}

.duration-inputs input:focus,
.duration-inputs select:focus {
  border-color: #555555;
  outline: 3px solid rgb(0 0 0 / 10%);
  outline-offset: 1px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 30rem) {
  .duration-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
