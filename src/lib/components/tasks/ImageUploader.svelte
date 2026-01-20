<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  
  interface Props {
    taskId: string;
    imageCount: number;
    maxImages?: number;
    disabled?: boolean;
    onUpload: () => void;
  }
  
  let { taskId, imageCount, maxImages = 5, disabled = false, onUpload }: Props = $props();
  
  let isUploading = $state(false);
  let errorMessage = $state('');
  let fileInput: HTMLInputElement | null = $state(null);
  
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  let canUpload = $derived(imageCount < maxImages && !disabled && !isUploading);
  
  async function uploadImage(file: File) {
    if (!allowedMimeTypes.includes(file.type)) {
      errorMessage = 'Formato invalido. Use PNG, JPG, GIF ou WebP.';
      return;
    }
    
    if (imageCount >= maxImages) {
      errorMessage = `Limite de ${maxImages} imagens atingido.`;
      return;
    }
    
    isUploading = true;
    errorMessage = '';
    
    try {
      const base64 = await fileToBase64(file);
      await invoke('add_task_image', {
        taskId,
        fileData: base64,
        fileName: file.name,
        mimeType: file.type
      });
      onUpload();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao enviar imagem.';
    } finally {
      isUploading = false;
    }
  }
  
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
      reader.readAsDataURL(file);
    });
  }
  
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      uploadImage(file);
      target.value = '';
    }
  }
  
  function handlePaste(event: ClipboardEvent) {
    if (disabled || isUploading || imageCount >= maxImages) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          uploadImage(file);
          break;
        }
      }
    }
  }
  
  $effect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  });
</script>

<div class="flex items-center gap-3">
  <input
    bind:this={fileInput}
    type="file"
    accept="image/png,image/jpeg,image/gif,image/webp"
    onchange={handleFileSelect}
    class="hidden"
    disabled={!canUpload}
  />
  
  <button
    onclick={() => fileInput?.click()}
    disabled={!canUpload}
    class="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#232323] text-[#d6d6d6] border border-[#3d3a34] hover:bg-[#2c2c2c] hover:border-[#909d63] disabled:bg-[#1c1c1c] disabled:text-[#636363] disabled:border-[#3d3a34] disabled:cursor-not-allowed transition-colors"
  >
    {#if isUploading}
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Enviando...</span>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      <span>Imagem</span>
    {/if}
  </button>
  
  <span class="text-[#636363] text-xs">
    {imageCount}/{maxImages}
  </span>
  
  {#if !isUploading && canUpload}
    <span class="text-[#636363] text-xs">(Ctrl+V para colar)</span>
  {/if}
  
  {#if errorMessage}
    <span class="text-[#bc5653] text-xs">{errorMessage}</span>
  {/if}
</div>

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
