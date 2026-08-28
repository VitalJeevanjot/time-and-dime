<script setup>
import { useId } from 'vue'

const modeName = `${useId()}-time-limit-mode`

const timeLimit = defineModel({
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
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutesAndSeconds = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
)

function setMode(mode) {
  timeLimit.value = { ...timeLimit.value, mode }
}

function updateSection(section, field, value) {
  timeLimit.value = {
    ...timeLimit.value,
    [section]: {
      ...timeLimit.value[section],
      [field]: value,
    },
  }
}

function updateDuration(section, input) {
  const number = Number(input)
  updateSection(section, 'value', Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0)
}
</script>

<template>
  <section class="time-limit" aria-label="Time limit settings">
    <fieldset class="mode-field">
      <legend>Time limit type</legend>
      <div class="mode-toggle">
        <label :class="['mode-option', { active: timeLimit.mode === 'duration' }]">
          <input
            :checked="timeLimit.mode === 'duration'"
            :name="modeName"
            type="radio"
            value="duration"
            @change="setMode('duration')"
          />
          <span>Duration</span>
        </label>
        <label :class="['mode-option', { active: timeLimit.mode === 'dateTime' }]">
          <input
            :checked="timeLimit.mode === 'dateTime'"
            :name="modeName"
            type="radio"
            value="dateTime"
            @change="setMode('dateTime')"
          />
          <span>Date &amp; time</span>
        </label>
      </div>
    </fieldset>

    <div v-if="timeLimit.mode === 'duration'" class="range-fields">
      <div v-for="section in ['from', 'until']" :key="section" class="range-field">
        <span class="range-label">{{ section === 'from' ? 'From' : 'Until' }}</span>
        <div class="duration-inputs">
          <input
            :name="`${section}Value`"
            :value="timeLimit[section].value"
            type="number"
            min="0"
            step="1"
            :aria-label="`${section} value`"
            @change="updateDuration(section, $event.target.value)"
          />
          <select
            :name="`${section}Unit`"
            :value="timeLimit[section].unit"
            :aria-label="`${section} time unit`"
            @change="updateSection(section, 'unit', $event.target.value)"
          >
            <option v-for="unit in timeUnits" :key="unit" :value="unit">
              {{ unit }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-else class="range-fields">
      <div v-for="section in ['from', 'until']" :key="section" class="range-field">
        <span class="range-label">{{ section === 'from' ? 'From' : 'Until' }}</span>
        <input
          :name="`${section}Date`"
          :value="timeLimit[section].date"
          type="date"
          :aria-label="`${section} date`"
          @input="updateSection(section, 'date', $event.target.value)"
        />
        <div class="clock-inputs">
          <select
            :name="`${section}Hours`"
            :value="timeLimit[section].hours"
            :aria-label="`${section} hours`"
            @change="updateSection(section, 'hours', $event.target.value)"
          >
            <option v-for="hour in hours" :key="hour" :value="hour">{{ hour }}</option>
          </select>
          <span aria-hidden="true">:</span>
          <select
            :name="`${section}Minutes`"
            :value="timeLimit[section].minutes"
            :aria-label="`${section} minutes`"
            @change="updateSection(section, 'minutes', $event.target.value)"
          >
            <option v-for="minute in minutesAndSeconds" :key="minute" :value="minute">
              {{ minute }}
            </option>
          </select>
          <span aria-hidden="true">:</span>
          <select
            :name="`${section}Seconds`"
            :value="timeLimit[section].seconds"
            :aria-label="`${section} seconds`"
            @change="updateSection(section, 'seconds', $event.target.value)"
          >
            <option v-for="second in minutesAndSeconds" :key="second" :value="second">
              {{ second }}
            </option>
          </select>
        </div>
        <span class="clock-hint">24-hour time (HH:MM:SS)</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.time-limit {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #303030;
  border-radius: 0.65rem;
  background: #111111;
}

.mode-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.mode-field legend,
.range-label {
  margin-bottom: 0.4rem;
  padding: 0;
  font-weight: 600;
}

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0.25rem;
  border: 1px solid #3a3a3a;
  border-radius: 0.5rem;
  background: #181818;
}

.mode-option {
  padding: 0.65rem 0.75rem;
  border-radius: 0.35rem;
  color: #a8a8a8;
  cursor: pointer;
  text-align: center;
}

.mode-option.active {
  background: #f5f5f5;
  color: #111111;
}

.mode-option:focus-within {
  outline: 2px solid #8a8a8a;
  outline-offset: 1px;
}

.mode-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.range-fields,
.range-field {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.range-field {
  gap: 0.45rem;
}

.duration-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(9rem, 0.8fr);
  gap: 0.75rem;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #3a3a3a;
  border-radius: 0.4rem;
  background: #181818;
  color: #f5f5f5;
  font: inherit;
  font-weight: 400;
}

input:focus,
select:focus {
  border-color: #737373;
  outline: 2px solid rgb(255 255 255 / 16%);
  outline-offset: 1px;
}

.clock-inputs {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 0.35rem;
}

.clock-inputs > span {
  font-weight: 700;
}

.clock-hint {
  color: #8c8c8c;
  font-size: 0.8rem;
}

@media (max-width: 28rem) {
  .duration-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
