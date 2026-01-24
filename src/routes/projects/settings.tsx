import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, memo } from "react";
import { safeInvoke, isTauri } from "../../services/tauri";
import { trpc } from "../../services/trpc";
import { useDialogStateStore } from "../../stores/dialogState";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Select } from "../../components/Select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectWithConfig, ProjectRoute, TmuxTab } from "../../types";
import {
  ArrowLeft,
  FolderOpen,
  Palette,
  Route as RouteIcon,
  Terminal,
  FileText,
  Trash2,
  Plus,
  GripVertical,
  Check,
  Save,
  AlertTriangle,
  X,
} from "lucide-react";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
];

function getRouteNameFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "root";
}

type SectionProps = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  accentColor?: string;
  danger?: boolean;
};

const Section = memo(function Section({
  title,
  description,
  icon,
  children,
  className,
  headerAction,
  accentColor,
  danger,
}: SectionProps) {
  return (
    <div
      className={cn(
        "relative bg-card border border-border overflow-hidden",
        "animate-fade-in",
        danger && "border-destructive/30",
        className
      )}
      style={{
        animationDelay: "0.1s",
        animationFillMode: "forwards",
      }}
    >
      {accentColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{
            background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}60 100%)`,
          }}
        />
      )}

      <div
        className={cn(
          "flex items-center justify-between p-4 border-b border-border",
          accentColor && "pl-5"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 bg-background/60",
              danger && "text-destructive"
            )}
            style={
              accentColor
                ? { boxShadow: `inset 0 0 0 1px ${accentColor}30` }
                : undefined
            }
          >
            {icon}
          </div>
          <div>
            <h3
              className={cn(
                "text-sm font-medium uppercase tracking-wide",
                danger ? "text-destructive" : "text-foreground"
              )}
            >
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {headerAction}
      </div>

      <div className={cn("p-4", accentColor && "pl-5")}>{children}</div>
    </div>
  );
});

type ColorPickerWithPreviewProps = {
  value?: string;
  onChange: (color: string | undefined) => void;
  onSave: () => void;
  isSaving?: boolean;
  saved?: boolean;
};

const ColorPickerWithPreview = memo(function ColorPickerWithPreview({
  value,
  onChange,
  onSave,
  isSaving,
  saved,
}: ColorPickerWithPreviewProps) {
  const projectColor = value || "#909d63";

  return (
    <div className="space-y-4">
      <div
        className="relative p-4 bg-background/50 border border-border overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${projectColor}15 0%, transparent 60%)`,
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{
            background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}60 100%)`,
          }}
        />
        <div className="pl-3">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen size={16} style={{ color: projectColor }} />
            <span className="text-sm font-medium text-foreground">
              Preview do Projeto
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Assim ficará o card do projeto na listagem
          </p>

          <div className="mt-3 h-1 bg-secondary/60 overflow-hidden">
            <div
              className="h-full w-[65%]"
              style={{
                background: `linear-gradient(90deg, ${projectColor} 0%, ${projectColor}cc 100%)`,
                boxShadow: `0 0 8px ${projectColor}60`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-9 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "group relative w-8 h-8 transition-all duration-200",
              "hover:scale-110 hover:z-10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
            )}
            style={{ backgroundColor: color }}
            title={color}
          >
            {value === color && (
              <Check
                size={14}
                className="absolute inset-0 m-auto text-white drop-shadow-md"
              />
            )}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: `0 0 12px ${color}80` }}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Remover cor
          </button>
        )}
        <div className="flex-1" />
        {saved ? (
          <Badge variant="outline" className="gap-1.5 text-accent border-accent/40">
            <Check size={12} />
            Salvo
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2"
            style={{
              background: `linear-gradient(135deg, ${projectColor} 0%, ${projectColor}cc 100%)`,
            }}
          >
            <Save size={14} />
            {isSaving ? "Salvando..." : "Salvar cor"}
          </Button>
        )}
      </div>
    </div>
  );
});

type DraggableItemProps = {
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
};

const DraggableItem = memo(function DraggableItem({
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  children,
}: DraggableItemProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 bg-background/50 p-3 border border-border/50",
        "transition-all duration-200 cursor-grab list-none",
        "hover:bg-secondary/30 hover:border-border",
        isDragging && "opacity-30"
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <GripVertical
        size={14}
        className="text-muted-foreground/50 flex-shrink-0"
      />
      {children}
    </li>
  );
});

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

  const [colorSaved, setColorSaved] = useState(false);
  const [descriptionSaved, setDescriptionSaved] = useState(false);
  const [businessRulesSaved, setBusinessRulesSaved] = useState(false);

  const projectColor = projectConfig?.color || "#909d63";

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
        const projects = loaded.map((p) => ({
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
        title: "Selecionar diretório da rota",
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
      setDescriptionSaved(true);
      setTimeout(() => setDescriptionSaved(false), 2000);
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
      setBusinessRulesSaved(true);
      setTimeout(() => setBusinessRulesSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save business rules:", e);
    }
  }

  async function saveColor() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProjectId,
        color: projectConfig.color ?? undefined,
      });
      await utils.projects.list.invalidate();
      await utils.projects.get.invalidate({ id: selectedProjectId });
      setColorSaved(true);
      setTimeout(() => setColorSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save color:", e);
    }
  }

  function handleColorChange(color: string | undefined) {
    if (!projectConfig) return;
    setProjectConfig({ ...projectConfig, color });
    setColorSaved(false);
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
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!projectConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="p-4 bg-secondary/50">
            <FolderOpen size={32} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-medium">Nenhum projeto selecionado</p>
            <p className="text-muted-foreground text-sm mt-1">
              Selecione um projeto na lista para editar suas configurações
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/projects">Ver projetos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Confirmar exclusão"
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

      <div
        className="flex-shrink-0 border-b border-border animate-fade-in"
        style={{
          background: `linear-gradient(135deg, ${projectColor}10 0%, transparent 60%)`,
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="flex-shrink-0">
              <Link to="/projects" title="Voltar">
                <ArrowLeft size={18} />
              </Link>
            </Button>

            <div
              className="relative flex-1 pl-4"
              style={{
                borderLeft: `3px solid ${projectColor}`,
              }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen size={18} style={{ color: projectColor }} />
                <h1 className="text-xl text-foreground font-medium truncate">
                  {projectConfig.name}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 font-mono truncate">
                {projectConfig.path}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Section
            title="Descrição"
            description="Breve descrição do projeto para referência rápida"
            icon={<FileText size={16} className="text-muted-foreground" />}
          >
            <div className="space-y-3">
              <textarea
                value={projectConfig.description || ""}
                onChange={(e) =>
                  setProjectConfig({ ...projectConfig, description: e.target.value })
                }
                onBlur={saveDescription}
                placeholder="Descreva seu projeto aqui..."
                rows={3}
                className={cn(
                  "w-full px-3 py-2 bg-background border border-border text-foreground text-sm",
                  "resize-y focus:border-primary focus:outline-none transition-colors"
                )}
              />
              {descriptionSaved && (
                <Badge variant="outline" className="gap-1.5 text-accent border-accent/40">
                  <Check size={12} />
                  Salvo
                </Badge>
              )}
            </div>
          </Section>

          <Section
            title="Cor do Projeto"
            description="Escolha uma cor para identificar visualmente o projeto"
            icon={<Palette size={16} style={{ color: projectColor }} />}
            accentColor={projectColor}
          >
            <ColorPickerWithPreview
              value={projectConfig.color}
              onChange={handleColorChange}
              onSave={saveColor}
              isSaving={updateProjectMutation.isPending}
              saved={colorSaved}
            />
          </Section>

          <Section
            title="Rotas"
            description="Diretórios do projeto para navegação rápida"
            icon={<RouteIcon size={16} className="text-muted-foreground" />}
            headerAction={
              <Button variant="ghost" size="sm" onClick={addRoute} className="gap-1.5">
                <Plus size={14} />
                Adicionar
              </Button>
            }
          >
            <ul className="space-y-2">
              {getSortedRoutes().map((route, index) => {
                const routeName = getRouteNameFromPath(route.path);
                const isRoot = isRootRoute(route);
                const isDragging = draggingRouteIndex === index;

                return (
                  <DraggableItem
                    key={route.id}
                    isDragging={isDragging}
                    onDragStart={(e) => handleRouteDragStart(e, index)}
                    onDragOver={(e) => handleRouteDragOver(e, index)}
                    onDragEnd={handleRouteDragEnd}
                  >
                    <Badge
                      variant={isRoot ? "muted" : "outline"}
                      className="w-20 justify-center flex-shrink-0"
                    >
                      {isRoot ? "root" : routeName}
                    </Badge>
                    <input
                      type="text"
                      value={route.path}
                      onChange={(e) => updateRoutePath(route.id, e.target.value)}
                      onBlur={() => handleRoutePathChange(route)}
                      disabled={isRoot}
                      className={cn(
                        "flex-1 px-2 py-1 bg-transparent text-muted-foreground text-sm font-mono",
                        "border border-transparent focus:border-border focus:outline-none",
                        "disabled:text-muted-foreground/60"
                      )}
                    />
                    {route.env_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => route.env_path && openEnvFile(route.env_path)}
                        className="text-xs"
                      >
                        .env
                      </Button>
                    )}
                    {!isRoot && (
                      <button
                        type="button"
                        onClick={() => confirmRemoveRoute(route.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </DraggableItem>
                );
              })}
            </ul>
          </Section>

          <Section
            title="Tabs do Tmux"
            description={`Sessão: ${projectConfig.tmux_config.session_name}`}
            icon={<Terminal size={16} className="text-muted-foreground" />}
            headerAction={
              <Button variant="ghost" size="sm" onClick={addTmuxTab} className="gap-1.5">
                <Plus size={14} />
                Adicionar
              </Button>
            }
          >
            <ul className="space-y-2">
              {getSortedTabs().map((tab, index) => {
                const isOcTab = isRootTab(tab);
                const isDragging = draggingTabIndex === index;

                return (
                  <DraggableItem
                    key={tab.id}
                    isDragging={isDragging}
                    onDragStart={(e) => handleTabDragStart(e, index)}
                    onDragOver={(e) => handleTabDragOver(e, index)}
                    onDragEnd={handleTabDragEnd}
                  >
                    <span className="text-muted-foreground text-sm w-6 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={tab.name}
                      onChange={(e) => updateTabName(tab.id, e.target.value)}
                      onBlur={() => saveTmuxConfig(projectConfig.tmux_config)}
                      placeholder="nome"
                      className={cn(
                        "w-24 px-2 py-1 bg-transparent text-foreground text-sm",
                        "border border-transparent focus:border-border focus:outline-none"
                      )}
                    />
                    <span className="text-muted-foreground/50">→</span>
                    <Select
                      value={tab.route_id}
                      options={getRouteOptions()}
                      onChange={(newRouteId) => handleTabRouteChange(tab, newRouteId)}
                    />
                    <span className="text-muted-foreground/50 text-xs">cmd:</span>
                    <input
                      type="text"
                      value={tab.startup_command || ""}
                      onChange={(e) => updateTabCommand(tab.id, e.target.value)}
                      onBlur={() => saveTmuxConfig(projectConfig.tmux_config)}
                      placeholder="-"
                      className={cn(
                        "flex-1 px-2 py-1 bg-transparent text-muted-foreground text-sm font-mono",
                        "border border-transparent focus:border-border focus:outline-none"
                      )}
                    />
                    {!isOcTab && (
                      <button
                        type="button"
                        onClick={() => confirmRemoveTmuxTab(tab.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </DraggableItem>
                );
              })}
            </ul>
          </Section>

          <Section
            title="Resumo da Aplicação"
            description="Documente regras de negócio, arquitetura e contexto"
            icon={<FileText size={16} className="text-muted-foreground" />}
          >
            <div className="space-y-3">
              <textarea
                value={projectConfig.business_rules || ""}
                onChange={(e) =>
                  setProjectConfig({ ...projectConfig, business_rules: e.target.value })
                }
                onBlur={saveBusinessRules}
                placeholder="Documente aqui o resumo da aplicação, regras de negócio, arquitetura, etc..."
                rows={8}
                className={cn(
                  "w-full px-3 py-2 bg-background border border-border text-foreground text-sm",
                  "resize-y focus:border-primary focus:outline-none transition-colors"
                )}
              />
              {businessRulesSaved && (
                <Badge variant="outline" className="gap-1.5 text-accent border-accent/40">
                  <Check size={12} />
                  Salvo
                </Badge>
              )}
            </div>
          </Section>

          <Section
            title="Zona de Perigo"
            description="Ação irreversível - todos os dados serão perdidos"
            icon={<AlertTriangle size={16} />}
            danger
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Excluir projeto</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ao excluir, todas as tarefas associadas também serão removidas.
                </p>
              </div>
              <Button variant="destructive" onClick={confirmDeleteProject} className="gap-2">
                <Trash2 size={14} />
                Excluir Projeto
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/projects/settings")({
  component: SettingsPage,
});
