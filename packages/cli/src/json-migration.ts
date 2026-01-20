import { Kysely } from "kysely";
import { readdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { Database } from "./types";
import { logOperation } from "./logger";

interface JsonTaskFull {
  schema_version: number;
  initialized: boolean;
  id: string;
  title: string;
  status: string;
  priority: number;
  category: string;
  complexity: string | null;
  context: {
    description: string | null;
    business_rules: string[];
    technical_notes: string | null;
    acceptance_criteria: string[] | null;
  };
  subtasks: Array<{
    id: string;
    title: string;
    status: string;
    order: number;
    description: string | null;
    acceptance_criteria: string[] | null;
    technical_notes: string | null;
    prompt_context: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
  ai_metadata: {
    last_interaction: string | null;
    last_completed_action?: string | null;
    session_ids: string[];
    tokens_used: number;
    structuring_complete: boolean;
  };
  timestamps: {
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
  };
  modified_at?: string | null;
  modified_by?: "user" | "ai" | null;
}

interface MigrationResult {
  taskId: string;
  title: string;
  success: boolean;
  subtasksMigrated: number;
  deleted: boolean;
  error?: string;
}

export async function migrateJsonToSqlite(
  db: Kysely<Database>,
  deleteAfterMigration: boolean = false
): Promise<{
  success: boolean;
  results: MigrationResult[];
  totalTasks: number;
  totalSubtasks: number;
}> {
  const results: MigrationResult[] = [];
  let totalSubtasks = 0;

  const projects = await db
    .selectFrom("projects")
    .select(["id", "path"])
    .execute();

  for (const project of projects) {
    const tasksDir = join(project.path, ".workopilot", "tasks");

    if (!existsSync(tasksDir)) {
      continue;
    }

    const files = await readdir(tasksDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const jsonFile of jsonFiles) {
      const taskId = jsonFile.replace(".json", "");
      const filePath = join(tasksDir, jsonFile);

      try {
        const fileContent = await Bun.file(filePath).text();
        const taskJson: JsonTaskFull = JSON.parse(fileContent);

        const existingTask = await db
          .selectFrom("tasks")
          .select("id")
          .where("id", "=", taskId)
          .executeTakeFirst();

        if (!existingTask) {
          results.push({
            taskId,
            title: taskJson.title,
            success: false,
            subtasksMigrated: 0,
            deleted: false,
            error: "Task not found in database - skipping (orphan JSON)",
          });
          continue;
        }

        await db
          .updateTable("tasks")
          .set({
            complexity: taskJson.complexity,
            initialized: taskJson.initialized ? 1 : 0,
            schema_version: taskJson.schema_version,
            context_description: taskJson.context.description,
            context_business_rules: JSON.stringify(
              taskJson.context.business_rules || []
            ),
            context_technical_notes: taskJson.context.technical_notes,
            context_acceptance_criteria: JSON.stringify(
              taskJson.context.acceptance_criteria || []
            ),
            ai_metadata: JSON.stringify(taskJson.ai_metadata),
            timestamps_started_at: taskJson.timestamps.started_at,
            modified_at: taskJson.modified_at || new Date().toISOString(),
            modified_by: taskJson.modified_by || "cli",
            status: taskJson.status,
          })
          .where("id", "=", taskId)
          .execute();

        let subtasksMigrated = 0;
        if (taskJson.subtasks && taskJson.subtasks.length > 0) {
          for (const subtask of taskJson.subtasks) {
            const compositeId = `${taskId}:${subtask.id}`;

            const existingWithOriginalId = await db
              .selectFrom("subtasks")
              .select(["id", "task_id"])
              .where("id", "=", subtask.id)
              .executeTakeFirst();

            const existingWithCompositeId = await db
              .selectFrom("subtasks")
              .select("id")
              .where("id", "=", compositeId)
              .executeTakeFirst();

            if (
              existingWithOriginalId &&
              existingWithOriginalId.task_id === taskId
            ) {
              await db
                .updateTable("subtasks")
                .set({
                  title: subtask.title,
                  status: subtask.status,
                  order: subtask.order,
                  description: subtask.description,
                  acceptance_criteria: subtask.acceptance_criteria
                    ? JSON.stringify(subtask.acceptance_criteria)
                    : null,
                  technical_notes: subtask.technical_notes,
                  prompt_context: subtask.prompt_context,
                  completed_at: subtask.completed_at,
                })
                .where("id", "=", subtask.id)
                .execute();
            } else if (existingWithCompositeId) {
              await db
                .updateTable("subtasks")
                .set({
                  title: subtask.title,
                  status: subtask.status,
                  order: subtask.order,
                  description: subtask.description,
                  acceptance_criteria: subtask.acceptance_criteria
                    ? JSON.stringify(subtask.acceptance_criteria)
                    : null,
                  technical_notes: subtask.technical_notes,
                  prompt_context: subtask.prompt_context,
                  completed_at: subtask.completed_at,
                })
                .where("id", "=", compositeId)
                .execute();
            } else {
              const needsCompositeId =
                existingWithOriginalId &&
                existingWithOriginalId.task_id !== taskId;

              const subtaskId = needsCompositeId ? compositeId : subtask.id;

              await db
                .insertInto("subtasks")
                .values({
                  id: subtaskId,
                  task_id: taskId,
                  title: subtask.title,
                  status: subtask.status,
                  order: subtask.order,
                  description: subtask.description,
                  acceptance_criteria: subtask.acceptance_criteria
                    ? JSON.stringify(subtask.acceptance_criteria)
                    : null,
                  technical_notes: subtask.technical_notes,
                  prompt_context: subtask.prompt_context,
                })
                .execute();
            }
            subtasksMigrated++;
          }
          totalSubtasks += subtasksMigrated;
        }

        await logOperation(
          db,
          "task",
          taskId,
          "update",
          { source: "json_migration", file: filePath },
          { migrated: true, subtasks_count: subtasksMigrated }
        );

        let deleted = false;
        if (deleteAfterMigration) {
          await unlink(filePath);
          deleted = true;
        }

        results.push({
          taskId,
          title: taskJson.title,
          success: true,
          subtasksMigrated,
          deleted,
        });
      } catch (error) {
        results.push({
          taskId,
          title: "Unknown",
          success: false,
          subtasksMigrated: 0,
          deleted: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const allSuccess = results.every((r) => r.success);

  return {
    success: allSuccess,
    results,
    totalTasks: results.filter((r) => r.success).length,
    totalSubtasks,
  };
}
