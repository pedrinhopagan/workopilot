import { useState, useEffect, useCallback } from "react";
import { safeInvoke } from "../../services/tauri";
import type { Task, TaskFull, Subtask, ProjectWithConfig } from "../../types";
import { DayTaskItem } from "./DayTaskItem";
import { useAgendaStore } from "../../stores/agenda";

type DayDrawerProps = {
  onClose: () => void;
  onTaskChange: () => void;
};

export function DayDrawer({ onClose, onTaskChange }: DayDrawerProps) {
  const selectedDate = useAgendaStore((s) => s.selectedDate);
  const drawerCollapsed = useAgendaStore((s) => s.drawerCollapsed);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskFullCache, setTaskFullCache] = useState<Map<string, TaskFull>>(new Map());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const formattedDate = useCallback(() => {
    if (!selectedDate) return "";
    const date = new Date(selectedDate + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  async function loadTaskFull(taskId: string, projectPath: string): Promise<TaskFull | null> {
    const full = await safeInvoke<TaskFull>("get_task_full", { projectPath, taskId }).catch(() => null);
    if (full) {
      setTaskFullCache((prev) => new Map(prev).set(taskId, full));
    }
    return full;
  }

  async function loadAllTaskFulls(taskList: Task[]) {
    for (const task of taskList) {
      if (task.project_id && task.json_path) {
        const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", {
          projectId: task.project_id,
        }).catch(() => null);
        if (project) {
          await loadTaskFull(task.id, project.path);
        }
      }
    }
  }

  async function loadTasks() {
    if (!selectedDate) return;
    setIsLoading(true);
    const result = await safeInvoke<Task[]>("get_tasks_for_date", {
      date: selectedDate,
    }).catch((e) => {
      console.error("Failed to load tasks for date:", e);
      return [];
    });
    setTasks(result);
    await loadAllTaskFulls(result);
    setIsLoading(false);
  }

  function getSubtasksForTask(taskId: string): Subtask[] {
    return taskFullCache.get(taskId)?.subtasks ?? [];
  }

  function toggleExpanded(taskId: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  async function toggleSubtask(taskId: string, subtaskId: string) {
    const taskFull = taskFullCache.get(taskId);
    if (!taskFull) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task?.project_id) return;

    const project = await safeInvoke<ProjectWithConfig>("get_project_with_config", {
      projectId: task.project_id,
    }).catch(() => null);
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
    };

    if (newSubtasks.every((s) => s.status === "done") && newSubtasks.length > 0) {
      updatedTask.status = "done";
    }

    await safeInvoke("update_task_and_sync", { projectPath: project.path, task: updatedTask }).catch((e) =>
      console.error("Failed to toggle subtask:", e)
    );
    setTaskFullCache((prev) => new Map(prev).set(taskId, updatedTask));
    handleTaskChange();
  }

  function handleClickOutside(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("drawer-backdrop")) {
      onClose();
    }
  }

  function handleTaskChange() {
    loadTasks();
    onTaskChange();
  }

  useEffect(() => {
    if (selectedDate) {
      loadTasks();
    }
  }, [selectedDate]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  if (!selectedDate || drawerCollapsed) return null;

  return (
    <>
      <button
        type="button"
        className="drawer-backdrop fixed inset-0 bg-black/50 z-40"
        onClick={handleClickOutside}
        aria-label="Fechar drawer"
      />

      <div className="fixed top-0 right-0 h-full w-[400px] bg-[#1c1c1c] border-l border-[#3d3a34] z-50 flex flex-col shadow-xl animate-slide-in">
        <div className="flex items-center gap-3 p-4 border-b border-[#3d3a34]">
          <button
            onClick={onClose}
            className="text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
            title="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-base font-medium text-[#d6d6d6] capitalize">{formattedDate()}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-center text-[#636363] py-8 text-sm">Carregando...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-[#636363] py-8 text-sm">Nenhuma tarefa para este dia</div>
          ) : (
            <div className="flex flex-col gap-1">
              {tasks.map((task) => {
                const taskSubtasks = getSubtasksForTask(task.id);
                const doneSubtasks = taskSubtasks.filter((s) => s.status === "done").length;
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <div key={task.id} className="bg-[#232323]">
                    <div className="flex items-center gap-2">
                      {taskSubtasks.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(task.id)}
                          className="pl-2 text-[#636363] hover:text-[#d6d6d6] transition-colors"
                          title={isExpanded ? "Recolher subtasks" : "Expandir subtasks"}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                      )}
                      <div className={`flex-1 ${taskSubtasks.length > 0 ? "" : "pl-2"}`}>
                        <DayTaskItem task={task} onStatusChange={handleTaskChange} />
                      </div>
                      {taskSubtasks.length > 0 && (
                        <span className="pr-3 text-xs text-[#636363]">
                          {doneSubtasks}/{taskSubtasks.length}
                        </span>
                      )}
                    </div>

                    {isExpanded && taskSubtasks.length > 0 && (
                      <div className="pl-8 pr-3 pb-2 space-y-1">
                        {taskSubtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className={`flex items-center gap-2 text-sm ${subtask.status === "done" ? "opacity-50" : ""}`}
                          >
                            <button
                              onClick={() => toggleSubtask(task.id, subtask.id)}
                              className={`text-xs ${subtask.status === "done" ? "text-[#909d63]" : "text-[#636363] hover:text-[#909d63]"}`}
                            >
                              {subtask.status === "done" ? "[x]" : "[ ]"}
                            </button>
                            <span
                              className={`text-[#d6d6d6] ${subtask.status === "done" ? "line-through" : ""}`}
                            >
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#3d3a34] text-xs text-[#636363]">
          Arraste tarefas para reagendar • Clique para editar
        </div>
      </div>
    </>
  );
}
