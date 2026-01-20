<script lang="ts">
  import { goto } from '$app/navigation';
  import { invoke } from '@tauri-apps/api/core';
  import { setDialogOpen } from '$lib/stores/dialogState';
  import { 
    structuringNotification, 
    dismissStructuringNotification,
    type StructuringNotification 
  } from '$lib/stores/structuringNotification';
  
  let notification: StructuringNotification | null = $state(null);
  let isLaunching = $state(false);
  let launchingAction: string | null = $state(null);
  
  structuringNotification.subscribe(value => {
    notification = value;
    setDialogOpen(value !== null);
  });
  
  function handleClose() {
    dismissStructuringNotification();
  }
  
  async function handleViewTask() {
    if (!notification) return;
    handleClose();
    goto(`/tasks/${notification.taskId}`);
  }
  
  async function handleExecuteAll() {
    if (!notification || isLaunching) return;
    isLaunching = true;
    launchingAction = 'execute_all';
    try {
      await invoke('launch_task_execute_all', {
        projectId: notification.projectId,
        taskId: notification.taskId
      });
      handleClose();
      goto(`/tasks/${notification.taskId}`);
    } catch (e) {
      console.error('Failed to launch execute all:', e);
    } finally {
      isLaunching = false;
      launchingAction = null;
    }
  }
  
  async function handleExecuteFirstSubtask() {
    if (!notification || isLaunching) return;
    isLaunching = true;
    launchingAction = 'execute_subtask';
    try {
      const firstSubtaskId = `${notification.taskId}:sub-001`;
      await invoke('launch_task_execute_subtask', {
        projectId: notification.projectId,
        taskId: notification.taskId,
        subtaskId: firstSubtaskId
      });
      handleClose();
      goto(`/tasks/${notification.taskId}`);
    } catch (e) {
      console.error('Failed to launch execute subtask:', e);
    } finally {
      isLaunching = false;
      launchingAction = null;
    }
  }
  
  async function handleReview() {
    if (!notification || isLaunching) return;
    isLaunching = true;
    launchingAction = 'review';
    try {
      await invoke('launch_task_review', {
        projectId: notification.projectId,
        taskId: notification.taskId
      });
      handleClose();
      goto(`/tasks/${notification.taskId}`);
    } catch (e) {
      console.error('Failed to launch review:', e);
    } finally {
      isLaunching = false;
      launchingAction = null;
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (!notification) return;
    if (e.key === 'Escape') handleClose();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if notification}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" onclick={handleClose} onkeydown={handleKeydown} role="button" tabindex="-1" aria-label="Fechar modal"></div>
    <div class="relative bg-[#1c1c1c] border border-[#3d3a34] max-w-lg w-full mx-4 overflow-hidden animate-modal-in">
      <div class="px-5 py-4 border-b border-[#3d3a34] bg-gradient-to-r from-[#909d63]/10 via-transparent to-transparent">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#909d63]/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909d63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <div>
            <h3 class="text-[#d6d6d6] text-base font-medium">Estruturação Concluída</h3>
            <p class="text-[#636363] text-sm mt-0.5">{notification.subtaskCount} subtasks criadas</p>
          </div>
          <button 
            onclick={handleClose}
            class="ml-auto text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="px-5 py-4">
        <p class="text-[#d6d6d6] text-sm mb-1">Task estruturada:</p>
        <p class="text-[#909d63] font-medium truncate">{notification.taskTitle}</p>
      </div>
      
      <div class="px-5 pb-5">
        <p class="text-[#636363] text-xs uppercase tracking-wider mb-3">Próxima ação</p>
        
        <div class="grid grid-cols-2 gap-3">
          <button
            onclick={handleExecuteAll}
            disabled={isLaunching}
            class="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#3d3a34] bg-[#232323] hover:border-[#909d63] hover:bg-[#909d63]/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if launchingAction === 'execute_all'}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#909d63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#636363] group-hover:text-[#909d63] transition-colors">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
              </svg>
            {/if}
            <span class="text-sm text-[#d6d6d6] group-hover:text-[#909d63] transition-colors">Executar Tudo</span>
          </button>
          
          <button
            onclick={handleExecuteFirstSubtask}
            disabled={isLaunching}
            class="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#3d3a34] bg-[#232323] hover:border-[#61afef] hover:bg-[#61afef]/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if launchingAction === 'execute_subtask'}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#61afef" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#636363] group-hover:text-[#61afef] transition-colors">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            {/if}
            <span class="text-sm text-[#d6d6d6] group-hover:text-[#61afef] transition-colors">Executar Subtask</span>
          </button>
          
          <button
            onclick={handleReview}
            disabled={isLaunching}
            class="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#3d3a34] bg-[#232323] hover:border-[#e5c07b] hover:bg-[#e5c07b]/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if launchingAction === 'review'}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#636363] group-hover:text-[#e5c07b] transition-colors">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            {/if}
            <span class="text-sm text-[#d6d6d6] group-hover:text-[#e5c07b] transition-colors">Revisar</span>
          </button>
          
          <button
            onclick={handleViewTask}
            disabled={isLaunching}
            class="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#3d3a34] bg-[#232323] hover:border-[#636363] hover:bg-[#2a2a2a] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#636363] group-hover:text-[#d6d6d6] transition-colors">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
            </svg>
            <span class="text-sm text-[#d6d6d6]">Editar Manualmente</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .animate-modal-in {
    animation: modal-in 0.2s ease-out;
  }
</style>
