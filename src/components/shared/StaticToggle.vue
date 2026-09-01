<script setup>
const isStatic = defineModel({ type: Boolean, default: false })
</script>

<template>
  <button
    class="static-toggle"
    type="button"
    role="checkbox"
    :aria-checked="isStatic"
    aria-label="Static"
    @click="isStatic = !isStatic"
  >
    <span class="static-check" aria-hidden="true">✓</span>
    <span class="static-tooltip" role="tooltip">Static</span>
  </button>
</template>

<style scoped>
.static-toggle {
  position: relative;
  display: grid;
  width: 1.7rem;
  height: 1.7rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--static-border, rgb(255 255 255 / 45%));
  border-radius: 0.48rem;
  background: var(--static-background, rgb(0 0 0 / 12%));
  cursor: pointer;
}

.static-check {
  color: var(--static-check-color, #ffffff);
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1;
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 120ms ease, transform 120ms ease;
}

.static-toggle[aria-checked='true'] {
  background: var(--static-active-background, rgb(255 255 255 / 24%));
}

.static-toggle[aria-checked='true'] .static-check {
  opacity: 1;
  transform: scale(1);
}

.static-toggle:focus-visible {
  outline: 2px solid var(--static-focus, rgb(255 255 255 / 60%));
  outline-offset: 2px;
}

.static-tooltip {
  position: absolute;
  z-index: 10;
  right: 0;
  bottom: calc(100% + 0.45rem);
  padding: 0.32rem 0.5rem;
  border-radius: 0.38rem;
  background: #141414;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.2rem);
  transition: opacity 120ms ease, transform 120ms ease;
  white-space: nowrap;
}

.static-toggle:hover .static-tooltip,
.static-toggle:focus-visible .static-tooltip {
  opacity: 1;
  transform: translateY(0);
}
</style>
