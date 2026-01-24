import { useState } from "react";
import { TaskChip } from "./TaskChip";
import { useAgendaStore } from "../../../stores/agenda";

export type CalendarTaskItem = {
  id: string;
  title: string;
  project_id: string | null;
  priority: number;
  category: string;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
};

type CalendarDayProps = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: CalendarTaskItem[];
  onDrop: (taskId: string, date: string) => void;
};

export function CalendarDay({ date, dayNumber, isCurrentMonth, isToday, tasks, onDrop }: CalendarDayProps) {
  const selectedDate = useAgendaStore((s) => s.selectedDate);
  const setSelectedDate = useAgendaStore((s) => s.setSelectedDate);
  const draggedTask = useAgendaStore((s) => s.draggedTask);
  const isDistributionMode = useAgendaStore((s) => s.isDistributionMode);
  const selectedDates = useAgendaStore((s) => s.selectedDates);
  const toggleDateSelection = useAgendaStore((s) => s.toggleDateSelection);
  const [isDragOver, setIsDragOver] = useState(false);

  const isSelected = selectedDate === date;
  const isDateSelectedForDistribution = selectedDates.has(date);
  const today = new Date().toISOString().split("T")[0];
  const hasOverdue = tasks.some((t) => t.due_date && t.due_date < today && t.status !== "done");
  const visibleTasks = tasks.slice(0, 3);
  const overflowCount = Math.max(0, tasks.length - 3);

  function handleClick() {
    if (!isCurrentMonth) return;
    
    if (isDistributionMode) {
      toggleDateSelection(date);
      return;
    }
    
    setSelectedDate(date);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (draggedTask && isCurrentMonth && !isDistributionMode) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedTask && isCurrentMonth && !isDistributionMode) {
      onDrop(draggedTask.id, date);
    }
  }

  function getBackgroundClass() {
    if (isDistributionMode && isDateSelectedForDistribution) return "bg-primary/30";
    if (isSelected && !isDistributionMode) return "bg-primary";
    if (isDragOver) return "bg-popover";
    if (!isCurrentMonth) return "bg-background";
    return "bg-card";
  }

  function getTextClass() {
    if (isSelected && !isDistributionMode) return "text-primary-foreground";
    if (!isCurrentMonth) return "text-muted-foreground";
    return "text-foreground";
  }

  function getBorderClass() {
    if (isDistributionMode && isDateSelectedForDistribution) {
      return "border-primary border-2";
    }
    if (isToday && !isSelected) {
      return "border-primary border-2";
    }
    if (isDragOver) {
      return "border-dashed";
    }
    return "";
  }

  return (
    <button
      type="button"
      className={`flex flex-col p-1 min-h-[80px] border border-border transition-all text-left ${getBackgroundClass()} ${!isCurrentMonth ? "opacity-50" : ""} ${getBorderClass()}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <span className={`text-sm font-medium ${getTextClass()}`}>{dayNumber}</span>
        <div className="flex items-center gap-1">
          {isDistributionMode && isDateSelectedForDistribution && (
            <span className="text-primary text-xs">✓</span>
          )}
          {hasOverdue && <span className="text-destructive text-xs">⚠</span>}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
        {visibleTasks.map((task) => (
          <TaskChip key={task.id} task={task} compact={tasks.length > 2} />
        ))}
        {overflowCount > 0 && <span className="text-[10px] text-muted-foreground">+{overflowCount}</span>}
      </div>
    </button>
  );
}
