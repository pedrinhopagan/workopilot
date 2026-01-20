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
  <div class="p-3 border-b border-[#3d3a34]">
    <h3 class="text-sm font-medium text-[#d6d6d6] mb-3">Não Agendadas</h3>
    
    <div class="flex flex-col gap-2">
      <Select
        value={filterProject}
        options={getProjectOptions()}
        onchange={(v) => { filterProject = v; loadTasks(); }}
        class="w-full"
      />
      <div class="flex gap-2">
        <Select
          value={filterCategory}
          options={getCategoryOptions()}
          onchange={(v) => { filterCategory = v; loadTasks(); }}
          class="flex-1"
        />
        <Select
          value={filterPriority}
          options={getPriorityOptions()}
          onchange={(v) => { filterPriority = v; loadTasks(); }}
          class="flex-1"
        />
      </div>
    </div>
  </div>
  
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
  
  <div class="p-3 border-t border-[#3d3a34]">
    <button
      disabled={tasks.length === 0}
      class="w-full px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm font-medium hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors"
    >
      Distribuir com IA
    </button>
  </div>
</div>
