import { useDialogStateStore } from "../stores/dialogState"
import { isTauri } from "../services/tauri"

type SelectFolderKDEProps = {
  onSelect: (path: string) => void
  title?: string
  defaultPath?: string
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

export function SelectFolderKDE({
  onSelect,
  title = "Selecionar pasta",
  defaultPath,
  disabled = false,
  children,
  className = "",
}: SelectFolderKDEProps) {
  const openDialog = useDialogStateStore((s) => s.openDialog)
  const closeDialog = useDialogStateStore((s) => s.closeDialog)

  async function handleClick() {
    if (disabled || !isTauri()) return

    try {
      openDialog()
      const { open } = await import("@tauri-apps/plugin-dialog")
      const selected = await open({
        directory: true,
        multiple: false,
        title,
        defaultPath,
      })

      if (!selected || typeof selected !== "string") {
        closeDialog()
        return
      }

      closeDialog()
      onSelect(selected)
    } catch (e) {
      console.error("Failed to select folder:", e)
      closeDialog()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  )
}
