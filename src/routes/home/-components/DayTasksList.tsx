import { TaskItem } from "@/components/tasks/TaskItem";
import { EmptyFeedback } from "@/components/ui/empty-feedback";
import { cn } from "@/lib/utils";
import type { Task, TaskFull } from "@/types";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { memo, useMemo } from "react";

function formatDateHeader(selectedDate: string): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const selected = new Date(selectedDate);
	selected.setHours(0, 0, 0, 0);

	if (selected.getTime() === today.getTime()) {
		return "Hoje";
	}

	if (selected.getTime() === tomorrow.getTime()) {
		return "Amanha";
	}

	const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
	const dayName = dayNames[selected.getDay()];
	const dayNumber = selected.getDate();

	return `${dayName} ${dayNumber}`;
}

type DayTasksListProps = {
	tasks: TaskFull[];
	selectedDate: string;
	selectedTaskId: string | null;
	onTaskSelect: (taskId: string) => void;
	onStatusChange?: (taskId: string, currentStatus: string) => void;
	className?: string;
};

export const DayTasksList = memo(function DayTasksList({
	tasks,
	selectedDate,
	selectedTaskId,
	onTaskSelect,
	onStatusChange,
	className,
}: DayTasksListProps) {
	const dayTasks = useMemo(() => {
		if (!selectedDate) return [];

		return tasks.filter((task) => {
			if (!task.scheduled_date) return false;

			const taskDate = task.scheduled_date.split("T")[0];
			const selectedDateStr = selectedDate.split("T")[0];

			return taskDate === selectedDateStr;
		});
	}, [tasks, selectedDate]);

	const dateHeader = useMemo(
		() => formatDateHeader(selectedDate),
		[selectedDate],
	);

	return (
		<div className={cn("space-y-3", className)}>
			<Link
				to="/agenda"
				search={() => {
					const [year, month, day] = selectedDate.split("-").map(Number);
					return { year, month, day };
				}}
				className="flex items-center justify-between gap-2 mb-3 group cursor-pointer"
			>
				<div className="flex items-center gap-2">
					<div
						className="relative p-1.5 bg-chart-2/10"
						style={{
							boxShadow: "inset 0 0 0 1px hsl(var(--chart-2) / 0.2)",
						}}
					>
						<CalendarCheck size={14} className="text-chart-2" />
					</div>
					<h3 className="text-sm font-medium text-foreground uppercase tracking-wide transition-colors group-hover:text-primary">
						Tarefas - {dateHeader}
					</h3>
				</div>
				<ChevronRight
					size={14}
					className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
				/>
			</Link>

			{dayTasks.length === 0 ? (
				<EmptyFeedback
					icon={CalendarCheck}
					title="Nenhuma tarefa"
					subtitle={`Nenhuma tarefa agendada para ${dateHeader.toLowerCase()}`}
					className="py-12"
				/>
			) : (
				<div className="relative border border-border bg-card">
					<div
						className="absolute inset-0 pointer-events-none opacity-30"
						style={{
							background:
								"radial-gradient(ellipse at top left, hsl(var(--chart-2) / 0.1) 0%, transparent 60%)",
						}}
					/>
					<div className="relative space-y-0.5 p-1">
						{dayTasks.map((task) => (
							<div
								key={task.id}
								className={cn(
									selectedTaskId === task.id &&
										"ring-1 ring-primary/50 bg-secondary/30",
								)}
							>
								<TaskItem
									task={task as unknown as Task}
									taskFull={task}
									variant="compact"
									isDone={task.status === "done"}
									onToggle={() => onStatusChange?.(task.id, task.status)}
									onClick={() => onTaskSelect(task.id)}
									disableNavigation
								/>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
});
