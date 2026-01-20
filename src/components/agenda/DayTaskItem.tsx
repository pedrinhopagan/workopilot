import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "@tanstack/react-router";
import type { Task } from "../../types";
import { useAgendaStore } from "../../stores/agenda";

const priorityColors: Record<number, string> = {
  1: "#bc5653",
  2: "#ebc17a",
  3: "#909d63",
};

type DayTaskItemProps = {
  task: Task;
  onStatusChange: () => void;
};

export function DayTaskItem({ task, onStatusChange }: DayTaskItemProps) {
  const navigate = useNavigate();
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const setDrawerCollapsed = useAgendaStore((s) => s.setDrawerCollapsed);
  const [isDragging, setIsDragging] = useState(false);

  const priorityColor = priorityColors[task.priority] ?? "#909d63";
  const isDone = task.status === "done";

  async function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = isDone ? "pending" : "done";
    await invoke("update_task_status", { taskId: task.id, status: newStatus }).catch((e) =>
      console.error("Failed to update task status:", e)
    );
    onStatusChange();
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
      className={`flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] cursor-grab transition-all group ${isDragging || isDone ? "opacity-50" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <button onClick={toggleStatus} className="text-[#636363] hover:text-[#909d63] transition-colors">
        {isDone ? "[x]" : "[ ]"}
      </button>

      <span className={`flex-1 text-sm text-[#d6d6d6] truncate ${isDone ? "line-through" : ""}`}>
        {task.title}
      </span>

      <span className="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
      <span style={{ color: priorityColor }} className="text-xs font-medium">
        P{task.priority}
      </span>
    </div>
  );
}
