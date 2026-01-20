import { writable } from "svelte/store";

export interface StructuringNotification {
  taskId: string;
  taskTitle: string;
  projectId: string;
  subtaskCount: number;
}

export const structuringNotification = writable<StructuringNotification | null>(null);

const alreadyNotifiedTaskIds = new Set<string>();

export function showStructuringNotification(notification: StructuringNotification) {
  if (alreadyNotifiedTaskIds.has(notification.taskId)) {
    return;
  }
  alreadyNotifiedTaskIds.add(notification.taskId);
  structuringNotification.set(notification);
}

export function dismissStructuringNotification() {
  structuringNotification.set(null);
}

export function clearNotifiedTask(taskId: string) {
  alreadyNotifiedTaskIds.delete(taskId);
}
