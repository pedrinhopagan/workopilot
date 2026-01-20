<script lang="ts">
  import { page } from '$app/stores';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { invoke } from '@tauri-apps/api/core';
  
  const tabs = [
    { path: '/projects', label: 'Projetos' },
    { path: '/tasks', label: 'Tarefas' },
    { path: '/agenda', label: 'Agenda' },
    { path: '/logs', label: 'Logs' }
  ];
  
  let currentPath = $derived($page.url.pathname);
  
  function handleMouseDown(e: MouseEvent) {
    if (e.button === 0 && (e.target as HTMLElement).closest('nav') && !(e.target as HTMLElement).closest('a') && !(e.target as HTMLElement).closest('button')) {
      getCurrentWindow().startDragging();
    }
  }
  
  function hideWindow() {
    invoke('hide_window');
  }
</script>

<nav 
  class="flex items-center border-b border-[#3d3a34] cursor-grab active:cursor-grabbing select-none"
  onmousedown={handleMouseDown}
  role="banner"
>
  <div class="px-3 py-2 flex items-center">
    <img src="/workopilot_logo.svg" alt="WorkOpilot" class="w-5 h-5 opacity-60 pointer-events-none" />
  </div>
  {#each tabs as tab}
    <a 
      href={tab.path}
      class="px-4 py-2 text-sm transition-colors cursor-pointer {currentPath === tab.path || currentPath.startsWith(tab.path + '/') || (currentPath === '/' && tab.path === '/projects') ? 'bg-[#909d63] text-[#1c1c1c] font-medium' : 'text-[#828282] hover:text-[#d6d6d6] hover:bg-[#333333]'}"
    >
      {tab.label}
    </a>
  {/each}
  <div class="flex-1"></div>
  <a 
    href="/settings"
    class="px-3 py-2 text-sm transition-colors cursor-pointer {currentPath === '/settings' ? 'text-[#909d63]' : 'text-[#636363] hover:text-[#d6d6d6]'}"
    title="Configuracoes"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  </a>
  <button 
    onclick={hideWindow}
    class="px-3 py-2 text-sm transition-colors cursor-pointer text-[#636363] hover:text-[#bc5653]"
    title="Esconder"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
</nav>
