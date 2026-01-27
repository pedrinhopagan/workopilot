import { memo, useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FolderOpen, Clock, CheckCircle2, ListTodo, Activity } from "lucide-react";
import type { Project } from "@/types";

type ProjectCardVariant = "full" | "compact";

type ProjectCardBaseProps = {
	project: Project;
	onClick: () => void;
	variant?: ProjectCardVariant;
};

type ProjectCardFullProps = ProjectCardBaseProps & {
	variant?: "full";
	isSelected?: boolean;
	taskMetrics?: { pending: number; done: number; total: number; lastModified?: string | null };
};

type ProjectCardCompactProps = ProjectCardBaseProps & {
	variant: "compact";
	pendingTaskCount?: number;
};

export type ProjectCardProps = ProjectCardFullProps | ProjectCardCompactProps;

// ── Compact Variant ──────────────────────────────────────────────────

const ProjectCardCompact = memo(function ProjectCardCompact({
	project,
	onClick,
	pendingTaskCount = 0,
}: {
	project: Project;
	onClick: () => void;
	pendingTaskCount?: number;
}) {
	const projectColor = project.color || "#909d63";

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative flex items-center gap-3 px-4 py-3",
				"border border-border bg-card",
				"transition-colors duration-200",
				"hover:border-primary/40 hover:bg-secondary/30",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"min-w-0 shrink-0"
			)}
		>
			<div
				className="absolute left-0 top-0 bottom-0 w-[3px]"
				style={{
					background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}80 100%)`,
				}}
			/>

			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background: `radial-gradient(ellipse at left, ${projectColor}10 0%, transparent 70%)`,
				}}
			/>

			<div
				className={cn(
					"p-1.5 bg-background/60 transition-colors duration-200",
					"group-hover:bg-background/80"
				)}
				style={{
					boxShadow: `inset 0 0 0 1px ${projectColor}30`,
				}}
			>
				<FolderOpen
					size={14}
					style={{ color: projectColor }}
				/>
			</div>

			<span className="text-sm font-medium text-foreground truncate max-w-[140px] transition-colors duration-200 group-hover:text-primary">
				{project.name}
			</span>

			{pendingTaskCount > 0 && (
				<Badge
					variant="outline"
					className="gap-1 px-1.5 py-0 text-[10px] font-normal border-border/60 bg-background/40 shrink-0"
				>
					<ListTodo size={10} className="text-muted-foreground" />
					<span className="text-muted-foreground">{pendingTaskCount}</span>
				</Badge>
			)}
		</button>
	);
});

// ── Full Variant ─────────────────────────────────────────────────────

const ProjectCardFull = memo(function ProjectCardFull({
	project,
	isSelected = false,
	onClick,
	taskMetrics,
}: {
	project: Project;
	isSelected?: boolean;
	onClick: () => void;
	taskMetrics?: { pending: number; done: number; total: number; lastModified?: string | null };
}) {
	const projectColor = project.color || "#909d63";
	const completionPercent =
		taskMetrics && taskMetrics.total > 0
			? Math.round((taskMetrics.done / taskMetrics.total) * 100)
			: 0;

	const [wasSelected, setWasSelected] = useState(isSelected);
	const [showSelectionRing, setShowSelectionRing] = useState(false);

	useEffect(() => {
		if (isSelected && !wasSelected) {
			setShowSelectionRing(true);
			const timer = setTimeout(() => setShowSelectionRing(false), 500);
			return () => clearTimeout(timer);
		}
		setWasSelected(isSelected);
	}, [isSelected, wasSelected]);

	const lastActivityLabel = useMemo(() => {
		const dateStr = taskMetrics?.lastModified || project.created_at;
		const lastDate = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - lastDate.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "hoje";
		if (diffDays === 1) return "ontem";
		if (diffDays < 7) return `${diffDays} dias`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem.`;
		return `${Math.floor(diffDays / 30)} meses`;
	}, [taskMetrics?.lastModified, project.created_at]);

	const isRecentlyActive = useMemo(() => {
		const dateStr = taskMetrics?.lastModified || project.created_at;
		const lastDate = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - lastDate.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		return diffDays <= 3;
	}, [taskMetrics?.lastModified, project.created_at]);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative w-full text-left",
				"border border-border bg-card",
				"transition-colors duration-200",
				"hover:border-primary/40 hover:bg-secondary/30",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				isSelected && "ring-2 ring-primary/60 border-primary/50",
				showSelectionRing && "animate-selection-ring"
			)}
		>
			<div
				className={cn(
					"absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300",
					"group-hover:w-[4px]"
				)}
				style={{
					background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}80 50%, ${projectColor}40 100%)`,
				}}
			/>

			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
				style={{
					background: `radial-gradient(ellipse at top left, ${projectColor}15 0%, transparent 60%)`,
				}}
			/>

			<div
				className={cn(
					"absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-200",
					"opacity-0 group-hover:opacity-100"
				)}
				style={{
					background: `linear-gradient(90deg, ${projectColor} 0%, ${projectColor}60 50%, transparent 100%)`,
				}}
			/>

			<div
				className="absolute inset-0 transition-all duration-300 pointer-events-none"
				style={{
					boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
				}}
			/>
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
				style={{
					boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 30px ${projectColor}15`,
				}}
			/>

			<div className="relative p-5 pl-6">
				<div className="flex items-start gap-3 mb-4">
					<div
						className={cn(
							"relative p-2.5 bg-background/60 transition-colors duration-200",
							"group-hover:bg-background/80"
						)}
						style={{
							boxShadow: `inset 0 0 0 1px ${projectColor}30`,
						}}
					>
						<FolderOpen
							size={18}
							style={{ color: projectColor }}
						/>
						<div
							className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
							style={{
								boxShadow: `0 0 20px ${projectColor}50`,
							}}
						/>
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-foreground font-medium text-base truncate transition-colors duration-200 group-hover:text-primary">
							{project.name}
						</h3>
						{project.description && (
							<p className="text-muted-foreground text-xs mt-1 line-clamp-2 leading-relaxed transition-colors duration-200 group-hover:text-muted-foreground/80">
								{project.description}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2 mb-4 flex-wrap">
					{taskMetrics && taskMetrics.total > 0 ? (
						<>
							<Badge
								variant="outline"
								className={cn(
									"gap-1.5 px-2 py-0.5 text-xs font-normal border-border/60 bg-background/40",
									"transition-all duration-200 group-hover:border-border group-hover:bg-background/60"
								)}
							>
								<ListTodo size={11} className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70" />
								<span className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
									{taskMetrics.pending}{" "}
									{taskMetrics.pending === 1 ? "tarefa" : "tarefas"}
								</span>
							</Badge>
							<Badge
								variant="outline"
								className="gap-1.5 px-2 py-0.5 text-xs font-normal"
								style={{
									borderColor: `${projectColor}40`,
									color: projectColor,
								}}
							>
								<CheckCircle2 size={11} />
								<span>{completionPercent}%</span>
							</Badge>
						</>
					) : (
						<Badge
							variant="muted"
							className="text-xs font-normal px-2 py-0.5 transition-colors duration-200 group-hover:bg-muted"
						>
							Sem tarefas
						</Badge>
					)}

					{isRecentlyActive && (
						<Badge
							variant="outline"
							className={cn(
								"gap-1 px-2 py-0.5 text-xs font-normal border-accent/40 text-accent bg-accent/10",
								"transition-all duration-200 group-hover:bg-accent/20 group-hover:border-accent/60"
							)}
						>
							<Activity size={10} className="animate-pulse" />
							<span>Ativo</span>
						</Badge>
					)}
				</div>

				{taskMetrics && taskMetrics.total > 0 && (
					<div className="mb-4">
						<div className="h-1 bg-secondary/60 overflow-hidden">
							<div
								className="h-full transition-all duration-700 ease-out animate-progress-shine"
								style={{
									width: `${completionPercent}%`,
									background: `linear-gradient(90deg, ${projectColor} 0%, ${projectColor}cc 100%)`,
									boxShadow: `0 0 10px ${projectColor}50`,
								}}
							/>
						</div>
					</div>
				)}

				<div className="flex items-center justify-between text-xs text-muted-foreground/70">
					<div className="flex items-center gap-1.5 transition-colors duration-200 group-hover:text-muted-foreground">
						<Clock size={11} />
						<span>Atualizado {lastActivityLabel}</span>
					</div>

					<div className="relative">
						<div
							className="w-2 h-2 transition-opacity duration-200 opacity-60 group-hover:opacity-100"
							style={{ backgroundColor: projectColor }}
						/>
					</div>
				</div>
			</div>

			{isSelected && (
				<div
					className="absolute top-3 right-3 w-2 h-2 animate-glow-pulse"
					style={{
						backgroundColor: projectColor,
						boxShadow: `0 0 12px ${projectColor}80`,
					}}
				/>
			)}
		</button>
	);
});

// ── Public Component ─────────────────────────────────────────────────

export const ProjectCard = memo(function ProjectCard(props: ProjectCardProps) {
	if (props.variant === "compact") {
		return (
			<ProjectCardCompact
				project={props.project}
				onClick={props.onClick}
				pendingTaskCount={props.pendingTaskCount}
			/>
		);
	}

	return (
		<ProjectCardFull
			project={props.project}
			isSelected={props.isSelected}
			onClick={props.onClick}
			taskMetrics={props.taskMetrics}
		/>
	);
});
