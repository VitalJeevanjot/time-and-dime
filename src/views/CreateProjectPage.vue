<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import EndTimePicker from '../components/shared/EndTimePicker.vue'
import { saveProject } from '../services/projectStorage.js'

const router = useRouter()
const webMcpController = new AbortController()
const endTimeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

const name = ref('')
const description = ref('')
const endTimeMode = ref('duration')
const endDuration = ref(0)
const endDurationUnit = ref('Seconds')
const endDate = ref('')
const endHours = ref('00')
const endMinutes = ref('00')
const endSeconds = ref('00')
const formError = ref('')

function normalizeClockPart(value, maximum) {
  const number = Number(value)
  const normalized = Number.isFinite(number) ? Math.min(maximum, Math.max(0, Math.trunc(number))) : 0
  return String(normalized).padStart(2, '0')
}

function normalizeProjectInput(input) {
  const mode = input.endTimeMode === 'dateTime' ? 'dateTime' : 'duration'
  const duration = Number(input.endDuration)

  return {
    name: String(input.name ?? '').trim(),
    description: String(input.description ?? '').trim(),
    endTime: {
      mode,
      duration: Number.isFinite(duration) ? Math.max(0, Math.trunc(duration)) : 0,
      durationUnit: endTimeUnits.includes(input.endDurationUnit)
        ? input.endDurationUnit
        : 'Seconds',
      date: String(input.endDate ?? ''),
      hours: normalizeClockPart(input.endHours, 23),
      minutes: normalizeClockPart(input.endMinutes, 59),
      seconds: normalizeClockPart(input.endSeconds, 59),
    },
  }
}

function getFormProjectInput() {
  return {
    name: name.value,
    description: description.value,
    endTimeMode: endTimeMode.value,
    endDuration: endDuration.value,
    endDurationUnit: endDurationUnit.value,
    endDate: endDate.value,
    endHours: endHours.value,
    endMinutes: endMinutes.value,
    endSeconds: endSeconds.value,
  }
}

function applyProjectInput(projectDetails) {
  name.value = projectDetails.name
  description.value = projectDetails.description
  endTimeMode.value = projectDetails.endTime.mode
  endDuration.value = projectDetails.endTime.duration
  endDurationUnit.value = projectDetails.endTime.durationUnit
  endDate.value = projectDetails.endTime.date
  endHours.value = projectDetails.endTime.hours
  endMinutes.value = projectDetails.endTime.minutes
  endSeconds.value = projectDetails.endTime.seconds
}

function createProject(projectDetails) {
  if (!projectDetails.name) throw new Error('A project name is required.')
  if (projectDetails.endTime.mode === 'dateTime' && !projectDetails.endTime.date) {
    throw new Error('An end date is required for Date & time projects.')
  }

  const project = saveProject(projectDetails)
  void router.push({ name: 'project', params: { id: project.id } })
  return project
}

function submitProject() {
  formError.value = ''

  try {
    createProject(normalizeProjectInput(getFormProjectInput()))
  } catch (error) {
    formError.value =
      error instanceof Error
        ? error.message
        : 'The project could not be saved in local storage. Please try again.'
  }
}

onMounted(async () => {
  if (!document.modelContext?.registerTool) return

  try {
    await document.modelContext.registerTool(
      {
        name: 'create_project',
        description:
          'Create a Time&Dime project, store it locally, and open its project page. Provide either a duration or an exact date and 24-hour time for the project end time.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              description: 'Name of the project.',
            },
            description: {
              type: 'string',
              description: 'Optional description of the project.',
            },
            endTimeMode: {
              type: 'string',
              enum: ['duration', 'dateTime'],
              description: 'Whether the project ends after a duration or at an exact date and time.',
            },
            endDuration: {
              type: 'integer',
              minimum: 0,
              description: 'Non-negative duration value. Used when endTimeMode is duration.',
            },
            endDurationUnit: {
              type: 'string',
              enum: endTimeUnits,
              description: 'Unit for endDuration. Used when endTimeMode is duration.',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'End date in YYYY-MM-DD format. Used when endTimeMode is dateTime.',
            },
            endHours: {
              type: 'integer',
              minimum: 0,
              maximum: 23,
              description: 'End hour in 24-hour time. Used when endTimeMode is dateTime.',
            },
            endMinutes: {
              type: 'integer',
              minimum: 0,
              maximum: 59,
              description: 'End minute. Used when endTimeMode is dateTime.',
            },
            endSeconds: {
              type: 'integer',
              minimum: 0,
              maximum: 59,
              description: 'End second. Used when endTimeMode is dateTime.',
            },
          },
          required: ['name', 'endTimeMode'],
          additionalProperties: false,
        },
        execute: (input) => {
          const projectDetails = normalizeProjectInput(input)
          applyProjectInput(projectDetails)
          const project = createProject(projectDetails)
          return `Created project "${project.name}" with ID ${project.id}.`
        },
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: false,
        },
      },
      { signal: webMcpController.signal },
    )
  } catch (error) {
    if (!webMcpController.signal.aborted) {
      console.warn('Could not register the WebMCP create-project tool.', error)
    }
  }
})

onUnmounted(() => {
  webMcpController.abort()
})
</script>

<template>
  <main class="create-page">
    <form class="project-form" @submit.prevent="submitProject">
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

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

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

.form-error {
  margin: 0;
  color: #a21818;
  font-weight: 600;
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
