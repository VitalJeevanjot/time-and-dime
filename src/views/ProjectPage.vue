<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PercentageCard from '../components/PercentageCard.vue'
import ValueCard from '../components/ValueCard.vue'
import NodeTypePicker from '../components/shared/NodeTypePicker.vue'
import {
  addProjectNode,
  addProjectNodeAbove,
  getProject,
  updateProject,
} from '../services/projectStorage.js'

const route = useRoute()
const project = ref(null)
const showDetails = ref(false)
const nodePickerOpen = ref(false)
const nodePickerTargetId = ref(null)

function closeNodePicker() {
  nodePickerOpen.value = false
  nodePickerTargetId.value = null
}

function toggleInitialNodePicker() {
  if (nodePickerOpen.value && nodePickerTargetId.value === null) {
    closeNodePicker()
    return
  }

  nodePickerTargetId.value = null
  nodePickerOpen.value = true
}

function toggleAboveNodePicker(nodeId) {
  if (nodePickerOpen.value && nodePickerTargetId.value === nodeId) {
    closeNodePicker()
    return
  }

  nodePickerTargetId.value = nodeId
  nodePickerOpen.value = true
}

function selectNodeType(nodeType) {
  project.value = nodePickerTargetId.value
    ? addProjectNodeAbove(route.params.id, nodePickerTargetId.value, { type: nodeType })
    : addProjectNode(route.params.id, { type: nodeType })
  closeNodePicker()
}

watch(
  () => route.params.id,
  (projectId) => {
    project.value = getProject(projectId)
    showDetails.value = false
    closeNodePicker()
  },
  { immediate: true },
)

watch(
  () => project.value?.nodes,
  (nodes, previousNodes) => {
    if (!project.value || !nodes || nodes !== previousNodes) return
    updateProject(project.value)
  },
  { deep: true },
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
  <main
    v-if="project"
    class="project-page"
    @click="closeNodePicker"
    @keydown.esc="closeNodePicker"
  >
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

    <div v-if="project.nodes.length" class="node-scroller">
      <section class="node-workspace" aria-label="Project nodes">
        <div v-for="(node, index) in project.nodes" :key="node.id" class="node-shell">
          <div
            v-if="nodePickerOpen && nodePickerTargetId === node.id"
            class="above-node-picker"
            @click.stop
          >
            <NodeTypePicker @select="selectNodeType" />
          </div>

          <button
            class="surrounding-add top-add"
            type="button"
            aria-label="Add node above"
            aria-haspopup="menu"
            :aria-expanded="nodePickerOpen && nodePickerTargetId === node.id"
            @click.stop="toggleAboveNodePicker(node.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <span
            class="node-count"
            :aria-label="`Node ${node.index ?? project.nodes.length - index}`"
          >
            {{ node.index ?? project.nodes.length - index }}
          </span>

          <ValueCard
            v-if="node.type === 'value'"
            v-model:operation="node.operation"
            v-model:name="node.details.name"
            v-model:description="node.details.description"
            v-model:value="node.value"
            v-model:time="node.timing.value"
            v-model:time-unit="node.timing.unit"
            v-model:time-limit-enabled="node.timeLimit.enabled"
            v-model:time-limit="node.timeLimit"
            :time-limit-type="node.timeLimit.type"
          />
          <PercentageCard
            v-else-if="node.type === 'percentage'"
            v-model:operation="node.operation"
            v-model:name="node.details.name"
            v-model:description="node.details.description"
            v-model:percentage="node.percentage.value"
            v-model:value-source="node.percentage.source"
            v-model:time="node.timing.value"
            v-model:time-unit="node.timing.unit"
            v-model:time-limit-enabled="node.timeLimit.enabled"
            v-model:time-limit="node.timeLimit"
            :time-limit-type="node.timeLimit.type"
          />

          <button class="surrounding-add right-add" type="button" aria-label="Add node to the right">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            v-if="node.relations.belowCardId === null"
            class="surrounding-add bottom-add"
            type="button"
            aria-label="Add node below"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </section>
    </div>

    <div v-else class="add-node-control" @click.stop>
      <div v-if="nodePickerOpen" id="node-type-picker" class="initial-node-picker">
        <NodeTypePicker @select="selectNodeType" />
      </div>

      <button
        class="add-button"
        type="button"
        aria-haspopup="menu"
        :aria-expanded="nodePickerOpen"
        aria-controls="node-type-picker"
        @click="toggleInitialNodePicker"
        @keydown.esc="closeNodePicker"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Add</span>
      </button>
    </div>
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
  display: flex;
  box-sizing: border-box;
  height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem 2rem;
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
  font-size: clamp(1.9rem, 4vw, 3.25rem);
  letter-spacing: -0.045em;
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

.node-scroller {
  box-sizing: border-box;
  width: min(90rem, 100%);
  min-height: 0;
  flex: 1;
  margin: 2rem auto 0;
  overflow: auto;
  border: 1px solid #e2e2e2;
  border-radius: 1.25rem;
  background: #f7f7f7;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.node-workspace {
  display: grid;
  box-sizing: border-box;
  width: min(42rem, 100%);
  min-height: 100%;
  margin-inline: auto;
  padding: 4.75rem 4rem;
  gap: 7rem;
}

.node-shell {
  position: relative;
  width: 100%;
}

.node-shell + .node-shell::before {
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: 1px;
  height: 7rem;
  background: #b8b8b8;
  content: '';
  transform: translateX(-50%);
}

.above-node-picker {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  z-index: 5;
  transform: translateX(-50%);
}

.above-node-picker :deep(.node-type-picker)::after {
  display: none;
}

.node-count {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  z-index: 2;
  display: grid;
  min-width: 1.75rem;
  height: 1.75rem;
  box-sizing: border-box;
  padding-inline: 0.4rem;
  border: 1px solid #444444;
  border-radius: 999px;
  background: #ffffff;
  color: #111111;
  font-size: 0.75rem;
  font-weight: 800;
  place-items: center;
}

.surrounding-add {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.8rem;
  background: #111111;
  box-shadow: 0 0.45rem 1.25rem rgb(0 0 0 / 18%);
  color: #ffffff;
  cursor: pointer;
  place-items: center;
}

.surrounding-add svg {
  width: 1.25rem;
  height: 1.25rem;
}

.surrounding-add path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
}

.top-add {
  top: -3.6rem;
  left: 50%;
  transform: translateX(-50%);
}

.right-add {
  top: 50%;
  right: -3.6rem;
  background: #f97316;
  transform: translateY(-50%);
}

.bottom-add {
  bottom: -3.6rem;
  left: 50%;
  background: #2563eb;
  transform: translateX(-50%);
}

.add-node-control {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  z-index: 10;
  transform: translateX(-50%);
}

.initial-node-picker {
  position: absolute;
  bottom: calc(100% + 0.75rem);
  left: 50%;
  transform: translateX(-50%);
}

.add-button {
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
.surrounding-add:focus-visible,
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
    padding: 1rem;
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

  .node-workspace {
    padding-inline: 3.5rem;
  }
}
</style>
