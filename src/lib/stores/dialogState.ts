import { writable } from "svelte/store";

// Track if a dialog is currently open to prevent window hide on blur
export const isDialogOpen = writable(false);

export function setDialogOpen(open: boolean) {
  isDialogOpen.set(open);
}
