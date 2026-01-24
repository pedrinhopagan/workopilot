import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "../../services/trpc";
import type { Task, TaskFull } from "../../types";
import { useAgendaStore } from "../../stores/agenda";
import { 
  getTaskProgressStateContainerClass,
  getTaskProgressStateIndicator,
} from "../../lib/constants/taskStatus";
import { Loader2 } from "lucide-react";

const priorityColors: Record<number, string> = {
  1: "hsl(var(--destructive))",
  2: "hsl(var(--accent))",
  3: "hsl(var(--primary))",
};

type DayTaskItemProps = {
  task: Task;
  taskFull?: TaskFull | null;
  onStatusChange: () => void;
};

export function DayTaskItem({ task, taskFull = null, onStatusChange }: DayTaskItemProps) {
  const navigate = useNavigate();
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const setDrawerCollapsed = useAgendaStore((s) => s.setDrawerCollapsed);
  const [isDragging, setIsDragging] = useState(false);

  const priorityColor = priorityColors[task.priority] ?? "hsl(var(--primary))";
  const isDone = task.status === "done";
  
  const containerClass = getTaskProgressStateContainerClass(taskFull);
  const indicator = getTaskProgressStateIndicator(taskFull);
  const showSpinner = indicator === "spinner";

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => onStatusChange(),
  });

  async function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = isDone ? "pending" : "done";
    try {
      await updateStatusMutation.mutateAsync({ id: task.id, status: newStatus });
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
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

  function handleClick() {
    navigate({ to: "/tasks/$taskId", params: { taskId: task.id } });
  }

  return (
    <div
      draggable="true"
      role="button"
      tabIndex={0}
      className={`flex items-center gap-3 px-3 py-2 cursor-grab transition-all group ${containerClass} ${isDragging || isDone ? "opacity-50" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {showSpinner ? (
        <Loader2 size={14} className="text-chart-4 animate-spin shrink-0" aria-label="IA trabalhando" />
      ) : (
        <button type="button" onClick={toggleStatus} className="text-muted-foreground hover:text-primary transition-colors">
          {isDone ? "[x]" : "[ ]"}
        </button>
      )}

      <span className={`flex-1 text-sm text-foreground truncate ${isDone ? "line-through" : ""}`}>
        {task.title}
      </span>

      <span className="px-2 py-0.5 text-xs text-primary-foreground bg-primary/70">{task.category}</span>
      <span style={{ color: priorityColor }} className="text-xs font-medium">
        P{task.priority}
      </span>
    </div>
  );
}
