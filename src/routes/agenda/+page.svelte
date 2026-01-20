<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import TabBar from '$lib/components/TabBar.svelte';
  import Calendar from '$lib/components/agenda/Calendar.svelte';
  import UnscheduledPanel from '$lib/components/agenda/UnscheduledPanel.svelte';
  import DayDrawer from '$lib/components/agenda/DayDrawer.svelte';
  import { selectedDate } from '$lib/stores/agenda';
  import type { Project } from '$lib/types';

  let projects: Project[] = $state([]);
  let calendarRef: Calendar | undefined = $state(undefined);
  let panelRef: UnscheduledPanel | undefined = $state(undefined);

  async function loadProjects() {
    try {
      projects = await invoke('get_projects');
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }

  function handleDrawerClose() {
    selectedDate.set(null);
  }

  function handleTaskScheduled() {
    calendarRef?.refresh();
    panelRef?.refresh();
  }

  function handleTaskChange() {
    calendarRef?.refresh();
    panelRef?.refresh();
  }

  $effect(() => {
    loadProjects();
  });
</script>

<TabBar />

<main class="flex-1 flex overflow-hidden">
  <!-- Unscheduled Panel (1/3) -->
  <div class="w-1/3 min-w-[280px] max-w-[360px]">
    <UnscheduledPanel
      bind:this={panelRef}
      {projects}
      onTaskScheduled={handleTaskScheduled}
    />
  </div>

  <!-- Calendar (2/3) -->
  <div class="flex-1 p-4 overflow-hidden">
    <Calendar bind:this={calendarRef} onTasksChanged={handleTaskScheduled} />
  </div>

  <!-- Day Drawer (overlay) -->
  <DayDrawer
    onClose={handleDrawerClose}
    onTaskChange={handleTaskChange}
  />
</main>
