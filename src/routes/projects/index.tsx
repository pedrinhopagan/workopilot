import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { projectsSearchSchema } from "../../lib/searchSchemas";
import { trpc } from "../../services/trpc";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import { NewProjectForm, ProjectDashboard } from "./-components";

function ProjectsPage() {
	const search = useSearch({ from: "/projects/" });
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const [showNewProjectForm, setShowNewProjectForm] = useState(search.newProject === "true");

	const { data: projectsData = [] } = trpc.projects.list.useQuery();

	const { data: projectConfigData, isLoading } = trpc.projects.get.useQuery(
		{ id: selectedProjectId! },
		{ enabled: !!selectedProjectId }
	);

	const projectConfig = projectConfigData ? {
		...projectConfigData,
		description: projectConfigData.description ?? undefined,
		color: projectConfigData.color ?? undefined,
		routes: projectConfigData.routes.map(r => ({ ...r, env_path: r.env_path ?? undefined })),
	} : null;

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
		if (projects.length > 0 && !selectedProjectId) {
			setSelectedProjectId(projects[0].id);
		}
	}, [projectsData, selectedProjectId, setProjectsList, setSelectedProjectId]);

	useEffect(() => {
		if (search.newProject === "true") {
			setShowNewProjectForm(true);
		}
	}, [search.newProject]);

	function handleProjectCreated() {
		setShowNewProjectForm(false);
	}

	function handleCancelNewProject() {
		setShowNewProjectForm(false);
	}

	return (
		<div className="flex-1 overflow-y-auto p-4">
			{showNewProjectForm ? (
				<NewProjectForm onCancel={handleCancelNewProject} onCreated={handleProjectCreated} />
			) : isLoading ? (
				<div className="flex items-center justify-center h-full text-muted-foreground">Carregando...</div>
			) : projectConfig && selectedProjectId ? (
				<ProjectDashboard projectConfig={projectConfig} selectedProjectId={selectedProjectId} />
			) : (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					Selecione um projeto ou crie um novo
				</div>
			)}
		</div>
	);
}

export const Route = createFileRoute("/projects/")({
	component: ProjectsPage,
	validateSearch: (search) => projectsSearchSchema.parse(search),
});
