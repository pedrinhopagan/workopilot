import { z } from "zod";
import { router, publicProcedure } from "../trpc";

const subtaskStatusSchema = z.enum(["pending", "in_progress", "done"]);

export const subtasksRouter = router({
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.get(input.id);
    }),

  listByTaskId: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.listByTaskId(input.taskId);
    }),

  create: publicProcedure
    .input(
      z.object({
        task_id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        order_index: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.create(input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.sdk.subtasks.update(id, data);
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: subtaskStatusSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.updateStatus(input.id, input.status);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.delete(input.id);
    }),

  reorder: publicProcedure
    .input(z.object({ taskId: z.string(), orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.reorder(input.taskId, input.orderedIds);
    }),

  deleteByTaskId: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.subtasks.deleteByTaskId(input.taskId);
    }),
});
