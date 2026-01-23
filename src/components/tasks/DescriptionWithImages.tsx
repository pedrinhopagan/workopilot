import { useState, useEffect, useRef, useCallback } from "react"
import { safeInvoke } from "../../services/tauri"
import { ImageThumbnail } from "./ImageThumbnail"

interface TaskImageMetadata {
  id: string
  file_name: string
  mime_type: string
  created_at: string | null
}

interface LoadedImage {
  data: string
  loading: boolean
  error: string | null
}

interface DescriptionWithImagesProps {
  taskId: string
  description: string
  images: TaskImageMetadata[]
  maxImages?: number
  disabled?: boolean
  onDescriptionSave: (value: string) => void
  onImageUpload: () => void
  onImageDelete: (imageId: string) => void
  onImageView: (imageId: string) => void
}

const allowedMimeTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"]

export function DescriptionWithImages({
  taskId,
  description,
  images,
  maxImages = 5,
  disabled = false,
  onDescriptionSave,
  onImageUpload,
  onImageDelete,
  onImageView,
}: DescriptionWithImagesProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localDescription, setLocalDescription] = useState(description)
  const [isFocused, setIsFocused] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<"success" | "error" | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [loadedImages, setLoadedImages] = useState<Map<string, LoadedImage>>(new Map())

  const canUpload = images.length < maxImages && !disabled && !isUploading

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(",")[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error("Falha ao ler arquivo."))
      reader.readAsDataURL(file)
    })
  }, [])

  const uploadImage = useCallback(async (file: File) => {
    if (!allowedMimeTypes.includes(file.type)) {
      setErrorMessage("Formato invalido. Use PNG, JPG, GIF ou WebP.")
      setUploadFeedback("error")
      setTimeout(() => {
        setUploadFeedback(null)
        setErrorMessage("")
      }, 3000)
      return
    }

    if (images.length >= maxImages) {
      setErrorMessage(`Limite de ${maxImages} imagens atingido.`)
      setUploadFeedback("error")
      setTimeout(() => {
        setUploadFeedback(null)
        setErrorMessage("")
      }, 3000)
      return
    }

    setIsUploading(true)
    setErrorMessage("")

    try {
      const base64 = await fileToBase64(file)
      await safeInvoke("add_task_image", {
        taskId,
        fileData: base64,
        fileName: file.name || `screenshot-${Date.now()}.png`,
        mimeType: file.type,
      })
      setUploadFeedback("success")
      setTimeout(() => setUploadFeedback(null), 1500)
      onImageUpload()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao enviar imagem.")
      setUploadFeedback("error")
      setTimeout(() => setUploadFeedback(null), 3000)
    } finally {
      setIsUploading(false)
    }
  }, [taskId, images.length, maxImages, fileToBase64, onImageUpload])

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || isUploading || images.length >= maxImages) return

    const items = event.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          uploadImage(file)
          break
        }
      }
    }
  }, [disabled, isUploading, images.length, maxImages, uploadImage])

  const loadImage = useCallback(async (imageId: string) => {
    const existing = loadedImages.get(imageId)
    if (existing?.data || existing?.loading) return

    setLoadedImages(prev => {
      const next = new Map(prev)
      next.set(imageId, { data: "", loading: true, error: null })
      return next
    })

    try {
      const result = await safeInvoke<{ data: string; mime_type: string }>("get_task_image", { imageId })
      setLoadedImages(prev => {
        const next = new Map(prev)
        next.set(imageId, { 
          data: `data:${result.mime_type};base64,${result.data}`, 
          loading: false, 
          error: null 
        })
        return next
      })
    } catch (err) {
      setLoadedImages(prev => {
        const next = new Map(prev)
        next.set(imageId, { 
          data: "", 
          loading: false, 
          error: err instanceof Error ? err.message : "Erro ao carregar" 
        })
        return next
      })
    }
  }, [loadedImages])

  const handleDelete = useCallback((imageId: string) => {
    if (disabled) return
    onImageDelete(imageId)
  }, [disabled, onImageDelete])

  // Sync local state when external description changes (e.g., AI update)
  useEffect(() => {
    if (!isFocused) {
      setLocalDescription(description)
    }
  }, [description, isFocused])

  useEffect(() => {
    images.forEach((img) => {
      loadImage(img.id)
    })
  }, [images, loadImage])

  const wrapperClassName = [
    "border transition-colors",
    isFocused ? "border-primary" : "border-border",
    uploadFeedback === "success" ? "animate-flash-success" : "",
    uploadFeedback === "error" ? "animate-flash-error" : "",
  ].filter(Boolean).join(" ")

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">Descricao</label>
        {canUpload && (
          <span className={`flex items-center gap-1 text-xs transition-colors ${isFocused ? "text-primary" : "text-muted-foreground/60"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>Ctrl+V cola imagem</span>
          </span>
        )}
        {isUploading && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>Enviando...</span>
          </span>
        )}
      </div>

      <div className={wrapperClassName}>
        <textarea
          ref={textareaRef}
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onBlur={() => {
            setIsFocused(false)
            if (localDescription !== description) {
              onDescriptionSave(localDescription)
            }
          }}
          onFocus={() => setIsFocused(true)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="Descreva o objetivo desta tarefa... (Ctrl+V para colar imagens)"
          rows={3}
          className="w-full px-3 py-2 bg-card border-none text-foreground text-sm resize-y outline-none transition-opacity disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/60"
        />
      </div>

      {errorMessage && (
        <span className="text-xs text-destructive">{errorMessage}</span>
      )}

      {images.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {images.map((image) => (
            <ImageThumbnail
              key={image.id}
              imageId={image.id}
              fileName={image.file_name}
              imageState={loadedImages.get(image.id)}
              disabled={disabled}
              onView={onImageView}
              onDelete={handleDelete}
            />
          ))}

          <span className="text-xs text-muted-foreground ml-1">{images.length}/{maxImages}</span>
        </div>
      )}
    </section>
  )
}
