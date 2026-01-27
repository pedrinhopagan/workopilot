import { PageHeader } from "@/components/PageHeader";
import { InlineTaskCreate } from "@/components/tasks/InlineTaskCreate";
import { ListTodo } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useGetTaskData } from "../-utils";
import { useGetTaskQuery } from "../-utils/useGetTaskQuery";
import { trpc } from "../../../services/trpc";
import { useSelectedProjectStore } from "../../../stores/selectedProject";
import type { Task, TaskFull } from "../../../types";
import { TasksHeader } from "./TasksHeader";
import { TasksList } from "./TasksList";

export function TasksRoot() {
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const projectsList = useSelectedProjectStore((s) => s.projectsList);

	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const queryState = useGetTaskQuery(selectedProjectId);

	const {
		tasks,
		taskFullCache,
		activeExecutions,
		isLoading,
		refetch,
		getSubtasks,
		pagination,
	} = useGetTaskData({ filters: queryState.filters });

	const { pendingTasks, doneTasks } = useMemo(() => {
		const pending: Task[] = [];
		const done: Task[] = [];
		for (const task of tasks) {
			if (task.status === "done") {
				done.push(task as unknown as Task);
			} else {
				pending.push(task as unknown as Task);
			}
		}
		return { pendingTasks: pending, doneTasks: done };
	}, [tasks]);

	const utils = trpc.useUtils();

	const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	const saveFullMutation = trpc.tasks.saveFull.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	const deleteTaskMutation = trpc.tasks.delete.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	const handleToggleTask = useCallback(
		(taskId: string, currentStatus: string) => {
			const newStatus = currentStatus === "done" ? "pending" : "done";
			updateStatusMutation.mutate(
				{ id: taskId, status: newStatus as "pending" | "done" },
				{ onError: (e) => console.error("Failed to update task:", e) },
			);
		},
		[updateStatusMutation],
	);

	const handleToggleSubtask = useCallback(
		(taskId: string, subtaskId: string) => {
			const taskFull = taskFullCache.get(taskId);
			if (!taskFull) return;

			const newSubtasks = taskFull.subtasks.map((s) => {
				if (s.id === subtaskId) {
					const newStatus = s.status === "done" ? "pending" : "done";
					return {
						...s,
						status: newStatus,
						completed_at:
							newStatus === "done" ? new Date().toISOString() : null,
					};
				}
				return s;
			});

			const updatedTask: TaskFull = {
				...taskFull,
				subtasks: newSubtasks,
				modified_at: new Date().toISOString(),
			};

			if (
				newSubtasks.every((s) => s.status === "done") &&
				newSubtasks.length > 0
			) {
				updatedTask.status = "done";
			}

			saveFullMutation.mutate(updatedTask, {
				onError: (e) => console.error("Failed to toggle subtask:", e),
			});
		},
		[taskFullCache, saveFullMutation],
	);

	const handleDeleteTask = useCallback(
		(taskId: string) => {
			deleteTaskMutation.mutate(
				{ id: taskId },
				{
					onSuccess: () => setDeleteConfirmId(null),
					onError: (e) => console.error("Failed to delete task:", e),
				},
			);
		},
		[deleteTaskMutation],
	);

	const handleDeleteClick = useCallback(
		(taskId: string) => {
			if (deleteConfirmId === taskId) {
				handleDeleteTask(taskId);
			} else {
				setDeleteConfirmId(taskId);
				setTimeout(() => {
					setDeleteConfirmId((prev) => (prev === taskId ? null : prev));
				}, 3000);
			}
		},
		[deleteConfirmId, handleDeleteTask],
	);

	const selectedProject = useMemo(() => {
		return projectsList.find((p) => p.id === selectedProjectId);
	}, [projectsList, selectedProjectId]);

	const subtitle = useMemo(() => {
		const total = pagination.total;
		const pendingCount = pendingTasks.length;
		const doneCount = doneTasks.length;

		if (total === 0) {
			return "Nenhuma tarefa";
		}

		if (selectedProject) {
			return `${total} tarefa${total !== 1 ? "s" : ""} em ${selectedProject.name}`;
		}

		return `${pendingCount} pendente${pendingCount !== 1 ? "s" : ""}, ${doneCount} concluída${doneCount !== 1 ? "s" : ""}`;
	}, [
		pagination.total,
		pendingTasks.length,
		doneTasks.length,
		selectedProject,
	]);

	return (
		<>
			<div className="px-6 pt-6 pb-2 flex justify-between items-center border-b border-border">
				<PageHeader
					title="Tarefas"
					subtitle={subtitle}
					icon={ListTodo}
					accentColor={selectedProject?.color}
					className="mb-3"
				/>

				<InlineTaskCreate projectId={selectedProjectId} onCreated={refetch} />
			</div>

			<TasksHeader queryState={queryState} />

			<TasksList
				pendingTasks={pendingTasks}
				doneTasks={doneTasks}
				taskFullCache={taskFullCache}
				activeExecutions={activeExecutions}
				deleteConfirmId={deleteConfirmId}
				isLoading={isLoading}
				projectsList={projectsList}
				pagination={pagination}
				getSubtasks={getSubtasks}
				onToggleTask={handleToggleTask}
				onToggleSubtask={handleToggleSubtask}
				onDeleteClick={handleDeleteClick}
				onPageChange={queryState.setPage}
			/>
		</>
	);
}
