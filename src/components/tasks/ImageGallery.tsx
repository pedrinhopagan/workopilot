import { useState, useEffect } from "react"
import { safeInvoke } from "../../services/tauri"
import type { TaskImage } from "../../types"
import { ImageUploader } from "./ImageUploader"
import { ImageModal } from "./ImageModal"

type ImageGalleryProps = {
  taskId: string
}

export function ImageGallery({ taskId }: ImageGalleryProps) {
  const [images, setImages] = useState<TaskImage[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  async function loadImages() {
    try {
      const data = await safeInvoke<TaskImage[]>("get_task_images", { taskId })
      setImages(data)
    } catch (error) {
      console.error("Failed to load images:", error)
    }
  }

  useEffect(() => {
    loadImages()
  }, [taskId])

  async function handleDelete(imageId: string) {
    if (!confirm("Tem certeza que deseja excluir esta imagem?")) return
    try {
      await safeInvoke("delete_task_image", { imageId })
      await loadImages()
    } catch (error) {
      console.error("Failed to delete image:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[#828282] uppercase tracking-wide">Imagens de Referência</label>
        <ImageUploader taskId={taskId} onUploadSuccess={loadImages} />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image) => (
            <div key={image.id} className="relative group aspect-square bg-[#232323] border border-[#3d3a34] rounded-lg overflow-hidden">
              <img
                src={`data:${image.mime_type};base64,${image.data}`}
                alt={image.file_name}
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => setSelectedImage(`data:${image.mime_type};base64,${image.data}`)}
              />
              <button
                onClick={() => handleDelete(image.id)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-[#bc5653] text-white rounded opacity-0 group-hover:opacity-100 transition-all"
                title="Excluir imagem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-[#3d3a34] bg-[#1c1c1c] rounded-lg text-[#636363] text-xs">
          Nenhuma imagem anexada
        </div>
      )}

      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  )
}
