<script lang="ts">
  import TabBar from '$lib/components/TabBar.svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { setDialogOpen } from '$lib/stores/dialogState';
  
  function handleSelectFocus() {
    setDialogOpen(true);
  }
  
  function handleSelectBlur() {
    setTimeout(() => setDialogOpen(false), 100);
  }
  
  interface ShortcutConfig {
    modifier: string;
    key: string;
    display: string;
  }
  
  let currentShortcut: ShortcutConfig | null = $state(null);
  let newShortcut = $state('');
  let isEditing = $state(false);
  let error = $state('');
  let success = $state('');
  
  const modifiers = ['Alt', 'Ctrl', 'Shift', 'Super'];
  const keys = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Space', 'Escape'
  ];
  
  let selectedModifier = $state('Alt');
  let selectedKey = $state('P');
  
  async function loadShortcut() {
    try {
      currentShortcut = await invoke('get_shortcut');
      if (currentShortcut) {
        selectedModifier = currentShortcut.modifier;
        selectedKey = currentShortcut.key;
      }
    } catch (e) {
      console.error('Failed to load shortcut:', e);
    }
  }
  
  async function saveShortcut() {
    error = '';
    success = '';
    const shortcutStr = `${selectedModifier}+${selectedKey}`;
    
    try {
      currentShortcut = await invoke('set_shortcut', { shortcut: shortcutStr });
      success = 'Atalho salvo com sucesso!';
      isEditing = false;
      setTimeout(() => { success = ''; }, 3000);
    } catch (e) {
      error = String(e);
    }
  }
  
  function cancelEdit() {
    isEditing = false;
    error = '';
    if (currentShortcut) {
      selectedModifier = currentShortcut.modifier;
      selectedKey = currentShortcut.key;
    }
  }
  
  $effect(() => {
    loadShortcut();
  });
</script>

<TabBar />

<main class="flex-1 overflow-y-auto p-4">
  <div class="max-w-xl">
    <div class="mb-6">
      <h1 class="text-xl text-[#d6d6d6] mb-1">Configuracoes</h1>
      <p class="text-sm text-[#636363]">Configuracoes globais da aplicacao</p>
    </div>
    
    <div class="bg-[#232323] border border-[#3d3a34] p-4">
      <h2 class="text-sm text-[#828282] uppercase tracking-wide mb-4">Atalho Global</h2>
      <p class="text-xs text-[#636363] mb-4">
        Define o atalho de teclado para abrir/fechar o WorkoPilot de qualquer lugar.
      </p>
      
      {#if !isEditing}
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <span class="text-xs text-[#636363]">Atalho atual:</span>
            <div class="mt-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm inline-block">
              {currentShortcut?.display || 'Alt+P'}
            </div>
          </div>
          <button 
            onclick={() => isEditing = true}
            class="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] hover:border-[#636363] transition-colors"
          >
            Alterar
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <div>
              <label class="block text-xs text-[#636363] mb-1">Modificador</label>
              <select 
                bind:value={selectedModifier}
                onfocus={handleSelectFocus}
                onblur={handleSelectBlur}
                class="px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
              >
                {#each modifiers as mod}
                  <option value={mod}>{mod}</option>
                {/each}
              </select>
            </div>
            <span class="text-[#636363] mt-5">+</span>
            <div>
              <label class="block text-xs text-[#636363] mb-1">Tecla</label>
              <select 
                bind:value={selectedKey}
                onfocus={handleSelectFocus}
                onblur={handleSelectBlur}
                class="px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
              >
                {#each keys as key}
                  <option value={key}>{key}</option>
                {/each}
              </select>
            </div>
          </div>
          
          <div class="text-sm text-[#828282]">
            Preview: <span class="text-[#909d63]">{selectedModifier}+{selectedKey}</span>
          </div>
          
          {#if error}
            <div class="text-sm text-[#bc5653]">{error}</div>
          {/if}
          
          <div class="flex gap-2">
            <button 
              onclick={saveShortcut}
              class="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors"
            >
              Salvar
            </button>
            <button 
              onclick={cancelEdit}
              class="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      {/if}
      
      {#if success}
        <div class="mt-3 text-sm text-[#909d63]">{success}</div>
      {/if}
    </div>
  </div>
</main>
