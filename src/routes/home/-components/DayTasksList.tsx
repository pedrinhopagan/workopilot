import { CalendarCheck, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";
import { EmptyFeedback } from "@/components/ui/empty-feedback";
import {
	deriveProgressState,
	getProgressStateColor,
	getProgressStateIndicator,
} from "@/lib/constants/taskStatus";
import type { TaskFull } from "@/types";

type DayTaskItemProps = {
	task: TaskFull;
	isSelected: boolean;
	onClick: () => void;
};

const DayTaskItem = memo(function DayTaskItem({
	task,
	isSelected,
	onClick,
}: DayTaskItemProps) {
	const progressState = deriveProgressState(task);
	const stateColor = getProgressStateColor(progressState);
	const indicator = getProgressStateIndicator(progressState);

	const StatusIndicator = useMemo(() => {
		switch (indicator) {
			case "spinner":
				return (
					<div className="relative">
						<Loader2
							size={14}
							className="animate-spin"
							style={{ color: stateColor }}
						/>
						<div
							className="absolute inset-0 animate-ping opacity-30"
							style={{ color: stateColor }}
						>
							<Loader2 size={14} />
						</div>
					</div>
				);
			case "check":
				return <CheckCircle2 size={14} style={{ color: stateColor }} />;
			case "dot":
				return (
					<Circle
						size={14}
						className="fill-current"
						style={{ color: stateColor }}
					/>
				);
			default:
				return (
					<Circle
						size={14}
						className="text-muted-foreground/50"
					/>
				);
		}
	}, [indicator, stateColor]);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative w-full flex items-center gap-3 px-3 py-2.5",
				"text-left transition-colors duration-200",
				"hover:bg-secondary/50",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isSelected && "bg-secondary/70"
			)}
		>
			{isSelected && (
				<div
					className="absolute left-0 top-0 bottom-0 w-[2px]"
					style={{
						background: `linear-gradient(180deg, ${stateColor} 0%, ${stateColor}60 100%)`,
					}}
				/>
			)}

			<div className="flex-shrink-0">{StatusIndicator}</div>

			<span
				className={cn(
					"flex-1 text-sm truncate transition-colors duration-200",
					progressState === "done"
						? "text-muted-foreground line-through"
						: "text-foreground group-hover:text-primary"
				)}
			>
				{task.title}
			</span>
		</button>
	);
});

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
	className?: string;
};

export const DayTasksList = memo(function DayTasksList({
	tasks,
	selectedDate,
	selectedTaskId,
	onTaskSelect,
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
		[selectedDate]
	);

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center gap-2 mb-3">
				<div
					className="relative p-1.5 bg-chart-2/10"
					style={{
						boxShadow: "inset 0 0 0 1px hsl(var(--chart-2) / 0.2)",
					}}
				>
					<CalendarCheck size={14} className="text-chart-2" />
				</div>
				<h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
					Tarefas - {dateHeader}
				</h3>
			</div>

			{dayTasks.length === 0 ? (
				<EmptyFeedback
					icon={CalendarCheck}
					title="Nenhuma tarefa"
					subtitle={`Nenhuma tarefa agendada para ${dateHeader.toLowerCase()}`}
					className="py-6"
				/>
			) : (
				<div className="relative border border-border bg-card divide-y divide-border/30">
					<div
						className="absolute inset-0 pointer-events-none opacity-30"
						style={{
							background: "radial-gradient(ellipse at top left, hsl(var(--chart-2) / 0.1) 0%, transparent 60%)",
						}}
					/>
					{dayTasks.map((task) => (
						<DayTaskItem
							key={task.id}
							task={task}
							isSelected={selectedTaskId === task.id}
							onClick={() => onTaskSelect(task.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
});
