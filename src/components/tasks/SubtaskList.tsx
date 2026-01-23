import { useState, useMemo } from "react"
import type { Subtask } from "../../types"
import { SubtaskItem } from "./SubtaskItem"

type SubtaskListProps = {
  subtasks: Subtask[]
  onAdd: (title: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Subtask, value: unknown) => void
  onReorder: (subtasks: Subtask[]) => void
  disabled?: boolean
}

export function SubtaskList({
  subtasks,
  onAdd,
  onToggle,
  onRemove,
  onUpdate,
  onReorder,
  disabled = false,
}: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const sortedSubtasks = useMemo(
    () => [...subtasks].sort((a, b) => a.order - b.order),
    [subtasks]
  )

  const doneCount = subtasks.filter((s) => s.status === "done").length

  function handleAdd() {
    if (!newTitle.trim()) return
    onAdd(newTitle.trim())
    setNewTitle("")
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function moveUp(index: number) {
    if (index === 0) return
    const newList = [...sortedSubtasks]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    newList.forEach((s, i) => {
      s.order = i
    })
    onReorder(newList)
  }

  function moveDown(index: number) {
    if (index === sortedSubtasks.length - 1) return
    const newList = [...sortedSubtasks]
    ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
    newList.forEach((s, i) => {
      s.order = i
    })
    onReorder(newList)
  }

  return (
    <section className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Subtasks</span>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount}/{subtasks.length} concluidas
          </span>
        )}
      </div>

      {sortedSubtasks.length > 0 ? (
        <div className="space-y-1 mb-3">
          {sortedSubtasks.map((subtask, index) => (
            <div key={subtask.id} className="flex items-start gap-1">
              <div className="flex flex-col pt-2">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || disabled}
                  className={`text-muted-foreground hover:text-primary disabled:text-border disabled:cursor-not-allowed transition-colors p-0.5 ${disabled ? "cursor-not-allowed" : ""}`}
                  title="Mover para cima"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === sortedSubtasks.length - 1 || disabled}
                  className={`text-muted-foreground hover:text-primary disabled:text-border disabled:cursor-not-allowed transition-colors p-0.5 ${disabled ? "cursor-not-allowed" : ""}`}
                  title="Mover para baixo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
              <div className="flex-1">
                <SubtaskItem
                  subtask={subtask}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  onUpdate={onUpdate}
                  expanded={expandedIds.has(subtask.id)}
                  onToggleExpand={toggleExpand}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border bg-background mb-3">
          Nenhuma subtask ainda
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">+</span>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Adicionar subtask..."
          disabled={disabled}
          className="flex-1 bg-transparent text-foreground text-sm focus:outline-none border-b border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || disabled}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Adicionar
        </button>
      </div>
    </section>
  )
}
