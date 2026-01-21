import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
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

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const lastSwapRef = useRef(0);

  const isSettingsPage = location.pathname.includes("/settings");

  useEffect(() => {
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
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProjectClick(projectId: string) {
    if (isSettingsPage) {
      if (projectId === selectedProjectId) {
        navigate({ to: "/projects" });
      }
    } else {
      setSelectedProjectId(projectId);
    }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggingIndex(index);
    if (e.dataTransfer && e.target instanceof HTMLElement) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");

      const clone = e.target.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.top = "-9999px";
      clone.style.opacity = "1";
      clone.style.background = "#1c1c1c";
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setTimeout(() => clone.remove(), 0);
    }
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;

    const now = Date.now();
    if (now - lastSwapRef.current < 100) return;
    lastSwapRef.current = now;

    const newList = [...projectsList];
    const [draggedItem] = newList.splice(draggingIndex, 1);
    newList.splice(index, 0, draggedItem);

    for (let i = 0; i < newList.length; i++) {
      newList[i] = { ...newList[i], display_order: i };
    }

    setProjectsList(newList);
    setDraggingIndex(index);
  }

  async function handleDragEnd() {
    setDraggingIndex(null);
    const projectOrders: [string, number][] = projectsList.map((p) => [p.id, p.display_order]);
    await safeInvoke("update_projects_order", { projectOrders }).catch(console.error);
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
            {projectsList.map((project, index) => {
              const isSelected = selectedProjectId === project.id;
              const isDisabled = isSettingsPage && !isSelected;
              const isDragging = draggingIndex === index;
              return (
                <li
                  key={project.id}
                  draggable={!isSettingsPage}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1 ${isDragging ? "opacity-10" : ""} ${!isSettingsPage ? "cursor-grab" : ""}`}
                >
                  {!isSettingsPage && (
                    <span className="text-[#4a4a4a] select-none flex-shrink-0" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        role="img"
                        aria-label="Arrastar para reordenar"
                      >
                        <circle cx="9" cy="5" r="2"></circle>
                        <circle cx="9" cy="12" r="2"></circle>
                        <circle cx="9" cy="19" r="2"></circle>
                        <circle cx="15" cy="5" r="2"></circle>
                        <circle cx="15" cy="12" r="2"></circle>
                        <circle cx="15" cy="19" r="2"></circle>
                      </svg>
                    </span>
                  )}
                  <button
                    type="button"
                    className={`flex-1 px-2 py-2 text-left text-sm transition-colors ${isSelected ? "bg-[#909d63] text-[#1c1c1c]" : isDisabled ? "text-[#4a4a4a] cursor-not-allowed opacity-50" : "text-[#d6d6d6] hover:bg-[#333333]"}`}
                    onClick={() => handleProjectClick(project.id)}
                    disabled={isDisabled}
                    title={isSettingsPage && isSelected ? "Voltar para projetos" : undefined}
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
                type="button"
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
