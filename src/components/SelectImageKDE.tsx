import { useDialogStateStore } from "../stores/dialogState"
import { isTauri } from "../services/tauri"

type SelectImageKDEProps = {
  onSelect: (paths: string[]) => void
  title?: string
  multiple?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

export function SelectImageKDE({
  onSelect,
  title = "Selecionar imagens",
  multiple = true,
  disabled = false,
  children,
  className = "",
}: SelectImageKDEProps) {
  const openDialog = useDialogStateStore((s) => s.openDialog)
  const closeDialog = useDialogStateStore((s) => s.closeDialog)

  async function handleClick() {
    if (disabled || !isTauri()) return

    try {
      openDialog()
      const { open } = await import("@tauri-apps/plugin-dialog")
      const selected = await open({
        multiple,
        title,
        filters: [{ name: "Imagens", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
      })

      if (!selected) {
        closeDialog()
        return
      }

      const paths = Array.isArray(selected) ? selected : [selected]
      if (paths.length === 0) {
        closeDialog()
        return
      }

      closeDialog()
      onSelect(paths)
    } catch (e) {
      console.error("Failed to select images:", e)
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
