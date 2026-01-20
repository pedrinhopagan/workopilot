# Subtasks System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace microtasks with a richer subtasks system that supports structured task breakdown, focused execution, and review workflow.

**Architecture:** Schema v2 replaces `microtasks[]` with `subtasks[]` containing optional rich fields. Tasks gain new status `awaiting_review` and `ai_metadata.structuring_complete` flag. Tmux workflow uses global `workopilot` session with project-prefixed tabs.

**Tech Stack:** Rust (Tauri backend), TypeScript/Svelte 5 (frontend), SQLite (metadata), JSON files (full task data)

---

## Task 1: Update Rust Structs (task_json.rs)

**Files:**
- Modify: `src-tauri/src/task_json.rs`

**Step 1: Define Subtask struct**

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub status: String,
    pub order: i32,
    
    // Optional fields
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub acceptance_criteria: Option<Vec<String>>,
    #[serde(default)]
    pub technical_notes: Option<String>,
    #[serde(default)]
    pub prompt_context: Option<String>,
    
    pub created_at: String,
    #[serde(default)]
    pub completed_at: Option<String>,
}
```

**Step 2: Update AIMetadata struct**

```rust
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AIMetadata {
    pub last_interaction: Option<String>,
    pub session_ids: Vec<String>,
    pub tokens_used: i64,
    #[serde(default)]
    pub structuring_complete: bool,
}
```

**Step 3: Update TaskFull struct**

Replace `microtasks` field with `subtasks`:

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct TaskFull {
    pub schema_version: i32,
    pub initialized: bool,
    pub id: String,
    pub title: String,
    pub status: String,  // Now supports: pending, in_progress, awaiting_review, done
    pub priority: i32,
    pub category: String,
    pub complexity: Option<String>,
    pub context: TaskContext,
    pub subtasks: Vec<Subtask>,  // Changed from microtasks
    pub ai_metadata: AIMetadata,
    pub timestamps: TaskTimestamps,
    #[serde(default)]
    pub modified_at: Option<String>,
    #[serde(default)]
    pub modified_by: Option<String>,
}
```

**Step 4: Update TaskFull::new() constructor**

```rust
impl TaskFull {
    pub fn new(id: String, title: String, priority: i32, category: String) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        TaskFull {
            schema_version: 2,
            initialized: false,
            id,
            title,
            status: "pending".to_string(),
            priority,
            category,
            complexity: None,
            context: TaskContext::default(),
            subtasks: vec![],
            ai_metadata: AIMetadata::default(),
            timestamps: TaskTimestamps {
                created_at: now.clone(),
                started_at: None,
                completed_at: None,
            },
            modified_at: Some(now),
            modified_by: Some("user".to_string()),
        }
    }
}
```

**Step 5: Add migration function**

```rust
pub fn migrate_v1_to_v2(task: &mut TaskFull) {
    if task.schema_version >= 2 {
        return;
    }
    
    // Note: In a real scenario, we'd need to handle the old microtasks field
    // For now, since subtasks replaces microtasks, we just update the version
    // The serde deserializer will handle missing fields with defaults
    
    task.schema_version = 2;
    task.ai_metadata.structuring_complete = true; // Assume existing tasks are structured
}
```

**Step 6: Update load_task_json to handle migration**

```rust
pub fn load_task_json(project_path: &str, task_id: &str) -> Result<TaskFull, String> {
    let path = get_task_json_path(project_path, task_id);
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read task JSON: {}", e))?;
    
    let mut task: TaskFull = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse task JSON: {}", e))?;
    
    // Migrate if needed
    if task.schema_version < 2 {
        migrate_v1_to_v2(&mut task);
        // Save migrated version
        save_task_json(project_path, &task)?;
    }
    
    Ok(task)
}
```

**Step 7: Remove old Microtask struct**

Delete the `Microtask` struct definition (it's replaced by `Subtask`).

**Step 8: Build and verify**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds with no errors

**Step 9: Commit**

```bash
git add src-tauri/src/task_json.rs
git commit -m "feat(backend): update task schema to v2 with subtasks"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add Subtask interface**

```typescript
export interface Subtask {
  id: string;
  title: string;
  status: string;  // pending | in_progress | done
  order: number;
  
  // Optional fields
  description: string | null;
  acceptance_criteria: string[] | null;
  technical_notes: string | null;
  prompt_context: string | null;
  
  created_at: string;
  completed_at: string | null;
}
```

**Step 2: Update AIMetadata interface**

```typescript
export interface AIMetadata {
  last_interaction: string | null;
  session_ids: string[];
  tokens_used: number;
  structuring_complete: boolean;
}
```

**Step 3: Update TaskFull interface**

Replace `microtasks` with `subtasks`:

```typescript
export interface TaskFull {
  schema_version: number;
  initialized: boolean;
  id: string;
  title: string;
  status: string;  // pending | in_progress | awaiting_review | done
  priority: number;
  category: string;
  complexity: string | null;
  context: TaskContext;
  subtasks: Subtask[];
  ai_metadata: AIMetadata;
  timestamps: TaskTimestamps;
  modified_at?: string | null;
  modified_by?: "user" | "ai" | null;
}
```

**Step 4: Remove old Microtask interface**

Delete the `Microtask` interface.

**Step 5: Update CalendarTask for subtask indicator**

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
  subtask_count: number;  // New field
  subtask_done_count: number;  // New field
}
```

**Step 6: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): update TypeScript interfaces for subtasks schema v2"
```

---

## Task 3: Create SubtaskItem Component

**Files:**
- Create: `src/lib/components/tasks/SubtaskItem.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import type { Subtask } from '$lib/types';
  
  interface Props {
    subtask: Subtask;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onCodar: (id: string) => void;
    onUpdate: (id: string, field: keyof Subtask, value: any) => void;
    expanded?: boolean;
    onToggleExpand: (id: string) => void;
  }
  
  let { subtask, onToggle, onRemove, onCodar, onUpdate, expanded = false, onToggleExpand }: Props = $props();
  
  let isDone = $derived(subtask.status === 'done');
  let hasDetails = $derived(
    subtask.description || 
    (subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0) ||
    subtask.technical_notes
  );
  
  let newCriteria = $state('');
  
  function addCriteria() {
    if (!newCriteria.trim()) return;
    const current = subtask.acceptance_criteria || [];
    onUpdate(subtask.id, 'acceptance_criteria', [...current, newCriteria.trim()]);
    newCriteria = '';
  }
  
  function removeCriteria(index: number) {
    const current = subtask.acceptance_criteria || [];
    const updated = current.filter((_, i) => i !== index);
    onUpdate(subtask.id, 'acceptance_criteria', updated.length > 0 ? updated : null);
  }
</script>

<div class="border border-[#3d3a34] bg-[#232323] {isDone ? 'opacity-50' : ''}">
  <div class="flex items-center gap-3 px-3 py-2 group">
    <button 
      onclick={() => onToggle(subtask.id)}
      class="transition-colors {isDone ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#909d63]'}"
    >
      {isDone ? '[x]' : '[ ]'}
    </button>
    
    <button
      onclick={() => onToggleExpand(subtask.id)}
      class="text-[#636363] hover:text-[#d6d6d6] transition-colors"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="12" 
        height="12" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
        class="transition-transform duration-200"
        style="transform: rotate({expanded ? 90 : 0}deg)"
      >
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
    
    <span class="flex-1 text-[#d6d6d6] text-sm {isDone ? 'line-through' : ''}">
      {subtask.title}
    </span>
    
    {#if hasDetails && !expanded}
      <span class="text-xs text-[#636363]">
        {#if subtask.acceptance_criteria?.length}({subtask.acceptance_criteria.length} criterios){/if}
      </span>
    {/if}
    
    <button
      onclick={() => onRemove(subtask.id)}
      class="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
      title="Remover subtask"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
    
    <button
      onclick={() => onCodar(subtask.id)}
      disabled={isDone}
      class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors"
    >
      Codar &gt;
    </button>
  </div>
  
  {#if expanded}
    <div class="px-4 py-3 border-t border-[#3d3a34] space-y-3 animate-slide-down">
      <div>
        <label class="block text-xs text-[#636363] mb-1">Descricao</label>
        <textarea
          value={subtask.description || ''}
          onblur={(e) => onUpdate(subtask.id, 'description', e.currentTarget.value || null)}
          placeholder="Descreva esta subtask..."
          rows="2"
          class="w-full px-2 py-1 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none"
        ></textarea>
      </div>
      
      <div>
        <label class="block text-xs text-[#636363] mb-1">Criterios de Aceite</label>
        <div class="space-y-1">
          {#each subtask.acceptance_criteria || [] as criteria, i}
            <div class="flex items-center gap-2 group/criteria">
              <span class="text-[#636363] text-xs">*</span>
              <span class="flex-1 text-[#d6d6d6] text-sm">{criteria}</span>
              <button
                onclick={() => removeCriteria(i)}
                class="opacity-0 group-hover/criteria:opacity-100 text-[#bc5653] text-xs"
              >x</button>
            </div>
          {/each}
          <div class="flex items-center gap-2">
            <span class="text-[#636363] text-xs">+</span>
            <input
              type="text"
              bind:value={newCriteria}
              onkeydown={(e) => e.key === 'Enter' && addCriteria()}
              placeholder="Adicionar criterio..."
              class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] placeholder:text-[#4a4a4a]"
            />
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-xs text-[#636363] mb-1">Notas Tecnicas</label>
        <textarea
          value={subtask.technical_notes || ''}
          onblur={(e) => onUpdate(subtask.id, 'technical_notes', e.currentTarget.value || null)}
          placeholder="Stack, libs, padroes..."
          rows="2"
          class="w-full px-2 py-1 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none"
        ></textarea>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-down {
    animation: slide-down 0.2s ease-out;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/lib/components/tasks/SubtaskItem.svelte
git commit -m "feat(ui): create SubtaskItem component with expandable details"
```

---

## Task 4: Create SubtaskList Component

**Files:**
- Create: `src/lib/components/tasks/SubtaskList.svelte`

**Step 1: Create the component**

```svelte
<script lang="ts">
  import type { Subtask } from '$lib/types';
  import SubtaskItem from './SubtaskItem.svelte';
  
  interface Props {
    subtasks: Subtask[];
    onAdd: (title: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onCodar: (id: string) => void;
    onUpdate: (id: string, field: keyof Subtask, value: any) => void;
    onReorder: (subtasks: Subtask[]) => void;
  }
  
  let { subtasks, onAdd, onToggle, onRemove, onCodar, onUpdate, onReorder }: Props = $props();
  
  let newTitle = $state('');
  let expandedIds = $state<Set<string>>(new Set());
  
  function handleAdd() {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    newTitle = '';
  }
  
  function toggleExpand(id: string) {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedIds = newSet;
  }
  
  function moveUp(index: number) {
    if (index === 0) return;
    const newList = [...subtasks];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    // Update order field
    newList.forEach((s, i) => s.order = i);
    onReorder(newList);
  }
  
  function moveDown(index: number) {
    if (index === subtasks.length - 1) return;
    const newList = [...subtasks];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    newList.forEach((s, i) => s.order = i);
    onReorder(newList);
  }
  
  let pendingCount = $derived(subtasks.filter(s => s.status !== 'done').length);
  let doneCount = $derived(subtasks.filter(s => s.status === 'done').length);
  let sortedSubtasks = $derived([...subtasks].sort((a, b) => a.order - b.order));
</script>

<section>
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs text-[#828282] uppercase tracking-wide">Subtasks</span>
    {#if subtasks.length > 0}
      <span class="text-xs text-[#636363]">
        {doneCount}/{subtasks.length} concluidas
      </span>
    {/if}
  </div>
  
  {#if subtasks.length > 0}
    <div class="space-y-2 mb-3">
      {#each sortedSubtasks as subtask, index (subtask.id)}
        <div class="flex gap-1">
          <div class="flex flex-col justify-center gap-0.5">
            <button
              onclick={() => moveUp(index)}
              disabled={index === 0}
              class="text-[#636363] hover:text-[#d6d6d6] disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m18 15-6-6-6 6"/>
              </svg>
            </button>
            <button
              onclick={() => moveDown(index)}
              disabled={index === subtasks.length - 1}
              class="text-[#636363] hover:text-[#d6d6d6] disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>
          <div class="flex-1">
            <SubtaskItem 
              {subtask} 
              {onToggle} 
              {onRemove} 
              {onCodar}
              {onUpdate}
              expanded={expandedIds.has(subtask.id)}
              onToggleExpand={toggleExpand}
            />
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-sm text-[#636363] py-4 text-center border border-dashed border-[#3d3a34] bg-[#1c1c1c] mb-3">
      Nenhuma subtask ainda
    </div>
  {/if}
  
  <div class="flex items-center gap-2">
    <span class="text-[#636363]">+</span>
    <input
      type="text"
      bind:value={newTitle}
      onkeydown={(e) => e.key === 'Enter' && handleAdd()}
      placeholder="Adicionar subtask..."
      class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a]"
    />
    <button
      onclick={handleAdd}
      disabled={!newTitle.trim()}
      class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Adicionar
    </button>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add src/lib/components/tasks/SubtaskList.svelte
git commit -m "feat(ui): create SubtaskList component with reordering support"
```

---

## Task 5: Update Task Detail Page

**Files:**
- Modify: `src/routes/tasks/[id]/+page.svelte`

**Step 1: Update imports**

Replace MicrotaskList import:

```typescript
import SubtaskList from '$lib/components/tasks/SubtaskList.svelte';
import type { Task, TaskFull, ProjectWithConfig, Subtask, TaskUpdatedPayload } from '$lib/types';
```

**Step 2: Update subtask handler functions**

Replace microtask functions with subtask equivalents:

```typescript
function addSubtask(title: string) {
  if (!taskFull) return;
  const newSubtask: Subtask = {
    id: crypto.randomUUID(),
    title,
    status: 'pending',
    order: taskFull.subtasks.length,
    description: null,
    acceptance_criteria: null,
    technical_notes: null,
    prompt_context: null,
    created_at: new Date().toISOString(),
    completed_at: null
  };
  const newList = [...taskFull.subtasks, newSubtask];
  updateField('subtasks', newList);
}

function toggleSubtask(id: string) {
  if (!taskFull) return;
  const newList = taskFull.subtasks.map(s => {
    if (s.id === id) {
      const newStatus = s.status === 'done' ? 'pending' : 'done';
      return {
        ...s,
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      };
    }
    return s;
  });
  updateField('subtasks', newList);
  
  // Check if all subtasks done -> suggest review
  const allDone = newList.every(s => s.status === 'done');
  if (allDone && newList.length > 0 && taskFull.status !== 'done') {
    updateField('status', 'awaiting_review');
  }
}

function removeSubtask(id: string) {
  if (!taskFull) return;
  const newList = taskFull.subtasks.filter(s => s.id !== id);
  // Reorder
  newList.forEach((s, i) => s.order = i);
  updateField('subtasks', newList);
}

function updateSubtask(id: string, field: keyof Subtask, value: any) {
  if (!taskFull) return;
  const newList = taskFull.subtasks.map(s => {
    if (s.id === id) {
      return { ...s, [field]: value };
    }
    return s;
  });
  updateField('subtasks', newList);
}

function reorderSubtasks(newList: Subtask[]) {
  if (!taskFull) return;
  updateField('subtasks', newList);
}

async function codarSubtask(id: string) {
  if (!task?.project_id) return;
  try {
    await invoke('launch_task_workflow', {
      projectId: task.project_id,
      taskId: task.id,
      subtaskId: id
    });
  } catch (e) {
    console.error('Failed to launch subtask workflow:', e);
  }
}
```

**Step 3: Add review button logic**

```typescript
let showReviewButton = $derived(
  taskFull && 
  taskFull.subtasks.length > 0 && 
  (taskFull.status === 'awaiting_review' || taskFull.subtasks.every(s => s.status === 'done'))
);

let reviewButtonHighlighted = $derived(
  taskFull?.status === 'awaiting_review' || 
  (taskFull?.subtasks.every(s => s.status === 'done') && taskFull?.subtasks.length > 0)
);

async function reviewTask() {
  if (!task?.project_id) return;
  try {
    await invoke('launch_task_review', {
      projectId: task.project_id,
      taskId: task.id
    });
  } catch (e) {
    console.error('Failed to launch task review:', e);
  }
}
```

**Step 4: Update template**

Replace MicrotaskList with SubtaskList in template:

```svelte
<SubtaskList
  subtasks={taskFull.subtasks}
  onAdd={addSubtask}
  onToggle={toggleSubtask}
  onRemove={removeSubtask}
  onCodar={codarSubtask}
  onUpdate={updateSubtask}
  onReorder={reorderSubtasks}
/>
```

**Step 5: Add Review button to header**

After the "Codar" button:

```svelte
{#if showReviewButton}
  <button
    onclick={reviewTask}
    class="px-4 py-1.5 text-sm transition-colors {reviewButtonHighlighted ? 'bg-[#ebc17a] text-[#1c1c1c] hover:bg-[#f5d08a]' : 'bg-[#3d3a34] text-[#d6d6d6] hover:bg-[#4a4a4a]'}"
  >
    Revisar
  </button>
{/if}
```

**Step 6: Commit**

```bash
git add src/routes/tasks/[id]/+page.svelte
git commit -m "feat(ui): update task detail page to use subtasks with review button"
```

---

## Task 6: Update Tasks List Page

**Files:**
- Modify: `src/routes/tasks/+page.svelte`

**Step 1: Add subtask display to task items**

Update the pending tasks section to show subtasks:

```svelte
{#each pendingTasks as task}
  {@const taskSubtasks = getSubtasksForTask(task.id)}
  {@const doneSubtasks = taskSubtasks.filter(s => s.status === 'done').length}
  
  <div class="bg-[#232323] hover:bg-[#2a2a2a] transition-colors group">
    <div 
      onclick={() => editTask(task.id)}
      class="flex items-center gap-3 px-3 py-2 cursor-pointer"
    >
      <button 
        onclick={(e) => { e.stopPropagation(); toggleTask(task.id, task.status); }}
        class="text-[#636363] hover:text-[#909d63] transition-colors"
      >
        [ ]
      </button>
      <span class="flex-1 text-[#d6d6d6] text-sm">{task.title}</span>
      
      {#if taskSubtasks.length > 0}
        <span class="text-xs text-[#636363]">{doneSubtasks}/{taskSubtasks.length}</span>
      {/if}
      
      <span class="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
      <span class="px-2 py-0.5 text-xs text-[#1c1c1c] {getPriorityClass(task.priority)}">P{task.priority}</span>
      
      <!-- Delete button -->
      <button
        onclick={(e) => handleDeleteClick(e, task.id)}
        class="opacity-0 group-hover:opacity-100 p-1 transition-all {deleteConfirmId === task.id ? 'text-[#bc5653]' : 'text-[#636363] hover:text-[#bc5653]'}"
      >
        <!-- ... existing delete icon ... -->
      </button>
      
      <!-- Review button (highlighted if awaiting) -->
      {#if taskSubtasks.length > 0 && taskSubtasks.every(s => s.status === 'done')}
        <button
          onclick={(e) => { e.stopPropagation(); reviewTask(task); }}
          class="px-3 py-1 text-xs bg-[#ebc17a] text-[#1c1c1c] hover:bg-[#f5d08a] transition-colors"
        >
          Revisar
        </button>
      {/if}
      
      <button
        onclick={(e) => { e.stopPropagation(); codarTask(task); }}
        class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] transition-colors"
      >
        Codar &gt;
      </button>
    </div>
    
    <!-- Subtasks list -->
    {#if taskSubtasks.length > 0}
      <div class="pl-8 pr-3 pb-2 space-y-1">
        {#each taskSubtasks as subtask}
          <div class="flex items-center gap-2 text-sm {subtask.status === 'done' ? 'opacity-50' : ''}">
            <button 
              onclick={() => toggleSubtaskInList(task.id, subtask.id)}
              class="text-xs {subtask.status === 'done' ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#909d63]'}"
            >
              {subtask.status === 'done' ? '[x]' : '[ ]'}
            </button>
            <span class="text-[#d6d6d6] {subtask.status === 'done' ? 'line-through' : ''}">{subtask.title}</span>
            <button
              onclick={(e) => { e.stopPropagation(); codarSubtaskInList(task, subtask.id); }}
              disabled={subtask.status === 'done'}
              class="ml-auto px-2 py-0.5 text-xs bg-[#3d3a34] text-[#d6d6d6] hover:bg-[#4a4a4a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Codar &gt;
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/each}
```

**Step 2: Add helper functions**

```typescript
let taskFullCache = $state<Map<string, TaskFull>>(new Map());

async function loadTaskFull(taskId: string, projectPath: string): Promise<TaskFull | null> {
  try {
    const full: TaskFull = await invoke('get_task_full', { projectPath, taskId });
    taskFullCache.set(taskId, full);
    return full;
  } catch {
    return null;
  }
}

function getSubtasksForTask(taskId: string): Subtask[] {
  return taskFullCache.get(taskId)?.subtasks || [];
}

async function toggleSubtaskInList(taskId: string, subtaskId: string) {
  const taskFull = taskFullCache.get(taskId);
  if (!taskFull) return;
  
  const task = tasks.find(t => t.id === taskId);
  if (!task?.project_id) return;
  
  const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
  
  const newSubtasks = taskFull.subtasks.map(s => {
    if (s.id === subtaskId) {
      const newStatus = s.status === 'done' ? 'pending' : 'done';
      return { ...s, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null };
    }
    return s;
  });
  
  const updatedTask = { ...taskFull, subtasks: newSubtasks, modified_at: new Date().toISOString(), modified_by: 'user' as const };
  
  // Check if all done -> update status
  if (newSubtasks.every(s => s.status === 'done') && newSubtasks.length > 0) {
    updatedTask.status = 'awaiting_review';
  }
  
  await invoke('update_task_and_sync', { projectPath: project.path, task: updatedTask });
  taskFullCache.set(taskId, updatedTask);
}

async function codarSubtaskInList(task: Task, subtaskId: string) {
  if (!task.project_id) return;
  await invoke('launch_task_workflow', {
    projectId: task.project_id,
    taskId: task.id,
    subtaskId
  });
}

async function reviewTask(task: Task) {
  if (!task.project_id) return;
  await invoke('launch_task_review', {
    projectId: task.project_id,
    taskId: task.id
  });
}

// Load task fulls for all tasks
async function loadAllTaskFulls() {
  for (const task of tasks) {
    if (task.project_id && task.json_path) {
      const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
      await loadTaskFull(task.id, project.path);
    }
  }
}

$effect(() => {
  if (tasks.length > 0) {
    loadAllTaskFulls();
  }
});
```

**Step 3: Commit**

```bash
git add src/routes/tasks/+page.svelte
git commit -m "feat(ui): display subtasks in tasks list with inline toggle and codar"
```

---

## Task 7: Update Backend Commands for Subtasks

**Files:**
- Modify: `src-tauri/src/commands.rs`

**Step 1: Update launch_task_workflow to accept subtaskId**

Replace `microtask_id` parameter:

```rust
#[tauri::command]
pub fn launch_task_workflow(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
    subtask_id: Option<String>,
) -> Result<(), String> {
    // ... existing setup code ...
    
    let task_json_path = format!(".workopilot/tasks/{}.json", task_id);
    
    // Load task to check structuring_complete
    let project = db.get_project_with_config(&project_id).map_err(|e| e.to_string())?;
    let task_full = load_task_json(&project.path, &task_id)?;
    
    let initial_prompt = if let Some(st_id) = subtask_id {
        format!(
            "Usar skill workopilot-task para executar a subtask {} da task em {}",
            st_id, task_json_path
        )
    } else if !task_full.ai_metadata.structuring_complete {
        format!(
            "Usar skill workopilot-task para estruturar a task em {}",
            task_json_path
        )
    } else {
        format!(
            "Usar skill workopilot-task para a task em {}",
            task_json_path
        )
    };
    
    // ... rest of tmux script generation ...
}
```

**Step 2: Add launch_task_review command**

```rust
#[tauri::command]
pub fn launch_task_review(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db.get_project_with_config(&project_id).map_err(|e| e.to_string())?;
    
    // Copy skill file
    let skill_source = app_handle
        .path()
        .resource_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("resources")
        .join("opencode-skill")
        .join("workopilot-task.md");
    
    let skill_dest_dir = std::path::Path::new(&project.path)
        .join(".opencode")
        .join("skills");
    
    std::fs::create_dir_all(&skill_dest_dir)
        .map_err(|e| format!("Failed to create skills directory: {}", e))?;
    
    let skill_dest = skill_dest_dir.join("workopilot-task.md");
    std::fs::copy(&skill_source, &skill_dest)
        .map_err(|e| format!("Failed to copy skill: {}", e))?;
    
    let task_json_path = format!(".workopilot/tasks/{}.json", task_id);
    let initial_prompt = format!(
        "Usar skill workopilot-task para REVISAR a task em {}",
        task_json_path
    );
    
    // Generate tmux script using global workopilot session
    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id)
}
```

**Step 3: Create helper function for workopilot session**

```rust
fn launch_in_workopilot_session(
    app_handle: &tauri::AppHandle,
    project: &ProjectWithConfig,
    initial_prompt: &str,
    task_id: &str,
) -> Result<(), String> {
    let session_name = "workopilot";
    let tab_name = format!("{} - {}...", 
        &project.name,
        if task_id.len() > 15 { &task_id[..15] } else { task_id }
    );
    
    let first_route = project.routes.first().ok_or("No routes configured")?;
    let project_path = &first_route.path;
    
    let escaped_prompt = initial_prompt.replace('\\', "\\\\").replace('"', "\\\"");
    
    let script = format!(
        r#"#!/usr/bin/env bash
SESSION="{session_name}"
TAB_NAME="{tab_name}"
PROJECT_PATH="{project_path}"
PROMPT="{escaped_prompt}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    # Session exists, create new window
    tmux new-window -t "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
    tmux send-keys -t "$SESSION:$TAB_NAME" "opencode" Enter
    sleep 2
    tmux send-keys -t "$SESSION:$TAB_NAME" "$PROMPT" Enter
    tmux select-window -t "$SESSION:$TAB_NAME"
    tmux attach-session -t "$SESSION"
else
    # Create new session
    tmux new-session -d -s "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
    tmux send-keys -t "$SESSION:$TAB_NAME" "opencode" Enter
    sleep 2
    tmux send-keys -t "$SESSION:$TAB_NAME" "$PROMPT" Enter
    tmux attach-session -t "$SESSION"
fi
"#
    );
    
    Command::new("alacritty")
        .arg("-e")
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("Failed to launch tmux: {}", e))?;
    
    Ok(())
}
```

**Step 4: Register new command in lib.rs**

Add `launch_task_review` to the invoke_handler.

**Step 5: Build and test**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(backend): add subtask workflow and review commands with global tmux session"
```

---

## Task 8: Update Agenda Components

**Files:**
- Modify: `src/lib/components/agenda/TaskChip.svelte`
- Modify: `src/lib/components/agenda/DayDrawer.svelte`

**Step 1: Update TaskChip to show subtask count**

```svelte
<script lang="ts">
  import type { CalendarTask } from '$lib/types';
  
  interface Props {
    task: CalendarTask;
    compact?: boolean;
  }
  
  let { task, compact = false }: Props = $props();
  
  // ... existing code ...
</script>

<div class="...existing classes...">
  <!-- existing content -->
  
  {#if task.subtask_count > 0}
    <span class="text-[10px] text-[#636363]">
      +{task.subtask_count} subtasks
    </span>
  {/if}
</div>
```

**Step 2: Update DayDrawer to show subtasks**

Add subtask display similar to tasks list page:

```svelte
{#each dayTasks as task}
  {@const taskFull = taskFullCache.get(task.id)}
  
  <div class="bg-[#232323]">
    <div class="flex items-center gap-3 px-3 py-2">
      <!-- existing task item content -->
    </div>
    
    {#if taskFull?.subtasks.length}
      <div class="pl-8 pr-3 pb-2 space-y-1 border-t border-[#3d3a34]">
        {#each taskFull.subtasks as subtask}
          <div class="flex items-center gap-2 text-sm {subtask.status === 'done' ? 'opacity-50' : ''}">
            <button 
              onclick={() => toggleSubtask(task.id, subtask.id)}
              class="text-xs {subtask.status === 'done' ? 'text-[#909d63]' : 'text-[#636363]'}"
            >
              {subtask.status === 'done' ? '[x]' : '[ ]'}
            </button>
            <span class="text-[#d6d6d6] {subtask.status === 'done' ? 'line-through' : ''}">{subtask.title}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/each}
```

**Step 3: Commit**

```bash
git add src/lib/components/agenda/TaskChip.svelte src/lib/components/agenda/DayDrawer.svelte
git commit -m "feat(ui): show subtasks in agenda calendar and day drawer"
```

---

## Task 9: Update Backend for CalendarTask Subtask Count

**Files:**
- Modify: `src-tauri/src/database.rs`
- Modify: `src-tauri/src/commands.rs`

**Step 1: Update CalendarTask struct**

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
    pub subtask_count: i32,
    pub subtask_done_count: i32,
}
```

**Step 2: Update get_tasks_for_month to load subtask counts**

This requires loading the JSON file for each task to count subtasks. For performance, we can add a command that enriches the calendar tasks with subtask info:

```rust
#[tauri::command]
pub fn enrich_calendar_tasks(
    tasks: Vec<CalendarTask>,
    project_path: String,
) -> Result<Vec<CalendarTask>, String> {
    let mut enriched = vec![];
    
    for mut task in tasks {
        if let Ok(task_full) = load_task_json(&project_path, &task.id) {
            task.subtask_count = task_full.subtasks.len() as i32;
            task.subtask_done_count = task_full.subtasks.iter()
                .filter(|s| s.status == "done")
                .count() as i32;
        }
        enriched.push(task);
    }
    
    Ok(enriched)
}
```

**Step 3: Commit**

```bash
git add src-tauri/src/database.rs src-tauri/src/commands.rs
git commit -m "feat(backend): add subtask count to calendar tasks"
```

---

## Task 10: Remove Old Microtask Components

**Files:**
- Delete: `src/lib/components/tasks/MicrotaskList.svelte`
- Delete: `src/lib/components/tasks/MicrotaskItem.svelte`

**Step 1: Delete files**

```bash
rm src/lib/components/tasks/MicrotaskList.svelte
rm src/lib/components/tasks/MicrotaskItem.svelte
```

**Step 2: Commit**

```bash
git add -u
git commit -m "chore: remove deprecated microtask components"
```

---

## Task 11: Update OpenCode Skill File

**Files:**
- Modify: `src-tauri/resources/opencode-skill/workopilot-task.md`

**Step 1: Update skill with new prompts**

Create/update the skill file with prompts for:
- Structuring (when structuring_complete = false)
- Execution (task or subtask)
- Review

The skill should handle reading the JSON, determining the mode, and acting accordingly.

**Step 2: Commit**

```bash
git add src-tauri/resources/opencode-skill/workopilot-task.md
git commit -m "feat(skill): update workopilot-task skill for subtasks workflow"
```

---

## Task 12: Final Integration Test

**Step 1: Build full project**

```bash
cd src-tauri && cargo build
cd .. && npm run build
```

**Step 2: Test manually**

1. Create a new task
2. Click "Codar" - verify structuring flow starts
3. After structuring, verify subtasks appear
4. Toggle subtask status
5. Click "Codar" on specific subtask
6. When all done, click "Revisar"
7. Verify tmux session management works

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete subtasks system implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Rust structs for schema v2 | task_json.rs |
| 2 | TypeScript types | types.ts |
| 3 | SubtaskItem component | SubtaskItem.svelte |
| 4 | SubtaskList component | SubtaskList.svelte |
| 5 | Task detail page | /tasks/[id]/+page.svelte |
| 6 | Tasks list page | /tasks/+page.svelte |
| 7 | Backend commands | commands.rs, lib.rs |
| 8 | Agenda components | TaskChip, DayDrawer |
| 9 | CalendarTask subtask count | database.rs, commands.rs |
| 10 | Remove old components | MicrotaskList, MicrotaskItem |
| 11 | OpenCode skill | workopilot-task.md |
| 12 | Integration test | - |
