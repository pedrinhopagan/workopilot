import { useState } from "react"

interface LoadedImage {
  data: string
  loading: boolean
  error: string | null
}

type ImageThumbnailProps = {
  imageId: string
  fileName: string
  imageState: LoadedImage | undefined
  disabled?: boolean
  onView: (imageId: string) => void
  onDelete: (imageId: string) => void
}

export function ImageThumbnail({
  imageId,
  fileName,
  imageState,
  disabled = false,
  onView,
  onDelete,
}: ImageThumbnailProps) {
  const [pendingDelete, setPendingDelete] = useState(false)

  const handleConfirmDelete = () => {
    onDelete(imageId)
    setPendingDelete(false)
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="w-10 h-10 bg-[#232323] border border-[#3d3a34] cursor-pointer overflow-hidden flex items-center justify-center transition-all hover:border-[#909d63] hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => onView(imageId)}
        disabled={disabled || imageState?.loading || !!imageState?.error}
        title={fileName}
      >
        {imageState?.loading || !imageState ? (
          <div className="flex items-center justify-center w-full h-full text-[#636363]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        ) : imageState?.error ? (
          <div className="flex items-center justify-center w-full h-full text-[#bc5653]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" /><path d="m9 9 6 6" />
            </svg>
          </div>
        ) : (
          <img src={imageState.data} alt={fileName} className="w-full h-full object-cover" />
        )}
      </button>

      {!disabled && (
        pendingDelete ? (
          <button
            type="button"
            className="absolute inset-0 w-10 h-10 bg-[#bc5653] flex flex-col items-center justify-center cursor-pointer transition-all animate-pulse"
            onClick={handleConfirmDelete}
            onBlur={() => setPendingDelete(false)}
            title="Clique para confirmar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="absolute -top-1 -right-1 w-4 h-4 bg-[rgba(28,28,28,0.95)] border border-[#3d3a34] rounded-full text-[#bc5653] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#bc5653] hover:text-[#1c1c1c] hover:border-[#bc5653]"
            onClick={() => setPendingDelete(true)}
            title="Remover imagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )
      )}
    </div>
  )
}
