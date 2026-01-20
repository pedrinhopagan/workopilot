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
        date: $selectedDate
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
            <DayTaskItem {task} onStatusChange={handleTaskChange} />
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
