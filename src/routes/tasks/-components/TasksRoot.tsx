import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { safeInvoke } from "../../../services/tauri";
import { useSelectedProjectStore } from "../../../stores/selectedProject";
import { useGetTaskData, useProjectPath } from "../-utils";
import { useGetTaskQuery } from "../-utils/useGetTaskQuery";
import type { ProjectWithConfig, Task, TaskFull } from "../../../types";
import { TasksHeader } from "./TasksHeader";
import { TasksNewTask } from "./TasksNewTask";
import { TasksList } from "./TasksList";

export function TasksRoot() {
	const navigate = useNavigate();
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	
	const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const queryState = useGetTaskQuery(selectedProjectId);
	const { data: projectPath } = useProjectPath(selectedProjectId);
	
	const {
		tasks,
		taskFullCache,
		activeExecutions,
		isLoading,
		refetch,
		getSubtasks,
		pendingTasks,
		doneTasks,
	} = useGetTaskData({ filters: queryState.filters });

	const handleToggleTask = useCallback(async (taskId: string, currentStatus: string) => {
		const newStatus = currentStatus === "done" ? "pending" : "done";
		await safeInvoke("update_task_status", { taskId, status: newStatus }).catch(
			(e) => console.error("Failed to update task:", e),
		);
		refetch();
	}, [refetch]);

	const handleEditTask = useCallback((taskId: string) => {
		navigate({ to: "/tasks/$taskId", params: { taskId } });
	}, [navigate]);

	const handleCodarTask = useCallback(async (task: Task) => {
		if (!task.project_id) return;
		await safeInvoke("launch_task_workflow", {
			projectId: task.project_id,
			taskId: task.id,
			subtaskId: null,
		}).catch((e) => console.error("Failed to launch task workflow:", e));
	}, []);

	const handleCodarSubtask = useCallback(async (task: Task, subtaskId: string) => {
		if (!task.project_id) return;
		await safeInvoke("launch_task_workflow", {
			projectId: task.project_id,
			taskId: task.id,
			subtaskId,
		}).catch((e) => console.error("Failed to launch subtask workflow:", e));
	}, []);

	const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
		const taskFull = taskFullCache.get(taskId);
		if (!taskFull) return;

		const task = tasks.find((t) => t.id === taskId);
		if (!task?.project_id) return;

		const project = await safeInvoke<ProjectWithConfig>(
			"get_project_with_config",
			{ projectId: task.project_id },
		).catch(() => null);
		if (!project) return;

		const newSubtasks = taskFull.subtasks.map((s) => {
			if (s.id === subtaskId) {
				const newStatus = s.status === "done" ? "pending" : "done";
				return {
					...s,
					status: newStatus,
					completed_at: newStatus === "done" ? new Date().toISOString() : null,
				};
			}
			return s;
		});

		const updatedTask: TaskFull = {
			...taskFull,
			subtasks: newSubtasks,
			modified_at: new Date().toISOString(),
		};

		if (newSubtasks.every((s) => s.status === "done") && newSubtasks.length > 0) {
			updatedTask.status = "done";
		}

		await safeInvoke("update_task_and_sync", {
			projectPath: project.path,
			task: updatedTask,
		}).catch((e) => console.error("Failed to toggle subtask:", e));

		refetch();
	}, [taskFullCache, tasks, refetch]);

	const handleReviewTask = useCallback(async (task: Task) => {
		if (!task.project_id) return;
		await safeInvoke("launch_task_review", {
			projectId: task.project_id,
			taskId: task.id,
		}).catch((e) => console.error("Failed to launch task review:", e));
	}, []);

	const handleDeleteTask = useCallback(async (taskId: string) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task?.project_id) return;

		const project = await safeInvoke<ProjectWithConfig>(
			"get_project_with_config",
			{ projectId: task.project_id },
		).catch(() => null);
		if (!project) return;

		await safeInvoke("delete_task_full", {
			projectPath: project.path,
			taskId,
		}).catch((e) => console.error("Failed to delete task:", e));

		setDeleteConfirmId(null);
		refetch();
	}, [tasks, refetch]);

	const handleDeleteClick = useCallback((taskId: string) => {
		if (deleteConfirmId === taskId) {
			handleDeleteTask(taskId);
		} else {
			setDeleteConfirmId(taskId);
			setTimeout(() => {
				setDeleteConfirmId((prev) => (prev === taskId ? null : prev));
			}, 3000);
		}
	}, [deleteConfirmId, handleDeleteTask]);

	const handleTaskCreated = useCallback(() => {
		setIsNewTaskOpen(false);
		refetch();
	}, [refetch]);

	return (
		<>
			<TasksHeader
				queryState={queryState}
				onNewTaskClick={() => setIsNewTaskOpen(true)}
				canCreateTask={!!selectedProjectId}
			/>

			<TasksList
				pendingTasks={pendingTasks}
				doneTasks={doneTasks}
				taskFullCache={taskFullCache}
				activeExecutions={activeExecutions}
				deleteConfirmId={deleteConfirmId}
				isLoading={isLoading}
				getSubtasks={getSubtasks}
				onToggleTask={handleToggleTask}
				onEditTask={handleEditTask}
				onCodarTask={handleCodarTask}
				onCodarSubtask={handleCodarSubtask}
				onToggleSubtask={handleToggleSubtask}
				onReviewTask={handleReviewTask}
				onDeleteClick={handleDeleteClick}
			/>

			{isNewTaskOpen && selectedProjectId && projectPath && (
				<TasksNewTask
					projectId={selectedProjectId}
					projectPath={projectPath}
					onClose={() => setIsNewTaskOpen(false)}
					onCreated={handleTaskCreated}
				/>
			)}
		</>
	);
}
