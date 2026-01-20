<script lang="ts">
  import type { Subtask } from '$lib/types';
  
  interface Props {
    subtask: Subtask;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onCodar: (id: string) => void;
    onUpdate: (id: string, field: keyof Subtask, value: any) => void;
    expanded?: boolean;
    onToggleExpand: (id: string) => void;
  }
  
  let { subtask, onToggle, onRemove, onCodar, onUpdate, expanded = false, onToggleExpand }: Props = $props();
  
  let isDone = $derived(subtask.status === 'done');
  let hasDetails = $derived(
    subtask.description || 
    (subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0) ||
    subtask.technical_notes
  );
  
  let newCriteria = $state('');
  
  function addCriteria() {
    if (!newCriteria.trim()) return;
    const current = subtask.acceptance_criteria || [];
    onUpdate(subtask.id, 'acceptance_criteria', [...current, newCriteria.trim()]);
    newCriteria = '';
  }
  
  function removeCriteria(index: number) {
    const current = subtask.acceptance_criteria || [];
    const updated = current.filter((_: string, i: number) => i !== index);
    onUpdate(subtask.id, 'acceptance_criteria', updated.length > 0 ? updated : null);
  }
</script>

<div class="animate-fade-in {isDone ? 'opacity-50' : ''}">
  <div class="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] transition-colors group">
    <button 
      onclick={() => onToggle(subtask.id)}
      class="transition-colors {isDone ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#909d63]'}"
    >
      {isDone ? '[x]' : '[ ]'}
    </button>
    
    <button
      onclick={() => onToggleExpand(subtask.id)}
      class="text-[#636363] hover:text-[#909d63] transition-colors"
      title={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        class="transition-transform {expanded ? 'rotate-90' : ''}"
      >
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
    
    <span class="flex-1 text-[#d6d6d6] text-sm {isDone ? 'line-through' : ''}">
      {subtask.title}
    </span>
    
    {#if !expanded && hasDetails}
      <span class="text-[#636363] text-xs">
        {#if subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0}
          ({subtask.acceptance_criteria.length} criterios)
        {:else}
          (detalhes)
        {/if}
      </span>
    {/if}
    
    <button
      onclick={() => onRemove(subtask.id)}
      class="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
      title="Remover subtask"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
    
    <button
      onclick={() => onCodar(subtask.id)}
      disabled={isDone}
      class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors"
    >
      Codar &gt;
    </button>
  </div>
  
  {#if expanded}
    <div class="px-3 py-3 bg-[#1c1c1c] border-l-2 border-[#3d3a34] ml-6 animate-slide-down space-y-4">
      <div class="space-y-1">
        <label class="text-[#636363] text-xs uppercase tracking-wide">Descricao</label>
        <textarea
          value={subtask.description || ''}
          onchange={(e) => onUpdate(subtask.id, 'description', e.currentTarget.value || null)}
          placeholder="Descreva a subtask..."
          class="w-full bg-[#232323] text-[#d6d6d6] text-sm px-3 py-2 border border-[#3d3a34] focus:border-[#909d63] focus:outline-none resize-none transition-colors"
          rows="2"
        ></textarea>
      </div>
      
      <!-- Acceptance Criteria -->
      <div class="space-y-2">
        <label class="text-[#636363] text-xs uppercase tracking-wide">Criterios de Aceitacao</label>
        
        {#if subtask.acceptance_criteria && subtask.acceptance_criteria.length > 0}
          <ul class="space-y-1">
            {#each subtask.acceptance_criteria as criteria, index}
              <li class="flex items-center gap-2 group/criteria">
                <span class="text-[#909d63]">-</span>
                <span class="flex-1 text-[#d6d6d6] text-sm">{criteria}</span>
                <button
                  onclick={() => removeCriteria(index)}
                  class="opacity-0 group-hover/criteria:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
                  title="Remover criterio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
        
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={newCriteria}
            onkeydown={(e) => e.key === 'Enter' && addCriteria()}
            placeholder="Adicionar criterio..."
            class="flex-1 bg-[#232323] text-[#d6d6d6] text-sm px-3 py-1 border border-[#3d3a34] focus:border-[#909d63] focus:outline-none transition-colors"
          />
          <button
            onclick={addCriteria}
            disabled={!newCriteria.trim()}
            class="px-3 py-1 text-xs bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
        </div>
      </div>
      
      <!-- Technical Notes -->
      <div class="space-y-1">
        <label class="text-[#636363] text-xs uppercase tracking-wide">Notas Tecnicas</label>
        <textarea
          value={subtask.technical_notes || ''}
          onchange={(e) => onUpdate(subtask.id, 'technical_notes', e.currentTarget.value || null)}
          placeholder="Adicione notas tecnicas, referencias, ou consideracoes de implementacao..."
          class="w-full bg-[#232323] text-[#d6d6d6] text-sm px-3 py-2 border border-[#3d3a34] focus:border-[#909d63] focus:outline-none resize-none transition-colors"
          rows="3"
        ></textarea>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slide-down {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 500px; }
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
    overflow: hidden;
  }
</style>
