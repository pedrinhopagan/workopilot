import { memo, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { trpc } from "../../../services/trpc";
import { safeInvoke } from "../../../services/tauri";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Project, Task } from "@/types";
import {
	X,
	Settings,
	Terminal,
	ListTodo,
	CheckCircle2,
	Clock,
	TrendingUp,
	FolderOpen,
	ChevronRight,
	Loader2,
} from "lucide-react";
import {
	getTaskProgressStateLabel,
	getTaskProgressStateBadgeVariant,
	getTaskProgressStateIndicator,
} from "../../../lib/constants/taskStatus";

type ProjectStats = {
	pending: number;
	done: number;
	total: number;
	lastModified: string | null;
};

type ProjectDetailsPanelProps = {
	project: Project;
	onClose: () => void;
	initialStats?: ProjectStats;
};

export const ProjectDetailsPanel = memo(function ProjectDetailsPanel({
	project,
	onClose,
	initialStats,
}: ProjectDetailsPanelProps) {
	const projectColor = project.color || "#909d63";

	const { data: projectConfig } = trpc.projects.get.useQuery(
		{ id: project.id },
		{ enabled: !!project.id, staleTime: 30000 }
	);

	const { data: allStats = [] } = trpc.projects.getAllStats.useQuery(
		undefined,
		{ staleTime: 30000 }
	);
	const stats = useMemo(() => {
		if (initialStats) {
			return {
				project_id: project.id,
				total_tasks: initialStats.total,
				pending_tasks: initialStats.pending,
				in_progress_tasks: 0,
				done_tasks: initialStats.done,
				last_task_modified_at: initialStats.lastModified,
			};
		}
		return allStats.find((s) => s.project_id === project.id);
	}, [allStats, project.id, initialStats]);

	const { data: activeTasks = [] } = trpc.tasks.listActive.useQuery(
		undefined,
		{ staleTime: 30000 }
	);
	const projectActiveTasks = useMemo(() => {
		return activeTasks.filter((t) => t.project_id === project.id).slice(0, 3);
	}, [activeTasks, project.id]);

	const { data: urgentTasks = [] } = trpc.tasks.listUrgent.useQuery(
		undefined,
		{ staleTime: 30000 }
	);
	const projectUrgentTasks = useMemo(() => {
		return urgentTasks.filter((t) => t.project_id === project.id).slice(0, 5);
	}, [urgentTasks, project.id]);

	const activeTaskFullQueries = trpc.useQueries((t) =>
		projectActiveTasks.map((task) => t.tasks.getFull({ id: task.id }))
	);
	const activeTasksFullCache = useMemo(() => {
		const map = new Map();
		for (let i = 0; i < projectActiveTasks.length; i++) {
			const result = activeTaskFullQueries[i];
			if (result?.data) {
				map.set(projectActiveTasks[i].id, result.data);
			}
		}
		return map;
	}, [projectActiveTasks, activeTaskFullQueries]);

	const metrics = useMemo(() => {
		if (!stats) {
			return {
				total: 0,
				pending: 0,
				inProgress: 0,
				done: 0,
				completionPercent: 0,
			};
		}
		const total = stats.total_tasks;
		const pending = stats.pending_tasks;
		const inProgress = stats.in_progress_tasks;
		const done = stats.done_tasks;
		const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;
		return { total, pending, inProgress, done, completionPercent };
	}, [stats]);

	const lastActivityLabel = useMemo(() => {
		const dateStr = stats?.last_task_modified_at || project.created_at;
		const lastDate = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - lastDate.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "hoje";
		if (diffDays === 1) return "ontem";
		if (diffDays < 7) return `${diffDays} dias atrás`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} semana(s) atrás`;
		return `${Math.floor(diffDays / 30)} mês(es) atrás`;
	}, [stats?.last_task_modified_at, project.created_at]);

	async function handleLaunchTmux() {
		try {
			await safeInvoke("terminal_action", { action: "launch_project", projectId: project.id });
		} catch (e) {
			console.error("Failed to launch tmux:", e);
		}
	}

	useEffect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [onClose]);

	function renderTaskItem(task: Task, showProgress = false) {
		const taskFull = activeTasksFullCache.get(task.id) || null;
		const progressLabel = getTaskProgressStateLabel(taskFull);
		const badgeVariant = getTaskProgressStateBadgeVariant(taskFull);
		const indicator = getTaskProgressStateIndicator(taskFull);

		return (
			<Link
				key={task.id}
				to="/tasks/$taskId"
				params={{ taskId: task.id }}
				className={cn(
					"flex items-center gap-2 p-2 bg-background/50 border border-border/50",
					"hover:bg-secondary/50 hover:border-border",
					"transition-colors duration-200 group"
				)}
			>
				{showProgress && indicator === "spinner" && (
					<Loader2
						className="size-3.5 animate-spin flex-shrink-0 text-chart-4"
						aria-label="IA trabalhando"
					/>
				)}
				<span className="flex-1 text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
					{task.title}
				</span>
				{showProgress && (
					<Badge 
						variant={badgeVariant} 
						className="text-xs"
					>
						{progressLabel}
					</Badge>
				)}
				<ChevronRight
					size={14}
					className="text-muted-foreground/50 group-hover:text-primary transition-colors duration-200"
				/>
			</Link>
		);
	}

	return (
		<>
			<button
				type="button"
				className="fixed inset-0 bg-black/40 z-40 cursor-default"
				onClick={onClose}
				aria-label="Fechar painel"
			/>

			<div
				className="fixed top-0 right-0 h-full w-[380px] border-l border-border flex flex-col overflow-hidden z-50 shadow-2xl animate-slide-in-right"
				style={{
					background: `linear-gradient(180deg, ${projectColor}08 0%, var(--card) 30%), var(--card)`,
				}}
			>
			<div
				className="relative p-4 border-b border-border"
				style={{
					background: `linear-gradient(135deg, ${projectColor}15 0%, transparent 60%)`,
				}}
			>
				<div
					className="absolute left-0 top-0 bottom-0 w-1"
					style={{
						background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}60 100%)`,
					}}
				/>

				<div className="flex items-start justify-between gap-3 pl-3">
					<div className="flex-1 min-w-0 animate-fade-in">
						<div className="flex items-center gap-2 mb-1">
							<FolderOpen
								size={18}
								style={{ color: projectColor }}
								className="flex-shrink-0 animate-scale-in"
							/>
							<h2 className="text-lg font-medium text-foreground truncate">
								{project.name}
							</h2>
						</div>
						{project.description && (
							<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
								{project.description}
							</p>
						)}
						{projectConfig?.path && (
							<p className="text-xs text-muted-foreground/70 mt-2 font-mono truncate">
								{projectConfig.path}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className={cn(
							"p-1.5 text-muted-foreground flex-shrink-0",
							"hover:text-foreground hover:bg-secondary",
							"transition-colors duration-200"
						)}
						title="Fechar painel"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-5">
				<div className="flex gap-2 animate-slide-up-fade" style={{ animationDelay: "0.05s" }}>
					<Button
						onClick={handleLaunchTmux}
						className="flex-1 gap-2 group transition-colors duration-200"
						style={{
							background: `linear-gradient(135deg, ${projectColor} 0%, ${projectColor}cc 100%)`,
						}}
					>
						<Terminal size={16} />
						Codar
					</Button>
					<Button 
						variant="outline" 
						size="icon" 
						asChild
						className="transition-colors duration-200"
					>
						<Link
							to="/projects/settings"
							search={{ projectId: project.id }}
							title="Configurações"
						>
							<Settings size={16} />
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-3 animate-slide-up-fade" style={{ animationDelay: "0.1s" }}>
					<div className="p-3 bg-background/50 border border-border/50 transition-all duration-200 hover:bg-background/70 hover:border-border">
						<div className="flex items-center gap-2 text-muted-foreground mb-1">
							<ListTodo size={14} />
							<span className="text-xs uppercase tracking-wide">Total</span>
						</div>
						<p className="text-2xl font-medium text-foreground">
							{metrics.total}
						</p>
					</div>
					<div className="p-3 bg-background/50 border border-border/50 transition-all duration-200 hover:bg-background/70 hover:border-border">
						<div className="flex items-center gap-2 text-muted-foreground mb-1">
							<TrendingUp size={14} />
							<span className="text-xs uppercase tracking-wide">Progresso</span>
						</div>
						<p className="text-2xl font-medium" style={{ color: projectColor }}>
							{metrics.completionPercent}%
						</p>
					</div>
					<div className="p-3 bg-background/50 border border-border/50 transition-all duration-200 hover:bg-background/70 hover:border-border">
						<div className="flex items-center gap-2 text-muted-foreground mb-1">
							<Clock size={14} />
							<span className="text-xs uppercase tracking-wide">Pendentes</span>
						</div>
						<p className="text-2xl font-medium text-foreground">
							{metrics.pending + metrics.inProgress}
						</p>
					</div>
					<div className="p-3 bg-background/50 border border-border/50 transition-all duration-200 hover:bg-background/70 hover:border-border">
						<div className="flex items-center gap-2 text-muted-foreground mb-1">
							<CheckCircle2 size={14} />
							<span className="text-xs uppercase tracking-wide">Concluídas</span>
						</div>
						<p className="text-2xl font-medium text-foreground">
							{metrics.done}
						</p>
					</div>
				</div>

				{metrics.total > 0 && (
					<div className="animate-slide-up-fade" style={{ animationDelay: "0.15s" }}>
						<div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
							<span>Progresso geral</span>
							<span>{metrics.completionPercent}%</span>
						</div>
						<div className="h-2 bg-secondary/60 overflow-hidden">
							<div
								className="h-full transition-all duration-700 ease-out animate-progress-shine"
								style={{
									width: `${metrics.completionPercent}%`,
									background: `linear-gradient(90deg, ${projectColor} 0%, ${projectColor}cc 100%)`,
									boxShadow: `0 0 12px ${projectColor}60`,
								}}
							/>
						</div>
					</div>
				)}

				{projectActiveTasks.length > 0 && (
					<div className="animate-slide-up-fade" style={{ animationDelay: "0.2s" }}>
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-xs uppercase tracking-wide text-muted-foreground">
								Em andamento
							</h3>
							<Link
								to="/tasks"
								className="text-xs text-muted-foreground hover:text-primary transition-colors"
							>
								ver todas
							</Link>
						</div>
						<div className="space-y-2">
							{projectActiveTasks.map((task, index) => (
								<div 
									key={task.id} 
									className="animate-content-reveal" 
									style={{ animationDelay: `${0.25 + index * 0.05}s` }}
								>
									{renderTaskItem(task, true)}
								</div>
							))}
						</div>
					</div>
				)}

				{projectUrgentTasks.length > 0 && projectActiveTasks.length === 0 && (
					<div className="animate-slide-up-fade" style={{ animationDelay: "0.2s" }}>
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-xs uppercase tracking-wide text-muted-foreground">
								Tarefas urgentes
							</h3>
							<Link
								to="/tasks"
								className="text-xs text-muted-foreground hover:text-primary transition-colors"
							>
								ver todas
							</Link>
						</div>
						<div className="space-y-2">
							{projectUrgentTasks.map((task, index) => (
								<div 
									key={task.id} 
									className="animate-content-reveal" 
									style={{ animationDelay: `${0.25 + index * 0.05}s` }}
								>
									{renderTaskItem(task, false)}
								</div>
							))}
						</div>
					</div>
				)}

				{metrics.total === 0 && (
					<div className="text-center py-6 animate-fade-in">
						<p className="text-muted-foreground text-sm mb-3">
							Nenhuma tarefa neste projeto
						</p>
						<Button asChild variant="outline" className="transition-colors duration-200">
							<Link to="/tasks">+ Criar tarefa</Link>
						</Button>
					</div>
				)}
			</div>

			<div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
				<div className="flex items-center gap-1.5">
					<Clock size={12} className="animate-pulse" />
					<span>Última atividade {lastActivityLabel}</span>
				</div>
				<div
					className="w-2 h-2 animate-glow-pulse"
					style={{
						backgroundColor: projectColor,
						boxShadow: `0 0 8px ${projectColor}80`,
					}}
				/>
			</div>
		</div>
		</>
	);
});
