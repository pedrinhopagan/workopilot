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
      <div className="relative bg-background border border-border max-w-lg w-full mx-4 overflow-hidden animate-modal-in">
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
    <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Check size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-foreground text-base font-medium">
            Estruturação Concluída
          </h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            {subtaskCount} subtasks criadas
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1"
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
      <p className="text-foreground text-sm mb-1">Task estruturada:</p>
      <p className="text-primary font-medium truncate">{taskTitle}</p>
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
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">
        Próxima ação
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          onClick={onExecuteAll}
          disabled={isLaunching}
          isLoading={launchingAction === "execute_all"}
          variant="primary"
          icon={<Rocket size={24} />}
          label="Executar Tudo"
        />
        <ActionButton
          onClick={onExecuteFirstSubtask}
          disabled={isLaunching}
          isLoading={launchingAction === "execute_subtask"}
          variant="info"
          icon={<Target size={24} />}
          label="Executar Subtask"
        />
        <ActionButton
          onClick={onReview}
          disabled={isLaunching}
          isLoading={launchingAction === "review"}
          variant="accent"
          icon={<Eye size={24} />}
          label="Revisar"
        />
        <ActionButton
          onClick={onViewTask}
          disabled={isLaunching}
          isLoading={false}
          variant="muted"
          icon={<Sparkles size={24} />}
          label="Editar Manualmente"
        />
      </div>
    </div>
  )
}

type ActionVariant = "primary" | "info" | "accent" | "muted"

function ActionButton({
  onClick,
  disabled,
  isLoading,
  variant,
  icon,
  label,
}: {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
  variant: ActionVariant
  icon: React.ReactNode
  label: string
}) {
  const variantClasses: Record<ActionVariant, { hover: string; text: string }> = {
    primary: {
      hover: "hover:border-primary hover:bg-primary/10",
      text: "group-hover:text-primary",
    },
    info: {
      hover: "hover:border-chart-4 hover:bg-chart-4/10",
      text: "group-hover:text-chart-4",
    },
    accent: {
      hover: "hover:border-accent hover:bg-accent/10",
      text: "group-hover:text-accent",
    },
    muted: {
      hover: "hover:border-muted-foreground hover:bg-secondary",
      text: "group-hover:text-foreground",
    },
  }

  const classes = variantClasses[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 p-4 border border-border bg-card ${classes.hover} transition-all group disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <Loader2 size={24} className={`animate-spin ${classes.text.replace("group-hover:", "")}`} />
      ) : (
        <span className={`text-muted-foreground ${classes.text} transition-colors`}>
          {icon}
        </span>
      )}
      <span
        className={`text-sm text-foreground ${classes.text} transition-colors`}
      >
        {label}
      </span>
    </button>
  )
}
