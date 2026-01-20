# Agenda Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a monthly calendar view with drag-and-drop task scheduling, day drawer for task management, and AI-powered task distribution.

**Architecture:** Three-panel layout (unscheduled tasks | calendar | day drawer overlay). Tasks have `scheduled_date` for calendar placement. Drag-and-drop using HTML5 API. AI distribution via modal with preview.

**Tech Stack:** Svelte 5, SvelteKit, TailwindCSS 4, Tauri 2, Rust, SQLite

---

## Phase 1: Backend Foundation

### Task 1.1: Database Migration - Add scheduled_date

**Files:**

- Modify: `src-tauri/src/database.rs:125-149` (add migration)
- Modify: `src-tauri/src/database.rs:289-312` (update queries)

**Step 1: Add migration function**

In `database.rs`, add after `migrate_tasks_json_path`:

```rust
fn migrate_tasks_scheduled_date(&self) -> Result<()> {
    let columns: Vec<String> = self.conn
        .prepare("PRAGMA table_info(tasks)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>>>()?;

    if !columns.contains(&"scheduled_date".to_string()) {
        self.conn.execute("ALTER TABLE tasks ADD COLUMN scheduled_date TEXT", [])?;
    }

    Ok(())
}
```

**Step 2: Call migration in init_schema**

In `init_schema()`, add after `self.migrate_tasks_json_path()?;`:

```rust
self.migrate_tasks_scheduled_date()?;
```

**Step 3: Update Task struct**

In the `Task` struct definition (~line 506), add field:

```rust
pub scheduled_date: Option<String>,
```

**Step 4: Update all Task queries to include scheduled_date**

Update `get_tasks` query (line ~290):

```rust
"SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
 FROM tasks
 ORDER BY priority ASC, created_at DESC"
```

Update the query_map to add:

```rust
scheduled_date: row.get(10)?,
```

**Step 5: Update get_urgent_tasks query**

Same pattern - add `scheduled_date` to SELECT and row.get(10).

**Step 6: Update get_task_by_id query**

Same pattern - add `scheduled_date` to SELECT and row.get(10).

**Step 7: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles with no errors

**Step 8: Commit**

```bash
git add src-tauri/src/database.rs
git commit -m "feat(db): add scheduled_date column migration for tasks"
```

---

### Task 1.2: Add Microtask scheduled_date

**Files:**

- Modify: `src-tauri/src/task_json.rs:13-20`

**Step 1: Update Microtask struct**

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct Microtask {
    pub id: String,
    pub title: String,
    pub status: String,
    pub prompt_context: Option<String>,
    pub completed_at: Option<String>,
    pub scheduled_date: Option<String>,  // NEW
}
```

**Step 2: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles with no errors

**Step 3: Commit**

```bash
git add src-tauri/src/task_json.rs
git commit -m "feat(task-json): add scheduled_date to Microtask struct"
```

---

### Task 1.3: Add schedule_task Command

**Files:**

- Modify: `src-tauri/src/database.rs` (add method)
- Modify: `src-tauri/src/commands.rs` (add command)
- Modify: `src-tauri/src/lib.rs` (register command)

**Step 1: Add database method**

In `database.rs`, add after `update_task_status`:

```rust
pub fn schedule_task(&self, task_id: &str, scheduled_date: &str) -> Result<()> {
    self.conn.execute(
        "UPDATE tasks SET scheduled_date = ?1 WHERE id = ?2",
        (scheduled_date, task_id),
    )?;
    Ok(())
}

pub fn unschedule_task(&self, task_id: &str) -> Result<()> {
    self.conn.execute(
        "UPDATE tasks SET scheduled_date = NULL WHERE id = ?1",
        [task_id],
    )?;
    Ok(())
}
```

**Step 2: Add Tauri commands**

In `commands.rs`, add after `update_task_status`:

```rust
#[tauri::command]
pub fn schedule_task(
    state: State<AppState>,
    task_id: String,
    scheduled_date: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.schedule_task(&task_id, &scheduled_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unschedule_task(state: State<AppState>, task_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.unschedule_task(&task_id).map_err(|e| e.to_string())
}
```

**Step 3: Register commands in lib.rs**

Add to the `invoke_handler` list:

```rust
commands::schedule_task,
commands::unschedule_task,
```

**Step 4: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles with no errors

**Step 5: Commit**

```bash
git add src-tauri/src/database.rs src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(api): add schedule_task and unschedule_task commands"
```

---

### Task 1.4: Add Calendar Query Commands

**Files:**

- Modify: `src-tauri/src/database.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add CalendarTask struct to database.rs**

After the `Task` struct:

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

**Step 2: Add get_tasks_for_month database method**

```rust
pub fn get_tasks_for_month(&self, year: i32, month: i32, project_id: Option<&str>) -> Result<Vec<CalendarTask>> {
    let start_date = format!("{:04}-{:02}-01", year, month);
    let end_date = if month == 12 {
        format!("{:04}-01-01", year + 1)
    } else {
        format!("{:04}-{:02}-01", year, month + 1)
    };

    let query = if project_id.is_some() {
        "SELECT t.id, t.title, t.project_id, COALESCE(p.name, '—') as project_name,
                t.priority, t.category, t.status, t.scheduled_date, t.due_date
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.scheduled_date >= ?1 AND t.scheduled_date < ?2
           AND t.project_id = ?3
         ORDER BY t.scheduled_date, t.priority"
    } else {
        "SELECT t.id, t.title, t.project_id, COALESCE(p.name, '—') as project_name,
                t.priority, t.category, t.status, t.scheduled_date, t.due_date
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.scheduled_date >= ?1 AND t.scheduled_date < ?2
         ORDER BY t.scheduled_date, t.priority"
    };

    let mut stmt = self.conn.prepare(query)?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let rows = if let Some(pid) = project_id {
        stmt.query_map([&start_date, &end_date, pid], |row| {
            let scheduled: String = row.get(7)?;
            let due: Option<String> = row.get(8)?;
            let is_overdue = due.as_ref().map(|d| scheduled > *d || today > *d).unwrap_or(false);

            Ok(CalendarTask {
                id: row.get(0)?,
                title: row.get(1)?,
                project_id: row.get(2)?,
                project_name: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                scheduled_date: scheduled,
                due_date: due,
                is_overdue,
                is_microtask: false,
                parent_task_id: None,
            })
        })?
    } else {
        stmt.query_map([&start_date, &end_date], |row| {
            let scheduled: String = row.get(7)?;
            let due: Option<String> = row.get(8)?;
            let is_overdue = due.as_ref().map(|d| scheduled > *d || today > *d).unwrap_or(false);

            Ok(CalendarTask {
                id: row.get(0)?,
                title: row.get(1)?,
                project_id: row.get(2)?,
                project_name: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                scheduled_date: scheduled,
                due_date: due,
                is_overdue,
                is_microtask: false,
                parent_task_id: None,
            })
        })?
    };

    rows.collect()
}
```

**Step 3: Add get_unscheduled_tasks database method**

```rust
pub fn get_unscheduled_tasks(
    &self,
    project_id: Option<&str>,
    category: Option<&str>,
    priority: Option<i32>,
) -> Result<Vec<Task>> {
    let mut conditions = vec!["scheduled_date IS NULL", "status != 'done'"];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if project_id.is_some() {
        conditions.push("project_id = ?");
        params.push(Box::new(project_id.unwrap().to_string()));
    }
    if category.is_some() {
        conditions.push("category = ?");
        params.push(Box::new(category.unwrap().to_string()));
    }
    if priority.is_some() {
        conditions.push("priority = ?");
        params.push(Box::new(priority.unwrap()));
    }

    let query = format!(
        "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
         FROM tasks
         WHERE {}
         ORDER BY priority ASC, due_date ASC NULLS LAST, created_at DESC",
        conditions.join(" AND ")
    );

    let mut stmt = self.conn.prepare(&query)?;

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let tasks = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Task {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            priority: row.get(4)?,
            category: row.get(5)?,
            status: row.get(6)?,
            due_date: row.get(7)?,
            json_path: row.get(8)?,
            created_at: row.get(9)?,
            scheduled_date: row.get(10)?,
        })
    })?.collect::<Result<Vec<_>>>()?;

    Ok(tasks)
}
```

**Step 4: Add get_tasks_for_date database method**

```rust
pub fn get_tasks_for_date(&self, date: &str, project_id: Option<&str>) -> Result<Vec<Task>> {
    let query = if project_id.is_some() {
        "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
         FROM tasks
         WHERE scheduled_date = ?1 AND project_id = ?2
         ORDER BY priority ASC, created_at ASC"
    } else {
        "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
         FROM tasks
         WHERE scheduled_date = ?1
         ORDER BY priority ASC, created_at ASC"
    };

    let mut stmt = self.conn.prepare(query)?;

    let tasks = if let Some(pid) = project_id {
        stmt.query_map([date, pid], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                due_date: row.get(7)?,
                json_path: row.get(8)?,
                created_at: row.get(9)?,
                scheduled_date: row.get(10)?,
            })
        })?
    } else {
        stmt.query_map([date], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                due_date: row.get(7)?,
                json_path: row.get(8)?,
                created_at: row.get(9)?,
                scheduled_date: row.get(10)?,
            })
        })?
    };

    tasks.collect()
}
```

**Step 5: Add Tauri commands**

In `commands.rs`:

```rust
use crate::database::{Project, ProjectRoute, ProjectWithConfig, SessionLog, Task, TmuxConfig, CalendarTask};

#[tauri::command]
pub fn get_tasks_for_month(
    state: State<AppState>,
    year: i32,
    month: i32,
    project_id: Option<String>,
) -> Result<Vec<CalendarTask>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tasks_for_month(year, month, project_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_unscheduled_tasks(
    state: State<AppState>,
    project_id: Option<String>,
    category: Option<String>,
    priority: Option<i32>,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_unscheduled_tasks(project_id.as_deref(), category.as_deref(), priority)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tasks_for_date(
    state: State<AppState>,
    date: String,
    project_id: Option<String>,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tasks_for_date(&date, project_id.as_deref())
        .map_err(|e| e.to_string())
}
```

**Step 6: Register commands in lib.rs**

Add to `invoke_handler`:

```rust
commands::get_tasks_for_month,
commands::get_unscheduled_tasks,
commands::get_tasks_for_date,
```

**Step 7: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles with no errors

**Step 8: Commit**

```bash
git add src-tauri/src/database.rs src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(api): add calendar query commands (get_tasks_for_month, get_unscheduled_tasks, get_tasks_for_date)"
```

---

### Task 1.5: Update TypeScript Types

**Files:**

- Modify: `src/lib/types.ts`

**Step 1: Update Task interface**

Add `scheduled_date` field:

```typescript
export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: number;
  category: string;
  status: string;
  due_date: string | null;
  json_path: string | null;
  created_at: string | null;
  scheduled_date: string | null; // NEW
}
```

**Step 2: Update Microtask interface**

```typescript
export interface Microtask {
  id: string;
  title: string;
  status: string;
  prompt_context: string | null;
  completed_at: string | null;
  scheduled_date: string | null; // NEW
}
```

**Step 3: Add CalendarTask interface**

```typescript
export interface CalendarTask {
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

**Step 4: Verify no TypeScript errors**

Run: `npm run check`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add scheduled_date to Task/Microtask, add CalendarTask type"
```

---

## Phase 2: Calendar Core

### Task 2.1: Create Agenda Store

**Files:**

- Create: `src/lib/stores/agenda.ts`

**Step 1: Create the store file**

```typescript
import { writable } from "svelte/store";

export const selectedDate = writable<string | null>(null);

export const currentMonth = writable<{ year: number; month: number }>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
});

export const draggedTask = writable<{
  id: string;
  title: string;
  fromDate: string | null;
} | null>(null);

export const drawerCollapsed = writable<boolean>(false);
```

**Step 2: Commit**

```bash
git add src/lib/stores/agenda.ts
git commit -m "feat(stores): create agenda store for calendar state"
```

---

### Task 2.2: Create TaskChip Component

**Files:**

- Create: `src/lib/components/agenda/TaskChip.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import type { CalendarTask } from '$lib/types';

  interface Props {
    task: CalendarTask;
    compact?: boolean;
  }

  let { task, compact = false }: Props = $props();

  const priorityColors: Record<number, string> = {
    1: '#bc5653',
    2: '#ebc17a',
    3: '#909d63'
  };

  let priorityColor = $derived(priorityColors[task.priority] || '#909d63');
  let projectInitial = $derived(task.project_name.charAt(0).toUpperCase());
  let projectColor = $derived('#909d63'); // TODO: get from project when colors are added
</script>

<div
  class="flex items-center gap-1 px-1.5 py-0.5 bg-[#2a2a2a] text-xs rounded-sm cursor-pointer hover:bg-[#333] transition-colors"
  class:border-l-3={!task.is_overdue}
  class:border={task.is_overdue}
  class:border-[#bc5653]={task.is_overdue}
  style:border-left-color={!task.is_overdue ? projectColor : undefined}
  style:border-left-width={!task.is_overdue ? '3px' : undefined}
>
  {#if !compact}
    <span class="text-[#d6d6d6] truncate max-w-[60px]">{task.project_name}</span>
  {/if}
  <span style:color={priorityColor} class="font-medium">P{task.priority}</span>
</div>

<style>
  .border-l-3 {
    border-left-style: solid;
  }
</style>
```

**Step 2: Commit**

```bash
mkdir -p src/lib/components/agenda
git add src/lib/components/agenda/TaskChip.svelte
git commit -m "feat(ui): create TaskChip component for calendar day cells"
```

---

### Task 2.3: Create CalendarDay Component

**Files:**

- Create: `src/lib/components/agenda/CalendarDay.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import type { CalendarTask } from '$lib/types';
  import TaskChip from './TaskChip.svelte';
  import { selectedDate, draggedTask } from '$lib/stores/agenda';

  interface Props {
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    tasks: CalendarTask[];
    onDrop: (taskId: string, date: string) => void;
  }

  let { date, dayNumber, isCurrentMonth, isToday, tasks, onDrop }: Props = $props();

  let isDragOver = $state(false);
  let isSelected = $derived($selectedDate === date);
  let hasOverdue = $derived(tasks.some(t => t.is_overdue));
  let visibleTasks = $derived(tasks.slice(0, 3));
  let overflowCount = $derived(Math.max(0, tasks.length - 3));

  function handleClick() {
    if (isCurrentMonth) {
      selectedDate.set(date);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if ($draggedTask && isCurrentMonth) {
      isDragOver = true;
    }
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    if ($draggedTask && isCurrentMonth) {
      onDrop($draggedTask.id, date);
    }
  }
</script>

<button
  type="button"
  class="flex flex-col p-1 min-h-[80px] border border-[#3d3a34] transition-all text-left"
  class:bg-[#232323]={isCurrentMonth && !isSelected}
  class:bg-[#1c1c1c]={!isCurrentMonth}
  class:bg-[#909d63]={isSelected}
  class:opacity-50={!isCurrentMonth}
  class:border-[#909d63]={isToday && !isSelected}
  class:border-2={isToday}
  class:border-dashed={isDragOver}
  class:border-[#909d63]={isDragOver}
  class:bg-[#2a2a2a]={isDragOver && !isSelected}
  onclick={handleClick}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="flex items-center justify-between w-full mb-1">
    <span
      class="text-sm font-medium"
      class:text-[#d6d6d6]={isCurrentMonth && !isSelected}
      class:text-[#636363]={!isCurrentMonth}
      class:text-[#1c1c1c]={isSelected}
    >
      {dayNumber}
    </span>
    {#if hasOverdue}
      <span class="text-[#bc5653] text-xs">⚠</span>
    {/if}
  </div>

  <div class="flex flex-col gap-0.5 flex-1 overflow-hidden">
    {#each visibleTasks as task (task.id)}
      <TaskChip {task} compact={tasks.length > 2} />
    {/each}
    {#if overflowCount > 0}
      <span class="text-[10px] text-[#828282]">+{overflowCount}</span>
    {/if}
  </div>
</button>
```

**Step 2: Commit**

```bash
git add src/lib/components/agenda/CalendarDay.svelte
git commit -m "feat(ui): create CalendarDay component with drag-drop support"
```

---

### Task 2.4: Create Calendar Component

**Files:**

- Create: `src/lib/components/agenda/Calendar.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { CalendarTask } from '$lib/types';
  import { currentMonth, selectedDate, draggedTask } from '$lib/stores/agenda';
  import CalendarDay from './CalendarDay.svelte';

  interface Props {
    projectId?: string | null;
  }

  let { projectId = null }: Props = $props();

  let tasks: CalendarTask[] = $state([]);
  let isLoading = $state(true);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let calendarDays = $derived(generateCalendarDays($currentMonth.year, $currentMonth.month));
  let monthName = $derived(monthNames[$currentMonth.month - 1]);

  function generateCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }> = [];

    // Previous month days
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month days
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month days
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const remainingDays = 42 - days.length;

    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  }

  function getTasksForDate(date: string): CalendarTask[] {
    return tasks.filter(t => t.scheduled_date === date);
  }

  async function loadTasks() {
    isLoading = true;
    try {
      tasks = await invoke('get_tasks_for_month', {
        year: $currentMonth.year,
        month: $currentMonth.month,
        projectId
      });
    } catch (e) {
      console.error('Failed to load calendar tasks:', e);
    } finally {
      isLoading = false;
    }
  }

  async function handleDrop(taskId: string, date: string) {
    try {
      await invoke('schedule_task', { taskId, scheduledDate: date });
      await loadTasks();
    } catch (e) {
      console.error('Failed to schedule task:', e);
    }
    draggedTask.set(null);
  }

  function previousMonth() {
    currentMonth.update(m => {
      if (m.month === 1) {
        return { year: m.year - 1, month: 12 };
      }
      return { year: m.year, month: m.month - 1 };
    });
  }

  function nextMonth() {
    currentMonth.update(m => {
      if (m.month === 12) {
        return { year: m.year + 1, month: 1 };
      }
      return { year: m.year, month: m.month + 1 };
    });
  }

  function goToToday() {
    const today = new Date();
    currentMonth.set({
      year: today.getFullYear(),
      month: today.getMonth() + 1
    });
  }

  $effect(() => {
    loadTasks();
  });

  $effect(() => {
    // Reload when month or project changes
    void $currentMonth;
    void projectId;
    loadTasks();
  });
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <button
        onclick={previousMonth}
        class="p-1 text-[#828282] hover:text-[#d6d6d6] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <h2 class="text-lg font-medium text-[#d6d6d6] min-w-[180px] text-center">
        {monthName} {$currentMonth.year}
      </h2>
      <button
        onclick={nextMonth}
        class="p-1 text-[#828282] hover:text-[#d6d6d6] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
    </div>
    <button
      onclick={goToToday}
      class="px-3 py-1 text-sm bg-[#232323] text-[#d6d6d6] border border-[#3d3a34] hover:bg-[#2a2a2a] transition-colors"
    >
      Hoje
    </button>
  </div>

  <!-- Week days header -->
  <div class="grid grid-cols-7 mb-1">
    {#each weekDays as day}
      <div class="text-center text-xs text-[#828282] py-1">{day}</div>
    {/each}
  </div>

  <!-- Calendar grid -->
  <div class="grid grid-cols-7 flex-1">
    {#each calendarDays as day (day.date)}
      <CalendarDay
        date={day.date}
        dayNumber={day.dayNumber}
        isCurrentMonth={day.isCurrentMonth}
        isToday={day.isToday}
        tasks={getTasksForDate(day.date)}
        onDrop={handleDrop}
      />
    {/each}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/agenda/Calendar.svelte
git commit -m "feat(ui): create Calendar component with month navigation"
```

---

## Phase 3: Unscheduled Panel

### Task 3.1: Create UnscheduledTask Component

**Files:**

- Create: `src/lib/components/agenda/UnscheduledTask.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import type { Task } from '$lib/types';
  import { draggedTask } from '$lib/stores/agenda';
  import { goto } from '$app/navigation';

  interface Props {
    task: Task;
  }

  let { task }: Props = $props();

  const priorityColors: Record<number, string> = {
    1: '#bc5653',
    2: '#ebc17a',
    3: '#909d63'
  };

  let priorityColor = $derived(priorityColors[task.priority] || '#909d63');
  let isDragging = $state(false);

  function handleDragStart(e: DragEvent) {
    isDragging = true;
    draggedTask.set({ id: task.id, title: task.title, fromDate: null });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
    }
  }

  function handleDragEnd() {
    isDragging = false;
    draggedTask.set(null);
  }

  function handleClick() {
    goto(`/tasks/${task.id}`);
  }

  function formatDueDate(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  let isOverdue = $derived(task.due_date ? new Date(task.due_date) < new Date() : false);
</script>

<div
  draggable="true"
  role="button"
  tabindex="0"
  class="flex items-center gap-2 px-2 py-1.5 bg-[#232323] border-l-3 cursor-grab transition-all hover:bg-[#2a2a2a]"
  class:opacity-50={isDragging}
  class:cursor-grabbing={isDragging}
  class:border-[#bc5653]={isOverdue}
  style:border-left-color={!isOverdue ? '#909d63' : undefined}
  style:border-left-width="3px"
  style:border-left-style="solid"
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <span class="flex-1 text-sm text-[#d6d6d6] truncate">{task.title}</span>
  {#if task.due_date}
    <span class="text-xs" class:text-[#bc5653]={isOverdue} class:text-[#636363]={!isOverdue}>
      {formatDueDate(task.due_date)}
    </span>
  {/if}
  <span style:color={priorityColor} class="text-xs font-medium">P{task.priority}</span>
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/agenda/UnscheduledTask.svelte
git commit -m "feat(ui): create UnscheduledTask draggable component"
```

---

### Task 3.2: Create UnscheduledPanel Component

**Files:**

- Create: `src/lib/components/agenda/UnscheduledPanel.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { Task, Project } from '$lib/types';
  import Select from '$lib/components/Select.svelte';
  import UnscheduledTask from './UnscheduledTask.svelte';
  import { draggedTask } from '$lib/stores/agenda';

  interface Props {
    projects: Project[];
    onTaskScheduled: () => void;
  }

  let { projects, onTaskScheduled }: Props = $props();

  let tasks: Task[] = $state([]);
  let isLoading = $state(true);
  let isDragOver = $state(false);

  let filterProject = $state<string>('');
  let filterCategory = $state<string>('');
  let filterPriority = $state<string>('');

  const categories = ['feature', 'bug', 'refactor', 'test', 'docs'];
  const priorities = [
    { value: '1', label: 'Alta' },
    { value: '2', label: 'Média' },
    { value: '3', label: 'Baixa' }
  ];

  async function loadTasks() {
    isLoading = true;
    try {
      tasks = await invoke('get_unscheduled_tasks', {
        projectId: filterProject || null,
        category: filterCategory || null,
        priority: filterPriority ? parseInt(filterPriority) : null
      });
    } catch (e) {
      console.error('Failed to load unscheduled tasks:', e);
    } finally {
      isLoading = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;

    if ($draggedTask && $draggedTask.fromDate) {
      try {
        await invoke('unschedule_task', { taskId: $draggedTask.id });
        await loadTasks();
        onTaskScheduled();
      } catch (e) {
        console.error('Failed to unschedule task:', e);
      }
    }
    draggedTask.set(null);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if ($draggedTask?.fromDate) {
      isDragOver = true;
    }
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function getProjectOptions() {
    return [
      { value: '', label: 'Todos projetos' },
      ...projects.map(p => ({ value: p.id, label: p.name }))
    ];
  }

  function getCategoryOptions() {
    return [
      { value: '', label: 'Categoria' },
      ...categories.map(c => ({ value: c, label: c }))
    ];
  }

  function getPriorityOptions() {
    return [
      { value: '', label: 'Prioridade' },
      ...priorities
    ];
  }

  $effect(() => {
    loadTasks();
  });

  $effect(() => {
    void filterProject;
    void filterCategory;
    void filterPriority;
    loadTasks();
  });

  export function refresh() {
    loadTasks();
  }
</script>

<div
  class="flex flex-col h-full border-r border-[#3d3a34] bg-[#1c1c1c]"
  class:bg-[#232323]={isDragOver}
  class:border-dashed={isDragOver}
  class:border-[#909d63]={isDragOver}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="Tarefas não agendadas"
>
  <!-- Header -->
  <div class="p-3 border-b border-[#3d3a34]">
    <h3 class="text-sm font-medium text-[#d6d6d6] mb-3">Não Agendadas</h3>

    <!-- Filters -->
    <div class="flex flex-col gap-2">
      <Select
        value={filterProject}
        options={getProjectOptions()}
        onchange={(v) => filterProject = v}
        class="w-full"
      />
      <div class="flex gap-2">
        <Select
          value={filterCategory}
          options={getCategoryOptions()}
          onchange={(v) => filterCategory = v}
          class="flex-1"
        />
        <Select
          value={filterPriority}
          options={getPriorityOptions()}
          onchange={(v) => filterPriority = v}
          class="flex-1"
        />
      </div>
    </div>
  </div>

  <!-- Tasks list -->
  <div class="flex-1 overflow-y-auto p-2">
    {#if isLoading}
      <div class="text-center text-[#636363] py-4 text-sm">Carregando...</div>
    {:else if tasks.length === 0}
      <div class="text-center text-[#636363] py-4 text-sm">
        {#if isDragOver}
          Solte para remover do calendário
        {:else}
          Todas as tarefas estão agendadas
        {/if}
      </div>
    {:else}
      <div class="flex flex-col gap-1">
        {#each tasks as task (task.id)}
          <UnscheduledTask {task} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- AI Distribution button -->
  <div class="p-3 border-t border-[#3d3a34]">
    <button
      disabled={tasks.length === 0}
      class="w-full px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm font-medium hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors"
    >
      Distribuir com IA
    </button>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/agenda/UnscheduledPanel.svelte
git commit -m "feat(ui): create UnscheduledPanel with filters and drag-drop"
```

---

## Phase 4: Day Drawer

### Task 4.1: Create DayTaskItem Component

**Files:**

- Create: `src/lib/components/agenda/DayTaskItem.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import type { Task } from '$lib/types';
  import { invoke } from '@tauri-apps/api/core';
  import { goto } from '$app/navigation';
  import { draggedTask, drawerCollapsed } from '$lib/stores/agenda';

  interface Props {
    task: Task;
    onStatusChange: () => void;
  }

  let { task, onStatusChange }: Props = $props();

  const priorityColors: Record<number, string> = {
    1: '#bc5653',
    2: '#ebc17a',
    3: '#909d63'
  };

  let priorityColor = $derived(priorityColors[task.priority] || '#909d63');
  let isDragging = $state(false);
  let isDone = $derived(task.status === 'done');

  async function toggleStatus(e: MouseEvent) {
    e.stopPropagation();
    const newStatus = isDone ? 'pending' : 'done';
    try {
      await invoke('update_task_status', { taskId: task.id, status: newStatus });
      onStatusChange();
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  }

  function handleDragStart(e: DragEvent) {
    isDragging = true;
    drawerCollapsed.set(true);
    draggedTask.set({ id: task.id, title: task.title, fromDate: task.scheduled_date });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
    }
  }

  function handleDragEnd() {
    isDragging = false;
    drawerCollapsed.set(false);
    draggedTask.set(null);
  }

  function handleClick() {
    goto(`/tasks/${task.id}`);
  }
</script>

<div
  draggable="true"
  role="button"
  tabindex="0"
  class="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] cursor-grab transition-all group"
  class:opacity-50={isDragging || isDone}
  class:cursor-grabbing={isDragging}
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <button
    onclick={toggleStatus}
    class="text-[#636363] hover:text-[#909d63] transition-colors"
  >
    {#if isDone}
      [x]
    {:else}
      [ ]
    {/if}
  </button>

  <span class="flex-1 text-sm text-[#d6d6d6] truncate" class:line-through={isDone}>
    {task.title}
  </span>

  <span class="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
  <span style:color={priorityColor} class="text-xs font-medium">P{task.priority}</span>
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/agenda/DayTaskItem.svelte
git commit -m "feat(ui): create DayTaskItem component with drag support"
```

---

### Task 4.2: Create DayDrawer Component

**Files:**

- Create: `src/lib/components/agenda/DayDrawer.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { Task } from '$lib/types';
  import { selectedDate, drawerCollapsed } from '$lib/stores/agenda';
  import DayTaskItem from './DayTaskItem.svelte';

  interface Props {
    onClose: () => void;
    onTaskChange: () => void;
  }

  let { onClose, onTaskChange }: Props = $props();

  let tasks: Task[] = $state([]);
  let isLoading = $state(true);

  let formattedDate = $derived(() => {
    if (!$selectedDate) return '';
    const date = new Date($selectedDate + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });

  async function loadTasks() {
    if (!$selectedDate) return;
    isLoading = true;
    try {
      tasks = await invoke('get_tasks_for_date', {
        date: $selectedDate,
        projectId: null
      });
    } catch (e) {
      console.error('Failed to load tasks for date:', e);
    } finally {
      isLoading = false;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('drawer-backdrop')) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleTaskChange() {
    loadTasks();
    onTaskChange();
  }

  $effect(() => {
    if ($selectedDate) {
      loadTasks();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $selectedDate && !$drawerCollapsed}
  <!-- Backdrop -->
  <button
    type="button"
    class="drawer-backdrop fixed inset-0 bg-black/50 z-40"
    onclick={handleClickOutside}
    aria-label="Fechar drawer"
  ></button>

  <!-- Drawer -->
  <div
    class="fixed top-0 right-0 h-full w-[400px] bg-[#1c1c1c] border-l border-[#3d3a34] z-50 flex flex-col shadow-xl animate-slide-in"
  >
    <!-- Header -->
    <div class="flex items-center gap-3 p-4 border-b border-[#3d3a34]">
      <button
        onclick={onClose}
        class="text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
        title="Fechar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <h2 class="text-base font-medium text-[#d6d6d6] capitalize">{formattedDate()}</h2>
    </div>

    <!-- Tasks list -->
    <div class="flex-1 overflow-y-auto p-3">
      {#if isLoading}
        <div class="text-center text-[#636363] py-8 text-sm">Carregando...</div>
      {:else if tasks.length === 0}
        <div class="text-center text-[#636363] py-8 text-sm">
          Nenhuma tarefa para este dia
        </div>
      {:else}
        <div class="flex flex-col gap-1">
          {#each tasks as task (task.id)}
            <DayTaskItem {task} onStatusChange={handleTaskChange} />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer hint -->
    <div class="p-3 border-t border-[#3d3a34] text-xs text-[#636363]">
      Arraste tarefas para reagendar • Clique para editar
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .animate-slide-in {
    animation: slide-in 0.2s ease-out;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/lib/components/agenda/DayDrawer.svelte
git commit -m "feat(ui): create DayDrawer overlay component"
```

---

## Phase 5: Agenda Page Integration

### Task 5.1: Update Agenda Page

**Files:**

- Modify: `src/routes/agenda/+page.svelte`

**Step 1: Replace placeholder with full implementation**

```svelte
<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import TabBar from '$lib/components/TabBar.svelte';
  import Calendar from '$lib/components/agenda/Calendar.svelte';
  import UnscheduledPanel from '$lib/components/agenda/UnscheduledPanel.svelte';
  import DayDrawer from '$lib/components/agenda/DayDrawer.svelte';
  import { selectedDate } from '$lib/stores/agenda';
  import type { Project } from '$lib/types';

  let projects: Project[] = $state([]);
  let calendarRef: Calendar | null = $state(null);
  let panelRef: UnscheduledPanel | null = $state(null);

  async function loadProjects() {
    try {
      projects = await invoke('get_projects');
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }

  function handleDrawerClose() {
    selectedDate.set(null);
  }

  function handleTaskScheduled() {
    // Refresh both calendar and panel
    panelRef?.refresh();
  }

  function handleTaskChange() {
    panelRef?.refresh();
  }

  $effect(() => {
    loadProjects();
  });
</script>

<TabBar />

<main class="flex-1 flex overflow-hidden">
  <!-- Unscheduled Panel (1/3) -->
  <div class="w-1/3 min-w-[280px] max-w-[360px]">
    <UnscheduledPanel
      bind:this={panelRef}
      {projects}
      onTaskScheduled={handleTaskScheduled}
    />
  </div>

  <!-- Calendar (2/3) -->
  <div class="flex-1 p-4 overflow-hidden">
    <Calendar bind:this={calendarRef} />
  </div>

  <!-- Day Drawer (overlay) -->
  <DayDrawer
    onClose={handleDrawerClose}
    onTaskChange={handleTaskChange}
  />
</main>
```

**Step 2: Verify no TypeScript errors**

Run: `npm run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/routes/agenda/+page.svelte
git commit -m "feat(agenda): implement full agenda page with calendar and panels"
```

---

### Task 5.2: Test Full Integration

**Step 1: Start the development server**

Run: `npm run dev`

**Step 2: Manual verification checklist**

- [ ] Agenda tab loads without errors
- [ ] Calendar shows current month
- [ ] Month navigation (< >) works
- [ ] "Hoje" button returns to current month
- [ ] Unscheduled panel shows tasks with filters
- [ ] Filters (project, category, priority) work
- [ ] Dragging task from panel to calendar schedules it
- [ ] Task chips appear on calendar days
- [ ] Clicking a day opens the drawer
- [ ] Drawer shows tasks for that day
- [ ] Clicking outside drawer closes it
- [ ] ESC key closes drawer
- [ ] Checkbox toggles task status
- [ ] Clicking task navigates to /tasks/[id]
- [ ] Dragging from drawer hides drawer temporarily
- [ ] Dropping on another day reschedules
- [ ] Dragging to panel unschedules task

**Step 3: Fix any issues found**

**Step 4: Commit if all tests pass**

```bash
git add -A
git commit -m "feat(agenda): complete Phase 1-5 integration"
```

---

## Phase 6: AI Distribution (Future)

### Task 6.1: Create AIDistributionModal Component

**Note:** This phase is marked for future implementation. The modal UI and AI integration will be built separately.

**Files to create:**

- `src/lib/components/agenda/AIDistributionModal.svelte`

**Features:**

- Period date picker (start → end)
- Task count summary
- "Gerar Distribuição" button with loading state
- Preview list of proposed schedule
- Warnings display
- "Aplicar" / "Cancelar" buttons

**Backend support needed:**

- `get_ai_distribution_prompt` command
- `apply_ai_distribution` command
- Integration with opencode for AI processing

---

## Summary

| Phase                 | Tasks   | Status |
| --------------------- | ------- | ------ |
| 1. Backend Foundation | 1.1-1.5 | Ready  |
| 2. Calendar Core      | 2.1-2.4 | Ready  |
| 3. Unscheduled Panel  | 3.1-3.2 | Ready  |
| 4. Day Drawer         | 4.1-4.2 | Ready  |
| 5. Page Integration   | 5.1-5.2 | Ready  |
| 6. AI Distribution    | 6.1     | Future |

**Total estimated implementation time:** 4-6 hours

**Key files created/modified:**

- Backend: `database.rs`, `commands.rs`, `task_json.rs`, `lib.rs`
- Frontend: 8 new components in `src/lib/components/agenda/`
- Store: `src/lib/stores/agenda.ts`
- Types: `src/lib/types.ts`
- Page: `src/routes/agenda/+page.svelte`
