import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TabBar } from "../components/TabBar";
import { Select } from "../components/Select";
import { useSelectedProjectStore } from "../stores/selectedProject";
import { safeInvoke } from "../services/tauri";
import type { Project } from "../types";

function TasksLayout() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isStarting, setIsStarting] = useState(false);

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

  async function startWorkflow() {
    if (!selectedProjectId) return;

    setIsStarting(true);
    safeInvoke("launch_project_tmux", { projectId: selectedProjectId })
      .catch((e) => console.error("Failed to start workflow:", e))
      .finally(() => setIsStarting(false));
  }

  return (
    <>
      <TabBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-3 border-b border-[#3d3a34] bg-[#232323]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#828282]">Projeto:</span>
            <Select
              value={selectedProjectId || ""}
              options={getProjectOptions()}
              onChange={(v) => setSelectedProjectId(v || null)}
              className={isEditingTask ? "opacity-50 pointer-events-none" : ""}
            />
          </div>

          <button
            onClick={startWorkflow}
            disabled={!selectedProjectId || isStarting || isEditingTask}
            className="px-6 py-2 bg-[#909d63] text-[#1c1c1c] text-sm font-medium hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isStarting ? "Iniciando..." : "Começar"}
          </button>
        </div>

        <Outlet />
      </main>
    </>
  );
}

export const Route = createFileRoute("/tasks")({
  component: TasksLayout,
});
