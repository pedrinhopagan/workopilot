# Agenda Feature Design

**Date:** 2026-01-20  
**Status:** Approved  
**Task ID:** 6cf67117-492e-493d-937f-bbaa9378fa65

## Overview

A monthly calendar view where tasks (created in "Tarefas") are scheduled to specific days. Users can drag-and-drop tasks between the unscheduled panel and calendar days. An AI distribution feature intelligently spreads tasks across a defined period, with ability to split complex tasks into multiple days.

## Key Concepts

- **scheduled_date**: The date a task is planned to be worked on
- **due_date**: The deadline for task completion
- **Validation rule**: `scheduled_date` should be ≤ `due_date - 1 day` (warns if violated, doesn't block)
- **Complex tasks**: Tasks with `complexity = media|complexa` can be split across multiple days via microtasks

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ TabBar (Projetos | Tarefas | Agenda | Logs)            [Settings] [X]│
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                  │
│  UNSCHEDULED     │              CALENDAR (Month View)               │
│  TASKS PANEL     │                                                  │
│  (~1/3 width)    │  ┌─────────────────────────────────────────────┐ │
│                  │  │  < Janeiro 2026 >           [Hoje]          │ │
│  ┌────────────┐  │  ├───┬───┬───┬───┬───┬───┬───┤                 │
│  │ Filters    │  │  │Dom│Seg│Ter│Qua│Qui│Sex│Sab│                 │
│  │ [Project▼] │  │  ├───┼───┼───┼───┼───┼───┼───┤                 │
│  │ [Category▼]│  │  │   │   │ 1 │ 2 │ 3 │ 4 │ 5 │                 │
│  │ [Priority▼]│  │  │   │   │   │chips│   │   │   │               │
│  └────────────┘  │  ├───┼───┼───┼───┼───┼───┼───┤                 │
│                  │  │ 6 │ 7 │...│   │   │   │   │                 │
│  ┌────────────┐  │  └───┴───┴───┴───┴───┴───┴───┘                 │
│  │ Task 1   P1│  │                                                  │
│  │ Task 2   P2│  │                                                  │
│  │ Task 3   P1│  │                                                  │
│  │ ...        │  │                                                  │
│  └────────────┘  │                                                  │
│                  │                                                  │
│ [Distribuir IA]  │                                                  │
│                  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
```

### Day Drawer (overlay from right)

When clicking a day, a drawer overlays from the right covering the calendar:

```
┌──────────────────┬─────────────────────┬────────────────────────────┐
│  UNSCHEDULED     │  CALENDAR (dimmed)  │      DAY DRAWER            │
│  (still visible) │                     │                            │
│                  │                     │  ← 15 Janeiro 2026         │
│                  │                     │                            │
│                  │                     │  ┌──────────────────────┐  │
│                  │                     │  │ [x] Task A      P1   │  │
│                  │                     │  │ [ ] Task B      P2   │  │
│                  │                     │  │ [ ] Task C      P1   │  │
│                  │                     │  └──────────────────────┘  │
│                  │                     │                            │
│                  │                     │  Click task → /tasks/[id]  │
│                  │                     │  Drag to reorder           │
│                  │                     │  Drag out → unschedule     │
└──────────────────┴─────────────────────┴────────────────────────────┘
```

Clicking outside the drawer closes it.

---

## Data Model

### Database Changes

**New column in `tasks` table:**

```sql
ALTER TABLE tasks ADD COLUMN scheduled_date TEXT;
```

### Task States

| State               | scheduled_date                            | Appears in                   |
| ------------------- | ----------------------------------------- | ---------------------------- |
| Unscheduled         | `NULL`                                    | Left panel                   |
| Scheduled           | `"2026-01-15"`                            | Calendar day cell            |
| Multi-day (complex) | Parent has no date, microtasks have dates | Each day shows the microtask |

### Microtask Extension

Add `scheduled_date` to Microtask struct in `task_json.rs`:

```rust
pub struct Microtask {
    pub id: String,
    pub title: String,
    pub status: String,
    pub prompt_context: Option<String>,
    pub completed_at: Option<String>,
    pub scheduled_date: Option<String>,  // NEW
}
```

### TypeScript Types

```typescript
// Update in src/lib/types.ts
interface Task {
  // ... existing fields
  scheduled_date: string | null;
}

interface Microtask {
  // ... existing fields
  scheduled_date: string | null;
}

// New type for calendar view
interface CalendarTask {
  id: string;
  title: string;
  project_id: string | null;
  project_name: string;
  priority: number;
  category: string;
  status: string;
  scheduled_date: string;
  due_date: string | null;
  is_overdue: boolean;
  is_microtask: boolean;
  parent_task_id: string | null;
}
```

---

## Tauri Commands

### New Commands

```rust
// Scheduling
schedule_task(task_id: String, scheduled_date: String) -> Result<(), String>
unschedule_task(task_id: String) -> Result<(), String>
schedule_microtask(task_id: String, microtask_id: String, scheduled_date: String) -> Result<(), String>

// Calendar queries
get_tasks_for_month(year: i32, month: i32, project_id: Option<String>) -> Result<Vec<CalendarTask>, String>
get_unscheduled_tasks(project_id: Option<String>, category: Option<String>, priority: Option<i32>) -> Result<Vec<Task>, String>
get_tasks_for_date(date: String, project_id: Option<String>) -> Result<Vec<Task>, String>

// AI Distribution
get_ai_distribution_prompt(task_ids: Vec<String>, start_date: String, end_date: String) -> Result<String, String>
apply_ai_distribution(distribution: AIDistributionResult) -> Result<(), String>
```

### CalendarTask Struct

```rust
#[derive(serde::Serialize, Clone)]
pub struct CalendarTask {
    pub id: String,
    pub title: String,
    pub project_id: Option<String>,
    pub project_name: String,
    pub priority: i32,
    pub category: String,
    pub status: String,
    pub scheduled_date: String,
    pub due_date: Option<String>,
    pub is_overdue: bool,
    pub is_microtask: bool,
    pub parent_task_id: Option<String>,
}
```

---

## Frontend Components

### Component Structure

```
src/lib/components/agenda/
├── Calendar.svelte           # Month grid, navigation, drop zones
├── CalendarDay.svelte        # Single day cell with task chips, drop target
├── TaskChip.svelte           # Task indicator on calendar day
├── UnscheduledPanel.svelte   # Left panel with filters + task list
├── UnscheduledTask.svelte    # Draggable task item in left panel
├── DayDrawer.svelte          # Right overlay with day's tasks
├── DayTaskItem.svelte        # Task row in drawer
└── AIDistributionModal.svelte # Period picker + preview
```

### State Management

```typescript
// src/lib/stores/agenda.ts
import { writable } from "svelte/store";

export const selectedDate = writable<string | null>(null);
export const currentMonth = writable<{ year: number; month: number }>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
});
export const draggedTask = writable<{
  id: string;
  type: "task" | "microtask";
} | null>(null);
```

---

## Visual Design

### Colors (existing WorkPilot palette)

| Element            | Color              |
| ------------------ | ------------------ |
| Background         | `#1c1c1c`          |
| Panel/Card         | `#232323`          |
| Borders            | `#3d3a34`          |
| Accent (active)    | `#909d63`          |
| Text primary       | `#d6d6d6`          |
| Text secondary     | `#828282`          |
| Text muted         | `#636363`          |
| Priority 1 (Alta)  | `#bc5653` (red)    |
| Priority 2 (Média) | `#ebc17a` (orange) |
| Priority 3 (Baixa) | `#909d63` (green)  |
| Overdue warning    | `#bc5653`          |
| Today highlight    | `#909d63` border   |

### Task Chip Design

```
┌──┬────────────┐
│▌ │ Work   P1  │
└──┴────────────┘
 ↑       ↑    ↑
 │       │    └── Priority with color (P1=red, P2=orange, P3=green)
 │       └─────── Project name (truncated, max ~8 chars)
 └─────────────── Left border 3px, project color (default #909d63)
```

- Overdue chip: Red border all around instead of just left
- No project: Show "—", neutral gray border

### Calendar Day States

| State                  | Visual                                           |
| ---------------------- | ------------------------------------------------ |
| Empty                  | Just date number                                 |
| With tasks             | Date + task chips                                |
| Today                  | Green border (`#909d63`)                         |
| Selected (drawer open) | Green filled background                          |
| Drag hover             | Dashed border, slight highlight                  |
| Has overdue            | ⚠ icon in corner, overdue chips have red border |
| Other month            | Dimmed text (`#636363`)                          |

### Overflow

When more than 3 tasks, show "+N" chip:

```
┌─────────────────┐
│ 20              │
│ ┌───┐ ┌───┐ ┌──┐│
│ │W P1│ │A P2│ │+3││
│ └───┘ └───┘ └──┘│
└─────────────────┘
```

---

## User Flows

### Flow 1: Schedule a Task (drag from left to calendar)

1. User drags task from `UnscheduledPanel`
2. Calendar days highlight as valid drop zones
3. Days after `due_date` show warning indicator (yellow/red border)
4. User drops on a day → calls `schedule_task(task_id, date)`
5. Task disappears from left panel, chip appears on calendar day

### Flow 2: Reschedule a Task (drag between days)

1. User clicks day → `DayDrawer` opens
2. User starts dragging task from drawer
3. **Drawer collapses immediately** → calendar fully visible
4. Calendar days become drop zones with visual feedback
5. Drop on another day → calls `schedule_task(task_id, new_date)`
6. **Drawer reopens** showing original day (minus that task)

### Flow 3: Unschedule a Task (drag to left panel)

1. From `DayDrawer`, user drags task to `UnscheduledPanel`
2. Left panel highlights as drop zone ("Soltar para remover do calendário")
3. Drop → calls `unschedule_task(task_id)`
4. Task reappears in left panel, removed from calendar

### Flow 4: View/Edit Task Details

1. User clicks on task (in drawer or left panel)
2. Navigates to `/tasks/[id]`
3. After editing, user clicks back → returns to `/agenda`
4. Calendar state (month, open drawer) preserved via store

### Flow 5: AI Distribution

1. User clicks "Distribuir com IA" button in left panel
2. Modal opens:
   - Summary: "X tarefas não agendadas"
   - Period picker: Start date → End date
   - Filters already applied from left panel
3. User clicks "Gerar Distribuição" → AI processes
4. Preview shows proposed schedule (list format)
5. Warnings shown (e.g., "Task E movida para antes do due_date")
6. User confirms → changes applied to calendar

---

## AI Distribution

### Modal - Step 1 (Period Selection)

```
┌─────────────────────────────────────────────────────────┐
│  Distribuir Tarefas com IA                         [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  12 tarefas não agendadas (filtros aplicados)          │
│                                                         │
│  Período para distribuição:                             │
│  ┌─────────────┐     ┌─────────────┐                   │
│  │ 20/01/2026  │ até │ 31/01/2026  │                   │
│  └─────────────┘     └─────────────┘                   │
│                                                         │
│              [ Gerar Distribuição ]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Modal - Step 2 (Preview)

```
┌─────────────────────────────────────────────────────────┐
│  Distribuição Proposta                             [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  20/01 (Segunda)                                        │
│    • Task A (P1)                                        │
│    • Task B - Parte 1 (P2) ← split from complex        │
│                                                         │
│  21/01 (Terça)                                          │
│    • Task B - Parte 2 (P2)                              │
│    • Task C (P1)                                        │
│                                                         │
│  22/01 (Quarta)                                         │
│    • Task D (P3)                                        │
│                                                         │
│  ⚠ Task E movida para antes do due_date (era 25/01)    │
│                                                         │
│         [ Cancelar ]        [ Aplicar Distribuição ]    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### AI Context (what AI receives)

- List of tasks with: title, priority, category, complexity, due_date, description
- Target period (start/end dates)
- Project business rules

### AI Output (what AI returns)

```typescript
interface AIDistributionResult {
  scheduled: Array<{
    task_id: string;
    scheduled_date: string;
  }>;
  new_microtasks: Array<{
    parent_task_id: string;
    title: string;
    scheduled_date: string;
  }>;
  warnings: string[];
}
```

---

## Edge Cases

| Scenario                            | Behavior                                       |
| ----------------------------------- | ---------------------------------------------- |
| Task with no project                | Show "—" as project name, neutral gray border  |
| Task scheduled past due_date        | Red border on chip, ⚠ on day, allow it        |
| Complex task with microtasks        | Only microtasks appear on calendar, not parent |
| Drag to same day                    | No-op, no API call                             |
| Month with no tasks                 | Empty calendar, left panel shows unscheduled   |
| AI distribution returns empty       | Show "Nenhuma tarefa para distribuir"          |
| AI distribution fails               | Error toast, modal stays open to retry         |
| Drawer open, task deleted elsewhere | Refresh on focus, remove from drawer           |
| Very long project name              | Truncate with ellipsis (max ~8 chars)          |

### Loading States

- Calendar initial load: Skeleton grid
- Drag drop: Optimistic update, revert on error
- AI distribution: Spinner on button

### Empty States

- Left panel empty: "Todas as tarefas estão agendadas"
- Day drawer empty: "Nenhuma tarefa para este dia"
- No tasks at all: "Crie tarefas em 'Tarefas' para agendar"

---

## Implementation Phases

### Phase 1: Backend Foundation

- Add `scheduled_date` column migration
- Add `scheduled_date` to Microtask struct
- Implement commands: `schedule_task`, `unschedule_task`, `get_tasks_for_month`, `get_unscheduled_tasks`, `get_tasks_for_date`

### Phase 2: Calendar Core

- Create `Calendar.svelte` with month grid and navigation
- Create `CalendarDay.svelte` with task chips
- Create `TaskChip.svelte` component
- Create agenda store
- Replace placeholder in `/routes/agenda/+page.svelte`

### Phase 3: Unscheduled Panel

- Create `UnscheduledPanel.svelte` with filters
- Create `UnscheduledTask.svelte` items
- Integrate with calendar layout

### Phase 4: Drag & Drop

- Implement HTML5 drag/drop
- Visual feedback (hover states, warnings)
- Drop handlers for scheduling/unscheduling

### Phase 5: Day Drawer

- Create `DayDrawer.svelte` overlay
- Create `DayTaskItem.svelte`
- Drawer collapse during drag

### Phase 6: AI Distribution

- Create `AIDistributionModal.svelte`
- Prompt generation
- Preview UI
- Apply distribution logic

---

## File Changes Summary

### Backend (Rust)

```
src-tauri/src/
├── database.rs      # Add scheduled_date column, migration, new queries
├── commands.rs      # Add 6 new commands
├── task_json.rs     # Add scheduled_date to Microtask
└── lib.rs           # Register new commands
```

### Frontend (Svelte)

```
src/
├── lib/
│   ├── components/
│   │   └── agenda/
│   │       ├── Calendar.svelte
│   │       ├── CalendarDay.svelte
│   │       ├── TaskChip.svelte
│   │       ├── UnscheduledPanel.svelte
│   │       ├── UnscheduledTask.svelte
│   │       ├── DayDrawer.svelte
│   │       ├── DayTaskItem.svelte
│   │       └── AIDistributionModal.svelte
│   ├── stores/
│   │   └── agenda.ts
│   └── types.ts
├── routes/
│   └── agenda/
│       └── +page.svelte
```

### Estimated Scope

- 8 new Svelte components
- 1 new store file
- ~200 lines Rust
- ~150 lines TypeScript
- ~800-1000 lines Svelte total
