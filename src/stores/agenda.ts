import { create } from "zustand";

type DraggedTask = {
  id: string;
  title: string;
  fromDate: string | null;
};

type AgendaState = {
  selectedDate: string | null;
  currentMonth: { year: number; month: number };
  draggedTask: DraggedTask | null;
  drawerCollapsed: boolean;
};

type AgendaActions = {
  setSelectedDate: (date: string | null) => void;
  setCurrentMonth: (month: { year: number; month: number }) => void;
  setDraggedTask: (task: DraggedTask | null) => void;
  setDrawerCollapsed: (collapsed: boolean) => void;
};

type AgendaStore = AgendaState & AgendaActions;

const now = new Date();

export const useAgendaStore = create<AgendaStore>((set) => ({
  selectedDate: null,
  currentMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
  draggedTask: null,
  drawerCollapsed: false,
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  setDraggedTask: (task) => set({ draggedTask: task }),
  setDrawerCollapsed: (collapsed) => set({ drawerCollapsed: collapsed }),
}));
