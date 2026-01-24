# WorkoPilot Architecture

> Target architecture for backend restructuring
> Date: 2026-01-22

---

## 1. High-Level Overview

```
                              +---------------------------+
                              |       Desktop App         |
                              |       (Tauri/Rust)        |
                              |                           |
                              |  +--------------------+   |
                              |  | Thin Shell Only:   |   |
                              |  | - Window mgmt      |   |
                              |  | - Tray             |   |
                              |  | - Global shortcuts |   |
                              |  | - File dialogs     |   |
                              |  | - Process spawning |   |
                              |  +--------------------+   |
                              |            |              |
                              |      stdio/JSON-RPC      |
                              |            |              |
                              |            v              |
                              |  +--------------------+   |
                              |  |    Bun Sidecar     |   |
                              |  |  (packages/sidecar)|   |
                              |  +--------------------+   |
                              +------------|--------------+
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
                    v                      v                      v
          +-----------------+    +-----------------+    +-----------------+
          |  packages/core  |    |  packages/sdk   |    |  packages/cli   |
          |    (domain +    |<---|  (high-level    |    |   (commands)    |
          |  infrastructure)|    |      API)       |--->|                 |
          +-----------------+    +-----------------+    +-----------------+
                    |
                    v
          +-----------------+
          |     SQLite      |
          |  (single source)|
          +-----------------+
```

---

## 2. Package Boundaries

### 2.1 packages/core

**Purpose**: Domain logic + infrastructure. Single source of truth for all business logic.

**Layers**:
```
packages/core/
├── domain/
│   ├── entities/
│   │   ├── Task.ts           # Task entity with invariants
│   │   ├── Project.ts        # Project entity
│   │   ├── Subtask.ts        # Subtask entity
│   │   ├── Log.ts            # Log entity
│   │   └── Settings.ts       # Settings entity
│   ├── value-objects/
│   │   ├── TaskStatus.ts     # pending|structuring|structured|working|standby|ready_to_review|completed
│   │   ├── SubtaskStatus.ts  # pending|in_progress|done
│   │   ├── TaskPriority.ts   # 1|2|3
│   │   ├── TaskCategory.ts   # feature|bug|refactor|research|documentation
│   │   └── TaskComplexity.ts # trivial|simple|moderate|complex|epic
│   └── events/
│       └── DomainEvent.ts    # Base event type
├── application/
│   ├── use-cases/
│   │   ├── tasks/
│   │   │   ├── CreateTask.ts
│   │   │   ├── GetTask.ts
│   │   │   ├── UpdateTaskStatus.ts
│   │   │   ├── ScheduleTask.ts
│   │   │   └── ...
│   │   ├── projects/
│   │   │   ├── CreateProject.ts
│   │   │   ├── GetProjects.ts
│   │   │   └── ...
│   │   ├── subtasks/
│   │   │   ├── CreateSubtask.ts
│   │   │   ├── UpdateSubtaskStatus.ts
│   │   │   └── ...
│   │   └── executions/
│   │       ├── StartExecution.ts
│   │       ├── EndExecution.ts
│   │       └── ...
│   ├── services/
│   │   ├── ActivityLogService.ts
│   │   └── ExecutionService.ts
│   └── ports/
│       ├── TaskRepository.ts      # Interface
│       ├── ProjectRepository.ts   # Interface
│       ├── SubtaskRepository.ts   # Interface
│       └── SettingsRepository.ts  # Interface
└── infrastructure/
    ├── database/
    │   ├── connection.ts          # Kysely + SQLite setup
    │   ├── migrations/
    │   │   ├── 001_initial.ts
    │   │   ├── 002_add_executions.ts
    │   │   └── ...
    │   └── schema.ts              # Database types
    ├── repositories/
    │   ├── SqliteTaskRepository.ts
    │   ├── SqliteProjectRepository.ts
    │   ├── SqliteSubtaskRepository.ts
    │   └── SqliteSettingsRepository.ts
    └── index.ts                   # Export createCore(dbPath)
```

**Exports**:
```typescript
// packages/core/index.ts
export { createCore } from './infrastructure';
export type { Core } from './infrastructure';

// Domain exports
export * from './domain/entities';
export * from './domain/value-objects';

// Application exports  
export * from './application/use-cases';
export * from './application/services';
```

**Dependencies**:
- `kysely` + `kysely-bun-sqlite` (database)
- Zero external runtime dependencies for domain layer

---

### 2.2 packages/sdk

**Purpose**: High-level API for external consumers (OpenCode, automations, scripts).

```
packages/sdk/
├── src/
│   ├── WorkoPilotSDK.ts      # Main SDK class
│   ├── tasks.ts              # Task operations
│   ├── projects.ts           # Project operations
│   ├── subtasks.ts           # Subtask operations
│   ├── executions.ts         # Execution tracking
│   └── types.ts              # Public types
└── index.ts
```

**API Surface**:
```typescript
import { WorkoPilotSDK } from '@workopilot/sdk';

const sdk = new WorkoPilotSDK();

// Tasks
const task = await sdk.tasks.get(taskId);
const tasks = await sdk.tasks.list({ projectId, status });
await sdk.tasks.create({ title, projectId, ... });
await sdk.tasks.updateStatus(taskId, 'working');
await sdk.tasks.schedule(taskId, date);

// Projects
const projects = await sdk.projects.list();
const project = await sdk.projects.get(projectId);
await sdk.projects.create({ name, path, ... });

// Subtasks
await sdk.subtasks.create(taskId, { title, ... });
await sdk.subtasks.updateStatus(subtaskId, 'done');

// Executions
await sdk.executions.start(taskId, { type: 'subtask', subtaskId });
await sdk.executions.end(taskId);
await sdk.executions.updateProgress(taskId, { step: 3, total: 5 });
```

**Characteristics**:
- Works WITHOUT Tauri running (standalone)
- Uses `packages/core` internally
- Handles DB path resolution automatically
- Notifies Tauri app via Unix socket (if running)

**Dependencies**:
- `@workopilot/core`

---

### 2.3 packages/cli

**Purpose**: Command-line interface for humans and AI agents.

```
packages/cli/
├── src/
│   ├── index.ts              # Commander.js entry
│   ├── commands/
│   │   ├── tasks.ts          # Task commands
│   │   ├── subtasks.ts       # Subtask commands
│   │   ├── projects.ts       # Project commands
│   │   ├── executions.ts     # Execution commands
│   │   └── migrate.ts        # Migration commands
│   └── output.ts             # JSON/human output formatting
└── package.json
```

**Commands** (unchanged from current):
```bash
workopilot get-task <id>
workopilot list-tasks [--project-id] [--status]
workopilot update-task <id> --status <status>
workopilot create-subtask <taskId> --title <title>
workopilot update-subtask <id> --status <status>
workopilot start-execution <taskId>
workopilot end-execution <taskId>
workopilot migrate
```

**Dependencies**:
- `@workopilot/sdk` (NOT core directly)
- `commander`

---

### 2.4 packages/sidecar

**Purpose**: tRPC HTTP server + minimal JSON-RPC for Rust IPC.

```
packages/sidecar/
├── src/
│   ├── index.ts              # Entry point (starts both servers)
│   ├── handlers.ts           # Minimal JSON-RPC (3 methods for Rust)
│   ├── types.ts              # RPC types
│   └── trpc/
│       ├── server.ts         # Bun HTTP server, dynamic port
│       ├── context.ts        # tRPC context with SDK
│       ├── trpc.ts           # Base tRPC config
│       ├── router.ts         # AppRouter (aggregates all routers)
│       └── routers/
│           ├── system.ts     # ping, version
│           ├── projects.ts   # All project operations
│           ├── tasks.ts      # All task operations
│           ├── subtasks.ts   # All subtask operations
│           ├── settings.ts   # Key-value settings
│           └── executions.ts # Execution tracking
└── package.json
```

**Characteristics**:
- Spawned by Tauri on app startup
- **tRPC HTTP server** (primary): Frontend connects via HTTP
- **JSON-RPC stdio** (minimal): Only for Rust AI workflow commands
- Uses `@workopilot/sdk` for tRPC, `@workopilot/core` for JSON-RPC
- Single long-running process
- Emits `TRPC_URL=http://localhost:PORT` on stdout for Tauri to capture

**tRPC Routers**:
| Router | Procedures |
|--------|------------|
| system | ping, version |
| projects | list, get, create, update, updateOrder, delete |
| tasks | get, getFull, list, listFull, listFullPaginated, listUrgent, listActive, listForDate, listForMonth, listUnscheduled, create, update, updateStatus, schedule, unschedule, saveFull, delete |
| subtasks | get, listByTaskId, create, update, updateStatus, delete, reorder, deleteByTaskId |
| settings | get, set, getAll, delete |
| executions | start, end, update, get, getActiveForTask, listAllActive, cleanupStale, getTerminalForTask, linkTerminal, unlinkTerminal, updateTerminalSubtask |

**JSON-RPC Methods** (minimal, for Rust only):
- `projects.get` - Get project for AI workflow launch
- `tasks.getFull` - Get task for AI workflow launch  
- `tasks.updateStatus` - Update status when launching AI workflows

**Dependencies**:
- `@workopilot/sdk`
- `@trpc/server`
- `zod`

---

### 2.5 src-tauri (Rust - Thin Shell)

**Purpose**: Desktop shell ONLY. No business logic.

**KEEPS**:
| Module | Responsibility |
|--------|----------------|
| `lib.rs` | App setup, sidecar spawn, command registration |
| `window.rs` | Show/hide/toggle window |
| `tray.rs` | System tray icon + menu |
| `settings.rs` | Global keyboard shortcuts (tauri plugin) |
| `ipc_socket.rs` | Receive notifications from CLI |
| `sidecar.rs` | **NEW** - Spawn + communicate with Bun sidecar |

**REMOVES** (migrated to TS/tRPC):
| Module | Destination |
|--------|-------------|
| `database.rs` | `packages/core/infrastructure/` |
| `commands.rs` (CRUD) | `packages/sidecar/src/trpc/routers/` |
| `activity_logger.rs` | `packages/core/application/services/` |

**Remaining Rust Commands** (after tRPC migration):
```rust
// Window/desktop operations (cannot move to TS)
#[tauri::command] fn hide_window() -> ...

// Process spawning (needs native APIs)
#[tauri::command] fn launch_project_tmux() -> ...
#[tauri::command] fn focus_tmux_session() -> ...
#[tauri::command] fn launch_task_workflow() -> ...
#[tauri::command] fn launch_task_structure() -> ...
#[tauri::command] fn launch_task_execute_all() -> ...
#[tauri::command] fn launch_task_execute_subtask() -> ...
#[tauri::command] fn launch_task_review() -> ...
#[tauri::command] fn launch_quickfix_background() -> ...

// Skills sync (needs bundle resources)
#[tauri::command] fn sync_skills() -> ...

// File system operations
#[tauri::command] fn open_env_file() -> ...
#[tauri::command] fn detect_project_structure() -> ...

// Task images (binary blobs - kept in Rust for performance)
#[tauri::command] fn add_task_image() -> ...
#[tauri::command] fn add_task_image_from_path() -> ...
#[tauri::command] fn get_task_images() -> ...
#[tauri::command] fn get_task_image() -> ...
#[tauri::command] fn delete_task_image() -> ...

// Settings (shortcuts - needs Tauri plugin)
#[tauri::command] fn get_shortcut() -> ...
#[tauri::command] fn set_shortcut() -> ...

// Sidecar management
#[tauri::command] fn get_trpc_url() -> ...
#[tauri::command] fn sidecar_status() -> ...
#[tauri::command] fn sidecar_restart() -> ...
#[tauri::command] fn sidecar_call() -> ...  // For debugging

// Local processing
#[tauri::command] fn get_ai_suggestion() -> ...
#[tauri::command] fn get_user_sessions() -> ...
```

**Frontend Data Flow** (tRPC - NO Rust proxy):
```typescript
// Frontend uses tRPC directly (not invoke)
const { data: projects } = trpc.projects.list.useQuery();
const { data: task } = trpc.tasks.getFull.useQuery({ id: taskId });
const updateStatus = trpc.tasks.updateStatus.useMutation();
```

---

## 3. IPC Contract (JSON-RPC 2.0)

### 3.1 Protocol

Communication between Tauri and Sidecar uses **JSON-RPC 2.0** over **stdio** (stdin/stdout).

**Request Format**:
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "methodName",
  "params": { ... }
}
```

**Response Format**:
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": { ... }
}
```

**Error Format**:
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": { ... }
  }
}
```

### 3.2 Method Catalog

#### Projects
```typescript
// List all projects
{ method: "projects.list", params: {} }
// Response: { projects: Project[] }

// Get project with config
{ method: "projects.get", params: { id: string } }
// Response: { project: Project }

// Create project
{ method: "projects.create", params: { name, path, description? } }
// Response: { project: Project }

// Update project
{ method: "projects.update", params: { id, name?, routes?, tmux_config?, business_rules? } }
// Response: { project: Project }

// Delete project
{ method: "projects.delete", params: { id: string } }
// Response: { success: true }

// Update order
{ method: "projects.updateOrder", params: { order: string[] } }
// Response: { success: true }
```

#### Tasks
```typescript
// List tasks
{ method: "tasks.list", params: { projectId?, status?, limit? } }
// Response: { tasks: Task[] }

// Get task full (with subtasks)
{ method: "tasks.get", params: { id: string } }
// Response: { task: TaskFull }

// Create task
{ method: "tasks.create", params: { projectId, title, description?, priority?, category?, complexity? } }
// Response: { task: TaskFull }

// Update task status
{ method: "tasks.updateStatus", params: { id, status } }
// Response: { task: TaskFull }

// Schedule task
{ method: "tasks.schedule", params: { id, date: string } }
// Response: { task: TaskFull }

// Unschedule task
{ method: "tasks.unschedule", params: { id: string } }
// Response: { task: TaskFull }

// Save task full (full update)
{ method: "tasks.save", params: { task: TaskFull } }
// Response: { task: TaskFull }

// Delete task
{ method: "tasks.delete", params: { id: string } }
// Response: { success: true }

// Get tasks for date
{ method: "tasks.getForDate", params: { date: string } }
// Response: { tasks: Task[] }

// Get tasks for month
{ method: "tasks.getForMonth", params: { year: number, month: number } }
// Response: { tasks: Task[] }

// Get urgent tasks
{ method: "tasks.getUrgent", params: {} }
// Response: { tasks: Task[] }

// Get active tasks
{ method: "tasks.getActive", params: {} }
// Response: { tasks: Task[] }
```

#### Subtasks
```typescript
// Create subtask
{ method: "subtasks.create", params: { taskId, title, description?, order? } }
// Response: { subtask: Subtask }

// Update subtask
{ method: "subtasks.update", params: { id, status?, title?, description?, acceptance_criteria?, technical_notes?, prompt_context? } }
// Response: { subtask: Subtask }

// Delete subtask
{ method: "subtasks.delete", params: { id: string } }
// Response: { success: true }

// Reorder subtasks
{ method: "subtasks.reorder", params: { taskId, order: string[] } }
// Response: { success: true }
```

#### Executions
```typescript
// Start execution
{ method: "executions.start", params: { taskId, subtaskId?, type: "full"|"subtask" } }
// Response: { execution: TaskExecution }

// End execution
{ method: "executions.end", params: { taskId, error_message? } }
// Response: { execution: TaskExecution }

// Update progress
{ method: "executions.updateProgress", params: { taskId, step, total, waitingForInput? } }
// Response: { execution: TaskExecution }

// Get active execution
{ method: "executions.getActive", params: { taskId: string } }
// Response: { execution: TaskExecution | null }

// Get all active executions
{ method: "executions.getAllActive", params: {} }
// Response: { executions: TaskExecution[] }

// Cleanup stale executions
{ method: "executions.cleanup", params: {} }
// Response: { cleaned: number }

// Link terminal
{ method: "executions.linkTerminal", params: { taskId, tmuxSession, pid } }
// Response: { terminal: TaskTerminal }

// Unlink terminal
{ method: "executions.unlinkTerminal", params: { taskId: string } }
// Response: { success: true }
```

#### Task Images
```typescript
// Add image (base64)
{ method: "images.add", params: { taskId, data: string, mimeType, fileName } }
// Response: { image: { id, taskId, fileName, createdAt } }

// Get images list
{ method: "images.list", params: { taskId: string } }
// Response: { images: ImageMeta[] }

// Get image data
{ method: "images.get", params: { id: string } }
// Response: { image: { id, data: string, mimeType, fileName } }

// Delete image
{ method: "images.delete", params: { id: string } }
// Response: { success: true }
```

#### Logs
```typescript
// Get session logs (OpenCode logs)
{ method: "logs.getSessions", params: { projectId?, limit? } }
// Response: { logs: Log[] }

// Get activity logs
{ method: "logs.getActivity", params: { eventType?, entityType?, projectId?, limit? } }
// Response: { logs: ActivityLog[] }

// Search activity logs
{ method: "logs.searchActivity", params: { query: string, limit? } }
// Response: { logs: ActivityLog[] }

// Get user sessions
{ method: "logs.getUserSessions", params: { limit? } }
// Response: { sessions: UserSession[] }
```

#### Settings
```typescript
// Get setting
{ method: "settings.get", params: { key: string } }
// Response: { value: string | null }

// Set setting
{ method: "settings.set", params: { key: string, value: string } }
// Response: { success: true }
```

#### System
```typescript
// Health check
{ method: "system.health", params: {} }
// Response: { status: "ok", version: string }

// DB info
{ method: "system.dbInfo", params: {} }
// Response: { path: string, size: number, tables: string[] }

// Run migrations
{ method: "system.migrate", params: {} }
// Response: { success: true, migrations: string[] }
```

### 3.3 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Missing required fields |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Wrong parameter types |
| -32603 | Internal error | Server error |
| -32000 | Not found | Entity not found |
| -32001 | Validation error | Business rule violation |
| -32002 | Conflict | Concurrent modification |

---

## 4. Dependency Graph

```
                    +------------------+
                    |   src-tauri      |
                    |   (Rust shell)   |
                    +--------+---------+
                             |
                        stdio/JSON-RPC
                             |
                             v
                    +------------------+
                    | packages/sidecar |
                    +--------+---------+
                             |
                             | depends on
                             v
+------------------+    +------------------+
|  packages/cli    |--->|  packages/sdk    |
+------------------+    +--------+---------+
                             |
                             | depends on
                             v
                    +------------------+
                    |  packages/core   |
                    +--------+---------+
                             |
                             | uses
                             v
                    +------------------+
                    |     SQLite       |
                    +------------------+
```

**Dependency Rules**:
1. `core` has NO dependencies on other packages (leaf)
2. `sdk` depends ONLY on `core`
3. `cli` depends ONLY on `sdk`
4. `sidecar` depends ONLY on `core`
5. `src-tauri` spawns `sidecar` as child process

---

## 5. Data Flow

### 5.1 Frontend -> tRPC -> Sidecar -> DB (NEW - tRPC migration complete)

```
React Component
    -> trpc.tasks.list.useQuery()
    -> HTTP request to localhost:PORT/trpc
    -> Bun HTTP server (packages/sidecar)
    -> tRPC router (packages/sidecar/src/trpc/)
    -> SDK (packages/sdk)
    -> Core (packages/core)
    -> SQLite
    -> Return to frontend via React Query
```

### 5.2 Rust Commands (AI Workflows) -> JSON-RPC -> Sidecar

```
commands.rs::launch_task_structure()
    -> sidecar_call!("projects.get", ...)
    -> sidecar_call!("tasks.getFull", ...)
    -> JSON-RPC over stdio (minimal handlers)
    -> SDK → Core → SQLite
    -> Spawn alacritty/tmux with opencode
```

Note: JSON-RPC handlers are now minimal (only 3 methods: projects.get, tasks.getFull, tasks.updateStatus)
      All other data operations go through tRPC HTTP.

### 5.3 CLI -> SDK -> Core -> DB (+ notify Tauri)

```
CLI: workopilot update-task abc --status working
    -> sdk.tasks.updateStatus("abc", "working")
    -> core.useCases.updateTaskStatus()
    -> SqliteTaskRepository.update()
    -> SQLite write
    -> sdk.notifyApp({ entity: "task", id: "abc", op: "update" })
    -> Unix socket /tmp/workopilot.sock
    -> Tauri receives notification
    -> Emits "db-changed" event
    -> Frontend refetches
```

### 5.4 OpenCode (via SDK, not CLI)

```
OpenCode skill execution
    -> import { WorkoPilotSDK } from '@workopilot/sdk'
    -> sdk.tasks.updateStatus(taskId, 'working')
    -> ... same as CLI flow
```

---

## 6. Migration Strategy

### Phase 1: Create packages/core (Subtask 3)
1. Create folder structure
2. Define entities and value objects
3. Implement repositories (port from database.rs)
4. Export createCore()

### Phase 2: Create packages/sdk (Subtask 4)
1. Create SDK wrapper over core
2. Add socket notification
3. Test standalone operation

### Phase 3: Migrate CLI (Subtask 5)
1. Replace direct Kysely with SDK calls
2. Keep same CLI commands
3. Test all commands

### Phase 4: Create sidecar (Subtask 6)
1. Implement JSON-RPC server
2. Add all method handlers
3. Test communication

### Phase 5: Convert Tauri to thin shell (Subtask 7)
1. Add sidecar spawn logic
2. Convert CRUD commands to proxy
3. Remove database.rs
4. Keep only native commands

### Phase 6: Cleanup and tests (Subtask 8)
1. Remove dead code
2. Add integration tests
3. Update documentation

---

## 7. File Locations

| Purpose | Path |
|---------|------|
| SQLite database | `~/.local/share/workopilot/workopilot.db` |
| Unix socket (CLI notify) | `/tmp/workopilot.sock` |
| Skills | `~/.config/opencode/skills/` |
| Sidecar binary | `packages/sidecar/dist/workopilot-sidecar` |

---

## 8. Key Decisions

### Why Sidecar instead of embedded?
- **Rust FFI complexity**: Calling TS from Rust is painful
- **Hot reload**: Can restart sidecar without restarting app
- **Resource isolation**: Sidecar can crash without killing app
- **Debugging**: Easier to debug separate process
- **Future flexibility**: Could replace with any language

### Why JSON-RPC 2.0?
- **Standard protocol**: Well-documented, battle-tested
- **Language agnostic**: Works with any language pair
- **Error handling**: Built-in error format
- **Batch support**: Can batch multiple calls
- **Tooling**: Existing libraries and debuggers

### Why Core as separate package?
- **Testability**: Can unit test without DB
- **Reusability**: SDK and Sidecar share same logic
- **Clean architecture**: Clear separation of concerns
- **Future-proof**: Easy to add new consumers

---

---

## 9. Testing Structure

Tests are organized by layer and type:

```
packages/core/
├── __tests__/
│   ├── unit/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Task.test.ts
│   │   │   │   ├── Project.test.ts
│   │   │   │   └── Subtask.test.ts
│   │   │   └── value-objects/
│   │   │       ├── TaskStatus.test.ts
│   │   │       └── SubtaskStatus.test.ts
│   │   └── application/
│   │       └── helpers.test.ts
│   ├── integration/
│   │   └── TaskRepository.test.ts
│   └── helpers/
│       └── testDatabase.ts      # Test DB setup utilities

packages/sdk/
├── __tests__/
│   ├── unit/
│   │   └── modules/
│   │       ├── TasksModule.test.ts
│   │       ├── ProjectsModule.test.ts
│   │       └── SubtasksModule.test.ts
│   └── integration/
│       └── WorkoPilotSDK.test.ts
```

Run tests:
```bash
cd packages/core && bun test
cd packages/sdk && bun test
```

---

## 10. Future Integration Ports

The architecture includes interfaces (ports) for future integrations:

### SearchService (for Typesense)
```typescript
interface SearchService {
  indexTask(task: Task): Promise<void>;
  searchTasks(query: string, options?: SearchOptions): Promise<SearchResult<Task>[]>;
  searchAll(query: string): Promise<{ tasks: SearchResult<Task>[]; projects: SearchResult<Project>[] }>;
  reindexAll(): Promise<void>;
}
```

### WebhookService (for external notifications)
```typescript
type WebhookEventType = 'task.created' | 'task.updated' | 'task.status_changed' | 'subtask.completed' | ...;

interface WebhookService {
  register(config: WebhookConfig): Promise<WebhookConfig>;
  emit<T>(event: WebhookEventType, data: T): Promise<WebhookDeliveryResult[]>;
  list(): Promise<WebhookConfig[]>;
}
```

### NotificationService (for in-app/system notifications)
```typescript
interface NotificationService {
  send(notification: Notification): Promise<Notification>;
  list(options?: { unreadOnly?: boolean }): Promise<Notification[]>;
  scheduleReminder(taskId: string, remindAt: string): Promise<void>;
}
```

### AIService (for AI providers)
```typescript
interface AIService {
  configure(config: AIServiceConfig): Promise<void>;
  structureTask(task: Task, projectContext?: string): Promise<TaskStructureResult>;
  generateExecutionPrompt(task: TaskFull, subtask: Subtask): Promise<ExecutionPrompt>;
  suggestNextActions(task: TaskFull): Promise<string[]>;
}
```

These interfaces are defined in `packages/core/src/application/ports/` and can be implemented when needed.

---

*This document defines the target architecture. Refer to BACKEND_INVENTORY.md for current state.*
