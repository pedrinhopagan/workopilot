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
