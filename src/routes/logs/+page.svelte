<script lang="ts">
  import TabBar from '$lib/components/TabBar.svelte';
  import { invoke } from "@tauri-apps/api/core";
  import type { SessionLog } from '$lib/types';
  
  let logs: SessionLog[] = $state([]);
  let selectedLog: SessionLog | null = $state(null);
  let dailyTokens = $state(0);
  let tokenGoal = $state(100000);
  
  let tokenPercentage = $derived(Math.min((dailyTokens / tokenGoal) * 100, 100));
  
  async function loadLogs() {
    try {
      logs = await invoke('get_session_logs');
      dailyTokens = logs.reduce((sum, log) => sum + log.tokens_total, 0);
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
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
  
  function formatTokens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }
  
  $effect(() => {
    loadLogs();
  });
</script>

<TabBar />

<main class="flex flex-1 overflow-hidden">
  <aside class="w-72 border-r border-[#3d3a34] flex flex-col bg-[#232323]">
    <div class="p-3 border-b border-[#3d3a34]">
      <div class="text-xs text-[#828282] uppercase tracking-wide mb-2">Tokens Hoje</div>
      <div class="h-1.5 bg-[#2c2c2c] overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-[#909d63] to-[#c67b5c] transition-all"
          style="width: {tokenPercentage}%"
        ></div>
      </div>
      <div class="flex justify-between mt-1 text-xs text-[#636363]">
        <span>{formatTokens(dailyTokens)}</span>
        <span>Meta: {formatTokens(tokenGoal)}</span>
      </div>
    </div>
    
    <div class="p-3 border-b border-[#3d3a34]">
      <span class="text-xs text-[#828282] uppercase tracking-wide">Sessions</span>
    </div>
    
    <ul class="flex-1 overflow-y-auto">
      {#each logs as log}
        <li>
          <button 
            class="w-full px-3 py-2 text-left transition-colors border-b border-[#2d2a24] {selectedLog?.id === log.id ? 'bg-[#909d63] text-[#1c1c1c]' : 'hover:bg-[#333333]'}"
            onclick={() => selectedLog = log}
          >
            <div class="text-sm {selectedLog?.id === log.id ? 'text-[#1c1c1c]' : 'text-[#d6d6d6]'}">{log.project_name}</div>
            <div class="flex justify-between text-xs {selectedLog?.id === log.id ? 'text-[#1c1c1c] opacity-70' : 'text-[#636363]'}">
              <span>{formatDate(log.created_at)}</span>
              <span>{formatTokens(log.tokens_total)} tokens</span>
            </div>
          </button>
        </li>
      {/each}
      
      {#if logs.length === 0}
        <li class="px-3 py-4 text-[#636363] text-sm text-center">
          Nenhum log encontrado.<br/>
          Use /log-session no opencode.
        </li>
      {/if}
    </ul>
  </aside>
  
  <section class="flex-1 overflow-y-auto p-4">
    {#if selectedLog}
      <div class="max-w-2xl">
        <div class="mb-4">
          <h2 class="text-xl text-[#d6d6d6]">{selectedLog.project_name}</h2>
          <p class="text-sm text-[#636363]">
            {formatDate(selectedLog.created_at)} • {formatTokens(selectedLog.tokens_total)} tokens
          </p>
        </div>
        
        <div class="bg-[#232323] border border-[#3d3a34] p-4 mb-4">
          <h3 class="text-xs text-[#828282] uppercase tracking-wide mb-2">Resumo</h3>
          <p class="text-sm text-[#d6d6d6]">{selectedLog.summary}</p>
        </div>
        
        <div class="bg-[#232323] border border-[#3d3a34] p-4">
          <h3 class="text-xs text-[#828282] uppercase tracking-wide mb-2">Arquivos Modificados</h3>
          <ul class="space-y-1">
            {#each selectedLog.files_modified as file}
              <li class="flex items-center gap-2 text-sm">
                <span class="w-5 h-5 flex items-center justify-center text-xs {file.action === 'created' ? 'bg-[#909d63] text-[#1c1c1c]' : file.action === 'deleted' ? 'bg-[#bc5653] text-[#1c1c1c]' : 'bg-[#ebc17a] text-[#1c1c1c]'}">
                  {file.action === 'created' ? '+' : file.action === 'deleted' ? '-' : '~'}
                </span>
                <code class="text-[#828282]">{file.path}</code>
              </li>
            {/each}
            
            {#if selectedLog.files_modified.length === 0}
              <li class="text-[#636363] text-sm">Nenhum arquivo modificado registrado</li>
            {/if}
          </ul>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center h-full text-[#828282]">
        Selecione um log para ver os detalhes
      </div>
    {/if}
  </section>
</main>
