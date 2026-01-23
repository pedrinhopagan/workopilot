# CORE PACKAGE - DDD ARCHITECTURE

**Parent:** See root `AGENTS.md` for project overview.

## OVERVIEW

Domain-driven design package. Single source of truth for entities, repositories, and database operations. Used by SDK, CLI, and Sidecar.

## STRUCTURE

```
packages/core/src/
├── domain/
│   ├── entities/           # Task, Subtask, Project, Execution, etc.
│   └── value-objects/      # TaskStatus, TaskPriority, TaskCategory, etc.
├── application/
│   └── ports/              # Repository interfaces (TaskRepository, etc.)
└── infrastructure/
    ├── database/           # Kysely schema, connection, migrations
    └── repositories/       # SQLite implementations
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add entity field | `domain/entities/{Entity}.ts` + `infrastructure/database/schema.ts` |
| Add status/enum | `domain/value-objects/` |
| Add repository method | `application/ports/{Entity}Repository.ts` (interface) + `infrastructure/repositories/Sqlite{Entity}Repository.ts` (impl) |
| Modify schema | `infrastructure/database/schema.ts` + `migrations/runner.ts` |
| Change connection | `infrastructure/database/connection.ts` |

## ENTITIES

| Entity | Key Fields |
|--------|------------|
| `Task` | id, title, status, priority, category, complexity, context (description, business_rules, acceptance_criteria), ai_metadata |
| `Subtask` | id, task_id, title, status, order, acceptance_criteria, prompt_context |
| `Project` | id, name, path, routes, tmux_config, business_rules |
| `Execution` | id, task_id, subtask_id, status, current_step, tmux_session |

## VALUE OBJECTS

| Value Object | Values |
|--------------|--------|
| `TaskStatus` | `pending`, `in_progress`, `done` |
| `SubtaskStatus` | `pending`, `in_progress`, `done` |
| `TaskPriority` | `1` (high), `2` (medium), `3` (low) |
| `TaskCategory` | `feature`, `bug`, `refactor`, `research`, `documentation` |
| `TaskComplexity` | `trivial`, `simple`, `moderate`, `complex`, `epic` |
| `ExecutionStatus` | `running`, `completed`, `error` |
| `ExecutionType` | `full`, `subtask` |

## PORTS (Interfaces)

Repository interfaces in `application/ports/`:

```typescript
// TaskRepository.ts
findAll(filters?): Promise<Task[]>
findById(id): Promise<Task | null>
findFull(id): Promise<TaskFull | null>
create(input): Promise<TaskFull>
update(id, input): Promise<Task>
updateStatus(id, status, modifiedBy?): Promise<void>
delete(id): Promise<void>
```

Similar patterns for `ProjectRepository`, `SubtaskRepository`, `ExecutionRepository`, `SettingsRepository`.

## DATABASE

**ORM:** Kysely with Bun SQLite driver
**Schema:** `infrastructure/database/schema.ts` (11 tables)
**Connection:** `infrastructure/database/connection.ts`

Key tables: `tasks`, `subtasks`, `projects`, `task_executions`, `task_terminals`, `task_images`, `operation_logs`, `activity_logs`, `settings`

## CONVENTIONS

- **Entity creation:** Always use `createCore()` factory, never instantiate directly
- **JSON fields:** `business_rules`, `acceptance_criteria`, `ai_metadata` stored as JSON strings
- **Timestamps:** ISO 8601 format, UTC
- **IDs:** UUID v4

## EXPORTS

```typescript
// Main entry
import { createCore, getDefaultDbPath } from '@workopilot/core';

// Types
import type { Task, TaskFull, Subtask, Project, Execution } from '@workopilot/core';
import type { TaskStatus, SubtaskStatus } from '@workopilot/core';
```
