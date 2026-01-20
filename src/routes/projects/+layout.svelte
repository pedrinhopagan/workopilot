<script lang="ts">
  import TabBar from '$lib/components/TabBar.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { invoke } from "@tauri-apps/api/core";
  import { selectedProjectId as selectedProjectIdStore, projectsList } from '$lib/stores/selectedProject';
  import type { Project } from '$lib/types';
  import type { Snippet } from 'svelte';
  
  let { children }: { children: Snippet } = $props();
  
  let projects: Project[] = $state([]);
  let selectedProjectId: string | null = $state(null);
  
  let isSettingsPage = $derived($page.url.pathname.includes('/settings'));
  
  selectedProjectIdStore.subscribe(value => {
    selectedProjectId = value;
  });
  
  projectsList.subscribe(value => {
    projects = value;
  });
  
  async function loadProjects() {
    try {
      const loaded: Project[] = await invoke('get_projects');
      projects = loaded;
      projectsList.set(loaded);
      
      if (loaded.length > 0) {
        let storeValue: string | null = null;
        const unsubscribe = selectedProjectIdStore.subscribe(v => { storeValue = v; });
        unsubscribe();
        
        const urlProjectId = $page.url.searchParams.get('projectId');
        const targetId = urlProjectId || storeValue;
        
        if (targetId && loaded.some(p => p.id === targetId)) {
          selectProject(targetId);
        } else if (!storeValue) {
          selectProject(loaded[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }
  
  function selectProject(id: string) {
    selectedProjectId = id;
    selectedProjectIdStore.set(id);
  }
  
  function handleProjectClick(projectId: string) {
    if (isSettingsPage) {
      if (projectId === selectedProjectId) {
        goto('/projects');
      }
    } else {
      selectProject(projectId);
    }
  }
  
  $effect(() => {
    loadProjects();
  });
</script>

<TabBar />

<main class="flex flex-1 overflow-hidden">
  <aside class="w-56 border-r border-[#3d3a34] flex flex-col bg-[#232323]">
    <div class="p-3 border-b border-[#3d3a34]">
      <span class="text-xs text-[#828282] uppercase tracking-wide">Projetos</span>
    </div>
    
    <ul class="flex-1 overflow-y-auto p-2">
      {#each projects as project}
        {@const isSelected = selectedProjectId === project.id}
        {@const isDisabled = isSettingsPage && !isSelected}
        <li>
          <button 
            class="w-full px-3 py-2 text-left text-sm transition-colors {isSelected ? 'bg-[#909d63] text-[#1c1c1c]' : isDisabled ? 'text-[#4a4a4a] cursor-not-allowed opacity-50' : 'text-[#d6d6d6] hover:bg-[#333333]'}"
            onclick={() => handleProjectClick(project.id)}
            disabled={isDisabled}
            title={isSettingsPage && isSelected ? 'Voltar para projetos' : ''}
          >
            {project.name}
          </button>
        </li>
      {/each}
      
      {#if projects.length === 0}
        <li class="px-3 py-2 text-[#636363] text-sm">
          Nenhum projeto
        </li>
      {/if}
    </ul>
    
    {#if !isSettingsPage}
      <div class="p-2 border-t border-[#3d3a34]">
        <button 
          class="w-full px-3 py-2 text-sm text-[#828282] border border-dashed border-[#3d3a34] hover:border-[#909d63] hover:text-[#909d63] transition-colors"
          onclick={() => goto('/projects?newProject=true')}
        >
          + Novo Projeto
        </button>
      </div>
    {/if}
  </aside>
  
  <section class="flex-1 flex flex-col overflow-hidden">
    {@render children()}
  </section>
</main>
