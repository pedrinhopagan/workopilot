import Typesense from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";

export interface ActivityLog {
	id: string;
	event_type: string;
	entity_type: string | null;
	entity_id: string | null;
	project_id: string | null;
	metadata: string | null;
	created_at: string;
}

export interface ActivityLogDocument {
	id: string;
	event_type: string;
	entity_type: string;
	entity_id: string;
	project_id: string;
	project_name: string;
	task_title: string;
	metadata: Record<string, unknown>;
	created_at: number;
	created_at_str: string;
}

export interface ActivityLogFilters {
	event_type?: string[];
	entity_type?: string[];
	project_id?: string;
	from_date?: string;
	to_date?: string;
	query?: string;
	limit?: number;
	cursor?: number; // timestamp cursor for pagination (created_at value)
}

export interface ActivityLogSearchResult {
	logs: ActivityLogDocument[];
	total: number;
	nextCursor: number | null;
	hasMore: boolean;
}

const ACTIVITY_LOGS_SCHEMA: CollectionCreateSchema = {
	name: "activity_logs",
	fields: [
		{ name: "id", type: "string" },
		{ name: "event_type", type: "string", facet: true },
		{ name: "entity_type", type: "string", facet: true },
		{ name: "entity_id", type: "string" },
		{ name: "project_id", type: "string", facet: true },
		{ name: "project_name", type: "string" },
		{ name: "task_title", type: "string", optional: true },
		{ name: "metadata", type: "object", optional: true },
		{ name: "created_at", type: "int64", sort: true },
		{ name: "created_at_str", type: "string" },
	],
	default_sorting_field: "created_at",
};

type TypesenseClient = InstanceType<typeof Typesense.Client>;

let typesenseClient: TypesenseClient | null = null;
let typesenseAvailableCache: boolean | null = null;
let typesenseAvailableCacheTime = 0;
const AVAILABILITY_CACHE_TTL = 30000;

const TYPESENSE_CONFIG = {
	apiKey: "workopilot-dev-key",
	host: "localhost",
	port: 8108,
	protocol: "http" as const,
};

export async function initTypesense(): Promise<TypesenseClient> {
	if (typesenseClient) {
		return typesenseClient;
	}

	typesenseClient = new Typesense.Client({
		nodes: [
			{
				host: TYPESENSE_CONFIG.host,
				port: TYPESENSE_CONFIG.port,
				protocol: TYPESENSE_CONFIG.protocol,
			},
		],
		apiKey: TYPESENSE_CONFIG.apiKey,
		connectionTimeoutSeconds: 5,
	});

	try {
		await typesenseClient.collections("activity_logs").retrieve();
	} catch (error: unknown) {
		if (error instanceof Error && error.message.includes("404")) {
			await typesenseClient.collections().create(ACTIVITY_LOGS_SCHEMA);
		} else {
			throw error;
		}
	}

	return typesenseClient;
}

export function getTypesenseClient(): TypesenseClient {
	if (!typesenseClient) {
		throw new Error(
			"Typesense client not initialized. Call initTypesense() first.",
		);
	}
	return typesenseClient;
}

export async function isTypesenseAvailable(): Promise<boolean> {
	const now = Date.now();
	if (typesenseAvailableCache !== null && now - typesenseAvailableCacheTime < AVAILABILITY_CACHE_TTL) {
		return typesenseAvailableCache;
	}

	try {
		const client = await initTypesense();
		await client.health.retrieve();
		typesenseAvailableCache = true;
		typesenseAvailableCacheTime = now;
		return true;
	} catch {
		typesenseAvailableCache = false;
		typesenseAvailableCacheTime = now;
		return false;
	}
}

export function activityLogToDocument(
	log: ActivityLog,
	projectName?: string,
	taskTitle?: string,
): ActivityLogDocument {
	const createdAt = new Date(log.created_at);

	let parsedMetadata: Record<string, unknown> = {};
	if (log.metadata) {
		try {
			parsedMetadata = JSON.parse(log.metadata);
		} catch {
			parsedMetadata = { raw: log.metadata };
		}
	}

	return {
		id: log.id,
		event_type: log.event_type,
		entity_type: log.entity_type || "unknown",
		entity_id: log.entity_id || "",
		project_id: log.project_id || "",
		project_name: projectName || "",
		task_title: taskTitle || (parsedMetadata.task_title as string) || "",
		metadata: parsedMetadata,
		created_at: Math.floor(createdAt.getTime() / 1000),
		created_at_str: log.created_at,
	};
}

export async function syncActivityLog(
	log: ActivityLog,
	projectName?: string,
	taskTitle?: string,
): Promise<void> {
	const client = await initTypesense();
	const document = activityLogToDocument(log, projectName, taskTitle);

	try {
		await client.collections("activity_logs").documents().upsert(document);
	} catch (error) {
		console.error("Failed to sync activity log to Typesense:", error);
		throw error;
	}
}

interface ImportResult {
	success: boolean;
}

export async function syncActivityLogsBatch(
	logs: Array<{
		log: ActivityLog;
		projectName?: string;
		taskTitle?: string;
	}>,
): Promise<{ success: number; failed: number }> {
	const client = await initTypesense();
	const documents = logs.map(({ log, projectName, taskTitle }) =>
		activityLogToDocument(log, projectName, taskTitle),
	);

	try {
		const results = (await client
			.collections("activity_logs")
			.documents()
			.import(documents, { action: "upsert" })) as ImportResult[];

		const successful = results.filter((r: ImportResult) => r.success).length;
		const failed = results.filter((r: ImportResult) => !r.success).length;

		return { success: successful, failed };
	} catch (error) {
		console.error("Failed to batch sync activity logs to Typesense:", error);
		throw error;
	}
}

export async function searchActivityLogs(
	filters: ActivityLogFilters = {},
): Promise<ActivityLogSearchResult> {
	const client = await initTypesense();

	const {
		event_type,
		entity_type,
		project_id,
		from_date,
		to_date,
		query,
		limit = 50,
		cursor,
	} = filters;

	const filterParts: string[] = [];

	if (event_type && event_type.length > 0) {
		filterParts.push(`event_type:[${event_type.join(",")}]`);
	}

	if (entity_type && entity_type.length > 0) {
		filterParts.push(`entity_type:[${entity_type.join(",")}]`);
	}

	if (project_id) {
		filterParts.push(`project_id:=${project_id}`);
	}

	if (from_date) {
		const fromTs = Math.floor(new Date(from_date).getTime() / 1000);
		filterParts.push(`created_at:>=${fromTs}`);
	}

	if (to_date) {
		const toTs = Math.floor(new Date(to_date).getTime() / 1000);
		filterParts.push(`created_at:<=${toTs}`);
	}

	if (cursor) {
		filterParts.push(`created_at:<${cursor}`);
	}

	const searchParams = {
		q: query || "*",
		query_by: "task_title,project_name,event_type",
		filter_by: filterParts.length > 0 ? filterParts.join(" && ") : undefined,
		sort_by: "created_at:desc",
		per_page: limit,
		page: 1,
	};

	try {
		const result: SearchResponse<ActivityLogDocument> = await client
			.collections<ActivityLogDocument>("activity_logs")
			.documents()
			.search(searchParams);

		const logs = result.hits?.map((hit) => hit.document) || [];
		const total = result.found || 0;
		const lastLog = logs[logs.length - 1];
		const nextCursor = lastLog ? lastLog.created_at : null;
		const hasMore = logs.length === limit;

		return {
			logs,
			total,
			nextCursor,
			hasMore,
		};
	} catch (error) {
		console.error("Failed to search activity logs in Typesense:", error);
		throw error;
	}
}

interface FacetCount {
	value: string;
	count: number;
}

interface FacetResult {
	field_name: string;
	counts: FacetCount[];
}

export async function getActivityLogFacets(): Promise<{
	event_types: Array<{ value: string; count: number }>;
	entity_types: Array<{ value: string; count: number }>;
	projects: Array<{ value: string; count: number }>;
}> {
	const client = await initTypesense();

	try {
		const result = await client
			.collections<ActivityLogDocument>("activity_logs")
			.documents()
			.search({
				q: "*",
				query_by: "event_type",
				facet_by: "event_type,entity_type,project_id",
				max_facet_values: 100,
				per_page: 0,
			});

		const facets = (result.facet_counts || []) as FacetResult[];

		const eventTypes =
			facets
				.find((f: FacetResult) => f.field_name === "event_type")
				?.counts.map((c: FacetCount) => ({
					value: c.value,
					count: c.count,
				})) || [];

		const entityTypes =
			facets
				.find((f: FacetResult) => f.field_name === "entity_type")
				?.counts.map((c: FacetCount) => ({
					value: c.value,
					count: c.count,
				})) || [];

		const projects =
			facets
				.find((f: FacetResult) => f.field_name === "project_id")
				?.counts.map((c: FacetCount) => ({
					value: c.value,
					count: c.count,
				})) || [];

		return {
			event_types: eventTypes,
			entity_types: entityTypes,
			projects,
		};
	} catch (error) {
		console.error("Failed to get activity log facets:", error);
		return { event_types: [], entity_types: [], projects: [] };
	}
}

export async function deleteActivityLog(logId: string): Promise<void> {
	const client = await initTypesense();

	try {
		await client.collections("activity_logs").documents(logId).delete();
	} catch (error: unknown) {
		if (error instanceof Error && !error.message.includes("404")) {
			throw error;
		}
	}
}

export async function reindexAll(
	getLogsFromDb: () => Promise<
		Array<{
			log: ActivityLog;
			projectName?: string;
			taskTitle?: string;
		}>
	>,
): Promise<{ success: number; failed: number }> {
	const client = await initTypesense();

	try {
		await client.collections("activity_logs").delete();
	} catch {}

	await client.collections().create(ACTIVITY_LOGS_SCHEMA);

	const logs = await getLogsFromDb();

	if (logs.length === 0) {
		return { success: 0, failed: 0 };
	}

	return syncActivityLogsBatch(logs);
}

export async function dropCollection(): Promise<void> {
	const client = await initTypesense();

	try {
		await client.collections("activity_logs").delete();
	} catch (error: unknown) {
		if (error instanceof Error && !error.message.includes("404")) {
			throw error;
		}
	}
}
