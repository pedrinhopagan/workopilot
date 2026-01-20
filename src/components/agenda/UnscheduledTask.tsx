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
  const [isDragging, setIsDragging] = useState(false);

  const priorityColor = priorityColors[task.priority] ?? "#909d63";
  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;

  function handleDragStart(e: React.DragEvent) {
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
    navigate({ to: "/tasks/$taskId", params: { taskId: task.id } });
  }

  return (
    <div
      draggable="true"
      role="button"
      tabIndex={0}
      className={`flex items-center gap-2 px-2 py-1.5 bg-[#232323] cursor-grab transition-all hover:bg-[#2a2a2a] ${isDragging ? "opacity-50 cursor-grabbing" : ""}`}
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
