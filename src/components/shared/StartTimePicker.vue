<script setup>
defineOptions({ name: 'StartTimePicker' })

const date = defineModel('date', { type: String, default: '' })
const hours = defineModel('hours', { type: String, default: '00' })
const minutes = defineModel('minutes', { type: String, default: '00' })
const seconds = defineModel('seconds', { type: String, default: '00' })

const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minuteSecondOptions = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
)
</script>

<template>
  <fieldset class="start-time-field">
    <legend>Start time</legend>

    <label class="date-field">
      <span>Date</span>
      <input v-model="date" name="startDate" type="date" required />
    </label>

    <div class="time-field">
      <span>Time</span>
      <div class="clock-inputs">
        <select v-model="hours" name="startHours" aria-label="Start time hours">
          <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ hour }}</option>
        </select>
        <span aria-hidden="true">:</span>
        <select v-model="minutes" name="startMinutes" aria-label="Start time minutes">
          <option v-for="minute in minuteSecondOptions" :key="minute" :value="minute">
            {{ minute }}
          </option>
        </select>
        <span aria-hidden="true">:</span>
        <select v-model="seconds" name="startSeconds" aria-label="Start time seconds">
          <option v-for="second in minuteSecondOptions" :key="second" :value="second">
            {{ second }}
          </option>
        </select>
      </div>
      <small>24-hour time (HH:MM:SS)</small>
    </div>
  </fieldset>
</template>

<style scoped>
.start-time-field,
.date-field,
.time-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.45rem;
}

.start-time-field {
  margin: 0;
  padding: 1rem;
  border: 1px solid #d8d8d8;
  border-radius: 0.65rem;
  gap: 0.85rem;
}

legend {
  padding-inline: 0.35rem;
  font-weight: 700;
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
</style>
