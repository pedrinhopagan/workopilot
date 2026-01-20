<script lang="ts">
  import type { Subtask } from '$lib/types';
  import SubtaskItem from './SubtaskItem.svelte';
  
  interface Props {
    subtasks: Subtask[];
    onAdd: (title: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onCodar: (id: string) => void;
    onUpdate: (id: string, field: keyof Subtask, value: any) => void;
    onReorder: (subtasks: Subtask[]) => void;
    disabled?: boolean;
  }
  
  let { subtasks, onAdd, onToggle, onRemove, onCodar, onUpdate, onReorder, disabled = false }: Props = $props();
  
  let newTitle = $state('');
  let expandedIds = $state<Set<string>>(new Set());
  
  function handleAdd() {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    newTitle = '';
  }
  
  function toggleExpand(id: string) {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedIds = newSet;
  }
  
  function moveUp(index: number) {
    if (index === 0) return;
    const newList = [...sortedSubtasks];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    newList.forEach((s, i) => { s.order = i; });
    onReorder(newList);
  }
  
  function moveDown(index: number) {
    if (index === sortedSubtasks.length - 1) return;
    const newList = [...sortedSubtasks];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    newList.forEach((s, i) => { s.order = i; });
    onReorder(newList);
  }
  
  let pendingCount = $derived(subtasks.filter(s => s.status !== 'done').length);
  let doneCount = $derived(subtasks.filter(s => s.status === 'done').length);
  let sortedSubtasks = $derived([...subtasks].sort((a, b) => a.order - b.order));
</script>

<section class={disabled ? 'opacity-50 pointer-events-none' : ''}>
  <div class="flex items-center justify-between mb-2">
    <span class="text-xs text-[#828282] uppercase tracking-wide">Subtasks</span>
    {#if subtasks.length > 0}
      <span class="text-xs text-[#636363]">
        {doneCount}/{subtasks.length} concluidas
      </span>
    {/if}
  </div>
  
  {#if sortedSubtasks.length > 0}
    <div class="space-y-1 mb-3">
      {#each sortedSubtasks as subtask, index (subtask.id)}
        <div class="flex items-start gap-1">
          <div class="flex flex-col pt-2">
            <button
              onclick={() => moveUp(index)}
              disabled={disabled || index === 0}
              class="text-[#636363] hover:text-[#909d63] disabled:text-[#3d3a34] disabled:cursor-not-allowed transition-colors p-0.5"
              title="Mover para cima"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m18 15-6-6-6 6"/>
              </svg>
            </button>
            <button
              onclick={() => moveDown(index)}
              disabled={disabled || index === sortedSubtasks.length - 1}
              class="text-[#636363] hover:text-[#909d63] disabled:text-[#3d3a34] disabled:cursor-not-allowed transition-colors p-0.5"
              title="Mover para baixo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>
          <div class="flex-1">
            <SubtaskItem 
              {subtask}
              {onToggle}
              {onRemove}
              {onCodar}
              {onUpdate}
              {disabled}
              expanded={expandedIds.has(subtask.id)}
              onToggleExpand={toggleExpand}
            />
          </div>
        </div>
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
      disabled={disabled}
      placeholder="Adicionar subtask..."
      class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:cursor-not-allowed"
    />
    <button
      onclick={handleAdd}
      disabled={disabled || !newTitle.trim()}
      class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Adicionar
    </button>
  </div>
</section>
