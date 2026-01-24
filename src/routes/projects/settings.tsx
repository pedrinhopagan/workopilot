import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { safeInvoke, isTauri } from "../../services/tauri";
import { trpc } from "../../services/trpc";
import { useDialogStateStore } from "../../stores/dialogState";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Select } from "../../components/Select";
import { ColorPicker } from "../../components/ui/color-picker";
import type { ProjectWithConfig, ProjectRoute, TmuxTab } from "../../types";

function getRouteNameFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "root";
}

function SettingsPage() {
  const navigate = useNavigate();
  const openDialog = useDialogStateStore((s) => s.openDialog);
  const closeDialog = useDialogStateStore((s) => s.closeDialog);
  const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
  const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

  const utils = trpc.useUtils();
  const { data: fetchedConfig, isLoading } = trpc.projects.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const [localConfig, setLocalConfig] = useState<ProjectWithConfig | null>(null);
  const projectConfig = localConfig ?? (fetchedConfig as ProjectWithConfig | null) ?? null;

  const updateProjectMutation = trpc.projects.update.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "project" | "route" | "tab";
    id: string;
    name: string;
  } | null>(null);

  const [draggingRouteIndex, setDraggingRouteIndex] = useState<number | null>(null);
  const [draggingTabIndex, setDraggingTabIndex] = useState<number | null>(null);
  const lastRouteSwapRef = useRef(0);
  const lastTabSwapRef = useRef(0);

  function setProjectConfig(config: ProjectWithConfig | null) {
    setLocalConfig(config);
  }

  async function openEnvFile(path: string) {
    try {
      await safeInvoke("open_env_file", { path });
    } catch (e) {
      console.error("Failed to open env file:", e);
    }
  }

  function confirmDeleteProject() {
    if (!projectConfig) return;
    setDeleteTarget({ type: "project", id: projectConfig.id, name: projectConfig.name });
    setShowDeleteConfirm(true);
  }

  async function executeDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "project") {
        await deleteProjectMutation.mutateAsync({ id: deleteTarget.id });
        setSelectedProjectId(null);
        await utils.projects.list.invalidate();
        const loaded = utils.projects.list.getData() ?? [];
        const projects = loaded.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description ?? undefined,
          display_order: p.display_order,
          created_at: p.created_at,
          color: p.color ?? undefined,
        }));
        setProjectsList(projects);
        navigate({ to: "/projects" });
      } else if (deleteTarget.type === "route") {
        await removeRoute(deleteTarget.id);
      } else if (deleteTarget.type === "tab") {
        await removeTmuxTab(deleteTarget.id);
      }
    } catch (e) {
      console.error("Failed to delete:", e);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  }

  async function addRoute() {
    if (!projectConfig || !isTauri()) return;

    try {
      openDialog();
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecionar diretorio da rota",
        defaultPath: projectConfig.path,
      });

      if (!selected || typeof selected !== "string") {
        closeDialog();
        return;
      }

      const newRoute: ProjectRoute = {
        id: crypto.randomUUID(),
        path: selected,
        order: projectConfig.routes.length,
        env_path: undefined,
      };

      const updatedConfig = {
        ...projectConfig,
        routes: [...projectConfig.routes, newRoute],
      };
      setProjectConfig(updatedConfig);
      await saveRoutes(updatedConfig.routes);
      await createTmuxTabForRoute(newRoute, updatedConfig);
    } catch (e) {
      console.error("Failed to add route:", e);
    } finally {
      closeDialog();
    }
  }

  async function createTmuxTabForRoute(route: ProjectRoute, config: ProjectWithConfig) {
    const routeName = getRouteNameFromPath(route.path);
    const tabs = config.tmux_config.tabs;

    let insertPosition = 1;
    const termTabIndex = tabs.findIndex((t) => t.name.toLowerCase() === "term");
    if (termTabIndex > 0) {
      insertPosition = termTabIndex;
    } else if (tabs.length > 1) {
      insertPosition = tabs.length - 1;
    } else {
      insertPosition = tabs.length;
    }

    const newTab: TmuxTab = {
      id: crypto.randomUUID(),
      name: routeName,
      route_id: route.id,
      startup_command: undefined,
      order: insertPosition,
    };

    const newTabs = [...tabs];
    newTabs.splice(insertPosition, 0, newTab);

    for (let i = 0; i < newTabs.length; i++) {
      newTabs[i] = { ...newTabs[i], order: i };
    }

    const updatedConfig = {
      ...config,
      tmux_config: { ...config.tmux_config, tabs: newTabs },
    };
    setProjectConfig(updatedConfig);
    await saveTmuxConfig(updatedConfig.tmux_config);
  }

  function isRootRoute(route: ProjectRoute) {
    return route.path === projectConfig?.path;
  }

  function confirmRemoveRoute(routeId: string) {
    if (!projectConfig) return;
    const route = projectConfig.routes.find((r) => r.id === routeId);
    if (!route || isRootRoute(route)) return;

    const routeName = getRouteNameFromPath(route.path);
    setDeleteTarget({ type: "route", id: routeId, name: routeName });
    setShowDeleteConfirm(true);
  }

  async function removeRoute(routeId: string) {
    if (!projectConfig) return;

    const route = projectConfig.routes.find((r) => r.id === routeId);
    if (!route || isRootRoute(route)) return;

    const newRoutes = projectConfig.routes.filter((r) => r.id !== routeId);
    const newTabs = projectConfig.tmux_config.tabs.filter((t) => t.route_id !== routeId);

    for (let i = 0; i < newRoutes.length; i++) {
      newRoutes[i] = { ...newRoutes[i], order: i };
    }

    for (let i = 0; i < newTabs.length; i++) {
      newTabs[i] = { ...newTabs[i], order: i };
    }

    const updatedConfig = {
      ...projectConfig,
      routes: newRoutes,
      tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
    };
    setProjectConfig(updatedConfig);
    await saveRoutes(newRoutes);
    await saveTmuxConfig(updatedConfig.tmux_config);
  }

  function handleRouteDragStart(e: React.DragEvent, index: number) {
    setDraggingRouteIndex(index);
    if (e.dataTransfer && e.target instanceof HTMLElement) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");

      const clone = e.target.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.top = "-9999px";
      clone.style.opacity = "1";
      clone.style.background = "var(--background)";
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setTimeout(() => clone.remove(), 0);
    }
  }

  function handleRouteDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggingRouteIndex === null || draggingRouteIndex === index || !projectConfig) return;

    const now = Date.now();
    if (now - lastRouteSwapRef.current < 100) return;
    lastRouteSwapRef.current = now;

    const routes = [...projectConfig.routes];
    const [draggedRoute] = routes.splice(draggingRouteIndex, 1);
    routes.splice(index, 0, draggedRoute);

    for (let i = 0; i < routes.length; i++) {
      routes[i] = { ...routes[i], order: i };
    }

    setProjectConfig({ ...projectConfig, routes });
    setDraggingRouteIndex(index);
  }

  async function handleRouteDragEnd() {
    setDraggingRouteIndex(null);
    if (projectConfig) {
      await saveRoutes(projectConfig.routes);
    }
  }

  function handleTabDragStart(e: React.DragEvent, index: number) {
    setDraggingTabIndex(index);
    if (e.dataTransfer && e.target instanceof HTMLElement) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");

      const clone = e.target.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.top = "-9999px";
      clone.style.opacity = "1";
      clone.style.background = "var(--background)";
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setTimeout(() => clone.remove(), 0);
    }
  }

  function handleTabDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggingTabIndex === null || draggingTabIndex === index || !projectConfig) return;

    const now = Date.now();
    if (now - lastTabSwapRef.current < 100) return;
    lastTabSwapRef.current = now;

    const tabs = [...projectConfig.tmux_config.tabs];
    const [draggedTab] = tabs.splice(draggingTabIndex, 1);
    tabs.splice(index, 0, draggedTab);

    for (let i = 0; i < tabs.length; i++) {
      tabs[i] = { ...tabs[i], order: i };
    }

    setProjectConfig({
      ...projectConfig,
      tmux_config: { ...projectConfig.tmux_config, tabs },
    });
    setDraggingTabIndex(index);
  }

  async function handleTabDragEnd() {
    setDraggingTabIndex(null);
    if (projectConfig) {
      await saveTmuxConfig(projectConfig.tmux_config);
    }
  }

  async function saveRoutes(routes: ProjectRoute[]) {
    if (!selectedProjectId) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        routes: JSON.stringify(routes),
      });
    } catch (e) {
      console.error("Failed to save routes:", e);
    }
  }

  async function addTmuxTab() {
    if (!projectConfig) return;

    const usedRouteIds = new Set(projectConfig.tmux_config.tabs.map((t) => t.route_id));
    const availableRoute = projectConfig.routes.find((r) => !usedRouteIds.has(r.id));
    const targetRoute = availableRoute || projectConfig.routes[0];

    if (!targetRoute) return;

    const routeName = getRouteNameFromPath(targetRoute.path);
    const tabs = projectConfig.tmux_config.tabs;

    const termTabIndex = tabs.findIndex((t) => t.name.toLowerCase() === "term");
    const insertPosition = termTabIndex > 0 ? termTabIndex : tabs.length;

    const newTab: TmuxTab = {
      id: crypto.randomUUID(),
      name: routeName,
      route_id: targetRoute.id,
      startup_command: undefined,
      order: insertPosition,
    };

    const newTabs = [...tabs];
    newTabs.splice(insertPosition, 0, newTab);

    for (let i = 0; i < newTabs.length; i++) {
      newTabs[i] = { ...newTabs[i], order: i };
    }

    const updatedConfig = {
      ...projectConfig,
      tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
    };
    setProjectConfig(updatedConfig);
    await saveTmuxConfig(updatedConfig.tmux_config);
  }

  function isRootTab(tab: TmuxTab) {
    if (!projectConfig) return false;
    const rootRoute = projectConfig.routes.find((r) => isRootRoute(r));
    return rootRoute ? tab.route_id === rootRoute.id && tab.name === "oc" : false;
  }

  function confirmRemoveTmuxTab(tabId: string) {
    if (!projectConfig) return;
    const tab = projectConfig.tmux_config.tabs.find((t) => t.id === tabId);
    if (!tab || isRootTab(tab)) return;

    setDeleteTarget({ type: "tab", id: tabId, name: tab.name });
    setShowDeleteConfirm(true);
  }

  async function removeTmuxTab(tabId: string) {
    if (!projectConfig) return;

    const tab = projectConfig.tmux_config.tabs.find((t) => t.id === tabId);
    if (!tab || isRootTab(tab)) return;

    const newTabs = projectConfig.tmux_config.tabs.filter((t) => t.id !== tabId);
    for (let i = 0; i < newTabs.length; i++) {
      newTabs[i] = { ...newTabs[i], order: i };
    }

    const updatedConfig = {
      ...projectConfig,
      tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
    };
    setProjectConfig(updatedConfig);
    await saveTmuxConfig(updatedConfig.tmux_config);
  }

  async function saveTmuxConfig(tmuxConfig: ProjectWithConfig["tmux_config"]) {
    if (!selectedProjectId) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        tmux_config: JSON.stringify(tmuxConfig),
      });
    } catch (e) {
      console.error("Failed to save tmux config:", e);
    }
  }

  async function saveDescription() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        name: projectConfig.name,
        description: projectConfig.description ?? undefined,
      });
    } catch (e) {
      console.error("Failed to save description:", e);
    }
  }

  async function saveBusinessRules() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        business_rules: projectConfig.business_rules ?? undefined,
      });
    } catch (e) {
      console.error("Failed to save business rules:", e);
    }
  }

  async function saveColor(color: string | undefined) {
    if (!selectedProjectId || !projectConfig) return;
    setProjectConfig({ ...projectConfig, color });
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        color: color ?? undefined,
      });
    } catch (e) {
      console.error("Failed to save color:", e);
    }
  }

  async function handleRoutePathChange(route: ProjectRoute) {
    if (!projectConfig) return;
    await saveRoutes(projectConfig.routes);

    const existingTab = projectConfig.tmux_config.tabs.find((t) => t.route_id === route.id);
    if (existingTab) {
      const newName = getRouteNameFromPath(route.path);
      const newTabs = projectConfig.tmux_config.tabs.map((t) =>
        t.id === existingTab.id ? { ...t, name: newName } : t
      );
      const updatedConfig = {
        ...projectConfig,
        tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
      };
      setProjectConfig(updatedConfig);
      await saveTmuxConfig(updatedConfig.tmux_config);
    }
  }

  async function handleTabRouteChange(tab: TmuxTab, newRouteId: string) {
    if (!projectConfig) return;
    const route = projectConfig.routes.find((r) => r.id === newRouteId);
    const newName = route ? getRouteNameFromPath(route.path) : tab.name;

    const newTabs = projectConfig.tmux_config.tabs.map((t) =>
      t.id === tab.id ? { ...t, route_id: newRouteId, name: newName } : t
    );
    const updatedConfig = {
      ...projectConfig,
      tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
    };
    setProjectConfig(updatedConfig);
    await saveTmuxConfig(updatedConfig.tmux_config);
  }

  function getRouteOptions() {
    if (!projectConfig) return [];
    return projectConfig.routes.map((r) => ({ value: r.id, label: getRouteNameFromPath(r.path) }));
  }

  function getSortedRoutes() {
    if (!projectConfig) return [];
    return [...projectConfig.routes].sort((a, b) => a.order - b.order);
  }

  function getSortedTabs() {
    if (!projectConfig) return [];
    return [...projectConfig.tmux_config.tabs].sort((a, b) => a.order - b.order);
  }

  function updateRoutePath(routeId: string, newPath: string) {
    if (!projectConfig) return;
    const newRoutes = projectConfig.routes.map((r) =>
      r.id === routeId ? { ...r, path: newPath } : r
    );
    setProjectConfig({ ...projectConfig, routes: newRoutes });
  }

  function updateTabName(tabId: string, newName: string) {
    if (!projectConfig) return;
    const newTabs = projectConfig.tmux_config.tabs.map((t) =>
      t.id === tabId ? { ...t, name: newName } : t
    );
    setProjectConfig({
      ...projectConfig,
      tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
    });
  }

  function updateTabCommand(tabId: string, newCommand: string) {
    if (!projectConfig) return;
    const newTabs = projectConfig.tmux_config.tabs.map((t) =>
      t.id === tabId ? { ...t, startup_command: newCommand || undefined } : t
    );
    setProjectConfig({
      ...projectConfig,
      tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">Carregando...</div>
    );
  }

  if (!projectConfig) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Selecione um projeto
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Confirmar exclusao"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir ${deleteTarget.type === "project" ? "o projeto" : deleteTarget.type === "route" ? "a rota" : "a tab"} "${deleteTarget.name}"?`
            : ""
        }
        confirmText="Excluir"
        onConfirm={executeDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        danger={true}
      />

      <div className="flex-shrink-0 p-4 pb-2 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="p-1 text-muted-foreground hover:text-primary hover:bg-popover transition-colors"
            title="Voltar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </Link>
          <div>
            <h2 className="text-xl text-foreground">Configuracoes: {projectConfig.name}</h2>
            <p className="text-sm text-muted-foreground">{projectConfig.path}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="bg-card border border-border p-4">
            <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Descricao do Projeto
            </h3>
            <textarea
              value={projectConfig.description || ""}
              onChange={(e) =>
                setProjectConfig({ ...projectConfig, description: e.target.value })
              }
              onBlur={saveDescription}
              placeholder="Breve descricao do projeto..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm resize-y focus:border-primary focus:outline-none"
            />
          </div>

          <div className="bg-card border border-border p-4">
            <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Cor do Projeto
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Escolha uma cor para identificar visualmente este projeto na lista de tarefas.
            </p>
            <ColorPicker
              value={projectConfig.color}
              onChange={saveColor}
            />
          </div>

          <div className="bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-muted-foreground uppercase tracking-wide">Rotas</h3>
              <button
                onClick={addRoute}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                + Adicionar
              </button>
            </div>

            <div className="space-y-1" role="list">
              {getSortedRoutes().map((route, index) => {
                const routeName = getRouteNameFromPath(route.path);
                const isRoot = isRootRoute(route);
                const isDragging = draggingRouteIndex === index;
                return (
                  <div
                    key={route.id}
                    role="listitem"
                    className={`flex items-center gap-2 bg-background p-2 border border-muted cursor-grab ${isDragging ? "opacity-10" : ""}`}
                    draggable
                    onDragStart={(e) => handleRouteDragStart(e, index)}
                    onDragOver={(e) => handleRouteDragOver(e, index)}
                    onDragEnd={handleRouteDragEnd}
                  >
                    <span className="text-muted-foreground/50 cursor-grab select-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="9" cy="5" r="2"></circle>
                        <circle cx="9" cy="12" r="2"></circle>
                        <circle cx="9" cy="19" r="2"></circle>
                        <circle cx="15" cy="5" r="2"></circle>
                        <circle cx="15" cy="12" r="2"></circle>
                        <circle cx="15" cy="19" r="2"></circle>
                      </svg>
                    </span>
                    <span
                      className={`w-24 px-2 py-1 text-sm ${isRoot ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {isRoot ? "root" : routeName}
                    </span>
                    <input
                      type="text"
                      value={route.path}
                      onChange={(e) => updateRoutePath(route.id, e.target.value)}
                      onBlur={() => handleRoutePathChange(route)}
                      disabled={isRoot}
                      className="flex-1 px-2 py-1 bg-transparent border border-transparent text-muted-foreground text-sm focus:border-border focus:outline-none disabled:text-muted-foreground"
                    />
                    {route.env_path && (
                      <button
                        onClick={() => route.env_path && openEnvFile(route.env_path)}
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors"
                      >
                        .env
                      </button>
                    )}
                    {!isRoot && (
                      <button
                        onClick={() => confirmRemoveRoute(route.id)}
                        className="px-2 py-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide">Tabs do Tmux</h3>
                <p className="text-xs text-muted-foreground">
                  Session: {projectConfig.tmux_config.session_name}
                </p>
              </div>
              <button
                onClick={addTmuxTab}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                + Adicionar
              </button>
            </div>

            <div className="space-y-1" role="list">
              {getSortedTabs().map((tab, index) => {
                const isOcTab = isRootTab(tab);
                const isDragging = draggingTabIndex === index;
                return (
                  <div
                    key={tab.id}
                    role="listitem"
                    className={`flex items-center gap-2 bg-background p-2 border border-muted cursor-grab ${isDragging ? "opacity-10" : ""}`}
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, index)}
                    onDragOver={(e) => handleTabDragOver(e, index)}
                    onDragEnd={handleTabDragEnd}
                  >
                    <span className="text-muted-foreground/50 cursor-grab select-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="9" cy="5" r="2"></circle>
                        <circle cx="9" cy="12" r="2"></circle>
                        <circle cx="9" cy="19" r="2"></circle>
                        <circle cx="15" cy="5" r="2"></circle>
                        <circle cx="15" cy="12" r="2"></circle>
                        <circle cx="15" cy="19" r="2"></circle>
                      </svg>
                    </span>
                    <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={tab.name}
                      onChange={(e) => updateTabName(tab.id, e.target.value)}
                      onBlur={() => saveTmuxConfig(projectConfig.tmux_config)}
                      placeholder="nome"
                      className="w-24 px-2 py-1 bg-transparent border border-transparent text-foreground text-sm focus:border-border focus:outline-none"
                    />
                    <span className="text-muted-foreground">-&gt;</span>
                    <Select
                      value={tab.route_id}
                      options={getRouteOptions()}
                      onChange={(newRouteId) => handleTabRouteChange(tab, newRouteId)}
                    />
                    <span className="text-muted-foreground text-xs">cmd:</span>
                    <input
                      type="text"
                      value={tab.startup_command || ""}
                      onChange={(e) => updateTabCommand(tab.id, e.target.value)}
                      onBlur={() => saveTmuxConfig(projectConfig.tmux_config)}
                      placeholder="-"
                      className="flex-1 px-2 py-1 bg-transparent border border-transparent text-muted-foreground text-sm focus:border-border focus:outline-none"
                    />
                    {!isOcTab && (
                      <button
                        onClick={() => confirmRemoveTmuxTab(tab.id)}
                        className="px-2 py-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border p-4">
            <h3 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Resumo da Aplicacao
            </h3>
            <textarea
              value={projectConfig.business_rules || ""}
              onChange={(e) =>
                setProjectConfig({ ...projectConfig, business_rules: e.target.value })
              }
              onBlur={saveBusinessRules}
              placeholder="Documente aqui o resumo da aplicacao, regras de negocio, arquitetura, etc..."
              rows={8}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm resize-y focus:border-primary focus:outline-none"
            />
          </div>

          <div className="bg-card border border-destructive/30 p-4">
            <h3 className="text-sm text-destructive uppercase tracking-wide mb-3">Zona de Perigo</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Acao irreversivel. Ao excluir o projeto, todas as tarefas associadas tambem serao
              removidas.
            </p>
            <button
              onClick={confirmDeleteProject}
              className="px-4 py-2 bg-popover border border-destructive text-destructive text-sm hover:bg-destructive hover:text-background transition-colors"
            >
              Excluir Projeto
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/projects/settings")({
  component: SettingsPage,
});
