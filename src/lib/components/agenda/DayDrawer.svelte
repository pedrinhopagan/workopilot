<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { Task, TaskFull, Subtask, ProjectWithConfig } from '$lib/types';
  import { selectedDate, drawerCollapsed } from '$lib/stores/agenda';
  import DayTaskItem from './DayTaskItem.svelte';
  
  interface Props {
    onClose: () => void;
    onTaskChange: () => void;
  }
  
  let { onClose, onTaskChange }: Props = $props();
  
  let tasks: Task[] = $state([]);
  let isLoading = $state(true);
  let taskFullCache = $state<Map<string, TaskFull>>(new Map());
  let expandedTasks = $state<Set<string>>(new Set());
  
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
        date: $selectedDate
      });
      // Load TaskFull data for tasks with json_path
      await loadAllTaskFulls();
    } catch (e) {
      console.error('Failed to load tasks for date:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function loadTaskFull(taskId: string, projectPath: string): Promise<TaskFull | null> {
    try {
      const full: TaskFull = await invoke('get_task_full', { projectPath, taskId });
      taskFullCache.set(taskId, full);
      taskFullCache = new Map(taskFullCache);
      return full;
    } catch {
      return null;
    }
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
  
  function getSubtasksForTask(taskId: string): Subtask[] {
    return taskFullCache.get(taskId)?.subtasks || [];
  }
  
  function toggleExpanded(taskId: string) {
    if (expandedTasks.has(taskId)) {
      expandedTasks.delete(taskId);
    } else {
      expandedTasks.add(taskId);
    }
    expandedTasks = new Set(expandedTasks);
  }
  
  async function toggleSubtask(taskId: string, subtaskId: string) {
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
      handleTaskChange();
    } catch (e) {
      console.error('Failed to toggle subtask:', e);
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

<svelte:window onkeydown={handleKeydown} />

{#if $selectedDate && !$drawerCollapsed}
  <button
    type="button"
    class="drawer-backdrop fixed inset-0 bg-black/50 z-40"
    onclick={handleClickOutside}
    aria-label="Fechar drawer"
  ></button>
  
  <div 
    class="fixed top-0 right-0 h-full w-[400px] bg-[#1c1c1c] border-l border-[#3d3a34] z-50 flex flex-col shadow-xl animate-slide-in"
  >
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
            {@const taskSubtasks = getSubtasksForTask(task.id)}
            {@const doneSubtasks = taskSubtasks.filter(s => s.status === 'done').length}
            {@const isExpanded = expandedTasks.has(task.id)}
            
            <div class="bg-[#232323]">
              <div class="flex items-center gap-2">
                {#if taskSubtasks.length > 0}
                  <button
                    onclick={() => toggleExpanded(task.id)}
                    class="pl-2 text-[#636363] hover:text-[#d6d6d6] transition-colors"
                    title={isExpanded ? 'Recolher subtasks' : 'Expandir subtasks'}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2"
                      class="transition-transform {isExpanded ? 'rotate-90' : ''}"
                    >
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                {/if}
                <div class="flex-1 {taskSubtasks.length > 0 ? '' : 'pl-2'}">
                  <DayTaskItem {task} onStatusChange={handleTaskChange} />
                </div>
                {#if taskSubtasks.length > 0}
                  <span class="pr-3 text-xs text-[#636363]">{doneSubtasks}/{taskSubtasks.length}</span>
                {/if}
              </div>
              
              {#if isExpanded && taskSubtasks.length > 0}
                <div class="pl-8 pr-3 pb-2 space-y-1">
                  {#each taskSubtasks as subtask}
                    <div class="flex items-center gap-2 text-sm {subtask.status === 'done' ? 'opacity-50' : ''}">
                      <button 
                        onclick={() => toggleSubtask(task.id, subtask.id)}
                        class="text-xs {subtask.status === 'done' ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#909d63]'}"
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
        </div>
      {/if}
    </div>
    
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
