import type { CalendarTaskItem } from "./CalendarDay";

const priorityColors: Record<number, string> = {
  1: "hsl(var(--destructive))",
  2: "hsl(var(--accent))",
  3: "hsl(var(--primary))",
};

type TaskChipProps = {
  task: CalendarTaskItem;
  compact?: boolean;
};

export function TaskChip({ task, compact = false }: TaskChipProps) {
  const priorityColor = priorityColors[task.priority] ?? "hsl(var(--primary))";
  const projectColor = "hsl(var(--primary))";
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done";

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 bg-popover text-xs rounded-sm cursor-pointer hover:bg-secondary transition-colors"
      style={{
        borderLeftColor: isOverdue ? "hsl(var(--destructive))" : projectColor,
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        border: isOverdue ? "1px solid hsl(var(--destructive))" : undefined,
      }}
    >
      {!compact && (
        <span className="text-foreground truncate max-w-[60px]">{task.title.slice(0, 10)}</span>
      )}
      <span style={{ color: priorityColor }} className="font-medium">
        P{task.priority}
      </span>
    </div>
  );
}
