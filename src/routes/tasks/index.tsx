import { createFileRoute } from "@tanstack/react-router";
import { tasksSearchSchema } from "../../lib/searchSchemas";
import { TasksRoot } from "./-components";

function TasksPage() {
	return <TasksRoot />;
}

export const Route = createFileRoute("/tasks/")({
	component: TasksPage,
	validateSearch: (search) => tasksSearchSchema.parse(search),
});
