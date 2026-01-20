<script lang="ts">
  import type { Subtask } from '$lib/types';
  
  interface Props {
    subtask: Subtask;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onCodar: (id: string) => void;
  }
  
  let { subtask, onToggle, onRemove, onCodar }: Props = $props();
  
  let isDone = $derived(subtask.status === 'done');
</script>

<div class="flex items-center gap-3 px-3 py-2 bg-[#232323] hover:bg-[#2a2a2a] transition-colors group animate-fade-in {isDone ? 'opacity-50' : ''}">
  <button 
    onclick={() => onToggle(subtask.id)}
    class="transition-colors {isDone ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#909d63]'}"
  >
    {isDone ? '[x]' : '[ ]'}
  </button>
  
  <span class="flex-1 text-[#d6d6d6] text-sm {isDone ? 'line-through' : ''}">
    {subtask.title}
  </span>
  
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

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
</style>
