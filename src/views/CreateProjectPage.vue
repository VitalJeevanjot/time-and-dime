<script setup>
import { ref } from 'vue'
import EndTimePicker from '../components/shared/EndTimePicker.vue'

const name = ref('')
const description = ref('')
const endTimeMode = ref('duration')
const endDuration = ref(0)
const endDurationUnit = ref('Seconds')
const endDate = ref('')
const endHours = ref('00')
const endMinutes = ref('00')
const endSeconds = ref('00')
</script>

<template>
  <main class="create-page">
    <form class="project-form" @submit.prevent>
      <header class="form-header">
        <div>
          <p class="eyebrow">Time&amp;Dime</p>
          <h1>Create project</h1>
        </div>
        <RouterLink to="/">Cancel</RouterLink>
      </header>

      <label class="field">
        <span>Name</span>
        <input v-model.trim="name" name="name" type="text" placeholder="Project name" required />
      </label>

      <label class="field">
        <span>Description</span>
        <textarea
          v-model.trim="description"
          name="description"
          rows="4"
          placeholder="Describe the project"
        ></textarea>
      </label>

      <EndTimePicker
        v-model:mode="endTimeMode"
        v-model:duration="endDuration"
        v-model:duration-unit="endDurationUnit"
        v-model:date="endDate"
        v-model:hours="endHours"
        v-model:minutes="endMinutes"
        v-model:seconds="endSeconds"
      />

      <button class="create-button" type="submit">Create project</button>
    </form>
  </main>
</template>

<style scoped>
.create-page {
  display: grid;
  box-sizing: border-box;
  min-height: 100dvh;
  padding: 2rem 1rem;
  place-items: center;
}

.project-form {
  display: flex;
  box-sizing: border-box;
  width: min(38rem, 100%);
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
  border: 1px solid #dedede;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 0.8rem 2.5rem rgb(0 0 0 / 8%);
}

.form-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.form-header a {
  color: #333333;
  font-weight: 700;
  text-underline-offset: 0.2rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #666666;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 2rem;
  letter-spacing: -0.035em;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-weight: 700;
}

.field input,
.field textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0.85rem;
  border: 1px solid #c8c8c8;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #181818;
  font-weight: 400;
}

.field textarea {
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  border-color: #555555;
  outline: 3px solid rgb(0 0 0 / 10%);
  outline-offset: 1px;
}

.create-button {
  width: 100%;
  padding: 0.95rem 1.15rem;
  border: 0;
  border-radius: 0.55rem;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

.create-button:hover {
  background: #303030;
}

.create-button:focus-visible {
  outline: 3px solid rgb(0 0 0 / 25%);
  outline-offset: 3px;
}

@media (max-width: 30rem) {
  .project-form {
    padding: 1.25rem;
  }
}
</style>
