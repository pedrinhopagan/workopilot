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
| UI primitives | `src/components/ui/` | shadcn/ui + CustomSelect |
| Custom dropdowns | `src/components/ui/custom-select.tsx` | Generic select with render props |

## ACTION REGISTRY

**File:** `src/lib/constants/actionRegistry.ts`

Centralized, declarative definition of all task actions. Each action maps to an OpenCode skill and defines its UI behavior.

### Interface

```typescript
interface ActionDefinition {
  id: ActionId;           // 'structure' | 'execute_all' | 'execute_subtask' | 'review' | 'commit' | 'focus_terminal'
  label: string;          // Portuguese UI label
  icon: LucideIcon;       // lucide-react icon
  skill: string;          // OpenCode skill name
  color: string;          // Hex color from PROGRESS_STATE_COLORS
  suggestedWhen: (task: TaskFull) => boolean;  // When to suggest this action
  generatePrompt: (task: TaskFull, subtaskId?: string) => string;  // Prompt for OpenCode
  beforeExecute?: { setStatus?: TaskStatus };  // Status change before execution
  afterExecute?: { setStatus?: TaskStatus };   // Status change after execution
  requiresSubtaskSelect?: boolean;             // Whether user must pick a subtask first
}
```

### Helpers

| Function | Returns |
|----------|---------|
| `getActionById(id)` | `ActionDefinition \| undefined` |
| `getSuggestedActionFromRegistry(task)` | `ActionDefinition \| null` (first match wins by array order) |

### Action Flow

```
Structure → Execute → Review → Commit → Done
```

Actions are rendered dynamically from the `ACTIONS` array. Suggestion priority follows array order (first match wins). Colors are derived from `PROGRESS_STATE_COLORS` in `taskProgressState.ts`.

### Key Files

| File | Role |
|------|------|
| `src/lib/constants/actionRegistry.ts` | Action definitions and registry |
| `src/lib/constants/taskProgressState.ts` | Progress states, colors, labels |
| `src/lib/constants/taskStatus.ts` | `deriveProgressState()` logic |
| `src/routes/tasks/$taskId/-components/ManageTaskStatus.tsx` | Renders action buttons from registry |
| `src/routes/tasks/$taskId/-components/ManageTaskRoot.tsx` | Action handlers |

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
