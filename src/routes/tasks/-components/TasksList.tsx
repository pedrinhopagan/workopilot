import { Pagination } from "@/components/ui/pagination";
import { TaskList } from "@/components/tasks/TaskList";
import type { Project, Subtask, Task, TaskExecution, TaskFull } from "../../../types";

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
	onToggleSubtask,
	onDeleteClick,
	onPageChange,
}: TasksListProps) {
	const allTasks = [...pendingTasks, ...doneTasks];

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto p-3">
				<TaskList
					tasks={allTasks}
					variant="full"
					isLoading={isLoading}
					separateDone
					emptyMessage="Nenhuma tarefa encontrada. Adicione uma nova!"
					taskFullCache={taskFullCache}
					activeExecutions={activeExecutions}
					projectsList={projectsList}
					deleteConfirmId={deleteConfirmId}
					getSubtasks={getSubtasks}
					onToggle={onToggleTask}
					onToggleSubtask={onToggleSubtask}
					onDelete={onDeleteClick}
				/>
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
