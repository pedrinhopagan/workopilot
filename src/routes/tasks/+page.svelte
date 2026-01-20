<script lang="ts">
  import Select from '$lib/components/Select.svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from '$app/navigation';
  import { selectedProjectId, projectsList } from '$lib/stores/selectedProject';
  import type { Task, ProjectWithConfig } from '$lib/types';
  
  let tasks: Task[] = $state([]);
  let projectPath: string | null = $state(null);
  let deleteConfirmId: string | null = $state(null);
  
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
  
  let pendingTasks = $derived(filteredTasks.filter(t => t.status !== 'done'));
  let doneTasks = $derived(filteredTasks.filter(t => t.status === 'done'));
  
  async function loadTasks() {
    try {
      tasks = await invoke('get_tasks');
    } catch (e) {
      console.error('Failed to load tasks:', e);
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
        microtaskId: null
      });
    } catch (e) {
      console.error('Failed to launch task workflow:', e);
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
  
  $effect(() => {
    loadTasks();
  });
  
  $effect(() => {
    loadProjectPath();
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
        <div 
          onclick={() => editTask(task.id)}
          class="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] transition-colors group cursor-pointer"
        >
          <button 
            onclick={(e) => { e.stopPropagation(); toggleTask(task.id, task.status); }}
            class="text-[#636363] hover:text-[#909d63] transition-colors"
          >
            [ ]
          </button>
          <span class="flex-1 text-[#d6d6d6] text-sm">{task.title}</span>
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
          <button
            onclick={(e) => { e.stopPropagation(); codarTask(task); }}
            class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] transition-colors"
          >
            Codar &gt;
          </button>
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
