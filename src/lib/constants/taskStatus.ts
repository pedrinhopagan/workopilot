import type { TaskFull } from "../../types"

export type TaskState = "pending" | "ready_to_execute" | "in_progress" | "awaiting_review" | "done"

export const stateLabels: Record<TaskState, string> = {
  pending: "Pendente",
  ready_to_execute: "Pronta para executar",
  in_progress: "Em execução",
  awaiting_review: "Aguardando revisão",
  done: "Concluída",
}

export const stateColors: Record<TaskState, string> = {
  pending: "#e5c07b",
  ready_to_execute: "#909d63",
  in_progress: "#61afef",
  awaiting_review: "#e5c07b",
  done: "#909d63",
}

export function getTaskState(taskFull: TaskFull | null): TaskState {
  if (!taskFull) return "pending"
  if (taskFull.status === "done") return "done"
  if (taskFull.status === "awaiting_review") return "awaiting_review"
  const hasInProgress = taskFull.subtasks.some((s) => s.status === "in_progress")
  if (hasInProgress) return "in_progress"
  if (taskFull.initialized) return "ready_to_execute"
  return "pending"
}

export function getStateLabel(state: TaskState): string {
  return stateLabels[state]
}

export function getStateColor(state: TaskState): string {
  return stateColors[state]
}

export function getComplexityLabel(complexity: string | null): string {
  const map: Record<string, string> = {
    S: "Simples",
    M: "Média",
    L: "Complexa",
    XL: "Muito Complexa",
  }
  return complexity ? map[complexity] || complexity : "-"
}

export function getComplexityColor(complexity: string | null): string {
  const map: Record<string, string> = {
    S: "text-[#909d63]",
    M: "text-[#ebc17a]",
    L: "text-[#bc5653]",
    XL: "text-[#bc5653] font-bold",
  }
  return complexity ? map[complexity] || "text-[#636363]" : "text-[#636363]"
}

export function getStatusFilterOptions() {
  return [
    { value: "pending", label: "Pendente" },
    { value: "ready_to_execute", label: "Pronta" },
    { value: "in_progress", label: "Em Execução" },
    { value: "awaiting_review", label: "Revisão" },
    { value: "done", label: "Concluída" },
  ]
}
