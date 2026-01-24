import { createFileRoute, Outlet, useLocation, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { TabBar } from "../components/TabBar";
import type { ProjectsSearch } from "../lib/searchSchemas";
import { trpc } from "../services/trpc";
import { useSelectedProjectStore } from "../stores/selectedProject";
import { ProjectsSidebar } from "./projects/-components";

function ProjectsLayout() {
	const location = useLocation();
	const search = useSearch({ strict: false }) as Partial<ProjectsSearch>;
	const selectedProjectId = useSelectedProjectStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const isSettingsPage = location.pathname.includes("/settings");

	const { data: projects = [] } = trpc.projects.list.useQuery();

	useEffect(() => {
		setProjectsList(projects);

		if (projects.length > 0) {
			const urlProjectId = search.projectId;
			const targetId = urlProjectId || selectedProjectId;

			if (targetId && projects.some((p) => p.id === targetId)) {
				setSelectedProjectId(targetId);
			} else if (!selectedProjectId) {
				setSelectedProjectId(projects[0].id);
			}
		}
	}, [projects, search.projectId, selectedProjectId, setProjectsList, setSelectedProjectId]);

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
