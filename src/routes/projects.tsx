import { createFileRoute, Outlet, useLocation, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { TabBar } from "../components/TabBar";
import type { ProjectsSearch } from "../lib/searchSchemas";
import { safeInvoke } from "../services/tauri";
import { useSelectedProjectStore } from "../stores/selectedProject";
import type { Project } from "../types";
import { ProjectsSidebar } from "./projects/-components";

function ProjectsLayout() {
	const location = useLocation();
	const search = useSearch({ strict: false }) as Partial<ProjectsSearch>;
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const isSettingsPage = location.pathname.includes("/settings");

	useEffect(() => {
		async function loadProjects() {
			const loaded = await safeInvoke<Project[]>("get_projects").catch(() => [] as Project[]);
			setProjectsList(loaded);

			if (loaded.length > 0) {
				const urlProjectId = search.projectId;
				const targetId = urlProjectId || selectedProjectId;

				if (targetId && loaded.some((p) => p.id === targetId)) {
					setSelectedProjectId(targetId);
				} else if (!selectedProjectId) {
					setSelectedProjectId(loaded[0].id);
				}
			}
		}
		loadProjects();
	}, [search.projectId, selectedProjectId, setProjectsList, setSelectedProjectId]);

	return (
		<>
			<TabBar />
			<main className="flex flex-1 overflow-hidden">
				<ProjectsSidebar isSettingsPage={isSettingsPage} />
				<section className="flex-1 flex flex-col overflow-hidden">
					<Outlet />
				</section>
			</main>
		</>
	);
}

export const Route = createFileRoute("/projects")({
	component: ProjectsLayout,
});
