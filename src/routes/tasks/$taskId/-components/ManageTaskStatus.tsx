import {
	AlertTriangle,
	FileCheck,
	FileText,
	Loader2,
	Monitor,
	Rocket,
	Target,
	X,
} from "lucide-react";
import { useState } from "react";
import { TaskStatusSelect } from "../../../../components/tasks/TaskStatusSelect";
import {
	type SuggestedAction,
	type TaskStatus,
	getTaskStatusColor,
	getTaskStatusFromTask,
	getTaskStatusHighlight,
	getTaskStatusLabel,
	getSuggestedAction,
} from "../../../../lib/constants/taskStatus";
import type { Subtask, TaskFull } from "../../../../types";

interface ManageTaskStatusProps {
	taskFull: TaskFull;
	conflictWarning: boolean;
	isAIWorkingOnTask: boolean;
	canFocusTerminal: boolean;
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
	isAIWorkingOnTask,
	canFocusTerminal,
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

	const taskStatus = getTaskStatusFromTask(taskFull);
	const taskStatusColor = getTaskStatusColor(taskFull);
	const taskStatusLabel = getTaskStatusLabel(taskFull);
	const taskHighlight = getTaskStatusHighlight(taskFull);
	const suggestedAction: SuggestedAction | "focus_terminal" = isAIWorkingOnTask
		? "focus_terminal"
		: getSuggestedAction(taskFull);

	return (
		<>
			{conflictWarning && (
				<div className="px-4 py-2 bg-[#3d3a34] border-b border-[#4a4a4a] text-[#d6d6d6] text-sm flex items-center gap-2">
					<AlertTriangle size={16} color="#e5c07b" />
					<span>
						A IA fez alteracoes nesta task. Suas edicoes podem sobrescrever as
						mudancas da IA.
					</span>
					<button
						type="button"
						onClick={onDismissConflictWarning}
						className="ml-auto text-[#636363] hover:text-[#d6d6d6]"
					>
						<X size={14} />
					</button>
				</div>
			)}

			<div
				className={`border-b border-[#3d3a34] bg-gradient-to-r from-[#1c1c1c] via-[#232323] to-[#1c1c1c] ${
					taskHighlight === "ring"
						? "ring-1"
						: taskHighlight === "border-l"
							? "border-l-4"
							: ""
				}`}
				style={{
					...(taskHighlight === "ring"
						? { boxShadow: `0 0 0 1px ${taskStatusColor}` }
						: {}),
					...(taskHighlight === "border-l"
						? { borderLeftColor: taskStatusColor }
						: {}),
				}}
			>
				<div className="px-4 py-3 flex items-center gap-4 border-b border-[#2a2a2a]">
					<TaskStatusSelect
						value={taskFull.status as TaskStatus}
						onChange={onStatusChange}
					/>

					<span
						className="px-2 py-1 text-xs font-medium rounded"
						style={{
							backgroundColor: `${taskStatusColor}20`,
							color: taskStatusColor,
						}}
					>
						{taskStatusLabel}
					</span>

					{lastAction && (
						<div className="flex items-center gap-1.5 text-xs text-[#636363]">
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
								<span className="text-[#909d63]">{lastAction}</span>
							</span>
						</div>
					)}

					<div className="ml-auto flex items-center gap-1">
						<span
							className="w-1.5 h-1.5 rounded-full transition-colors"
							style={{
								backgroundColor:
									taskStatus !== "pending" ? "#909d63" : "#3d3a34",
							}}
							title="Pendente -> Estruturando"
						/>
						<span
							className="w-4 h-px"
							style={{
								backgroundColor:
									taskStatus !== "pending" && taskStatus !== "structuring"
										? "#909d63"
										: "#3d3a34",
							}}
						/>
						<span
							className="w-1.5 h-1.5 rounded-full transition-colors"
							style={{
								backgroundColor: [
									"structured",
									"working",
									"standby",
									"ready_to_review",
									"completed",
								].includes(taskStatus)
									? "#909d63"
									: "#3d3a34",
							}}
							title="Estruturada -> Trabalhando"
						/>
						<span
							className="w-4 h-px"
							style={{
								backgroundColor: ["ready_to_review", "completed"].includes(
									taskStatus,
								)
									? "#909d63"
									: "#3d3a34",
							}}
						/>
						<span
							className="w-1.5 h-1.5 rounded-full transition-colors"
							style={{
								backgroundColor:
									taskStatus === "completed" ? "#909d63" : "#3d3a34",
							}}
							title="Concluída"
						/>
					</div>
				</div>

				<div className="px-4 py-4 flex items-stretch gap-3">
					{isAIWorkingOnTask ? (
						<div className="flex-1 relative">
							<button
								type="button"
								onClick={onFocusTerminal}
								disabled={!canFocusTerminal || isLaunchingFocus}
								className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
									canFocusTerminal
										? "border-[#61afef] bg-[#61afef]/10 text-[#61afef] shadow-lg shadow-[#61afef]/10"
										: "border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed"
								}`}
							>
								{isLaunchingFocus ? (
									<Loader2 size={20} className="animate-spin" />
								) : (
									<Monitor size={20} />
								)}
								<span className="text-sm font-medium">Focar Terminal</span>
							</button>
							<span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#61afef] text-[#1c1c1c] rounded">
								IA Trabalhando
							</span>
						</div>
					) : (
						<>
							<ActionButton
								label="Estruturar"
								icon={<FileText size={20} />}
								isLoading={isLaunchingStructure}
								isSuggested={suggestedAction === "structure"}
								suggestedColor="#e5c07b"
								onClick={onStructureTask}
							/>

							<ActionButton
								label="Executar Tudo"
								icon={<Rocket size={20} />}
								isLoading={isLaunchingExecuteAll}
								isSuggested={suggestedAction === "execute_all"}
								suggestedColor="#909d63"
								onClick={onExecuteAll}
							/>

							<div className="flex-1 relative">
								<button
									type="button"
									onClick={() => setShowSubtaskSelector(!showSubtaskSelector)}
									className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
										suggestedAction === "execute_subtask"
											? "border-[#61afef] bg-[#61afef]/10 text-[#61afef] shadow-lg shadow-[#61afef]/10"
											: "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
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
									<span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#61afef] text-[#1c1c1c] rounded">
										Sugestão
									</span>
								)}

								{showSubtaskSelector && canExecuteSubtask && (
									<div className="absolute top-full left-0 right-0 mt-2 bg-[#232323] border border-[#3d3a34] rounded-lg shadow-xl z-50 overflow-hidden animate-slide-down">
										<div className="px-3 py-2 border-b border-[#3d3a34] text-xs text-[#636363] uppercase tracking-wider">
											Selecione uma subtask
										</div>
										<div className="max-h-48 overflow-y-auto">
											{pendingSubtasks.map((subtask) => (
												<button
													type="button"
													key={subtask.id}
													onClick={() => {
														onExecuteSubtask(subtask.id);
														setShowSubtaskSelector(false);
													}}
													className="w-full px-3 py-2.5 text-left text-sm text-[#d6d6d6] hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
												>
													<span className="w-5 h-5 flex items-center justify-center rounded bg-[#3d3a34] text-[10px] text-[#909d63]">
														{subtask.order + 1}
													</span>
													<span className="flex-1 truncate">
														{subtask.title}
													</span>
												</button>
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
								suggestedColor="#e5c07b"
								onClick={onReviewTask}
							/>
						</>
					)}
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
	suggestedColor: string;
	onClick: () => void;
}

function ActionButton({
	label,
	icon,
	isLoading,
	isSuggested,
	suggestedColor,
	onClick,
}: ActionButtonProps) {
	return (
		<div className="flex-1 relative">
			<button
				type="button"
				onClick={onClick}
				className={`w-full h-full flex flex-row items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-200 ${
					isSuggested
						? `border-[${suggestedColor}] bg-[${suggestedColor}]/10 text-[${suggestedColor}] shadow-lg shadow-[${suggestedColor}]/10`
						: "border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]"
				}`}
				style={
					isSuggested
						? {
								borderColor: suggestedColor,
								backgroundColor: `${suggestedColor}1a`,
								color: suggestedColor,
								boxShadow: `0 10px 15px -3px ${suggestedColor}1a`,
							}
						: undefined
				}
			>
				{isLoading ? <Loader2 size={20} className="animate-spin" /> : icon}
				<span className="text-sm font-medium">{label}</span>
			</button>
			{isSuggested && (
				<span
					className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded"
					style={{
						backgroundColor: suggestedColor,
						color: "#1c1c1c",
					}}
				>
					Sugestão
				</span>
			)}
		</div>
	);
}
