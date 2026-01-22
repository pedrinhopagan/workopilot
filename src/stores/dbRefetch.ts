import { create } from "zustand";

export interface DbChangedPayload {
  entity_type: "task" | "subtask" | "execution" | "terminal";
  entity_id: string;
  operation: "create" | "update" | "delete";
  project_id?: string;
}

interface DbRefetchState {
  lastChange: DbChangedPayload | null;
  changeCounter: number;
  triggerRefetch: (payload: DbChangedPayload) => void;
}

export const useDbRefetchStore = create<DbRefetchState>((set) => ({
  lastChange: null,
  changeCounter: 0,
  triggerRefetch: (payload: DbChangedPayload) =>
    set((state) => ({
      lastChange: payload,
      changeCounter: state.changeCounter + 1,
    })),
}));
