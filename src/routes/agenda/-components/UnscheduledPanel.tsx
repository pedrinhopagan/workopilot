import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { safeInvoke } from "../../../services/tauri";
import { useDbRefetchStore } from "../../../stores/dbRefetch";
import type { Task, Project } from "../../../types";
import { Select } from "../../../components/Select";
import { UnscheduledTask } from "./UnscheduledTask";
import { useAgendaStore } from "../../../stores/agenda";
import {
  distributeTasksWithOpenCode,
  checkSessionStatus,
  type TaskForDistribution,
} from "../../../services/aiDistribution";

const categories = ["feature", "bug", "refactor", "test", "docs"];
const priorities = [
  { value: "1", label: "Alta" },
  { value: "2", label: "Média" },
  { value: "3", label: "Baixa" },
];

type UnscheduledPanelProps = {
  projects: Project[];
  onTaskScheduled: () => void;
};

export type UnscheduledPanelRef = {
  refresh: () => void;
};

export const UnscheduledPanel = forwardRef<UnscheduledPanelRef, UnscheduledPanelProps>(
  function UnscheduledPanel({ projects, onTaskScheduled }, ref) {
    const draggedTask = useAgendaStore((s) => s.draggedTask);
    const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
    const isDistributionMode = useAgendaStore((s) => s.isDistributionMode);
    const setDistributionMode = useAgendaStore((s) => s.setDistributionMode);
    const isDistributing = useAgendaStore((s) => s.isDistributing);
    const setIsDistributing = useAgendaStore((s) => s.setIsDistributing);
    const selectedTaskIds = useAgendaStore((s) => s.selectedTaskIds);
    const selectedDates = useAgendaStore((s) => s.selectedDates);
    const selectAllTasks = useAgendaStore((s) => s.selectAllTasks);
    const clearTaskSelection = useAgendaStore((s) => s.clearTaskSelection);
    const resetDistributionState = useAgendaStore((s) => s.resetDistributionState);
    const changeCounter = useDbRefetchStore((s) => s.changeCounter);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);
    const [filterProject, setFilterProject] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [error, setError] = useState<string | null>(null);

    async function loadTasks() {
      setIsLoading(true);
      const result = await safeInvoke<Task[]>("get_unscheduled_tasks", {
        projectId: filterProject || null,
        category: filterCategory || null,
        priority: filterPriority ? parseInt(filterPriority) : null,
      }).catch((e) => {
        console.error("Failed to load unscheduled tasks:", e);
        return [];
      });
      setTasks(result);
      setIsLoading(false);
    }

    async function handleDrop(e: React.DragEvent) {
      e.preventDefault();
      setIsDragOver(false);

      if (draggedTask?.fromDate) {
        await safeInvoke("unschedule_task", { taskId: draggedTask.id }).catch((e) =>
          console.error("Failed to unschedule task:", e)
        );
        await loadTasks();
        onTaskScheduled();
      }
      setDraggedTask(null);
    }

    function handleDragOver(e: React.DragEvent) {
      e.preventDefault();
      if (draggedTask?.fromDate) {
        setIsDragOver(true);
      }
    }

    function handleDragLeave() {
      setIsDragOver(false);
    }

    function getProjectOptions() {
      return [
        { value: "", label: "Todos projetos" },
        ...projects.map((p) => ({ value: p.id, label: p.name })),
      ];
    }

    function getCategoryOptions() {
      return [{ value: "", label: "Categoria" }, ...categories.map((c) => ({ value: c, label: c }))];
    }

    function getPriorityOptions() {
      return [{ value: "", label: "Prioridade" }, ...priorities];
    }

    function handleStartDistribution() {
      setDistributionMode(true);
      selectAllTasks(tasks.map((t) => t.id));
      setError(null);
    }

    function handleCancelDistribution() {
      resetDistributionState();
      setError(null);
    }

    async function handleDistribute() {
      if (selectedTaskIds.size === 0 || selectedDates.size === 0) return;

      const tasksToDistribute: TaskForDistribution[] = tasks
        .filter((t) => selectedTaskIds.has(t.id))
        .map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          category: t.category,
          complexity: null,
          due_date: t.due_date,
        }));

      setIsDistributing(true);
      setError(null);

      try {
        const { sessionId } = await distributeTasksWithOpenCode(
          tasksToDistribute,
          [...selectedDates]
        );

        const pollInterval = setInterval(async () => {
          const status = await checkSessionStatus(sessionId);
          if (status === "idle" || status === "error") {
            clearInterval(pollInterval);
            setIsDistributing(false);
            resetDistributionState();
            loadTasks();
            onTaskScheduled();
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          if (isDistributing) {
            setIsDistributing(false);
            resetDistributionState();
            loadTasks();
            onTaskScheduled();
          }
        }, 120000);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao distribuir tarefas");
        setIsDistributing(false);
      }
    }

    function handleSelectAll() {
      if (selectedTaskIds.size === tasks.length) {
        clearTaskSelection();
      } else {
        selectAllTasks(tasks.map((t) => t.id));
      }
    }

    useEffect(() => {
      loadTasks();
    }, [filterProject, filterCategory, filterPriority]);

    useEffect(() => {
      if (changeCounter === 0) return;
      loadTasks();
    }, [changeCounter]);

    useImperativeHandle(ref, () => ({
      refresh: loadTasks,
    }));

    return (
      <div
        className={`flex flex-col h-full border-r border-border bg-background ${isDragOver ? "bg-card border-dashed border-primary" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="Tarefas não agendadas"
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">
              {isDistributionMode ? "Selecionar Tarefas" : "Não Agendadas"}
            </h3>
            {isDistributionMode && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:text-primary/80"
              >
                {selectedTaskIds.size === tasks.length ? "Desmarcar" : "Selecionar"} todas
              </button>
            )}
          </div>

          {!isDistributionMode && (
            <div className="flex flex-col gap-2">
              <Select
                value={filterProject}
                options={getProjectOptions()}
                onChange={(v) => setFilterProject(v)}
                className="w-full"
              />
              <div className="flex gap-2">
                <Select
                  value={filterCategory}
                  options={getCategoryOptions()}
                  onChange={(v) => setFilterCategory(v)}
                  className="flex-1"
                />
                <Select
                  value={filterPriority}
                  options={getPriorityOptions()}
                  onChange={(v) => setFilterPriority(v)}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {isDistributionMode && (
            <div className="text-xs text-muted-foreground">
              <p>{selectedTaskIds.size} tarefas selecionadas</p>
              <p>{selectedDates.size} dias selecionados no calendário</p>
            </div>
          )}

          {error && (
            <div className="mt-2 p-2 bg-destructive/20 border border-destructive text-foreground text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4 text-sm">Carregando...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              {isDragOver ? "Solte para remover do calendário" : "Todas as tarefas estão agendadas"}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {tasks.map((task) => (
                <UnscheduledTask key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border">
          {!isDistributionMode ? (
            <button
              type="button"
              disabled={tasks.length === 0}
              onClick={handleStartDistribution}
              className="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
            >
              Distribuir com IA
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelDistribution}
                disabled={isDistributing}
                className="flex-1 px-4 py-2 bg-card text-foreground text-sm hover:bg-popover disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedTaskIds.size === 0 || selectedDates.size === 0 || isDistributing}
                onClick={handleDistribute}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
              >
                {isDistributing ? "Processando..." : "Distribuir"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
