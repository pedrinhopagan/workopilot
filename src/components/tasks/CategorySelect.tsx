import { useState, useRef, useEffect } from "react"
import { Pencil, Check, X, ChevronDown, Settings2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { trpc } from "@/services/trpc"

type Category = {
  id: string
  name: string
  color: string | null
  display_order: number
}

type CategorySelectProps = {
  value: string | null
  onValueChange: (categoryId: string, category: Category) => void
  onManageClick?: () => void
  triggerClassName?: string
  disabled?: boolean
}

export function CategorySelect({
  value,
  onValueChange,
  onManageClick,
  triggerClassName,
  disabled = false,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()
  const categoriesQuery = trpc.categories.list.useQuery()
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate()
    },
  })

  const categories = categoriesQuery.data ?? []
  const selectedCategory = categories.find((c) => c.id === value)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function startEditing(category: Category) {
    setEditingId(category.id)
    setEditValue(category.name)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditValue("")
  }

  async function saveEditing() {
    if (!editingId || !editValue.trim()) {
      cancelEditing()
      return
    }

    await updateCategory.mutateAsync({
      id: editingId,
      name: editValue.trim(),
    })
    setEditingId(null)
    setEditValue("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEditing()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEditing()
    }
  }

  function handleSelect(category: Category) {
    if (editingId) return
    onValueChange(category.id, category)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card min-w-[120px]",
            "hover:bg-popover hover:border-muted-foreground transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            open && "bg-popover border-muted-foreground",
            triggerClassName
          )}
        >
          <span
            className="size-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedCategory?.color || "#6b7280" }}
          />
          <span className="flex-1 text-sm text-foreground truncate text-left">
            {selectedCategory?.name || "Categoria"}
          </span>
          <ChevronDown className="size-3 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-0">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Categoria
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto">
          {categories.map((category) => {
            const isSelected = category.id === value
            const isEditing = editingId === category.id

            if (isEditing) {
              return (
                <div
                  key={category.id}
                  className="flex items-center gap-2 px-3 py-2 bg-popover"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => saveEditing()}
                    className="flex-1 px-2 py-0.5 text-sm bg-background border border-border focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => saveEditing()}
                    className="p-1 text-primary hover:text-primary/80 transition-colors"
                    title="Salvar"
                  >
                    <Check className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelEditing()}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Cancelar"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            }

            return (
              <button
                type="button"
                key={category.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 w-full cursor-pointer transition-colors group text-left",
                  isSelected ? "bg-popover" : "hover:bg-popover"
                )}
                onClick={() => handleSelect(category)}
              >
                <span
                  className="size-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || "#6b7280" }}
                />
                <span className={cn(
                  "flex-1 text-sm truncate",
                  isSelected ? "text-foreground font-medium" : "text-foreground"
                )}>
                  {category.name}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditing(category)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"
                  title="Editar"
                >
                  <Pencil className="size-3" />
                </button>

                <Check className={cn(
                  "size-3 flex-shrink-0",
                  isSelected ? "text-primary" : "text-transparent"
                )} />
              </button>
            )
          })}
        </div>

        {onManageClick && (
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onManageClick()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-popover transition-colors"
            >
              <Settings2 className="size-4" />
              Gerenciar categorias
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
