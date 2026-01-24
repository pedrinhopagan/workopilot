import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { FolderOpen, Plus } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { projectsSearchSchema } from "../../lib/searchSchemas";
import { trpc } from "../../services/trpc";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import {
	NewProjectForm,
	ProjectCard,
	ProjectCardSkeleton,
	ProjectDetailsPanel,
} from "./-components";

type EmptyStateProps = {
	onCreateClick: () => void;
};

const EmptyState = memo(function EmptyState({
	onCreateClick,
}: EmptyStateProps) {
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
					"max-w-md w-full",
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

const PageHeader = memo(function PageHeader({
	projectCount,
	onNewProject,
}: PageHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6 animate-fade-in">
			<div>
				<h1 className="text-xl text-foreground font-medium">Projetos</h1>
				<p className="text-sm text-muted-foreground mt-0.5">
					{projectCount === 0
						? "Comece criando seu primeiro projeto"
						: `${projectCount} ${projectCount === 1 ? "projeto" : "projetos"} cadastrado${projectCount === 1 ? "" : "s"}`}
				</p>
			</div>

			<Button onClick={onNewProject} className="gap-2">
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
	const setSelectedProjectId = useSelectedProjectStore(
		(s) => s.setSelectedProjectId,
	);

	const [showNewProjectForm, setShowNewProjectForm] = useState(
		search.newProject === "true",
	);

	const { data: projectsData = [], isLoading: isLoadingProjects } =
		trpc.projects.list.useQuery();
	const isLoading = isLoadingProjects;

	const handleProjectClick = useCallback(
		(projectId: string) => {
			const newId = projectId === selectedProjectId ? null : projectId;
			setSelectedProjectId(newId);
			navigate({
				to: "/projects",
				search: newId ? { projectId: newId } : {},
			});
		},
		[setSelectedProjectId, navigate, selectedProjectId],
	);

	const handleCloseDetailsPanel = useCallback(() => {
		setSelectedProjectId(null);
		navigate({ to: "/projects", search: {} });
	}, [setSelectedProjectId, navigate]);

	if (showNewProjectForm) {
		return (
			<div className="flex-1 overflow-y-auto p-6">
				<NewProjectForm
					onCancel={() => setShowNewProjectForm(false)}
					onCreated={() => setShowNewProjectForm(false)}
				/>
			</div>
		);
	}

	if (projectsData.length === 0) {
		return (
			<div className="flex-1 overflow-y-auto p-6">
				<PageHeader
					projectCount={0}
					onNewProject={() => setShowNewProjectForm(true)}
				/>
				<EmptyState onCreateClick={() => setShowNewProjectForm(true)} />
			</div>
		);
	}

	const displayCount = projectsData.length;

	return (
		<>
			<div className="flex-1 overflow-y-auto p-6">
				<PageHeader
					projectCount={projectsData.length}
					onNewProject={() => setShowNewProjectForm(true)}
				/>

				{/* <ProjectsFilterBar 
					filters={filters} 
					onFiltersChange={handleFiltersChange} 
				/> */}

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
				) : (
					<div
						className="grid gap-5"
						style={{
							gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						}}
					>
						{projectsData.map((project, index) => (
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
							/>
						))}
					</div>
				)}
			</div>

			{selectedProjectId && (
				<ProjectDetailsPanel
					project={
						projectsData.find((p) => p.id === selectedProjectId) as Project
					}
					onClose={handleCloseDetailsPanel}
				/>
			)}
		</>
	);
}

export const Route = createFileRoute("/projects/")({
	component: ProjectsPage,
	validateSearch: (search) => projectsSearchSchema.parse(search),
});
