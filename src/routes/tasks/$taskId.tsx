import { createFileRoute } from "@tanstack/react-router";
import { ManageTaskRoot } from "./$taskId/-components";

function TaskDetailPage() {
	const { taskId } = Route.useParams();
	return <ManageTaskRoot taskId={taskId} />;
}

export const Route = createFileRoute("/tasks/$taskId")({
	component: TaskDetailPage,
});
