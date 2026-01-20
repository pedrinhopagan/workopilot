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
  class="flex items-center gap-2 px-2 py-1.5 bg-[#232323] cursor-grab transition-all hover:bg-[#2a2a2a]"
  class:opacity-50={isDragging}
  class:cursor-grabbing={isDragging}
  class:border-l-[#bc5653]={isOverdue}
  style:border-left-color={!isOverdue ? '#909d63' : '#bc5653'}
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
