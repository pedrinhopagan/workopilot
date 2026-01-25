import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DragHandle, SortableList } from "@/components/ui/sortable-list";
import { cn } from "@/lib/utils";
import { trpc } from "@/services/trpc";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Urgency = {
	id: string;
	name: string;
	level: number;
	color: string;
	display_order: number;
};

type UrgencyManagementDrawerProps = {
	isOpen: boolean;
	onClose: () => void;
	highlightId?: string | null;
};

const MAX_URGENCIES = 10;

const DEFAULT_COLORS = [
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
	"#6366f1",
	"#64748b",
];

export function UrgencyManagementDrawer({
	isOpen,
	onClose,
	highlightId,
}: UrgencyManagementDrawerProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editLevel, setEditLevel] = useState<number>(1);
	const [editColor, setEditColor] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newLevel, setNewLevel] = useState<number>(1);
	const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
	const [deleteTarget, setDeleteTarget] = useState<Urgency | null>(null);
	const [migrationTarget, setMigrationTarget] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const newInputRef = useRef<HTMLInputElement>(null);

	const utils = trpc.useUtils();
	const urgenciesQuery = trpc.urgencies.list.useQuery(undefined, {
		enabled: isOpen,
	});
	const createUrgency = trpc.urgencies.create.useMutation({
		onSuccess: () => {
			utils.urgencies.list.invalidate();
			setIsCreating(false);
			setNewName("");
			setNewLevel(1);
			setNewColor(DEFAULT_COLORS[0]);
		},
	});
	const updateUrgency = trpc.urgencies.update.useMutation({
		onSuccess: () => {
			utils.urgencies.list.invalidate();
			setEditingId(null);
		},
	});
	const reorderUrgencies = trpc.urgencies.reorder.useMutation({
		onSuccess: () => {
			utils.urgencies.list.invalidate();
		},
	});
	const deleteUrgency = trpc.urgencies.delete.useMutation({
		onSuccess: () => {
			utils.urgencies.list.invalidate();
			setDeleteTarget(null);
		},
	});
	const migrateAndDelete = trpc.urgencies.migrateAndDelete.useMutation({
		onSuccess: () => {
			utils.urgencies.list.invalidate();
			setDeleteTarget(null);
			setMigrationTarget(null);
		},
	});
	const hasAssociatedTasks = trpc.urgencies.hasAssociatedTasks.useQuery(
		{ id: deleteTarget?.id ?? "" },
		{ enabled: !!deleteTarget },
	);

	const urgencies = urgenciesQuery.data ?? [];
	const canCreate = urgencies.length < MAX_URGENCIES;

	useEffect(() => {
		if (editingId && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editingId]);

	useEffect(() => {
		if (isCreating && newInputRef.current) {
			newInputRef.current.focus();
		}
	}, [isCreating]);

	useEffect(() => {
		if (!isOpen) return;
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === "Escape" && !editingId && !isCreating && !deleteTarget) {
				onClose();
			}
		}
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [isOpen, onClose, editingId, isCreating, deleteTarget]);

	function handleClickOutside(e: React.MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.classList.contains("drawer-backdrop-urgency")) {
			onClose();
		}
	}

	function startEditing(urgency: Urgency) {
		setEditingId(urgency.id);
		setEditName(urgency.name);
		setEditLevel(urgency.level);
		setEditColor(urgency.color);
	}

	function cancelEditing() {
		setEditingId(null);
		setEditName("");
		setEditLevel(1);
		setEditColor("");
	}

	async function saveEditing() {
		if (!editingId || !editName.trim()) {
			cancelEditing();
			return;
		}
		await updateUrgency.mutateAsync({
			id: editingId,
			name: editName.trim(),
			level: editLevel,
			color: editColor,
		});
	}

	async function handleCreate() {
		if (!newName.trim() || !canCreate) return;
		await createUrgency.mutateAsync({
			name: newName.trim(),
			level: newLevel,
			color: newColor,
		});
	}

	function handleReorder(newUrgencies: Urgency[]) {
		const orderedIds = newUrgencies.map((u) => u.id);
		reorderUrgencies.mutate({ orderedIds });
	}

	async function handleDeleteClick(urgency: Urgency) {
		setDeleteTarget(urgency);
		setMigrationTarget(null);
	}

	async function confirmDelete() {
		if (!deleteTarget) return;

		if (hasAssociatedTasks.data) {
			if (!migrationTarget) return;
			await migrateAndDelete.mutateAsync({
				sourceId: deleteTarget.id,
				targetId: migrationTarget,
			});
		} else {
			await deleteUrgency.mutateAsync({ id: deleteTarget.id });
		}
	}

	function handleEditKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			saveEditing();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelEditing();
		}
	}

	function handleCreateKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			handleCreate();
		} else if (e.key === "Escape") {
			e.preventDefault();
			setIsCreating(false);
			setNewName("");
		}
	}

	if (!isOpen) return null;

	const availableForMigration = urgencies.filter(
		(u) => u.id !== deleteTarget?.id,
	);

	return (
		<>
			<button
				type="button"
				className="drawer-backdrop-urgency fixed inset-0 bg-black/50 z-40"
				onClick={handleClickOutside}
				aria-label="Fechar drawer"
			/>

			<div className="fixed top-0 right-0 h-full w-[380px] bg-background border-l border-border z-50 flex flex-col shadow-xl animate-slide-in">
				<div className="flex items-center gap-3 p-4 border-b border-border">
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground transition-colors p-1"
						title="Fechar"
					>
						<X className="size-5" />
					</button>
					<h2 className="text-base font-medium text-foreground flex-1">
						Gerenciar Urgências
					</h2>
					<span className="text-xs text-muted-foreground">
						{urgencies.length}/{MAX_URGENCIES}
					</span>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{urgenciesQuery.isLoading ? (
						<div className="text-center text-muted-foreground py-8 text-sm">
							Carregando...
						</div>
					) : urgencies.length === 0 ? (
						<div className="text-center text-muted-foreground py-8 text-sm">
							Nenhuma urgência cadastrada
						</div>
					) : (
						<SortableList
							items={urgencies}
							onReorder={handleReorder}
							className="gap-2"
							renderItem={(urgency, { ref, dragHandleProps, style }) => {
								const isHighlighted = urgency.id === highlightId;
								const isEditing = editingId === urgency.id;

								if (isEditing) {
									return (
										<div
											ref={ref}
											style={style}
											className="flex items-center gap-2 p-2 bg-card border border-border rounded-md"
										>
											<div className="shrink-0">
												<input
													type="color"
													value={editColor}
													onChange={(e) => setEditColor(e.target.value)}
													className="size-6 rounded cursor-pointer border-0"
													title="Cor"
												/>
											</div>
											<input
												ref={inputRef}
												type="text"
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												onKeyDown={handleEditKeyDown}
												className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none"
												placeholder="Nome"
											/>
											<input
												type="number"
												value={editLevel}
												onChange={(e) => setEditLevel(Number(e.target.value))}
												onKeyDown={handleEditKeyDown}
												className="w-14 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none text-center"
												placeholder="Nível"
												min={1}
											/>
											<button
												type="button"
												onClick={() => saveEditing()}
												disabled={updateUrgency.isPending}
												className="p-1.5 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
												title="Salvar"
											>
												<Check className="size-4" />
											</button>
											<button
												type="button"
												onClick={() => cancelEditing()}
												className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
												title="Cancelar"
											>
												<X className="size-4" />
											</button>
										</div>
									);
								}

								return (
									<div
										ref={ref}
										style={style}
										className={cn(
											"flex items-center gap-2 p-2 bg-card border border-border rounded-md group transition-colors",
											isHighlighted && "ring-2 ring-primary",
										)}
									>
										<DragHandle
											{...dragHandleProps}
											className="opacity-0 group-hover:opacity-100 cursor-grab"
										/>
										<span
											className="size-3 rounded-full shrink-0"
											style={{ backgroundColor: urgency.color }}
										/>
										<span className="flex-1 text-sm text-foreground truncate">
											{urgency.name}
										</span>
										<span className="text-xs text-muted-foreground tabular-nums">
											{urgency.level}
										</span>
										<button
											type="button"
											onClick={() => startEditing(urgency)}
											className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground transition-all"
											title="Editar"
										>
											<Pencil className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() => handleDeleteClick(urgency)}
											className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all"
											title="Excluir"
										>
											<Trash2 className="size-3.5" />
										</button>
									</div>
								);
							}}
						/>
					)}

					<div className="mt-4">
						{isCreating ? (
							<div className="flex items-center gap-2 p-2 bg-card border border-border rounded-md">
								<div className="shrink-0">
									<input
										type="color"
										value={newColor}
										onChange={(e) => setNewColor(e.target.value)}
										className="size-6 rounded cursor-pointer border-0"
										title="Cor"
									/>
								</div>
								<input
									ref={newInputRef}
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									onKeyDown={handleCreateKeyDown}
									className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none"
									placeholder="Nome"
								/>
								<input
									type="number"
									value={newLevel}
									onChange={(e) => setNewLevel(Number(e.target.value))}
									onKeyDown={handleCreateKeyDown}
									className="w-14 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none text-center"
									placeholder="Nível"
									min={1}
								/>
								<button
									type="button"
									onClick={handleCreate}
									disabled={createUrgency.isPending || !newName.trim()}
									className="p-1.5 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
									title="Criar"
								>
									<Check className="size-4" />
								</button>
								<button
									type="button"
									onClick={() => {
										setIsCreating(false);
										setNewName("");
									}}
									className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
									title="Cancelar"
								>
									<X className="size-4" />
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setIsCreating(true)}
								disabled={!canCreate}
								className={cn(
									"flex items-center gap-2 w-full p-2 text-sm text-muted-foreground",
									"border border-dashed border-border rounded-md",
									"hover:border-muted-foreground hover:text-foreground transition-colors",
									"disabled:opacity-50 disabled:cursor-not-allowed",
								)}
							>
								<Plus className="size-4" />
								<span>Nova urgência</span>
								{!canCreate && (
									<span className="ml-auto text-xs">(limite atingido)</span>
								)}
							</button>
						)}
					</div>
				</div>

				<div className="p-3 border-t border-border text-xs text-muted-foreground">
					Arraste para reordenar
				</div>
			</div>

			{deleteTarget &&
				!hasAssociatedTasks.isLoading &&
				(hasAssociatedTasks.data ? (
					<div className="fixed inset-0 z-[60] flex items-center justify-center">
						<button
							type="button"
							className="absolute inset-0 bg-black/60"
							onClick={() => {
								setDeleteTarget(null);
								setMigrationTarget(null);
							}}
							aria-label="Fechar"
						/>
						<div className="relative bg-card border border-border p-4 max-w-md w-full mx-4 rounded-md">
							<h3 className="text-foreground text-lg mb-2">
								Migrar tarefas antes de excluir
							</h3>
							<p className="text-muted-foreground text-sm mb-4">
								A urgência "{deleteTarget.name}" possui tarefas associadas.
								Selecione para qual urgência deseja mover essas tarefas:
							</p>
							<div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
								{availableForMigration.map((urgency) => (
									<button
										type="button"
										key={urgency.id}
										onClick={() => setMigrationTarget(urgency.id)}
										className={cn(
											"flex items-center gap-2 w-full p-2 rounded-md text-left transition-colors",
											migrationTarget === urgency.id
												? "bg-primary/10 border border-primary"
												: "bg-popover border border-border hover:border-muted-foreground",
										)}
									>
										<span
											className="size-3 rounded-full shrink-0"
											style={{ backgroundColor: urgency.color }}
										/>
										<span className="text-sm text-foreground flex-1">
											{urgency.name}
										</span>
										<span className="text-xs text-muted-foreground">
											{urgency.level}
										</span>
										{migrationTarget === urgency.id && (
											<Check className="size-4 text-primary" />
										)}
									</button>
								))}
							</div>
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => {
										setDeleteTarget(null);
										setMigrationTarget(null);
									}}
									className="px-4 py-2 bg-popover border border-border text-muted-foreground text-sm hover:text-foreground transition-colors rounded-md"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={confirmDelete}
									disabled={!migrationTarget || migrateAndDelete.isPending}
									className="px-4 py-2 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors rounded-md disabled:opacity-50"
								>
									{migrateAndDelete.isPending
										? "Migrando..."
										: "Migrar e excluir"}
								</button>
							</div>
						</div>
					</div>
				) : (
					<ConfirmDialog
						isOpen={true}
						title="Excluir urgência"
						message={`Tem certeza que deseja excluir a urgência "${deleteTarget.name}"?`}
						confirmText="Excluir"
						cancelText="Cancelar"
						onConfirm={confirmDelete}
						onCancel={() => setDeleteTarget(null)}
						danger
					/>
				))}
		</>
	);
}
