import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  FileCheck,
  FileText,
  Loader2,
  Monitor,
  Rocket,
  Target,
  X
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Select } from "../../components/Select"
import { DescriptionWithImages } from "../../components/tasks/DescriptionWithImages"
import { ImageModal } from "../../components/tasks/ImageModal"
import { StatusSelect } from "../../components/tasks/StatusSelect"
import { SubtaskList } from "../../components/tasks/SubtaskList"
import {
  type FullStatus,
  getTaskState,
} from "../../lib/constants/taskStatus"
import { openCodeService } from "../../services/opencode"
import { safeInvoke, safeListen } from "../../services/tauri"
import type {
  ProjectWithConfig,
  QuickfixPayload,
  Subtask,
  Task,
  TaskExecution,
  TaskFull,
  TaskImageMetadata,
  TaskUpdatedPayload,
} from "../../types"

const categories = ["feature", "bug", "refactor", "test", "docs"]
const priorities = [
  { value: "1", label: "Alta" },
  { value: "2", label: "Média" },
  { value: "3", label: "Baixa" },
]

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
  const [project, setProject] = useState<ProjectWithConfig | null>(null)
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newRule, setNewRule] = useState("")
  const [newCriteria, setNewCriteria] = useState("")
  const [showTechnicalNotes, setShowTechnicalNotes] = useState(false)
  const [showAcceptanceCriteria, setShowAcceptanceCriteria] = useState(false)
  const [localTechnicalNotes, setLocalTechnicalNotes] = useState("")
  const [aiUpdatedRecently, setAiUpdatedRecently] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(false)

  const [isLaunchingStructure, setIsLaunchingStructure] = useState(false)
  const [isLaunchingExecuteAll, setIsLaunchingExecuteAll] = useState(false)
  const [isLaunchingExecuteSubtask, setIsLaunchingExecuteSubtask] = useState(false)
  const [isLaunchingReview, setIsLaunchingReview] = useState(false)
  const [isLaunchingFocus, setIsLaunchingFocus] = useState(false)
  const [showSubtaskSelector, setShowSubtaskSelector] = useState(false)
  const [isOpenCodeConnected, setIsOpenCodeConnected] = useState(false)
  const [lastKnownModifiedAt, setLastKnownModifiedAt] = useState<string | null>(null)
  const [activeExecution, setActiveExecution] = useState<TaskExecution | null>(null)
  const [quickfixInput, setQuickfixInput] = useState("")
  const [isLaunchingQuickfix, setIsLaunchingQuickfix] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustingPrompt, setAdjustingPrompt] = useState<string | null>(null)
  const [showBusinessRules, setShowBusinessRules] = useState(false)
  const [taskImages, setTaskImages] = useState<TaskImageMetadata[]>([])
  const [viewingImageId, setViewingImageId] = useState<string | null>(null)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)

  const isExecuting = useMemo(() => {
    if (!activeExecution || activeExecution.status !== "running") return false
    if (activeExecution.last_heartbeat) {
      const last = new Date(activeExecution.last_heartbeat).getTime()
      if (Date.now() - last > 5 * 60 * 1000) return false
    }
    return true
  }, [activeExecution])

  const isBlocked = isExecuting || isAdjusting || isLaunchingStructure || isLaunchingExecuteAll || isLaunchingExecuteSubtask || isLaunchingReview || isLaunchingQuickfix || isLaunchingFocus

  const taskState = getTaskState(taskFull)
  const lastAction = taskFull ? getLastActionLabel(taskFull.ai_metadata.last_completed_action) : null

  const canStructure = taskFull && !taskFull.initialized
  const allSubtasksComplete = taskFull && taskFull.subtasks.length > 0 && taskFull.subtasks.every((s) => s.status === "done")
  const canExecuteAll = taskFull && taskFull.initialized && !allSubtasksComplete
  const canExecuteSubtask = taskFull && taskFull.initialized && taskFull.subtasks.some((s) => s.status === "pending")
  const canReview = taskFull && allSubtasksComplete

  const pendingSubtasks = taskFull?.subtasks.filter((s) => s.status === "pending").sort((a, b) => a.order - b.order) || []

  const tmuxSessionName = useMemo(() => {
    if (activeExecution?.tmux_session) return activeExecution.tmux_session
    if (!project || !taskId) return null
    const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, "")
    const taskShort = taskId.length > 8 ? taskId.slice(0, 8) : taskId
    return `workopilot:${safeName}-${taskShort}`
  }, [activeExecution?.tmux_session, project, taskId])

  const isAIWorking = taskState === "structuring" || taskState === "executing"
  const canFocusTerminal = isAIWorking && tmuxSessionName

  const getSuggestedAction = useCallback((): "structure" | "execute_all" | "execute_subtask" | "review" | "focus_terminal" | null => {
    if (!taskFull) return null
    if (taskState === "pending") return "structure"
    if (taskState === "structuring" || taskState === "executing") return "focus_terminal"
    if (taskState === "awaiting_review") return "review"
    if (taskState === "awaiting_user") {
      if (taskFull.subtasks.length === 0) return "execute_all"
      return taskFull.subtasks.some((s) => s.status === "pending") ? "execute_subtask" : "execute_all"
    }
    return null
  }, [taskFull, taskState])

  const suggestedAction = getSuggestedAction()

  const loadActiveExecution = useCallback(async () => {
    try {
      const exec = await safeInvoke<TaskExecution | null>("get_active_task_execution", { taskId })
      setActiveExecution(exec)
    } catch (e) {
      console.error("Failed to load execution:", e)
    }
  }, [taskId])

  async function launchQuickfix() {
    if (!task?.project_id || !quickfixInput.trim() || isLaunchingQuickfix) return
    setIsLaunchingQuickfix(true)
    try {
      await safeInvoke("send_quickfix", { taskId, prompt: quickfixInput.trim() })
      setQuickfixInput("")
      setTimeout(() => setIsLaunchingQuickfix(false), 5000)
    } catch (e) {
      console.error("Failed to launch quickfix:", e)
      setIsLaunchingQuickfix(false)
    }
  }

  const loadTask = useCallback(async (isReload = false) => {
    if (!isReload) setIsLoading(true)
    try {
      const taskData = await safeInvoke<Task>("get_task_by_id", { taskId })
      setTask(taskData)

      if (taskData?.project_id) {
        const projectData = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: taskData.project_id })
        setProject(projectData)
        setProjectPath(projectData.path)

        const fullTask = await safeInvoke<TaskFull>("get_task_full", { projectPath: projectData.path, taskId })
        setTaskFull(fullTask)
        setLastKnownModifiedAt(fullTask?.modified_at || null)

        if (fullTask?.modified_by === "ai") {
          setAiUpdatedRecently(true)
          setTimeout(() => setAiUpdatedRecently(false), 5000)
        }

        setLocalTechnicalNotes(fullTask?.context.technical_notes || "")
        if (!isReload) {
          setShowBusinessRules(!!fullTask?.context.business_rules?.length)
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

  const loadTaskImages = useCallback(async () => {
    if (!taskId) return
    try {
      const images = await safeInvoke<TaskImageMetadata[]>("get_task_images", { taskId })
      setTaskImages(images)
    } catch (e) {
      console.error("Failed to load task images:", e)
      setTaskImages([])
    }
  }, [taskId])

  async function handleImageUpload() {
    await loadTaskImages()
  }

  async function handleImageDelete(imageId: string) {
    try {
      await safeInvoke("delete_task_image", { imageId })
      await loadTaskImages()
    } catch (e) {
      console.error("Failed to delete image:", e)
    }
  }

  async function handleImageView(imageId: string) {
    try {
      const result = await safeInvoke<{ data: string; mime_type: string }>("get_task_image", { imageId })
      setViewingImageUrl(`data:${result.mime_type};base64,${result.data}`)
      setViewingImageId(imageId)
    } catch (e) {
      console.error("Failed to load image for viewing:", e)
    }
  }

  function closeImageModal() {
    setViewingImageId(null)
    setViewingImageUrl(null)
  }

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

  const updateStatus = useCallback((newFullStatus: FullStatus) => {
    if (!taskFull) return
    
    let status: string
    let substatus: string | null
    
    switch (newFullStatus) {
      case "pending":
        status = "pending"
        substatus = null
        break
      case "structuring":
        status = "active"
        substatus = "structuring"
        break
      case "executing":
        status = "active"
        substatus = "executing"
        break
      case "awaiting_user":
        status = "active"
        substatus = "awaiting_user"
        break
      case "awaiting_review":
        status = "active"
        substatus = "awaiting_review"
        break
      case "done":
        status = "done"
        substatus = null
        break
      default:
        return
    }
    
    const updated = { ...taskFull, status, substatus }
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

  function hideWindowAfterDelay() {
    setTimeout(() => {
      safeInvoke("hide_window")
    }, 500)
  }

  async function structureTask() {
    if (!task?.project_id || isLaunchingStructure) return
    setIsLaunchingStructure(true)
    try {
      await safeInvoke("launch_task_structure", { projectId: task.project_id, taskId: task.id })
      hideWindowAfterDelay()
    } catch (e) {
      console.error("Failed to launch task structure:", e)
      setIsLaunchingStructure(false)
    }
  }

  async function executeAll() {
    if (!task?.project_id || isLaunchingExecuteAll) return
    setIsLaunchingExecuteAll(true)
    try {
      await safeInvoke("launch_task_execute_all", { projectId: task.project_id, taskId: task.id })
      hideWindowAfterDelay()
    } catch (e) {
      console.error("Failed to launch execute all:", e)
      setIsLaunchingExecuteAll(false)
    }
  }

  async function executeSubtask(subtaskId: string) {
    if (!task?.project_id || isLaunchingExecuteSubtask) return
    setIsLaunchingExecuteSubtask(true)
    setShowSubtaskSelector(false)
    try {
      await safeInvoke("launch_task_execute_subtask", { projectId: task.project_id, taskId: task.id, subtaskId })
      hideWindowAfterDelay()
    } catch (e) {
      console.error("Failed to launch execute subtask:", e)
      setIsLaunchingExecuteSubtask(false)
    }
  }

  async function reviewTask() {
    if (!task?.project_id || isLaunchingReview) return
    setIsLaunchingReview(true)
    try {
      await safeInvoke("launch_task_review", { projectId: task.project_id, taskId: task.id })
      hideWindowAfterDelay()
    } catch (e) {
      console.error("Failed to launch task review:", e)
      setIsLaunchingReview(false)
    }
  }

  async function focusTerminal() {
    if (!tmuxSessionName || isLaunchingFocus) return
    setIsLaunchingFocus(true)
    try {
      await safeInvoke("focus_tmux_session", { sessionName: tmuxSessionName })
    } catch (e) {
      console.error("Failed to focus terminal:", e)
    } finally {
      setIsLaunchingFocus(false)
    }
  }

  function goBack() {
    navigate({ to: "/tasks" })
  }

  useEffect(() => {
    loadTask()
    loadActiveExecution()
    loadTaskImages()
  }, [loadTask, loadActiveExecution, loadTaskImages])

  useEffect(() => {
    let unlisten: (() => void) | null = null
    let unsubscribeIdle: (() => void) | null = null
    let unsubscribeFile: (() => void) | null = null
    let unsubscribeConnection: (() => void) | null = null
    let unsubscribeExecution: (() => void) | null = null
    let unsubscribeQuickfix: (() => void) | null = null

    async function setup() {
      unlisten = await safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
        if (event.payload.task_id === taskId && event.payload.source === "ai") {
          console.log("[WorkoPilot] Task updated by AI (Tauri event), reloading...")
          await loadTask(true)
          setAiUpdatedRecently(true)
          setTimeout(() => setAiUpdatedRecently(false), 5000)
        }
      })

      unsubscribeExecution = await safeListen<TaskExecution>("execution-changed", (event) => {
        if (event.payload.task_id === taskId) {
          setActiveExecution(event.payload)
          if (event.payload.status === "completed" || event.payload.status === "error") {
            loadTask(true)
            setIsLaunchingStructure(false)
            setIsLaunchingExecuteAll(false)
            setIsLaunchingExecuteSubtask(false)
            setIsLaunchingReview(false)
          }
        }
      })

      unsubscribeQuickfix = await safeListen<QuickfixPayload>("quickfix-changed", async (event) => {
        if (event.payload.task_id === taskId) {
          console.log("[WorkoPilot] Quickfix status changed:", event.payload.status)
          if (event.payload.status === "running") {
            setIsAdjusting(true)
            setAdjustingPrompt(event.payload.prompt || null)
          } else {
            setIsAdjusting(false)
            setAdjustingPrompt(null)
            if (event.payload.status === "completed") {
              await loadTask(true)
              setAiUpdatedRecently(true)
              setTimeout(() => setAiUpdatedRecently(false), 5000)
            }
            setIsLaunchingQuickfix(false)
          }
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
      unsubscribeExecution?.()
      unsubscribeQuickfix?.()
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
          <ChevronLeft size={18} />
        </button>

        <input
          type="text"
          value={taskFull.title}
          onChange={(e) => setTaskFull({ ...taskFull, title: e.target.value })}
          onBlur={() => updateField("title", taskFull.title)}
          className="flex-1 bg-transparent text-[#d6d6d6] text-base font-medium focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors"
        />

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
            <Bot size={14} />
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
          <AlertTriangle size={16} color="#e5c07b" />
          <span>A IA fez alteracoes nesta task. Suas edicoes podem sobrescrever as mudancas da IA.</span>
          <button onClick={() => setConflictWarning(false)} className="ml-auto text-[#636363] hover:text-[#d6d6d6]">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="border-b border-[#3d3a34] bg-gradient-to-r from-[#1c1c1c] via-[#232323] to-[#1c1c1c]">
        <div className="px-4 py-3 flex items-center gap-4 border-b border-[#2a2a2a]">
          <StatusSelect
            value={taskState}
            onChange={updateStatus}
            disabled={isBlocked}
          />

          {lastAction && (
            <div className="flex items-center gap-1.5 text-xs text-[#636363]">
              <Bot size={12} />
              <span>Última ação: <span className="text-[#909d63]">{lastAction}</span></span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${taskState !== "pending" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-4 h-px ${taskState !== "pending" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${taskState !== "pending" && taskState !== "structuring" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-4 h-px ${taskState === "awaiting_review" || taskState === "done" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${taskState === "done" ? "bg-[#909d63]" : "bg-[#3d3a34]"}`} />
          </div>
        </div>

        <div className="px-4 py-4 flex items-stretch gap-3">
          {isAIWorking ? (
            <div className="flex-1 relative">
              <button
                type="button"
                onClick={focusTerminal}
                disabled={!canFocusTerminal || isLaunchingFocus}
                className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
                  canFocusTerminal
                    ? "border-[#61afef] bg-[#61afef]/10 text-[#61afef] shadow-lg shadow-[#61afef]/10"
                    : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
                }`}
              >
                {isLaunchingFocus ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Monitor size={20} />
                )}
                <span className="text-sm font-medium">Focar Terminal</span>
              </button>
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#61afef] text-[#1c1c1c] rounded">
                IA Trabalhando
              </span>
            </div>
          ) : (
            <>
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={structureTask}
                  disabled={!canStructure || isBlocked}
                  className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
                    suggestedAction === "structure"
                      ? "border-[#e5c07b] bg-[#e5c07b]/10 text-[#e5c07b] shadow-lg shadow-[#e5c07b]/10"
                      : canStructure
                        ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                        : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
                  }`}
                >
                  {isLaunchingStructure ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <FileText size={20} />
                  )}
                  <span className="text-sm font-medium">Estruturar</span>
                </button>
                {suggestedAction === "structure" && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#e5c07b] text-[#1c1c1c] rounded">
                    Sugestão
                  </span>
                )}
              </div>

              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={executeAll}
                  disabled={!canExecuteAll || isBlocked}
                  className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
                    suggestedAction === "execute_all"
                      ? "border-[#909d63] bg-[#909d63]/10 text-[#909d63] shadow-lg shadow-[#909d63]/10"
                      : canExecuteAll
                        ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                        : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
                  }`}
                >
                  {isLaunchingExecuteAll ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Rocket size={20} />
                  )}
                  <span className="text-sm font-medium">Executar Tudo</span>
                </button>
                {suggestedAction === "execute_all" && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#909d63] text-[#1c1c1c] rounded">
                    Sugestão
                  </span>
                )}
              </div>

              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => canExecuteSubtask && setShowSubtaskSelector(!showSubtaskSelector)}
                  disabled={!canExecuteSubtask || isBlocked}
                  className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
                    suggestedAction === "execute_subtask"
                      ? "border-[#61afef] bg-[#61afef]/10 text-[#61afef] shadow-lg shadow-[#61afef]/10"
                    : canExecuteSubtask
                      ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                      : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
                  }`}
                >
                  {isLaunchingExecuteSubtask ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Target size={20} />
                  )}
                  <span className="text-sm font-medium">Executar Subtask</span>
                  {canExecuteSubtask && (
                    <span className="text-[10px] opacity-60">({pendingSubtasks.length})</span>
                  )}
                </button>
                {suggestedAction === "execute_subtask" && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#61afef] text-[#1c1c1c] rounded">
                    Sugestão
                  </span>
                )}

                {showSubtaskSelector && canExecuteSubtask && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#232323] border border-[#3d3a34] rounded-lg shadow-xl z-50 overflow-hidden animate-slide-down">
                    <div className="px-3 py-2 border-b border-[#3d3a34] text-xs text-[#636363] uppercase tracking-wider">
                      Selecione uma subtask
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {pendingSubtasks.map((subtask) => (
                        <button
                          type="button"
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

              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={reviewTask}
                  disabled={!canReview || isBlocked}
                  className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
                    suggestedAction === "review"
                      ? "border-[#e5c07b] bg-[#e5c07b]/10 text-[#e5c07b] shadow-lg shadow-[#e5c07b]/10"
                      : canReview
                        ? "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
                        : "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
                  }`}
                >
                  {isLaunchingReview ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <FileCheck size={20} />
                  )}
                  <span className="text-sm font-medium">Revisar</span>
                </button>
                {suggestedAction === "review" && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#e5c07b] text-[#1c1c1c] rounded">
                    Sugestão
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isExecuting && activeExecution && (
          <div className="p-4 bg-[#1c1c1c] border border-[#909d63] rounded-lg animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#232323]">
              <div 
                className="h-full bg-[#909d63] transition-all duration-500 ease-out" 
                style={{ width: `${(activeExecution.current_step / activeExecution.total_steps) * 100}%` }} 
              />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#909d63]/20 text-[#909d63] text-xs">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
              </span>
              <span className="text-[#909d63] font-medium text-sm">
                Executando: Passo {activeExecution.current_step} de {activeExecution.total_steps}
              </span>
              {activeExecution.execution_type === "subtask" && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#909d63]/10 text-[#909d63] border border-[#909d63]/20">
                  Subtask
                </span>
              )}
            </div>
            
            <div className="pl-9 text-sm text-[#d6d6d6]">
              {activeExecution.current_step_description || "Processando..."}
            </div>

            {activeExecution.tmux_session && (
              <div className="mt-3 pl-9">
                <button 
                  onClick={() => safeInvoke("focus_tmux_session", { sessionName: activeExecution.tmux_session })}
                  className="text-xs flex items-center gap-1.5 text-[#636363] hover:text-[#909d63] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="3" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Abrir Terminal ({activeExecution.tmux_session})
                </button>
              </div>
            )}
          </div>
        )}

        {isAdjusting && (
          <div className="p-4 bg-[#1c1c1c] border border-[#61afef] rounded-lg animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-[#61afef] rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-[#61afef] rounded-full animate-ping opacity-50" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#61afef]">Agent ajustando tarefa...</div>
                  <div className="text-xs text-[#636363]">Os campos estao bloqueados durante o ajuste</div>
                </div>
              </div>
              
              {adjustingPrompt && (
                <div className="flex-1 text-sm text-[#d6d6d6] truncate italic">
                  &quot;{adjustingPrompt}&quot;
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#61afef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={quickfixInput}
            onChange={(e) => setQuickfixInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && launchQuickfix()}
            placeholder="Quickfix: Descreva uma correção rápida..."
            disabled={isBlocked}
            className="flex-1 px-4 py-2 bg-[#1c1c1c] border border-[#3d3a34] rounded-lg text-[#d6d6d6] text-sm focus:border-[#e5c07b] focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={launchQuickfix}
            disabled={!quickfixInput.trim() || isBlocked}
            className="px-4 py-2 bg-[#e5c07b] text-[#1c1c1c] font-medium text-sm rounded-lg hover:bg-[#f5d08a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLaunchingQuickfix ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            )}
            Fix
          </button>
        </div>

        {taskState !== "pending" && (
          <SubtaskList
            subtasks={taskFull.subtasks}
            onAdd={addSubtask}
            onToggle={toggleSubtask}
            onRemove={removeSubtask}
            onCodar={codarSubtask}
            onUpdate={updateSubtask}
            onReorder={reorderSubtasks}
            disabled={isBlocked}
          />
        )}

        <DescriptionWithImages
          taskId={taskId}
          description={taskFull.context.description || ""}
          images={taskImages}
          maxImages={5}
          disabled={isBlocked}
          onDescriptionSave={(value) => updateContext("description", value || null)}
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDelete}
          onImageView={handleImageView}
        />

        <section>
          <button
            type="button"
            onClick={() => setShowBusinessRules(!showBusinessRules)}
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
              style={{ transform: `rotate(${showBusinessRules ? 90 : 0}deg)` }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            Regras de Negocio (opcional)
          </button>
          {showBusinessRules && (
            <div className={`space-y-2 animate-slide-down ${isBlocked ? "opacity-50 pointer-events-none" : ""}`}>
              {taskFull.context.business_rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 group animate-fade-in">
                  <span className="text-[#636363]">*</span>
                  <span className="flex-1 text-[#d6d6d6] text-sm">{rule}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    disabled={isBlocked}
                    className="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1 disabled:cursor-not-allowed"
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
                  disabled={isBlocked}
                  className="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
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
                value={localTechnicalNotes}
                onChange={(e) => setLocalTechnicalNotes(e.target.value)}
                onBlur={() => {
                  if (localTechnicalNotes !== (taskFull.context.technical_notes || "")) {
                    updateContext("technical_notes", localTechnicalNotes || null)
                  }
                }}
                placeholder="Stack, libs, padrões relevantes..."
                rows={2}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={isBlocked}
                  className="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </section>

        {taskState === "pending" && (
          <SubtaskList
            subtasks={taskFull.subtasks}
            onAdd={addSubtask}
            onToggle={toggleSubtask}
            onRemove={removeSubtask}
            onCodar={codarSubtask}
            onUpdate={updateSubtask}
            onReorder={reorderSubtasks}
            disabled={isBlocked}
          />
        )}

        <section>
          <div className="flex items-center justify-between">
            <label className="block text-xs text-[#828282] uppercase tracking-wide">Configuração</label>
          </div>
          <div className="mt-2 p-3 bg-[#232323] border border-[#3d3a34]">
            <button
              onClick={() => updateField("initialized", !taskFull.initialized)}
              disabled={isBlocked}
              className={`flex items-center gap-3 w-full text-left group ${isBlocked ? "opacity-50 cursor-not-allowed" : ""}`}
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

      <ImageModal imageUrl={viewingImageUrl} onClose={closeImageModal} />
    </>
  )
}

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
})
