import { safeInvoke } from "./tauri";
import { useStructuringNotificationStore } from "../stores/structuringNotification";
import type { TaskFull, Task, ProjectWithConfig } from "../types";

type TrackedTask = {
  taskId: string;
  projectId: string;
  wasStructuringComplete: boolean;
};

const trackedTasks = new Map<string, TrackedTask>();

async function getTaskStructuringState(taskId: string): Promise<{ structuringComplete: boolean; title: string; subtaskCount: number } | null> {
  try {
    const task: Task = await safeInvoke("get_task_by_id", { taskId });
    if (!task?.project_id) return null;

    const project: ProjectWithConfig = await safeInvoke("get_project_with_config", { projectId: task.project_id });
    const taskFull: TaskFull = await safeInvoke("get_task_full", { projectPath: project.path, taskId });

    return {
      structuringComplete: taskFull.ai_metadata.structuring_complete,
      title: taskFull.title,
      subtaskCount: taskFull.subtasks.length,
    };
  } catch {
    return null;
  }
}

export async function trackTask(taskId: string, projectId: string): Promise<void> {
  const state = await getTaskStructuringState(taskId);
  if (!state) return;

  trackedTasks.set(taskId, {
    taskId,
    projectId,
    wasStructuringComplete: state.structuringComplete,
  });
}

export function untrackTask(taskId: string): void {
  trackedTasks.delete(taskId);
  useStructuringNotificationStore.getState().clearNotifiedTask(taskId);
}

export async function checkForStructuringChanges(): Promise<void> {
  for (const [taskId, tracked] of trackedTasks) {
    const currentState = await getTaskStructuringState(taskId);
    if (!currentState) continue;

    const structuringJustCompleted = !tracked.wasStructuringComplete && currentState.structuringComplete;

    if (structuringJustCompleted) {
      console.log("[StructuringMonitor] Task structuring completed:", taskId);

      useStructuringNotificationStore.getState().showNotification({
        taskId,
        taskTitle: currentState.title,
        projectId: tracked.projectId,
        subtaskCount: currentState.subtaskCount,
      });

      tracked.wasStructuringComplete = true;
    }
  }
}

export async function checkAllInProgressTasks(): Promise<void> {
  try {
    const tasks: Task[] = await safeInvoke("get_all_tasks");
    const inProgressTasks = tasks.filter((t) => 
      t.status === "structuring" || 
      t.status === "working" || 
      t.status === "pending" ||
      t.status === "structured" ||
      t.status === "standby"
    );

    for (const task of inProgressTasks) {
      if (!task.project_id) continue;

      if (!trackedTasks.has(task.id)) {
        await trackTask(task.id, task.project_id);
      }
    }

    await checkForStructuringChanges();
  } catch (error) {
    console.error("[StructuringMonitor] Failed to check tasks:", error);
  }
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export function startPolling(intervalMs = 3000): void {
  if (pollingInterval) return;

  checkAllInProgressTasks();

  pollingInterval = setInterval(() => {
    checkForStructuringChanges();
  }, intervalMs);
}

export function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

export function isPolling(): boolean {
  return pollingInterval !== null;
}
