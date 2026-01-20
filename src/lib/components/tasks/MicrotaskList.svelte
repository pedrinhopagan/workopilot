<script lang="ts">
  import type { Subtask } from '$lib/types';
  import MicrotaskItem from './MicrotaskItem.svelte';
  
  interface Props {
    subtasks: Subtask[];
    onAdd: (title: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onCodar: (id: string) => void;
  }
  
  let { subtasks, onAdd, onToggle, onRemove, onCodar }: Props = $props();
  
  let newTitle = $state('');
  
  function handleAdd() {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    newTitle = '';
  }
  
  let pendingCount = $derived(subtasks.filter(m => m.status !== 'done').length);
  let doneCount = $derived(subtasks.filter(m => m.status === 'done').length);
</script>

<section>
  <div class="flex items-center justify-between mb-2">
    <span class="text-xs text-[#828282] uppercase tracking-wide">Subtasks</span>
    {#if subtasks.length > 0}
      <span class="text-xs text-[#636363]">
        {doneCount}/{subtasks.length} concluídas
      </span>
    {/if}
  </div>
  
  {#if subtasks.length > 0}
    <div class="space-y-1 mb-3">
      {#each subtasks as subtask (subtask.id)}
        <MicrotaskItem 
          {subtask} 
          {onToggle} 
          {onRemove} 
          {onCodar} 
        />
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
