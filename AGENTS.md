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

## OPENCODE SKILLS (6 total)

Skills define AI workflows. Located in `src-tauri/resources/opencode-skills/`:

| Skill | Trigger | What it does |
|-------|---------|--------------|
| `workopilot-structure` | "estruturar" | Dialogue to collect description, rules, criteria; creates subtasks |
| `workopilot-execute-all` | "executar" (full) | Implements all subtasks sequentially |
| `workopilot-execute-subtask` | "executar subtask" | Implements single subtask with focus |
| `workopilot-review` | "revisar" | Verifies acceptance criteria, runs checks, signals approval (does NOT mark done) |
| `workopilot-commit` | "commit" | Uses git-master to commit changes and marks task as done |
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

## ACTION SYSTEM

WorkoPilot uses a centralized **Action Registry** (`src/lib/constants/actionRegistry.ts`) that defines all available task actions declaratively.

### Task Action Flow

```
Structure → Execute → Review → Commit → Done
```

Each step corresponds to an action in the registry that maps to an OpenCode skill.

### Actions

| Action ID | Label | Skill | Color Source | Suggested When |
|-----------|-------|-------|-------------|----------------|
| `focus_terminal` | Ver terminal | _(none)_ | `ai-working` | AI is actively working (`ai-working` state) |
| `commit` | Commit | `workopilot-commit` | `ready-to-commit` (#6c5ce7) | All subtasks done + `last_completed_action === 'review'` + status !== 'done' |
| `review` | Revisar | `workopilot-review` | `ready-to-review` (#c9a227) | Progress state is `ready-to-review` |
| `execute_subtask` | Executar Subtask | `workopilot-execute-subtask` | `in-execution` (#b33a3a) | In execution, or ready-to-start with >3 subtasks |
| `execute_all` | Executar Tudo | `workopilot-execute-all` | `ready-to-start` (#4a8ec2) | Ready-to-start with <=3 subtasks |
| `structure` | Estruturar | `workopilot-structure` | `started` (#c2722a) | Idle or started state |

### ActionDefinition Interface

```typescript
interface ActionDefinition {
  id: ActionId;
  label: string;
  icon: LucideIcon;
  skill: string;
  color: string;
  suggestedWhen: (task: TaskFull) => boolean;
  generatePrompt: (task: TaskFull, subtaskId?: string) => string;
  beforeExecute?: { setStatus?: TaskStatus };
  afterExecute?: { setStatus?: TaskStatus };
  requiresSubtaskSelect?: boolean;
}
```

### Key Behaviors

- **Review does NOT mark task as done** - it sets `last_completed_action='review'` via CLI
- **Commit marks task as done** - it uses git-master to commit and then sets status to done
- **`ready-to-commit` progress state** is derived (not persisted): all subtasks done + `last_completed_action === 'review'` + status !== 'done'
- Actions are rendered dynamically from the registry in `ManageTaskStatus.tsx`
- Action suggestion priority follows array order (first match wins)

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

## ANIMATION GUIDELINES

**Princípio fundamental**: Hover deve ser SEMPRE sutil - apenas mudanças de cor e opacidade.

### Hover Effects - REGRAS OBRIGATÓRIAS

| Permitido | Proibido |
|-----------|----------|
| `transition-colors` | `hover:translate-y-*` |
| `transition-opacity` | `hover:translate-x-*` |
| `hover:text-*` (cor) | `hover:scale-*` |
| `hover:bg-*` (cor) | `hover:rotate-*` |
| `hover:border-*` (cor) | `group-hover:scale-*` |
| `hover:opacity-*` | `group-hover:translate-*` |
| `group-hover:text-*` | `hover-lift` (classe CSS) |
| `group-hover:opacity-*` | `hover:transform` |

### Exemplos Corretos

```tsx
// ✅ BOM - hover sutil apenas com cor/opacidade
<div className="transition-colors hover:bg-secondary hover:text-foreground" />
<div className="opacity-0 group-hover:opacity-100 transition-opacity" />
<button className="text-muted-foreground hover:text-primary transition-colors" />
```

### Exemplos Proibidos

```tsx
// ❌ PROIBIDO - movimento e escala em hover
<div className="hover:translate-y-[-2px]" />
<div className="group-hover:scale-105" />
<div className="hover-lift" /> // classe CSS que move elementos
<button className="hover:scale-110" />
```

### Entry Animations

Entry animations são permitidas, mas devem ser:
- **Rápidas**: máximo 300ms de duração
- **Discretas**: preferir `fade-in` sobre `slide-in` ou `scale-in`
- **Sem exagero**: evitar múltiplos efeitos simultâneos (staggered + slide + scale)

```tsx
// ✅ BOM - entry animation discreta
<div className="animate-fade-in" />

// ⚠️ COM MODERAÇÃO - entry com movimento
<div className="animate-slide-up-fade" /> // usar com delay curto

// ❌ EVITAR - múltiplos efeitos sobrepostos
<div className="animate-stagger-fade-in hover:translate-y-[-3px] group-hover:scale-105" />
```

### Transições de Estado

Para mudanças de estado (loading, done, error), usar:
- `transition-all duration-200` para transições suaves
- `animate-pulse` para estados de loading (com moderação)
- Evitar `animate-spin` excessivo - usar apenas em ícones de loading pequenos

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
