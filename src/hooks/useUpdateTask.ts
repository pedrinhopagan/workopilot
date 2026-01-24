import { trpc } from "../services/trpc";

export function useCreateTask() {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.create.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	// Wrapper to maintain backward-compatible API
	return {
		...mutation,
		mutate: (params: {
			projectId: string;
			projectPath: string;
			title: string;
			priority: number;
			category: string;
		}) => {
			mutation.mutate({
				title: params.title,
				project_id: params.projectId,
			});
		},
		mutateAsync: async (params: {
			projectId: string;
			projectPath: string;
			title: string;
			priority: number;
			category: string;
		}) => {
			const result = await mutation.mutateAsync({
				title: params.title,
				project_id: params.projectId,
			});
			return result.id;
		},
	};
}
