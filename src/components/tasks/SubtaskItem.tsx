import { useState, useEffect } from "react"
import type { Subtask } from "../../types"

type SubtaskItemProps = {
  subtask: Subtask
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Subtask, value: unknown) => void
  expanded?: boolean
  onToggleExpand: (id: string) => void
  disabled?: boolean
}

export function SubtaskItem({
  subtask,
  onToggle,
  onRemove,
  onUpdate,
  expanded = false,
  onToggleExpand,
  disabled = false,
}: SubtaskItemProps) {
  const [newCriteria, setNewCriteria] = useState("")
  const [description, setDescription] = useState(subtask.description || "")
  const [technicalNotes, setTechnicalNotes] = useState(subtask.technical_notes || "")

  useEffect(() => {
    setDescription(subtask.description || "")
    setTechnicalNotes(subtask.technical_notes || "")
  }, [subtask.description, subtask.technical_notes])

  const isDone = subtask.status === "done"
  const hasDetails =
    subtask.description ||
    (subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0) ||
    subtask.technical_notes

  function addCriteria() {
    if (!newCriteria.trim()) return
    const current = subtask.acceptance_criteria || []
    onUpdate(subtask.id, "acceptance_criteria", [...current, newCriteria.trim()])
    setNewCriteria("")
  }

  function removeCriteria(index: number) {
    const current = subtask.acceptance_criteria || []
    const updated = current.filter((_, i) => i !== index)
    onUpdate(subtask.id, "acceptance_criteria", updated.length > 0 ? updated : null)
  }

  return (
    <div className={`animate-fade-in ${isDone ? "opacity-50" : ""} ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-3 px-3 py-2 bg-card hover:bg-popover transition-colors group">
        <button
          onClick={() => onToggle(subtask.id)}
          disabled={disabled}
          className={`transition-colors ${isDone ? "text-primary" : "text-muted-foreground hover:text-primary"} ${disabled ? "cursor-not-allowed" : ""}`}
        >
          {isDone ? "[x]" : "[ ]"}
        </button>

        <button
          onClick={() => onToggleExpand(subtask.id)}
          disabled={disabled}
          className={`text-muted-foreground hover:text-primary transition-colors ${disabled ? "cursor-not-allowed" : ""}`}
          title={expanded ? "Recolher detalhes" : "Expandir detalhes"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <span className={`flex-1 text-foreground text-sm ${isDone ? "line-through" : ""}`}>
          {subtask.title}
        </span>

        {!expanded && hasDetails && (
          <span className="text-muted-foreground text-xs">
            {subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0
              ? `(${subtask.acceptance_criteria.length} criterios)`
              : "(detalhes)"}
          </span>
        )}

        <button
          onClick={() => onRemove(subtask.id)}
          disabled={disabled}
          className={`opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all p-1 ${disabled ? "cursor-not-allowed hidden" : ""}`}
          title="Remover subtask"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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

      {expanded && (
        <div className="px-3 py-3 bg-background border-l-2 border-border ml-6 animate-slide-down space-y-4">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs uppercase tracking-wide">Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => onUpdate(subtask.id, "description", description || null)}
              disabled={disabled}
              placeholder="Descreva a subtask..."
              className="w-full bg-card text-foreground text-sm px-3 py-2 border border-border focus:border-primary focus:outline-none resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground text-xs uppercase tracking-wide">Criterios de Aceitacao</label>

            {subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0 && (
              <ul className="space-y-1">
                {subtask.acceptance_criteria.map((criteria, index) => (
                  <li key={index} className="flex items-center gap-2 group/criteria">
                    <span className="text-primary">-</span>
                    <span className="flex-1 text-foreground text-sm">{criteria}</span>
                    <button
                      onClick={() => removeCriteria(index)}
                      disabled={disabled}
                      className={`opacity-0 group-hover/criteria:opacity-100 text-destructive hover:text-destructive/80 transition-all p-1 ${disabled ? "hidden" : ""}`}
                      title="Remover criterio"
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
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCriteria()}
                disabled={disabled}
                placeholder="Adicionar criterio..."
                className="flex-1 bg-card text-foreground text-sm px-3 py-1 border border-border focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={addCriteria}
                disabled={!newCriteria.trim() || disabled}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground text-xs uppercase tracking-wide">Notas Tecnicas</label>
            <textarea
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              onBlur={() => onUpdate(subtask.id, "technical_notes", technicalNotes || null)}
              disabled={disabled}
              placeholder="Adicione notas tecnicas, referencias, ou consideracoes de implementacao..."
              className="w-full bg-card text-foreground text-sm px-3 py-2 border border-border focus:border-primary focus:outline-none resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}
