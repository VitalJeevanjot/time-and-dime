<script setup>
defineOptions({ name: 'TimeLimit' })

defineProps({
  type: {
    type: String,
    default: 'duration',
    validator: (value) => ['duration', 'dateTime'].includes(value),
  },
})

const timeLimit = defineModel({
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
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutesAndSeconds = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
)

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
    <div v-if="type === 'duration'" class="range-fields">
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

.range-label {
  margin-bottom: 0.4rem;
  padding: 0;
  font-weight: 600;
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
