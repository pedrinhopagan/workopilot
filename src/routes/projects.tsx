import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { TabBar } from "../components/TabBar";
import { safeInvoke } from "../services/tauri";
import { useSelectedProjectStore } from "../stores/selectedProject";
import type { Project } from "../types";

function ProjectsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
  const projectsList = useSelectedProjectStore((s) => s.projectsList);
  const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

  const isSettingsPage = location.pathname.includes("/settings");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const loaded = await safeInvoke<Project[]>("get_projects").catch(() => [] as Project[]);
    setProjectsList(loaded);

    if (loaded.length > 0) {
      const urlParams = new URLSearchParams(location.search);
      const urlProjectId = urlParams.get("projectId");
      const targetId = urlProjectId || selectedProjectId;

      if (targetId && loaded.some((p) => p.id === targetId)) {
        setSelectedProjectId(targetId);
      } else if (!selectedProjectId) {
        setSelectedProjectId(loaded[0].id);
      }
    }
  }

  function handleProjectClick(projectId: string) {
    if (isSettingsPage) {
      if (projectId === selectedProjectId) {
        navigate({ to: "/projects" });
      }
    } else {
      setSelectedProjectId(projectId);
    }
  }

  return (
    <>
      <TabBar />
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r border-[#3d3a34] flex flex-col bg-[#232323]">
          <div className="p-3 border-b border-[#3d3a34]">
            <span className="text-xs text-[#828282] uppercase tracking-wide">Projetos</span>
          </div>

          <ul className="flex-1 overflow-y-auto p-2">
            {projectsList.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const isDisabled = isSettingsPage && !isSelected;
              return (
                <li key={project.id}>
                  <button
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-[#909d63] text-[#1c1c1c]" : isDisabled ? "text-[#4a4a4a] cursor-not-allowed opacity-50" : "text-[#d6d6d6] hover:bg-[#333333]"}`}
                    onClick={() => handleProjectClick(project.id)}
                    disabled={isDisabled}
                    title={isSettingsPage && isSelected ? "Voltar para projetos" : ""}
                  >
                    {project.name}
                  </button>
                </li>
              );
            })}

            {projectsList.length === 0 && (
              <li className="px-3 py-2 text-[#636363] text-sm">Nenhum projeto</li>
            )}
          </ul>

          {!isSettingsPage && (
            <div className="p-2 border-t border-[#3d3a34]">
              <button
                className="w-full px-3 py-2 text-sm text-[#828282] border border-dashed border-[#3d3a34] hover:border-[#909d63] hover:text-[#909d63] transition-colors"
                onClick={() => navigate({ to: "/projects", search: { newProject: "true" } })}
              >
                + Novo Projeto
              </button>
            </div>
          )}
        </aside>

        <section className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </section>
      </main>
    </>
  );
}

export const Route = createFileRoute("/projects")({
  component: ProjectsLayout,
});
