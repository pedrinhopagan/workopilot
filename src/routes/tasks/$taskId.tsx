import { createFileRoute } from "@tanstack/react-router";
import { taskDetailSearchSchema } from "../../lib/searchSchemas";
import { ManageTaskRoot } from "./$taskId/-components";

function TaskDetailPage() {
	const { taskId } = Route.useParams();
	return <ManageTaskRoot taskId={taskId} />;
}

export const Route = createFileRoute("/tasks/$taskId")({
	component: TaskDetailPage,
	validateSearch: (search) => taskDetailSearchSchema.parse(search),
});
