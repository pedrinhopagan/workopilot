import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { safeInvoke, safeListen } from "../../services/tauri";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import { Select } from "../../components/Select";
import type { Task, TaskFull, ProjectWithConfig, Subtask, TaskUpdatedPayload, TaskExecution } from "../../types";
import {
  getTaskState,
  getStateLabel,
  getStateColor,
  getComplexityLabel,
  getComplexityColor,
  getStatusFilterOptions,
} from "../../lib/constants/taskStatus";

const categories = ["feature", "bug", "refactor", "test", "docs"];
const priorities = [
  { value: 1, label: "Alta", color: "bg-[#bc5653]" },
  { value: 2, label: "Média", color: "bg-[#ebc17a]" },
  { value: 3, label: "Baixa", color: "bg-[#8b7355]" },
];

function TasksPage() {
  const navigate = useNavigate();
  const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
  const projectsList = useSelectedProjectStore((s) => s.projectsList);

  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [taskFullCache, setTaskFullCache] = useState<Map<string, TaskFull>>(new Map());
  const [activeExecutions, setActiveExecutions] = useState<Map<string, TaskExecution>>(new Map());

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(2);
  const [newTaskCategory, setNewTaskCategory] = useState("feature");

  const [filterPriority, setFilterPriority] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let result = selectedProjectId ? tasks.filter((t) => t.project_id === selectedProjectId) : tasks;

    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }
    if (filterCategory) {
      result = result.filter((t) => t.category === filterCategory);
    }
    if (filterStatus) {
      result = result.filter((t) => {
        const full = taskFullCache.get(t.id);
        const state = getTaskState(full || null);
        return state === filterStatus;
      });
    }

    return result;
  }, [tasks, selectedProjectId, filterPriority, filterCategory, filterStatus, taskFullCache]);

  const pendingTasks = useMemo(() => filteredTasks.filter((t) => t.status !== "done"), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.status === "done"), [filteredTasks]);

  const loadActiveExecutions = useCallback(async () => {
    try {
      const executions = await safeInvoke<TaskExecution[]>("get_all_active_executions");
      const newMap = new Map<string, TaskExecution>();
      for (const exec of executions) {
        newMap.set(exec.task_id, exec);
      }
      setActiveExecutions(newMap);
    } catch (e) {
      console.error("Failed to load executions:", e);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    const data = await safeInvoke<Task[]>("get_tasks").catch(() => []);
    setTasks(data);
    tasksRef.current = data;
  }, []);

  const loadTaskFull = useCallback(async (taskId: string, projectPathArg: string) => {
    const full = await safeInvoke<TaskFull>("get_task_full", { projectPath: projectPathArg, taskId }).catch(() => null);
    if (full) {
      setTaskFullCache((prev) => new Map(prev).set(taskId, full));
    }
    return full;
  }, []);

  const loadAllTaskFulls = useCallback(async () => {
    for (const task of tasks) {
      if (task.project_id && task.json_path) {
        const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: task.project_id }).catch(
          () => null
        );
        if (project) {
          await loadTaskFull(task.id, project.path);
        }
      }
    }
  }, [tasks, loadTaskFull]);

  const loadProjectPath = useCallback(async () => {
    if (!selectedProjectId) {
      setProjectPath(null);
      return;
    }
    const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: selectedProjectId }).catch(
      () => null
    );
    setProjectPath(project?.path ?? null);
  }, [selectedProjectId]);

  async function addTask() {
    if (!newTaskTitle.trim() || !selectedProjectId || !projectPath) return;

    await safeInvoke("create_task_with_json", {
      projectId: selectedProjectId,
      projectPath: projectPath,
      title: newTaskTitle,
      priority: newTaskPriority,
      category: newTaskCategory,
    }).catch((e) => console.error("Failed to add task:", e));

    setNewTaskTitle("");
    await loadTasks();
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "done" ? "pending" : "done";
    await safeInvoke("update_task_status", { taskId, status: newStatus }).catch((e) =>
      console.error("Failed to update task:", e)
    );
    await loadTasks();
  }

  function editTask(taskId: string) {
    navigate({ to: "/tasks/$taskId", params: { taskId } });
  }

  async function codarTask(task: Task) {
    if (!task.project_id) return;
    await safeInvoke("launch_task_workflow", {
      projectId: task.project_id,
      taskId: task.id,
      subtaskId: null,
    }).catch((e) => console.error("Failed to launch task workflow:", e));
  }

  async function toggleSubtaskInList(taskId: string, subtaskId: string) {
    const taskFull = taskFullCache.get(taskId);
    if (!taskFull) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task?.project_id) return;

    const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: task.project_id }).catch(
      () => null
    );
    if (!project) return;

    const newSubtasks = taskFull.subtasks.map((s) => {
      if (s.id === subtaskId) {
        const newStatus = s.status === "done" ? "pending" : "done";
        return { ...s, status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null };
      }
      return s;
    });

    const updatedTask: TaskFull = {
      ...taskFull,
      subtasks: newSubtasks,
      modified_at: new Date().toISOString(),
      modified_by: "user",
    };

    if (newSubtasks.every((s) => s.status === "done") && newSubtasks.length > 0) {
      updatedTask.status = "awaiting_review";
    }

    await safeInvoke("update_task_and_sync", { projectPath: project.path, task: updatedTask }).catch((e) =>
      console.error("Failed to toggle subtask:", e)
    );

    setTaskFullCache((prev) => new Map(prev).set(taskId, updatedTask));
    await loadTasks();
  }

  async function codarSubtaskInList(task: Task, subtaskId: string) {
    if (!task.project_id) return;
    await safeInvoke("launch_task_workflow", {
      projectId: task.project_id,
      taskId: task.id,
      subtaskId,
    }).catch((e) => console.error("Failed to launch subtask workflow:", e));
  }

  async function reviewTask(task: Task) {
    if (!task.project_id) return;
    await safeInvoke("launch_task_review", {
      projectId: task.project_id,
      taskId: task.id,
    }).catch((e) => console.error("Failed to launch task review:", e));
  }

  function handleDeleteClick(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    if (deleteConfirmId === taskId) {
      deleteTask(taskId);
    } else {
      setDeleteConfirmId(taskId);
      setTimeout(() => {
        setDeleteConfirmId((prev) => (prev === taskId ? null : prev));
      }, 3000);
    }
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.project_id) return;

    const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: task.project_id }).catch(
      () => null
    );
    if (!project) return;

    await safeInvoke("delete_task_full", {
      projectPath: project.path,
      taskId,
    }).catch((e) => console.error("Failed to delete task:", e));

    setDeleteConfirmId(null);
    await loadTasks();
  }

  function getPriorityClass(priority: number) {
    const p = priorities.find((pr) => pr.value === priority);
    return p?.color || "bg-[#8b7355]";
  }

  function getCategoryOptions() {
    return categories.map((c) => ({ value: c, label: c }));
  }

  function getPriorityOptions() {
    return priorities.map((p) => ({ value: String(p.value), label: p.label }));
  }

  function getSubtasksForTask(taskId: string): Subtask[] {
    return taskFullCache.get(taskId)?.subtasks || [];
  }

  useEffect(() => {
    loadTasks();
    loadActiveExecutions();

    let unlisten: (() => void) | null = null;
    let unlistenExecution: (() => void) | null = null;

    safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
      if (event.payload.source === "ai") {
        console.log("[WorkoPilot] Task updated by AI, reloading and syncing...");
        const taskId = event.payload.task_id;
        const task = tasksRef.current.find((t) => t.id === taskId);
        if (task?.project_id) {
          const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", {
            projectId: task.project_id,
          }).catch(() => null);
          if (project) {
            const taskFull = await safeInvoke<TaskFull>("get_task_full", { projectPath: project.path, taskId }).catch(
              () => null
            );
            if (taskFull) {
              await safeInvoke("update_task_and_sync", { projectPath: project.path, task: taskFull }).catch(() => null);
              console.log("[WorkoPilot] Task synced to database");
              setTaskFullCache((prev) => new Map(prev).set(taskId, taskFull));
              await loadTasks();
            }
          }
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    safeListen("execution-changed", () => {
      loadActiveExecutions();
    }).then((fn) => {
      unlistenExecution = fn;
    });

    return () => {
      if (unlisten) unlisten();
      if (unlistenExecution) unlistenExecution();
    };
  }, []);

  useEffect(() => {
    loadProjectPath();
  }, [loadProjectPath]);

  useEffect(() => {
    if (tasks.length > 0) {
      loadAllTaskFulls();
    }
  }, [tasks]);

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b border-[#3d3a34]">
        <input
          type="text"
          placeholder="Nova tarefa..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          disabled={!selectedProjectId}
          className="flex-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none disabled:opacity-50"
        />
        <Select value={newTaskCategory} onChange={(v) => setNewTaskCategory(v)} options={getCategoryOptions()} />
        <Select
          value={String(newTaskPriority)}
          onChange={(v) => setNewTaskPriority(parseInt(v))}
          options={getPriorityOptions()}
        />
        <button
          onClick={addTask}
          disabled={!selectedProjectId || !newTaskTitle.trim()}
          className="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Adicionar
        </button>
      </div>

      <div className="flex items-center gap-2 p-3 bg-[#1c1c1c] border-b border-[#3d3a34]">
        <div className="flex-1"></div>
        <Select
          value={filterCategory || ""}
          onChange={(v) => setFilterCategory(v || null)}
          options={[{ value: "", label: "Categoria" }, ...getCategoryOptions()]}
        />
        <Select
          value={filterPriority ? String(filterPriority) : ""}
          onChange={(v) => setFilterPriority(v ? parseInt(v) : null)}
          options={[{ value: "", label: "Prioridade" }, ...getPriorityOptions()]}
        />
        <Select
          value={filterStatus || ""}
          onChange={(v) => setFilterStatus(v || null)}
          options={[{ value: "", label: "Status" }, ...getStatusFilterOptions()]}
        />
        {(filterCategory || filterPriority || filterStatus) && (
          <button
            onClick={() => {
              setFilterCategory(null);
              setFilterPriority(null);
              setFilterStatus(null);
            }}
            className="px-3 py-2 text-xs text-[#636363] hover:text-[#d6d6d6] transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!selectedProjectId && projectsList.length > 0 && (
          <div className="text-center text-[#636363] py-8">Selecione um projeto para adicionar tarefas</div>
        )}

        {pendingTasks.length > 0 && (
          <div className="space-y-1">
            {pendingTasks.map((task) => {
              const taskSubtasks = getSubtasksForTask(task.id);
              const doneSubtasks = taskSubtasks.filter((s) => s.status === "done").length;

              const activeExec = activeExecutions.get(task.id);
              const isExecuting = activeExec && activeExec.status === "running";
              const taskFull = taskFullCache.get(task.id);
              const taskState = getTaskState(taskFull || null);
              const complexity = taskFull?.complexity;

              return (
                <div key={task.id} className={`bg-[#232323] hover:bg-[#2a2a2a] transition-colors group ${isExecuting ? "ring-1 ring-[#909d63]" : ""}`}>
                  <div onClick={() => editTask(task.id)} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                    {isExecuting ? (
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#909d63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(task.id, task.status);
                        }}
                        className="text-[#636363] hover:text-[#909d63] transition-colors"
                      >
                        [ ]
                      </button>
                    )}

                    <span className="flex-1 text-[#d6d6d6] text-sm flex items-center gap-2">
                      {task.title}
                      {isExecuting && activeExec && (
                        <span className="text-xs text-[#909d63] opacity-75">
                           (Passo {activeExec.current_step}/{activeExec.total_steps})
                        </span>
                      )}
                    </span>

                    {taskSubtasks.length > 0 && (
                      <span className="text-xs text-[#636363]">
                        {doneSubtasks}/{taskSubtasks.length}
                      </span>
                    )}

                    {complexity && (
                      <span className={`text-xs ${getComplexityColor(complexity)}`}>
                        {getComplexityLabel(complexity)}
                      </span>
                    )}

                    <span className="px-2 py-0.5 text-xs text-[#1c1c1c] rounded" style={{ backgroundColor: getStateColor(taskState) }}>
                      {getStateLabel(taskState)}
                    </span>

                    <span className="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
                    <span className={`px-2 py-0.5 text-xs text-[#1c1c1c] ${getPriorityClass(task.priority)}`}>
                      P{task.priority}
                    </span>

                    <button
                      onClick={(e) => handleDeleteClick(e, task.id)}
                      className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${deleteConfirmId === task.id ? "text-[#bc5653]" : "text-[#636363] hover:text-[#bc5653]"}`}
                      title={deleteConfirmId === task.id ? "Confirmar exclusão" : "Excluir tarefa"}
                    >
                      {deleteConfirmId === task.id ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      )}
                    </button>

                    {taskSubtasks.length > 0 && taskSubtasks.every((s) => s.status === "done") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewTask(task);
                        }}
                        className="px-3 py-1 text-xs bg-[#ebc17a] text-[#1c1c1c] hover:bg-[#f5d08a] transition-colors"
                      >
                        Revisar
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        codarTask(task);
                      }}
                      className="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] transition-colors"
                    >
                      Codar &gt;
                    </button>
                  </div>

                  {taskSubtasks.length > 0 && (
                    <div className="pl-8 pr-3 pb-2 space-y-1">
                      {taskSubtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className={`flex items-center gap-2 text-sm ${subtask.status === "done" ? "opacity-50" : ""}`}
                        >
                          <button
                            onClick={() => toggleSubtaskInList(task.id, subtask.id)}
                            className={`text-xs ${subtask.status === "done" ? "text-[#909d63]" : "text-[#636363] hover:text-[#909d63]"}`}
                          >
                            {subtask.status === "done" ? "[x]" : "[ ]"}
                          </button>
                          <span
                            className={`text-[#d6d6d6] ${subtask.status === "done" ? "line-through" : ""}`}
                          >
                            {subtask.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              codarSubtaskInList(task, subtask.id);
                            }}
                            disabled={subtask.status === "done"}
                            className="ml-auto px-2 py-0.5 text-xs bg-[#3d3a34] text-[#d6d6d6] hover:bg-[#4a4a4a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            Codar &gt;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-[#636363] uppercase tracking-wide mb-2">Concluídas ({doneTasks.length})</div>
            <div className="space-y-1 opacity-50">
              {doneTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => editTask(task.id)}
                  className="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] transition-colors group cursor-pointer"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task.id, task.status);
                    }}
                    className="text-[#909d63]"
                  >
                    [x]
                  </button>
                  <span className="flex-1 text-[#d6d6d6] text-sm line-through">{task.title}</span>
                  <span className="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
                  <button
                    onClick={(e) => handleDeleteClick(e, task.id)}
                    className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${deleteConfirmId === task.id ? "text-[#bc5653]" : "text-[#636363] hover:text-[#bc5653]"}`}
                    title={deleteConfirmId === task.id ? "Confirmar exclusão" : "Excluir tarefa"}
                  >
                    {deleteConfirmId === task.id ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center text-[#636363] py-8">Nenhuma tarefa encontrada. Adicione uma nova!</div>
        )}
      </div>
    </>
  );
}

export const Route = createFileRoute("/tasks/")({
  component: TasksPage,
});
