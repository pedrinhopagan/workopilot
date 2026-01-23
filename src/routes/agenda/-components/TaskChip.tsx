import type { CalendarTask } from "../../../types";

const priorityColors: Record<number, string> = {
  1: "hsl(var(--destructive))",
  2: "hsl(var(--accent))",
  3: "hsl(var(--primary))",
};

type TaskChipProps = {
  task: CalendarTask;
  compact?: boolean;
};

export function TaskChip({ task, compact = false }: TaskChipProps) {
  const priorityColor = priorityColors[task.priority] ?? "hsl(var(--primary))";
  const projectColor = "hsl(var(--primary))";

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 bg-popover text-xs rounded-sm cursor-pointer hover:bg-secondary transition-colors"
      style={{
        borderLeftColor: task.is_overdue ? "hsl(var(--destructive))" : projectColor,
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        border: task.is_overdue ? "1px solid hsl(var(--destructive))" : undefined,
      }}
    >
      {!compact && (
        <span className="text-foreground truncate max-w-[60px]">{task.project_name}</span>
      )}
      <span style={{ color: priorityColor }} className="font-medium">
        P{task.priority}
      </span>
      {task.subtask_count > 0 && (
        <span className="text-[10px] text-muted-foreground">+{task.subtask_count} subtasks</span>
      )}
    </div>
  );
}
