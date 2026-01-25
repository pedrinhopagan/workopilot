import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const urgenciesRouter = router({
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.get(input.id);
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.urgencies.list();
  }),

  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.getByName(input.name);
    }),

  getByLevel: publicProcedure
    .input(z.object({ level: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.getByLevel(input.level);
    }),

  count: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.urgencies.count();
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        level: z.number(),
        color: z.string(),
        display_order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.create(input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        level: z.number().optional(),
        color: z.string().optional(),
        display_order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.sdk.urgencies.update(id, data);
    }),

  reorder: publicProcedure
    .input(z.object({ orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.reorder(input.orderedIds);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.delete(input.id);
    }),

  migrateAndDelete: publicProcedure
    .input(z.object({ sourceId: z.string(), targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.migrateAndDelete(input.sourceId, input.targetId);
    }),

  hasAssociatedTasks: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.urgencies.hasAssociatedTasks(input.id);
    }),
});
