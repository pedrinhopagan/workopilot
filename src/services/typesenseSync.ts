import type { ActivityLog, Project } from "../types";
import { safeInvoke } from "./tauri";
import {
	type ActivityLogFilters,
	initTypesense,
	isTypesenseAvailable,
	syncActivityLogsBatch,
	getActivityLogFacets as typesenseGetFacets,
	reindexAll as typesenseReindexAll,
	searchActivityLogs as typesenseSearch,
} from "./typesense";

let lastSyncTimestamp: string | null = null;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

async function getProjectName(projectId: string): Promise<string> {
	try {
		const projects = await safeInvoke<Project[]>("get_projects");
		const project = projects.find((p) => p.id === projectId);
		return project?.name || "";
	} catch {
		return "";
	}
}

async function fetchLogsFromDatabase(limit?: number): Promise<ActivityLog[]> {
	return safeInvoke<ActivityLog[]>("get_activity_logs", {
		eventType: null,
		entityType: null,
		projectId: null,
		limit: limit || null,
	});
}

async function syncNewLogs(): Promise<{ synced: number; failed: number }> {
	const available = await isTypesenseAvailable();
	if (!available) {
		return { synced: 0, failed: 0 };
	}

	const logs = await fetchLogsFromDatabase(100);

	const syncTimestamp = lastSyncTimestamp;
	const newLogs = syncTimestamp
		? logs.filter((log) => log.created_at > syncTimestamp)
		: logs;

	if (newLogs.length === 0) {
		return { synced: 0, failed: 0 };
	}

	const projectNames = new Map<string, string>();
	const projectIds = [
		...new Set(newLogs.map((log) => log.project_id).filter(Boolean)),
	];

	await Promise.all(
		projectIds.map(async (id) => {
			if (id) {
				const name = await getProjectName(id);
				projectNames.set(id, name);
			}
		}),
	);

	const logsWithContext = newLogs.map((log) => ({
		log,
		projectName: log.project_id ? projectNames.get(log.project_id) : undefined,
	}));

	const result = await syncActivityLogsBatch(logsWithContext);

	if (newLogs.length > 0) {
		const latestLog = newLogs.reduce((latest, log) =>
			log.created_at > latest.created_at ? log : latest,
		);
		lastSyncTimestamp = latestLog.created_at;
	}

	return { synced: result.success, failed: result.failed };
}

export async function startTypesenseSync(intervalMs = 30000): Promise<boolean> {
	try {
		await initTypesense();
	} catch {
		console.warn("Typesense not available, sync disabled");
		return false;
	}

	await syncNewLogs();

	if (syncIntervalId) {
		clearInterval(syncIntervalId);
	}

	syncIntervalId = setInterval(() => {
		syncNewLogs().catch(console.error);
	}, intervalMs);

	return true;
}

export function stopTypesenseSync(): void {
	if (syncIntervalId) {
		clearInterval(syncIntervalId);
		syncIntervalId = null;
	}
}

export async function searchLogs(filters: ActivityLogFilters) {
	const available = await isTypesenseAvailable();
	if (!available) {
		const logs = await fetchLogsFromDatabase(filters.limit);
		return {
			logs: logs.map((log) => ({
				id: log.id,
				event_type: log.event_type,
				entity_type: log.entity_type || "unknown",
				entity_id: log.entity_id || "",
				project_id: log.project_id || "",
				project_name: "",
				task_title: "",
				metadata: log.metadata ? JSON.parse(log.metadata) : {},
				created_at: Math.floor(new Date(log.created_at).getTime() / 1000),
				created_at_str: log.created_at,
			})),
			total: logs.length,
			page: 1,
			total_pages: 1,
		};
	}

	return typesenseSearch(filters);
}

export async function getLogFacets() {
	const available = await isTypesenseAvailable();
	if (!available) {
		return { event_types: [], entity_types: [], projects: [] };
	}

	return typesenseGetFacets();
}

export async function reindexAllLogs(): Promise<{
	success: number;
	failed: number;
}> {
	const available = await isTypesenseAvailable();
	if (!available) {
		throw new Error("Typesense not available");
	}

	return typesenseReindexAll(async () => {
		const logs = await fetchLogsFromDatabase();

		const projectNames = new Map<string, string>();
		const projectIds = [
			...new Set(logs.map((log) => log.project_id).filter(Boolean)),
		];

		await Promise.all(
			projectIds.map(async (id) => {
				if (id) {
					const name = await getProjectName(id);
					projectNames.set(id, name);
				}
			}),
		);

		return logs.map((log) => ({
			log,
			projectName: log.project_id
				? projectNames.get(log.project_id)
				: undefined,
		}));
	});
}

export async function manualSync(): Promise<{
	synced: number;
	failed: number;
}> {
	return syncNewLogs();
}
