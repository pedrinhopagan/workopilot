import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const settingsRouter = router({
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.settings.get(input.key);
    }),

  set: publicProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.settings.set(input.key, input.value);
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.settings.getAll();
  }),

  delete: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.settings.delete(input.key);
    }),
});
