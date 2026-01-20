import { create } from "zustand";
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

export const useSelectedProjectStore = create<SelectedProjectStore>((set) => ({
  selectedProjectId: null,
  projectsList: [],
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setProjectsList: (projects) => set({ projectsList: projects }),
}));
