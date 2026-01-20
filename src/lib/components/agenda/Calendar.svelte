<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { CalendarTask } from '$lib/types';
  import { currentMonth, draggedTask } from '$lib/stores/agenda';
  import CalendarDay from './CalendarDay.svelte';
  
  interface Props {
    projectId?: string | null;
    onTasksChanged?: () => void;
  }
  
  let { projectId = null, onTasksChanged }: Props = $props();
  
  let tasks: CalendarTask[] = $state([]);
  let isLoading = $state(true);
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  let calendarDays = $derived(generateCalendarDays($currentMonth.year, $currentMonth.month));
  let monthName = $derived(monthNames[$currentMonth.month - 1]);
  
  function generateCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: Array<{ date: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }
    
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const remainingDays = 42 - days.length;
    
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  }
  
  function getTasksForDate(date: string): CalendarTask[] {
    return tasks.filter(t => t.scheduled_date === date);
  }
  
  async function loadTasks() {
    isLoading = true;
    try {
      tasks = await invoke('get_tasks_for_month', {
        year: $currentMonth.year,
        month: $currentMonth.month,
        projectId
      });
    } catch (e) {
      console.error('Failed to load calendar tasks:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function handleDrop(taskId: string, date: string) {
    try {
      await invoke('schedule_task', { taskId, scheduledDate: date });
      await loadTasks();
      onTasksChanged?.();
    } catch (e) {
      console.error('Failed to schedule task:', e);
    }
    draggedTask.set(null);
  }
  
  function previousMonth() {
    currentMonth.update(m => {
      if (m.month === 1) {
        return { year: m.year - 1, month: 12 };
      }
      return { year: m.year, month: m.month - 1 };
    });
  }
  
  function nextMonth() {
    currentMonth.update(m => {
      if (m.month === 12) {
        return { year: m.year + 1, month: 1 };
      }
      return { year: m.year, month: m.month + 1 };
    });
  }
  
  function goToToday() {
    const today = new Date();
    currentMonth.set({
      year: today.getFullYear(),
      month: today.getMonth() + 1
    });
  }
  
  $effect(() => {
    loadTasks();
  });
  
  export function refresh() {
    loadTasks();
  }
</script>

<div class="flex flex-col h-full">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <button onclick={previousMonth} class="p-1 text-[#828282] hover:text-[#d6d6d6] transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <h2 class="text-lg font-medium text-[#d6d6d6] min-w-[180px] text-center">
        {monthName} {$currentMonth.year}
      </h2>
      <button onclick={nextMonth} class="p-1 text-[#828282] hover:text-[#d6d6d6] transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
    </div>
    <button onclick={goToToday} class="px-3 py-1 text-sm bg-[#232323] text-[#d6d6d6] border border-[#3d3a34] hover:bg-[#2a2a2a] transition-colors">
      Hoje
    </button>
  </div>
  
  <div class="grid grid-cols-7 mb-1">
    {#each weekDays as day}
      <div class="text-center text-xs text-[#828282] py-1">{day}</div>
    {/each}
  </div>
  
  <div class="grid grid-cols-7 flex-1">
    {#each calendarDays as day (day.date)}
      <CalendarDay
        date={day.date}
        dayNumber={day.dayNumber}
        isCurrentMonth={day.isCurrentMonth}
        isToday={day.isToday}
        tasks={getTasksForDate(day.date)}
        onDrop={handleDrop}
      />
    {/each}
  </div>
</div>
