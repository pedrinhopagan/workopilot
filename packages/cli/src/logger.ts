import { Kysely } from "kysely";
import type { Database } from "./types";

export type EntityType = "task" | "subtask" | "project";
export type Operation = "create" | "update" | "delete";
export type Source = "cli" | "app" | "skill";

export async function logOperation(
  db: Kysely<Database>,
  entityType: EntityType,
  entityId: string,
  operation: Operation,
  oldData: unknown | null,
  newData: unknown | null,
  source: Source = "cli"
): Promise<string> {
  const id = crypto.randomUUID();

  await db
    .insertInto("operation_logs")
    .values({
      id,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      old_data: oldData ? JSON.stringify(oldData) : null,
      new_data: newData ? JSON.stringify(newData) : null,
      source,
    })
    .execute();

  return id;
}
