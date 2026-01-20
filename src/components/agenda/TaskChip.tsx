import type { CalendarTask } from "../../types";

const priorityColors: Record<number, string> = {
  1: "#bc5653",
  2: "#ebc17a",
  3: "#909d63",
};

type TaskChipProps = {
  task: CalendarTask;
  compact?: boolean;
};

export function TaskChip({ task, compact = false }: TaskChipProps) {
  const priorityColor = priorityColors[task.priority] ?? "#909d63";
  const projectColor = "#909d63";

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2a2a2a] text-xs rounded-sm cursor-pointer hover:bg-[#333] transition-colors"
      style={{
        borderLeftColor: task.is_overdue ? "#bc5653" : projectColor,
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        border: task.is_overdue ? "1px solid #bc5653" : undefined,
      }}
    >
      {!compact && (
        <span className="text-[#d6d6d6] truncate max-w-[60px]">{task.project_name}</span>
      )}
      <span style={{ color: priorityColor }} className="font-medium">
        P{task.priority}
      </span>
      {task.subtask_count > 0 && (
        <span className="text-[10px] text-[#636363]">+{task.subtask_count} subtasks</span>
      )}
    </div>
  );
}
