import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const executionsRouter = router({
  start: publicProcedure
    .input(
      z.object({
        task_id: z.string(),
        current_subtask_id: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.executions.start(input);
    }),

  end: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        errorMessage: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.executions.end(input.taskId, input.errorMessage);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        current_subtask_id: z.string().nullable().optional(),
        progress_summary: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.sdk.executions.update(id, data);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.executions.get(input.id);
    }),

  getActiveForTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.executions.getActiveForTask(input.taskId);
    }),

  listAllActive: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.executions.listAllActive();
  }),

  cleanupStale: publicProcedure
    .input(z.object({ maxAgeMinutes: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.executions.cleanupStale(input?.maxAgeMinutes);
    }),

  getTerminalForTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.executions.getTerminalForTask(input.taskId);
    }),

  linkTerminal: publicProcedure
    .input(
      z.object({
        task_id: z.string(),
        tmux_session: z.string(),
        current_subtask_id: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.executions.linkTerminal(input);
    }),

  unlinkTerminal: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.executions.unlinkTerminal(input.taskId);
    }),

  updateTerminalSubtask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        subtaskId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.executions.updateTerminalSubtask(
        input.taskId,
        input.subtaskId
      );
    }),
});
