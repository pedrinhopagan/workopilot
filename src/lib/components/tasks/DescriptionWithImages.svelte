<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  
  interface TaskImageMetadata {
    id: string;
    file_name: string;
    mime_type: string;
    created_at: string | null;
  }
  
  interface Props {
    taskId: string;
    description: string;
    images: TaskImageMetadata[];
    maxImages?: number;
    disabled?: boolean;
    onDescriptionChange: (value: string) => void;
    onImageUpload: () => void;
    onImageDelete: (imageId: string) => void;
    onImageView: (imageId: string) => void;
  }
  
  let { 
    taskId, 
    description, 
    images, 
    maxImages = 5, 
    disabled = false, 
    onDescriptionChange, 
    onImageUpload,
    onImageDelete,
    onImageView
  }: Props = $props();
  
  let textareaRef: HTMLTextAreaElement | null = $state(null);
  let isFocused = $state(false);
  let isUploading = $state(false);
  let uploadFeedback = $state<'success' | 'error' | null>(null);
  let errorMessage = $state('');
  let loadedImages: Map<string, { data: string; loading: boolean; error: string | null }> = $state(new Map());
  
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  let canUpload = $derived(images.length < maxImages && !disabled && !isUploading);
  
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
  
  async function uploadImage(file: File) {
    if (!allowedMimeTypes.includes(file.type)) {
      errorMessage = 'Formato inválido. Use PNG, JPG, GIF ou WebP.';
      uploadFeedback = 'error';
      setTimeout(() => { uploadFeedback = null; errorMessage = ''; }, 3000);
      return;
    }
    
    if (images.length >= maxImages) {
      errorMessage = `Limite de ${maxImages} imagens atingido.`;
      uploadFeedback = 'error';
      setTimeout(() => { uploadFeedback = null; errorMessage = ''; }, 3000);
      return;
    }
    
    isUploading = true;
    errorMessage = '';
    
    try {
      const base64 = await fileToBase64(file);
      await invoke('add_task_image', {
        taskId,
        fileData: base64,
        fileName: file.name || `screenshot-${Date.now()}.png`,
        mimeType: file.type
      });
      uploadFeedback = 'success';
      setTimeout(() => { uploadFeedback = null; }, 1500);
      onImageUpload();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao enviar imagem.';
      uploadFeedback = 'error';
      setTimeout(() => { uploadFeedback = null; }, 3000);
    } finally {
      isUploading = false;
    }
  }
  
  function handlePaste(event: ClipboardEvent) {
    if (disabled || isUploading || images.length >= maxImages) return;
    
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
  
  async function loadImage(imageId: string) {
    if (loadedImages.get(imageId)?.data || loadedImages.get(imageId)?.loading) return;
    
    loadedImages.set(imageId, { data: '', loading: true, error: null });
    loadedImages = new Map(loadedImages);
    
    try {
      const result = await invoke<{ data: string; mime_type: string }>('get_task_image', { imageId });
      loadedImages.set(imageId, { data: `data:${result.mime_type};base64,${result.data}`, loading: false, error: null });
      loadedImages = new Map(loadedImages);
    } catch (err) {
      loadedImages.set(imageId, { data: '', loading: false, error: err instanceof Error ? err.message : 'Erro ao carregar' });
      loadedImages = new Map(loadedImages);
    }
  }
  
  function handleDelete(imageId: string) {
    if (disabled) return;
    if (confirm('Remover esta imagem?')) {
      onImageDelete(imageId);
    }
  }
  
  $effect(() => {
    images.forEach((img) => {
      loadImage(img.id);
    });
  });
</script>

<section class="description-section">
  <div class="header">
    <label class="label">Descrição</label>
    {#if canUpload}
      <span class="paste-hint" class:active={isFocused}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
        <span>Ctrl+V cola imagem</span>
      </span>
    {/if}
    {#if isUploading}
      <span class="uploading-indicator">
        <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span>Enviando...</span>
      </span>
    {/if}
  </div>
  
  <div 
    class="textarea-wrapper"
    class:focused={isFocused}
    class:success={uploadFeedback === 'success'}
    class:error={uploadFeedback === 'error'}
  >
    <textarea
      bind:this={textareaRef}
      value={description}
      oninput={(e) => onDescriptionChange(e.currentTarget.value)}
      onblur={() => { isFocused = false; }}
      onfocus={() => { isFocused = true; }}
      onpaste={handlePaste}
      disabled={disabled}
      placeholder="Descreva o objetivo desta tarefa... (Ctrl+V para colar imagens)"
      rows="3"
      class="textarea"
    ></textarea>
  </div>
  
  {#if errorMessage}
    <span class="error-message">{errorMessage}</span>
  {/if}
  
  {#if images.length > 0}
    <div class="thumbnails">
      {#each images as image (image.id)}
        {@const imageState = loadedImages.get(image.id)}
        <div class="thumbnail-container group">
          <button
            class="thumbnail"
            onclick={() => onImageView(image.id)}
            disabled={disabled || imageState?.loading || !!imageState?.error}
            title={image.file_name}
          >
            {#if imageState?.loading || !imageState}
              <div class="loading-placeholder">
                <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
            {:else if imageState?.error}
              <div class="error-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                </svg>
              </div>
            {:else}
              <img src={imageState.data} alt={image.file_name} class="thumbnail-img" />
            {/if}
          </button>
          
          {#if !disabled}
            <button
              class="delete-btn"
              onclick={() => handleDelete(image.id)}
              title="Remover imagem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          {/if}
        </div>
      {/each}
      
      <span class="image-count">{images.length}/{maxImages}</span>
    </div>
  {/if}
</section>

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes flash-success {
    0%, 100% { border-color: #3d3a34; }
    50% { border-color: #909d63; }
  }
  
  @keyframes flash-error {
    0%, 100% { border-color: #3d3a34; }
    50% { border-color: #bc5653; }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  .description-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .label {
    font-size: 11px;
    color: #828282;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .paste-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #4a4a4a;
    transition: color 0.15s ease;
  }
  
  .paste-hint.active {
    color: #909d63;
  }
  
  .uploading-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #909d63;
  }
  
  .textarea-wrapper {
    border: 1px solid #3d3a34;
    transition: border-color 0.15s ease;
  }
  
  .textarea-wrapper.focused {
    border-color: #909d63;
  }
  
  .textarea-wrapper.success {
    animation: flash-success 0.5s ease 2;
  }
  
  .textarea-wrapper.error {
    animation: flash-error 0.5s ease 2;
  }
  
  .textarea {
    width: 100%;
    padding: 8px 12px;
    background: #232323;
    border: none;
    color: #d6d6d6;
    font-size: 14px;
    resize: none;
    outline: none;
    transition: opacity 0.15s ease;
  }
  
  .textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .textarea::placeholder {
    color: #4a4a4a;
  }
  
  .error-message {
    font-size: 11px;
    color: #bc5653;
  }
  
  .thumbnails {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  
  .thumbnail-container {
    position: relative;
  }
  
  .thumbnail {
    width: 40px;
    height: 40px;
    background: #232323;
    border: 1px solid #3d3a34;
    cursor: pointer;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  
  .thumbnail:hover:not(:disabled) {
    border-color: #909d63;
    transform: scale(1.05);
  }
  
  .thumbnail:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .thumbnail-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .loading-placeholder,
  .error-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #636363;
  }
  
  .error-placeholder {
    color: #bc5653;
  }
  
  .delete-btn {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    background: rgba(28, 28, 28, 0.95);
    border: 1px solid #3d3a34;
    border-radius: 50%;
    color: #bc5653;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, background-color 0.15s ease;
  }
  
  .group:hover .delete-btn {
    opacity: 1;
  }
  
  .delete-btn:hover {
    background: #bc5653;
    color: #1c1c1c;
    border-color: #bc5653;
  }
  
  .image-count {
    font-size: 11px;
    color: #636363;
    margin-left: 4px;
  }
</style>
