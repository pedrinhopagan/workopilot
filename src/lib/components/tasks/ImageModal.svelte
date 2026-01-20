<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { setDialogOpen } from '$lib/stores/dialogState';
  
  interface Props {
    imageId: string | null;
    onClose: () => void;
  }
  
  let { imageId, onClose }: Props = $props();
  
  let imageData = $state<string | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  
  async function loadImage(id: string) {
    loading = true;
    error = null;
    imageData = null;
    
    try {
      const result = await invoke<{ data: string; mime_type: string; file_name: string }>('get_task_image', { imageId: id });
      imageData = `data:${result.mime_type};base64,${result.data}`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro ao carregar imagem';
    } finally {
      loading = false;
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
  
  $effect(() => {
    if (imageId) {
      setDialogOpen(true);
      loadImage(imageId);
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      setDialogOpen(false);
    }
    
    return () => {
      setDialogOpen(false);
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  });
</script>

{#if imageId}
  <div 
    class="modal-backdrop" 
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
  >
    <button
      class="close-btn"
      onclick={onClose}
      aria-label="Fechar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
    
    <div class="modal-content">
      {#if loading}
        <div class="loading-container">
          <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Carregando...</span>
        </div>
      {:else if error}
        <div class="error-container">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
          </svg>
          <span>{error}</span>
        </div>
      {:else if imageData}
        <img src={imageData} alt="Imagem expandida" class="modal-image" />
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fade-in 0.2s ease-out;
  }
  
  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    background: rgba(35, 35, 35, 0.9);
    border: 1px solid #3d3a34;
    color: #d6d6d6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    z-index: 1001;
  }
  
  .close-btn:hover {
    background: #909d63;
    color: #1c1c1c;
    border-color: #909d63;
  }
  
  .modal-content {
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scale-in 0.2s ease-out;
  }
  
  .modal-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border: 1px solid #3d3a34;
    background: #1c1c1c;
  }
  
  .loading-container,
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #636363;
    font-size: 14px;
  }
  
  .error-container {
    color: #bc5653;
  }
</style>
