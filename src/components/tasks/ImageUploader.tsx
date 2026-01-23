import { useState, useRef } from "react"
import { safeInvoke } from "../../services/tauri"

type ImageUploaderProps = {
  taskId: string
  onUploadSuccess: () => void
}

export function ImageUploader({ taskId, onUploadSuccess }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64String = reader.result?.toString()
        if (!base64String) return

        const base64Data = base64String.split(",")[1]

        await safeInvoke("add_task_image", {
          taskId,
          data: base64Data,
          mimeType: file.type,
          fileName: file.name
        })
        
        onUploadSuccess()
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Failed to upload image:", error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-card hover:bg-popover text-foreground border border-border rounded transition-colors disabled:opacity-50"
      >
        {isUploading ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        )}
        Adicionar Imagem
      </button>
    </div>
  )
}
