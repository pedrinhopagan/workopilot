import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { safeInvoke } from "../../services/tauri";
import type { Task, Project } from "../../types";
import { Select } from "../Select";
import { UnscheduledTask } from "./UnscheduledTask";
import { useAgendaStore } from "../../stores/agenda";

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
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);
    const [filterProject, setFilterProject] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterPriority, setFilterPriority] = useState("");

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

    useEffect(() => {
      loadTasks();
    }, [filterProject, filterCategory, filterPriority]);

    useImperativeHandle(ref, () => ({
      refresh: loadTasks,
    }));

    return (
      <div
        className={`flex flex-col h-full border-r border-[#3d3a34] bg-[#1c1c1c] ${isDragOver ? "bg-[#232323] border-dashed border-[#909d63]" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="Tarefas não agendadas"
      >
        <div className="p-3 border-b border-[#3d3a34]">
          <h3 className="text-sm font-medium text-[#d6d6d6] mb-3">Não Agendadas</h3>

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
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center text-[#636363] py-4 text-sm">Carregando...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-[#636363] py-4 text-sm">
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

        <div className="p-3 border-t border-[#3d3a34]">
          <button
            disabled={tasks.length === 0}
            className="w-full px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm font-medium hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors"
          >
            Distribuir com IA
          </button>
        </div>
      </div>
    );
  }
);
