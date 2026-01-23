import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabBar } from "../components/TabBar";

function HomeLayout() {
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

export const Route = createFileRoute("/home")({
	component: HomeLayout,
});
