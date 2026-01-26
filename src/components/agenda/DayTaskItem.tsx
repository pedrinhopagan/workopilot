import { useState } from "react";
import { trpc } from "../../services/trpc";
import type { Task, TaskFull } from "../../types";
import { useAgendaStore } from "../../stores/agenda";
import { TaskItem } from "../tasks/TaskItem";

type DayTaskItemProps = {
  task: Task;
  taskFull?: TaskFull | null;
  onStatusChange: () => void;
};

export function DayTaskItem({ task, taskFull = null, onStatusChange }: DayTaskItemProps) {
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const setDrawerCollapsed = useAgendaStore((s) => s.setDrawerCollapsed);
  const [isDragging, setIsDragging] = useState(false);

  const isDone = task.status === "done";

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => onStatusChange(),
  });

  function toggleStatus() {
    const newStatus = isDone ? "pending" : "done";
    updateStatusMutation.mutate(
      { id: task.id, status: newStatus as "pending" | "done" },
      { onError: (e) => console.error("Failed to update task status:", e) },
    );
  }

  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true);
    setDrawerCollapsed(true);
    setDraggedTask({ id: task.id, title: task.title, fromDate: task.scheduled_date });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
    }
  }

  function handleDragEnd() {
    setIsDragging(false);
    setDrawerCollapsed(false);
    setDraggedTask(null);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop wrapper
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-grab ${isDragging ? "opacity-50 cursor-grabbing" : ""}`}
    >
      <TaskItem
        task={task}
        taskFull={taskFull}
        variant="compact"
        isDone={isDone}
        onToggle={toggleStatus}
        disableNavigation={false}
      />
    </div>
  );
}
