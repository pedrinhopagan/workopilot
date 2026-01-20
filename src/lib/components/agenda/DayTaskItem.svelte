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
