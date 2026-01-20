<script lang="ts">
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Select from '$lib/components/Select.svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import { goto } from '$app/navigation';
  import { setDialogOpen } from '$lib/stores/dialogState';
  import { selectedProjectId as selectedProjectIdStore, projectsList } from '$lib/stores/selectedProject';
  import { flip } from 'svelte/animate';
  import type { Project, ProjectWithConfig, ProjectRoute, TmuxTab } from '$lib/types';
  
  let projects: Project[] = $state([]);
  let selectedProjectId: string | null = $state(null);
  let projectConfig: ProjectWithConfig | null = $state(null);
  let isLoading = $state(false);
  
  let showDeleteConfirm = $state(false);
  let deleteTarget: { type: 'project' | 'route' | 'tab', id: string, name: string } | null = $state(null);
  
  let draggingRouteIndex: number | null = $state(null);
  let draggingTabIndex: number | null = $state(null);
  let lastRouteSwap = 0;
  let lastTabSwap = 0;
  
  selectedProjectIdStore.subscribe(value => {
    if (value && value !== selectedProjectId) {
      selectedProjectId = value;
      loadProjectConfig(value);
    }
  });
  
  projectsList.subscribe(value => {
    projects = value;
  });
  
  function getRouteNameFromPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'root';
  }
  
  async function loadProjectConfig(id: string) {
    isLoading = true;
    try {
      projectConfig = await invoke('get_project_with_config', { projectId: id });
    } catch (e) {
      console.error('Failed to load project config:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function openEnvFile(path: string) {
    try {
      await invoke('open_env_file', { path });
    } catch (e) {
      console.error('Failed to open env file:', e);
    }
  }
  
  function confirmDeleteProject() {
    if (!projectConfig) return;
    deleteTarget = { type: 'project', id: projectConfig.id, name: projectConfig.name };
    showDeleteConfirm = true;
  }
  
  async function executeDelete() {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'project') {
        await invoke('delete_project', { projectId: deleteTarget.id });
        selectedProjectIdStore.set(null);
        const loaded: Project[] = await invoke('get_projects');
        projectsList.set(loaded);
        goto('/projects');
      } else if (deleteTarget.type === 'route') {
        await removeRoute(deleteTarget.id);
      } else if (deleteTarget.type === 'tab') {
        await removeTmuxTab(deleteTarget.id);
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    } finally {
      showDeleteConfirm = false;
      deleteTarget = null;
    }
  }
  
  async function addRoute() {
    if (!projectConfig) return;
    
    try {
      setDialogOpen(true);
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecionar diretorio da rota",
        defaultPath: projectConfig.path
      });
      
      if (!selected || typeof selected !== 'string') {
        setDialogOpen(false);
        return;
      }
      
      const newRoute: ProjectRoute = {
        id: crypto.randomUUID(),
        path: selected,
        order: projectConfig.routes.length,
        env_path: undefined
      };
      
      projectConfig.routes = [...projectConfig.routes, newRoute];
      await saveRoutes();
      
      await createTmuxTabForRoute(newRoute);
    } catch (e) {
      console.error('Failed to add route:', e);
    } finally {
      setDialogOpen(false);
    }
  }
  
  async function createTmuxTabForRoute(route: ProjectRoute) {
    if (!projectConfig) return;
    
    const routeName = getRouteNameFromPath(route.path);
    const tabs = projectConfig.tmux_config.tabs;
    
    let insertPosition = 1;
    const termTabIndex = tabs.findIndex(t => t.name.toLowerCase() === 'term');
    if (termTabIndex > 0) {
      insertPosition = termTabIndex;
    } else if (tabs.length > 1) {
      insertPosition = tabs.length - 1;
    } else {
      insertPosition = tabs.length;
    }
    
    const newTab: TmuxTab = {
      id: crypto.randomUUID(),
      name: routeName,
      route_id: route.id,
      startup_command: undefined,
      order: insertPosition
    };
    
    const newTabs = [...tabs];
    newTabs.splice(insertPosition, 0, newTab);
    
    for (let i = 0; i < newTabs.length; i++) {
      newTabs[i].order = i;
    }
    
    projectConfig.tmux_config.tabs = newTabs;
    await saveTmuxConfig();
  }
  
  function isRootRoute(route: ProjectRoute): boolean {
    return route.path === projectConfig?.path;
  }
  
  function confirmRemoveRoute(routeId: string) {
    if (!projectConfig) return;
    const route = projectConfig.routes.find(r => r.id === routeId);
    if (!route) return;
    
    if (isRootRoute(route)) return;
    
    const routeName = getRouteNameFromPath(route.path);
    deleteTarget = { type: 'route', id: routeId, name: routeName };
    showDeleteConfirm = true;
  }
  
  async function removeRoute(routeId: string) {
    if (!projectConfig) return;
    
    const route = projectConfig.routes.find(r => r.id === routeId);
    if (!route || isRootRoute(route)) return;
    
    projectConfig.routes = projectConfig.routes.filter(r => r.id !== routeId);
    projectConfig.tmux_config.tabs = projectConfig.tmux_config.tabs.filter(
      t => t.route_id !== routeId
    );
    
    for (let i = 0; i < projectConfig.routes.length; i++) {
      projectConfig.routes[i].order = i;
    }
    
    for (let i = 0; i < projectConfig.tmux_config.tabs.length; i++) {
      projectConfig.tmux_config.tabs[i].order = i;
    }
    
    await saveRoutes();
    await saveTmuxConfig();
  }
  
  function handleRouteDragStart(e: DragEvent, index: number) {
    draggingRouteIndex = index;
    if (e.dataTransfer && e.target instanceof HTMLElement) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      
      const clone = e.target.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.opacity = '1';
      clone.style.background = '#1c1c1c';
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.offsetX, e.offsetY);
      setTimeout(() => clone.remove(), 0);
    }
  }
  
  function handleRouteDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (draggingRouteIndex === null || draggingRouteIndex === index || !projectConfig) return;
    
    const now = Date.now();
    if (now - lastRouteSwap < 100) return;
    lastRouteSwap = now;
    
    const routes = [...projectConfig.routes];
    const [draggedRoute] = routes.splice(draggingRouteIndex, 1);
    routes.splice(index, 0, draggedRoute);
    
    for (let i = 0; i < routes.length; i++) {
      routes[i].order = i;
    }
    
    projectConfig.routes = routes;
    draggingRouteIndex = index;
  }
  
  async function handleRouteDragEnd() {
    draggingRouteIndex = null;
    await saveRoutes();
  }
  
  function handleTabDragStart(e: DragEvent, index: number) {
    draggingTabIndex = index;
    if (e.dataTransfer && e.target instanceof HTMLElement) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      
      const clone = e.target.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.opacity = '1';
      clone.style.background = '#1c1c1c';
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.offsetX, e.offsetY);
      setTimeout(() => clone.remove(), 0);
    }
  }
  
  function handleTabDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (draggingTabIndex === null || draggingTabIndex === index || !projectConfig) return;
    
    const now = Date.now();
    if (now - lastTabSwap < 100) return;
    lastTabSwap = now;
    
    const tabs = [...projectConfig.tmux_config.tabs];
    const [draggedTab] = tabs.splice(draggingTabIndex, 1);
    tabs.splice(index, 0, draggedTab);
    
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].order = i;
    }
    
    projectConfig.tmux_config.tabs = tabs;
    draggingTabIndex = index;
  }
  
  async function handleTabDragEnd() {
    draggingTabIndex = null;
    await saveTmuxConfig();
  }
  
  async function saveRoutes() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await invoke('update_project_routes', {
        projectId: selectedProjectId,
        routes: projectConfig.routes
      });
    } catch (e) {
      console.error('Failed to save routes:', e);
    }
  }
  
  async function addTmuxTab() {
    if (!projectConfig) return;
    
    const usedRouteIds = new Set(projectConfig.tmux_config.tabs.map(t => t.route_id));
    const availableRoute = projectConfig.routes.find(r => !usedRouteIds.has(r.id));
    const targetRoute = availableRoute || projectConfig.routes[0];
    
    if (!targetRoute) return;
    
    const routeName = getRouteNameFromPath(targetRoute.path);
    const tabs = projectConfig.tmux_config.tabs;
    
    const termTabIndex = tabs.findIndex(t => t.name.toLowerCase() === 'term');
    const insertPosition = termTabIndex > 0 ? termTabIndex : tabs.length;
    
    const newTab: TmuxTab = {
      id: crypto.randomUUID(),
      name: routeName,
      route_id: targetRoute.id,
      startup_command: undefined,
      order: insertPosition
    };
    
    const newTabs = [...tabs];
    newTabs.splice(insertPosition, 0, newTab);
    
    for (let i = 0; i < newTabs.length; i++) {
      newTabs[i].order = i;
    }
    
    projectConfig.tmux_config.tabs = newTabs;
    await saveTmuxConfig();
  }
  
  function isRootTab(tab: TmuxTab): boolean {
    if (!projectConfig) return false;
    const rootRoute = projectConfig.routes.find(r => isRootRoute(r));
    return rootRoute ? tab.route_id === rootRoute.id && tab.name === 'oc' : false;
  }
  
  function confirmRemoveTmuxTab(tabId: string) {
    if (!projectConfig) return;
    const tab = projectConfig.tmux_config.tabs.find(t => t.id === tabId);
    if (!tab || isRootTab(tab)) return;
    
    deleteTarget = { type: 'tab', id: tabId, name: tab.name };
    showDeleteConfirm = true;
  }
  
  async function removeTmuxTab(tabId: string) {
    if (!projectConfig) return;
    
    const tab = projectConfig.tmux_config.tabs.find(t => t.id === tabId);
    if (!tab || isRootTab(tab)) return;
    
    projectConfig.tmux_config.tabs = projectConfig.tmux_config.tabs.filter(t => t.id !== tabId);
    for (let i = 0; i < projectConfig.tmux_config.tabs.length; i++) {
      projectConfig.tmux_config.tabs[i].order = i;
    }
    await saveTmuxConfig();
  }
  
  async function saveTmuxConfig() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await invoke('update_project_tmux_config', {
        projectId: selectedProjectId,
        tmuxConfig: projectConfig.tmux_config
      });
    } catch (e) {
      console.error('Failed to save tmux config:', e);
    }
  }
  
  async function saveDescription() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await invoke('update_project', {
        projectId: selectedProjectId,
        name: projectConfig.name,
        description: projectConfig.description
      });
    } catch (e) {
      console.error('Failed to save description:', e);
    }
  }
  
  async function saveBusinessRules() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await invoke('update_project_business_rules', {
        projectId: selectedProjectId,
        rules: projectConfig.business_rules
      });
    } catch (e) {
      console.error('Failed to save business rules:', e);
    }
  }
  
  async function handleRoutePathChange(route: ProjectRoute) {
    await saveRoutes();
    
    const existingTab = projectConfig?.tmux_config.tabs.find(t => t.route_id === route.id);
    if (existingTab) {
      const newName = getRouteNameFromPath(route.path);
      existingTab.name = newName;
      await saveTmuxConfig();
    }
  }
  
  async function handleTabRouteChange(tab: TmuxTab) {
    if (!projectConfig) return;
    const route = projectConfig.routes.find(r => r.id === tab.route_id);
    if (route) {
      tab.name = getRouteNameFromPath(route.path);
    }
    await saveTmuxConfig();
  }
  
  function getRouteOptions() {
    if (!projectConfig) return [];
    return projectConfig.routes.map(r => ({ value: r.id, label: getRouteNameFromPath(r.path) }));
  }
  
  function getSortedRoutes() {
    if (!projectConfig) return [];
    return [...projectConfig.routes].sort((a, b) => a.order - b.order);
  }
  
  function getSortedTabs() {
    if (!projectConfig) return [];
    return [...projectConfig.tmux_config.tabs].sort((a, b) => a.order - b.order);
  }
  
  $effect(() => {
    if (selectedProjectId && !projectConfig) {
      loadProjectConfig(selectedProjectId);
    }
  });
</script>

<ConfirmDialog 
  show={showDeleteConfirm}
  title="Confirmar exclusao"
  message={deleteTarget ? `Tem certeza que deseja excluir ${deleteTarget.type === 'project' ? 'o projeto' : deleteTarget.type === 'route' ? 'a rota' : 'a tab'} "${deleteTarget.name}"?` : ''}
  confirmText="Excluir"
  onConfirm={executeDelete}
  onCancel={() => { showDeleteConfirm = false; deleteTarget = null; }}
  danger={true}
/>

{#if isLoading}
  <div class="flex items-center justify-center h-full text-[#828282]">
    Carregando...
  </div>
{:else if projectConfig}
  <div class="flex-shrink-0 p-4 pb-2 border-b border-[#3d3a34] bg-[#1c1c1c]">
    <div class="flex items-center gap-3">
      <a 
        href="/projects" 
        class="p-1 text-[#636363] hover:text-[#909d63] hover:bg-[#2c2c2c] transition-colors rounded"
        title="Voltar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </a>
      <div>
        <h2 class="text-xl text-[#d6d6d6]">Configuracoes: {projectConfig.name}</h2>
        <p class="text-sm text-[#636363]">{projectConfig.path}</p>
      </div>
    </div>
  </div>
  
  <div class="flex-1 overflow-y-auto p-4">
    <div class="space-y-4">
    
    <div class="bg-[#232323] border border-[#3d3a34] p-4">
      <h3 class="text-sm text-[#828282] uppercase tracking-wide mb-3">Descricao do Projeto</h3>
      <textarea 
        bind:value={projectConfig.description}
        onblur={saveDescription}
        placeholder="Breve descricao do projeto..."
        rows="3"
        class="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm resize-y focus:border-[#909d63] focus:outline-none"
      ></textarea>
    </div>
    
    <div class="bg-[#232323] border border-[#3d3a34] p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm text-[#828282] uppercase tracking-wide">Rotas</h3>
        <button 
          onclick={addRoute}
          class="text-xs text-[#909d63] hover:text-[#a0ad73] transition-colors"
        >
          + Adicionar
        </button>
      </div>
      
      <div class="space-y-1" role="list">
        {#each getSortedRoutes() as route, index (route.id)}
          {@const routeName = getRouteNameFromPath(route.path)}
          {@const isRoot = isRootRoute(route)}
          {@const isDragging = draggingRouteIndex === index}
          <div 
            role="listitem"
            class="flex items-center gap-2 bg-[#1c1c1c] p-2 border border-[#2d2a24] cursor-grab {isDragging ? 'opacity-10' : ''}"
            draggable="true"
            ondragstart={(e) => handleRouteDragStart(e, index)}
            ondragover={(e) => handleRouteDragOver(e, index)}
            ondragend={handleRouteDragEnd}
            animate:flip={{ duration: 200 }}
          >
            <span class="text-[#4a4a4a] cursor-grab select-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="2"></circle>
                <circle cx="9" cy="12" r="2"></circle>
                <circle cx="9" cy="19" r="2"></circle>
                <circle cx="15" cy="5" r="2"></circle>
                <circle cx="15" cy="12" r="2"></circle>
                <circle cx="15" cy="19" r="2"></circle>
              </svg>
            </span>
            <span class="w-24 px-2 py-1 text-[#d6d6d6] text-sm {isRoot ? 'text-[#636363]' : ''}">
              {isRoot ? 'root' : routeName}
            </span>
            <input 
              type="text"
              bind:value={route.path}
              onblur={() => handleRoutePathChange(route)}
              disabled={isRoot}
              class="flex-1 px-2 py-1 bg-transparent border border-transparent text-[#828282] text-sm focus:border-[#3d3a34] focus:outline-none disabled:text-[#636363]"
            />
            {#if route.env_path}
              <button 
                onclick={() => route.env_path && openEnvFile(route.env_path)}
                class="px-2 py-1 text-xs text-[#636363] hover:text-[#ebc17a] transition-colors"
              >
                .env
              </button>
            {/if}
            {#if !isRoot}
              <button 
                onclick={() => confirmRemoveRoute(route.id)}
                class="px-2 py-1 text-[#636363] hover:text-[#bc5653] transition-colors"
              >
                x
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="bg-[#232323] border border-[#3d3a34] p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm text-[#828282] uppercase tracking-wide">Tabs do Tmux</h3>
          <p class="text-xs text-[#636363]">Session: {projectConfig.tmux_config.session_name}</p>
        </div>
        <button 
          onclick={addTmuxTab}
          class="text-xs text-[#909d63] hover:text-[#a0ad73] transition-colors"
        >
          + Adicionar
        </button>
      </div>
      
      <div class="space-y-1" role="list">
        {#each getSortedTabs() as tab, index (tab.id)}
          {@const isOcTab = isRootTab(tab)}
          {@const isDragging = draggingTabIndex === index}
          <div 
            role="listitem"
            class="flex items-center gap-2 bg-[#1c1c1c] p-2 border border-[#2d2a24] cursor-grab {isDragging ? 'opacity-10' : ''}"
            draggable="true"
            ondragstart={(e) => handleTabDragStart(e, index)}
            ondragover={(e) => handleTabDragOver(e, index)}
            ondragend={handleTabDragEnd}
            animate:flip={{ duration: 200 }}
          >
            <span class="text-[#4a4a4a] cursor-grab select-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="2"></circle>
                <circle cx="9" cy="12" r="2"></circle>
                <circle cx="9" cy="19" r="2"></circle>
                <circle cx="15" cy="5" r="2"></circle>
                <circle cx="15" cy="12" r="2"></circle>
                <circle cx="15" cy="19" r="2"></circle>
              </svg>
            </span>
            <span class="text-[#636363] text-sm w-6">{index + 1}.</span>
            <input 
              type="text"
              bind:value={tab.name}
              onblur={saveTmuxConfig}
              placeholder="nome"
              class="w-24 px-2 py-1 bg-transparent border border-transparent text-[#d6d6d6] text-sm focus:border-[#3d3a34] focus:outline-none"
            />
            <span class="text-[#636363]">-></span>
            <Select
              bind:value={tab.route_id}
              options={getRouteOptions()}
              onchange={() => handleTabRouteChange(tab)}
            />
            <span class="text-[#636363] text-xs">cmd:</span>
            <input 
              type="text"
              bind:value={tab.startup_command}
              onblur={saveTmuxConfig}
              placeholder="-"
              class="flex-1 px-2 py-1 bg-transparent border border-transparent text-[#828282] text-sm focus:border-[#3d3a34] focus:outline-none"
            />
            {#if !isOcTab}
              <button 
                onclick={() => confirmRemoveTmuxTab(tab.id)}
                class="px-2 py-1 text-[#636363] hover:text-[#bc5653] transition-colors"
              >
                x
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="bg-[#232323] border border-[#3d3a34] p-4">
      <h3 class="text-sm text-[#828282] uppercase tracking-wide mb-3">Resumo da Aplicacao</h3>
      <textarea 
        bind:value={projectConfig.business_rules}
        onblur={saveBusinessRules}
        placeholder="Documente aqui o resumo da aplicacao, regras de negocio, arquitetura, etc..."
        rows="8"
        class="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm resize-y focus:border-[#909d63] focus:outline-none"
      ></textarea>
    </div>
    
    <div class="bg-[#232323] border border-[#bc5653]/30 p-4">
      <h3 class="text-sm text-[#bc5653] uppercase tracking-wide mb-3">Zona de Perigo</h3>
      <p class="text-xs text-[#636363] mb-4">
        Acao irreversivel. Ao excluir o projeto, todas as tarefas associadas tambem serao removidas.
      </p>
      <button 
        onclick={confirmDeleteProject}
        class="px-4 py-2 bg-[#2c2c2c] border border-[#bc5653] text-[#bc5653] text-sm hover:bg-[#bc5653] hover:text-[#1c1c1c] transition-colors"
      >
        Excluir Projeto
      </button>
    </div>
    </div>
  </div>
{:else}
  <div class="flex items-center justify-center h-full text-[#828282]">
    Selecione um projeto
  </div>
{/if}
