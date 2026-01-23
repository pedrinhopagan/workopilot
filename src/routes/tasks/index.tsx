import { createFileRoute } from "@tanstack/react-router";
import { TasksRoot } from "./-components";

function TasksPage() {
	return <TasksRoot />;
}

export const Route = createFileRoute("/tasks/")({
	component: TasksPage,
});
