#!/usr/bin/env bun
import { Command } from "commander";
import { getDb, closeDb, getDbPathInfo } from "./db";
import { runMigrations } from "./migrations";
import { migrateJsonToSqlite } from "./json-migration";
import { logOperation } from "./logger";
import type { TaskFull, Subtask, AIMetadata, TaskContext } from "./types";

const program = new Command();

program
  .name("workopilot")
  .description("CLI for WorkoPilot task management")
  .version("0.1.0");

program
  .command("get-task <taskId>")
  .description("Get a task by ID with all details")
  .option("-f, --format <format>", "Output format: json or yaml", "json")
  .action(async (taskId: string, options: { format: string }) => {
    try {
      const db = getDb();

      const task = await db
        .selectFrom("tasks")
        .selectAll()
        .where("id", "=", taskId)
        .executeTakeFirst();

      if (!task) {
        console.error(JSON.stringify({ error: "Task not found", taskId }));
        process.exit(1);
      }

      let subtasksFromDb: Array<{
        id: string;
        task_id: string;
        title: string;
        status: string;
        order: number;
        description: string | null;
        acceptance_criteria: string | null;
        technical_notes: string | null;
        prompt_context: string | null;
        created_at: string;
        completed_at: string | null;
      }> = [];

      try {
        subtasksFromDb = await db
          .selectFrom("subtasks")
          .selectAll()
          .where("task_id", "=", taskId)
          .orderBy("order", "asc")
          .execute();
      } catch {
        subtasksFromDb = [];
      }

      const context: TaskContext = {
        description: task.context_description ?? null,
        business_rules: task.context_business_rules
          ? JSON.parse(task.context_business_rules)
          : [],
        technical_notes: task.context_technical_notes ?? null,
        acceptance_criteria: task.context_acceptance_criteria
          ? JSON.parse(task.context_acceptance_criteria)
          : null,
      };

      const aiMetadata: AIMetadata = task.ai_metadata
        ? JSON.parse(task.ai_metadata)
        : {
            last_interaction: null,
            last_completed_action: null,
            session_ids: [],
            tokens_used: 0,
            structuring_complete: false,
          };

      const formattedSubtasks: Subtask[] = subtasksFromDb.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        order: s.order,
        description: s.description,
        acceptance_criteria: s.acceptance_criteria
          ? JSON.parse(s.acceptance_criteria)
          : null,
        technical_notes: s.technical_notes,
        prompt_context: s.prompt_context,
        created_at: s.created_at,
        completed_at: s.completed_at,
      }));

      const taskFull: TaskFull = {
        schema_version: task.schema_version ?? 2,
        initialized: task.initialized === 1,
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        category: task.category,
        complexity: task.complexity,
        context,
        subtasks: formattedSubtasks,
        ai_metadata: aiMetadata,
        timestamps: {
          created_at: task.created_at,
          started_at: task.timestamps_started_at,
          completed_at: task.completed_at,
        },
        modified_at: task.modified_at,
        modified_by: task.modified_by as "user" | "ai" | null,
        project_id: task.project_id,
        due_date: task.due_date,
        scheduled_date: task.scheduled_date,
      };

      console.log(JSON.stringify(taskFull, null, 2));
      await closeDb();
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to get task",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("list-tasks")
  .description("List tasks")
  .option("-p, --project <projectId>", "Filter by project ID")
  .option("-s, --status <status>", "Filter by status")
  .option("-f, --format <format>", "Output format: json or table", "json")
  .action(
    async (options: {
      project?: string;
      status?: string;
      format: string;
    }) => {
      try {
        const db = getDb();

        let query = db.selectFrom("tasks").selectAll();

        if (options.project) {
          query = query.where("project_id", "=", options.project);
        }
        if (options.status) {
          query = query.where("status", "=", options.status);
        }

        const tasks = await query
          .orderBy("priority", "asc")
          .orderBy("created_at", "desc")
          .execute();

        if (options.format === "table") {
          console.log(
            "ID\tTitle\tStatus\tPriority\tCategory"
          );
          tasks.forEach((t) => {
            console.log(
              `${t.id}\t${t.title}\t${t.status}\t${t.priority}\t${t.category}`
            );
          });
        } else {
          console.log(JSON.stringify(tasks, null, 2));
        }

        await closeDb();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to list tasks",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("db-info")
  .description("Show database path and connection info")
  .action(async () => {
    try {
      const dbPath = getDbPathInfo();
      const db = getDb();

      const projectCount = await db
        .selectFrom("projects")
        .select(db.fn.count<number>("id").as("count"))
        .executeTakeFirst();

      const taskCount = await db
        .selectFrom("tasks")
        .select(db.fn.count<number>("id").as("count"))
        .executeTakeFirst();

      console.log(
        JSON.stringify(
          {
            database_path: dbPath,
            projects_count: projectCount?.count ?? 0,
            tasks_count: taskCount?.count ?? 0,
            status: "connected",
          },
          null,
          2
        )
      );

      await closeDb();
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to get database info",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("update-task <taskId>")
  .description("Update a task field")
  .option("--status <status>", "Set status (pending, in_progress, done)")
  .option("--title <title>", "Set title")
  .option("--complexity <complexity>", "Set complexity (simple, medium, complex)")
  .option("--description <description>", "Set context description")
  .option("--initialized <bool>", "Set initialized (true/false)")
  .option("--structuring-complete <bool>", "Set structuring_complete (true/false)")
  .action(
    async (
      taskId: string,
      options: {
        status?: string;
        title?: string;
        complexity?: string;
        description?: string;
        initialized?: string;
        structuringComplete?: string;
      }
    ) => {
      try {
        const db = getDb();

        const oldTask = await db
          .selectFrom("tasks")
          .selectAll()
          .where("id", "=", taskId)
          .executeTakeFirst();

        if (!oldTask) {
          console.error(JSON.stringify({ error: "Task not found", taskId }));
          process.exit(1);
        }

        const updates: Record<string, unknown> = {};
        const now = new Date().toISOString();

        if (options.status) {
          updates.status = options.status;
          if (options.status === "done") {
            updates.completed_at = now;
          }
        }
        if (options.title) updates.title = options.title;
        if (options.complexity) updates.complexity = options.complexity;
        if (options.description) updates.context_description = options.description;
        if (options.initialized !== undefined) {
          updates.initialized = options.initialized === "true" ? 1 : 0;
        }

        if (options.structuringComplete !== undefined) {
          const currentAiMetadata = oldTask.ai_metadata
            ? JSON.parse(oldTask.ai_metadata)
            : {};
          currentAiMetadata.structuring_complete =
            options.structuringComplete === "true";
          currentAiMetadata.last_interaction = now;
          updates.ai_metadata = JSON.stringify(currentAiMetadata);
        }

        updates.modified_at = now;
        updates.modified_by = "cli";

        if (Object.keys(updates).length === 2) {
          console.error(
            JSON.stringify({ error: "No fields to update provided" })
          );
          process.exit(1);
        }

        await db
          .updateTable("tasks")
          .set(updates)
          .where("id", "=", taskId)
          .execute();

        const newTask = await db
          .selectFrom("tasks")
          .selectAll()
          .where("id", "=", taskId)
          .executeTakeFirst();

        await logOperation(db, "task", taskId, "update", oldTask, newTask);

        console.log(
          JSON.stringify({ success: true, taskId, updated: updates }, null, 2)
        );
        await closeDb();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to update task",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("create-subtask <taskId>")
  .description("Create a new subtask for a task")
  .requiredOption("-t, --title <title>", "Subtask title")
  .option("-d, --description <description>", "Subtask description")
  .option("-o, --order <order>", "Order position", "0")
  .action(
    async (
      taskId: string,
      options: { title: string; description?: string; order: string }
    ) => {
      try {
        const db = getDb();

        const task = await db
          .selectFrom("tasks")
          .select("id")
          .where("id", "=", taskId)
          .executeTakeFirst();

        if (!task) {
          console.error(JSON.stringify({ error: "Task not found", taskId }));
          process.exit(1);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const subtask = {
          id,
          task_id: taskId,
          title: options.title,
          status: "pending",
          order: parseInt(options.order, 10),
          description: options.description ?? null,
          acceptance_criteria: null,
          technical_notes: null,
          prompt_context: null,
        };

        await db.insertInto("subtasks").values(subtask).execute();

        await logOperation(db, "subtask", id, "create", null, subtask);

        console.log(
          JSON.stringify(
            { success: true, subtask: { ...subtask, created_at: now } },
            null,
            2
          )
        );
        await closeDb();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to create subtask",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("update-subtask <subtaskId>")
  .description("Update a subtask")
  .option("--status <status>", "Set status (pending, in_progress, done)")
  .option("--title <title>", "Set title")
  .option("--description <description>", "Set description")
  .option("--order <order>", "Set order position")
  .action(
    async (
      subtaskId: string,
      options: {
        status?: string;
        title?: string;
        description?: string;
        order?: string;
      }
    ) => {
      try {
        const db = getDb();

        const oldSubtask = await db
          .selectFrom("subtasks")
          .selectAll()
          .where("id", "=", subtaskId)
          .executeTakeFirst();

        if (!oldSubtask) {
          console.error(
            JSON.stringify({ error: "Subtask not found", subtaskId })
          );
          process.exit(1);
        }

        const updates: Record<string, unknown> = {};
        const now = new Date().toISOString();

        if (options.status) {
          updates.status = options.status;
          if (options.status === "done") {
            updates.completed_at = now;
          }
        }
        if (options.title) updates.title = options.title;
        if (options.description) updates.description = options.description;
        if (options.order) updates.order = parseInt(options.order, 10);

        if (Object.keys(updates).length === 0) {
          console.error(
            JSON.stringify({ error: "No fields to update provided" })
          );
          process.exit(1);
        }

        await db
          .updateTable("subtasks")
          .set(updates)
          .where("id", "=", subtaskId)
          .execute();

        const newSubtask = await db
          .selectFrom("subtasks")
          .selectAll()
          .where("id", "=", subtaskId)
          .executeTakeFirst();

        await logOperation(
          db,
          "subtask",
          subtaskId,
          "update",
          oldSubtask,
          newSubtask
        );

        console.log(
          JSON.stringify(
            { success: true, subtaskId, updated: updates },
            null,
            2
          )
        );
        await closeDb();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to update subtask",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("get-logs")
  .description("Get operation logs")
  .option("-e, --entity-id <entityId>", "Filter by entity ID")
  .option("-t, --entity-type <type>", "Filter by entity type (task, subtask)")
  .option("-l, --limit <limit>", "Limit results", "50")
  .action(
    async (options: {
      entityId?: string;
      entityType?: string;
      limit: string;
    }) => {
      try {
        const db = getDb();

        let query = db
          .selectFrom("operation_logs")
          .selectAll()
          .orderBy("created_at", "desc")
          .limit(parseInt(options.limit, 10));

        if (options.entityId) {
          query = query.where("entity_id", "=", options.entityId);
        }
        if (options.entityType) {
          query = query.where("entity_type", "=", options.entityType);
        }

        const logs = await query.execute();

        const formattedLogs = logs.map((log) => ({
          ...log,
          old_data: log.old_data ? JSON.parse(log.old_data) : null,
          new_data: log.new_data ? JSON.parse(log.new_data) : null,
        }));

        console.log(JSON.stringify(formattedLogs, null, 2));
        await closeDb();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to get logs",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("migrate")
  .description("Run database migrations")
  .action(async () => {
    try {
      const db = getDb();
      const results = await runMigrations(db);

      const allSuccess = results.every((r) => r.success);

      console.log(
        JSON.stringify(
          {
            success: allSuccess,
            migrations: results,
          },
          null,
          2
        )
      );

      await closeDb();
      process.exit(allSuccess ? 0 : 1);
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Migration failed",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("migrate-json-to-sqlite")
  .description(
    "Migrate task data from JSON files to SQLite (idempotent, safe to run multiple times)"
  )
  .option(
    "-d, --delete",
    "Delete JSON files after successful migration",
    false
  )
  .option("--dry-run", "Show what would be migrated without making changes", false)
  .action(async (options: { delete: boolean; dryRun: boolean }) => {
    try {
      const db = getDb();

      if (options.dryRun) {
        const projects = await db
          .selectFrom("projects")
          .select(["id", "name", "path"])
          .execute();

        const { existsSync } = await import("fs");
        const { readdir } = await import("fs/promises");
        const { join } = await import("path");

        let totalJsonFiles = 0;
        const projectSummaries: Array<{
          project: string;
          path: string;
          jsonFiles: number;
        }> = [];

        for (const project of projects) {
          const tasksDir = join(project.path, ".workopilot", "tasks");
          if (existsSync(tasksDir)) {
            const files = await readdir(tasksDir);
            const jsonFiles = files.filter((f) => f.endsWith(".json"));
            totalJsonFiles += jsonFiles.length;
            if (jsonFiles.length > 0) {
              projectSummaries.push({
                project: project.name,
                path: tasksDir,
                jsonFiles: jsonFiles.length,
              });
            }
          }
        }

        console.log(
          JSON.stringify(
            {
              dryRun: true,
              totalProjects: projects.length,
              projectsWithJsonFiles: projectSummaries.length,
              totalJsonFiles,
              projectSummaries,
              message:
                totalJsonFiles > 0
                  ? `Would migrate ${totalJsonFiles} JSON file(s) from ${projectSummaries.length} project(s)`
                  : "No JSON files found to migrate",
            },
            null,
            2
          )
        );

        await closeDb();
        return;
      }

      const result = await migrateJsonToSqlite(db, options.delete);

      console.log(
        JSON.stringify(
          {
            success: result.success,
            totalTasksMigrated: result.totalTasks,
            totalSubtasksMigrated: result.totalSubtasks,
            deleteAfterMigration: options.delete,
            results: result.results,
            message: result.success
              ? `Successfully migrated ${result.totalTasks} task(s) with ${result.totalSubtasks} subtask(s)`
              : "Migration completed with some errors",
          },
          null,
          2
        )
      );

      await closeDb();
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "JSON migration failed",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program.parse();
