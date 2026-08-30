<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getProject } from '../services/projectStorage.js'

const route = useRoute()
const project = ref(null)
const showDetails = ref(false)

watch(
  () => route.params.id,
  (projectId) => {
    project.value = getProject(projectId)
    showDetails.value = false
  },
  { immediate: true },
)

const formattedEndTime = computed(() => {
  if (!project.value) return ''

  const endTime = project.value.endTime
  if (endTime.mode === 'duration') {
    return `${endTime.duration} ${endTime.durationUnit}`
  }

  const date = endTime.date || 'No date selected'
  return `${date} at ${endTime.hours}:${endTime.minutes}:${endTime.seconds}`
})

const formattedCreatedAt = computed(() => {
  if (!project.value?.createdAt) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(project.value.createdAt))
})
</script>

<template>
  <main v-if="project" class="project-page">
    <header class="project-header">
      <div class="title-area">
        <RouterLink class="back-link" to="/">
          <svg class="back-chevron" viewBox="0 -2 20 22" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
          Time&amp;Dime
        </RouterLink>
        <h1>{{ project.name }}</h1>
      </div>

      <div class="header-actions">
        <div class="end-time-summary">
          <span>End time</span>
          <strong>{{ formattedEndTime }}</strong>
        </div>
        <button
          class="details-button"
          type="button"
          :aria-expanded="showDetails"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'Hide info' : 'Show info' }}
        </button>
      </div>
    </header>

    <aside v-if="showDetails" class="details-card">
      <h2>Project information</h2>
      <dl>
        <div>
          <dt>Description</dt>
          <dd>{{ project.description || 'No description provided.' }}</dd>
        </div>
        <div>
          <dt>End-time type</dt>
          <dd>{{ project.endTime.mode === 'duration' ? 'Duration' : 'Date & time' }}</dd>
        </div>
        <div>
          <dt>End time</dt>
          <dd>{{ formattedEndTime }}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formattedCreatedAt }}</dd>
        </div>
      </dl>
    </aside>

    <button class="add-button" type="button">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span>Add</span>
    </button>
  </main>

  <main v-else class="not-found-page">
    <section>
      <h1>Project not found</h1>
      <p>This project is not available in local storage.</p>
      <RouterLink to="/">Return to Time&amp;Dime</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.project-page {
  box-sizing: border-box;
  min-height: 100dvh;
  padding: 2rem 2rem 7rem;
}

.project-header {
  display: flex;
  width: min(90rem, 100%);
  margin-inline: auto;
  align-items: start;
  justify-content: space-between;
  gap: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.085rem;
  color: #666666;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
}

.back-chevron {
  width: 1rem;
  height: 1rem;
  flex: 0 0 1rem;
}

.back-chevron path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.back-link:hover {
  color: #181818;
}

.back-link:focus-visible {
  border-radius: 0.2rem;
  outline: 3px solid rgb(0 0 0 / 22%);
  outline-offset: 3px;
}

h1 {
  margin: 0.5rem 0 0;
  font-size: clamp(2.25rem, 7vw, 4.75rem);
  letter-spacing: -0.055em;
  overflow-wrap: anywhere;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.end-time-summary {
  display: flex;
  min-width: 12rem;
  flex-direction: column;
  align-items: end;
  gap: 0.25rem;
  text-align: right;
}

.end-time-summary span {
  color: #6a6a6a;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.details-button {
  padding: 0.75rem 0.95rem;
  border: 1px solid #cfcfcf;
  border-radius: 0.6rem;
  background: #ffffff;
  color: #181818;
  cursor: pointer;
  font-weight: 700;
}

.details-card {
  box-sizing: border-box;
  width: min(28rem, 100%);
  margin: 2rem max(0rem, calc((100% - 90rem) / 2)) 0 auto;
  padding: 1.5rem;
  border: 1px solid #dedede;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 0.6rem 2rem rgb(0 0 0 / 8%);
}

.details-card h2 {
  margin: 0 0 1.25rem;
}

dl,
dl div {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

dl {
  margin: 0;
  gap: 1rem;
}

dt {
  color: #686868;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

dd {
  margin: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.add-button {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.9rem 1.25rem;
  border: 0;
  border-radius: 0.8rem;
  background: #111111;
  box-shadow: 0 0.55rem 1.5rem rgb(0 0 0 / 20%);
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
  transform: translateX(-50%);
}

.add-button svg {
  width: 1.25rem;
  height: 1.25rem;
}

.add-button path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
}

.details-button:focus-visible,
.add-button:focus-visible {
  outline: 3px solid rgb(0 0 0 / 22%);
  outline-offset: 3px;
}

.not-found-page {
  display: grid;
  box-sizing: border-box;
  min-height: 100dvh;
  padding: 2rem;
  place-items: center;
  text-align: center;
}

.not-found-page section {
  padding: 2rem;
  border: 1px solid #dedede;
  border-radius: 1rem;
  background: #ffffff;
}

.not-found-page h1 {
  margin: 0;
  font-size: 2rem;
}

.not-found-page a {
  color: #181818;
  font-weight: 700;
}

@media (max-width: 44rem) {
  .project-page {
    padding: 1.25rem 1rem 7rem;
  }

  .project-header,
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    gap: 0.75rem;
  }

  .end-time-summary {
    align-items: start;
    text-align: left;
  }

  .details-card {
    margin-top: 1.5rem;
  }
}
</style>
