<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { invoke } from '@tauri-apps/api/core';
  import { isDialogOpen } from '$lib/stores/dialogState';
  import StructuringCompleteModal from '$lib/components/StructuringCompleteModal.svelte';
  import { openCodeService } from '$lib/services/opencode';
  import { startPolling, stopPolling, checkForStructuringChanges, checkAllInProgressTasks } from '$lib/services/structuringMonitor';
  import type { Snippet } from 'svelte';
  
  let { children }: { children: Snippet } = $props();
  let dialogOpen = $state(false);
  
  isDialogOpen.subscribe(value => {
    dialogOpen = value;
  });
  
  onMount(() => {
    let unlisten: (() => void) | undefined;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeOpenCode: (() => void) | null = null;
    
    startPolling(5000);
    
    unsubscribeOpenCode = openCodeService.onSessionIdle(async () => {
      await checkForStructuringChanges();
    });
    
    const unsubscribeFileChange = openCodeService.onFileChange(async (filePath) => {
      if (filePath.includes('workopilot.db')) {
        await checkAllInProgressTasks();
      }
    });
    
    getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      if (!focused && !dialogOpen) {
        hideTimeout = setTimeout(async () => {
          const win = getCurrentWindow();
          const isFocused = await win.isFocused();
          if (!isFocused && !dialogOpen) {
            invoke('hide_window');
          }
        }, 150);
      }
    }).then(fn => {
      unlisten = fn;
    });
    
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      unlisten?.();
      unsubscribeOpenCode?.();
      unsubscribeFileChange();
      stopPolling();
    };
  });
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.altKey && e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const tabMap: Record<string, string> = {
        '1': '/projects',
        '2': '/tasks',
        '3': '/agenda', 
        '4': '/logs',
        '0': '/settings'
      };
      const path = tabMap[e.key];
      if (path) {
        goto(path);
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-screen min-w-lg flex flex-col bg-[#1c1c1c] p-3">
  {@render children()}
</div>

<StructuringCompleteModal />
