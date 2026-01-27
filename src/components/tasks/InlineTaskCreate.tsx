import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { trpc } from "@/services/trpc";
import { useSelectedProjectStore } from "@/stores/selectedProject";
import { Check, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { CategoryManagementDrawer } from "./CategoryManagementDrawer";
import { CategorySelect } from "./CategorySelect";
import { UrgencyManagementDrawer } from "./UrgencyManagementDrawer";
import { UrgencySelect } from "./UrgencySelect";

type InlineTaskCreateProps = {
	projectId: string | null;
	onCreated?: () => void;
	className?: string;
};

export function InlineTaskCreate({
	projectId,
	onCreated,
	className,
}: InlineTaskCreateProps) {
	const [title, setTitle] = useState("");
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [urgencyId, setUrgencyId] = useState<string | null>(null);
	const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
	const [isUrgencyDrawerOpen, setIsUrgencyDrawerOpen] = useState(false);
	const [isProjectSelectOpen, setIsProjectSelectOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const projectsList = useSelectedProjectStore((s) => s.projectsList);
	const setSelectedProjectId = useSelectedProjectStore(
		(s) => s.setSelectedProjectId,
	);

	const utils = trpc.useUtils();
	const categoriesQuery = trpc.categories.list.useQuery();
	const urgenciesQuery = trpc.urgencies.list.useQuery();

	const categories = categoriesQuery.data ?? [];
	const urgencies = urgenciesQuery.data ?? [];

	const getDefaultCategoryId = useCallback(() => {
		if (categoryId) return categoryId;
		return categories[0]?.id ?? null;
	}, [categoryId, categories]);

	const getDefaultUrgencyId = useCallback(() => {
		if (urgencyId) return urgencyId;
		const medium = urgencies.find((u) => u.level === 2);
		return medium?.id ?? urgencies[0]?.id ?? null;
	}, [urgencyId, urgencies]);

	const createTaskMutation = trpc.tasks.create.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
			setTitle("");
			inputRef.current?.focus();
			onCreated?.();
		},
		onError: (error) => {
			toast.error("Erro ao criar tarefa", {
				description: error.message,
			});
		},
	});

	const isLoading = createTaskMutation.isPending;

	const createTask = useCallback(
		async (targetProjectId: string) => {
			const trimmedTitle = title.trim();
			if (!trimmedTitle) {
				toast.error("Título obrigatório", {
					description: "Digite um título para a tarefa.",
				});
				inputRef.current?.focus();
				return;
			}

			await createTaskMutation.mutateAsync({
				title: trimmedTitle,
				project_id: targetProjectId,
			});
		},
		[title, createTaskMutation],
	);

	const handleSubmit = useCallback(async () => {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			toast.error("Título obrigatório", {
				description: "Digite um título para a tarefa.",
			});
			inputRef.current?.focus();
			return;
		}

		if (!projectId) {
			toast.error("Selecione um projeto", {
				description: "Escolha um projeto para criar a tarefa.",
			});
			setIsProjectSelectOpen(true);
			return;
		}

		await createTask(projectId);
	}, [projectId, title, createTask]);

	const handleProjectSelect = useCallback(
		async (selectedProjectId: string) => {
			setIsProjectSelectOpen(false);
			setSelectedProjectId(selectedProjectId);

			const trimmedTitle = title.trim();
			if (trimmedTitle) {
				await createTask(selectedProjectId);
			}
		},
		[title, createTask, setSelectedProjectId],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	return (
		<>
			<div
				className={cn(
					"flex items-center gap-3 p-3 bg-card border border-border rounded-lg",
					className,
				)}
			>
				<input
					ref={inputRef}
					type="text"
					placeholder="Nova tarefa..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={isLoading}
					className={cn(
						"flex-1 px-3 py-2 bg-background border border-border rounded-md",
						"text-sm text-foreground placeholder:text-muted-foreground",
						"focus:border-primary focus:outline-none transition-colors",
						"disabled:cursor-not-allowed disabled:bg-muted/50",
					)}
				/>

				<CategorySelect
					value={getDefaultCategoryId()}
					onValueChange={(id) => setCategoryId(id)}
					onManageClick={() => setIsCategoryDrawerOpen(true)}
					disabled={isLoading}
				/>

				<UrgencySelect
					value={getDefaultUrgencyId()}
					onValueChange={(id) => setUrgencyId(id)}
					onManageClick={() => setIsUrgencyDrawerOpen(true)}
					disabled={isLoading}
				/>

				<Popover
					open={isProjectSelectOpen}
					onOpenChange={setIsProjectSelectOpen}
				>
					<PopoverAnchor asChild>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isLoading || !title.trim()}
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-md",
								"bg-primary text-primary-foreground text-sm font-medium",
								"hover:bg-primary/90 transition-colors",
								"disabled:opacity-50 disabled:cursor-not-allowed",
							)}
						>
							Adicionar tarefa
							<Plus className="size-4" />
						</button>
					</PopoverAnchor>

					<PopoverContent align="end" className="w-64 p-0">
						<div className="px-3 py-2 border-b border-border">
							<span className="text-xs text-muted-foreground uppercase tracking-wider">
								Selecione um projeto
							</span>
						</div>

						<div className="max-h-64 overflow-y-auto">
							{projectsList.length === 0 ? (
								<div className="px-3 py-4 text-sm text-muted-foreground text-center">
									Nenhum projeto cadastrado
								</div>
							) : (
								projectsList.map((project) => {
									const isSelected = project.id === projectId;

									return (
										<button
											type="button"
											key={project.id}
											className={cn(
												"flex items-center gap-2 px-3 py-2 w-full cursor-pointer transition-colors text-left",
												isSelected ? "bg-popover" : "hover:bg-popover",
											)}
											onClick={() => handleProjectSelect(project.id)}
										>
											<span
												className="size-2 rounded-full shrink-0"
												style={{ backgroundColor: project.color || "#6b7280" }}
											/>
											<span
												className={cn(
													"flex-1 text-sm truncate",
													isSelected
														? "text-foreground font-medium"
														: "text-foreground",
												)}
											>
												{project.name}
											</span>

											{isSelected && (
												<Check className="size-3 text-primary shrink-0" />
											)}
										</button>
									);
								})
							)}
						</div>
					</PopoverContent>
				</Popover>
			</div>

			<CategoryManagementDrawer
				isOpen={isCategoryDrawerOpen}
				onClose={() => setIsCategoryDrawerOpen(false)}
			/>

			<UrgencyManagementDrawer
				isOpen={isUrgencyDrawerOpen}
				onClose={() => setIsUrgencyDrawerOpen(false)}
			/>
		</>
	);
}
