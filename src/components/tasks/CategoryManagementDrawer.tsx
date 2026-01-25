import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DragHandle, SortableList } from "@/components/ui/sortable-list";
import { cn } from "@/lib/utils";
import { trpc } from "@/services/trpc";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Category = {
	id: string;
	name: string;
	color: string | null;
	display_order: number;
};

type CategoryManagementDrawerProps = {
	isOpen: boolean;
	onClose: () => void;
	highlightId?: string | null;
};

const MAX_CATEGORIES = 10;

const DEFAULT_COLORS = [
	"#6366f1", // indigo
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#14b8a6", // teal
	"#06b6d4", // cyan
	"#3b82f6", // blue
];

export function CategoryManagementDrawer({
	isOpen,
	onClose,
	highlightId,
}: CategoryManagementDrawerProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editColor, setEditColor] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
	const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
	const [migrationTarget, setMigrationTarget] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const newInputRef = useRef<HTMLInputElement>(null);

	const utils = trpc.useUtils();
	const categoriesQuery = trpc.categories.list.useQuery(undefined, {
		enabled: isOpen,
	});
	const createCategory = trpc.categories.create.useMutation({
		onSuccess: () => {
			utils.categories.list.invalidate();
			setIsCreating(false);
			setNewName("");
			setNewColor(DEFAULT_COLORS[0]);
		},
	});
	const updateCategory = trpc.categories.update.useMutation({
		onSuccess: () => {
			utils.categories.list.invalidate();
			setEditingId(null);
		},
	});
	const reorderCategories = trpc.categories.reorder.useMutation({
		onSuccess: () => {
			utils.categories.list.invalidate();
		},
	});
	const deleteCategory = trpc.categories.delete.useMutation({
		onSuccess: () => {
			utils.categories.list.invalidate();
			setDeleteTarget(null);
		},
	});
	const migrateAndDelete = trpc.categories.migrateAndDelete.useMutation({
		onSuccess: () => {
			utils.categories.list.invalidate();
			setDeleteTarget(null);
			setMigrationTarget(null);
		},
	});
	const hasAssociatedTasks = trpc.categories.hasAssociatedTasks.useQuery(
		{ id: deleteTarget?.id ?? "" },
		{ enabled: !!deleteTarget },
	);

	const categories = categoriesQuery.data ?? [];
	const canCreate = categories.length < MAX_CATEGORIES;

	// Focus input when editing or creating
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

	// Keyboard escape to close
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
		if (target.classList.contains("drawer-backdrop")) {
			onClose();
		}
	}

	function startEditing(category: Category) {
		setEditingId(category.id);
		setEditName(category.name);
		setEditColor(category.color);
	}

	function cancelEditing() {
		setEditingId(null);
		setEditName("");
		setEditColor(null);
	}

	async function saveEditing() {
		if (!editingId || !editName.trim()) {
			cancelEditing();
			return;
		}
		await updateCategory.mutateAsync({
			id: editingId,
			name: editName.trim(),
			color: editColor,
		});
	}

	async function handleCreate() {
		if (!newName.trim() || !canCreate) return;
		await createCategory.mutateAsync({
			name: newName.trim(),
			color: newColor,
		});
	}

	function handleReorder(newCategories: Category[]) {
		const orderedIds = newCategories.map((c) => c.id);
		reorderCategories.mutate({ orderedIds });
	}

	async function handleDeleteClick(category: Category) {
		setDeleteTarget(category);
		setMigrationTarget(null);
	}

	async function confirmDelete() {
		if (!deleteTarget) return;

		if (hasAssociatedTasks.data) {
			// Has tasks - need migration
			if (!migrationTarget) return;
			await migrateAndDelete.mutateAsync({
				sourceId: deleteTarget.id,
				targetId: migrationTarget,
			});
		} else {
			// No tasks - direct delete
			await deleteCategory.mutateAsync({ id: deleteTarget.id });
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

	const availableForMigration = categories.filter(
		(c) => c.id !== deleteTarget?.id,
	);

	return (
		<>
			{/* Backdrop */}
			<button
				type="button"
				className="drawer-backdrop fixed inset-0 bg-black/50 z-40"
				onClick={handleClickOutside}
				aria-label="Fechar drawer"
			/>

			{/* Drawer Panel */}
			<div className="fixed top-0 right-0 h-full w-[380px] bg-background border-l border-border z-50 flex flex-col shadow-xl animate-slide-in">
				{/* Header */}
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
						Gerenciar Categorias
					</h2>
					<span className="text-xs text-muted-foreground">
						{categories.length}/{MAX_CATEGORIES}
					</span>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4">
					{categoriesQuery.isLoading ? (
						<div className="text-center text-muted-foreground py-8 text-sm">
							Carregando...
						</div>
					) : categories.length === 0 ? (
						<div className="text-center text-muted-foreground py-8 text-sm">
							Nenhuma categoria cadastrada
						</div>
					) : (
						<SortableList
							items={categories}
							onReorder={handleReorder}
							className="gap-2"
							renderItem={(category, { ref, dragHandleProps, style }) => {
								const isHighlighted = category.id === highlightId;
								const isEditing = editingId === category.id;

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
													value={editColor || "#6b7280"}
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
												placeholder="Nome da categoria"
											/>
											<button
												type="button"
												onClick={() => saveEditing()}
												disabled={updateCategory.isPending}
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
											style={{ backgroundColor: category.color || "#6b7280" }}
										/>
										<span className="flex-1 text-sm text-foreground truncate">
											{category.name}
										</span>
										<button
											type="button"
											onClick={() => startEditing(category)}
											className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground transition-all"
											title="Editar"
										>
											<Pencil className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() => handleDeleteClick(category)}
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

					{/* Create new */}
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
									placeholder="Nome da nova categoria"
								/>
								<button
									type="button"
									onClick={handleCreate}
									disabled={createCategory.isPending || !newName.trim()}
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
								<span>Nova categoria</span>
								{!canCreate && (
									<span className="ml-auto text-xs">(limite atingido)</span>
								)}
							</button>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="p-3 border-t border-border text-xs text-muted-foreground">
					Arraste para reordenar
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			{deleteTarget &&
				!hasAssociatedTasks.isLoading &&
				(hasAssociatedTasks.data ? (
					// Migration dialog
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
								A categoria "{deleteTarget.name}" possui tarefas associadas.
								Selecione para qual categoria deseja mover essas tarefas:
							</p>
							<div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
								{availableForMigration.map((category) => (
									<button
										type="button"
										key={category.id}
										onClick={() => setMigrationTarget(category.id)}
										className={cn(
											"flex items-center gap-2 w-full p-2 rounded-md text-left transition-colors",
											migrationTarget === category.id
												? "bg-primary/10 border border-primary"
												: "bg-popover border border-border hover:border-muted-foreground",
										)}
									>
										<span
											className="size-3 rounded-full shrink-0"
											style={{ backgroundColor: category.color || "#6b7280" }}
										/>
										<span className="text-sm text-foreground">
											{category.name}
										</span>
										{migrationTarget === category.id && (
											<Check className="size-4 ml-auto text-primary" />
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
					// Simple delete confirmation
					<ConfirmDialog
						isOpen={true}
						title="Excluir categoria"
						message={`Tem certeza que deseja excluir a categoria "${deleteTarget.name}"?`}
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
