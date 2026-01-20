import { create } from "zustand";

type DialogStateState = {
  openDialogCount: number;
};

type DialogStateActions = {
  openDialog: () => void;
  closeDialog: () => void;
};

type DialogStateStore = DialogStateState & DialogStateActions;

export const useDialogStateStore = create<DialogStateStore>((set, get) => ({
  openDialogCount: 0,
  openDialog: () => set({ openDialogCount: get().openDialogCount + 1 }),
  closeDialog: () => set({ openDialogCount: Math.max(0, get().openDialogCount - 1) }),
}));
