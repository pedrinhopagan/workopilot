import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { safeInvoke } from "../../../services/tauri";
import { trpc } from "../../../services/trpc";
import { useSelectedProjectStore } from "../../../stores/selectedProject";
import type { ProjectWithConfig, TaskFull } from "../../../types";
import { 
	getTaskProgressStateContainerClass, 
	getTaskProgressStateLabel, 
	getTaskProgressStateBadgeVariant,
	getTaskProgressStateIndicator 
} from "../../../lib/constants/taskStatus";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ChevronRight, Settings, Loader2 } from "lucide-react";

const priorities = [
	{ value: 1, label: "Alta", className: "bg-destructive" },
	{ value: 2, label: "Media", className: "bg-accent" },
	{ value: 3, label: "Baixa", className: "bg-muted-foreground" },
];

type ProjectDashboardProps = {
	projectConfig: ProjectWithConfig;
	selectedProjectId: string;
};

export function ProjectDashboard({ projectConfig, selectedProjectId }: ProjectDashboardProps) {
	const projectsList = useSelectedProjectStore((s) => s.projectsList);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const { data: allUrgentTasks = [] } = trpc.tasks.listUrgent.useQuery();
	const { data: allActiveTasks = [] } = trpc.tasks.listActive.useQuery();

	const updateProjectMutation = trpc.projects.update.useMutation();

	const urgentTasks = allUrgentTasks
		.filter(t => t.project_id === selectedProjectId)
		.slice(0, 5);
	const activeTasks = allActiveTasks
		.filter(t => t.project_id === selectedProjectId)
		.slice(0, 5);

	const activeTaskFullQueries = trpc.useQueries(t =>
		activeTasks.map(task => t.tasks.getFull({ id: task.id }))
	);
	const activeTasksFullCache = new Map<string, TaskFull>();
	for (let i = 0; i < activeTasks.length; i++) {
		const result = activeTaskFullQueries[i];
		if (result?.data) {
			activeTasksFullCache.set(activeTasks[i].id, result.data);
		}
	}

	const [isEditingProjectName, setIsEditingProjectName] = useState(false);
	const [editedProjectName, setEditedProjectName] = useState("");
	const [localProjectConfig, setLocalProjectConfig] = useState(projectConfig);

	const isTmuxConfigured = localProjectConfig
		? localProjectConfig.tmux_configured || localProjectConfig.routes.length > 1
		: false;

	if (projectConfig !== localProjectConfig && projectConfig.id !== localProjectConfig?.id) {
		setLocalProjectConfig(projectConfig);
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
		if (!selectedProjectId || !localProjectConfig) return;
		try {
			await updateProjectMutation.mutateAsync({ id: selectedProjectId, tmux_configured: true });
			setLocalProjectConfig({ ...localProjectConfig, tmux_configured: true });
		} catch (e) {
			console.error("Failed to mark tmux as configured:", e);
		}
	}

	function startEditProjectName() {
		if (!localProjectConfig) return;
		setEditedProjectName(localProjectConfig.name);
		setIsEditingProjectName(true);
	}

	async function saveProjectName() {
		if (!selectedProjectId || !localProjectConfig || !editedProjectName.trim()) return;
		try {
			await updateProjectMutation.mutateAsync({
				id: selectedProjectId,
				name: editedProjectName.trim(),
			});
			setLocalProjectConfig({ ...localProjectConfig, name: editedProjectName.trim() });
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
		return p?.className || "bg-muted-foreground";
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
								className="px-2 py-1 bg-background border border-primary text-foreground text-xl focus:outline-none"
							/>
							<button type="button" onClick={saveProjectName} className="text-primary hover:text-primary/80 text-sm">
								ok
							</button>
							<button type="button" onClick={cancelEditProjectName} className="text-muted-foreground hover:text-foreground text-sm">
								x
							</button>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<h2 className="text-xl text-foreground">{localProjectConfig.name}</h2>
							<button
								type="button"
								onClick={startEditProjectName}
								className="text-muted-foreground hover:text-primary text-xs transition-colors"
								title="Editar nome"
							>
								*
							</button>
						</div>
					)}
					<p className="text-sm text-muted-foreground">{localProjectConfig.path}</p>
					{localProjectConfig.description && (
						<p className="text-sm text-foreground/80 mt-1">{localProjectConfig.description}</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button onClick={launchTmux} className="flex items-center gap-2">
						Codar
						<ChevronRight className="size-4" />
					</Button>
					<Button variant="outline" size="icon" asChild>
						<Link
							to="/projects/settings"
							search={{ projectId: selectedProjectId }}
							title="Configuracoes do projeto"
						>
							<Settings className="size-4" />
						</Link>
					</Button>
				</div>
			</div>

			{localProjectConfig.business_rules && localProjectConfig.business_rules.trim() && (
				<Card>
					<CardHeader className="py-3">
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resumo da Aplicacao</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<p className="text-sm text-foreground whitespace-pre-wrap">{localProjectConfig.business_rules}</p>
					</CardContent>
				</Card>
			)}

			{activeTasks.length > 0 && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between py-3">
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Tarefas em Andamento</CardTitle>
						<Link to="/tasks" className="text-xs text-muted-foreground hover:text-primary transition-colors">
							ver todas
						</Link>
					</CardHeader>
					<CardContent className="space-y-2 pt-0">
						{activeTasks.map((task) => {
							const taskFull = activeTasksFullCache.get(task.id) || null;
							const containerClass = getTaskProgressStateContainerClass(taskFull);
							const progressLabel = getTaskProgressStateLabel(taskFull);
							const badgeVariant = getTaskProgressStateBadgeVariant(taskFull);
							const indicator = getTaskProgressStateIndicator(taskFull);

							return (
								<Link
									key={task.id}
									to="/tasks/$taskId"
									params={{ taskId: task.id }}
									className={cn(
										"flex items-center gap-3 px-3 py-2 transition-colors",
										containerClass
									)}
								>
									{indicator === "spinner" && (
										<Loader2 className="size-4 animate-spin flex-shrink-0 text-chart-4" aria-label="IA trabalhando" />
									)}
									<span className="flex-1 text-foreground text-sm">{task.title}</span>
									<Badge variant={badgeVariant}>
										{progressLabel}
									</Badge>
									<Badge className={getPriorityClass(task.priority)}>
										P{task.priority}
									</Badge>
								</Link>
							);
						})}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className="flex flex-row items-center justify-between py-3">
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Tarefas Urgentes</CardTitle>
					<Link to="/tasks" className="text-xs text-muted-foreground hover:text-primary transition-colors">
						ver todas
					</Link>
				</CardHeader>
				<CardContent className="pt-0">
					{urgentTasks.length > 0 ? (
						<div className="space-y-2">
							{urgentTasks.map((task) => (
								<Link
									key={task.id}
									to="/tasks/$taskId"
									params={{ taskId: task.id }}
									className="flex items-center gap-3 px-3 py-2 bg-background border border-border/50 hover:bg-secondary transition-colors"
								>
									<span className="flex-1 text-foreground text-sm">{task.title}</span>
									{task.due_date && (
										<span className={cn("text-xs", isDueOverdue(task.due_date) ? "text-destructive" : "text-muted-foreground")}>
											{formatDueDate(task.due_date)}
										</span>
									)}
									<Badge className={getPriorityClass(task.priority)}>
										P{task.priority}
									</Badge>
								</Link>
							))}
						</div>
					) : (
						<div className="text-center py-6">
							<p className="text-muted-foreground text-sm mb-3">Nenhuma tarefa pendente</p>
							<Button asChild>
								<Link to="/tasks">+ Adicionar tarefa</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between py-3">
					<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Configuracao Tmux</CardTitle>
					<Link
						to="/projects/settings"
						search={{ projectId: selectedProjectId }}
						className="text-xs text-muted-foreground hover:text-primary transition-colors"
					>
						configurar
					</Link>
				</CardHeader>
				<CardContent className="pt-0">
					{isTmuxConfigured ? (
						<div className="flex items-center gap-3">
							<span className="text-primary">✓</span>
							<span className="text-foreground text-sm">Tmux configurado</span>
							<span className="text-xs text-muted-foreground">
								{localProjectConfig.routes.length} rota(s), {localProjectConfig.tmux_config.tabs.length} tab(s)
							</span>
						</div>
					) : (
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<span className="text-accent">!</span>
								<span className="text-foreground text-sm">Tmux nao configurado</span>
							</div>
							<button
								type="button"
								onClick={markTmuxConfigured}
								className="text-xs text-primary hover:text-primary/80 transition-colors"
							>
								Marcar como configurado
							</button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
