import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Check,
  X,
  Loader2,
  Rocket,
  Target,
  Eye,
  Sparkles,
} from "lucide-react"
import { safeInvoke } from "../services/tauri"
import { useStructuringNotificationStore } from "../stores/structuringNotification"
import { useDialogStateStore } from "../stores/dialogState"

export function StructuringCompleteModal() {
  const navigate = useNavigate()
  const notification = useStructuringNotificationStore((s) => s.notification)
  const dismissNotification = useStructuringNotificationStore((s) => s.dismissNotification)
  const openDialog = useDialogStateStore((s) => s.openDialog)
  const closeDialog = useDialogStateStore((s) => s.closeDialog)

  const [isLaunching, setIsLaunching] = useState(false)
  const [launchingAction, setLaunchingAction] = useState<string | null>(null)

  useEffect(() => {
    if (notification) {
      openDialog()
      return () => closeDialog()
    }
  }, [notification, openDialog, closeDialog])

  const handleClose = useCallback(() => {
    dismissNotification()
  }, [dismissNotification])

  const handleViewTask = useCallback(() => {
    if (!notification) return
    handleClose()
    navigate({ to: "/tasks/$taskId", params: { taskId: notification.taskId } })
  }, [notification, handleClose, navigate])

  const handleExecuteAll = useCallback(async () => {
    if (!notification || isLaunching) return
    setIsLaunching(true)
    setLaunchingAction("execute_all")
    try {
      await safeInvoke("launch_task_execute_all", {
        projectId: notification.projectId,
        taskId: notification.taskId,
      })
      handleClose()
      navigate({ to: "/tasks/$taskId", params: { taskId: notification.taskId } })
    } catch (e) {
      console.error("Failed to launch execute all:", e)
    } finally {
      setIsLaunching(false)
      setLaunchingAction(null)
    }
  }, [notification, isLaunching, handleClose, navigate])

  const handleExecuteFirstSubtask = useCallback(async () => {
    if (!notification || isLaunching) return
    setIsLaunching(true)
    setLaunchingAction("execute_subtask")
    try {
      const firstSubtaskId = `${notification.taskId}:sub-001`
      await safeInvoke("launch_task_execute_subtask", {
        projectId: notification.projectId,
        taskId: notification.taskId,
        subtaskId: firstSubtaskId,
      })
      handleClose()
      navigate({ to: "/tasks/$taskId", params: { taskId: notification.taskId } })
    } catch (e) {
      console.error("Failed to launch execute subtask:", e)
    } finally {
      setIsLaunching(false)
      setLaunchingAction(null)
    }
  }, [notification, isLaunching, handleClose, navigate])

  const handleReview = useCallback(async () => {
    if (!notification || isLaunching) return
    setIsLaunching(true)
    setLaunchingAction("review")
    try {
      await safeInvoke("launch_task_review", {
        projectId: notification.projectId,
        taskId: notification.taskId,
      })
      handleClose()
      navigate({ to: "/tasks/$taskId", params: { taskId: notification.taskId } })
    } catch (e) {
      console.error("Failed to launch review:", e)
    } finally {
      setIsLaunching(false)
      setLaunchingAction(null)
    }
  }, [notification, isLaunching, handleClose, navigate])

  useEffect(() => {
    if (!notification) return

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }

    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [notification, handleClose])

  if (!notification) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        role="button"
        tabIndex={-1}
        aria-label="Fechar modal"
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
      />
      <div className="relative bg-[#1c1c1c] border border-[#3d3a34] max-w-lg w-full mx-4 overflow-hidden animate-modal-in">
        <ModalHeader
          subtaskCount={notification.subtaskCount}
          onClose={handleClose}
        />
        <ModalTaskInfo taskTitle={notification.taskTitle} />
        <ModalActions
          isLaunching={isLaunching}
          launchingAction={launchingAction}
          onExecuteAll={handleExecuteAll}
          onExecuteFirstSubtask={handleExecuteFirstSubtask}
          onReview={handleReview}
          onViewTask={handleViewTask}
        />
      </div>
    </div>
  )
}

function ModalHeader({
  subtaskCount,
  onClose,
}: {
  subtaskCount: number
  onClose: () => void
}) {
  return (
    <div className="px-5 py-4 border-b border-[#3d3a34] bg-gradient-to-r from-[#909d63]/10 via-transparent to-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#909d63]/20 flex items-center justify-center">
          <Check size={20} color="#909d63" />
        </div>
        <div>
          <h3 className="text-[#d6d6d6] text-base font-medium">
            Estruturação Concluída
          </h3>
          <p className="text-[#636363] text-sm mt-0.5">
            {subtaskCount} subtasks criadas
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

function ModalTaskInfo({ taskTitle }: { taskTitle: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[#d6d6d6] text-sm mb-1">Task estruturada:</p>
      <p className="text-[#909d63] font-medium truncate">{taskTitle}</p>
    </div>
  )
}

function ModalActions({
  isLaunching,
  launchingAction,
  onExecuteAll,
  onExecuteFirstSubtask,
  onReview,
  onViewTask,
}: {
  isLaunching: boolean
  launchingAction: string | null
  onExecuteAll: () => void
  onExecuteFirstSubtask: () => void
  onReview: () => void
  onViewTask: () => void
}) {
  return (
    <div className="px-5 pb-5">
      <p className="text-[#636363] text-xs uppercase tracking-wider mb-3">
        Próxima ação
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          onClick={onExecuteAll}
          disabled={isLaunching}
          isLoading={launchingAction === "execute_all"}
          loadingColor="#909d63"
          hoverBorderColor="hover:border-[#909d63]"
          hoverBgColor="hover:bg-[#909d63]/10"
          hoverTextColor="group-hover:text-[#909d63]"
          icon={<Rocket size={24} />}
          label="Executar Tudo"
        />
        <ActionButton
          onClick={onExecuteFirstSubtask}
          disabled={isLaunching}
          isLoading={launchingAction === "execute_subtask"}
          loadingColor="#61afef"
          hoverBorderColor="hover:border-[#61afef]"
          hoverBgColor="hover:bg-[#61afef]/10"
          hoverTextColor="group-hover:text-[#61afef]"
          icon={<Target size={24} />}
          label="Executar Subtask"
        />
        <ActionButton
          onClick={onReview}
          disabled={isLaunching}
          isLoading={launchingAction === "review"}
          loadingColor="#e5c07b"
          hoverBorderColor="hover:border-[#e5c07b]"
          hoverBgColor="hover:bg-[#e5c07b]/10"
          hoverTextColor="group-hover:text-[#e5c07b]"
          icon={<Eye size={24} />}
          label="Revisar"
        />
        <ActionButton
          onClick={onViewTask}
          disabled={isLaunching}
          isLoading={false}
          loadingColor="#636363"
          hoverBorderColor="hover:border-[#636363]"
          hoverBgColor="hover:bg-[#2a2a2a]"
          hoverTextColor="group-hover:text-[#d6d6d6]"
          icon={<Sparkles size={24} />}
          label="Editar Manualmente"
        />
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  isLoading,
  loadingColor,
  hoverBorderColor,
  hoverBgColor,
  hoverTextColor,
  icon,
  label,
}: {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
  loadingColor: string
  hoverBorderColor: string
  hoverBgColor: string
  hoverTextColor: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border border-[#3d3a34] bg-[#232323] ${hoverBorderColor} ${hoverBgColor} transition-all group disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <Loader2 size={24} color={loadingColor} className="animate-spin" />
      ) : (
        <span className={`text-[#636363] ${hoverTextColor} transition-colors`}>
          {icon}
        </span>
      )}
      <span
        className={`text-sm text-[#d6d6d6] ${hoverTextColor} transition-colors`}
      >
        {label}
      </span>
    </button>
  )
}
