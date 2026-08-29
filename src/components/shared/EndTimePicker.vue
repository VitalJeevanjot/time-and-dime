<script setup>
import { useId } from 'vue'

defineOptions({ name: 'EndTimePicker' })

const mode = defineModel('mode', { type: String, default: 'duration' })
const duration = defineModel('duration', { type: Number, default: 0 })
const durationUnit = defineModel('durationUnit', { type: String, default: 'Seconds' })
const date = defineModel('date', { type: String, default: '' })
const hours = defineModel('hours', { type: String, default: '00' })
const minutes = defineModel('minutes', { type: String, default: '00' })
const seconds = defineModel('seconds', { type: String, default: '00' })

const modeName = `${useId()}-end-time-mode`
const timeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']
const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minuteSecondOptions = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
)

function normalizeDuration() {
  const number = Number(duration.value)
  duration.value = Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}
</script>

<template>
  <fieldset class="end-time-field">
    <legend>End time</legend>

    <div class="mode-toggle">
      <label :class="['mode-option', { active: mode === 'duration' }]">
        <input v-model="mode" :name="modeName" type="radio" value="duration" />
        <span>Duration</span>
      </label>
      <label :class="['mode-option', { active: mode === 'dateTime' }]">
        <input v-model="mode" :name="modeName" type="radio" value="dateTime" />
        <span>Date &amp; time</span>
      </label>
    </div>

    <div v-if="mode === 'duration'" class="duration-inputs">
      <label>
        <span class="visually-hidden">Duration value</span>
        <input
          v-model.number="duration"
          name="endDuration"
          type="number"
          min="0"
          step="1"
          aria-label="End time duration"
          @change="normalizeDuration"
        />
      </label>
      <label>
        <span class="visually-hidden">Duration unit</span>
        <select v-model="durationUnit" name="endDurationUnit" aria-label="End time unit">
          <option v-for="unit in timeUnits" :key="unit" :value="unit">{{ unit }}</option>
        </select>
      </label>
    </div>

    <div v-else class="date-time-inputs">
      <label class="date-field">
        <span>Date</span>
        <input v-model="date" name="endDate" type="date" />
      </label>

      <div class="time-field">
        <span>Time</span>
        <div class="clock-inputs">
          <select v-model="hours" name="endHours" aria-label="End time hours">
            <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
          </select>
          <span aria-hidden="true">:</span>
          <select v-model="minutes" name="endMinutes" aria-label="End time minutes">
            <option v-for="minute in minuteSecondOptions" :key="minute" :value="minute">
              {{ minute }}
            </option>
          </select>
          <span aria-hidden="true">:</span>
          <select v-model="seconds" name="endSeconds" aria-label="End time seconds">
            <option v-for="second in minuteSecondOptions" :key="second" :value="second">
              {{ second }}
            </option>
          </select>
        </div>
        <small>24-hour time (HH:MM:SS)</small>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.end-time-field {
  display: flex;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  flex-direction: column;
  gap: 0.85rem;
}

legend {
  margin-bottom: 0.45rem;
  padding: 0;
  font-weight: 700;
}

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0.25rem;
  border: 1px solid #cccccc;
  border-radius: 0.6rem;
  background: #eeeeee;
}

.mode-option {
  padding: 0.7rem 0.8rem;
  border-radius: 0.4rem;
  color: #686868;
  cursor: pointer;
  font-weight: 700;
  text-align: center;
}

.mode-option.active {
  background: #ffffff;
  color: #161616;
  box-shadow: 0 0.15rem 0.5rem rgb(0 0 0 / 10%);
}

.mode-option:focus-within {
  outline: 2px solid #444444;
  outline-offset: 1px;
}

.mode-option input,
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.duration-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 0.8fr);
  gap: 0.75rem;
}

.duration-inputs input,
.duration-inputs select {
  height: 3.1rem;
}

.date-time-inputs,
.date-field,
.time-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.date-time-inputs {
  gap: 0.85rem;
}

.date-field > span,
.time-field > span {
  font-weight: 700;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
  padding: 0.85rem;
  border: 1px solid #c8c8c8;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #181818;
}

input:focus,
select:focus {
  border-color: #555555;
  outline: 3px solid rgb(0 0 0 / 10%);
  outline-offset: 1px;
}

.clock-inputs {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 0.4rem;
}

.clock-inputs > span {
  font-weight: 700;
}

small {
  color: #707070;
}

@media (max-width: 30rem) {
  .duration-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
