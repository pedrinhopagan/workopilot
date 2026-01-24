import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import type { TaskListFilters } from "@workopilot/sdk";

const taskStatusSchema = z.enum(["pending", "in_progress", "done"]);
const taskSortBySchema = z.enum(["priority", "created_at", "title", "progress_state"]);
const taskCategorySchema = z.enum(["feature", "bug", "refactor", "research", "documentation"]);
const taskPrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const tasksRouter = router({
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.tasks.get(input.id);
    }),

  getFull: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.tasks.getFull(input.id);
    }),

  list: publicProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          status: taskStatusSchema.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input
        ? { project_id: input.projectId, status: input.status }
        : undefined;
      return ctx.sdk.tasks.list(filters);
    }),

  listFull: publicProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          status: taskStatusSchema.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input
        ? { project_id: input.projectId, status: input.status }
        : undefined;
      return ctx.sdk.tasks.listFull(filters);
    }),

  listFullPaginated: publicProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          status: taskStatusSchema.optional(),
          priority: taskPrioritySchema.optional(),
          category: taskCategorySchema.optional(),
          q: z.string().optional(),
          page: z.number().optional(),
          perPage: z.number().optional(),
          sortBy: taskSortBySchema.optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
          excludeDone: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const filters: TaskListFilters | undefined = input ? {
        project_id: input.projectId,
        status: input.status,
        priority: input.priority,
        category: input.category,
        q: input.q,
        page: input.page,
        perPage: input.perPage,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        excludeDone: input.excludeDone,
      } : undefined;
      return ctx.sdk.tasks.listFullPaginated(filters);
    }),

  listUrgent: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.tasks.listUrgent();
  }),

  listActive: publicProcedure.query(async ({ ctx }) => {
    return ctx.sdk.tasks.listActive();
  }),

  listForDate: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.tasks.listForDate(input.date);
    }),

  listForMonth: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.sdk.tasks.listForMonth(input.year, input.month);
    }),

  listUnscheduled: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.sdk.tasks.listUnscheduled(input?.projectId);
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        project_id: z.string().nullable().optional(),
        description: z.string().optional(),
        context: z.string().optional(),
        scheduled_date: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.tasks.create(input);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        context: z.string().optional(),
        acceptance_criteria: z.string().optional(),
        scheduled_date: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.sdk.tasks.update(id, data);
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: taskStatusSchema,
        modifiedBy: z.enum(["user", "ai", "cli"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.tasks.updateStatus(
        input.id,
        input.status,
        input.modifiedBy ?? "user"
      );
    }),

  schedule: publicProcedure
    .input(z.object({ id: z.string(), date: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.tasks.schedule(input.id, input.date);
    }),

  unschedule: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.tasks.unschedule(input.id);
    }),

  saveFull: publicProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.tasks.saveFull(input);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.sdk.tasks.delete(input.id);
    }),
});
