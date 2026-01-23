import { Trash2, Check, Loader2 } from "lucide-react";
import type { Task, TaskExecution, TaskFull, Subtask } from "../../../types";
import {
	getComplexityColor,
	getComplexityLabel,
	getTaskStatusColor,
	getTaskStatusHighlight,
	getTaskStatusLabel,
	isTaskAIWorking,
} from "../../../lib/constants/taskStatus";
import { getPriorityColor } from "../-utils/useGetTaskQuery";

type TasksListItemProps = {
	task: Task;
	taskFull: TaskFull | null;
	execution: TaskExecution | undefined;
	subtasks: Subtask[];
	isDeleteConfirming: boolean;
	isDone?: boolean;
	onToggle: () => void;
	onEdit: () => void;
	onCodar: () => void;
	onCodarSubtask: (subtaskId: string) => void;
	onToggleSubtask: (subtaskId: string) => void;
	onReview: () => void;
	onDelete: () => void;
};

export function TasksListItem({
	task,
	taskFull,
	execution,
	subtasks,
	isDeleteConfirming,
	isDone = false,
	onToggle,
	onEdit,
	onCodar,
	onCodarSubtask,
	onToggleSubtask,
	onReview,
	onDelete,
}: TasksListItemProps) {
	const isExecuting = execution && execution.status === "running";
	const isAICurrentlyWorking = isTaskAIWorking(taskFull);
	const showSpinner = isExecuting || isAICurrentlyWorking;

	const statusColor = getTaskStatusColor(taskFull);
	const statusLabel = getTaskStatusLabel(taskFull);
	const highlight = getTaskStatusHighlight(taskFull);
	const complexity = taskFull?.complexity;

	const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
	const allSubtasksDone = subtasks.length > 0 && subtasks.every((s) => s.status === "done");

	const highlightClasses =
		highlight === "ring"
			? "ring-1"
			: highlight === "border-l"
				? "border-l-4"
				: "";

	const containerClasses = `bg-[#232323] hover:bg-[#2a2a2a] transition-colors group ${highlightClasses} ${isExecuting ? "ring-1 ring-[#909d63]" : ""}`;

	const containerStyles = {
		...(highlight === "border-l" ? { borderLeftColor: statusColor } : {}),
		...(highlight === "ring" && !isExecuting ? { boxShadow: `0 0 0 1px ${statusColor}` } : {}),
	};

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onEdit();
		}
	}

	if (isDone) {
		return (
			<div
				role="button"
				tabIndex={0}
				onClick={onEdit}
				onKeyDown={handleKeyDown}
				className="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] transition-colors group cursor-pointer"
			>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggle();
					}}
					className="text-[#909d63]"
				>
					[x]
				</button>
				<span className="flex-1 text-[#d6d6d6] text-sm line-through">
					{task.title}
				</span>
				<span className="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">
					{task.category}
				</span>
				<DeleteButton
					isConfirming={isDeleteConfirming}
					onDelete={onDelete}
				/>
			</div>
		);
	}

	return (
		<div className={containerClasses} style={containerStyles}>
			<div
				role="button"
				tabIndex={0}
				onClick={onEdit}
				onKeyDown={handleKeyDown}
				className="flex items-center gap-3 px-3 py-2 cursor-pointer"
			>
				{showSpinner ? (
					<Loader2 size={14} className="text-[#61afef] animate-spin" aria-label="Carregando" />
				) : (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggle();
						}}
						className="text-[#636363] hover:text-[#909d63] transition-colors"
					>
						[ ]
					</button>
				)}

				<span className="flex-1 text-[#d6d6d6] text-sm flex items-center gap-2">
					{task.title}
					{isExecuting && execution && (
						<span className="text-xs text-[#909d63] opacity-75">
							(Passo {execution.current_step}/{execution.total_steps})
						</span>
					)}
				</span>

				{subtasks.length > 0 && (
					<span className="text-xs text-[#636363]">
						{doneSubtasks}/{subtasks.length}
					</span>
				)}

				{complexity && (
					<span className={`text-xs ${getComplexityColor(complexity)}`}>
						{getComplexityLabel(complexity)}
					</span>
				)}

				<StatusBadge color={statusColor} label={statusLabel} />

				<span className="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">
					{task.category}
				</span>

				<PriorityBadge priority={task.priority} />

				<DeleteButton
					isConfirming={isDeleteConfirming}
					onDelete={onDelete}
				/>

				{allSubtasksDone && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onReview();
						}}
						className="px-3 py-1 text-xs bg-[#ebc17a] text-[#1c1c1c] hover:bg-[#f5d08a] transition-colors"
					>
						Revisar
					</button>
				)}

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onCodar();
					}}
					className="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] transition-colors"
				>
					Codar &gt;
				</button>
			</div>

			{subtasks.length > 0 && (
				<div className="pl-8 pr-3 pb-2 space-y-1">
					{subtasks.map((subtask) => (
						<SubtaskRow
							key={subtask.id}
							subtask={subtask}
							onToggle={() => onToggleSubtask(subtask.id)}
							onCodar={() => onCodarSubtask(subtask.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

type StatusBadgeProps = {
	color: string;
	label: string;
};

function StatusBadge({ color, label }: StatusBadgeProps) {
	return (
		<span
			className="px-2 py-0.5 text-xs text-[#1c1c1c] rounded"
			style={{ backgroundColor: color }}
		>
			{label}
		</span>
	);
}

type PriorityBadgeProps = {
	priority: number;
};

function PriorityBadge({ priority }: PriorityBadgeProps) {
	return (
		<span className={`px-2 py-0.5 text-xs text-[#1c1c1c] ${getPriorityColor(priority)}`}>
			P{priority}
		</span>
	);
}

type DeleteButtonProps = {
	isConfirming: boolean;
	onDelete: () => void;
};

function DeleteButton({ isConfirming, onDelete }: DeleteButtonProps) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onDelete();
			}}
			className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${isConfirming ? "text-[#bc5653]" : "text-[#636363] hover:text-[#bc5653]"}`}
			title={isConfirming ? "Confirmar exclusao" : "Excluir tarefa"}
		>
			{isConfirming ? <Check size={14} /> : <Trash2 size={14} />}
		</button>
	);
}

type SubtaskRowProps = {
	subtask: Subtask;
	onToggle: () => void;
	onCodar: () => void;
};

function SubtaskRow({ subtask, onToggle, onCodar }: SubtaskRowProps) {
	const isDone = subtask.status === "done";

	return (
		<div className={`flex items-center gap-2 text-sm ${isDone ? "opacity-50" : ""}`}>
			<button
				type="button"
				onClick={onToggle}
				className={`text-xs ${isDone ? "text-[#909d63]" : "text-[#636363] hover:text-[#909d63]"}`}
			>
				{isDone ? "[x]" : "[ ]"}
			</button>
			<span className={`text-[#d6d6d6] ${isDone ? "line-through" : ""}`}>
				{subtask.title}
			</span>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onCodar();
				}}
				disabled={isDone}
				className="ml-auto px-2 py-0.5 text-xs bg-[#3d3a34] text-[#d6d6d6] hover:bg-[#4a4a4a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
			>
				Codar &gt;
			</button>
		</div>
	);
}
