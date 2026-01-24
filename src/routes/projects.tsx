import { createFileRoute, Outlet, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { TabBar } from "../components/TabBar";
import type { ProjectsSearch } from "../lib/searchSchemas";
import { trpc } from "../services/trpc";
import { useSelectedProjectStore } from "../stores/selectedProject";

function ProjectsLayout() {
	const search = useSearch({ strict: false }) as Partial<ProjectsSearch>;
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const { data: projects = [] } = trpc.projects.list.useQuery();

	useEffect(() => {
		const normalizedProjects = projects.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description ?? undefined,
			display_order: p.display_order,
			created_at: p.created_at,
			color: p.color ?? undefined,
		}));
		setProjectsList(normalizedProjects);

		const urlProjectId = search.projectId;
		if (urlProjectId && projects.some((p) => p.id === urlProjectId)) {
			setSelectedProjectId(urlProjectId);
		}
	}, [projects, search.projectId, setProjectsList, setSelectedProjectId]);

	return (
		<>
			<TabBar />
			<main className="flex flex-1 overflow-hidden">
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
