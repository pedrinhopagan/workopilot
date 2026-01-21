import type { TaskFull } from "../../types"

export type FullStatus = 
  | "pending"
  | "structuring"
  | "executing"
  | "awaiting_user"
  | "awaiting_review"
  | "done"

export const statusColors: Record<FullStatus, string> = {
  pending: "#636363",
  structuring: "#61afef",
  executing: "#61afef",
  awaiting_user: "#d19a66",
  awaiting_review: "#e5c07b",
  done: "#909d63",
}

export const statusLabels: Record<FullStatus, string> = {
  pending: "Pendente",
  structuring: "Estruturando",
  executing: "Executando",
  awaiting_user: "Aguardando Ação",
  awaiting_review: "Aguardando Revisão",
  done: "Concluída",
}

export const statusActor: Record<FullStatus, "ai" | "user" | null> = {
  pending: null,
  structuring: "ai",
  executing: "ai",
  awaiting_user: "user",
  awaiting_review: "user",
  done: null,
}

export function getFullStatus(status: string, substatus: string | null | undefined): FullStatus {
  if (status === "done") return "done"
  if (status === "pending") return "pending"
  
  if (substatus === "structuring") return "structuring"
  if (substatus === "executing") return "executing"
  if (substatus === "awaiting_user") return "awaiting_user"
  if (substatus === "awaiting_review") return "awaiting_review"
  
  return "awaiting_user"
}

export function getTaskFullStatus(task: TaskFull | null): FullStatus {
  if (!task) return "pending"
  return getFullStatus(task.status, task.substatus)
}

export function getStatusColor(status: string, substatus?: string | null): string {
  const fullStatus = getFullStatus(status, substatus)
  return statusColors[fullStatus]
}

export function getTaskStatusColor(task: TaskFull | null): string {
  const fullStatus = getTaskFullStatus(task)
  return statusColors[fullStatus]
}

export function getStatusLabel(status: string, substatus?: string | null): string {
  const fullStatus = getFullStatus(status, substatus)
  return statusLabels[fullStatus]
}

export function getTaskStatusLabel(task: TaskFull | null): string {
  const fullStatus = getTaskFullStatus(task)
  return statusLabels[fullStatus]
}

export function isUserActionRequired(status: string, substatus?: string | null): boolean {
  const fullStatus = getFullStatus(status, substatus)
  return statusActor[fullStatus] === "user"
}

export function isTaskUserActionRequired(task: TaskFull | null): boolean {
  if (!task) return false
  return isUserActionRequired(task.status, task.substatus)
}

export function isAIWorking(status: string, substatus?: string | null): boolean {
  const fullStatus = getFullStatus(status, substatus)
  return statusActor[fullStatus] === "ai"
}

export function isTaskAIWorking(task: TaskFull | null): boolean {
  if (!task) return false
  return isAIWorking(task.status, task.substatus)
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

export function getComplexityLabel(complexity: string | null): string {
  const map: Record<string, string> = {
    S: "Simples",
    M: "Média",
    L: "Complexa",
    XL: "Muito Complexa",
  }
  return complexity ? map[complexity] || complexity : "-"
}

export function getStatusFilterOptions() {
  return [
    { value: "pending", label: "Pendente" },
    { value: "active", label: "Em Andamento" },
    { value: "done", label: "Concluída" },
  ]
}

export function getSubstatusFilterOptions() {
  return [
    { value: "structuring", label: "Estruturando" },
    { value: "executing", label: "Executando" },
    { value: "awaiting_user", label: "Aguardando Ação" },
    { value: "awaiting_review", label: "Aguardando Revisão" },
  ]
}

/** @deprecated Use getFullStatus ou getTaskFullStatus */
export type TaskState = FullStatus

/** @deprecated Use statusLabels */
export const stateLabels = statusLabels

/** @deprecated Use statusColors */
export const stateColors = statusColors

/** @deprecated Use getTaskFullStatus */
export function getTaskState(taskFull: TaskFull | null): FullStatus {
  return getTaskFullStatus(taskFull)
}

/** @deprecated Use getStatusLabel */
export function getStateLabel(state: FullStatus): string {
  return statusLabels[state]
}

/** @deprecated Use getStatusColor */
export function getStateColor(state: FullStatus): string {
  return statusColors[state]
}
