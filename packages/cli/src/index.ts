#!/usr/bin/env bun
import { Command } from "commander";
import {
  WorkoPilotSDK,
  TASK_STATUSES,
  isValidTaskStatus,
  isValidSubtaskStatus,
} from "@workopilot/sdk";
import type {
  TaskStatus,
  SubtaskStatus,
  TaskFull,
} from "@workopilot/sdk";
import { notifyApp } from "./socket-notify";

const program = new Command();

let sdk: WorkoPilotSDK | null = null;

async function getSDK(): Promise<WorkoPilotSDK> {
  if (!sdk) {
    sdk = await WorkoPilotSDK.create();
  }
  return sdk;
}

async function closeSDK(): Promise<void> {
  if (sdk) {
    await sdk.close();
    sdk = null;
  }
}

program
  .name("workopilot")
  .description("CLI for WorkoPilot task management")
  .version("0.1.0");

program
  .command("get-task <taskId>")
  .description("Get a task by ID with all details")
  .option("-f, --format <format>", "Output format: json or yaml", "json")
  .action(async (taskId: string, _options: { format: string }) => {
    try {
      const sdk = await getSDK();
      const taskFull = await sdk.tasks.getFull(taskId);

      if (!taskFull) {
        console.error(JSON.stringify({ error: "Task not found", taskId }));
        process.exit(1);
      }

      console.log(JSON.stringify(taskFull, null, 2));
      await closeSDK();
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
        const sdk = await getSDK();

        const tasks = await sdk.tasks.list({
          project_id: options.project,
          status: options.status as TaskStatus | undefined,
        });

        if (options.format === "table") {
          console.log("ID\tTitle\tStatus\tPriority\tCategory");
          tasks.forEach((t) => {
            console.log(
              `${t.id}\t${t.title}\t${t.status}\t${t.priority}\t${t.category}`
            );
          });
        } else {
          console.log(JSON.stringify(tasks, null, 2));
        }

        await closeSDK();
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
      const sdk = await getSDK();

      const projects = await sdk.projects.list();
      const tasks = await sdk.tasks.list();

      console.log(
        JSON.stringify(
          {
            database_path: sdk.dbPath,
            projects_count: projects.length,
            tasks_count: tasks.length,
            status: "connected",
          },
          null,
          2
        )
      );

      await closeSDK();
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
  .option("--status <status>", `Set status: ${TASK_STATUSES.join(", ")}`)
  .option("--title <title>", "Set title")
  .option("--complexity <complexity>", "Set complexity (trivial, simple, moderate, complex, epic)")
  .option("--description <description>", "Set context description")
  .option("--acceptance-criteria <criteria>", "Set acceptance criteria (JSON array or comma-separated values)")
  .option("--business-rules <rules>", "Set business rules (JSON array or comma-separated values)")
  .option("--technical-notes <notes>", "Set technical notes")
  .option("--structuring-complete <bool>", "Set structuring_complete (true/false)")
  .option("--scheduled-date <date>", "Set scheduled date (YYYY-MM-DD format, or 'null' to unschedule)")
  .action(
    async (
      taskId: string,
      options: {
        status?: string;
        title?: string;
        complexity?: string;
        description?: string;
        acceptanceCriteria?: string;
        businessRules?: string;
        technicalNotes?: string;
        structuringComplete?: string;
        scheduledDate?: string;
      }
    ) => {
      try {
        const sdk = await getSDK();

        const existingTask = await sdk.tasks.get(taskId);
        if (!existingTask) {
          console.error(JSON.stringify({ error: "Task not found", taskId }));
          process.exit(1);
        }

        if (options.status && !isValidTaskStatus(options.status)) {
          console.error(
            JSON.stringify({
              error: `Invalid status: ${options.status}`,
              validStatuses: TASK_STATUSES,
            })
          );
          process.exit(1);
        }

        if (options.scheduledDate !== undefined) {
          if (options.scheduledDate !== "null" && options.scheduledDate !== "") {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(options.scheduledDate)) {
              console.error(
                JSON.stringify({
                  error: `Invalid date format: ${options.scheduledDate}. Use YYYY-MM-DD format.`,
                })
              );
              process.exit(1);
            }
          }
        }

        const updates: Record<string, unknown> = {};

        if (options.status) {
          await sdk.tasks.updateStatus(taskId, options.status as TaskStatus, "cli");
          updates.status = options.status;
        }

        const updateInput: Parameters<typeof sdk.tasks.update>[1] = {};
        
        if (options.title) {
          updateInput.title = options.title;
          updates.title = options.title;
        }
        if (options.complexity) {
          updateInput.complexity = options.complexity as "trivial" | "simple" | "moderate" | "complex" | "epic";
          updates.complexity = options.complexity;
        }
        const contextUpdates: Record<string, unknown> = {};
        
        if (options.description) {
          contextUpdates.description = options.description;
          updates.context_description = options.description;
        }
        
        if (options.acceptanceCriteria !== undefined) {
          let criteria: string[] | null;
          if (options.acceptanceCriteria === "null" || options.acceptanceCriteria === "") {
            criteria = null;
          } else {
            try {
              criteria = JSON.parse(options.acceptanceCriteria);
              if (!Array.isArray(criteria)) {
                criteria = [options.acceptanceCriteria];
              }
            } catch {
              criteria = options.acceptanceCriteria.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            }
          }
          contextUpdates.acceptance_criteria = criteria;
          updates.acceptance_criteria = criteria;
        }
        
        if (options.businessRules !== undefined) {
          let rules: string[];
          if (options.businessRules === "null" || options.businessRules === "") {
            rules = [];
          } else {
            try {
              rules = JSON.parse(options.businessRules);
              if (!Array.isArray(rules)) {
                rules = [options.businessRules];
              }
            } catch {
              rules = options.businessRules.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            }
          }
          contextUpdates.business_rules = rules;
          updates.business_rules = rules;
        }
        
        if (options.technicalNotes !== undefined) {
          const notes = options.technicalNotes === "null" || options.technicalNotes === "" ? null : options.technicalNotes;
          contextUpdates.technical_notes = notes;
          updates.technical_notes = notes;
        }
        
        if (Object.keys(contextUpdates).length > 0) {
          updateInput.context = contextUpdates as Parameters<typeof sdk.tasks.update>[1]["context"];
        }
        
        if (options.structuringComplete !== undefined) {
          updateInput.ai_metadata = {
            structuring_complete: options.structuringComplete === "true",
          };
          updates.structuring_complete = options.structuringComplete === "true";
        }
        if (options.scheduledDate !== undefined) {
          if (options.scheduledDate === "null" || options.scheduledDate === "") {
            await sdk.tasks.unschedule(taskId);
            updates.scheduled_date = null;
          } else {
            await sdk.tasks.schedule(taskId, options.scheduledDate);
            updates.scheduled_date = options.scheduledDate;
          }
        }

        if (Object.keys(updateInput).length > 0) {
          await sdk.tasks.update(taskId, updateInput);
        }

        if (Object.keys(updates).length === 0) {
          console.error(
            JSON.stringify({ error: "No fields to update provided" })
          );
          process.exit(1);
        }

        await notifyApp("task", taskId, "update");

        console.log(
          JSON.stringify({ success: true, taskId, updated: updates }, null, 2)
        );
        await closeSDK();
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
        const sdk = await getSDK();

        const task = await sdk.tasks.get(taskId);
        if (!task) {
          console.error(JSON.stringify({ error: "Task not found", taskId }));
          process.exit(1);
        }

        const subtask = await sdk.subtasks.create({
          task_id: taskId,
          title: options.title,
          description: options.description,
          order: parseInt(options.order, 10),
        });

        await notifyApp("subtask", subtask.id, "create");

        console.log(
          JSON.stringify(
            { success: true, subtask },
            null,
            2
          )
        );
        await closeSDK();
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
  .option("--acceptance-criteria <criteria>", "Set acceptance criteria (JSON array or comma-separated values)")
  .option("--technical-notes <notes>", "Set technical notes")
  .option("--prompt-context <context>", "Set prompt context for AI")
  .action(
    async (
      subtaskId: string,
      options: {
        status?: string;
        title?: string;
        description?: string;
        order?: string;
        acceptanceCriteria?: string;
        technicalNotes?: string;
        promptContext?: string;
      }
    ) => {
      try {
        const sdk = await getSDK();

        const existingSubtask = await sdk.subtasks.get(subtaskId);
        if (!existingSubtask) {
          console.error(
            JSON.stringify({ error: "Subtask not found", subtaskId })
          );
          process.exit(1);
        }

        const updates: Record<string, unknown> = {};

        if (options.status) {
          if (!isValidSubtaskStatus(options.status)) {
            console.error(
              JSON.stringify({
                error: `Invalid status: ${options.status}`,
                validStatuses: ["pending", "in_progress", "done"],
              })
            );
            process.exit(1);
          }
          await sdk.subtasks.updateStatus(subtaskId, options.status as SubtaskStatus);
          updates.status = options.status;
        }

        const updateInput: Parameters<typeof sdk.subtasks.update>[1] = {};

        if (options.title) {
          updateInput.title = options.title;
          updates.title = options.title;
        }
        if (options.description !== undefined) {
          const desc = options.description === "null" || options.description === "" ? null : options.description;
          updateInput.description = desc;
          updates.description = desc;
        }
        if (options.order) {
          updateInput.order = parseInt(options.order, 10);
          updates.order = parseInt(options.order, 10);
        }
        
        if (options.acceptanceCriteria !== undefined) {
          let criteria: string[] | null;
          if (options.acceptanceCriteria === "null" || options.acceptanceCriteria === "") {
            criteria = null;
          } else {
            try {
              criteria = JSON.parse(options.acceptanceCriteria);
              if (!Array.isArray(criteria)) {
                criteria = [options.acceptanceCriteria];
              }
            } catch {
              criteria = options.acceptanceCriteria.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            }
          }
          updateInput.acceptance_criteria = criteria;
          updates.acceptance_criteria = criteria;
        }
        
        if (options.technicalNotes !== undefined) {
          const notes = options.technicalNotes === "null" || options.technicalNotes === "" ? null : options.technicalNotes;
          updateInput.technical_notes = notes;
          updates.technical_notes = notes;
        }
        
        if (options.promptContext !== undefined) {
          const context = options.promptContext === "null" || options.promptContext === "" ? null : options.promptContext;
          updateInput.prompt_context = context;
          updates.prompt_context = context;
        }

        if (Object.keys(updateInput).length > 0) {
          await sdk.subtasks.update(subtaskId, updateInput);
        }

        if (Object.keys(updates).length === 0) {
          console.error(
            JSON.stringify({ error: "No fields to update provided" })
          );
          process.exit(1);
        }

        await notifyApp("subtask", subtaskId, "update");

        console.log(
          JSON.stringify(
            { success: true, subtaskId, updated: updates },
            null,
            2
          )
        );
        await closeSDK();
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
  .command("migrate")
  .description("Run database migrations")
  .action(async () => {
    try {
      const sdk = await WorkoPilotSDK.create({ autoMigrate: false });
      await sdk.migrate();

      console.log(
        JSON.stringify(
          {
            success: true,
            message: "Migrations completed successfully",
          },
          null,
          2
        )
      );

      await sdk.close();
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
  .command("start-execution <taskId>")
  .description("Start task execution tracking")
  .option("-s, --subtask <subtaskId>", "Execute specific subtask instead of full task")
  .option("-t, --tmux <session>", "Link to tmux session")
  .option("-p, --pid <pid>", "Process ID to monitor")
  .option("--total-steps <steps>", "Total number of steps", "0")
  .action(
    async (
      taskId: string,
      options: {
        subtask?: string;
        tmux?: string;
        pid?: string;
        totalSteps: string;
      }
    ) => {
      try {
        const sdk = await getSDK();

        const task = await sdk.tasks.get(taskId);
        if (!task) {
          console.error(JSON.stringify({ error: "Task not found", taskId }));
          process.exit(1);
        }

        const existingExecution = await sdk.executions.getActiveForTask(taskId);
        if (existingExecution) {
          console.error(
            JSON.stringify({
              error: "Task already has an active execution",
              taskId,
              executionId: existingExecution.id,
            })
          );
          process.exit(1);
        }

        const execution = await sdk.executions.start({
          task_id: taskId,
          subtask_id: options.subtask,
          execution_type: options.subtask ? 'subtask' : 'full',
          tmux_session: options.tmux,
          pid: options.pid ? parseInt(options.pid, 10) : undefined,
          total_steps: parseInt(options.totalSteps, 10),
        });

        await notifyApp("execution", execution.id, "create");

        console.log(
          JSON.stringify(
            {
              success: true,
              execution,
            },
            null,
            2
          )
        );
        await closeSDK();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to start execution",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("end-execution <taskId>")
  .description("End task execution tracking")
  .option("-s, --status <status>", "Final status (completed, cancelled, error)", "completed")
  .option("-e, --error <message>", "Error message if status is error")
  .action(
    async (
      taskId: string,
      options: { status: string; error?: string }
    ) => {
      try {
        const sdk = await getSDK();

        const execution = await sdk.executions.getActiveForTask(taskId);
        if (!execution) {
          console.error(
            JSON.stringify({ error: "No active execution found", taskId })
          );
          process.exit(1);
        }

        const errorMessage = options.status === "error" ? options.error : null;
        const updatedExecution = await sdk.executions.end(taskId, errorMessage);

        await notifyApp("execution", updatedExecution.id, "update");

        console.log(
          JSON.stringify(
            {
              success: true,
              executionId: updatedExecution.id,
              taskId,
              finalStatus: updatedExecution.status,
              endedAt: updatedExecution.endedAt,
            },
            null,
            2
          )
        );
        await closeSDK();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to end execution",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("update-execution <taskId>")
  .description("Update execution progress")
  .option("-c, --current-step <step>", "Current step number")
  .option("-t, --total-steps <steps>", "Total number of steps")
  .option("-d, --description <desc>", "Current step description")
  .option("-w, --waiting-for-input <bool>", "Whether waiting for user input (true/false)")
  .option("--heartbeat", "Update heartbeat timestamp only")
  .action(
    async (
      taskId: string,
      options: {
        currentStep?: string;
        totalSteps?: string;
        description?: string;
        waitingForInput?: string;
        heartbeat?: boolean;
      }
    ) => {
      try {
        const sdk = await getSDK();

        const execution = await sdk.executions.getActiveForTask(taskId);
        if (!execution) {
          console.error(
            JSON.stringify({ error: "No active execution found", taskId })
          );
          process.exit(1);
        }

        const updateInput: Parameters<typeof sdk.executions.update>[1] = {};

        if (options.currentStep) {
          updateInput.currentStep = parseInt(options.currentStep, 10);
        }
        if (options.totalSteps) {
          updateInput.totalSteps = parseInt(options.totalSteps, 10);
        }
        if (options.description) {
          updateInput.currentStepDescription = options.description;
        }
        if (options.waitingForInput !== undefined) {
          updateInput.waitingForInput = options.waitingForInput === "true";
        }

        const updatedExecution = await sdk.executions.update(execution.id, updateInput);

        await notifyApp("execution", execution.id, "update");

        console.log(
          JSON.stringify(
            {
              success: true,
              executionId: execution.id,
              taskId,
              updated: updateInput,
            },
            null,
            2
          )
        );
        await closeSDK();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to update execution",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("get-execution <taskId>")
  .description("Get current execution status for a task")
  .action(async (taskId: string) => {
    try {
      const sdk = await getSDK();

      const execution = await sdk.executions.getActiveForTask(taskId);

      if (!execution) {
        console.log(
          JSON.stringify({ isExecuting: false, taskId }, null, 2)
        );
        await closeSDK();
        return;
      }

      console.log(
        JSON.stringify(
          {
            isExecuting: true,
            taskId,
            execution,
          },
          null,
          2
        )
      );
      await closeSDK();
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to get execution",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("cleanup-executions")
  .description("Cleanup stale executions (no heartbeat for 5+ minutes)")
  .option("-t, --timeout <minutes>", "Timeout in minutes", "5")
  .option("--dry-run", "Show what would be cleaned up without making changes")
  .action(async (options: { timeout: string; dryRun?: boolean }) => {
    try {
      const sdk = await getSDK();
      const timeoutMinutes = parseInt(options.timeout, 10);

      if (options.dryRun) {
        const staleExecutions = await sdk.executions.listAllActive();
        const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        const stale = staleExecutions.filter(
          (e) => new Date(e.lastHeartbeat) < cutoffTime
        );

        console.log(
          JSON.stringify(
            {
              dryRun: true,
              staleCount: stale.length,
              staleExecutions: stale.map((e) => ({
                id: e.id,
                taskId: e.taskId,
                lastHeartbeat: e.lastHeartbeat,
              })),
            },
            null,
            2
          )
        );
        await closeSDK();
        return;
      }

      const cleanedUp = await sdk.executions.cleanupStale(timeoutMinutes);

      console.log(
        JSON.stringify(
          {
            success: true,
            cleanedUp,
          },
          null,
          2
        )
      );
      await closeSDK();
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to cleanup executions",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("link-terminal <taskId>")
  .description("Link a tmux session to a task (persistent binding)")
  .requiredOption("-t, --tmux <session>", "Tmux session name")
  .option("-s, --subtask <subtaskId>", "Set initial last_subtask_id")
  .action(
    async (
      taskId: string,
      options: { tmux: string; subtask?: string }
    ) => {
      try {
        const sdk = await getSDK();

        const task = await sdk.tasks.get(taskId);
        if (!task) {
          console.error(JSON.stringify({ error: "Task not found", taskId }));
          process.exit(1);
        }

        const existing = await sdk.executions.getTerminalForTask(taskId);
        const terminal = await sdk.executions.linkTerminal({
          taskId,
          tmuxSession: options.tmux,
          lastSubtaskId: options.subtask,
        });

        await notifyApp("terminal", terminal.id, existing ? "update" : "create");

        console.log(
          JSON.stringify(
            {
              success: true,
              action: existing ? "updated" : "created",
              taskId,
              terminal,
            },
            null,
            2
          )
        );

        await closeSDK();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to link terminal",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("get-terminal <taskId>")
  .description("Get terminal linked to a task")
  .action(async (taskId: string) => {
    try {
      const sdk = await getSDK();

      const terminal = await sdk.executions.getTerminalForTask(taskId);

      if (!terminal) {
        console.log(
          JSON.stringify({ hasTerminal: false, taskId }, null, 2)
        );
        await closeSDK();
        return;
      }

      console.log(
        JSON.stringify(
          {
            hasTerminal: true,
            taskId,
            terminal,
          },
          null,
          2
        )
      );
      await closeSDK();
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to get terminal",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("unlink-terminal <taskId>")
  .description("Remove terminal link from a task")
  .action(async (taskId: string) => {
    try {
      const sdk = await getSDK();

      const terminal = await sdk.executions.getTerminalForTask(taskId);

      if (!terminal) {
        console.log(
          JSON.stringify({ success: true, message: "No terminal was linked", taskId }, null, 2)
        );
        await closeSDK();
        return;
      }

      await sdk.executions.unlinkTerminal(taskId);

      await notifyApp("terminal", terminal.id, "delete");

      console.log(
        JSON.stringify({ success: true, unlinked: true, taskId }, null, 2)
      );
      await closeSDK();
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to unlink terminal",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program
  .command("update-terminal-subtask <taskId>")
  .description("Update the last executed subtask for a terminal (for /new detection)")
  .requiredOption("-s, --subtask <subtaskId>", "Subtask ID that was just executed")
  .action(
    async (
      taskId: string,
      options: { subtask: string }
    ) => {
      try {
        const sdk = await getSDK();

        const terminal = await sdk.executions.getTerminalForTask(taskId);
        if (!terminal) {
          console.error(
            JSON.stringify({ error: "No terminal linked to task", taskId })
          );
          process.exit(1);
        }

        const previousSubtaskId = terminal.lastSubtaskId;
        const needsNewContext = previousSubtaskId !== null && previousSubtaskId !== options.subtask;

        await sdk.executions.updateTerminalSubtask(taskId, options.subtask);

        await notifyApp("terminal", terminal.id, "update");

        console.log(
          JSON.stringify(
            {
              success: true,
              taskId,
              previousSubtaskId,
              newSubtaskId: options.subtask,
              needsNewContext,
            },
            null,
            2
          )
        );
        await closeSDK();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to update terminal subtask",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("check-needs-new <taskId>")
  .description("Check if executing a subtask requires /new (context reset)")
  .requiredOption("-s, --subtask <subtaskId>", "Subtask about to be executed")
  .action(
    async (
      taskId: string,
      options: { subtask: string }
    ) => {
      try {
        const sdk = await getSDK();

        const terminal = await sdk.executions.getTerminalForTask(taskId);

        if (!terminal) {
          console.log(
            JSON.stringify({
              needsNew: false,
              reason: "no_terminal_linked",
              taskId,
            }, null, 2)
          );
          await closeSDK();
          return;
        }

        const needsNew = terminal.lastSubtaskId !== null && terminal.lastSubtaskId !== options.subtask;

        console.log(
          JSON.stringify(
            {
              needsNew,
              reason: needsNew ? "different_subtask" : terminal.lastSubtaskId === null ? "first_subtask" : "same_subtask",
              taskId,
              lastSubtaskId: terminal.lastSubtaskId,
              targetSubtaskId: options.subtask,
              tmuxSession: terminal.tmuxSession,
            },
            null,
            2
          )
        );
        await closeSDK();
      } catch (error) {
        console.error(
          JSON.stringify({
            error: "Failed to check needs new",
            message: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    }
  );

program
  .command("sync-skills")
  .description("Sync WorkoPilot skills and plugin to OpenCode user config (~/.config/opencode/)")
  .option("--dry-run", "Show what would be synced without making changes")
  .action(async (options: { dryRun?: boolean }) => {
    try {
      const os = await import("os");
      const fs = await import("fs");
      const path = await import("path");

      const homeDir = os.homedir();
      const skillsDestDir = path.join(homeDir, ".config", "opencode", "skills");
      const pluginDestDir = path.join(homeDir, ".config", "opencode", "plugin");

      const cliDir = path.dirname(new URL(import.meta.url).pathname);
      const projectRoot = path.resolve(cliDir, "..", "..", "..");
      const skillsSourceDir = path.join(projectRoot, "src-tauri", "resources", "opencode-skills");
      const pluginSourceDir = path.join(projectRoot, "src-tauri", "resources", "opencode-plugin");

      if (!fs.existsSync(skillsSourceDir)) {
        console.error(
          JSON.stringify({
            error: "Skills source directory not found",
            path: skillsSourceDir,
            hint: "Run this command from within the WorkoPilot project",
          })
        );
        process.exit(1);
      }

      const skillNames = [
        "workopilot-structure",
        "workopilot-execute-all",
        "workopilot-execute-subtask",
        "workopilot-review",
        "workopilot-quickfix",
      ];

      if (options.dryRun) {
        const pluginSource = path.join(pluginSourceDir, "workopilot.js");
        console.log(
          JSON.stringify(
            {
              dryRun: true,
              skills: {
                source: skillsSourceDir,
                destination: skillsDestDir,
                items: skillNames,
              },
              plugin: {
                source: pluginSource,
                destination: path.join(pluginDestDir, "workopilot.js"),
                exists: fs.existsSync(pluginSource),
              },
            },
            null,
            2
          )
        );
        return;
      }

      fs.mkdirSync(skillsDestDir, { recursive: true });

      let syncedCount = 0;
      const synced: string[] = [];

      for (const skillName of skillNames) {
        const sourceFile = path.join(skillsSourceDir, skillName, "SKILL.md");
        const destDir = path.join(skillsDestDir, skillName);
        const destFile = path.join(destDir, "SKILL.md");

        if (!fs.existsSync(sourceFile)) {
          console.error(`[WARN] Source skill not found: ${sourceFile}`);
          continue;
        }

        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(sourceFile, destFile);
        synced.push(skillName);
        syncedCount++;
      }

      let pluginSynced = false;
      const pluginSource = path.join(pluginSourceDir, "workopilot.js");
      if (fs.existsSync(pluginSource)) {
        fs.mkdirSync(pluginDestDir, { recursive: true });
        fs.copyFileSync(pluginSource, path.join(pluginDestDir, "workopilot.js"));
        pluginSynced = true;
      }

      console.log(
        JSON.stringify(
          {
            success: true,
            skills: {
              syncedCount,
              synced,
              destination: skillsDestDir,
            },
            plugin: {
              synced: pluginSynced,
              destination: pluginDestDir,
            },
          },
          null,
          2
        )
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          error: "Failed to sync skills",
          message: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });

program.parse();
