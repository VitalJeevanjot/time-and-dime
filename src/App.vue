<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { registerProjectWorkspaceTools } from './webmcp/registerProjectWorkspaceTools.js'

const route = useRoute()
const router = useRouter()
const webMcpController = new AbortController()

onMounted(async () => {
  try {
    await registerProjectWorkspaceTools({
      router,
      getCurrentProjectId: () => (route.name === 'project' ? String(route.params.id) : ''),
      signal: webMcpController.signal,
    })
  } catch (error) {
    if (!webMcpController.signal.aborted) {
      console.warn('Could not register the global Time&Dime WebMCP tools.', error)
    }
  }
})

onUnmounted(() => webMcpController.abort())
</script>

<template>
  <RouterView />
</template>

<style>
:root {
  color: #181818;
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html,
body,
#app {
  min-height: 100%;
  margin: 0;
}

body {
  min-width: 20rem;
  background: #f3f3f3;
}

button,
input,
select,
textarea {
  font: inherit;
}
</style>
