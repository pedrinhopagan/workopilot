import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#909d63"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
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
          icon={<RocketIcon />}
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
          icon={<TargetIcon />}
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
          icon={<EyeIcon />}
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
          icon={<SparklesIcon />}
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={loadingColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
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

function RocketIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
