import { EmptyFeedback } from "@/components/ui/empty-feedback";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
	deriveProgressState,
	getProgressStateLabel,
	getSuggestedAction,
	getSuggestedActionColor,
	getSuggestedActionLabel,
	type SuggestedAction,
} from "@/lib/constants/taskStatus";
import { cn } from "@/lib/utils";
import type { TaskFull } from "@/types";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Inbox, Loader2 } from "lucide-react";
import { memo, useMemo } from "react";

type ActionButtonProps = {
	action: SuggestedAction;
	onClick: () => void;
	isLoading?: boolean;
	color: string;
};

const ActionButton = memo(function ActionButton({
	action,
	onClick,
	isLoading,
	color,
}: ActionButtonProps) {
	const label = getSuggestedActionLabel(action);
	if (!label) return null;

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isLoading}
			className={cn(
				"group relative w-full px-4 py-2.5 text-sm font-medium",
				"border border-border bg-card",
				"transition-colors duration-200",
				"hover:bg-secondary/50",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				"disabled:opacity-50 disabled:cursor-not-allowed",
			)}
			style={{
				borderColor: `${color}40`,
			}}
		>
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background: `radial-gradient(ellipse at center, ${color}10 0%, transparent 70%)`,
				}}
			/>
			<span
				className="relative flex items-center justify-center gap-2"
				style={{ color }}
			>
				{isLoading && <Loader2 size={14} className="animate-spin" />}
				{label}
			</span>
		</button>
	);
});

type TaskSummaryCardProps = {
	task: TaskFull | null;
	onActionClick: (action: SuggestedAction, task: TaskFull) => void;
	onNavigate: (taskId: string) => void;
	isLoading?: boolean;
	className?: string;
};

export const TaskSummaryCard = memo(function TaskSummaryCard({
	task,
	onActionClick,
	onNavigate,
	isLoading,
	className,
}: TaskSummaryCardProps) {
	const progressState = useMemo(() => deriveProgressState(task), [task]);

	const suggestedAction = useMemo(() => getSuggestedAction(task), [task]);

	const actionColor = useMemo(
		() => getSuggestedActionColor(suggestedAction) || "#4a4a4a",
		[suggestedAction],
	);

	const progressInfo = useMemo(() => {
		if (!task) return { percent: 0, done: 0, total: 0 };
		const subtasks = task.subtasks ?? [];
		const total = subtasks.length;
		const done = subtasks.filter((s) => s.status === "done").length;
		const percent = total > 0 ? Math.round((done / total) * 100) : 0;
		return { percent, done, total };
	}, [task]);

	const isAiWorking = progressState === "ai-working";
	const showTerminalButton = isAiWorking;

	const subtitle = useMemo(() => {
		if (!task) return "";
		if (task.complexity) {
			const complexityLabels: Record<string, string> = {
				simple: "Simples",
				medium: "Media",
				complex: "Complexa",
			};
			return complexityLabels[task.complexity] || task.complexity;
		}
		return getProgressStateLabel(progressState);
	}, [task, progressState]);

	if (!task) {
		return (
			<div
				className={cn("relative bg-card border border-border p-5", className)}
			>
				<EmptyFeedback
					icon={Inbox}
					title="Nenhuma tarefa selecionada"
					subtitle="Selecione uma tarefa para ver detalhes"
					className="py-8"
				/>
			</div>
		);
	}

	const handleActionClick = () => {
		if (suggestedAction && task) {
			onActionClick(suggestedAction, task);
		}
	};

	const handleTerminalClick = () => {
		if (task) {
			onActionClick("focus_terminal", task);
		}
	};

	return (
		<div
			className={cn(
				"group/card relative bg-card border border-border",
				className,
			)}
		>
			<div
				className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
				style={{
					background: `linear-gradient(180deg, ${actionColor} 0%, ${actionColor}80 50%, ${actionColor}40 100%)`,
				}}
			/>

			<div
				className="absolute inset-0 opacity-30 transition-opacity duration-400 pointer-events-none"
				style={{
					background: `radial-gradient(ellipse at top left, ${actionColor}15 0%, transparent 60%)`,
				}}
			/>

			<div
				className="absolute inset-0 transition-all duration-300 pointer-events-none"
				style={{
					boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
				}}
			/>

			<Link
				to="/tasks/$taskId"
				params={{ taskId: task.id }}
				onClick={() => onNavigate(task.id)}
				className="relative flex items-start justify-between p-4 pb-3 border-b border-border/30 group/header transition-colors duration-200 hover:bg-secondary/30"
			>
				<div className="flex-1 min-w-0 pr-2">
					<h3 className="text-sm font-medium text-foreground truncate transition-colors duration-200 group-hover/header:text-primary">
						{task.title}
					</h3>
					<span className="text-xs text-muted-foreground transition-colors duration-200 group-hover/header:text-muted-foreground/80">
						{subtitle}
					</span>
				</div>
				<div className="p-1.5 text-muted-foreground group-hover/header:text-primary transition-colors duration-200">
					<ExternalLink size={14} />
				</div>
			</Link>

			<div className="relative flex flex-col items-center py-8">
				<div className="relative">
					<ProgressCircle
						progress={progressInfo.percent}
						size={100}
						strokeWidth={8}
						showLabel
						label={
							progressInfo.total > 0
								? `${progressInfo.done}/${progressInfo.total} subtarefas`
								: undefined
						}
					/>
					{progressInfo.percent > 0 && (
						<div
							className="absolute inset-0 animate-glow-pulse pointer-events-none opacity-50"
							style={{
								boxShadow: `0 0 30px ${actionColor}30`,
							}}
						/>
					)}
				</div>

				{isAiWorking && (
					<div className="flex items-center gap-2 mt-4 text-chart-4">
						<div className="relative">
							<Loader2 size={14} className="animate-spin" />
							<div
								className="absolute inset-0 animate-ping opacity-30"
								style={{ color: "hsl(var(--chart-4))" }}
							>
								<Loader2 size={14} />
							</div>
						</div>
						<span className="text-xs font-medium">IA trabalhando...</span>
					</div>
				)}
			</div>

			<div className="relative p-4 pt-0 space-y-2">
				{suggestedAction && suggestedAction !== "focus_terminal" && (
					<ActionButton
						action={suggestedAction}
						onClick={handleActionClick}
						isLoading={isLoading}
						color={actionColor}
					/>
				)}

				{showTerminalButton && (
					<ActionButton
						action="focus_terminal"
						onClick={handleTerminalClick}
						isLoading={false}
						color={getSuggestedActionColor("focus_terminal") || "#4a4a4a"}
					/>
				)}
			</div>
		</div>
	);
});
