<script lang="ts">
  interface Props {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
  }
  
  let { 
    show, 
    title, 
    message, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    danger = false
  }: Props = $props();
  
  function handleKeydown(e: KeyboardEvent) {
    if (!show) return;
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter') onConfirm();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60" onclick={onCancel}></div>
    <div class="relative bg-[#232323] border border-[#3d3a34] p-4 max-w-md w-full mx-4">
      <h3 class="text-[#d6d6d6] text-lg mb-2">{title}</h3>
      <p class="text-[#828282] text-sm mb-4">{message}</p>
      <div class="flex justify-end gap-2">
        <button 
          onclick={onCancel}
          class="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] transition-colors"
        >
          {cancelText}
        </button>
        <button 
          onclick={onConfirm}
          class="px-4 py-2 text-sm transition-colors {danger ? 'bg-[#bc5653] text-[#1c1c1c] hover:bg-[#cc6663]' : 'bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73]'}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
