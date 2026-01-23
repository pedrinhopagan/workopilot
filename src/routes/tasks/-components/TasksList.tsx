import type { Task, TaskExecution, TaskFull, Subtask } from "../../../types";
import { TasksListItem } from "./TasksListItem";

type TasksListProps = {
	pendingTasks: Task[];
	doneTasks: Task[];
	taskFullCache: Map<string, TaskFull>;
	activeExecutions: Map<string, TaskExecution>;
	deleteConfirmId: string | null;
	isLoading: boolean;
	getSubtasks: (taskId: string) => Subtask[];
	onToggleTask: (taskId: string, currentStatus: string) => void;
	onEditTask: (taskId: string) => void;
	onCodarTask: (task: Task) => void;
	onCodarSubtask: (task: Task, subtaskId: string) => void;
	onToggleSubtask: (taskId: string, subtaskId: string) => void;
	onReviewTask: (task: Task) => void;
	onDeleteClick: (taskId: string) => void;
};

export function TasksList({
	pendingTasks,
	doneTasks,
	taskFullCache,
	activeExecutions,
	deleteConfirmId,
	isLoading,
	getSubtasks,
	onToggleTask,
	onEditTask,
	onCodarTask,
	onCodarSubtask,
	onToggleSubtask,
	onReviewTask,
	onDeleteClick,
}: TasksListProps) {
	const hasNoTasks = pendingTasks.length === 0 && doneTasks.length === 0;

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="flex items-center gap-2 text-[#636363]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="animate-spin"
						aria-hidden="true"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
					<span className="text-sm">Carregando tarefas...</span>
				</div>
			</div>
		);
	}

	if (hasNoTasks) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center text-[#636363] py-8">
					Nenhuma tarefa encontrada. Adicione uma nova!
				</div>
			</div>
		);
	}

	return (
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
							onToggle={() => onToggleTask(task.id, task.status)}
							onEdit={() => onEditTask(task.id)}
							onCodar={() => onCodarTask(task)}
							onCodarSubtask={(subtaskId) => onCodarSubtask(task, subtaskId)}
							onToggleSubtask={(subtaskId) => onToggleSubtask(task.id, subtaskId)}
							onReview={() => onReviewTask(task)}
							onDelete={() => onDeleteClick(task.id)}
						/>
					))}
				</div>
			)}

			{doneTasks.length > 0 && (
				<div className="mt-4">
					<div className="text-xs text-[#636363] uppercase tracking-wide mb-2">
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
								isDone
								onToggle={() => onToggleTask(task.id, task.status)}
								onEdit={() => onEditTask(task.id)}
								onCodar={() => onCodarTask(task)}
								onCodarSubtask={() => {}}
								onToggleSubtask={() => {}}
								onReview={() => {}}
								onDelete={() => onDeleteClick(task.id)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
