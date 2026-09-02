<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PercentageCard from '../components/PercentageCard.vue'
import ValueCard from '../components/ValueCard.vue'
import NodeTypePicker from '../components/shared/NodeTypePicker.vue'
import { createProjectToolsetManager } from '../webmcp/registerProjectToolsetTools.js'
import { calculateProjectDurationInMilliseconds } from '../utils/calculation.js'
import { createProjectRunScheduler } from '../utils/projectRunScheduler.js'
import { applyNodeToImmediateAboveNodes } from '../utils/nodeValuePropagation.js'
import {
  addProjectNode,
  addProjectNodeAbove,
  addProjectNodeBelow,
  addProjectNodeRight,
  deleteProject,
  deleteProjectNode,
  getProject,
  updateProject,
} from '../services/projectStorage.js'

const route = useRoute()
const router = useRouter()
const webMcpController = new AbortController()
const project = ref(null)
const showDetails = ref(false)
const nodePickerOpen = ref(false)
const nodePickerTargetId = ref(null)
const nodePickerDirection = ref(null)
let activeProjectRunScheduler = null
let projectToolsetManager = null

function closeNodePicker() {
  nodePickerOpen.value = false
  nodePickerTargetId.value = null
  nodePickerDirection.value = null
}

function toggleInitialNodePicker() {
  if (nodePickerOpen.value && nodePickerTargetId.value === null) {
    closeNodePicker()
    return
  }

  nodePickerTargetId.value = null
  nodePickerDirection.value = null
  nodePickerOpen.value = true
}

function toggleAboveNodePicker(nodeId) {
  if (
    nodePickerOpen.value &&
    nodePickerTargetId.value === nodeId &&
    nodePickerDirection.value === 'above'
  ) {
    closeNodePicker()
    return
  }

  nodePickerTargetId.value = nodeId
  nodePickerDirection.value = 'above'
  nodePickerOpen.value = true
}

function toggleRightNodePicker(nodeId) {
  if (
    nodePickerOpen.value &&
    nodePickerTargetId.value === nodeId &&
    nodePickerDirection.value === 'right'
  ) {
    closeNodePicker()
    return
  }

  nodePickerTargetId.value = nodeId
  nodePickerDirection.value = 'right'
  nodePickerOpen.value = true
}

function toggleBelowNodePicker(nodeId) {
  if (
    nodePickerOpen.value &&
    nodePickerTargetId.value === nodeId &&
    nodePickerDirection.value === 'below'
  ) {
    closeNodePicker()
    return
  }

  nodePickerTargetId.value = nodeId
  nodePickerDirection.value = 'below'
  nodePickerOpen.value = true
}

function selectNodeType(nodeType) {
  const nodeDetails = {
    type: nodeType,
    timeLimit: {
      type: project.value.endTime.mode,
    },
  }

  if (nodePickerDirection.value === 'right') {
    project.value = addProjectNodeRight(route.params.id, nodePickerTargetId.value, nodeDetails)
  } else if (nodePickerDirection.value === 'below') {
    project.value = addProjectNodeBelow(route.params.id, nodePickerTargetId.value, nodeDetails)
  } else if (nodePickerDirection.value === 'above') {
    project.value = addProjectNodeAbove(route.params.id, nodePickerTargetId.value, nodeDetails)
  } else {
    project.value = addProjectNode(route.params.id, nodeDetails)
  }
  closeNodePicker()
}

function removeNode(nodeId) {
  project.value = deleteProjectNode(route.params.id, nodeId)
  closeNodePicker()
}

function removeProject() {
  const shouldDelete = window.confirm(`Delete “${project.value.name}” and all of its nodes?`)
  if (!shouldDelete) return

  deleteCurrentProject()
  void router.push({ name: 'start' })
}

function deleteCurrentProject() {
  const projectId = String(route.params.id)
  const storedProject = getProject(projectId)
  if (!storedProject) throw new Error(`Project ${projectId} was not found.`)

  deleteProject(projectId)
  return storedProject
}

function logStoredNode(nodeId) {
  updateProject(project.value)
  const storedNode = getProject(route.params.id)?.nodes.find((node) => node.id === nodeId)

  if (storedNode) {
    console.log(JSON.stringify(storedNode, null, 2))
  }
}

function runProject() {
  activeProjectRunScheduler?.stop()

  const projectEndTimeInMilliseconds = calculateProjectDurationInMilliseconds(project.value)
  const scheduler = createProjectRunScheduler({
    project: project.value,
    projectEndTimeInMilliseconds,
    getProject: () => project.value,
    onNodeRun: (runEvent) => {
      const calculation = applyNodeToImmediateAboveNodes(project.value, runEvent.id)
      if (calculation.updates.length > 0) {
        project.value = updateProject(calculation.project)
      }
      console.log({ ...runEvent, updates: calculation.updates })
    },
    onError: (error) => console.error('Project run failed.', error),
  })

  activeProjectRunScheduler = scheduler
  void scheduler
    .start()
    .then((result) => {
      if (activeProjectRunScheduler !== scheduler) return
      console.log(result.nodeRunTimes)
      activeProjectRunScheduler = null
    })
    .catch(() => {
      if (activeProjectRunScheduler === scheduler) activeProjectRunScheduler = null
    })
}

function getStoredProjectInfo() {
  const storedProject = getProject(route.params.id)
  if (!storedProject) throw new Error(`Project ${route.params.id} was not found.`)

  return {
    ...storedProject,
    nodeCount: Array.isArray(storedProject.nodes) ? storedProject.nodes.length : 0,
  }
}

watch(
  () => route.params.id,
  (projectId) => {
    activeProjectRunScheduler?.stop()
    activeProjectRunScheduler = null
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

watch(
  () => (project.value ? project.value.nodes.length === 0 : undefined),
  (isEmpty, wasEmpty) => {
    if (isEmpty === undefined || isEmpty === wasEmpty) return
    void projectToolsetManager?.refreshBuildTools().catch((error) => {
      if (!webMcpController.signal.aborted) {
        console.warn('Could not refresh the WebMCP build tools.', error)
      }
    })
  },
)

onMounted(async () => {
  if (!document.modelContext?.registerTool) return

  projectToolsetManager = createProjectToolsetManager({
    getProjectId: () => String(route.params.id),
    getProjectState: () => project.value,
    onProjectUpdated: (updatedProject) => {
      project.value = updatedProject
    },
    goHome: () => router.push({ name: 'start' }),
    deleteCurrentProject,
    getStoredProjectInfo,
    signal: webMcpController.signal,
  })

  try {
    await projectToolsetManager.register()
  } catch (error) {
    if (!webMcpController.signal.aborted) {
      console.warn('Could not register the WebMCP project toolsets.', error)
    }
  }
})

onUnmounted(() => {
  activeProjectRunScheduler?.stop()
  projectToolsetManager?.dispose()
  webMcpController.abort()
})

const formattedEndTime = computed(() => {
  if (!project.value) return ''

  const endTime = project.value.endTime
  if (endTime.mode === 'duration') {
    return `${endTime.duration} ${endTime.durationUnit}`
  }

  const date = endTime.date || 'No date selected'
  return `${date} at ${endTime.hours}:${endTime.minutes}:${endTime.seconds}`
})

const formattedStartTime = computed(() => {
  if (!project.value || project.value.endTime.mode !== 'dateTime') return ''

  const startTime = project.value.startTime
  if (!startTime) return 'No start time selected'

  const date = startTime.date || 'No date selected'
  return `${date} at ${startTime.hours}:${startTime.minutes}:${startTime.seconds}`
})

const formattedCreatedAt = computed(() => {
  if (!project.value?.createdAt) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(project.value.createdAt))
})

const nodeLevels = computed(() => {
  const levels = []
  const levelsByRelations = new Map()

  for (const node of project.value?.nodes ?? []) {
    const levelKey = JSON.stringify([
      node.relations?.aboveCardIds ?? [],
      node.relations?.belowCardIds ?? [],
    ])
    let level = levelsByRelations.get(levelKey)

    if (!level) {
      level = { key: levelKey, nodes: [] }
      levelsByRelations.set(levelKey, level)
      levels.push(level)
    }

    level.nodes.push(node)
  }

  return levels
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
        <div class="interval-summary">
          <span class="interval-summary-label">Interval</span>
          <strong v-if="project.endTime.mode === 'duration'">{{ formattedEndTime }}</strong>
          <div v-else class="date-time-interval">
            <p class="date-time-boundary">
              <span>Start</span>
              <strong>{{ formattedStartTime }}</strong>
            </p>
            <p class="date-time-boundary">
              <span>End</span>
              <strong>{{ formattedEndTime }}</strong>
            </p>
          </div>
        </div>
        <button
          class="details-button"
          type="button"
          :aria-expanded="showDetails"
          aria-controls="project-details-popup"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'Hide info' : 'Show info' }}
        </button>
        <button class="delete-project-button" type="button" @click="removeProject">
          Delete project
        </button>
      </div>
    </header>

    <aside
      v-if="showDetails"
      id="project-details-popup"
      class="details-card"
      role="dialog"
      aria-label="Project information"
    >
      <button
        class="close-details-button"
        type="button"
        aria-label="Close project information"
        @click="showDetails = false"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 7 10 10M17 7 7 17" />
        </svg>
      </button>

      <h2>Project information</h2>
      <dl>
        <div>
          <dt>Description</dt>
          <dd>{{ project.description || 'No description provided.' }}</dd>
        </div>
        <div>
          <dt>Interval Type</dt>
          <dd>{{ project.endTime.mode === 'duration' ? 'Duration' : 'Date & time' }}</dd>
        </div>
        <div v-if="project.endTime.mode === 'dateTime'">
          <dt>Start time</dt>
          <dd>{{ formattedStartTime }}</dd>
        </div>
        <div>
          <dt>End time</dt>
          <dd>{{ formattedEndTime }}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formattedCreatedAt }}</dd>
        </div>
        <div>
          <dt>Nodes created</dt>
          <dd>{{ project.nodes.length }}</dd>
        </div>
      </dl>
    </aside>

    <div v-if="project.nodes.length" class="node-scroller">
      <div class="project-run-control">
        <button
          class="play-project-button"
          type="button"
          aria-label="Play project"
          @click.stop="runProject"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 9 6-9 6Z" />
          </svg>
        </button>
      </div>

      <section class="node-workspace" aria-label="Project nodes">
        <div v-for="level in nodeLevels" :key="level.key" class="node-level">
          <div
            v-if="
              nodePickerOpen &&
              nodePickerTargetId === level.nodes[0].id &&
              ['above', 'below'].includes(nodePickerDirection)
            "
            class="level-node-picker"
            :class="{
              'above-level-picker': nodePickerDirection === 'above',
              'below-level-picker': nodePickerDirection === 'below',
            }"
            @click.stop
          >
            <NodeTypePicker @select="selectNodeType" />
          </div>

          <button
            class="surrounding-add top-add"
            type="button"
            aria-label="Add node above this level"
            aria-haspopup="menu"
            :aria-expanded="
              nodePickerOpen &&
              nodePickerTargetId === level.nodes[0].id &&
              nodePickerDirection === 'above'
            "
            @click.stop="toggleAboveNodePicker(level.nodes[0].id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <div
            class="node-level-track"
            :class="{ 'has-horizontal-scroll': level.nodes.length > 1 }"
          >
            <div
              v-for="(node, nodePosition) in level.nodes"
              :key="node.id"
              class="node-shell"
              @click.meta="logStoredNode(node.id)"
            >
              <div
                v-if="
                  nodePickerOpen &&
                  nodePickerTargetId === node.id &&
                  nodePickerDirection === 'right'
                "
                class="card-node-picker right-node-picker"
                @click.stop
              >
                <NodeTypePicker @select="selectNodeType" />
              </div>

              <button
                class="delete-node-button"
                type="button"
                :aria-label="`Delete node ${node.index}`"
                @click.stop="removeNode(node.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                </svg>
              </button>

              <ValueCard
                v-if="node.type === 'value'"
                v-model:operation="node.operation"
                v-model:name="node.details.name"
                v-model:description="node.details.description"
                v-model:is-static="node.isStatic"
                v-model:value="node.value"
                v-model:time="node.timing.value"
                v-model:time-unit="node.timing.unit"
                v-model:time-limit-enabled="node.timeLimit.enabled"
                v-model:time-limit="node.timeLimit"
                :time-limit-type="project.endTime.mode"
              />
              <PercentageCard
                v-else-if="node.type === 'percentage'"
                v-model:operation="node.operation"
                v-model:name="node.details.name"
                v-model:description="node.details.description"
                v-model:is-static="node.isStatic"
                v-model:reference-value="node.referenceValue"
                v-model:percentage="node.percentage.value"
                v-model:time="node.timing.value"
                v-model:time-unit="node.timing.unit"
                v-model:time-limit-enabled="node.timeLimit.enabled"
                v-model:time-limit="node.timeLimit"
                :time-limit-type="project.endTime.mode"
              />

              <button
                v-if="nodePosition === level.nodes.length - 1"
                class="surrounding-add right-add"
                type="button"
                aria-label="Add node to the right"
                aria-haspopup="menu"
                :aria-expanded="
                  nodePickerOpen &&
                  nodePickerTargetId === node.id &&
                  nodePickerDirection === 'right'
                "
                @click.stop="toggleRightNodePicker(node.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>

          <button
            v-if="(level.nodes[0].relations?.belowCardIds?.length ?? 0) === 0"
            class="surrounding-add bottom-add"
            type="button"
            aria-label="Add node below this level"
            aria-haspopup="menu"
            :aria-expanded="
              nodePickerOpen &&
              nodePickerTargetId === level.nodes[0].id &&
              nodePickerDirection === 'below'
            "
            @click.stop="toggleBelowNodePicker(level.nodes[0].id)"
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
  font-size: clamp(1.55rem, 3vw, 2.5rem);
  letter-spacing: -0.045em;
  overflow-wrap: anywhere;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.interval-summary {
  display: flex;
  min-width: 12rem;
  flex-direction: column;
  align-items: end;
  gap: 0.25rem;
  text-align: right;
}

.interval-summary-label {
  color: #6a6a6a;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.date-time-interval {
  display: grid;
  gap: 0.3rem;
}

.date-time-boundary {
  display: grid;
  grid-template-columns: 2.75rem auto;
  gap: 0.5rem;
  margin: 0;
}

.date-time-boundary span {
  color: #6a6a6a;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
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

.delete-project-button {
  padding: 0.75rem 0.95rem;
  border: 1px solid #e0b7b7;
  border-radius: 0.6rem;
  background: #fff5f5;
  color: #a51d1d;
  cursor: pointer;
  font-weight: 700;
}

.delete-project-button:hover {
  border-color: #cf8d8d;
  background: #ffe8e8;
}

.details-card {
  position: fixed;
  top: 5.75rem;
  right: max(2rem, calc((100vw - 90rem) / 2));
  z-index: 20;
  box-sizing: border-box;
  width: min(28rem, calc(100vw - 4rem));
  max-height: calc(100dvh - 7.75rem);
  margin: 0;
  padding: 1.5rem;
  overflow-y: auto;
  border: 1px solid #dedede;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 0.8rem 2.5rem rgb(0 0 0 / 16%);
}

.details-card h2 {
  margin: 0 0 1.25rem;
  padding-right: 2rem;
}

.close-details-button {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #777777;
  cursor: pointer;
  place-items: center;
}

.close-details-button:hover {
  background: #eeeeee;
  color: #222222;
}

.close-details-button svg {
  width: 0.9rem;
  height: 0.9rem;
}

.close-details-button path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
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
  margin: 0.75rem auto 0;
  overflow: auto;
  border: 1px solid #e2e2e2;
  border-radius: 1.25rem;
  background: #f7f7f7;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.project-run-control {
  position: sticky;
  top: 1rem;
  z-index: 6;
  display: grid;
  width: max-content;
  margin: 1rem auto -0.25rem;
  place-items: center;
}

.play-project-button {
  display: grid;
  width: 2.35rem;
  height: 2.1rem;
  padding: 0;
  border: 1px solid #343426;
  border-radius: 0.7rem;
  background: #171712;
  box-shadow: 0 0.35rem 0.9rem rgb(0 0 0 / 18%);
  color: #ecd36f;
  cursor: pointer;
  place-items: center;
}

.play-project-button:hover {
  border-color: #55513a;
  background: #212119;
  color: #ffe992;
}

.play-project-button svg {
  width: 1rem;
  height: 1rem;
}

.play-project-button path {
  fill: currentColor;
}

.node-workspace {
  display: grid;
  box-sizing: border-box;
  width: min(86rem, 100%);
  min-height: 100%;
  margin-inline: auto;
  padding-block: 4.75rem;
  gap: 8rem;
}

.node-level {
  position: relative;
  min-width: 0;
}

.node-level:has(.has-horizontal-scroll) {
  margin-bottom: 6rem;
}

.node-level-track {
  position: relative;
  z-index: 1;
  display: flex;
  margin-block: -4rem;
  gap: 2rem;
  padding: 4rem;
  overflow: visible;
}

.node-level-track:not(.has-horizontal-scroll) {
  justify-content: center;
}

.node-level-track.has-horizontal-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 1rem;
  background: #ededed;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-color: #888888 #dedede;
  scrollbar-width: thin;
}

.node-level-track.has-horizontal-scroll::-webkit-scrollbar {
  height: 0.55rem;
}

.node-level-track.has-horizontal-scroll::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #dedede;
}

.node-level-track.has-horizontal-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #888888;
}

.node-shell {
  position: relative;
  width: 100%;
  flex: 0 0 min(34rem, calc(100% - 8rem));
  scroll-snap-align: center;
}

.node-level + .node-level::before {
  position: absolute;
  top: -8rem;
  left: 50%;
  z-index: 0;
  width: 1px;
  height: 4.4rem;
  background: #b8b8b8;
  content: '';
  transform: translateX(-50%);
}

.node-level:has(.has-horizontal-scroll) + .node-level::before {
  top: -11.5rem;
  height: 7.9rem;
}

.card-node-picker {
  position: absolute;
  z-index: 5;
}

.level-node-picker {
  position: absolute;
  left: 50%;
  z-index: 5;
  transform: translateX(-50%);
}

.above-level-picker {
  top: 0.75rem;
}

.below-level-picker {
  bottom: 0.75rem;
}

.card-node-picker :deep(.node-type-picker)::after,
.level-node-picker :deep(.node-type-picker)::after {
  display: none;
}

.right-node-picker {
  top: 50%;
  right: 0.25rem;
  transform: translateY(-50%);
}

.delete-node-button {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 3;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid #493030;
  border-radius: 0.65rem;
  background: #261717;
  color: #ff8d8d;
  cursor: pointer;
  place-items: center;
}

.delete-node-button:hover {
  background: #3a1c1c;
  color: #ffb0b0;
}

.delete-node-button svg {
  width: 1.15rem;
  height: 1.15rem;
}

.delete-node-button path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
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
.close-details-button:focus-visible,
.delete-project-button:focus-visible,
.delete-node-button:focus-visible,
.surrounding-add:focus-visible,
.play-project-button:focus-visible,
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

  .interval-summary {
    align-items: start;
    text-align: left;
  }

  .details-card {
    top: 1rem;
    right: 1rem;
    width: calc(100vw - 2rem);
    max-height: calc(100dvh - 2rem);
  }

}
</style>
