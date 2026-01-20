import { writable } from "svelte/store";
import type { Project } from "$lib/types";

export const selectedProjectId = writable<string | null>(null);
export const projectsList = writable<Project[]>([]);
