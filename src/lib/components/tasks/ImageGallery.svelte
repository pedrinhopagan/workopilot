<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  
  interface TaskImageMetadata {
    id: string;
    file_name: string;
    mime_type: string;
    created_at: string | null;
  }
  
  interface Props {
    images: TaskImageMetadata[];
    disabled?: boolean;
    onDelete: (imageId: string) => void;
    onView: (imageId: string) => void;
  }
  
  let { images, disabled = false, onDelete, onView }: Props = $props();
  
  let loadedImages: Map<string, { data: string; loading: boolean; error: string | null }> = $state(new Map());
  
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
      onDelete(imageId);
    }
  }
  
  function truncateFilename(name: string, maxLength: number = 16): string {
    if (name.length <= maxLength) return name;
    const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
    const base = name.slice(0, name.lastIndexOf('.') > 0 ? name.lastIndexOf('.') : name.length);
    const available = maxLength - ext.length - 2;
    if (available < 4) return name.slice(0, maxLength - 2) + '..';
    return base.slice(0, available) + '..' + ext;
  }
  
  $effect(() => {
    images.forEach((img) => {
      loadImage(img.id);
    });
  });
</script>

{#if images.length > 0}
  <div class="image-gallery">
    {#each images as image (image.id)}
      {@const imageState = loadedImages.get(image.id)}
      <div class="thumbnail-container group">
        <button
          class="thumbnail"
          onclick={() => onView(image.id)}
          disabled={disabled || imageState?.loading || !!imageState?.error}
          title={image.file_name}
        >
          {#if imageState?.loading || !imageState}
            <div class="loading-placeholder">
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </div>
          {:else if imageState?.error}
            <div class="error-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        {/if}
        
        <span class="filename">{truncateFilename(image.file_name)}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  .image-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
    max-width: 100%;
  }
  
  @media (min-width: 480px) {
    .image-gallery {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  
  .thumbnail-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .thumbnail {
    width: 100%;
    aspect-ratio: 1;
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
    transform: scale(1.02);
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
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    background: rgba(28, 28, 28, 0.9);
    border: 1px solid #3d3a34;
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
  
  .filename {
    font-size: 10px;
    color: #636363;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
