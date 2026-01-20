import { useState } from "react";
import type { CalendarTask } from "../../types";
import { TaskChip } from "./TaskChip";
import { useAgendaStore } from "../../stores/agenda";

type CalendarDayProps = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: CalendarTask[];
  onDrop: (taskId: string, date: string) => void;
};

export function CalendarDay({ date, dayNumber, isCurrentMonth, isToday, tasks, onDrop }: CalendarDayProps) {
  const selectedDate = useAgendaStore((s) => s.selectedDate);
  const setSelectedDate = useAgendaStore((s) => s.setSelectedDate);
  const draggedTask = useAgendaStore((s) => s.draggedTask);
  const [isDragOver, setIsDragOver] = useState(false);

  const isSelected = selectedDate === date;
  const hasOverdue = tasks.some((t) => t.is_overdue);
  const visibleTasks = tasks.slice(0, 3);
  const overflowCount = Math.max(0, tasks.length - 3);

  function handleClick() {
    if (isCurrentMonth) {
      setSelectedDate(date);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (draggedTask && isCurrentMonth) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedTask && isCurrentMonth) {
      onDrop(draggedTask.id, date);
    }
  }

  function getBackgroundClass() {
    if (isSelected) return "bg-[#909d63]";
    if (isDragOver) return "bg-[#2a2a2a]";
    if (!isCurrentMonth) return "bg-[#1c1c1c]";
    return "bg-[#232323]";
  }

  function getTextClass() {
    if (isSelected) return "text-[#1c1c1c]";
    if (!isCurrentMonth) return "text-[#636363]";
    return "text-[#d6d6d6]";
  }

  return (
    <button
      type="button"
      className={`flex flex-col p-1 min-h-[80px] border border-[#3d3a34] transition-all text-left ${getBackgroundClass()} ${!isCurrentMonth ? "opacity-50" : ""} ${isToday && !isSelected ? "border-[#909d63] border-2" : ""} ${isDragOver ? "border-dashed" : ""}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <span className={`text-sm font-medium ${getTextClass()}`}>{dayNumber}</span>
        {hasOverdue && <span className="text-[#bc5653] text-xs">⚠</span>}
      </div>

      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
        {visibleTasks.map((task) => (
          <TaskChip key={task.id} task={task} compact={tasks.length > 2} />
        ))}
        {overflowCount > 0 && <span className="text-[10px] text-[#828282]">+{overflowCount}</span>}
      </div>
    </button>
  );
}
