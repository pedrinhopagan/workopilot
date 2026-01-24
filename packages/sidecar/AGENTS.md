# SIDECAR PACKAGE (packages/sidecar)

## OVERVIEW

Bun HTTP server exposing tRPC API to the frontend. Also supports minimal JSON-RPC over stdin/stdout.

## STRUCTURE

```
packages/sidecar/src/
├── index.ts           # entry point, emits TRPC_URL
├── trpc/              # router, context, server
│   └── routers/       # tasks, projects, subtasks, executions, settings, system
├── handlers.ts        # JSON-RPC handlers (legacy)
└── types.ts           # JSON-RPC types and errors
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add procedure | `packages/sidecar/src/trpc/routers/` |
| Server setup | `packages/sidecar/src/trpc/server.ts` |
| JSON-RPC types | `packages/sidecar/src/types.ts` |

## CONVENTIONS

- Routers are thin SDK wrappers; no business logic.
- All inputs validated with Zod.
- Emit `TRPC_URL=http://localhost:PORT` on stdout for Tauri discovery.

## ANTI-PATTERNS

- Direct database access from routers
- Heavy logic in handlers (keep minimal JSON-RPC)
