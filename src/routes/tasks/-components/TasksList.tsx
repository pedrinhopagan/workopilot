import { Loader2 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import type { Project, Subtask, Task, TaskExecution, TaskFull } from "../../../types";
import { TasksListItem } from "./TasksListItem";

type PaginationInfo = {
	page: number;
	totalPages: number;
	total: number;
};

type TasksListProps = {
	pendingTasks: Task[];
	doneTasks: Task[];
	taskFullCache: Map<string, TaskFull>;
	activeExecutions: Map<string, TaskExecution>;
	deleteConfirmId: string | null;
	isLoading: boolean;
	projectsList: Project[];
	pagination: PaginationInfo;
	getSubtasks: (taskId: string) => Subtask[];
	onToggleTask: (taskId: string, currentStatus: string) => void;
	onEditTask: (taskId: string) => void;
	onToggleSubtask: (taskId: string, subtaskId: string) => void;
	onDeleteClick: (taskId: string) => void;
	onPageChange: (page: number) => void;
};

export function TasksList({
	pendingTasks,
	doneTasks,
	taskFullCache,
	activeExecutions,
	deleteConfirmId,
	isLoading,
	projectsList,
	pagination,
	getSubtasks,
	onToggleTask,
	onEditTask,
	onToggleSubtask,
	onDeleteClick,
	onPageChange,
}: TasksListProps) {
	const getProjectColor = (projectId: string | null): string | undefined => {
		if (!projectId) return undefined;
		const project = projectsList.find((p) => p.id === projectId);
		return project?.color;
	};
	const hasNoTasks = pendingTasks.length === 0 && doneTasks.length === 0;

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

	if (hasNoTasks) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center text-muted-foreground py-8">
					Nenhuma tarefa encontrada. Adicione uma nova!
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto p-3">
				{pendingTasks.length > 0 && (
					<div className="space-y-1">
						{pendingTasks.map((task) => (
							<TasksListItem
								key={task.id}
								task={task}
								taskFull={taskFullCache.get(task.id) || null}
								execution={activeExecutions.get(task.id)}
								subtasks={getSubtasks(task.id)}
								isDeleteConfirming={deleteConfirmId === task.id}
								projectColor={getProjectColor(task.project_id)}
								onToggle={() => onToggleTask(task.id, task.status)}
								onEdit={() => onEditTask(task.id)}
								onToggleSubtask={(subtaskId) => onToggleSubtask(task.id, subtaskId)}
								onDelete={() => onDeleteClick(task.id)}
							/>
						))}
					</div>
				)}

				{doneTasks.length > 0 && (
					<div className="mt-4">
						<div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
							Concluidas ({doneTasks.length})
						</div>
						<div className="space-y-1 opacity-50">
							{doneTasks.map((task) => (
								<TasksListItem
									key={task.id}
									task={task}
									taskFull={taskFullCache.get(task.id) || null}
									execution={undefined}
									subtasks={[]}
									isDeleteConfirming={deleteConfirmId === task.id}
									projectColor={getProjectColor(task.project_id)}
									isDone
									onToggle={() => onToggleTask(task.id, task.status)}
									onEdit={() => onEditTask(task.id)}
									onToggleSubtask={() => {}}
									onDelete={() => onDeleteClick(task.id)}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			<Pagination
				page={pagination.page}
				totalPages={pagination.totalPages}
				total={pagination.total}
				onPageChange={onPageChange}
			/>
		</div>
	);
}
