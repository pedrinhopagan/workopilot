import { create } from "zustand";

type StructuringNotification = {
  taskId: string;
  taskTitle: string;
  projectId: string;
  subtaskCount: number;
};

type StructuringNotificationState = {
  notification: StructuringNotification | null;
  notifiedTaskIds: Set<string>;
};

type StructuringNotificationActions = {
  showNotification: (notification: StructuringNotification) => void;
  dismissNotification: () => void;
  clearNotifiedTask: (taskId: string) => void;
};

type StructuringNotificationStore = StructuringNotificationState & StructuringNotificationActions;

export const useStructuringNotificationStore = create<StructuringNotificationStore>((set, get) => ({
  notification: null,
  notifiedTaskIds: new Set(),
  showNotification: (notification) => {
    if (get().notifiedTaskIds.has(notification.taskId)) return;
    set({
      notification,
      notifiedTaskIds: new Set([...get().notifiedTaskIds, notification.taskId]),
    });
  },
  dismissNotification: () => set({ notification: null }),
  clearNotifiedTask: (taskId) => {
    const newSet = new Set(get().notifiedTaskIds);
    newSet.delete(taskId);
    set({ notifiedTaskIds: newSet });
  },
}));

export type { StructuringNotification };
