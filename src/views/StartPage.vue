<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const numbers = Array.from({ length: 100 }, (_, index) => index + 1)
const router = useRouter()
const webMcpController = new AbortController()

onMounted(async () => {
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
        execute: () => {
          void router.push('/projects/new')
          return 'Opened the Create Project page.'
        },
        annotations: {
          readOnlyHint: true,
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

      <article v-for="number in numbers" :key="number" class="project-card number-card">
        <span>{{ number }}</span>
      </article>
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

.number-card span {
  font-size: 1.5rem;
  font-weight: 700;
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
