<script setup>
import { RouterView } from 'vue-router'
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
