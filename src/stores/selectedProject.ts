import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "../types";

type SelectedProjectState = {
  selectedProjectId: string | null;
  projectsList: Project[];
};

type SelectedProjectActions = {
  setSelectedProjectId: (id: string | null) => void;
  setProjectsList: (projects: Project[]) => void;
};

type SelectedProjectStore = SelectedProjectState & SelectedProjectActions;

export const useSelectedProjectStore = create<SelectedProjectStore>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      projectsList: [],
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setProjectsList: (projects) => set({ projectsList: projects }),
    }),
    {
      name: "workopilot_selected_project",
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
      partialize: (state) => ({ selectedProjectId: state.selectedProjectId }) as SelectedProjectStore,
    }
  )
);
