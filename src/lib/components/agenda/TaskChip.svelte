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
  let projectColor = $derived('#909d63');
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
  {#if task.subtask_count > 0}
    <span class="text-[10px] text-[#636363]">
      +{task.subtask_count} subtasks
    </span>
  {/if}
</div>

<style>
  .border-l-3 {
    border-left-style: solid;
  }
</style>
