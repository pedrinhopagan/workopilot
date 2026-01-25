import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Check, ChevronDown, FolderKanban } from "lucide-react";
import { trpc } from "../../../services/trpc";
import { useDbRefetchStore } from "../../../stores/dbRefetch";
import type { Project } from "../../../types";
import { CustomSelect } from "../../../components/ui/custom-select";
import { cn } from "../../../lib/utils";
import { UnscheduledTask } from "./UnscheduledTask";
import { useAgendaStore } from "../../../stores/agenda";
import {
  distributeTasksWithOpenCode,
  checkSessionStatus,
  type TaskForDistribution,
} from "../../../services/aiDistribution";

const CATEGORIES = [
  { id: "__all__", name: "Categoria", color: null as string | null },
  { id: "feature", name: "feature", color: "#61afef" },
  { id: "bug", name: "bug", color: "#e06c75" },
  { id: "refactor", name: "refactor", color: "#98c379" },
  { id: "test", name: "test", color: "#e5c07b" },
  { id: "docs", name: "docs", color: "#c678dd" },
];

const PRIORITIES = [
  { id: "__all__", name: "Prioridade", color: null as string | null },
  { id: "1", name: "Alta", color: "#bc5653" },
  { id: "2", name: "Média", color: "#ebc17a" },
  { id: "3", name: "Baixa", color: "#8b7355" },
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

    const [isDragOver, setIsDragOver] = useState(false);
    const [filterProject, setFilterProject] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [error, setError] = useState<string | null>(null);

    const utils = trpc.useUtils();

    const { data: rawTasks = [], isLoading, refetch: refetchTasks } = trpc.tasks.listUnscheduled.useQuery(
      filterProject && filterProject !== "__all__" ? { projectId: filterProject } : undefined,
      { staleTime: 1000 * 60 }
    );

    const tasks = rawTasks.filter((t) => {
      if (filterCategory && filterCategory !== "__all__" && t.category !== filterCategory) return false;
      if (filterPriority && filterPriority !== "__all__" && t.priority !== parseInt(filterPriority, 10)) return false;
      return true;
    });

    const unscheduleMutation = trpc.tasks.unschedule.useMutation({
      onSuccess: () => {
        utils.tasks.listUnscheduled.invalidate();
        utils.tasks.listForMonth.invalidate();
        onTaskScheduled();
      },
    });

    async function handleDrop(e: React.DragEvent) {
      e.preventDefault();
      setIsDragOver(false);

      if (draggedTask?.fromDate) {
        try {
          await unscheduleMutation.mutateAsync({ id: draggedTask.id });
        } catch (err) {
          console.error("Failed to unschedule task:", err);
        }
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

    const projectItems = [
      { id: "__all__", name: "Todos projetos", color: null as string | null },
      ...projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    ];

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
            refetchTasks();
            onTaskScheduled();
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          if (isDistributing) {
            setIsDistributing(false);
            resetDistributionState();
            refetchTasks();
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
      if (changeCounter === 0) return;
      refetchTasks();
    }, [changeCounter, refetchTasks]);

    useImperativeHandle(ref, () => ({
      refresh: () => refetchTasks(),
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
              <CustomSelect
                items={projectItems}
                value={filterProject || "__all__"}
                onValueChange={(id) => setFilterProject(id === "__all__" ? "" : id)}
                triggerClassName="flex items-center gap-2 px-2 py-1.5 h-8 w-full border border-border bg-card rounded-md hover:bg-popover hover:border-muted-foreground transition-colors"
                contentClassName="min-w-[180px]"
                renderTrigger={() => {
                  const selected = projectItems.find((p) => p.id === (filterProject || "__all__"));
                  return (
                    <>
                      {selected?.color ? (
                        <span
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: selected.color }}
                        />
                      ) : (
                        <FolderKanban className="size-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-foreground truncate text-left">
                        {selected?.name || "Todos projetos"}
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground flex-shrink-0" />
                    </>
                  );
                }}
                renderItem={(item, isSelected) => (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                      isSelected ? "bg-popover" : "hover:bg-popover"
                    )}
                  >
                    {item.color ? (
                      <span
                        className="size-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    ) : (
                      <FolderKanban className="size-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={cn(
                      "flex-1 text-sm truncate",
                      isSelected ? "text-foreground font-medium" : "text-foreground"
                    )}>
                      {item.name}
                    </span>
                    {isSelected && <Check className="size-3 text-primary flex-shrink-0" />}
                  </div>
                )}
              />
              <div className="flex gap-2">
                <CustomSelect
                  items={CATEGORIES}
                  value={filterCategory || "__all__"}
                  onValueChange={(id) => setFilterCategory(id === "__all__" ? "" : id)}
                  triggerClassName="flex items-center gap-2 px-2 py-1.5 h-8 flex-1 border border-border bg-card rounded-md hover:bg-popover hover:border-muted-foreground transition-colors"
                  contentClassName="min-w-[140px]"
                  renderTrigger={() => {
                    const selected = CATEGORIES.find((c) => c.id === (filterCategory || "__all__"));
                    return (
                      <>
                        {selected?.color && (
                          <span
                            className="size-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selected.color }}
                          />
                        )}
                        <span className="flex-1 text-sm text-foreground truncate text-left">
                          {selected?.name || "Categoria"}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground flex-shrink-0" />
                      </>
                    );
                  }}
                  renderItem={(item, isSelected) => (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                        isSelected ? "bg-popover" : "hover:bg-popover"
                      )}
                    >
                      {item.color && (
                        <span
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className={cn(
                        "flex-1 text-sm truncate",
                        isSelected ? "text-foreground font-medium" : "text-foreground"
                      )}>
                        {item.name}
                      </span>
                      {isSelected && <Check className="size-3 text-primary flex-shrink-0" />}
                    </div>
                  )}
                />
                <CustomSelect
                  items={PRIORITIES}
                  value={filterPriority || "__all__"}
                  onValueChange={(id) => setFilterPriority(id === "__all__" ? "" : id)}
                  triggerClassName="flex items-center gap-2 px-2 py-1.5 h-8 flex-1 border border-border bg-card rounded-md hover:bg-popover hover:border-muted-foreground transition-colors"
                  contentClassName="min-w-[120px]"
                  renderTrigger={() => {
                    const selected = PRIORITIES.find((p) => p.id === (filterPriority || "__all__"));
                    return (
                      <>
                        {selected?.color && (
                          <span
                            className="size-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selected.color }}
                          />
                        )}
                        <span className="flex-1 text-sm text-foreground truncate text-left">
                          {selected?.name || "Prioridade"}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground flex-shrink-0" />
                      </>
                    );
                  }}
                  renderItem={(item, isSelected) => (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                        isSelected ? "bg-popover" : "hover:bg-popover"
                      )}
                    >
                      {item.color && (
                        <span
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className={cn(
                        "flex-1 text-sm truncate",
                        isSelected ? "text-foreground font-medium" : "text-foreground"
                      )}>
                        {item.name}
                      </span>
                      {isSelected && <Check className="size-3 text-primary flex-shrink-0" />}
                    </div>
                  )}
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
