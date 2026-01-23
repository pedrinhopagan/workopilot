import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Task } from "../../types";
import { useAgendaStore } from "../../stores/agenda";

const priorityColors: Record<number, string> = {
  1: "#bc5653",
  2: "#ebc17a",
  3: "#909d63",
};

type UnscheduledTaskProps = {
  task: Task;
};

function formatDueDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function UnscheduledTask({ task }: UnscheduledTaskProps) {
  const navigate = useNavigate();
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const isDistributionMode = useAgendaStore((s) => s.isDistributionMode);
  const selectedTaskIds = useAgendaStore((s) => s.selectedTaskIds);
  const toggleTaskSelection = useAgendaStore((s) => s.toggleTaskSelection);
  const [isDragging, setIsDragging] = useState(false);

  const priorityColor = priorityColors[task.priority] ?? "#909d63";
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

  function handleClick() {
    if (isDistributionMode) {
      toggleTaskSelection(task.id);
      return;
    }
    navigate({ to: "/tasks/$taskId", params: { taskId: task.id } });
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    toggleTaskSelection(task.id);
  }

  return (
    <div
      draggable={!isDistributionMode}
      role="button"
      tabIndex={0}
      className={`flex items-center gap-2 px-2 py-1.5 bg-[#232323] transition-all hover:bg-[#2a2a2a] ${
        isDragging ? "opacity-50 cursor-grabbing" : isDistributionMode ? "cursor-pointer" : "cursor-grab"
      } ${isSelected ? "ring-1 ring-[#909d63] bg-[#2a2a2a]" : ""}`}
      style={{
        borderLeftColor: isOverdue ? "#bc5653" : "#909d63",
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {isDistributionMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="w-4 h-4 accent-[#909d63] cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <span className="flex-1 text-sm text-[#d6d6d6] truncate">{task.title}</span>
      {task.due_date && (
        <span className={`text-xs ${isOverdue ? "text-[#bc5653]" : "text-[#636363]"}`}>
          {formatDueDate(task.due_date)}
        </span>
      )}
      <span style={{ color: priorityColor }} className="text-xs font-medium">
        P{task.priority}
      </span>
    </div>
  );
}
