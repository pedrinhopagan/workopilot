import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { projectsSearchSchema } from "../../lib/searchSchemas";
import { safeInvoke } from "../../services/tauri";
import { useDbRefetchStore } from "../../stores/dbRefetch";
import { useSelectedProjectStore } from "../../stores/selectedProject";
import type { Project, ProjectWithConfig } from "../../types";
import { NewProjectForm, ProjectDashboard } from "./-components";

function ProjectsPage() {
	const search = useSearch({ from: "/projects/" });
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const [projectConfig, setProjectConfig] = useState<ProjectWithConfig | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showNewProjectForm, setShowNewProjectForm] = useState(search.newProject === "true");
	
	const changeCounter = useDbRefetchStore((s) => s.changeCounter);
	const selectedProjectIdRef = useRef(selectedProjectId);
	
	useEffect(() => {
		selectedProjectIdRef.current = selectedProjectId;
	}, [selectedProjectId]);

	async function loadProjects() {
		try {
			const projects = await safeInvoke<Project[]>("get_projects");
			setProjectsList(projects);
			if (projects.length > 0 && !selectedProjectIdRef.current) {
				setSelectedProjectId(projects[0].id);
			}
		} catch (e) {
			console.error("Failed to load projects:", e);
		}
	}

	async function loadProjectConfig(id: string) {
		setIsLoading(true);
		try {
			const config = await safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId: id });
			setProjectConfig(config);
		} catch (e) {
			console.error("Failed to load project config:", e);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		loadProjects();
	}, []);

	useEffect(() => {
		if (search.newProject === "true") {
			setShowNewProjectForm(true);
		}
	}, [search.newProject]);

	useEffect(() => {
		if (selectedProjectId) {
			loadProjectConfig(selectedProjectId);
		}
	}, [selectedProjectId]);

	useEffect(() => {
		if (changeCounter === 0) return;
		loadProjects();
		if (selectedProjectIdRef.current) {
			loadProjectConfig(selectedProjectIdRef.current);
		}
	}, [changeCounter]);

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
