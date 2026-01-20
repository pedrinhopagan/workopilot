<script lang="ts">
  import TabBar from '$lib/components/TabBar.svelte';
  import Select from '$lib/components/Select.svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { page } from '$app/stores';
  import { selectedProjectId, projectsList } from '$lib/stores/selectedProject';
  import type { Project } from '$lib/types';
  
  let { children } = $props();
  
  let projects: Project[] = $state([]);
  
  const isEditingTask = $derived($page.url.pathname !== '/tasks');
  
  // Reset to "Todos" when entering Tasks page
  $effect(() => {
    selectedProjectId.set(null);
  });
  
  async function loadProjects() {
    try {
      projects = await invoke('get_projects');
      projectsList.set(projects);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }
  
  function getProjectOptions() {
    return [
      { value: '', label: 'Todos' },
      ...projects.map(p => ({ value: p.id, label: p.name }))
    ];
  }
  
  $effect(() => {
    loadProjects();
  });
</script>

<TabBar />

<main class="flex-1 flex flex-col overflow-hidden">
  <div class="flex items-center justify-between gap-2 p-2 border-b border-[#3d3a34] bg-[#232323]">
    <div class="flex items-center gap-2">
      <span class="text-xs text-[#828282]">Projeto:</span>
      <Select
        value={$selectedProjectId || ''}
        options={getProjectOptions()}
        onchange={(v) => selectedProjectId.set(v || null)}
        class={isEditingTask ? 'opacity-50 pointer-events-none' : ''}
      />
    </div>
  </div>
  
  {@render children()}
</main>
