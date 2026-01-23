import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DescriptionWithImages } from "@/components/tasks/DescriptionWithImages";
import { ImageModal } from "@/components/tasks/ImageModal";
import { ImageThumbnail } from "@/components/tasks/ImageThumbnail";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { SelectImageKDE } from "@/components/SelectImageKDE";
import { safeInvoke } from "@/services/tauri";
import type { Subtask, TaskExecution, TaskFull, TaskImageMetadata } from "@/types";
import { deriveProgressState } from "@/lib/constants/taskStatus";

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

	const progressState = deriveProgressState(taskFull);

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
					className="flex-1 px-4 py-2 bg-background border border-border text-foreground text-sm focus:border-accent focus:outline-none transition-colors disabled:opacity-50"
				/>
				<button
					type="button"
					onClick={onLaunchQuickfix}
					disabled={!quickfixInput.trim() || isBlocked}
					className="px-4 py-2 bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

		{progressState !== "idle" && progressState !== "started" && (
			<SubtaskList
					subtasks={taskFull.subtasks}
					onAdd={onAddSubtask}
					onToggle={onToggleSubtask}
					onRemove={onRemoveSubtask}
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
						className="flex items-center gap-2 px-3 py-1.5 text-xs bg-card hover:bg-secondary text-foreground border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
							<span className="text-muted-foreground">*</span>
							<span className="flex-1 text-foreground text-sm">{rule}</span>
							<button
								type="button"
								onClick={() => onRemoveBusinessRule(i)}
								disabled={isBlocked}
								className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all p-1 disabled:cursor-not-allowed"
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
						<span className="text-muted-foreground">+</span>
						<input
							type="text"
							value={newRule}
							onChange={(e) => setNewRule(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
							placeholder="Adicionar regra..."
							disabled={isBlocked}
							className="flex-1 bg-transparent text-foreground text-sm focus:outline-none border-b border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
					className="w-full px-3 py-2 bg-card border border-border text-foreground text-sm focus:border-primary focus:outline-none resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
							<span className="text-muted-foreground">✓</span>
							<span className="flex-1 text-foreground text-sm">{criteria}</span>
							<button
								type="button"
								onClick={() => onRemoveAcceptanceCriteria(i)}
								className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all p-1"
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
						<span className="text-muted-foreground">+</span>
						<input
							type="text"
							value={newCriteria}
							onChange={(e) => setNewCriteria(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddCriteria()}
							placeholder="Adicionar critério..."
							disabled={isBlocked}
							className="flex-1 bg-transparent text-foreground text-sm focus:outline-none border-b border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			</CollapsibleSection>

			{(progressState === "idle" || progressState === "started") && (
				<SubtaskList
					subtasks={taskFull.subtasks}
					onAdd={onAddSubtask}
					onToggle={onToggleSubtask}
					onRemove={onRemoveSubtask}
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
				className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground transition-colors"
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
		<div className="p-4 bg-background border border-primary animate-fade-in relative overflow-hidden">
			<div className="absolute top-0 left-0 w-full h-1 bg-card">
				<div
					className="h-full bg-primary transition-all duration-500 ease-out"
					style={{
						width: `${(execution.current_step / execution.total_steps) * 100}%`,
					}}
				/>
			</div>

			<div className="flex items-center gap-3 mb-2">
				<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs">
					<Loader2 size={14} className="animate-spin" />
				</span>
				<span className="text-primary font-medium text-sm">
					Executando: Passo {execution.current_step} de {execution.total_steps}
				</span>
				{execution.execution_type === "subtask" && (
					<span className="text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
						Subtask
					</span>
				)}
			</div>

			<div className="pl-9 text-sm text-foreground">
				{execution.current_step_description || "Processando..."}
			</div>

			{execution.tmux_session && (
				<div className="mt-3 pl-9">
					<button
						type="button"
						onClick={() => onFocusTerminal(execution.tmux_session ?? "")}
						className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
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
		<div className="p-4 bg-background border border-chart-4 animate-fade-in">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3">
					<div className="relative">
						<div className="w-3 h-3 bg-chart-4 rounded-full animate-pulse" />
						<div className="absolute inset-0 w-3 h-3 bg-chart-4 rounded-full animate-ping opacity-50" />
					</div>
					<div>
						<div className="text-sm font-medium text-chart-4">
							Agent ajustando tarefa...
						</div>
						<div className="text-xs text-muted-foreground">
							Os campos estao bloqueados durante o ajuste
						</div>
					</div>
				</div>

				{prompt && (
					<div className="flex-1 text-sm text-foreground truncate italic">
						&quot;{prompt}&quot;
					</div>
				)}

				<div className="flex items-center gap-2">
					<Loader2 size={18} className="animate-spin text-chart-4" />
				</div>
			</div>
		</div>
	);
}
