import { Kysely } from "kysely";
import type { Database, ActivityLog, UserSession } from "./types";

export async function logEvent(
  db: Kysely<Database>,
  eventType: string,
  entityType?: string | null,
  entityId?: string | null,
  projectId?: string | null,
  metadata?: Record<string, unknown> | null
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .insertInto("activity_logs")
    .values({
      id,
      event_type: eventType,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      project_id: projectId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .execute();
  return id;
}

export async function logTaskCreated(
  db: Kysely<Database>,
  taskId: string,
  taskTitle: string,
  projectId?: string | null
): Promise<void> {
  await logEvent(db, "task_created", "task", taskId, projectId, {
    task_title: taskTitle,
  });
}

export async function logTaskStatusChanged(
  db: Kysely<Database>,
  taskId: string,
  oldStatus: string,
  newStatus: string,
  projectId?: string | null
): Promise<void> {
  let eventType = "task_status_changed";
  if (newStatus === "in_progress") {
    eventType = "task_started";
  } else if (newStatus === "done" || newStatus === "completed") {
    eventType = "task_completed";
  }

  await logEvent(db, eventType, "task", taskId, projectId, {
    old_status: oldStatus,
    new_status: newStatus,
  });
}

export async function logSubtaskStatusChanged(
  db: Kysely<Database>,
  subtaskId: string,
  taskId: string,
  oldStatus: string,
  newStatus: string,
  projectId?: string | null
): Promise<void> {
  let eventType = "subtask_status_changed";
  if (newStatus === "in_progress") {
    eventType = "subtask_started";
  } else if (newStatus === "done" || newStatus === "completed") {
    eventType = "subtask_completed";
  }

  await logEvent(db, eventType, "subtask", subtaskId, projectId, {
    task_id: taskId,
    old_status: oldStatus,
    new_status: newStatus,
  });
}

export async function logAiSessionStart(
  db: Kysely<Database>,
  sessionId: string,
  taskId?: string | null,
  projectId?: string | null
): Promise<void> {
  await logEvent(db, "ai_session_start", "ai_session", sessionId, projectId, {
    task_id: taskId,
  });
}

export async function logAiSessionEnd(
  db: Kysely<Database>,
  sessionId: string,
  taskId?: string | null,
  projectId?: string | null,
  tokensInput?: number | null,
  tokensOutput?: number | null
): Promise<void> {
  await logEvent(db, "ai_session_end", "ai_session", sessionId, projectId, {
    task_id: taskId,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    tokens_total: (tokensInput ?? 0) + (tokensOutput ?? 0),
  });
}

export async function getActivityLogs(
  db: Kysely<Database>,
  options?: {
    eventType?: string;
    entityType?: string;
    projectId?: string;
    limit?: number;
  }
): Promise<ActivityLog[]> {
  let query = db
    .selectFrom("activity_logs")
    .selectAll()
    .orderBy("created_at", "desc");

  if (options?.eventType) {
    query = query.where("event_type", "=", options.eventType);
  }
  if (options?.entityType) {
    query = query.where("entity_type", "=", options.entityType);
  }
  if (options?.projectId) {
    query = query.where("project_id", "=", options.projectId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const rows = await query.execute();

  return rows.map((row) => ({
    id: row.id,
    event_type: row.event_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    project_id: row.project_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    created_at: row.created_at,
  }));
}

export async function getUserSessions(
  db: Kysely<Database>,
  limit?: number
): Promise<UserSession[]> {
  let query = db
    .selectFrom("user_sessions")
    .selectAll()
    .orderBy("started_at", "desc");

  if (limit) {
    query = query.limit(limit);
  }

  const rows = await query.execute();

  return rows.map((row) => ({
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
    app_version: row.app_version,
  }));
}
