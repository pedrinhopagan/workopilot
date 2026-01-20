import { writable } from "svelte/store";

export const selectedDate = writable<string | null>(null);

export const currentMonth = writable<{ year: number; month: number }>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
});

export const draggedTask = writable<{
  id: string;
  title: string;
  fromDate: string | null;
} | null>(null);

export const drawerCollapsed = writable<boolean>(false);
