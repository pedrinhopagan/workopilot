<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import Select from '$lib/components/Select.svelte';
  import SubtaskList from '$lib/components/tasks/SubtaskList.svelte';
  import type { Task, TaskFull, ProjectWithConfig, Subtask, TaskUpdatedPayload } from '$lib/types';
  
  let taskId = $derived($page.params.id);
  let task: Task | null = $state(null);
  let taskFull: TaskFull | null = $state(null);
  let projectPath: string | null = $state(null);
  let isLoading = $state(true);
  let isSaving = $state(false);
  let newRule = $state('');
  let newCriteria = $state('');
  let showTechnicalNotes = $state(false);
  let showAcceptanceCriteria = $state(false);
  let aiUpdatedRecently = $state(false);
  let conflictWarning = $state(false);
  let isSyncing = $state(false);
  let syncSuccess = $state(false);
  let unlisten: UnlistenFn | null = null;
  let lastKnownModifiedAt: string | null = null;
  
  const categories = ['feature', 'bug', 'refactor', 'test', 'docs'];
  const priorities = [
    { value: 1, label: 'Alta' },
    { value: 2, label: 'Média' },
    { value: 3, label: 'Baixa' }
  ];
  
  async function loadTask(isReload = false) {
    if (!isReload) isLoading = true;
    try {
      task = await invoke('get_task_by_id', { taskId });
      
      if (task?.project_id) {
        const project: ProjectWithConfig = await invoke('get_project_with_config', { projectId: task.project_id });
        projectPath = project.path;
        
        taskFull = await invoke('get_task_full', { projectPath, taskId });
        lastKnownModifiedAt = taskFull?.modified_at || null;
        
        if (taskFull?.modified_by === 'ai') {
          aiUpdatedRecently = true;
          setTimeout(() => { aiUpdatedRecently = false; }, 5000);
        }
        
        if (!isReload) {
          showTechnicalNotes = !!taskFull?.context.technical_notes;
          showAcceptanceCriteria = !!taskFull?.context.acceptance_criteria?.length;
        }
        
        await invoke('start_watching_project', { projectPath });
      }
    } catch (e) {
      console.error('Failed to load task:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function syncFromFile() {
    if (!projectPath || !taskId) return;
    
    isSyncing = true;
    try {
      const freshTask: TaskFull = await invoke('get_task_full', { projectPath, taskId });
      taskFull = freshTask;
      lastKnownModifiedAt = freshTask.modified_at || null;
      
      showTechnicalNotes = !!freshTask.context.technical_notes;
      showAcceptanceCriteria = !!freshTask.context.acceptance_criteria?.length;
      
      syncSuccess = true;
      setTimeout(() => { syncSuccess = false; }, 2000);
    } catch (e) {
      console.error('Failed to sync from file:', e);
    } finally {
      isSyncing = false;
    }
  }
  
  async function saveTask() {
    if (!taskFull || !projectPath) return;
    
    if (lastKnownModifiedAt && taskFull.modified_at && lastKnownModifiedAt !== taskFull.modified_at) {
      if (taskFull.modified_by === 'ai') {
        conflictWarning = true;
        setTimeout(() => { conflictWarning = false; }, 8000);
      }
    }
    
    isSaving = true;
    try {
      const taskToSave = {
        ...taskFull,
        modified_at: new Date().toISOString(),
        modified_by: 'user' as const
      };
      await invoke('update_task_and_sync', { projectPath, task: taskToSave });
      lastKnownModifiedAt = taskToSave.modified_at;
      taskFull = taskToSave;
    } catch (e) {
      console.error('Failed to save task:', e);
    } finally {
      isSaving = false;
    }
  }
  
  async function setupEventListener() {
    unlisten = await listen<TaskUpdatedPayload>('task-updated', (event) => {
      if (event.payload.task_id === taskId && event.payload.source === 'ai') {
        console.log('[WorkoPilot] Task updated by AI, reloading...');
        loadTask(true);
      }
    });
  }
  
  async function cleanup() {
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
    if (projectPath) {
      await invoke('stop_watching_project', { projectPath }).catch(() => {});
    }
  }
  
  onDestroy(() => {
    cleanup();
  });
  
  async function updateField<K extends keyof TaskFull>(field: K, value: TaskFull[K]) {
    if (!taskFull) return;
    taskFull = { ...taskFull, [field]: value };
    await saveTask();
  }
  
  async function updateContext<K extends keyof TaskFull['context']>(field: K, value: TaskFull['context'][K]) {
    if (!taskFull) return;
    taskFull = { 
      ...taskFull, 
      context: { ...taskFull.context, [field]: value }
    };
    await saveTask();
  }
  
  function addRule() {
    if (!newRule.trim() || !taskFull) return;
    const newRules = [...taskFull.context.business_rules, newRule.trim()];
    newRule = '';
    updateContext('business_rules', newRules);
  }
  
  function removeRule(index: number) {
    if (!taskFull) return;
    const newRules = taskFull.context.business_rules.filter((_, i) => i !== index);
    updateContext('business_rules', newRules);
  }
  
  function addCriteria() {
    if (!newCriteria.trim() || !taskFull) return;
    const current = taskFull.context.acceptance_criteria || [];
    const newList = [...current, newCriteria.trim()];
    newCriteria = '';
    updateContext('acceptance_criteria', newList);
  }
  
  function removeCriteria(index: number) {
    if (!taskFull) return;
    const current = taskFull.context.acceptance_criteria || [];
    const newList = current.filter((_, i) => i !== index);
    updateContext('acceptance_criteria', newList.length > 0 ? newList : null);
  }
  
  function addSubtask(title: string) {
    if (!taskFull) return;
    const nextOrder = taskFull.subtasks.length > 0 
      ? Math.max(...taskFull.subtasks.map(s => s.order)) + 1 
      : 0;
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title,
      status: 'pending',
      order: nextOrder,
      description: null,
      acceptance_criteria: null,
      technical_notes: null,
      prompt_context: null,
      created_at: new Date().toISOString(),
      completed_at: null
    };
    const newList = [...taskFull.subtasks, newSubtask];
    updateField('subtasks', newList);
  }
  
  function toggleSubtask(id: string) {
    if (!taskFull) return;
    const newList = taskFull.subtasks.map((s: Subtask) => {
      if (s.id === id) {
        const newStatus = s.status === 'done' ? 'pending' : 'done';
        return {
          ...s,
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null
        };
      }
      return s;
    });
    updateField('subtasks', newList);
    
    // Check if all subtasks done -> suggest review
    const allDone = newList.every(s => s.status === 'done');
    if (allDone && newList.length > 0 && taskFull.status !== 'done') {
      updateField('status', 'awaiting_review');
    }
  }
  
  function removeSubtask(id: string) {
    if (!taskFull) return;
    const newList = taskFull.subtasks.filter((s: Subtask) => s.id !== id);
    for (let i = 0; i < newList.length; i++) {
      newList[i].order = i;
    }
    updateField('subtasks', newList);
  }
  
  function updateSubtask(id: string, field: keyof Subtask, value: any) {
    if (!taskFull) return;
    const newList = taskFull.subtasks.map((s: Subtask) => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    });
    updateField('subtasks', newList);
  }
  
  function reorderSubtasks(newList: Subtask[]) {
    if (!taskFull) return;
    updateField('subtasks', newList);
  }
  
  async function codarSubtask(id: string) {
    if (!task?.project_id) return;
    try {
      await invoke('launch_task_workflow', {
        projectId: task.project_id,
        taskId: task.id,
        subtaskId: id
      });
    } catch (e) {
      console.error('Failed to launch subtask workflow:', e);
    }
  }
  
  async function codarTask() {
    if (!task?.project_id) return;
    try {
      await invoke('launch_task_workflow', {
        projectId: task.project_id,
        taskId: task.id,
        subtaskId: null
      });
    } catch (e) {
      console.error('Failed to launch task workflow:', e);
    }
  }
  
  let showReviewButton = $derived(
    taskFull && 
    taskFull.subtasks.length > 0 && 
    (taskFull.status === 'awaiting_review' || taskFull.subtasks.every(s => s.status === 'done'))
  );
  
  let reviewButtonHighlighted = $derived(
    taskFull?.status === 'awaiting_review' || 
    (taskFull?.subtasks.every(s => s.status === 'done') && taskFull?.subtasks.length > 0)
  );
  
  async function reviewTask() {
    if (!task?.project_id) return;
    try {
      await invoke('launch_task_review', {
        projectId: task.project_id,
        taskId: task.id
      });
    } catch (e) {
      console.error('Failed to launch task review:', e);
    }
  }
  
  function goBack() {
    goto('/tasks');
  }
  
  function getCategoryOptions() {
    return categories.map(c => ({ value: c, label: c }));
  }
  
  function getPriorityOptions() {
    return priorities.map(p => ({ value: String(p.value), label: p.label }));
  }
  
  $effect(() => {
    if (taskId) {
      loadTask();
      setupEventListener();
    }
    
    return () => {
      cleanup();
    };
  });
</script>

{#if isLoading}
  <div class="flex-1 flex items-center justify-center text-[#636363]">
    Carregando...
  </div>
{:else if !taskFull}
  <div class="flex-1 flex flex-col items-center justify-center text-[#636363] gap-4">
    <span>Tarefa não encontrada</span>
    <button onclick={goBack} class="text-[#909d63] hover:underline">Voltar</button>
  </div>
{:else}
  <div class="flex items-center gap-3 p-3 border-b border-[#3d3a34] bg-[#1c1c1c]">
    <button
      onclick={goBack}
      class="text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
      title="Voltar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>
    
    <input
      type="text"
      bind:value={taskFull.title}
      onblur={() => updateField('title', taskFull!.title)}
      class="flex-1 bg-transparent text-[#d6d6d6] text-base font-medium focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors"
    />
    
    <button
      onclick={syncFromFile}
      disabled={isSyncing}
      class="p-1.5 text-[#636363] hover:text-[#909d63] hover:bg-[#2a2a2a] transition-colors rounded disabled:opacity-50"
      title="Sincronizar do arquivo JSON"
    >
      {#if isSyncing}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      {:else if syncSuccess}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#909d63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 16h5v5"/>
        </svg>
      {/if}
    </button>
    
    <button
      onclick={codarTask}
      class="px-4 py-1.5 text-sm bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73] transition-colors"
    >
      Codar &gt;
    </button>
    
    {#if showReviewButton}
      <button
        onclick={reviewTask}
        class="px-4 py-1.5 text-sm transition-colors {reviewButtonHighlighted ? 'bg-[#e5c07b] text-[#1c1c1c] hover:bg-[#f0d08b]' : 'bg-[#3d3a34] text-[#d6d6d6] hover:bg-[#4a4a4a]'}"
      >
        Revisar
      </button>
    {/if}
    
    <Select
      value={taskFull.category}
      options={getCategoryOptions()}
      onchange={(v) => updateField('category', v)}
    />
    
    <Select
      value={String(taskFull.priority)}
      options={getPriorityOptions()}
      onchange={(v) => updateField('priority', parseInt(v))}
    />
    
    {#if isSaving}
      <span class="text-xs text-[#636363]">Salvando...</span>
    {/if}
    
    {#if aiUpdatedRecently}
      <span class="text-xs text-[#909d63] flex items-center gap-1 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
        </svg>
        IA atualizou
      </span>
    {/if}
  </div>
  
  {#if conflictWarning}
    <div class="px-4 py-2 bg-[#3d3a34] border-b border-[#4a4a4a] text-[#d6d6d6] text-sm flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
      <span>A IA fez alteracoes nesta task. Suas edicoes podem sobrescrever as mudancas da IA.</span>
      <button onclick={() => { conflictWarning = false; }} class="ml-auto text-[#636363] hover:text-[#d6d6d6]">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
  {/if}
  
  <div class="flex-1 overflow-y-auto p-4 space-y-6">
    <section>
      <label class="block text-xs text-[#828282] uppercase tracking-wide mb-2">Descrição</label>
      <textarea
        bind:value={taskFull.context.description}
        onblur={() => updateContext('description', taskFull!.context.description)}
        placeholder="Descreva o objetivo desta tarefa..."
        rows="3"
        class="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors"
      ></textarea>
    </section>
    
    <section>
      <label class="block text-xs text-[#828282] uppercase tracking-wide mb-2">Regras de Negócio</label>
      <div class="space-y-2">
        {#each taskFull.context.business_rules as rule, i}
          <div class="flex items-center gap-2 group animate-fade-in">
            <span class="text-[#636363]">•</span>
            <span class="flex-1 text-[#d6d6d6] text-sm">{rule}</span>
            <button
              onclick={() => removeRule(i)}
              class="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        {/each}
        <div class="flex items-center gap-2">
          <span class="text-[#636363]">+</span>
          <input
            type="text"
            bind:value={newRule}
            onkeydown={(e) => e.key === 'Enter' && addRule()}
            placeholder="Adicionar regra..."
            class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a]"
          />
        </div>
      </div>
    </section>
    
    <section>
      <button 
        onclick={() => showTechnicalNotes = !showTechnicalNotes}
        class="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="transition-transform duration-200"
          style="transform: rotate({showTechnicalNotes ? 90 : 0}deg)"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        Notas Técnicas (opcional)
      </button>
      {#if showTechnicalNotes}
        <div class="animate-slide-down">
          <textarea
            bind:value={taskFull.context.technical_notes}
            onblur={() => updateContext('technical_notes', taskFull!.context.technical_notes || null)}
            placeholder="Stack, libs, padrões relevantes..."
            rows="2"
            class="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors"
          ></textarea>
        </div>
      {/if}
    </section>
    
    <section>
      <button 
        onclick={() => showAcceptanceCriteria = !showAcceptanceCriteria}
        class="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="transition-transform duration-200"
          style="transform: rotate({showAcceptanceCriteria ? 90 : 0}deg)"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        Critérios de Aceite (opcional)
      </button>
      {#if showAcceptanceCriteria}
        <div class="space-y-2 animate-slide-down">
          {#each taskFull.context.acceptance_criteria || [] as criteria, i}
            <div class="flex items-center gap-2 group animate-fade-in">
              <span class="text-[#636363]">✓</span>
              <span class="flex-1 text-[#d6d6d6] text-sm">{criteria}</span>
              <button
                onclick={() => removeCriteria(i)}
                class="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
          {/each}
          <div class="flex items-center gap-2">
            <span class="text-[#636363]">+</span>
            <input
              type="text"
              bind:value={newCriteria}
              onkeydown={(e) => e.key === 'Enter' && addCriteria()}
              placeholder="Adicionar critério..."
              class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a]"
            />
          </div>
        </div>
      {/if}
    </section>
    
    <SubtaskList
      subtasks={taskFull.subtasks}
      onAdd={addSubtask}
      onToggle={toggleSubtask}
      onRemove={removeSubtask}
      onCodar={codarSubtask}
      onUpdate={updateSubtask}
      onReorder={reorderSubtasks}
    />
    
    <section>
      <div class="flex items-center justify-between">
        <label class="block text-xs text-[#828282] uppercase tracking-wide">Configuração</label>
      </div>
      <div class="mt-2 p-3 bg-[#232323] border border-[#3d3a34]">
        <button
          onclick={() => updateField('initialized', !taskFull!.initialized)}
          class="flex items-center gap-3 w-full text-left group"
        >
          <span class="w-10 h-5 rounded-full transition-colors relative {taskFull.initialized ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-[#d6d6d6] rounded-full transition-transform {taskFull.initialized ? 'translate-x-5' : 'translate-x-0'}"></span>
          </span>
          <div class="flex-1">
            <span class="text-sm text-[#d6d6d6]">Pronta para executar</span>
            <p class="text-xs text-[#636363] mt-0.5">
              {#if taskFull.initialized}
                A IA executará diretamente sem fazer perguntas de configuração
              {:else}
                A IA fará perguntas para completar a configuração antes de executar
              {/if}
            </p>
          </div>
        </button>
      </div>
    </section>
    
    <section>
      <label class="block text-xs text-[#828282] uppercase tracking-wide mb-2">Metadados IA</label>
      <pre class="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#909d63] text-xs overflow-x-auto font-mono"><code>{JSON.stringify(taskFull.ai_metadata, null, 2)}</code></pre>
    </section>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slide-down {
    from { 
      opacity: 0;
      transform: translateY(-8px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  .animate-slide-down {
    animation: slide-down 0.2s ease-out;
  }
</style>
