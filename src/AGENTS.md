# FRONTEND (src)

## OVERVIEW

React frontend with TanStack Router, Zustand stores, tRPC data access, and shadcn/ui components. Uses Tailwind CSS v4 with CSS variables.

## STRUCTURE

```
src/
├── routes/            # File-based routes (auto-generates routeTree.gen.ts)
├── components/        # UI components (shared + domain)
├── stores/            # Zustand UI state
├── services/          # tRPC, Tauri bridge, OpenCode integration
├── hooks/             # Reusable hooks
├── lib/               # constants, utils, search schemas
├── providers/         # TRPCProvider
├── types.ts           # shared types
├── main.tsx           # entry point
└── app.css            # global styles + CSS variables
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add route | `src/routes/` | file-based, auto-generates `src/routeTree.gen.ts` |
| Search param schemas | `src/lib/searchSchemas.ts` | Zod schemas used by routes |
| Data access | `src/services/trpc.ts` | tRPC client + vanilla client |
| Tauri bridge | `src/services/tauri.ts` | safeInvoke/safeListen wrappers |
| Task mutations | `src/hooks/useUpdateTask.ts` | tRPC mutation wrappers |
| UI state | `src/stores/` | Zustand stores |

## CONVENTIONS

- Use `trpc.*` hooks for data; avoid direct `invoke()` for CRUD.
- Route-private modules live in `-components/` and `-utils/` folders.
- Use `TaskProgressState` in UI (not `TaskStatus`).
- Use Tailwind tokens/CSS variables; avoid hardcoded colors.
- Portuguese UI strings for labels and buttons.

## ANTI-PATTERNS

- Edit `src/routeTree.gen.ts` (auto-generated)
- Client-side task reordering (ordering is backend SQL)
- Persist progress state in DB (derive from status + subtasks)
- Hardcoded status strings (import constants)
