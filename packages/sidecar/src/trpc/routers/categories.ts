import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const categoriesRouter = router({
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.categories.get(input.id);
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.categories.list();
  }),

  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.categories.getByName(input.name);
    }),

  count: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.categories.count();
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().nullable().optional(),
        display_order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.categories.create(input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        color: z.string().nullable().optional(),
        display_order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.sdk.categories.update(id, data);
    }),

  reorder: publicProcedure
    .input(z.object({ orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.categories.reorder(input.orderedIds);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.categories.delete(input.id);
    }),

  migrateAndDelete: publicProcedure
    .input(z.object({ sourceId: z.string(), targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.categories.migrateAndDelete(input.sourceId, input.targetId);
    }),

  hasAssociatedTasks: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.categories.hasAssociatedTasks(input.id);
    }),
});
