# WorkoPilot - Coding Standards

## Task Status System

### Backend Status (Database)

The database stores only three status values:

| Status | Description |
|--------|-------------|
| `pending` | Task not yet started by AI |
| `in_progress` | AI is actively working on the task |
| `done` | Task completed |

These are defined in `packages/core/src/domain/value-objects/TaskStatus.ts`.

### Frontend Progress State (Derived)

Progress states are **derived** from task data (status + subtask completion) and used for UI display and ordering. They are NOT persisted in the database.

| Progress State | Label (PT-BR) | Derivation Logic |
|----------------|---------------|------------------|
| `in-execution` | Em execucao | Has subtasks, some done (not all) |
| `ready-to-start` | Pronta | Has subtasks, none done yet |
| `ready-to-review` | Aguardando revisao | All subtasks done, task not done |
| `ai-working` | IA trabalhando | Status is `in_progress` |
| `started` | Iniciada | Has description, no subtasks |
| `idle` | Pendente | No description, no subtasks |
| `done` | Concluida | Status is `done` |

Progress states are defined in `src/lib/constants/taskProgressState.ts`.

### Ordering Priority

Tasks are ordered by progress state priority (most attention needed first):

1. `in-execution` - User needs to review partial progress
2. `ready-to-start` - User can start execution
3. `ready-to-review` - User needs to review completed work
4. *(separator)*
5. `ai-working` - AI is working, user can wait
6. *(separator)*
7. `started` - Task has context but needs structuring
8. `idle` - Task needs initial setup
9. *(separator)*
10. `done` - Completed tasks (separate section)

This ordering is implemented in the backend SQL query, not client-side.

## Naming Conventions

### Progress State Constants

- Use **kebab-case** for progress state identifiers: `ready-to-start`, `in-execution`
- Labels in **Portuguese** with first letter capitalized: `Pronta`, `Em execucao`
- Constants file: `src/lib/constants/taskProgressState.ts`

### File Organization

| Domain | Location |
|--------|----------|
| Backend status types | `packages/core/src/domain/value-objects/TaskStatus.ts` |
| Frontend progress states | `src/lib/constants/taskProgressState.ts` |
| Task list filters | `packages/core/src/application/ports/TaskRepository.ts` |
| Search schema | `src/lib/searchSchemas.ts` |

## API Contracts

### Task List Filters

```typescript
interface TaskListFilters {
  project_id?: string;
  status?: TaskStatus | TaskStatus[];
  progress_state?: TaskProgressState;
  scheduled_date?: string;
  due_date?: string;
  q?: string;           // Search in title/description
  page?: number;        // 1-based
  perPage?: number;     // Default: 20, max: 100
  sortBy?: 'priority' | 'created_at' | 'title' | 'progress_state';
  sortOrder?: 'asc' | 'desc';
}
```

### Paginated Response

```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
```

## Anti-patterns

| Pattern | Why forbidden |
|---------|---------------|
| Client-side task reordering | Backend handles ordering via SQL |
| Storing progress state in DB | Always derive from status + subtasks |
| Using old `TaskStatus` enum in frontend | Use `TaskProgressState` instead |
| Hardcoded status strings | Import from constants |
| Committing `dist/` folder | Only commit source code, build artifacts are generated |

## Component Patterns

### Task List Components

- `TasksRoot` - Orchestrates data fetching, passes minimal props
- `TasksList` - Renders sections (active, done), handles empty states
- `TasksListItem` - Single task row, uses progress state for styling

### Prop Drilling Prevention

- Use hooks in `-utils/` for derived data (progress state, labels, styles)
- Keep callbacks in root component, pass only what's needed
- Prefer composition over deep prop chains
