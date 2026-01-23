import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DescriptionWithImages } from "../../../../components/tasks/DescriptionWithImages";
import { ImageModal } from "../../../../components/tasks/ImageModal";
import { ImageThumbnail } from "../../../../components/tasks/ImageThumbnail";
import { SubtaskList } from "../../../../components/tasks/SubtaskList";
import { SelectImageKDE } from "../../../../components/SelectImageKDE";
import { safeInvoke } from "../../../../services/tauri";
import type { Subtask, TaskExecution, TaskFull, TaskImageMetadata } from "../../../../types";
import { getTaskStatusFromTask } from "../../../../lib/constants/taskStatus";

interface ManageTaskFormProps {
	taskId: string;
	taskFull: TaskFull;
	taskImages: TaskImageMetadata[];
	loadedImages: Map<string, { data: string; loading: boolean; error: string | null }>;
	activeExecution: TaskExecution | null;
	isBlocked: boolean;
	isExecuting: boolean;
	isAdjusting: boolean;
	adjustingPrompt: string | null;
	quickfixInput: string;
	isLaunchingQuickfix: boolean;
	onQuickfixInputChange: (value: string) => void;
	onLaunchQuickfix: () => void;
	onDescriptionSave: (value: string | null) => void;
	onImageUpload: () => Promise<void>;
	onImageDelete: (imageId: string) => Promise<void>;
	onImageView: (imageId: string) => Promise<void>;
	onAddSubtask: (title: string) => void;
	onToggleSubtask: (id: string) => void;
	onRemoveSubtask: (id: string) => void;
	onCodarSubtask: (id: string) => void;
	onUpdateSubtask: (id: string, field: keyof Subtask, value: unknown) => void;
	onReorderSubtasks: (newSubtasks: Subtask[]) => void;
	onAddBusinessRule: (rule: string) => void;
	onRemoveBusinessRule: (index: number) => void;
	onAddAcceptanceCriteria: (criteria: string) => void;
	onRemoveAcceptanceCriteria: (index: number) => void;
	onTechnicalNotesChange: (value: string) => void;
	onTechnicalNotesSave: () => void;
	localTechnicalNotes: string;
	viewingImageId: string | null;
	viewingImageUrl: string | null;
	onCloseImageModal: () => void;
}

export function ManageTaskForm({
	taskId,
	taskFull,
	taskImages,
	loadedImages,
	activeExecution,
	isBlocked,
	isExecuting,
	isAdjusting,
	adjustingPrompt,
	quickfixInput,
	isLaunchingQuickfix,
	onQuickfixInputChange,
	onLaunchQuickfix,
	onDescriptionSave,
	onImageUpload,
	onImageDelete,
	onImageView,
	onAddSubtask,
	onToggleSubtask,
	onRemoveSubtask,
	onCodarSubtask,
	onUpdateSubtask,
	onReorderSubtasks,
	onAddBusinessRule,
	onRemoveBusinessRule,
	onAddAcceptanceCriteria,
	onRemoveAcceptanceCriteria,
	onTechnicalNotesChange,
	onTechnicalNotesSave,
	localTechnicalNotes,
	viewingImageId,
	viewingImageUrl,
	onCloseImageModal,
}: ManageTaskFormProps) {
	const [newRule, setNewRule] = useState("");
	const [newCriteria, setNewCriteria] = useState("");
	const [showBusinessRules, setShowBusinessRules] = useState(
		!!taskFull?.context.business_rules?.length,
	);
	const [showTechnicalNotes, setShowTechnicalNotes] = useState(
		!!taskFull?.context.technical_notes,
	);
	const [showAcceptanceCriteria, setShowAcceptanceCriteria] = useState(
		!!taskFull?.context.acceptance_criteria?.length,
	);
	const [showImages, setShowImages] = useState(taskImages.length > 0);
	const [isUploadingImage, setIsUploadingImage] = useState(false);

	const taskStatus = getTaskStatusFromTask(taskFull);

	function handleAddRule() {
		if (!newRule.trim()) return;
		onAddBusinessRule(newRule.trim());
		setNewRule("");
	}

	function handleAddCriteria() {
		if (!newCriteria.trim()) return;
		onAddAcceptanceCriteria(newCriteria.trim());
		setNewCriteria("");
	}

	async function handleSelectedImages(paths: string[]) {
		if (isUploadingImage) return;

		const maxImages = 5;
		const remainingSlots = maxImages - taskImages.length;
		if (remainingSlots <= 0 || paths.length === 0) return;

		setIsUploadingImage(true);
		const pathsToUpload = paths.slice(0, remainingSlots);

		for (const filePath of pathsToUpload) {
			try {
				await safeInvoke("add_task_image_from_path", {
					taskId,
					filePath,
				});
			} catch (err) {
				console.error("Failed to upload image:", err);
			}
		}

		await onImageUpload();
		setIsUploadingImage(false);
	}

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-6">
			{isExecuting && activeExecution && (
				<ExecutionProgressCard
					execution={activeExecution}
					onFocusTerminal={(sessionName) =>
						safeInvoke("focus_tmux_session", { sessionName })
					}
				/>
			)}

			{isAdjusting && <AdjustingIndicator prompt={adjustingPrompt} />}

			<div className="flex gap-2">
				<input
					type="text"
					value={quickfixInput}
					onChange={(e) => onQuickfixInputChange(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && onLaunchQuickfix()}
					placeholder="Quickfix: Descreva uma correção rápida..."
					disabled={isBlocked}
					className="flex-1 px-4 py-2 bg-[#1c1c1c] border border-[#3d3a34] rounded-lg text-[#d6d6d6] text-sm focus:border-[#e5c07b] focus:outline-none transition-colors disabled:opacity-50"
				/>
				<button
					type="button"
					onClick={onLaunchQuickfix}
					disabled={!quickfixInput.trim() || isBlocked}
					className="px-4 py-2 bg-[#e5c07b] text-[#1c1c1c] font-medium text-sm rounded-lg hover:bg-[#f5d08a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
				>
					{isLaunchingQuickfix ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m5 12 7-7 7 7" />
							<path d="M12 19V5" />
						</svg>
					)}
					Fix
				</button>
			</div>

			{taskStatus !== "pending" && (
				<SubtaskList
					subtasks={taskFull.subtasks}
					onAdd={onAddSubtask}
					onToggle={onToggleSubtask}
					onRemove={onRemoveSubtask}
					onCodar={onCodarSubtask}
					onUpdate={onUpdateSubtask}
					onReorder={onReorderSubtasks}
					disabled={isBlocked}
				/>
			)}

			<DescriptionWithImages
				taskId={taskId}
				description={taskFull.context.description || ""}
				images={taskImages}
				maxImages={5}
				disabled={isBlocked}
				onDescriptionSave={onDescriptionSave}
				onImageUpload={onImageUpload}
				onImageDelete={onImageDelete}
				onImageView={onImageView}
			/>

			<CollapsibleSection
				title={`Imagens (${taskImages.length}/5)`}
				isOpen={showImages}
				onToggle={() => setShowImages(!showImages)}
			>
				<div
					className={`space-y-3 ${isBlocked ? "opacity-50 pointer-events-none" : ""}`}
				>
					<SelectImageKDE
						onSelect={handleSelectedImages}
						disabled={isBlocked || isUploadingImage || taskImages.length >= 5}
						className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#232323] hover:bg-[#2a2a2a] text-[#d6d6d6] border border-[#3d3a34] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isUploadingImage ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
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
								<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
								<circle cx="9" cy="9" r="2" />
								<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
							</svg>
						)}
						Adicionar
					</SelectImageKDE>

					{taskImages.length > 0 && (
						<div className="flex items-center gap-2 flex-wrap">
							{taskImages.map((image) => (
								<ImageThumbnail
									key={image.id}
									imageId={image.id}
									fileName={image.file_name}
									imageState={loadedImages.get(image.id)}
									disabled={isBlocked}
									onView={onImageView}
									onDelete={onImageDelete}
								/>
							))}
						</div>
					)}
				</div>
			</CollapsibleSection>

			<CollapsibleSection
				title="Regras de Negocio (opcional)"
				isOpen={showBusinessRules}
				onToggle={() => setShowBusinessRules(!showBusinessRules)}
			>
				<div
					className={`space-y-2 ${isBlocked ? "opacity-50 pointer-events-none" : ""}`}
				>
					{taskFull.context.business_rules.map((rule, i) => (
						<div key={`rule-${i}`} className="flex items-center gap-2 group">
							<span className="text-[#636363]">*</span>
							<span className="flex-1 text-[#d6d6d6] text-sm">{rule}</span>
							<button
								type="button"
								onClick={() => onRemoveBusinessRule(i)}
								disabled={isBlocked}
								className="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1 disabled:cursor-not-allowed"
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
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</svg>
							</button>
						</div>
					))}
					<div className="flex items-center gap-2">
						<span className="text-[#636363]">+</span>
						<input
							type="text"
							value={newRule}
							onChange={(e) => setNewRule(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
							placeholder="Adicionar regra..."
							disabled={isBlocked}
							className="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			</CollapsibleSection>

			<CollapsibleSection
				title="Notas Técnicas (opcional)"
				isOpen={showTechnicalNotes}
				onToggle={() => setShowTechnicalNotes(!showTechnicalNotes)}
			>
				<textarea
					value={localTechnicalNotes}
					onChange={(e) => onTechnicalNotesChange(e.target.value)}
					onBlur={onTechnicalNotesSave}
					placeholder="Stack, libs, padrões relevantes..."
					rows={2}
					disabled={isBlocked}
					className="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</CollapsibleSection>

			<CollapsibleSection
				title="Critérios de Aceite (opcional)"
				isOpen={showAcceptanceCriteria}
				onToggle={() => setShowAcceptanceCriteria(!showAcceptanceCriteria)}
			>
				<div className="space-y-2">
					{(taskFull.context.acceptance_criteria || []).map((criteria, i) => (
						<div key={`criteria-${i}`} className="flex items-center gap-2 group">
							<span className="text-[#636363]">✓</span>
							<span className="flex-1 text-[#d6d6d6] text-sm">{criteria}</span>
							<button
								type="button"
								onClick={() => onRemoveAcceptanceCriteria(i)}
								className="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
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
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</svg>
							</button>
						</div>
					))}
					<div className="flex items-center gap-2">
						<span className="text-[#636363]">+</span>
						<input
							type="text"
							value={newCriteria}
							onChange={(e) => setNewCriteria(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddCriteria()}
							placeholder="Adicionar critério..."
							disabled={isBlocked}
							className="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			</CollapsibleSection>

			{taskStatus === "pending" && (
				<SubtaskList
					subtasks={taskFull.subtasks}
					onAdd={onAddSubtask}
					onToggle={onToggleSubtask}
					onRemove={onRemoveSubtask}
					onCodar={onCodarSubtask}
					onUpdate={onUpdateSubtask}
					onReorder={onReorderSubtasks}
					disabled={isBlocked}
				/>
			)}

			{viewingImageId && viewingImageUrl && (
				<ImageModal imageUrl={viewingImageUrl} onClose={onCloseImageModal} />
			)}
		</div>
	);
}

interface CollapsibleSectionProps {
	title: string;
	isOpen: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}

function CollapsibleSection({
	title,
	isOpen,
	onToggle,
	children,
}: CollapsibleSectionProps) {
	return (
		<section>
			<button
				type="button"
				onClick={onToggle}
				className="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="transition-transform duration-200"
					style={{ transform: `rotate(${isOpen ? 90 : 0}deg)` }}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				{title}
			</button>
			{isOpen && <div className="animate-slide-down">{children}</div>}
		</section>
	);
}

interface ExecutionProgressCardProps {
	execution: TaskExecution;
	onFocusTerminal: (sessionName: string) => void;
}

function ExecutionProgressCard({
	execution,
	onFocusTerminal,
}: ExecutionProgressCardProps) {
	return (
		<div className="p-4 bg-[#1c1c1c] border border-[#909d63] rounded-lg animate-fade-in relative overflow-hidden">
			<div className="absolute top-0 left-0 w-full h-1 bg-[#232323]">
				<div
					className="h-full bg-[#909d63] transition-all duration-500 ease-out"
					style={{
						width: `${(execution.current_step / execution.total_steps) * 100}%`,
					}}
				/>
			</div>

			<div className="flex items-center gap-3 mb-2">
				<span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#909d63]/20 text-[#909d63] text-xs">
					<Loader2 size={14} className="animate-spin" />
				</span>
				<span className="text-[#909d63] font-medium text-sm">
					Executando: Passo {execution.current_step} de {execution.total_steps}
				</span>
				{execution.execution_type === "subtask" && (
					<span className="text-xs px-2 py-0.5 rounded bg-[#909d63]/10 text-[#909d63] border border-[#909d63]/20">
						Subtask
					</span>
				)}
			</div>

			<div className="pl-9 text-sm text-[#d6d6d6]">
				{execution.current_step_description || "Processando..."}
			</div>

			{execution.tmux_session && (
				<div className="mt-3 pl-9">
					<button
						type="button"
						onClick={() => onFocusTerminal(execution.tmux_session ?? "")}
						className="text-xs flex items-center gap-1.5 text-[#636363] hover:text-[#909d63] transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect width="20" height="14" x="2" y="3" rx="2" />
							<line x1="8" y1="21" x2="16" y2="21" />
							<line x1="12" y1="17" x2="12" y2="21" />
						</svg>
						Abrir Terminal ({execution.tmux_session})
					</button>
				</div>
			)}
		</div>
	);
}

interface AdjustingIndicatorProps {
	prompt: string | null;
}

function AdjustingIndicator({ prompt }: AdjustingIndicatorProps) {
	return (
		<div className="p-4 bg-[#1c1c1c] border border-[#61afef] rounded-lg animate-fade-in">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="relative">
						<div className="w-3 h-3 bg-[#61afef] rounded-full animate-pulse" />
						<div className="absolute inset-0 w-3 h-3 bg-[#61afef] rounded-full animate-ping opacity-50" />
					</div>
					<div>
						<div className="text-sm font-medium text-[#61afef]">
							Agent ajustando tarefa...
						</div>
						<div className="text-xs text-[#636363]">
							Os campos estao bloqueados durante o ajuste
						</div>
					</div>
				</div>

				{prompt && (
					<div className="flex-1 text-sm text-[#d6d6d6] truncate italic">
						&quot;{prompt}&quot;
					</div>
				)}

				<div className="flex items-center gap-2">
					<Loader2 size={18} className="animate-spin text-[#61afef]" />
				</div>
			</div>
		</div>
	);
}
