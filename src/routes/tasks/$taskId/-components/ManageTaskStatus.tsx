import {
	AlertTriangle,
	Copy,
	FileCheck,
	FileText,
	Loader2,
	Monitor,
	MoreVertical,
	Rocket,
	Target,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TaskStatusSelect } from "@/components/tasks/TaskStatusSelect";
import {
	type TaskStatus,
	getSuggestedAction,
	getTaskProgressStateColor,
	getTaskProgressStateLabel,
	getTaskProgressStateHighlight,
	getTaskProgressStateContainerClass,
	deriveProgressState,
} from "@/lib/constants/taskStatus";
import type { Subtask, TaskFull } from "@/types";

function generateStructurePrompt(taskTitle: string, taskId: string): string {
	return `Estruturar: ${taskTitle}, utilize a skill workopilot-structure para estruturar a task de id: ${taskId}`;
}

function generateExecuteAllPrompt(taskTitle: string, taskId: string): string {
	return `Executar: ${taskTitle}, utilize a skill workopilot-execute-all para executar a task de id: ${taskId}`;
}

function generateExecuteSubtaskPrompt(
	subtaskTitle: string,
	taskTitle: string,
	subtaskId: string,
	taskId: string,
): string {
	return `Executar subtask: ${subtaskTitle} (task: ${taskTitle}), utilize a skill workopilot-execute-subtask para executar a subtask ${subtaskId} da task ${taskId}`;
}

function generateReviewPrompt(taskTitle: string, taskId: string): string {
	return `Revisar: ${taskTitle}, utilize a skill workopilot-review para revisar a task de id: ${taskId}`;
}

interface ManageTaskStatusProps {
	taskFull: TaskFull;
	conflictWarning: boolean;
	canExecuteSubtask: boolean;
	pendingSubtasks: Subtask[];
	lastAction: string | null;
	isLaunchingStructure: boolean;
	isLaunchingExecuteAll: boolean;
	isLaunchingExecuteSubtask: boolean;
	isLaunchingReview: boolean;
	isLaunchingFocus: boolean;
	onDismissConflictWarning: () => void;
	onStatusChange: (status: TaskStatus) => void;
	onStructureTask: () => void;
	onExecuteAll: () => void;
	onExecuteSubtask: (subtaskId: string) => void;
	onReviewTask: () => void;
	onFocusTerminal: () => void;
}

export function ManageTaskStatus({
	taskFull,
	conflictWarning,
	canExecuteSubtask,
	pendingSubtasks,
	lastAction,
	isLaunchingStructure,
	isLaunchingExecuteAll,
	isLaunchingExecuteSubtask,
	isLaunchingReview,
	isLaunchingFocus,
	onDismissConflictWarning,
	onStatusChange,
	onStructureTask,
	onExecuteAll,
	onExecuteSubtask,
	onReviewTask,
	onFocusTerminal,
}: ManageTaskStatusProps) {
	const [showSubtaskSelector, setShowSubtaskSelector] = useState(false);

	const progressState = deriveProgressState(taskFull);
	const progressColor = getTaskProgressStateColor(taskFull);
	const progressLabel = getTaskProgressStateLabel(taskFull);
	const progressHighlight = getTaskProgressStateHighlight(taskFull);
	const progressContainerClass = getTaskProgressStateContainerClass(taskFull);
	const suggestedAction = getSuggestedAction(taskFull);

	return (
		<>
			{conflictWarning && (
				<div className="px-4 py-2 bg-border border-b border-muted text-foreground text-sm flex items-center gap-2">
					<AlertTriangle size={16} className="text-accent" />
					<span>
						A IA fez alteracoes nesta task. Suas edicoes podem sobrescrever as
						mudancas da IA.
					</span>
					<button
						type="button"
						onClick={onDismissConflictWarning}
						className="ml-auto text-muted-foreground hover:text-foreground"
					>
						<X size={14} />
					</button>
				</div>
			)}

			<div
				className={`border-b border-border ${progressContainerClass} ${
					progressHighlight === "pulse" ? "animate-pulse" : ""
				}`}
			>
				<div className="px-4 py-3 flex items-center gap-4 border-b border-secondary">
					<TaskStatusSelect
						value={taskFull.status as TaskStatus}
						onChange={onStatusChange}
					/>

					<span
						className="px-2 py-1 text-xs font-medium rounded"
						style={{
							backgroundColor: `${progressColor}20`,
							color: progressColor,
						}}
					>
						{progressLabel}
					</span>

					<button
						type="button"
						onClick={onFocusTerminal}
						disabled={isLaunchingFocus}
						className="px-2 py-1 text-xs font-medium rounded border border-border bg-card text-foreground hover:bg-secondary hover:border-muted transition-all duration-200 flex items-center gap-1.5"
						title="Focar no terminal da task (cria se não existir)"
					>
						{isLaunchingFocus ? (
							<Loader2 size={12} className="animate-spin" />
						) : (
							<Monitor size={12} />
						)}
						<span>Terminal</span>
					</button>

					{lastAction && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<span className="w-3 h-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>Icone de IA</title>
									<path d="M12 8V4H8" />
									<rect width="16" height="12" x="4" y="8" rx="2" />
									<path d="M2 14h2" />
									<path d="M20 14h2" />
									<path d="M15 13v2" />
									<path d="M9 13v2" />
								</svg>
							</span>
							<span>
								Última ação:{" "}
								<span className="text-primary">{lastAction}</span>
							</span>
						</div>
					)}

					<div className="ml-auto flex items-center gap-1">
						<span
							className={`w-1.5 h-1.5 rounded-full transition-colors ${
								progressState !== "idle" ? "bg-primary" : "bg-border"
							}`}
							title="Pendente -> Iniciada"
						/>
						<span
							className={`w-4 h-px ${
								["ready-to-start", "in-execution", "ready-to-review", "ai-working", "done"].includes(progressState)
									? "bg-primary"
									: "bg-border"
							}`}
						/>
						<span
							className={`w-1.5 h-1.5 rounded-full transition-colors ${
								["in-execution", "ready-to-review", "ai-working", "done"].includes(progressState)
									? "bg-primary"
									: "bg-border"
							}`}
							title="Estruturada -> Trabalhando"
						/>
						<span
							className={`w-4 h-px ${
								["ready-to-review", "done"].includes(progressState)
									? "bg-primary"
									: "bg-border"
							}`}
						/>
						<span
							className={`w-1.5 h-1.5 rounded-full transition-colors ${
								progressState === "done" ? "bg-primary" : "bg-border"
							}`}
							title="Concluida"
						/>
					</div>
				</div>

				<div className="px-4 py-4 flex items-stretch gap-3">
					<ActionButton
						label="Estruturar"
						icon={<FileText size={20} />}
						isLoading={isLaunchingStructure}
						isSuggested={suggestedAction === "structure"}
						suggestedColor="accent"
						prompt={generateStructurePrompt(taskFull.title, taskFull.id)}
						onClick={onStructureTask}
					/>

					<ActionButton
						label="Executar Tudo"
						icon={<Rocket size={20} />}
						isLoading={isLaunchingExecuteAll}
						isSuggested={suggestedAction === "execute_all"}
						suggestedColor="primary"
						prompt={generateExecuteAllPrompt(taskFull.title, taskFull.id)}
						onClick={onExecuteAll}
					/>

					<div className="flex-1 relative">
						<button
							type="button"
							onClick={() => setShowSubtaskSelector(!showSubtaskSelector)}
							className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 border transition-all duration-200 ${
								suggestedAction === "execute_subtask"
									? "border-chart-4 bg-chart-4/10 text-chart-4 shadow-lg shadow-chart-4/10"
									: "border-border bg-card text-foreground hover:border-muted hover:bg-secondary"
							}`}
						>
							{isLaunchingExecuteSubtask ? (
								<Loader2 size={20} className="animate-spin" />
							) : (
								<Target size={20} />
							)}
							<span className="text-sm font-medium">Executar Subtask</span>
							{canExecuteSubtask && (
								<span className="text-[10px] opacity-60">
									({pendingSubtasks.length})
								</span>
							)}
						</button>
						{suggestedAction === "execute_subtask" && (
							<span className="absolute -top-2 -left-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-chart-4 text-background">
								Sugestão
							</span>
						)}

						{showSubtaskSelector && canExecuteSubtask && (
							<div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-xl z-50 overflow-hidden animate-slide-down">
								<div className="px-3 py-2 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
									Selecione uma subtask
								</div>
								<div className="max-h-48 overflow-y-auto">
									{pendingSubtasks.map((subtask) => (
										<SubtaskListItem
											key={subtask.id}
											subtask={subtask}
											taskFull={taskFull}
											onExecute={() => {
												onExecuteSubtask(subtask.id);
												setShowSubtaskSelector(false);
											}}
										/>
									))}
								</div>
							</div>
						)}
					</div>

					<ActionButton
						label="Revisar"
						icon={<FileCheck size={20} />}
						isLoading={isLaunchingReview}
						isSuggested={suggestedAction === "review"}
						suggestedColor="accent"
						prompt={generateReviewPrompt(taskFull.title, taskFull.id)}
						onClick={onReviewTask}
					/>
				</div>
			</div>
		</>
	);
}

interface ActionButtonProps {
	label: string;
	icon: React.ReactNode;
	isLoading: boolean;
	isSuggested: boolean;
	suggestedColor: "primary" | "accent";
	prompt: string;
	onClick: () => void;
}

function ActionButton({
	label,
	icon,
	isLoading,
	isSuggested,
	suggestedColor,
	prompt,
	onClick,
}: ActionButtonProps) {
	const [showMenu, setShowMenu] = useState(false);
	const [copied, setCopied] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		}
		if (showMenu) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showMenu]);

	async function handleCopyPrompt(e: React.MouseEvent) {
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(prompt);
			setCopied(true);
			setTimeout(() => {
				setCopied(false);
				setShowMenu(false);
			}, 1000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	}

	const suggestedClasses = suggestedColor === "primary"
		? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
		: "border-accent bg-accent/10 text-accent shadow-lg shadow-accent/10";

	return (
		<div className="flex-1 relative" ref={menuRef}>
			<button
				type="button"
				onClick={onClick}
				className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 border transition-all duration-200 ${
					isSuggested
						? suggestedClasses
						: "border-border bg-card text-foreground hover:border-muted hover:bg-secondary"
				}`}
			>
				{isLoading ? <Loader2 size={20} className="animate-spin" /> : icon}
				<span className="text-sm font-medium">{label}</span>
			</button>

			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setShowMenu(!showMenu);
				}}
				className="absolute top-1 right-1 p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
			>
				<MoreVertical size={14} />
			</button>

			{showMenu && (
				<div className="absolute top-8 right-1 bg-card border border-border shadow-lg z-50 min-w-[140px] animate-slide-down">
					<button
						type="button"
						onClick={handleCopyPrompt}
						className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
					>
						<Copy size={14} />
						{copied ? "Copiado!" : "Copiar prompt"}
					</button>
				</div>
			)}

			{isSuggested && (
				<span
					className={`absolute -top-2 -left-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background ${
						suggestedColor === "primary" ? "bg-primary" : "bg-accent"
					}`}
				>
					Sugestão
				</span>
			)}
		</div>
	);
}

interface SubtaskListItemProps {
	subtask: Subtask;
	taskFull: TaskFull;
	onExecute: () => void;
}

function SubtaskListItem({ subtask, taskFull, onExecute }: SubtaskListItemProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopyPrompt(e: React.MouseEvent) {
		e.stopPropagation();
		const prompt = generateExecuteSubtaskPrompt(
			subtask.title,
			taskFull.title,
			subtask.id,
			taskFull.id,
		);
		try {
			await navigator.clipboard.writeText(prompt);
			setCopied(true);
			setTimeout(() => setCopied(false), 1000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	}

	return (
		<div className="flex items-center min-w-0">
			<button
				type="button"
				onClick={onExecute}
				className="flex-1 min-w-0 px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
			>
				<span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-border text-[10px] text-primary">
					{subtask.order + 1}
				</span>
				<span className="flex-1 min-w-0 truncate">{subtask.title}</span>
			</button>

			<button
				type="button"
				onClick={handleCopyPrompt}
				className="flex-shrink-0 px-2 py-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
				title="Copiar prompt"
			>
				{copied ? <FileCheck size={14} className="text-primary" /> : <Copy size={14} />}
			</button>
		</div>
	);
}
