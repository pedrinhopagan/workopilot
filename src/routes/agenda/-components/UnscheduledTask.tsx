import { useState } from "react";
import type { Task } from "../../../types";
import { useAgendaStore } from "../../../stores/agenda";
import { TaskItem } from "../../../components/tasks/TaskItem";

function formatDueDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type UnscheduledTaskProps = {
  task: Task;
};

export function UnscheduledTask({ task }: UnscheduledTaskProps) {
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const isDistributionMode = useAgendaStore((s) => s.isDistributionMode);
  const selectedTaskIds = useAgendaStore((s) => s.selectedTaskIds);
  const toggleTaskSelection = useAgendaStore((s) => s.toggleTaskSelection);
  const [isDragging, setIsDragging] = useState(false);

  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;
  const isSelected = selectedTaskIds.has(task.id);

  function handleDragStart(e: React.DragEvent) {
    if (isDistributionMode) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    setDraggedTask({ id: task.id, title: task.title, fromDate: null });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
    }
  }

  function handleDragEnd() {
    setIsDragging(false);
    setDraggedTask(null);
  }

  function handleDistributionClick() {
    toggleTaskSelection(task.id);
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    toggleTaskSelection(task.id);
  }

  const borderColor = isOverdue ? "hsl(var(--destructive))" : "hsl(var(--primary))";

  if (isDistributionMode) {
    return (
      <button
        type="button"
        className={`flex items-center gap-2 transition-colors w-full text-left ${
          isSelected ? "ring-1 ring-primary bg-popover" : ""
        } cursor-pointer`}
        onClick={handleDistributionClick}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="w-4 h-4 accent-primary cursor-pointer ml-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0">
          <TaskItem
            task={task}
            taskFull={null}
            variant="compact"
            isDone={false}
            onToggle={handleDistributionClick}
            projectColor={borderColor}
            disableNavigation
          />
        </div>
        {task.due_date && (
          <span className={`text-xs shrink-0 pr-2 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {formatDueDate(task.due_date)}
          </span>
        )}
      </button>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop wrapper
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-grab ${isDragging ? "opacity-50 cursor-grabbing" : ""}`}
    >
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <TaskItem
            task={task}
            taskFull={null}
            variant="compact"
            isDone={false}
            onToggle={() => {}}
            projectColor={borderColor}
            disableNavigation={false}
          />
        </div>
        {task.due_date && (
          <span className={`text-xs shrink-0 pr-2 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {formatDueDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}
