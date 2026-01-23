import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TabBar } from "../components/TabBar";
import { Select } from "../components/Select";
import { useSelectedProjectStore } from "../stores/selectedProject";
import { safeInvoke } from "../services/tauri";
import type { Project } from "../types";

function TasksLayout() {
  const [projects, setProjects] = useState<Project[]>([]);

  const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
  const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

  const location = useLocation();
  const isEditingTask = location.pathname !== "/tasks";

  useEffect(() => {
    setSelectedProjectId(null);
  }, [setSelectedProjectId]);

  useEffect(() => {
    safeInvoke<Project[]>("get_projects")
      .then((data) => {
        setProjects(data);
        setProjectsList(data);
      })
      .catch((e) => console.error("Failed to load projects:", e));
  }, [setProjectsList]);

  function getProjectOptions() {
    return [
      { value: "", label: "Todos" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ];
  }

  return (
    <>
      <TabBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 p-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Projeto:</span>
            <Select
              value={selectedProjectId || ""}
              options={getProjectOptions()}
              onChange={(v) => setSelectedProjectId(v || null)}
              className={isEditingTask ? "opacity-50 pointer-events-none" : ""}
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
