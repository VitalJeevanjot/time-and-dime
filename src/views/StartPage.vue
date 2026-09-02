<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProjects } from '../services/projectStorage.js'

const router = useRouter()
const projects = ref([])
const webMcpController = new AbortController()

function loadProjects() {
  projects.value = getProjects().sort((firstProject, secondProject) => {
    const firstCreatedAt = Date.parse(firstProject.createdAt) || 0
    const secondCreatedAt = Date.parse(secondProject.createdAt) || 0
    return secondCreatedAt - firstCreatedAt
  })
}

onMounted(async () => {
  loadProjects()
  window.addEventListener('time-and-dime:projects-changed', loadProjects)

  if (!document.modelContext?.registerTool) return

  try {
    await document.modelContext.registerTool(
      {
        name: 'open_create_project',
        description: 'Open the Create Project page to configure a new Time&Dime project.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          await router.push({ name: 'create-project' })
          return 'Opened the Create Project page.'
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
  window.removeEventListener('time-and-dime:projects-changed', loadProjects)
  webMcpController.abort()
})
</script>

<template>
  <main class="start-page">
    <h1 class="page-title">Time&amp;Dime</h1>

    <section class="card-grid" aria-label="Projects">
      <RouterLink class="project-card create-card" to="/projects/new" aria-label="Create new project">
        <svg class="create-icon" viewBox="0 0 48 48" role="img" aria-hidden="true">
          <path d="M24 42V8M18 14l6-6 6 6" />
          <path d="M6 24h34M34 18l6 6-6 6" />
        </svg>
        <span>Create new project</span>
      </RouterLink>

      <RouterLink
        v-for="project in projects"
        :key="project.id"
        class="project-card saved-project-card"
        :to="{ name: 'project', params: { id: project.id } }"
      >
        <span class="project-name">{{ project.name }}</span>
        <span v-if="project.description" class="project-description">{{ project.description }}</span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.start-page {
  box-sizing: border-box;
  min-height: 100dvh;
  padding: 1.5rem;
}

.page-title {
  width: min(90rem, 100%);
  margin: 0 auto 2rem;
  font-size: clamp(2rem, 5vw, 3.25rem);
  letter-spacing: -0.045em;
}

.card-grid {
  display: grid;
  width: min(90rem, 100%);
  margin-inline: auto;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 1rem;
}

.project-card {
  display: flex;
  box-sizing: border-box;
  min-height: 10rem;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.25rem;
  border: 1px solid #dedede;
  border-radius: 1.1rem;
  background: #ffffff;
  box-shadow: 0 0.35rem 1.25rem rgb(0 0 0 / 6%);
}

.create-card {
  color: #181818;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.create-card:hover {
  border-color: #a8a8a8;
  box-shadow: 0 0.6rem 1.6rem rgb(0 0 0 / 10%);
  transform: translateY(-2px);
}

.create-card:focus-visible {
  outline: 3px solid rgb(0 0 0 / 22%);
  outline-offset: 3px;
}

.create-icon {
  width: 3.25rem;
  height: 3.25rem;
  overflow: visible;
}

.create-icon path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.saved-project-card {
  align-items: flex-start;
  color: #181818;
  text-align: left;
  text-decoration: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.saved-project-card:hover {
  border-color: #a8a8a8;
  box-shadow: 0 0.6rem 1.6rem rgb(0 0 0 / 10%);
  transform: translateY(-2px);
}

.saved-project-card:focus-visible {
  outline: 3px solid rgb(0 0 0 / 22%);
  outline-offset: 3px;
}

.project-name {
  font-size: 1.25rem;
  font-weight: 700;
}

.project-description {
  display: -webkit-box;
  overflow: hidden;
  color: #686868;
  font-size: 0.95rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

@media (max-width: 32rem) {
  .start-page {
    padding: 1rem;
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  }

  .project-card {
    min-height: 8rem;
  }
}
</style>
