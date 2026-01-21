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
  // AI Distribution state
  selectedTaskIds: Set<string>;
  selectedDates: Set<string>;
  isDistributionMode: boolean;
  isDistributing: boolean;
};

type AgendaActions = {
  setSelectedDate: (date: string | null) => void;
  setCurrentMonth: (month: { year: number; month: number }) => void;
  setDraggedTask: (task: DraggedTask | null) => void;
  setDrawerCollapsed: (collapsed: boolean) => void;
  // AI Distribution actions
  toggleTaskSelection: (taskId: string) => void;
  selectAllTasks: (taskIds: string[]) => void;
  clearTaskSelection: () => void;
  toggleDateSelection: (date: string) => void;
  clearDateSelection: () => void;
  setDistributionMode: (enabled: boolean) => void;
  setIsDistributing: (distributing: boolean) => void;
  resetDistributionState: () => void;
};

type AgendaStore = AgendaState & AgendaActions;

const now = new Date();

export const useAgendaStore = create<AgendaStore>((set) => ({
  selectedDate: null,
  currentMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
  draggedTask: null,
  drawerCollapsed: false,
  // AI Distribution state
  selectedTaskIds: new Set(),
  selectedDates: new Set(),
  isDistributionMode: false,
  isDistributing: false,
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  setDraggedTask: (task) => set({ draggedTask: task }),
  setDrawerCollapsed: (collapsed) => set({ drawerCollapsed: collapsed }),
  
  // AI Distribution actions
  toggleTaskSelection: (taskId) => set((state) => {
    const newSelected = new Set(state.selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    return { selectedTaskIds: newSelected };
  }),
  
  selectAllTasks: (taskIds) => set({ selectedTaskIds: new Set(taskIds) }),
  
  clearTaskSelection: () => set({ selectedTaskIds: new Set() }),
  
  toggleDateSelection: (date) => set((state) => {
    const newSelected = new Set(state.selectedDates);
    if (newSelected.has(date)) {
      newSelected.delete(date);
    } else {
      newSelected.add(date);
    }
    return { selectedDates: newSelected };
  }),
  
  clearDateSelection: () => set({ selectedDates: new Set() }),
  
  setDistributionMode: (enabled) => set({ isDistributionMode: enabled }),
  
  setIsDistributing: (distributing) => set({ isDistributing: distributing }),
  
  resetDistributionState: () => set({
    selectedTaskIds: new Set(),
    selectedDates: new Set(),
    isDistributionMode: false,
    isDistributing: false,
  }),
}));
