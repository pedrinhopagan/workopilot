import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { safeInvoke, safeListen } from "../../services/tauri"
import { Select } from "../../components/Select"
import { SubtaskList } from "../../components/tasks/SubtaskList"
import { openCodeService } from "../../services/opencode"
import type { Task, TaskFull, ProjectWithConfig, Subtask, TaskUpdatedPayload } from "../../types"

type TaskState = "pending" | "ready_to_execute" | "in_progress" | "awaiting_review" | "done"

const stateLabels: Record<TaskState, string> = {
  pending: "Pendente",
  ready_to_execute: "Pronta para executar",
  in_progress: "Em execução",
  awaiting_review: "Aguardando revisão",
  done: "Concluída",
}

const stateColors: Record<TaskState, string> = {
  pending: "#e5c07b",
  ready_to_execute: "#909d63",
  in_progress: "#61afef",
  awaiting_review: "#e5c07b",
  done: "#909d63",
}

const categories = ["feature", "bug", "refactor", "test", "docs"]
const priorities = [
  { value: "1", label: "Alta" },
  { value: "2", label: "Média" },
  { value: "3", label: "Baixa" },
]

function getTaskState(taskFull: TaskFull | null): TaskState {
  if (!taskFull) return "pending"
  if (taskFull.status === "done") return "done"
  if (taskFull.status === "awaiting_review") return "awaiting_review"
  const hasInProgress = taskFull.subtasks.some((s) => s.status === "in_progress")
  if (hasInProgress) return "in_progress"
  if (taskFull.initialized) return "ready_to_execute"
  return "pending"
}

function getLastActionLabel(action: string | null): string | null {
  if (!action) return null
  const labels: Record<string, string> = {
    structure: "Estruturação",
    execute_all: "Execução completa",
    execute_subtask: "Execução de subtask",
    review: "Revisão",
  }
  return labels[action] || action
}

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [taskFull, setTaskFull] = useState<TaskFull | null>(null)
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newRule, setNewRule] = useState("")
  const [newCriteria, setNewCriteria] = useState("")
  const [showTechnicalNotes, setShowTechnicalNotes] = useState(false)
  const [showAcceptanceCriteria, setShowAcceptanceCriteria] = useState(false)
  const [aiUpdatedRecently, setAiUpdatedRecently] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [isLaunchingStructure, setIsLaunchingStructure] = useState(false)
  const [isLaunchingExecuteAll, setIsLaunchingExecuteAll] = useState(false)
  const [isLaunchingExecuteSubtask, setIsLaunchingExecuteSubtask] = useState(false)
  const [isLaunchingReview, setIsLaunchingReview] = useState(false)
  const [showSubtaskSelector, setShowSubtaskSelector] = useState(false)
  const [isOpenCodeConnected, setIsOpenCodeConnected] = useState(false)
  const [lastKnownModifiedAt, setLastKnownModifiedAt] = useState<string | null>(null)

  const taskState = getTaskState(taskFull)
  const lastAction = taskFull ? getLastActionLabel(taskFull.ai_metadata.last_completed_action) : null

  const canStructure = taskFull && taskState !== "ready_to_execute"
  const canExecuteAll = taskFull && taskState === "ready_to_execute"
  const canExecuteSubtask = taskFull && taskState === "ready_to_execute" && taskFull.subtasks.some((s) => s.status === "pending")
  const canReview = taskFull && taskState === "ready_to_execute"

  const pendingSubtasks = taskFull?.subtasks.filter((s) => s.status === "pending").sort((a, b) => a.order - b.order) || []

  const getSuggestedAction = useCallback((): "structure" | "execute_all" | "execute_subtask" | "review" | null => {
    if (!taskFull) return null
    if (taskState === "pending") return "structure"
    if (taskState === "awaiting_review") return "review"
    if (taskState === "ready_to_execute") {
      if (taskFull.subtasks.length === 0) return "execute_all"
      return taskFull.subtasks.some((s) => s.status === "pending") ? "execute_subtask" : "execute_all"
    }
    return null
  }, [taskFull, taskState])

  const suggestedAction = getSuggestedAction()

  const loadTask = useCallback(async (isReload = false) => {
    if (!isReload) setIsLoading(true)
    try {
      const taskData = await safeInvoke<Task>("get_task_by_id", { taskId })
      setTask(taskData)

      if (taskData?.project_id) {
        const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: taskData.project_id })
        setProjectPath(project.path)

        const fullTask = await safeInvoke<TaskFull>("get_task_full", { projectPath: project.path, taskId })
        setTaskFull(fullTask)
        setLastKnownModifiedAt(fullTask?.modified_at || null)

        if (fullTask?.modified_by === "ai") {
          setAiUpdatedRecently(true)
          setTimeout(() => setAiUpdatedRecently(false), 5000)
        }

        if (!isReload) {
          setShowTechnicalNotes(!!fullTask?.context.technical_notes)
          setShowAcceptanceCriteria(!!fullTask?.context.acceptance_criteria?.length)
        }
      }
    } catch (e) {
      console.error("Failed to load task:", e)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  const syncFromFile = useCallback(async () => {
    if (!projectPath || !taskId) return
    setIsSyncing(true)
    try {
      const freshTask = await safeInvoke<TaskFull>("get_task_full", { projectPath, taskId })
      setTaskFull(freshTask)
      setLastKnownModifiedAt(freshTask.modified_at || null)
      setShowTechnicalNotes(!!freshTask.context.technical_notes)
      setShowAcceptanceCriteria(!!freshTask.context.acceptance_criteria?.length)
      setSyncSuccess(true)
      setTimeout(() => setSyncSuccess(false), 2000)
    } catch (e) {
      console.error("Failed to sync from file:", e)
    } finally {
      setIsSyncing(false)
    }
  }, [projectPath, taskId])

  const saveTask = useCallback(async (updatedTask: TaskFull) => {
    if (!projectPath) return
    if (lastKnownModifiedAt && updatedTask.modified_at && lastKnownModifiedAt !== updatedTask.modified_at) {
      if (updatedTask.modified_by === "ai") {
        setConflictWarning(true)
        setTimeout(() => setConflictWarning(false), 8000)
      }
    }
    setIsSaving(true)
    try {
      const taskToSave = {
        ...updatedTask,
        modified_at: new Date().toISOString(),
        modified_by: "user" as const,
      }
      await safeInvoke("update_task_and_sync", { projectPath, task: taskToSave })
      setLastKnownModifiedAt(taskToSave.modified_at)
      setTaskFull(taskToSave)
    } catch (e) {
      console.error("Failed to save task:", e)
    } finally {
      setIsSaving(false)
    }
  }, [projectPath, lastKnownModifiedAt])

  const updateField = useCallback(<K extends keyof TaskFull>(field: K, value: TaskFull[K]) => {
    if (!taskFull) return
    const updated = { ...taskFull, [field]: value }
    setTaskFull(updated)
    saveTask(updated)
  }, [taskFull, saveTask])

  const updateContext = useCallback(<K extends keyof TaskFull["context"]>(field: K, value: TaskFull["context"][K]) => {
    if (!taskFull) return
    const updated = { ...taskFull, context: { ...taskFull.context, [field]: value } }
    setTaskFull(updated)
    saveTask(updated)
  }, [taskFull, saveTask])

  function addRule() {
    if (!newRule.trim() || !taskFull) return
    const newRules = [...taskFull.context.business_rules, newRule.trim()]
    setNewRule("")
    updateContext("business_rules", newRules)
  }

  function removeRule(index: number) {
    if (!taskFull) return
    const newRules = taskFull.context.business_rules.filter((_, i) => i !== index)
    updateContext("business_rules", newRules)
  }

  function addCriteria() {
    if (!newCriteria.trim() || !taskFull) return
    const current = taskFull.context.acceptance_criteria || []
    const newList = [...current, newCriteria.trim()]
    setNewCriteria("")
    updateContext("acceptance_criteria", newList)
  }

  function removeCriteria(index: number) {
    if (!taskFull) return
    const current = taskFull.context.acceptance_criteria || []
    const newList = current.filter((_, i) => i !== index)
    updateContext("acceptance_criteria", newList.length > 0 ? newList : null)
  }

  function addSubtask(title: string) {
    if (!taskFull) return
    const nextOrder = taskFull.subtasks.length > 0 ? Math.max(...taskFull.subtasks.map((s) => s.order)) + 1 : 0
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title,
      status: "pending",
      order: nextOrder,
      description: null,
      acceptance_criteria: null,
      technical_notes: null,
      prompt_context: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    }
    const newList = [...taskFull.subtasks, newSubtask]
    updateField("subtasks", newList)
  }

  function toggleSubtask(id: string) {
    if (!taskFull) return
    const newList = taskFull.subtasks.map((s) => {
      if (s.id === id) {
        const newStatus = s.status === "done" ? "pending" : "done"
        return { ...s, status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null }
      }
      return s
    })
    const allDone = newList.every((s) => s.status === "done")
    if (allDone && newList.length > 0 && taskFull.status !== "done") {
      const updated = { ...taskFull, subtasks: newList, status: "awaiting_review" }
      setTaskFull(updated)
      saveTask(updated)
    } else {
      updateField("subtasks", newList)
    }
  }

  function removeSubtask(id: string) {
    if (!taskFull) return
    const newList = taskFull.subtasks.filter((s) => s.id !== id)
    newList.forEach((s, i) => { s.order = i })
    updateField("subtasks", newList)
  }

  function updateSubtask(id: string, field: keyof Subtask, value: unknown) {
    if (!taskFull) return
    const newList = taskFull.subtasks.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    updateField("subtasks", newList)
  }

  function reorderSubtasks(newList: Subtask[]) {
    if (!taskFull) return
    updateField("subtasks", newList)
  }

  async function codarSubtask(id: string) {
    if (!task?.project_id) return
    try {
      await safeInvoke("launch_task_workflow", { projectId: task.project_id, taskId: task.id, subtaskId: id })
    } catch (e) {
      console.error("Failed to launch subtask workflow:", e)
    }
  }

  async function structureTask() {
    if (!task?.project_id || isLaunchingStructure) return
    setIsLaunchingStructure(true)
    try {
      await safeInvoke("launch_task_structure", { projectId: task.project_id, taskId: task.id })
    } catch (e) {
      console.error("Failed to launch task structure:", e)
    } finally {
      setTimeout(() => setIsLaunchingStructure(false), 3000)
    }
  }

  async function executeAll() {
    if (!task?.project_id || isLaunchingExecuteAll) return
    setIsLaunchingExecuteAll(true)
    try {
      await safeInvoke("launch_task_execute_all", { projectId: task.project_id, taskId: task.id })
    } catch (e) {
      console.error("Failed to launch execute all:", e)
    } finally {
      setTimeout(() => setIsLaunchingExecuteAll(false), 3000)
    }
  }

  async function executeSubtask(subtaskId: string) {
    if (!task?.project_id || isLaunchingExecuteSubtask) return
    setIsLaunchingExecuteSubtask(true)
    setShowSubtaskSelector(false)
    try {
      await safeInvoke("launch_task_execute_subtask", { projectId: task.project_id, taskId: task.id, subtaskId })
    } catch (e) {
      console.error("Failed to launch execute subtask:", e)
    } finally {
      setTimeout(() => setIsLaunchingExecuteSubtask(false), 3000)
    }
  }

  async function reviewTask() {
    if (!task?.project_id || isLaunchingReview) return
    setIsLaunchingReview(true)
    try {
      await safeInvoke("launch_task_review", { projectId: task.project_id, taskId: task.id })
    } catch (e) {
      console.error("Failed to launch task review:", e)
    } finally {
      setTimeout(() => setIsLaunchingReview(false), 3000)
    }
  }

  function goBack() {
    navigate({ to: "/tasks" })
  }

  useEffect(() => {
    loadTask()
  }, [loadTask])

  useEffect(() => {
    let unlisten: (() => void) | null = null
    let unsubscribeIdle: (() => void) | null = null
    let unsubscribeFile: (() => void) | null = null
    let unsubscribeConnection: (() => void) | null = null

    async function setup() {
      unlisten = await safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
        if (event.payload.task_id === taskId && event.payload.source === "ai") {
          console.log("[WorkoPilot] Task updated by AI (Tauri event), reloading...")
          await loadTask(true)
          setAiUpdatedRecently(true)
          setTimeout(() => setAiUpdatedRecently(false), 5000)
        }
      })

      unsubscribeIdle = openCodeService.onSessionIdle(async (sessionId, directory) => {
        console.log("[WorkoPilot] OpenCode session idle:", sessionId, "in", directory)
        if (projectPath && directory.includes(projectPath.split("/").pop() || "")) {
          console.log("[WorkoPilot] Detected skill completion in project, reloading task...")
          await loadTask(true)
          setAiUpdatedRecently(true)
          setTimeout(() => setAiUpdatedRecently(false), 5000)
        }
      })

      unsubscribeFile = openCodeService.onFileChange(async (filePath) => {
        if (filePath.includes(".workopilot/") || filePath.includes("workopilot.db")) {
          console.log("[WorkoPilot] Detected file change in workopilot data:", filePath)
          await loadTask(true)
        }
      })

      unsubscribeConnection = openCodeService.onConnectionChange((connected) => {
        setIsOpenCodeConnected(connected)
      })

      if (!openCodeService.connected) {
        const success = await openCodeService.init()
        if (success) {
          openCodeService.startListening()
        }
      }
    }

    setup()

    return () => {
      unlisten?.()
      unsubscribeIdle?.()
      unsubscribeFile?.()
      unsubscribeConnection?.()
    }
  }, [taskId, projectPath, loadTask])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-[#636363]">Carregando...</div>
  }

  if (!taskFull) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#636363] gap-4">
        <span>Tarefa não encontrada</span>
        <button onClick={goBack} className="text-[#909d63] hover:underline">Voltar</button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 border-b border-[#3d3a34] bg-[#1c1c1c]">
        <button onClick={goBack} className="text-[#636363] hover:text-[#d6d6d6] transition-colors p-1" title="Voltar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <input
          type="text"
          value={taskFull.title}
          onChange={(e) => setTaskFull({ ...taskFull, title: e.target.value })}
          onBlur={() => updateField("title", taskFull.title)}
          className="flex-1 bg-transparent text-[#d6d6d6] text-base font-medium focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors"
        />

        <button
          onClick={syncFromFile}
          disabled={isSyncing}
          className="p-1.5 text-[#636363] hover:text-[#909d63] hover:bg-[#2a2a2a] transition-colors rounded disabled:opacity-50"
          title="Sincronizar do arquivo JSON"
        >
          {isSyncing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : syncSuccess ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#909d63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          )}
        </button>

        <Select
          value={taskFull.category}
          options={categories.map((c) => ({ value: c, label: c }))}
          onChange={(v) => updateField("category", v)}
        />

        <Select
          value={String(taskFull.priority)}
          options={priorities}
          onChange={(v) => updateField("priority", parseInt(v))}
        />

        {isSaving && <span className="text-xs text-[#636363]">Salvando...</span>}

        {aiUpdatedRecently && (
          <span className="text-xs text-[#909d63] flex items-center gap-1 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
            </svg>
            IA atualizou
          </span>
        )}

        <span
          className={`w-2 h-2 rounded-full ${isOpenCodeConnected ? "bg-[#61afef]" : "bg-[#636363]"}`}
          title={isOpenCodeConnected ? "OpenCode conectado - atualizações em tempo real" : "OpenCode desconectado"}
        />
      </div>

      {conflictWarning && (
        <div className="px-4 py-2 bg-[#3d3a34] border-b border-[#4a4a4a] text-[#d6d6d6] text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
          </svg>
          <span>A IA fez alteracoes nesta task. Suas edicoes podem sobrescrever as mudancas da IA.</span>
          <button onClick={() => setConflictWarning(false)} className="ml-auto text-[#636363] hover:text-[#d6d6d6]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="border-b border-[#3d3a34] bg-gradient-to-r from-[#1c1c1c] via-[#232323] to-[#1c1c1c]">
        <div className="px-4 py-3 flex items-center gap-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: stateColors[taskState], boxShadow: `0 0 8px ${stateColors[taskState]}40` }}
            />
            <span className="text-sm font-medium" style={{ color: stateColors[taskState] }}>
              {stateLabels[taskState]}
            </span>
          </div>

          {lastAction && (
            <div className="flex items-center gap-1.5 text-xs text-[#636363]">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
              </svg>
              <span>Última ação: <span className="text-[#909d63]">{lastAction}</span></span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${taskState !== "pending" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-4 h-px ${taskState !== "pending" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${taskState === "in_progress" || taskState === "awaiting_review" || taskState === "done" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-4 h-px ${taskState === "awaiting_review" || taskState === "done" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${taskState === "done" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
          </div>
        </div>

        <div className="px-4 py-4 flex items-stretch gap-3">
          <button
            onClick={structureTask}
            disabled={!canStructure || isLaunchingStructure}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
              suggestedAction === "structure"
                ? "border-[#e5c07b] bg-[#e5c07b]/10 text-[#e5c07b] shadow-lg shadow-[#e5c07b]/10"
                : canStructure
                  ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                  : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
            }`}
          >
            {isLaunchingStructure ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
            )}
            <span className="text-sm font-medium">Estruturar</span>
            {suggestedAction === "structure" && <span className="text-[10px] uppercase tracking-wider opacity-75">Sugerido</span>}
          </button>

          <button
            onClick={executeAll}
            disabled={!canExecuteAll || isLaunchingExecuteAll}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
              suggestedAction === "execute_all"
                ? "border-[#909d63] bg-[#909d63]/10 text-[#909d63] shadow-lg shadow-[#909d63]/10"
                : canExecuteAll
                  ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                  : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
            }`}
          >
            {isLaunchingExecuteAll ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            )}
            <span className="text-sm font-medium">Executar Tudo</span>
            {suggestedAction === "execute_all" && <span className="text-[10px] uppercase tracking-wider opacity-75">Sugerido</span>}
          </button>

          <div className="flex-1 relative">
            <button
              onClick={() => canExecuteSubtask && setShowSubtaskSelector(!showSubtaskSelector)}
              disabled={!canExecuteSubtask || isLaunchingExecuteSubtask}
              className={`w-full h-full flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
                suggestedAction === "execute_subtask"
                  ? "border-[#61afef] bg-[#61afef]/10 text-[#61afef] shadow-lg shadow-[#61afef]/10"
                  : canExecuteSubtask
                    ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                    : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
              }`}
            >
              {isLaunchingExecuteSubtask ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              )}
              <span className="text-sm font-medium">Executar Subtask</span>
              {suggestedAction === "execute_subtask" ? (
                <span className="text-[10px] uppercase tracking-wider opacity-75">Sugerido</span>
              ) : canExecuteSubtask ? (
                <span className="text-[10px] opacity-60">{pendingSubtasks.length} pendente{pendingSubtasks.length !== 1 ? "s" : ""}</span>
              ) : null}
            </button>

            {showSubtaskSelector && canExecuteSubtask && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#232323] border border-[#3d3a34] rounded-lg shadow-xl z-50 overflow-hidden animate-slide-down">
                <div className="px-3 py-2 border-b border-[#3d3a34] text-xs text-[#636363] uppercase tracking-wider">
                  Selecione uma subtask
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {pendingSubtasks.map((subtask) => (
                    <button
                      key={subtask.id}
                      onClick={() => executeSubtask(subtask.id)}
                      className="w-full px-3 py-2.5 text-left text-sm text-[#d6d6d6] hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-[#3d3a34] text-[10px] text-[#909d63]">
                        {subtask.order + 1}
                      </span>
                      <span className="flex-1 truncate">{subtask.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={reviewTask}
            disabled={!canReview || isLaunchingReview}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
              suggestedAction === "review"
                ? "border-[#e5c07b] bg-[#e5c07b]/10 text-[#e5c07b] shadow-lg shadow-[#e5c07b]/10"
                : canReview
                  ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                  : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
            }`}
          >
            {isLaunchingReview ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            )}
            <span className="text-sm font-medium">Revisar</span>
            {suggestedAction === "review" && <span className="text-[10px] uppercase tracking-wider opacity-75">Sugerido</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <label className="block text-xs text-[#828282] uppercase tracking-wide mb-2">Descrição</label>
          <textarea
            value={taskFull.context.description || ""}
            onChange={(e) => setTaskFull({ ...taskFull, context: { ...taskFull.context, description: e.target.value || null } })}
            onBlur={() => updateContext("description", taskFull.context.description)}
            placeholder="Descreva o objetivo desta tarefa..."
            rows={3}
            className="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors"
          />
        </section>

        <section>
          <label className="block text-xs text-[#828282] uppercase tracking-wide mb-2">Regras de Negócio</label>
          <div className="space-y-2">
            {taskFull.context.business_rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 group animate-fade-in">
                <span className="text-[#636363]">•</span>
                <span className="flex-1 text-[#d6d6d6] text-sm">{rule}</span>
                <button
                  onClick={() => removeRule(i)}
                  className="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-[#636363]">+</span>
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
                placeholder="Adicionar regra..."
                className="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a]"
              />
            </div>
          </div>
        </section>

        <section>
          <button
            onClick={() => setShowTechnicalNotes(!showTechnicalNotes)}
            className="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200"
              style={{ transform: `rotate(${showTechnicalNotes ? 90 : 0}deg)` }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            Notas Técnicas (opcional)
          </button>
          {showTechnicalNotes && (
            <div className="animate-slide-down">
              <textarea
                value={taskFull.context.technical_notes || ""}
                onChange={(e) => setTaskFull({ ...taskFull, context: { ...taskFull.context, technical_notes: e.target.value || null } })}
                onBlur={() => updateContext("technical_notes", taskFull.context.technical_notes || null)}
                placeholder="Stack, libs, padrões relevantes..."
                rows={2}
                className="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors"
              />
            </div>
          )}
        </section>

        <section>
          <button
            onClick={() => setShowAcceptanceCriteria(!showAcceptanceCriteria)}
            className="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200"
              style={{ transform: `rotate(${showAcceptanceCriteria ? 90 : 0}deg)` }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            Critérios de Aceite (opcional)
          </button>
          {showAcceptanceCriteria && (
            <div className="space-y-2 animate-slide-down">
              {(taskFull.context.acceptance_criteria || []).map((criteria, i) => (
                <div key={i} className="flex items-center gap-2 group animate-fade-in">
                  <span className="text-[#636363]">✓</span>
                  <span className="flex-1 text-[#d6d6d6] text-sm">{criteria}</span>
                  <button
                    onClick={() => removeCriteria(i)}
                    className="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-[#636363]">+</span>
                <input
                  type="text"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCriteria()}
                  placeholder="Adicionar critério..."
                  className="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a]"
                />
              </div>
            </div>
          )}
        </section>

        <SubtaskList
          subtasks={taskFull.subtasks}
          onAdd={addSubtask}
          onToggle={toggleSubtask}
          onRemove={removeSubtask}
          onCodar={codarSubtask}
          onUpdate={updateSubtask}
          onReorder={reorderSubtasks}
        />

        <section>
          <div className="flex items-center justify-between">
            <label className="block text-xs text-[#828282] uppercase tracking-wide">Configuração</label>
          </div>
          <div className="mt-2 p-3 bg-[#232323] border border-[#3d3a34]">
            <button
              onClick={() => updateField("initialized", !taskFull.initialized)}
              className="flex items-center gap-3 w-full text-left group"
            >
              <span className={`w-10 h-5 rounded-full transition-colors relative ${taskFull.initialized ? "bg-[#909d63]" : "bg-[#3d3a34]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-[#d6d6d6] rounded-full transition-transform ${taskFull.initialized ? "translate-x-5" : "translate-x-0"}`} />
              </span>
              <div className="flex-1">
                <span className="text-sm text-[#d6d6d6]">Pronta para executar</span>
                <p className="text-xs text-[#636363] mt-0.5">
                  {taskFull.initialized
                    ? "A IA executará diretamente sem fazer perguntas de configuração"
                    : "A IA fará perguntas para completar a configuração antes de executar"}
                </p>
              </div>
            </button>
          </div>
        </section>

        <section>
          <label className="block text-xs text-[#828282] uppercase tracking-wide mb-2">Metadados IA</label>
          <pre className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#909d63] text-xs overflow-x-auto font-mono">
            <code>{JSON.stringify(taskFull.ai_metadata, null, 2)}</code>
          </pre>
        </section>
      </div>

    </>
  )
}

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
})
