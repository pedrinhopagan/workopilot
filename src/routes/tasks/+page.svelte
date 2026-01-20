<script lang="ts">
  import Select from '$lib/components/Select.svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from '$app/navigation';
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { onDestroy } from 'svelte';
  import { selectedProjectId, projectsList } from '$lib/stores/selectedProject';
  import type { Task, TaskFull, ProjectWithConfig, Subtask, TaskUpdatedPayload, TaskExecution } from '$lib/types';
  
  let tasks: Task[] = $state([]);
  let projectPath: string | null = $state(null);
  let deleteConfirmId: string | null = $state(null);
  let taskFullCache = $state<Map<string, TaskFull>>(new Map());
  let activeExecutions = $state<Map<string, TaskExecution>>(new Map());
  let unlisten: UnlistenFn | null = null;
  let unlistenExecution: UnlistenFn | null = null;
  
  let newTaskTitle = $state('');
  let newTaskPriority = $state(2);
  let newTaskCategory = $state('feature');
  
  const categories = ['feature', 'bug', 'refactor', 'test', 'docs'];
  const priorities = [
    { value: 1, label: 'Alta', color: 'bg-[#bc5653]' },
    { value: 2, label: 'Média', color: 'bg-[#ebc17a]' },
    { value: 3, label: 'Baixa', color: 'bg-[#8b7355]' }
  ];
  
  let filteredTasks = $derived(
    $selectedProjectId 
      ? tasks.filter(t => t.project_id === $selectedProjectId)
      : tasks
  );
  
  let sortedPendingTasks = $derived(() => {
    const pending = filteredTasks.filter(t => t.status !== 'done');
    return pending.sort((a, b) => {
      const aExecuting = activeExecutions.has(a.id);
      const bExecuting = activeExecutions.has(b.id);
      if (aExecuting && !bExecuting) return -1;
      if (!aExecuting && bExecuting) return 1;
      return 0;
    });
  });
  
  let pendingTasks = $derived(sortedPendingTasks());
  let doneTasks = $derived(filteredTasks.filter(t => t.status === 'done'));
  
  function isTaskExecuting(taskId: string): boolean {
    return activeExecutions.has(taskId);
  }
  
  function getTaskExecution(taskId: string): TaskExecution | undefined {
    return activeExecutions.get(taskId);
  }
  
  async function loadTasks() {
    try {
      tasks = await invoke('get_tasks');
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  }
  
  async function loadActiveExecutions() {
    try {
      const executions: TaskExecution[] = await invoke('get_all_active_executions');
      const newMap = new Map<string, TaskExecution>();
      for (const exec of executions) {
        newMap.set(exec.task_id, exec);
      }
      activeExecutions = newMap;
    } catch (e) {
      console.error('Failed to load active executions:', e);
    }
  }
  
  async function loadTaskFull(taskId: string, projectPathArg: string): Promise<TaskFull | null> {
    try {
      const full: TaskFull = await invoke('get_task_full', { projectPath: projectPathArg, taskId });
      taskFullCache.set(taskId, full);
      taskFullCache = new Map(taskFullCache);
      return full;
    } catch {
      return null;
    }
  }
  
  function getSubtasksForTask(taskId: string): Subtask[] {
    return taskFullCache.get(taskId)?.subtasks || [];
  }
  
  async function loadAllTaskFulls() {
    for (const task of tasks) {
      if (task.project_id && task.json_path) {
        try {
          const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
          await loadTaskFull(task.id, project.path);
        } catch (e) {
          console.error('Failed to load task full:', e);
        }
      }
    }
  }
  
  async function loadProjectPath() {
    if (!$selectedProjectId) {
      projectPath = null;
      return;
    }
    try {
      const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: $selectedProjectId });
      projectPath = project.path;
    } catch (e) {
      console.error('Failed to load project path:', e);
    }
  }
  
  async function addTask() {
    if (!newTaskTitle.trim() || !$selectedProjectId || !projectPath) return;
    
    try {
      await invoke('create_task_with_json', {
        projectId: $selectedProjectId,
        projectPath: projectPath,
        title: newTaskTitle,
        priority: newTaskPriority,
        category: newTaskCategory
      });
      newTaskTitle = '';
      await loadTasks();
    } catch (e) {
      console.error('Failed to add task:', e);
    }
  }
  
  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await invoke('update_task_status', { taskId, status: newStatus });
      await loadTasks();
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  }
  
  function editTask(taskId: string) {
    goto(`/tasks/${taskId}`);
  }
  
  async function codarTask(task: Task) {
    if (!task.project_id) return;
    try {
      await invoke('launch_task_workflow', {
        projectId: task.project_id,
        taskId: task.id,
        subtaskId: null
      });
    } catch (e) {
      console.error('Failed to launch task workflow:', e);
    }
  }
  
  async function toggleSubtaskInList(taskId: string, subtaskId: string) {
    const taskFull = taskFullCache.get(taskId);
    if (!taskFull) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task?.project_id) return;
    
    try {
      const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
      
      const newSubtasks = taskFull.subtasks.map(s => {
        if (s.id === subtaskId) {
          const newStatus = s.status === 'done' ? 'pending' : 'done';
          return { ...s, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null };
        }
        return s;
      });
      
      const updatedTask: TaskFull = { 
        ...taskFull, 
        subtasks: newSubtasks, 
        modified_at: new Date().toISOString(), 
        modified_by: 'user' 
      };
      
      // Check if all done -> update status
      if (newSubtasks.every(s => s.status === 'done') && newSubtasks.length > 0) {
        updatedTask.status = 'awaiting_review';
      }
      
      await invoke('update_task_and_sync', { projectPath: project.path, task: updatedTask });
      taskFullCache.set(taskId, updatedTask);
      taskFullCache = new Map(taskFullCache);
      await loadTasks();
    } catch (e) {
      console.error('Failed to toggle subtask:', e);
    }
  }
  
  async function codarSubtaskInList(task: Task, subtaskId: string) {
    if (!task.project_id) return;
    try {
      await invoke('launch_task_workflow', {
        projectId: task.project_id,
        taskId: task.id,
        subtaskId
      });
    } catch (e) {
      console.error('Failed to launch subtask workflow:', e);
    }
  }
  
  async function reviewTask(task: Task) {
    if (!task.project_id) return;
    try {
      await invoke('launch_task_review', {
        projectId: task.project_id,
        taskId: task.id
      });
    } catch (e) {
      console.error('Failed to launch task review:', e);
    }
  }
  
  function handleDeleteClick(e: MouseEvent, taskId: string) {
    e.stopPropagation();
    if (deleteConfirmId === taskId) {
      deleteTask(taskId);
    } else {
      deleteConfirmId = taskId;
      setTimeout(() => {
        if (deleteConfirmId === taskId) {
          deleteConfirmId = null;
        }
      }, 3000);
    }
  }
  
  async function deleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.project_id) return;
    
    try {
      const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
      await invoke('delete_task_full', {
        projectPath: project.path,
        taskId
      });
      deleteConfirmId = null;
      await loadTasks();
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  }
  
  function getPriorityClass(priority: number): string {
    const p = priorities.find(pr => pr.value === priority);
    return p?.color || 'bg-[#8b7355]';
  }
  
  function getCategoryOptions() {
    return categories.map(c => ({ value: c, label: c }));
  }
  
  function getPriorityOptions() {
    return priorities.map(p => ({ value: String(p.value), label: p.label }));
  }
  
  async function setupEventListener() {
    unlisten = await listen<TaskUpdatedPayload>('task-updated', async (event) => {
      if (event.payload.source === 'ai') {
        console.log('[WorkoPilot] Task updated by AI, reloading and syncing...');
        const taskId = event.payload.task_id;
        const task = tasks.find(t => t.id === taskId);
        if (task?.project_id) {
          try {
            const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
            const taskFull: TaskFull = await invoke('get_task_full', { projectPath: project.path, taskId });
            await invoke('update_task_and_sync', { projectPath: project.path, task: taskFull });
            console.log('[WorkoPilot] Task synced to database');
            taskFullCache.set(taskId, taskFull);
            taskFullCache = new Map(taskFullCache);
            await loadTasks();
          } catch (e) {
            console.error('[WorkoPilot] Failed to sync task:', e);
          }
        }
      }
    });
    
    unlistenExecution = await listen('execution-changed', async () => {
      console.log('[WorkoPilot] Execution state changed, reloading...');
      await loadActiveExecutions();
    });
  }
  
  onDestroy(() => {
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
    if (unlistenExecution) {
      unlistenExecution();
      unlistenExecution = null;
    }
  });
  
  $effect(() => {
    loadTasks();
    loadActiveExecutions();
    setupEventListener();
  });
  
  $effect(() => {
    loadProjectPath();
  });
  
  $effect(() => {
    if (tasks.length > 0) {
      loadAllTaskFulls();
    }
  });
</script>

<div class="flex items-center gap-2 p-3 border-b border-[#3d3a34]">
  <input 
    type="text" 
    placeholder="Nova tarefa..."
    bind:value={newTaskTitle}
    onkeydown={(e) => e.key === 'Enter' && addTask()}
    disabled={!$selectedProjectId}
    class="flex-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none disabled:opacity-50"
  />
  <Select
    value={newTaskCategory}
    options={getCategoryOptions()}
    onchange={(v) => newTaskCategory = v}
  />
  <Select
    value={String(newTaskPriority)}
    options={getPriorityOptions()}
    onchange={(v) => newTaskPriority = parseInt(v)}
  />
  <button 
    onclick={addTask}
    disabled={!$selectedProjectId || !newTaskTitle.trim()}
    class="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    Adicionar
  </button>
</div>

<div class="flex-1 overflow-y-auto p-3">
  {#if !$selectedProjectId && $projectsList.length > 0}
    <div class="text-center text-[#636363] py-8">
      Selecione um projeto para adicionar tarefas
    </div>
  {/if}
  
  {#if pendingTasks.length > 0}
    <div class="space-y-1">
      {#each pendingTasks as task}
        {@const taskSubtasks = getSubtasksForTask(task.id)}
        {@const doneSubtasks = taskSubtasks.filter(s => s.status === 'done').length}
        {@const executing = isTaskExecuting(task.id)}
        {@const execution = getTaskExecution(task.id)}
        
        <div class="bg-[#232323] hover:bg-[#2a2a2a] transition-colors group {executing ? 'ring-1 ring-[#909d63] border border-[#909d63]/50' : ''}">
          <div 
            onclick={() => editTask(task.id)}
            class="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            {#if executing}
              <span class="flex items-center gap-1 text-[#909d63]" title="Executando...">
                <svg class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            {:else}
              <button 
                onclick={(e) => { e.stopPropagation(); toggleTask(task.id, task.status); }}
                class="text-[#636363] hover:text-[#909d63] transition-colors"
              >
                [ ]
              </button>
            {/if}
            <span class="flex-1 text-[#d6d6d6] text-sm">{task.title}</span>
            
            {#if executing && execution}
              <span class="text-xs text-[#909d63] font-medium px-2 py-0.5 bg-[#909d63]/10 rounded">
                {execution.execution_type === 'subtask' ? 'Subtask' : 'Executando'}
                {#if execution.total_steps > 0}
                  [{execution.current_step}/{execution.total_steps}]
                {/if}
              </span>
            {/if}
            
            {#if taskSubtasks.length > 0}
              <span class="text-xs text-[#636363]">{doneSubtasks}/{taskSubtasks.length}</span>
            {/if}
            
            <span class="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
            <span class="px-2 py-0.5 text-xs text-[#1c1c1c] {getPriorityClass(task.priority)}">P{task.priority}</span>
            
            <button
              onclick={(e) => handleDeleteClick(e, task.id)}
              class="opacity-0 group-hover:opacity-100 p-1 transition-all {deleteConfirmId === task.id ? 'text-[#bc5653]' : 'text-[#636363] hover:text-[#bc5653]'}"
              title={deleteConfirmId === task.id ? 'Confirmar exclusão' : 'Excluir tarefa'}
            >
              {#if deleteConfirmId === task.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              {/if}
            </button>
            
            {#if taskSubtasks.length > 0 && taskSubtasks.every(s => s.status === 'done')}
              <button
                onclick={(e) => { e.stopPropagation(); reviewTask(task); }}
                class="px-3 py-1 text-xs bg-[#ebc17a] text-[#1c1c1c] hover:bg-[#f5d08a] transition-colors"
              >
                Revisar
              </button>
            {/if}
            
            {#if !executing}
              <button
                onclick={(e) => { e.stopPropagation(); codarTask(task); }}
                class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] transition-colors cursor-pointer"
              >
                Codar &gt;
              </button>
            {/if}
          </div>
          
          {#if taskSubtasks.length > 0}
            <div class="pl-8 pr-3 pb-2 space-y-1">
              {#each taskSubtasks as subtask}
                {@const isCurrentSubtask = executing && execution?.subtask_id === subtask.id}
                <div class="flex items-center gap-2 text-sm {subtask.status === 'done' ? 'opacity-50' : ''} {isCurrentSubtask ? 'bg-[#909d63]/10 -mx-2 px-2 py-1 rounded' : ''}">
                  {#if isCurrentSubtask}
                    <span class="flex items-center gap-1 text-[#909d63]" title="Executando...">
                      <svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  {:else}
                    <button 
                      onclick={() => toggleSubtaskInList(task.id, subtask.id)}
                      disabled={executing}
                      class="text-xs {subtask.status === 'done' ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#909d63]'} disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {subtask.status === 'done' ? '[x]' : '[ ]'}
                    </button>
                  {/if}
                  <span class="text-[#d6d6d6] {subtask.status === 'done' ? 'line-through' : ''}">{subtask.title}</span>
                  {#if !executing}
                    <button
                      onclick={(e) => { e.stopPropagation(); codarSubtaskInList(task, subtask.id); }}
                      disabled={subtask.status === 'done'}
                      class="ml-auto px-2 py-0.5 text-xs bg-[#3d3a34] text-[#d6d6d6] hover:bg-[#4a4a4a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Codar &gt;
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
  
  {#if doneTasks.length > 0}
    <div class="mt-4">
      <div class="text-xs text-[#636363] uppercase tracking-wide mb-2">Concluídas ({doneTasks.length})</div>
      <div class="space-y-1 opacity-50">
        {#each doneTasks as task}
          <div 
            onclick={() => editTask(task.id)}
            class="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] transition-colors group cursor-pointer"
          >
            <button 
              onclick={(e) => { e.stopPropagation(); toggleTask(task.id, task.status); }}
              class="text-[#909d63]"
            >
              [x]
            </button>
            <span class="flex-1 text-[#d6d6d6] text-sm line-through">{task.title}</span>
            <span class="px-2 py-0.5 text-xs text-[#1c1c1c] bg-[#6b7c5e]">{task.category}</span>
            <button
              onclick={(e) => handleDeleteClick(e, task.id)}
              class="opacity-0 group-hover:opacity-100 p-1 transition-all {deleteConfirmId === task.id ? 'text-[#bc5653]' : 'text-[#636363] hover:text-[#bc5653]'}"
              title={deleteConfirmId === task.id ? 'Confirmar exclusão' : 'Excluir tarefa'}
            >
              {#if deleteConfirmId === task.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              {/if}
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  {#if filteredTasks.length === 0}
    <div class="text-center text-[#636363] py-8">
      Nenhuma tarefa encontrada. Adicione uma nova!
    </div>
  {/if}
</div>
