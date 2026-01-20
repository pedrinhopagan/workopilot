<script lang="ts">
  import { page } from '$app/stores';
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import { setDialogOpen } from '$lib/stores/dialogState';
  import { selectedProjectId as selectedProjectIdStore, projectsList } from '$lib/stores/selectedProject';
  import type { Project, ProjectWithConfig, Task, SessionLog } from '$lib/types';
  
  let projects: Project[] = $state([]);
  let selectedProjectId: string | null = $state(null);
  let projectConfig: ProjectWithConfig | null = $state(null);
  let isLoading = $state(false);
  let showNewProjectForm = $state(false);
  let newProjectName = $state('');
  let newProjectPath = $state('');
  
  let urgentTasks: Task[] = $state([]);
  let logs: SessionLog[] = $state([]);
  let dailyTokens = $state(0);
  let tokenGoal = $state(100000);
  
  let isEditingProjectName = $state(false);
  let editedProjectName = $state('');
  
  let tokenPercentage = $derived(Math.min((dailyTokens / tokenGoal) * 100, 100));
  let lastLog = $derived(logs.length > 0 ? logs[0] : null);
  let isTmuxConfigured = $derived.by(() => {
    if (!projectConfig) return false;
    return projectConfig.tmux_configured || projectConfig.routes.length > 1;
  });
  
  const priorities = [
    { value: 1, label: 'Alta', color: 'bg-[#bc5653]' },
    { value: 2, label: 'Media', color: 'bg-[#ebc17a]' },
    { value: 3, label: 'Baixa', color: 'bg-[#8b7355]' }
  ];
  
  selectedProjectIdStore.subscribe(value => {
    if (value && value !== selectedProjectId) {
      selectedProjectId = value;
      loadProjectConfig(value);
    }
  });
  
  projectsList.subscribe(value => {
    projects = value;
  });
  
  // Check URL for newProject param
  let shouldShowNewProject = $derived($page.url.searchParams.get('newProject') === 'true');
  
  $effect(() => {
    if (shouldShowNewProject) {
      showNewProjectForm = true;
    }
  });
  
  function getPriorityClass(priority: number): string {
    const p = priorities.find(pr => pr.value === priority);
    return p?.color || 'bg-[#8b7355]';
  }
  
  function formatTokens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function formatDueDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Atrasada';
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanha';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  
  function isDueOverdue(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
  
  async function loadProjectConfig(id: string) {
    isLoading = true;
    try {
      projectConfig = await invoke('get_project_with_config', { projectId: id });
      await loadUrgentTasks();
      await loadLogs();
    } catch (e) {
      console.error('Failed to load project config:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function loadUrgentTasks() {
    if (!selectedProjectId) return;
    try {
      urgentTasks = await invoke('get_urgent_tasks', { projectId: selectedProjectId, limit: 5 });
    } catch (e) {
      console.error('Failed to load urgent tasks:', e);
      urgentTasks = [];
    }
  }
  
  async function loadLogs() {
    try {
      const allLogs: SessionLog[] = await invoke('get_session_logs');
      logs = allLogs.filter(log => {
        if (!projectConfig) return false;
        return log.project_name === projectConfig.name;
      }).slice(0, 5);
      dailyTokens = allLogs.reduce((sum, log) => sum + log.tokens_total, 0);
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  }
  
  async function launchTmux() {
    if (!selectedProjectId) return;
    try {
      await invoke('launch_project_tmux', { projectId: selectedProjectId });
    } catch (e) {
      console.error('Failed to launch tmux:', e);
    }
  }
  
  async function markTmuxConfigured() {
    if (!selectedProjectId || !projectConfig) return;
    try {
      await invoke('set_tmux_configured', { projectId: selectedProjectId, configured: true });
      projectConfig.tmux_configured = true;
    } catch (e) {
      console.error('Failed to mark tmux as configured:', e);
    }
  }
  
  async function pickDirectory() {
    try {
      setDialogOpen(true);
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecionar diretorio do projeto"
      });
      if (selected && typeof selected === 'string') {
        newProjectPath = selected;
        if (!newProjectName) {
          const parts = selected.split('/');
          newProjectName = parts[parts.length - 1] || '';
        }
      }
    } catch (e) {
      console.error('Failed to pick directory:', e);
    } finally {
      setDialogOpen(false);
    }
  }
  
  async function createProject() {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;
    
    try {
      const id = await invoke<string>('add_project', {
        name: newProjectName,
        path: newProjectPath,
        description: null
      });
      
      const loaded: Project[] = await invoke('get_projects');
      projectsList.set(loaded);
      selectedProjectIdStore.set(id);
      showNewProjectForm = false;
      newProjectName = '';
      newProjectPath = '';
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  }
  
  async function startEditProjectName() {
    if (!projectConfig) return;
    editedProjectName = projectConfig.name;
    isEditingProjectName = true;
  }
  
  async function saveProjectName() {
    if (!selectedProjectId || !projectConfig || !editedProjectName.trim()) return;
    
    try {
      await invoke('update_project_name', {
        projectId: selectedProjectId,
        name: editedProjectName.trim()
      });
      projectConfig.name = editedProjectName.trim();
      
      const updated = projects.map(p => 
        p.id === selectedProjectId ? { ...p, name: editedProjectName.trim() } : p
      );
      projectsList.set(updated);
    } catch (e) {
      console.error('Failed to update project name:', e);
    } finally {
      isEditingProjectName = false;
    }
  }
  
  function cancelEditProjectName() {
    isEditingProjectName = false;
    editedProjectName = '';
  }
  
  $effect(() => {
    if (selectedProjectId && !projectConfig) {
      loadProjectConfig(selectedProjectId);
    }
  });
</script>

<div class="flex-1 overflow-y-auto p-4">
  {#if showNewProjectForm}
    <div class="max-w-xl bg-[#232323] border border-[#3d3a34] p-4">
      <h2 class="text-lg text-[#d6d6d6] mb-4">Novo Projeto</h2>
      
      <div class="space-y-3">
        <div>
          <label class="block text-xs text-[#828282] mb-1">Nome</label>
          <input 
            type="text"
            bind:value={newProjectName}
            placeholder="meu-projeto"
            class="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
          />
        </div>
        
        <div>
          <label class="block text-xs text-[#828282] mb-1">Caminho</label>
          <div class="flex gap-2">
            <input 
              type="text"
              bind:value={newProjectPath}
              placeholder="/home/user/projects/..."
              class="flex-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
            />
            <button 
              onclick={pickDirectory}
              class="px-3 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] hover:border-[#636363] transition-colors"
            >
              ...
            </button>
          </div>
        </div>
        
        <div class="flex gap-2 pt-2">
          <button 
            onclick={createProject}
            class="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors"
          >
            Criar
          </button>
          <button 
            onclick={() => { showNewProjectForm = false; newProjectName = ''; newProjectPath = ''; }}
            class="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center h-full text-[#828282]">
      Carregando...
    </div>
  {:else if projectConfig}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          {#if isEditingProjectName}
            <div class="flex items-center gap-2">
              <input 
                type="text"
                bind:value={editedProjectName}
                onkeydown={(e) => { if (e.key === 'Enter') saveProjectName(); if (e.key === 'Escape') cancelEditProjectName(); }}
                class="px-2 py-1 bg-[#1c1c1c] border border-[#909d63] text-[#d6d6d6] text-xl focus:outline-none"
              />
              <button onclick={saveProjectName} class="text-[#909d63] hover:text-[#a0ad73] text-sm">ok</button>
              <button onclick={cancelEditProjectName} class="text-[#636363] hover:text-[#828282] text-sm">x</button>
            </div>
          {:else}
            <div class="flex items-center gap-2">
              <h2 class="text-xl text-[#d6d6d6]">{projectConfig.name}</h2>
              <button 
                onclick={startEditProjectName}
                class="text-[#636363] hover:text-[#909d63] text-xs transition-colors"
                title="Editar nome"
              >
                *
              </button>
            </div>
          {/if}
          <p class="text-sm text-[#636363]">{projectConfig.path}</p>
        </div>
        <div class="flex gap-2">
          <button 
            onclick={launchTmux}
            class="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors flex items-center gap-2"
          >
            Codar
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <a 
            href="/projects/settings?projectId={selectedProjectId}"
            class="px-3 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] hover:border-[#636363] transition-colors flex items-center"
            title="Configuracoes do projeto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </a>
        </div>
      </div>
      
      <div class="bg-[#232323] border border-[#3d3a34] p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm text-[#828282] uppercase tracking-wide">Tarefas Urgentes</h3>
          <a href="/tasks" class="text-xs text-[#636363] hover:text-[#909d63] transition-colors">
            ver todas
          </a>
        </div>
        
        {#if urgentTasks.length > 0}
          <div class="space-y-2">
            {#each urgentTasks as task}
              <div class="flex items-center gap-3 px-3 py-2 bg-[#1c1c1c] border border-[#2d2a24]">
                <span class="flex-1 text-[#d6d6d6] text-sm">{task.title}</span>
                {#if task.due_date}
                  <span class="text-xs {isDueOverdue(task.due_date) ? 'text-[#bc5653]' : 'text-[#636363]'}">
                    {formatDueDate(task.due_date)}
                  </span>
                {/if}
                <span class="px-2 py-0.5 text-xs text-[#1c1c1c] {getPriorityClass(task.priority)}">
                  P{task.priority}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-6">
            <p class="text-[#636363] text-sm mb-3">Nenhuma tarefa pendente</p>
            <a 
              href="/tasks"
              class="inline-block px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors"
            >
              + Adicionar tarefa
            </a>
          </div>
        {/if}
      </div>
      
      <div class="flex flex-col xs:flex-row gap-4">
        <div class="flex-1 bg-[#232323] border border-[#3d3a34] p-4">
          <h3 class="text-sm text-[#828282] uppercase tracking-wide mb-3">Tokens Diario</h3>
          <div class="h-2 bg-[#2c2c2c] overflow-hidden mb-2">
            <div 
              class="h-full bg-gradient-to-r from-[#909d63] to-[#c67b5c] transition-all"
              style="width: {tokenPercentage}%"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-[#636363]">
            <span>{formatTokens(dailyTokens)}</span>
            <span>Meta: {formatTokens(tokenGoal)}</span>
          </div>
        </div>
        
        <div class="flex-1 bg-[#232323] border border-[#3d3a34] p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm text-[#828282] uppercase tracking-wide">Ultimo Log</h3>
            <a href="/logs" class="text-xs text-[#636363] hover:text-[#909d63] transition-colors">
              ver todos
            </a>
          </div>
          {#if lastLog}
            <p class="text-sm text-[#d6d6d6] line-clamp-2">{lastLog.summary || 'Sem resumo'}</p>
            <p class="text-xs text-[#636363] mt-2">
              {formatDate(lastLog.created_at)} - {formatTokens(lastLog.tokens_total)} tokens
            </p>
          {:else}
            <p class="text-[#636363] text-sm">Nenhum log registrado</p>
          {/if}
        </div>
      </div>
      
      <div class="bg-[#232323] border border-[#3d3a34] p-4">
        <h3 class="text-sm text-[#828282] uppercase tracking-wide mb-3">Tarefas da Semana</h3>
        <div class="flex items-center justify-center py-6 text-center">
          <div>
            <div class="text-3xl mb-2">📅</div>
            <p class="text-[#636363] text-sm">Em desenvolvimento</p>
            <p class="text-xs text-[#4a4a4a] mt-1">Calendario com distribuicao de tarefas</p>
          </div>
        </div>
      </div>
      
      <div class="bg-[#232323] border border-[#3d3a34] p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm text-[#828282] uppercase tracking-wide">Configuracao Tmux</h3>
          <a href="/projects/settings?projectId={selectedProjectId}" class="text-xs text-[#636363] hover:text-[#909d63] transition-colors">
            configurar
          </a>
        </div>
        
        {#if isTmuxConfigured}
          <div class="flex items-center gap-3">
            <span class="text-[#909d63]">✓</span>
            <span class="text-[#d6d6d6] text-sm">Tmux configurado</span>
            <span class="text-xs text-[#636363]">
              {projectConfig.routes.length} rota(s), {projectConfig.tmux_config.tabs.length} tab(s)
            </span>
          </div>
        {:else}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-[#ebc17a]">!</span>
              <span class="text-[#d6d6d6] text-sm">Tmux nao configurado</span>
            </div>
            <button 
              onclick={markTmuxConfigured}
              class="text-xs text-[#909d63] hover:text-[#a0ad73] transition-colors"
            >
              Marcar como configurado
            </button>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-[#828282]">
      Selecione um projeto ou crie um novo
    </div>
  {/if}
</div>
