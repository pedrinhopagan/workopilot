import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { projectsSearchSchema, cleanSearch } from "../../lib/searchSchemas";
import { trpc } from "../../services/trpc";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import { NewProjectForm, ProjectCard, ProjectCardSkeleton, ProjectDetailsPanel, ProjectsFilterBar } from "./-components";
import type { ProjectFilters, ProjectSortBy, ProjectSortOrder, ProjectStatusFilter } from "./-components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, FolderOpen } from "lucide-react";
import type { Project } from "@/types";

type EmptyStateProps = {
	onCreateClick: () => void;
};

const EmptyState = memo(function EmptyState({ onCreateClick }: EmptyStateProps) {
	return (
		<div className="flex items-center justify-center min-h-[400px] animate-fade-in">
			<button
				type="button"
				onClick={onCreateClick}
				className={cn(
					"group relative p-8 border-2 border-dashed border-border/50",
					"bg-card/30 hover:bg-card/50 hover:border-primary/30",
					"transition-all duration-300 cursor-pointer",
					"focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					"max-w-md w-full"
				)}
			>
				<div className="flex flex-col items-center gap-4">
					<div className="p-4 bg-background/50 group-hover:bg-primary/10 transition-colors">
						<FolderOpen 
							size={32} 
							className="text-muted-foreground group-hover:text-primary transition-colors"
						/>
					</div>
					
					<div className="text-center">
						<h3 className="text-foreground font-medium mb-1">
							Nenhum projeto cadastrado
						</h3>
						<p className="text-muted-foreground text-sm mb-4">
							Crie seu primeiro projeto para começar a organizar suas tarefas
						</p>
					</div>

					<div className="flex items-center gap-2 text-primary group-hover:gap-3 transition-all">
						<Plus size={16} />
						<span className="text-sm font-medium">Criar primeiro projeto</span>
					</div>
				</div>

				<div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/20 group-hover:border-primary/50 transition-colors" />
				<div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/20 group-hover:border-primary/50 transition-colors" />
				<div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/20 group-hover:border-primary/50 transition-colors" />
				<div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/20 group-hover:border-primary/50 transition-colors" />
			</button>
		</div>
	);
});

type PageHeaderProps = {
	projectCount: number;
	onNewProject: () => void;
};

const PageHeader = memo(function PageHeader({ projectCount, onNewProject }: PageHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6 animate-fade-in">
			<div>
				<h1 className="text-xl text-foreground font-medium">Projetos</h1>
				<p className="text-sm text-muted-foreground mt-0.5">
					{projectCount === 0 
						? "Comece criando seu primeiro projeto"
						: `${projectCount} ${projectCount === 1 ? "projeto" : "projetos"} cadastrado${projectCount === 1 ? "" : "s"}`
					}
				</p>
			</div>
			
			<Button 
				onClick={onNewProject}
				className="gap-2"
			>
				<Plus size={16} />
				Novo Projeto
			</Button>
		</div>
	);
});

function ProjectsPage() {
	const search = useSearch({ from: "/projects/" });
	const navigate = useNavigate();
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const [showNewProjectForm, setShowNewProjectForm] = useState(search.newProject === "true");

	const { data: projectsData = [], isLoading: isLoadingProjects } = trpc.projects.list.useQuery();
	const { data: allStats = [], isLoading: isLoadingStats } = trpc.projects.getAllStats.useQuery();
	const isLoading = isLoadingProjects || isLoadingStats;

	const filters: ProjectFilters = useMemo(() => ({
		search: search.q || "",
		sortBy: (search.sortBy || "activity") as ProjectSortBy,
		sortOrder: (search.sortOrder || "desc") as ProjectSortOrder,
		status: (search.status || "all") as ProjectStatusFilter,
	}), [search.q, search.sortBy, search.sortOrder, search.status]);

	const handleFiltersChange = useCallback((newFilters: ProjectFilters) => {
		navigate({
			to: "/projects",
			search: cleanSearch({
				...search,
				q: newFilters.search || undefined,
				sortBy: newFilters.sortBy === "activity" ? undefined : newFilters.sortBy,
				sortOrder: newFilters.sortOrder === "desc" ? undefined : newFilters.sortOrder,
				status: newFilters.status === "all" ? undefined : newFilters.status,
			}),
		});
	}, [navigate, search]);

	const statsMap = useMemo(() => {
		const map = new Map<string, { pending: number; done: number; total: number; lastModified: string | null }>();
		for (const stat of allStats) {
			map.set(stat.project_id, {
				pending: stat.pending_tasks + stat.in_progress_tasks,
				done: stat.done_tasks,
				total: stat.total_tasks,
				lastModified: stat.last_task_modified_at,
			});
		}
		return map;
	}, [allStats]);

	const filteredAndSortedProjects = useMemo(() => {
		let result = [...projectsData];

		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			result = result.filter(p => 
				p.name.toLowerCase().includes(searchLower) ||
				(p.description?.toLowerCase().includes(searchLower))
			);
		}

		result.sort((a, b) => {
			let comparison = 0;
			
			switch (filters.sortBy) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "activity": {
					const aStats = statsMap.get(a.id);
					const bStats = statsMap.get(b.id);
					const aDate = aStats?.lastModified || a.created_at;
					const bDate = bStats?.lastModified || b.created_at;
					comparison = new Date(bDate).getTime() - new Date(aDate).getTime();
					break;
				}
				case "pending_tasks": {
					const aStats = statsMap.get(a.id);
					const bStats = statsMap.get(b.id);
					comparison = (bStats?.pending || 0) - (aStats?.pending || 0);
					break;
				}
				case "created_at":
					comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					break;
			}
			
			return filters.sortOrder === "asc" ? -comparison : comparison;
		});

		return result;
	}, [projectsData, filters, statsMap]);

	useEffect(() => {
		const projects = projectsData.map(p => ({
			id: p.id,
			name: p.name,
			description: p.description ?? undefined,
			display_order: p.display_order,
			created_at: p.created_at,
			color: p.color ?? undefined,
		}));
		setProjectsList(projects);
	}, [projectsData, setProjectsList]);

	useEffect(() => {
		if (search.newProject === "true") {
			setShowNewProjectForm(true);
		}
	}, [search.newProject]);

	const handleProjectCreated = useCallback(() => {
		setShowNewProjectForm(false);
	}, []);

	const handleCancelNewProject = useCallback(() => {
		setShowNewProjectForm(false);
	}, []);

	const handleNewProject = useCallback(() => {
		setShowNewProjectForm(true);
	}, []);

	const handleProjectClick = useCallback((projectId: string) => {
		const newId = projectId === selectedProjectId ? null : projectId;
		setSelectedProjectId(newId);
		navigate({ 
			to: "/projects", 
			search: newId ? { projectId: newId } : {} 
		});
	}, [setSelectedProjectId, navigate, selectedProjectId]);

	const handleCloseDetailsPanel = useCallback(() => {
		setSelectedProjectId(null);
		navigate({ to: "/projects", search: {} });
	}, [setSelectedProjectId, navigate]);

	const selectedProject = useMemo((): Project | null => {
		if (!selectedProjectId) return null;
		const found = projectsData.find(p => p.id === selectedProjectId);
		if (!found) return null;
		return {
			id: found.id,
			name: found.name,
			description: found.description ?? undefined,
			display_order: found.display_order,
			created_at: found.created_at,
			color: found.color ?? undefined,
		};
	}, [selectedProjectId, projectsData]);

	const getTaskMetrics = useCallback((projectId: string) => {
		const stats = statsMap.get(projectId);
		if (stats) {
			return {
				pending: stats.pending,
				done: stats.done,
				total: stats.total,
				lastModified: stats.lastModified,
			};
		}
		return {
			pending: 0,
			done: 0,
			total: 0,
			lastModified: null,
		};
	}, [statsMap]);

	if (showNewProjectForm) {
		return (
			<div className="flex-1 overflow-y-auto p-6">
				<NewProjectForm onCancel={handleCancelNewProject} onCreated={handleProjectCreated} />
			</div>
		);
	}

	if (projectsData.length === 0) {
		return (
			<div className="flex-1 overflow-y-auto p-6">
				<PageHeader projectCount={0} onNewProject={handleNewProject} />
				<EmptyState onCreateClick={handleNewProject} />
			</div>
		);
	}

	const hasActiveFilters = filters.search || filters.status !== "all";
	const displayCount = hasActiveFilters 
		? `${filteredAndSortedProjects.length} de ${projectsData.length}`
		: `${projectsData.length}`;

	return (
		<>
			<div className="flex-1 overflow-y-auto p-6">
				<PageHeader projectCount={projectsData.length} onNewProject={handleNewProject} />
				
				<ProjectsFilterBar 
					filters={filters} 
					onFiltersChange={handleFiltersChange} 
				/>

				{isLoading ? (
					<div 
						className="grid gap-5"
						style={{
							gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						}}
					>
						{[0, 1, 2, 3, 4, 5].map((index) => (
							<ProjectCardSkeleton key={`skeleton-${index}`} index={index} />
						))}
					</div>
				) : filteredAndSortedProjects.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
						<p className="text-muted-foreground mb-2">
							Nenhum projeto encontrado com os filtros atuais
						</p>
						<button
							type="button"
							onClick={() => handleFiltersChange({ search: "", sortBy: "activity", sortOrder: "desc", status: "all" })}
							className="text-primary text-sm hover:underline transition-colors hover:text-primary/80"
						>
							Limpar filtros
						</button>
					</div>
				) : (
					<>
						{hasActiveFilters && (
							<p className="text-xs text-muted-foreground mb-3 animate-fade-in">
								Exibindo {displayCount} projeto{filteredAndSortedProjects.length !== 1 ? "s" : ""}
							</p>
						)}
						<div 
							className="grid gap-5"
							style={{
								gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
							}}
						>
							{filteredAndSortedProjects.map((project, index) => (
								<ProjectCard
									key={project.id}
									project={{
										...project,
										description: project.description ?? undefined,
										color: project.color ?? undefined,
									}}
									index={index}
									isSelected={project.id === selectedProjectId}
									onClick={() => handleProjectClick(project.id)}
									taskMetrics={getTaskMetrics(project.id)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{selectedProject && (
				<ProjectDetailsPanel
					project={selectedProject}
					onClose={handleCloseDetailsPanel}
					initialStats={getTaskMetrics(selectedProject.id)}
				/>
			)}
		</>
	);
}

export const Route = createFileRoute("/projects/")({
	component: ProjectsPage,
	validateSearch: (search) => projectsSearchSchema.parse(search),
});
