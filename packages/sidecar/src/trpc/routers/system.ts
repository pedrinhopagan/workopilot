import { router, publicProcedure } from '../trpc';

export const systemRouter = router({
  ping: publicProcedure.query(() => {
    return { ok: true, timestamp: new Date().toISOString() };
  }),

  version: publicProcedure.query(() => {
    return { version: '0.1.0', runtime: 'bun', transport: 'trpc' };
  }),
});
