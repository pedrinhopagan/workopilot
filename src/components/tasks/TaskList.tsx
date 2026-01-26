import { Loader2 } from "lucide-react";
import type { Project, Subtask, Task, TaskExecution, TaskFull } from "@/types";
import { TaskItem, type TaskItemVariant } from "./TaskItem";
import { memo } from "react";

type TaskListProps = {
	tasks: Task[];
	variant?: TaskItemVariant;
	emptyMessage?: string;
	isLoading?: boolean;
	separateDone?: boolean;
	taskFullCache?: Map<string, TaskFull>;
	activeExecutions?: Map<string, TaskExecution>;
	projectsList?: Project[];
	deleteConfirmId?: string | null;
	getSubtasks?: (taskId: string) => Subtask[];
	onToggle?: (taskId: string, currentStatus: string) => void;
	onToggleSubtask?: (taskId: string, subtaskId: string) => void;
	onDelete?: (taskId: string) => void;
	onClick?: (taskId: string) => void;
	disableNavigation?: boolean;
};

export const TaskList = memo(function TaskList({
	tasks,
	variant = "full",
	emptyMessage = "Nenhuma tarefa encontrada.",
	isLoading = false,
	separateDone = false,
	taskFullCache,
	activeExecutions,
	projectsList,
	deleteConfirmId,
	getSubtasks,
	onToggle,
	onToggleSubtask,
	onDelete,
	onClick,
	disableNavigation,
}: TaskListProps) {
	const getProjectColor = (projectId: string | null): string | undefined => {
		if (!projectId || !projectsList) return undefined;
		const project = projectsList.find((p) => p.id === projectId);
		return project?.color;
	};

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Loader2 size={16} className="animate-spin" aria-hidden="true" />
					<span className="text-sm">Carregando tarefas...</span>
				</div>
			</div>
		);
	}

	if (tasks.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center text-muted-foreground py-8">
					{emptyMessage}
				</div>
			</div>
		);
	}

	const spacing = variant === "full" ? "space-y-1" : "space-y-0.5";

	if (separateDone) {
		const pendingTasks = tasks.filter((t) => t.status !== "done");
		const doneTasks = tasks.filter((t) => t.status === "done");

		return (
			<div className="flex flex-col">
				{pendingTasks.length > 0 && (
					<div className={spacing}>
						{pendingTasks.map((task) => (
							<TaskItem
								key={task.id}
								task={task}
								taskFull={taskFullCache?.get(task.id) ?? null}
								variant={variant}
								execution={activeExecutions?.get(task.id)}
								subtasks={getSubtasks?.(task.id) ?? []}
								projectColor={getProjectColor(task.project_id)}
								isDeleteConfirming={deleteConfirmId === task.id}
								onToggle={() => onToggle?.(task.id, task.status)}
								onToggleSubtask={
									onToggleSubtask
										? (subtaskId) => onToggleSubtask(task.id, subtaskId)
										: undefined
								}
								onDelete={onDelete ? () => onDelete(task.id) : undefined}
								onClick={onClick ? () => onClick(task.id) : undefined}
								disableNavigation={disableNavigation}
							/>
						))}
					</div>
				)}

				{doneTasks.length > 0 && (
					<div className="mt-4">
						<div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
							Concluidas ({doneTasks.length})
						</div>
						<div className={`${spacing} opacity-50`}>
							{doneTasks.map((task) => (
								<TaskItem
									key={task.id}
									task={task}
									taskFull={taskFullCache?.get(task.id) ?? null}
									variant={variant}
									execution={undefined}
									subtasks={[]}
									projectColor={getProjectColor(task.project_id)}
									isDeleteConfirming={deleteConfirmId === task.id}
									isDone
									onToggle={() => onToggle?.(task.id, task.status)}
									onDelete={onDelete ? () => onDelete(task.id) : undefined}
									onClick={onClick ? () => onClick(task.id) : undefined}
									disableNavigation={disableNavigation}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={spacing}>
			{tasks.map((task) => {
				const isDone = task.status === "done";
				return (
					<TaskItem
						key={task.id}
						task={task}
						taskFull={taskFullCache?.get(task.id) ?? null}
						variant={variant}
						execution={isDone ? undefined : activeExecutions?.get(task.id)}
						subtasks={isDone ? [] : (getSubtasks?.(task.id) ?? [])}
						projectColor={getProjectColor(task.project_id)}
						isDeleteConfirming={deleteConfirmId === task.id}
						isDone={isDone}
						onToggle={() => onToggle?.(task.id, task.status)}
						onToggleSubtask={
							!isDone && onToggleSubtask
								? (subtaskId) => onToggleSubtask(task.id, subtaskId)
								: undefined
						}
						onDelete={onDelete ? () => onDelete(task.id) : undefined}
						onClick={onClick ? () => onClick(task.id) : undefined}
						disableNavigation={disableNavigation}
					/>
				);
			})}
		</div>
	);
});
