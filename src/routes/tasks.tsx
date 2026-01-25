import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { TabBar } from "../components/TabBar";
import { CustomSelect } from "../components/ui/custom-select";
import { useSelectedProjectStore } from "../stores/selectedProject";
import { trpc } from "../services/trpc";
import { Check, ChevronDown, FolderKanban } from "lucide-react";
import { cn } from "../lib/utils";

function TasksLayout() {
  const { data: projects = [] } = trpc.projects.list.useQuery();

  const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
  const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

  const location = useLocation();
  const isEditingTask = location.pathname !== "/tasks";

  useEffect(() => {
    setSelectedProjectId(null);
  }, [setSelectedProjectId]);

  useEffect(() => {
    setProjectsList(projects);
  }, [projects, setProjectsList]);

  const projectItems = [
    { id: "__all__", name: "Todos", color: null },
    ...projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
  ];

  const selectedProject = projectItems.find((p) => p.id === (selectedProjectId || "__all__"));

  return (
    <>
      <TabBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 p-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Projeto:</span>
            <CustomSelect
              items={projectItems}
              value={selectedProjectId || "__all__"}
              onValueChange={(id) => setSelectedProjectId(id === "__all__" ? null : id)}
              disabled={isEditingTask}
              triggerClassName={cn(
                "flex items-center gap-2 px-3 py-1.5 border border-border bg-card rounded-md min-w-[140px]",
                "hover:bg-popover hover:border-muted-foreground transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isEditingTask && "opacity-50 pointer-events-none"
              )}
              contentClassName="min-w-[180px]"
              renderTrigger={() => (
                <>
                  {selectedProject?.color ? (
                    <span
                      className="size-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedProject.color }}
                    />
                  ) : (
                    <FolderKanban className="size-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-foreground truncate text-left">
                    {selectedProject?.name || "Todos"}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground flex-shrink-0" />
                </>
              )}
              renderItem={(project, isSelected) => (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                    isSelected ? "bg-popover" : "hover:bg-popover"
                  )}
                >
                  {project.color ? (
                    <span
                      className="size-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                  ) : (
                    <FolderKanban className="size-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn(
                    "flex-1 text-sm truncate",
                    isSelected ? "text-foreground font-medium" : "text-foreground"
                  )}>
                    {project.name}
                  </span>
                  {isSelected && (
                    <Check className="size-3 text-primary flex-shrink-0" />
                  )}
                </div>
              )}
            />
          </div>
        </div>

        <Outlet />
      </main>
    </>
  );
}

export const Route = createFileRoute("/tasks")({
  component: TasksLayout,
});
