import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const projectsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.projects.list();
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.projects.get(input.id);
    }),

  getStats: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.projects.getStats(input.projectId);
    }),

  getAllStats: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.projects.getAllStats();
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        path: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.projects.create(input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        routes: z.string().optional(),
        tmux_config: z.string().optional(),
        business_rules: z.string().optional(),
        tmux_configured: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.sdk.projects.update(id, data);
    }),

  updateOrder: publicProcedure
    .input(z.object({ orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.projects.updateOrder(input.orderedIds);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.projects.delete(input.id);
    }),
});
