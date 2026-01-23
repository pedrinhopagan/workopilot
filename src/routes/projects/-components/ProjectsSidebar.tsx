import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSelectedProjectStore } from "../../../stores/selectedProject";
import { safeInvoke } from "../../../services/tauri";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

type ProjectsSidebarProps = {
	isSettingsPage: boolean;
};

export function ProjectsSidebar({ isSettingsPage }: ProjectsSidebarProps) {
	const navigate = useNavigate();
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const projectsList = useSelectedProjectStore((s) => s.projectsList);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
	const lastSwapRef = useRef(0);

	function handleProjectClick(projectId: string) {
		if (isSettingsPage) {
			if (projectId === selectedProjectId) {
				navigate({ to: "/projects" });
			}
		} else {
			setSelectedProjectId(projectId);
		}
	}

	function handleDragStart(e: React.DragEvent, index: number) {
		setDraggingIndex(index);
		if (e.dataTransfer && e.target instanceof HTMLElement) {
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", "");

			const clone = e.target.cloneNode(true) as HTMLElement;
			clone.style.position = "absolute";
			clone.style.top = "-9999px";
			clone.style.opacity = "1";
			clone.style.background = "var(--background)";
			document.body.appendChild(clone);
			e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
			setTimeout(() => clone.remove(), 0);
		}
	}

	function handleDragOver(e: React.DragEvent, index: number) {
		e.preventDefault();
		if (draggingIndex === null || draggingIndex === index) return;

		const now = Date.now();
		if (now - lastSwapRef.current < 100) return;
		lastSwapRef.current = now;

		const newList = [...projectsList];
		const [draggedItem] = newList.splice(draggingIndex, 1);
		newList.splice(index, 0, draggedItem);

		for (let i = 0; i < newList.length; i++) {
			newList[i] = { ...newList[i], display_order: i };
		}

		setProjectsList(newList);
		setDraggingIndex(index);
	}

	async function handleDragEnd() {
		setDraggingIndex(null);
		const projectOrders: [string, number][] = projectsList.map((p) => [p.id, p.display_order]);
		await safeInvoke("update_projects_order", { projectOrders }).catch(console.error);
	}

	return (
		<aside className="w-56 border-r border-border flex flex-col bg-sidebar">
			<div className="p-3 border-b border-border">
				<span className="text-xs text-muted-foreground uppercase tracking-wide">Projetos</span>
			</div>

			<ul className="flex-1 overflow-y-auto p-2">
				{projectsList.map((project, index) => {
					const isSelected = selectedProjectId === project.id;
					const isDisabled = isSettingsPage && !isSelected;
					const isDragging = draggingIndex === index;
					return (
						<li
							key={project.id}
							draggable={!isSettingsPage}
							onDragStart={(e) => handleDragStart(e, index)}
							onDragOver={(e) => handleDragOver(e, index)}
							onDragEnd={handleDragEnd}
							className={cn(
								"flex items-center gap-1",
								isDragging && "opacity-10",
								!isSettingsPage && "cursor-grab"
							)}
						>
							{!isSettingsPage && (
								<span className="text-muted-foreground/50 select-none flex-shrink-0" aria-hidden="true">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="10"
										height="10"
										viewBox="0 0 24 24"
										fill="currentColor"
										role="img"
										aria-label="Arrastar para reordenar"
									>
										<circle cx="9" cy="5" r="2" />
										<circle cx="9" cy="12" r="2" />
										<circle cx="9" cy="19" r="2" />
										<circle cx="15" cy="5" r="2" />
										<circle cx="15" cy="12" r="2" />
										<circle cx="15" cy="19" r="2" />
									</svg>
								</span>
							)}
							<button
								type="button"
								className={cn(
									"flex-1 px-2 py-2 text-left text-sm transition-colors",
									isSelected && "bg-primary text-primary-foreground",
									!isSelected && !isDisabled && "text-foreground hover:bg-secondary",
									isDisabled && "text-muted-foreground/50 cursor-not-allowed opacity-50"
								)}
								onClick={() => handleProjectClick(project.id)}
								disabled={isDisabled}
								title={isSettingsPage && isSelected ? "Voltar para projetos" : undefined}
							>
								{project.name}
							</button>
						</li>
					);
				})}

				{projectsList.length === 0 && (
					<li className="px-3 py-2 text-muted-foreground text-sm">Nenhum projeto</li>
				)}
			</ul>

			{!isSettingsPage && (
				<div className="p-2 border-t border-border">
					<Button
						variant="outline"
						className="w-full border-dashed"
						onClick={() => navigate({ to: "/projects", search: { newProject: "true" } })}
					>
						+ Novo Projeto
					</Button>
				</div>
			)}
		</aside>
	);
}
