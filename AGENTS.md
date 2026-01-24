# WORKOPILOT KNOWLEDGE BASE

**Generated:** 2026-01-23
**Commit:** 0e44467
**Branch:** master

## OVERVIEW

AI-powered task management companion for developers. Tauri app (Rust + React) with CLI/SDK for AI workflows. Stores tasks in SQLite, structures via AI dialogue, executes via OpenCode skills.

## STRUCTURE

```
workopilot/
├── src/                    # React frontend (TanStack Router, Zustand, shadcn/ui)
├── src-tauri/              # Rust backend (thin shell, spawns sidecar)
│   ├── resources/          # OpenCode skills + plugin (bundled)
│   └── src/                # Tauri commands, window/tray mgmt
├── packages/
│   ├── core/               # Domain logic, DDD architecture (see packages/core/AGENTS.md)
│   ├── sdk/                # High-level API for external use
│   ├── cli/                # CLI for AI skill integration
│   └── sidecar/            # tRPC HTTP server + JSON-RPC (Bun process)
├── docs/                   # ARCHITECTURE.md, BACKEND_INVENTORY.md, FRONTEND_STRUCTURE.md
└── aur/                    # Arch Linux packaging
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add Tauri command | `src-tauri/src/commands.rs` + `lib.rs` | Register in `invoke_handler` |
| Add frontend route | `src/routes/` | TanStack file-based routing, auto-generates `routeTree.gen.ts` |
| Modify DB schema | `packages/core/src/infrastructure/database/` | Migrations in `migrations/`, schema in `schema.ts` |
| Add CLI command | `packages/cli/src/index.ts` | Uses Commander.js, calls SDK |
| Add OpenCode skill | `src-tauri/resources/opencode-skills/` | SKILL.md format, synced to `~/.config/opencode/skills/` |
| Frontend state | `src/stores/` | Zustand stores |
| UI components | `src/components/ui/` | shadcn/ui library |
| Task-specific UI | `src/components/tasks/` | SubtaskList, ImageUploader, etc. |

## DATABASE SCHEMA (SQLite)

**Location:** `~/.local/share/workopilot/workopilot.db`

| Table | Purpose |
|-------|---------|
| `projects` | Project metadata, routes, tmux config, business rules |
| `tasks` | Core task data, context, acceptance criteria, ai_metadata |
| `subtasks` | Task decomposition, order, status tracking |
| `task_executions` | Execution progress, heartbeat, tmux session |
| `task_terminals` | Persistent tmux session bindings |
| `task_images` | Screenshot/image blobs |
| `operation_logs` | Change audit trail |
| `activity_logs` | User activity tracking |
| `settings` | Key-value config |

**Status Values:**
- Tasks: `pending` → `in_progress` → `done`
- Subtasks: `pending` → `in_progress` → `done`
- Executions: `running` → `completed` | `error`

## OPENCODE SKILLS (5 total)

Skills define AI workflows. Located in `src-tauri/resources/opencode-skills/`:

| Skill | Trigger | What it does |
|-------|---------|--------------|
| `workopilot-structure` | "estruturar" | Dialogue to collect description, rules, criteria; creates subtasks |
| `workopilot-execute-all` | "executar" (full) | Implements all subtasks sequentially |
| `workopilot-execute-subtask` | "executar subtask" | Implements single subtask with focus |
| `workopilot-review` | "revisar" | Verifies acceptance criteria, runs checks, approves/rejects |
| `workopilot-quickfix` | "quickfix" | Minimal adjustments, preserves structure |

**Skills use CLI:** `cd packages/cli && bun run src/index.ts <command>`

## CLI COMMANDS

```bash
# Task operations
get-task <taskId>                    # Get full task JSON
list-tasks [--project] [--status]    # List tasks
update-task <taskId> --status <s>    # Update task
create-subtask <taskId> --title <t>  # Create subtask
update-subtask <id> --status <s>     # Update subtask

# Execution tracking
start-execution <taskId>             # Start execution
end-execution <taskId>               # End execution
link-terminal <taskId> -t <session>  # Link tmux session

# Utilities
db-info                              # Database stats
sync-skills                          # Sync skills to OpenCode
```

## ARCHITECTURE CONSTRAINTS

**Dependency Graph (STRICT):**
```
Frontend → tRPC (HTTP) → Bun HTTP server → SDK → SQLite
src-tauri (spawns) → sidecar (depends) → core
                     cli (depends) → sdk (depends) → core
```

**What stays in Rust:**
- Window management (`window.rs`)
- System tray (`tray.rs`)
- Global shortcuts (`settings.rs`)
- Process spawning (tmux, alacritty, opencode)
- Resource bundling (skills sync)
- Task images (binary blobs via direct DB access)
- AI workflow launch commands

**What's in TypeScript (via tRPC):**
- All CRUD operations (projects, tasks, subtasks, executions, settings)
- Migrations
- Business logic

**Data Flow (after tRPC migration):**
- Frontend uses `trpc.*` hooks for all data operations
- Rust commands only for: window control, process spawn, images, shortcuts

## ANTI-PATTERNS

| Pattern | Why forbidden |
|---------|---------------|
| Remove `windows_subsystem` in main.rs | Breaks Windows release build |
| Direct core import from cli | Use SDK instead |
| Polling without cleanup | Memory leaks, stale data |
| Hardcoded colors in components | Use Tailwind/CSS variables |
| `as any` / `@ts-ignore` | Type safety violation |
| Committing `dist/` folder | Only commit source code, build artifacts are generated |

## CONVENTIONS

- **Task status flow:** `pending` → `in_progress` (AI working) → `done`
- **CLI notifies app:** Socket at `/tmp/workopilot.sock`
- **Skills use CLI:** Never raw SQL in skills
- **Frontend:** TanStack Query for data, Zustand for UI state
- **Commits:** Portuguese OK (project language)

## COMMANDS

```bash
# Development
bun install                  # Install all dependencies
bun run dev                  # Start Tauri dev mode

# Build
bun run build               # Build for production

# CLI (from packages/cli)
bun run src/index.ts <cmd>  # Run CLI command
```

## RELATED DOCS

- `docs/ARCHITECTURE.md` - Target backend restructuring (6-phase plan)
- `docs/BACKEND_INVENTORY.md` - Current Rust/TS module inventory
- `docs/FRONTEND_STRUCTURE.md` - React patterns, performance issues
- `packages/core/AGENTS.md` - Core package DDD architecture
