import { useState, useEffect, useCallback } from "react";
import { TaskItem } from "../tasks/TaskItem";
import { trpc } from "../../services/trpc";
import { useDbRefetchStore } from "../../stores/dbRefetch";
import type { Task, TaskFull, Subtask } from "../../types";
import { useAgendaStore } from "../../stores/agenda";

type DraggableTaskItemProps = {
  task: Task;
  taskFull: TaskFull | null;
  onStatusChange: () => void;
};

function DraggableTaskItem({ task, taskFull, onStatusChange }: DraggableTaskItemProps) {
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const setDrawerCollapsed = useAgendaStore((s) => s.setDrawerCollapsed);
  const [isDragging, setIsDragging] = useState(false);

  const isDone = task.status === "done";

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => onStatusChange(),
  });

  function toggleStatus() {
    const newStatus = isDone ? "pending" : "done";
    updateStatusMutation.mutate(
      { id: task.id, status: newStatus as "pending" | "done" },
      { onError: (e) => console.error("Failed to update task status:", e) },
    );
  }

  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true);
    setDrawerCollapsed(true);
    setDraggedTask({ id: task.id, title: task.title, fromDate: task.scheduled_date });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
    }
  }

  function handleDragEnd() {
    setIsDragging(false);
    setDrawerCollapsed(false);
    setDraggedTask(null);
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop wrapper */}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`cursor-grab ${isDragging ? "opacity-50 cursor-grabbing" : ""}`}
      >
        <TaskItem
          task={task}
          taskFull={taskFull}
          variant="compact"
          isDone={isDone}
          onToggle={toggleStatus}
          disableNavigation={false}
        />
      </div>
    </>
  );
}

type DayDrawerProps = {
  onTaskChange?: () => void;
};

export function DayDrawer({ onTaskChange }: DayDrawerProps) {
  const selectedDate = useAgendaStore((s) => s.selectedDate);
  const drawerCollapsed = useAgendaStore((s) => s.drawerCollapsed);
  const closeDrawer = useAgendaStore((s) => s.closeDrawer);
  const changeCounter = useDbRefetchStore((s) => s.changeCounter);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const { data: tasks = [], isLoading, refetch: refetchTasks } = trpc.tasks.listForDate.useQuery(
    { date: selectedDate ?? "" },
    { enabled: !!selectedDate, staleTime: 1000 * 60 }
  );

  const [taskFullCache, setTaskFullCache] = useState<Map<string, NonNullable<Awaited<ReturnType<typeof utils.tasks.getFull.fetch>>>>>(new Map());

  useEffect(() => {
    async function loadFullTasks() {
      const newCache = new Map(taskFullCache);
      for (const task of tasks) {
        if (!newCache.has(task.id)) {
          const full = await utils.tasks.getFull.fetch({ id: task.id }).catch(() => null);
          if (full) {
            newCache.set(task.id, full);
          }
        }
      }
      setTaskFullCache(newCache);
    }
    if (tasks.length > 0) {
      loadFullTasks();
    }
  }, [tasks, utils]);

  const saveFullMutation = trpc.tasks.saveFull.useMutation({
    onSuccess: () => {
      utils.tasks.listForDate.invalidate();
      utils.tasks.getFull.invalidate();
      onTaskChange?.();
    },
  });

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

    const newSubtasks = taskFull.subtasks.map((s) => {
      if (s.id === subtaskId) {
        const newStatus = s.status === "done" ? "pending" : "done";
        return { ...s, status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null };
      }
      return s;
    });

    const updatedTask = {
      ...taskFull,
      subtasks: newSubtasks,
      modified_at: new Date().toISOString(),
    };

    if (newSubtasks.every((s) => s.status === "done") && newSubtasks.length > 0) {
      updatedTask.status = "done";
    }

    try {
      await saveFullMutation.mutateAsync(updatedTask);
    } catch (e) {
      console.error("Failed to toggle subtask:", e);
    }
  }

  function handleClickOutside(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("drawer-backdrop")) {
      closeDrawer();
    }
  }

  function handleTaskChange() {
    refetchTasks();
    onTaskChange?.();
  }

  useEffect(() => {
    if (changeCounter === 0 || !selectedDate) return;
    refetchTasks();
  }, [changeCounter, selectedDate, refetchTasks]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDrawer();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [closeDrawer]);

  if (!selectedDate || drawerCollapsed) return null;

  return (
    <>
      <button
        type="button"
        className="drawer-backdrop fixed inset-0 bg-black/50 z-40"
        onClick={handleClickOutside}
        aria-label="Fechar drawer"
      />

      <div className="fixed top-0 right-0 h-full w-[400px] bg-background border-l border-border z-50 flex flex-col shadow-xl animate-slide-in">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button
            type="button"
            onClick={closeDrawer}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
              <title>Fechar</title>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-base font-medium text-foreground capitalize">{formattedDate()}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Carregando...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Nenhuma tarefa para este dia</div>
          ) : (
            <div className="flex flex-col gap-1">
              {tasks.map((task) => {
                const taskSubtasks = getSubtasksForTask(task.id);
                const doneSubtasks = taskSubtasks.filter((s) => s.status === "done").length;
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <div key={task.id} className="bg-card">
                    <div className="flex items-center gap-2">
                      {taskSubtasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(task.id)}
                          className="pl-2 text-muted-foreground hover:text-foreground transition-colors"
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
                            <title>{isExpanded ? "Recolher" : "Expandir"}</title>
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                      )}
                      <div className={`flex-1 ${taskSubtasks.length > 0 ? "" : "pl-2"}`}>
                        <DraggableTaskItem
                          task={task}
                          taskFull={taskFullCache.get(task.id) || null}
                          onStatusChange={handleTaskChange}
                        />
                      </div>
                      {taskSubtasks.length > 0 && (
                        <span className="pr-3 text-xs text-muted-foreground">
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
                              type="button"
                              onClick={() => toggleSubtask(task.id, subtask.id)}
                              className={`text-xs ${subtask.status === "done" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                            >
                              {subtask.status === "done" ? "[x]" : "[ ]"}
                            </button>
                            <span
                              className={`text-foreground ${subtask.status === "done" ? "line-through" : ""}`}
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

        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          Arraste tarefas para reagendar
        </div>
      </div>
    </>
  );
}
