import { registerCreateInitialNodeTool } from './registerCreateInitialNodeTool.js'
import { registerCreatePercentageNodeTool } from './registerCreatePercentageNodeTool.js'
import { registerCreateValueNodeTool } from './registerCreateValueNodeTool.js'
import { registerProjectNodeTools } from './registerProjectNodeTools.js'

export const projectToolsets = ['build', 'edit', 'project']

function requireToolset(toolset) {
  if (!projectToolsets.includes(toolset)) {
    throw new Error(`toolset must be one of: ${projectToolsets.join(', ')}.`)
  }
  return toolset
}

function isEmptyProject(project) {
  return !Array.isArray(project?.nodes) || project.nodes.length === 0
}

/**
 * Keeps only the current project workflow's tools registered. This prevents the
 * browser agent from receiving every large node schema at the same time.
 */
export function createProjectToolsetManager({
  getProjectId,
  getProjectState,
  onProjectUpdated,
  goHome,
  deleteCurrentProject,
  getStoredProjectInfo,
  signal,
}) {
  let activeToolset = 'build'
  let activeBuildWasEmpty = null
  let registrationVersion = 0
  let toolsetController = null

  const abortActiveToolset = () => toolsetController?.abort()
  signal?.addEventListener('abort', abortActiveToolset, { once: true })

  const projectWasUpdated = (updatedProject) => {
    onProjectUpdated?.(updatedProject)
  }

  function activeToolNames(toolset = activeToolset) {
    if (toolset === 'build') {
      return isEmptyProject(getProjectState())
        ? ['get_project_nodes', 'create_initial_node']
        : ['get_project_nodes', 'create_value_node', 'create_percentage_node']
    }
    if (toolset === 'edit') {
      return ['get_project_nodes', 'edit_project_node', 'delete_project_node']
    }
    return ['go_to_home', 'delete_project', 'get_project_info']
  }

  async function registerBuildTools(toolSignal, version) {
    await registerProjectNodeTools({
      getProjectId,
      onProjectUpdated: projectWasUpdated,
      signal: toolSignal,
      toolNames: ['get_project_nodes'],
    })
    if (version !== registrationVersion || toolSignal.aborted) return

    if (isEmptyProject(getProjectState())) {
      await registerCreateInitialNodeTool({
        getProjectId,
        onProjectUpdated: projectWasUpdated,
        signal: toolSignal,
      })
      return
    }

    await registerCreateValueNodeTool({
      getProjectId,
      onProjectUpdated: projectWasUpdated,
      signal: toolSignal,
    })
    if (version !== registrationVersion || toolSignal.aborted) return
    await registerCreatePercentageNodeTool({
      getProjectId,
      onProjectUpdated: projectWasUpdated,
      signal: toolSignal,
    })
  }

  async function registerEditTools(toolSignal) {
    await registerProjectNodeTools({
      getProjectId,
      onProjectUpdated: projectWasUpdated,
      signal: toolSignal,
      toolNames: ['get_project_nodes', 'edit_project_node', 'delete_project_node'],
    })
  }

  async function registerProjectTools(toolSignal) {
    await document.modelContext.registerTool(
      {
        name: 'go_to_home',
        description: 'Leave the current project and return to the Time&Dime home page.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        execute: async () => {
          await goHome()
          return 'Opened the Time&Dime home page.'
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
      },
      { signal: toolSignal },
    )
    if (toolSignal.aborted) return

    await document.modelContext.registerTool(
      {
        name: 'delete_project',
        description:
          'Permanently delete the open Time&Dime project and all nodes, then return home.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        execute: async () => {
          const deletedProject = deleteCurrentProject()
          await goHome()
          return `Deleted project "${deletedProject.name}" with ID ${deletedProject.id}.`
        },
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: true,
          destructiveHint: true,
        },
      },
      { signal: toolSignal },
    )
    if (toolSignal.aborted) return

    await document.modelContext.registerTool(
      {
        name: 'get_project_info',
        description:
          'Read the open project settings, node count, and complete structured node data.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        execute: () => JSON.stringify(getStoredProjectInfo(), null, 2),
        annotations: { readOnlyHint: true, untrustedContentHint: true },
      },
      { signal: toolSignal },
    )
  }

  async function activate(toolset, { force = false } = {}) {
    const nextToolset = requireToolset(toolset)
    const nextBuildWasEmpty =
      nextToolset === 'build' ? isEmptyProject(getProjectState()) : null
    if (
      !force &&
      toolsetController &&
      activeToolset === nextToolset &&
      (nextToolset !== 'build' || activeBuildWasEmpty === nextBuildWasEmpty)
    ) {
      return activeToolNames(nextToolset)
    }

    const version = ++registrationVersion
    toolsetController?.abort()
    const nextController = new AbortController()
    toolsetController = nextController
    activeToolset = nextToolset
    activeBuildWasEmpty = nextBuildWasEmpty

    try {
      if (nextToolset === 'build') {
        await registerBuildTools(nextController.signal, version)
      } else if (nextToolset === 'edit') {
        await registerEditTools(nextController.signal)
      } else {
        await registerProjectTools(nextController.signal)
      }
    } catch (error) {
      if (version !== registrationVersion || nextController.signal.aborted || signal?.aborted) {
        return activeToolNames()
      }
      throw error
    }

    return activeToolNames()
  }

  async function refreshBuildTools() {
    if (activeToolset !== 'build') return activeToolNames()
    const emptyNow = isEmptyProject(getProjectState())
    if (emptyNow === activeBuildWasEmpty) return activeToolNames()
    return activate('build', { force: true })
  }

  async function register() {
    if (!document.modelContext?.registerTool) return
    await document.modelContext.registerTool(
      {
        name: 'set_project_toolset',
        title: 'Set project tools',
        description:
          'Choose tools for one project workflow. build reads and creates nodes; edit reads, edits, and deletes nodes; project navigates, reads project info, or deletes the project. Cross-project tools stay available.',
        inputSchema: {
          type: 'object',
          properties: {
            toolset: {
              type: 'string',
              enum: projectToolsets,
              description: 'Workflow tools to expose: build, edit, or project.',
            },
          },
          required: ['toolset'],
          additionalProperties: false,
        },
        execute: async (input) => {
          const toolset = requireToolset(input?.toolset)
          const tools = await activate(toolset)
          return JSON.stringify({ toolset, tools }, null, 2)
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
      },
      { signal },
    )
    await activate('build', { force: true })
  }

  function dispose() {
    registrationVersion += 1
    toolsetController?.abort()
    signal?.removeEventListener('abort', abortActiveToolset)
  }

  return {
    register,
    activate,
    refreshBuildTools,
    getActiveToolset: () => activeToolset,
    getActiveToolNames: () => activeToolNames(),
    dispose,
  }
}
