import { useState, useEffect, useRef, useCallback } from "react"
import { safeInvoke } from "../../services/tauri"

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
  onDescriptionChange: (value: string) => void
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
  onDescriptionChange,
  onImageUpload,
  onImageDelete,
  onImageView,
}: DescriptionWithImagesProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
    if (confirm("Remover esta imagem?")) {
      onImageDelete(imageId)
    }
  }, [disabled, onImageDelete])

  useEffect(() => {
    images.forEach((img) => {
      loadImage(img.id)
    })
  }, [images, loadImage])

  const wrapperClassName = [
    "border transition-colors",
    isFocused ? "border-[#909d63]" : "border-[#3d3a34]",
    uploadFeedback === "success" ? "animate-flash-success" : "",
    uploadFeedback === "error" ? "animate-flash-error" : "",
  ].filter(Boolean).join(" ")

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label className="text-xs text-[#828282] uppercase tracking-wide">Descricao</label>
        {canUpload && (
          <span className={`flex items-center gap-1 text-xs transition-colors ${isFocused ? "text-[#909d63]" : "text-[#4a4a4a]"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>Ctrl+V cola imagem</span>
          </span>
        )}
        {isUploading && (
          <span className="flex items-center gap-1 text-xs text-[#909d63]">
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
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="Descreva o objetivo desta tarefa... (Ctrl+V para colar imagens)"
          rows={3}
          className="w-full px-3 py-2 bg-[#232323] border-none text-[#d6d6d6] text-sm resize-y outline-none transition-opacity disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#4a4a4a]"
        />
      </div>

      {errorMessage && (
        <span className="text-xs text-[#bc5653]">{errorMessage}</span>
      )}

      {images.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {images.map((image) => {
            const imageState = loadedImages.get(image.id)
            return (
              <div key={image.id} className="relative group">
                <button
                  className="w-10 h-10 bg-[#232323] border border-[#3d3a34] cursor-pointer overflow-hidden flex items-center justify-center transition-all hover:border-[#909d63] hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onImageView(image.id)}
                  disabled={disabled || imageState?.loading || !!imageState?.error}
                  title={image.file_name}
                >
                  {imageState?.loading || !imageState ? (
                    <div className="flex items-center justify-center w-full h-full text-[#636363]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    </div>
                  ) : imageState?.error ? (
                    <div className="flex items-center justify-center w-full h-full text-[#bc5653]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                      </svg>
                    </div>
                  ) : (
                    <img src={imageState.data} alt={image.file_name} className="w-full h-full object-cover" />
                  )}
                </button>

                {!disabled && (
                  <button
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[rgba(28,28,28,0.95)] border border-[#3d3a34] rounded-full text-[#bc5653] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#bc5653] hover:text-[#1c1c1c] hover:border-[#bc5653]"
                    onClick={() => handleDelete(image.id)}
                    title="Remover imagem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })}

          <span className="text-xs text-[#636363] ml-1">{images.length}/{maxImages}</span>
        </div>
      )}
    </section>
  )
}
