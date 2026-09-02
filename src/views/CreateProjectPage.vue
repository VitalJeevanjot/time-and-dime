<script setup>
import { onMounted, onUnmounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import DurationPicker from '../components/shared/DurationPicker.vue'
import StartEndTimePicker from '../components/shared/StartEndTimePicker.vue'
import { saveProject } from '../services/projectStorage.js'
import { normalizeDurationParts } from '../utils/duration.js'

const router = useRouter()
const webMcpController = new AbortController()
const intervalModeName = `${useId()}-interval-mode`
const endTimeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

const name = ref('')
const description = ref('')
const endTimeMode = ref('duration')
const startDate = ref('')
const startHours = ref('00')
const startMinutes = ref('00')
const startSeconds = ref('00')
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

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsedDate = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value
}

function validateWebMcpProjectInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Project input must be an object.')
  }
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('name is required.')
  }
  if (input.name.trim().length > 200) throw new Error('name cannot exceed 200 characters.')
  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new Error('description must be a string when provided.')
  }
  if (input.description?.trim().length > 5_000) {
    throw new Error('description cannot exceed 5000 characters.')
  }
  if (!['duration', 'dateTime'].includes(input.endTimeMode)) {
    throw new Error('endTimeMode must be duration or dateTime.')
  }

  if (input.endTimeMode === 'duration') {
    const hasSimpleDuration =
      input.endDuration !== undefined || input.endDurationUnit !== undefined
    const hasCompositeDuration = input.endDurationParts !== undefined
    if (!hasSimpleDuration && !hasCompositeDuration) {
      throw new Error('A duration project requires endDuration/endDurationUnit or endDurationParts.')
    }
    if (hasSimpleDuration) {
      if (!Number.isSafeInteger(input.endDuration) || input.endDuration < 0) {
        throw new Error('endDuration must be a non-negative safe integer.')
      }
      if (!endTimeUnits.includes(input.endDurationUnit)) {
        throw new Error(`endDurationUnit must be one of: ${endTimeUnits.join(', ')}.`)
      }
    }
    if (hasCompositeDuration) {
      const parts = input.endDurationParts
      const allowedPartNames = new Set([
        'years',
        'months',
        'days',
        'hours',
        'minutes',
        'seconds',
        'milliseconds',
      ])
      if (!parts || typeof parts !== 'object' || Array.isArray(parts)) {
        throw new Error('endDurationParts must be an object.')
      }
      const partEntries = Object.entries(parts)
      if (partEntries.length === 0) throw new Error('endDurationParts cannot be empty.')
      partEntries.forEach(([partName, partValue]) => {
        if (!allowedPartNames.has(partName)) {
          throw new Error(`Unsupported duration part: ${partName}.`)
        }
        if (!Number.isSafeInteger(partValue) || partValue < 0) {
          throw new Error(`${partName} must be a non-negative safe integer.`)
        }
      })
    }
    return
  }

  const dateFieldNames = ['startDate', 'endDate']
  dateFieldNames.forEach((fieldName) => {
    if (!isValidDate(input[fieldName])) {
      throw new Error(`${fieldName} must be a valid date in YYYY-MM-DD format.`)
    }
  })
  const clockFields = [
    ['startHours', 23],
    ['startMinutes', 59],
    ['startSeconds', 59],
    ['endHours', 23],
    ['endMinutes', 59],
    ['endSeconds', 59],
  ]
  clockFields.forEach(([fieldName, maximum]) => {
    if (!Number.isInteger(input[fieldName]) || input[fieldName] < 0 || input[fieldName] > maximum) {
      throw new Error(`${fieldName} must be an integer from 0 to ${maximum}.`)
    }
  })
}

function normalizeProjectInput(input) {
  const mode = input.endTimeMode === 'dateTime' ? 'dateTime' : 'duration'
  const duration = Number(input.endDuration)
  const compositeDuration = normalizeDurationParts(input.endDurationParts)

  return {
    name: String(input.name ?? '').trim(),
    description: String(input.description ?? '').trim(),
    startTime: {
      date: String(input.startDate ?? ''),
      hours: normalizeClockPart(input.startHours, 23),
      minutes: normalizeClockPart(input.startMinutes, 59),
      seconds: normalizeClockPart(input.startSeconds, 59),
    },
    endTime: {
      mode,
      duration:
        compositeDuration?.value ??
        (Number.isFinite(duration)
          ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(duration)))
          : 0),
      durationUnit:
        compositeDuration?.unit ??
        (endTimeUnits.includes(input.endDurationUnit) ? input.endDurationUnit : 'Seconds'),
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
    startDate: startDate.value,
    startHours: startHours.value,
    startMinutes: startMinutes.value,
    startSeconds: startSeconds.value,
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
  startDate.value = projectDetails.startTime.date
  startHours.value = projectDetails.startTime.hours
  startMinutes.value = projectDetails.startTime.minutes
  startSeconds.value = projectDetails.startTime.seconds
  endDuration.value = projectDetails.endTime.duration
  endDurationUnit.value = projectDetails.endTime.durationUnit
  endDate.value = projectDetails.endTime.date
  endHours.value = projectDetails.endTime.hours
  endMinutes.value = projectDetails.endTime.minutes
  endSeconds.value = projectDetails.endTime.seconds
}

function createProject(projectDetails) {
  if (!projectDetails.name) throw new Error('A project name is required.')
  if (projectDetails.name.length > 200) throw new Error('Project name cannot exceed 200 characters.')
  if (projectDetails.description.length > 5_000) {
    throw new Error('Project description cannot exceed 5000 characters.')
  }
  if (projectDetails.endTime.mode === 'dateTime' && !projectDetails.startTime.date) {
    throw new Error('A start date is required for Date & time projects.')
  }
  if (projectDetails.endTime.mode === 'dateTime' && !projectDetails.endTime.date) {
    throw new Error('An end date is required for Date & time projects.')
  }

  const project = saveProject(projectDetails)
  return project
}

function submitProject() {
  formError.value = ''

  try {
    const project = createProject(normalizeProjectInput(getFormProjectInput()))
    void router.push({ name: 'project', params: { id: project.id } })
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
        name: 'go_to_home',
        description: 'Leave the Create Project page and return to the Time&Dime home page.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          await router.push({ name: 'start' })
          return 'Opened the Time&Dime home page.'
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
      console.warn('Could not register the WebMCP go-home tool.', error)
    }
  }

  try {
    await document.modelContext.registerTool(
      {
        name: 'create_project',
        description:
          'Create a Time&Dime project, store it locally, and open its project page. Duration projects need an end duration. Date-time projects need exact start and end dates with 24-hour times.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Name of the project.',
            },
            description: {
              type: 'string',
              maxLength: 5_000,
              description: 'Optional description of the project.',
            },
            endTimeMode: {
              type: 'string',
              enum: ['duration', 'dateTime'],
              description: 'Whether the project ends after a duration or at an exact date and time.',
            },
            startDate: {
              type: 'string',
              format: 'date',
              maxLength: 10,
              description: 'Start date in YYYY-MM-DD format. Used when endTimeMode is dateTime.',
            },
            startHours: {
              type: 'integer',
              minimum: 0,
              maximum: 23,
              description: 'Start hour in 24-hour time. Used when endTimeMode is dateTime.',
            },
            startMinutes: {
              type: 'integer',
              minimum: 0,
              maximum: 59,
              description: 'Start minute. Used when endTimeMode is dateTime.',
            },
            startSeconds: {
              type: 'integer',
              minimum: 0,
              maximum: 59,
              description: 'Start second. Used when endTimeMode is dateTime.',
            },
            endDuration: {
              type: 'integer',
              minimum: 0,
              maximum: Number.MAX_SAFE_INTEGER,
              description: 'Non-negative safe-integer duration value. Used when endTimeMode is duration.',
            },
            endDurationUnit: {
              type: 'string',
              enum: endTimeUnits,
              description: 'Unit for endDuration. Used when endTimeMode is duration.',
            },
            endDurationParts: {
              type: 'object',
              description:
                'Composite duration parts. The smallest non-zero supplied unit becomes the stored unit and larger parts are converted into it. Years equal 12 months; for days or smaller, years equal 365 days and months equal 30 days.',
              properties: {
                years: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
                months: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
                days: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
                hours: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
                minutes: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
                seconds: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
                milliseconds: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
              },
              minProperties: 1,
              additionalProperties: false,
            },
            endDate: {
              type: 'string',
              format: 'date',
              maxLength: 10,
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
          oneOf: [
            {
              properties: {
                endTimeMode: { const: 'duration' },
              },
              anyOf: [
                { required: ['endDuration', 'endDurationUnit'] },
                { required: ['endDurationParts'] },
              ],
            },
            {
              properties: {
                endTimeMode: { const: 'dateTime' },
              },
              required: [
                'startDate',
                'startHours',
                'startMinutes',
                'startSeconds',
                'endDate',
                'endHours',
                'endMinutes',
                'endSeconds',
              ],
            },
          ],
          additionalProperties: false,
        },
        execute: async (input) => {
          validateWebMcpProjectInput(input)
          const projectDetails = normalizeProjectInput(input)
          applyProjectInput(projectDetails)
          const project = createProject(projectDetails)
          await router.push({ name: 'project', params: { id: project.id } })
          return JSON.stringify(
            { projectId: project.id, name: project.name, route: `/projects/${project.id}` },
            null,
            2,
          )
        },
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: true,
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

      <fieldset class="interval-field">
        <legend>Interval</legend>

        <div class="mode-toggle">
          <label :class="['mode-option', { active: endTimeMode === 'duration' }]">
            <input
              v-model="endTimeMode"
              :name="intervalModeName"
              type="radio"
              value="duration"
            />
            <span>Duration</span>
          </label>
          <label :class="['mode-option', { active: endTimeMode === 'dateTime' }]">
            <input
              v-model="endTimeMode"
              :name="intervalModeName"
              type="radio"
              value="dateTime"
            />
            <span>Date &amp; time</span>
          </label>
        </div>

        <DurationPicker
          v-if="endTimeMode === 'duration'"
          v-model:duration="endDuration"
          v-model:duration-unit="endDurationUnit"
        />

        <StartEndTimePicker
          v-else
          v-model:start-date="startDate"
          v-model:start-hours="startHours"
          v-model:start-minutes="startMinutes"
          v-model:start-seconds="startSeconds"
          v-model:end-date="endDate"
          v-model:end-hours="endHours"
          v-model:end-minutes="endMinutes"
          v-model:end-seconds="endSeconds"
        />
      </fieldset>

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

.interval-field {
  display: flex;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  flex-direction: column;
  gap: 0.85rem;
}

.interval-field > legend {
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

.mode-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
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
