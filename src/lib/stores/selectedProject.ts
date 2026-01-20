import { writable } from "svelte/store";
import type { Project } from "$lib/types";
import { browser } from "$app/environment";

const STORAGE_KEY = 'workopilot_selected_project';

function getInitialProjectId(): string | null {
  if (!browser) return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

function createSelectedProjectStore() {
  const { subscribe, set, update } = writable<string | null>(getInitialProjectId());
  
  return {
    subscribe,
    set: (value: string | null) => {
      if (browser) {
        if (value) {
          sessionStorage.setItem(STORAGE_KEY, value);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
      set(value);
    },
    update
  };
}

export const selectedProjectId = createSelectedProjectStore();
export const projectsList = writable<Project[]>([]);
