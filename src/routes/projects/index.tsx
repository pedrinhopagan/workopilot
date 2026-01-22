import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { safeInvoke, isTauri } from "../../services/tauri";
import { useDialogStateStore } from "../../stores/dialogState";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import type { Project, ProjectWithConfig, Task, TaskFull, SessionLog } from "../../types";
import { getTaskStatusColor, getTaskStatusLabel, isTaskAIWorking, getTaskStatusHighlight } from "../../lib/constants/taskStatus";
import { z } from "zod";

const priorities = [
  { value: 1, label: "Alta", color: "bg-[#bc5653]" },
  { value: 2, label: "Media", color: "bg-[#ebc17a]" },
  { value: 3, label: "Baixa", color: "bg-[#8b7355]" },
];

const searchSchema = z.object({
  newProject: z.string().optional(),
});

function ProjectsPage() {
  const search = useSearch({ from: "/projects/" });
  const openDialog = useDialogStateStore((s) => s.openDialog);
  const closeDialog = useDialogStateStore((s) => s.closeDialog);
  const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
  const projectsList = useSelectedProjectStore((s) => s.projectsList);
  const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

  const [projectConfig, setProjectConfig] = useState<ProjectWithConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(search.newProject === "true");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");

  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [activeTasksFullCache, setActiveTasksFullCache] = useState<Map<string, TaskFull>>(new Map());
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [dailyTokens, setDailyTokens] = useState(0);
  const tokenGoal = 100000;

  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");

  const tokenPercentage = Math.min((dailyTokens / tokenGoal) * 100, 100);
  const lastLog = logs.length > 0 ? logs[0] : null;
  const isTmuxConfigured = projectConfig
    ? projectConfig.tmux_configured || projectConfig.routes.length > 1
    : false;

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (search.newProject === "true") {
      setShowNewProjectForm(true);
    }
  }, [search.newProject]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectConfig(selectedProjectId);
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    try {
      const projects = await safeInvoke<Project[]>("get_projects");
      setProjectsList(projects);
      if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].id);
      }
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  }

  async function loadProjectConfig(id: string) {
    setIsLoading(true);
    try {
      const config = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: id });
      setProjectConfig(config);
      await loadUrgentTasks(id);
      await loadActiveTasks(id);
      await loadLogs(config);
    } catch (e) {
      console.error("Failed to load project config:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUrgentTasks(projectId: string) {
    try {
      const tasks = await safeInvoke<Task[]>("get_urgent_tasks", { projectId, limit: 5 });
      setUrgentTasks(tasks);
    } catch (e) {
      console.error("Failed to load urgent tasks:", e);
      setUrgentTasks([]);
    }
  }

  async function loadActiveTasks(projectId: string) {
    try {
      const tasks = await safeInvoke<Task[]>("get_active_tasks", { projectId, limit: 5 });
      setActiveTasks(tasks);
      
      if (projectConfig) {
        const newCache = new Map<string, TaskFull>();
        for (const task of tasks) {
          try {
            const taskFull = await safeInvoke<TaskFull>("get_task_full", { 
              projectPath: projectConfig.path, 
              taskId: task.id 
            });
            if (taskFull) {
              newCache.set(task.id, taskFull);
            }
          } catch {
          }
        }
        setActiveTasksFullCache(newCache);
      }
    } catch (e) {
      console.error("Failed to load active tasks:", e);
      setActiveTasks([]);
    }
  }

  async function loadLogs(config: ProjectWithConfig) {
    try {
      const allLogs = await safeInvoke<SessionLog[]>("get_session_logs");
      const projectLogs = allLogs.filter((log) => log.project_name === config.name).slice(0, 5);
      setLogs(projectLogs);
      setDailyTokens(allLogs.reduce((sum, log) => sum + log.tokens_total, 0));
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  }

  async function launchTmux() {
    if (!selectedProjectId) return;
    try {
      await safeInvoke("launch_project_tmux", { projectId: selectedProjectId });
    } catch (e) {
      console.error("Failed to launch tmux:", e);
    }
  }

  async function markTmuxConfigured() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await safeInvoke("set_tmux_configured", { projectId: selectedProjectId, configured: true });
      setProjectConfig({ ...projectConfig, tmux_configured: true });
    } catch (e) {
      console.error("Failed to mark tmux as configured:", e);
    }
  }

  async function selectPath() {
    if (!isTauri()) return;
    openDialog();
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false, title: "Selecionar diretorio do projeto" });
      if (selected && typeof selected === "string") {
        setNewProjectPath(selected);
        if (!newProjectName) {
          const parts = selected.split("/");
          setNewProjectName(parts[parts.length - 1] || "");
        }
      }
    } catch (e) {
      console.error("Failed to pick directory:", e);
    } finally {
      closeDialog();
    }
  }

  async function createProject() {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;
    try {
      const id = await safeInvoke<string>("add_project", {
        name: newProjectName,
        path: newProjectPath,
        description: null,
      });
      const loaded = await safeInvoke<Project[]>("get_projects");
      setProjectsList(loaded);
      setSelectedProjectId(id);
      setShowNewProjectForm(false);
      setNewProjectName("");
      setNewProjectPath("");
    } catch (e) {
      console.error("Failed to create project:", e);
    }
  }

  function startEditProjectName() {
    if (!projectConfig) return;
    setEditedProjectName(projectConfig.name);
    setIsEditingProjectName(true);
  }

  async function saveProjectName() {
    if (!selectedProjectId || !projectConfig || !editedProjectName.trim()) return;
    try {
      await safeInvoke("update_project_name", {
        projectId: selectedProjectId,
        name: editedProjectName.trim(),
      });
      setProjectConfig({ ...projectConfig, name: editedProjectName.trim() });
      const updated = projectsList.map((p) =>
        p.id === selectedProjectId ? { ...p, name: editedProjectName.trim() } : p
      );
      setProjectsList(updated);
    } catch (e) {
      console.error("Failed to update project name:", e);
    } finally {
      setIsEditingProjectName(false);
    }
  }

  function cancelEditProjectName() {
    setIsEditingProjectName(false);
    setEditedProjectName("");
  }

  function getPriorityClass(priority: number) {
    const p = priorities.find((pr) => pr.value === priority);
    return p?.color || "bg-[#8b7355]";
  }

  function formatTokens(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDueDate(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Atrasada";
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanha";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function isDueOverdue(dateStr: string | null) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {showNewProjectForm ? (
        <div className="max-w-xl bg-[#232323] border border-[#3d3a34] p-4">
          <h2 className="text-lg text-[#d6d6d6] mb-4">Novo Projeto</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#828282] mb-1">Nome</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="meu-projeto"
                className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#828282] mb-1">Caminho</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  placeholder="/home/user/projects/..."
                  className="flex-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
                />
                <button
                  onClick={selectPath}
                  className="px-3 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] hover:border-[#636363] transition-colors"
                >
                  ...
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={createProject}
                className="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setShowNewProjectForm(false);
                  setNewProjectName("");
                  setNewProjectPath("");
                }}
                className="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-full text-[#828282]">Carregando...</div>
      ) : projectConfig ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {isEditingProjectName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedProjectName}
                    onChange={(e) => setEditedProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveProjectName();
                      if (e.key === "Escape") cancelEditProjectName();
                    }}
                    className="px-2 py-1 bg-[#1c1c1c] border border-[#909d63] text-[#d6d6d6] text-xl focus:outline-none"
                  />
                  <button onClick={saveProjectName} className="text-[#909d63] hover:text-[#a0ad73] text-sm">
                    ok
                  </button>
                  <button onClick={cancelEditProjectName} className="text-[#636363] hover:text-[#828282] text-sm">
                    x
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl text-[#d6d6d6]">{projectConfig.name}</h2>
                  <button
                    onClick={startEditProjectName}
                    className="text-[#636363] hover:text-[#909d63] text-xs transition-colors"
                    title="Editar nome"
                  >
                    *
                  </button>
                </div>
              )}
              <p className="text-sm text-[#636363]">{projectConfig.path}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={launchTmux}
                className="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors flex items-center gap-2"
              >
                Codar
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <a
                href={`/projects/settings?projectId=${selectedProjectId}`}
                className="px-3 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] hover:border-[#636363] transition-colors flex items-center"
                title="Configuracoes do projeto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </a>
            </div>
          </div>

          {activeTasks.length > 0 && (
            <div className="bg-[#232323] border border-[#3d3a34] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-[#828282] uppercase tracking-wide">Tarefas em Andamento</h3>
                <Link to="/tasks" className="text-xs text-[#636363] hover:text-[#909d63] transition-colors">
                  ver todas
                </Link>
              </div>

              <div className="space-y-2">
                {activeTasks.map((task) => {
                  const taskFull = activeTasksFullCache.get(task.id) || null;
                  const statusColor = getTaskStatusColor(taskFull);
                  const statusLabel = getTaskStatusLabel(taskFull);
                  const highlight = getTaskStatusHighlight(taskFull);
                  const isAIWorking = isTaskAIWorking(taskFull);

                  const highlightClasses = highlight === "ring" 
                    ? "ring-1" 
                    : highlight === "border-l" 
                      ? "border-l-4" 
                      : "";

                  return (
                    <Link
                      key={task.id}
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className={`flex items-center gap-3 px-3 py-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] transition-colors ${highlightClasses}`}
                      style={{ 
                        ...(highlight === "border-l" ? { borderLeftColor: statusColor } : {}),
                        ...(highlight === "ring" ? { boxShadow: `0 0 0 1px ${statusColor}` } : {})
                      }}
                    >
                      {isAIWorking && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#61afef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin flex-shrink-0">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      )}
                      <span className="flex-1 text-[#d6d6d6] text-sm">{task.title}</span>
                      <span
                        className="px-2 py-0.5 text-xs text-[#1c1c1c] rounded"
                        style={{ backgroundColor: statusColor }}
                      >
                        {statusLabel}
                      </span>
                      <span className={`px-2 py-0.5 text-xs text-[#1c1c1c] ${getPriorityClass(task.priority)}`}>
                        P{task.priority}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-[#232323] border border-[#3d3a34] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-[#828282] uppercase tracking-wide">Tarefas Urgentes</h3>
              <Link to="/tasks" className="text-xs text-[#636363] hover:text-[#909d63] transition-colors">
                ver todas
              </Link>
            </div>

            {urgentTasks.length > 0 ? (
              <div className="space-y-2">
                {urgentTasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    className="flex items-center gap-3 px-3 py-2 bg-[#1c1c1c] border border-[#2d2a24] hover:bg-[#2a2a2a] transition-colors"
                  >
                    <span className="flex-1 text-[#d6d6d6] text-sm">{task.title}</span>
                    {task.due_date && (
                      <span className={`text-xs ${isDueOverdue(task.due_date) ? "text-[#bc5653]" : "text-[#636363]"}`}>
                        {formatDueDate(task.due_date)}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs text-[#1c1c1c] ${getPriorityClass(task.priority)}`}>
                      P{task.priority}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-[#636363] text-sm mb-3">Nenhuma tarefa pendente</p>
                <Link
                  to="/tasks"
                  className="inline-block px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors"
                >
                  + Adicionar tarefa
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-col xs:flex-row gap-4">
            <div className="flex-1 bg-[#232323] border border-[#3d3a34] p-4">
              <h3 className="text-sm text-[#828282] uppercase tracking-wide mb-3">Tokens Diario</h3>
              <div className="h-2 bg-[#2c2c2c] overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-[#909d63] to-[#c67b5c] transition-all"
                  style={{ width: `${tokenPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-[#636363]">
                <span>{formatTokens(dailyTokens)}</span>
                <span>Meta: {formatTokens(tokenGoal)}</span>
              </div>
            </div>

            <div className="flex-1 bg-[#232323] border border-[#3d3a34] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-[#828282] uppercase tracking-wide">Ultimo Log</h3>
                <Link to="/logs" className="text-xs text-[#636363] hover:text-[#909d63] transition-colors">
                  ver todos
                </Link>
              </div>
              {lastLog ? (
                <>
                  <p className="text-sm text-[#d6d6d6] line-clamp-2">{lastLog.summary || "Sem resumo"}</p>
                  <p className="text-xs text-[#636363] mt-2">
                    {formatDate(lastLog.created_at)} - {formatTokens(lastLog.tokens_total)} tokens
                  </p>
                </>
              ) : (
                <p className="text-[#636363] text-sm">Nenhum log registrado</p>
              )}
            </div>
          </div>

          <div className="bg-[#232323] border border-[#3d3a34] p-4">
            <h3 className="text-sm text-[#828282] uppercase tracking-wide mb-3">Tarefas da Semana</h3>
            <div className="flex items-center justify-center py-6 text-center">
              <div>
                <div className="text-3xl mb-2">📅</div>
                <p className="text-[#636363] text-sm">Em desenvolvimento</p>
                <p className="text-xs text-[#4a4a4a] mt-1">Calendario com distribuicao de tarefas</p>
              </div>
            </div>
          </div>

          <div className="bg-[#232323] border border-[#3d3a34] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-[#828282] uppercase tracking-wide">Configuracao Tmux</h3>
              <a
                href={`/projects/settings?projectId=${selectedProjectId}`}
                className="text-xs text-[#636363] hover:text-[#909d63] transition-colors"
              >
                configurar
              </a>
            </div>

            {isTmuxConfigured ? (
              <div className="flex items-center gap-3">
                <span className="text-[#909d63]">✓</span>
                <span className="text-[#d6d6d6] text-sm">Tmux configurado</span>
                <span className="text-xs text-[#636363]">
                  {projectConfig.routes.length} rota(s), {projectConfig.tmux_config.tabs.length} tab(s)
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#ebc17a]">!</span>
                  <span className="text-[#d6d6d6] text-sm">Tmux nao configurado</span>
                </div>
                <button
                  onClick={markTmuxConfigured}
                  className="text-xs text-[#909d63] hover:text-[#a0ad73] transition-colors"
                >
                  Marcar como configurado
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-[#828282]">
          Selecione um projeto ou crie um novo
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  validateSearch: (search) => searchSchema.parse(search),
});
