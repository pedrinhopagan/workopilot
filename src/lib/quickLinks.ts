import type { LucideIcon } from "lucide-react";
import {
  Play,
  CheckSquare,
  CalendarX,
  AlertTriangle,
  Settings,
  FolderPlus,
} from "lucide-react";
import type { TaskFull } from "@/types";
import { deriveProgressState } from "@/lib/constants/taskStatus";

export interface QuickLink {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  isFixed?: boolean;
  taskId?: string;
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
}

export function hasTaskToExecute(tasks: TaskFull[]): boolean {
  return tasks.some((task) => {
    const state = deriveProgressState(task);
    return state === "ready-to-start" || state === "in-execution";
  });
}

export function getTaskToExecute(tasks: TaskFull[]): TaskFull | null {
  return (
    tasks.find((task) => {
      const state = deriveProgressState(task);
      return state === "ready-to-start" || state === "in-execution";
    }) ?? null
  );
}

export function hasTaskToReview(tasks: TaskFull[]): boolean {
  return tasks.some((task) => {
    const state = deriveProgressState(task);
    return state === "ready-to-review";
  });
}

export function getTaskToReview(tasks: TaskFull[]): TaskFull | null {
  return (
    tasks.find((task) => {
      const state = deriveProgressState(task);
      return state === "ready-to-review";
    }) ?? null
  );
}

export function hasTomorrowEmpty(tasks: TaskFull[]): boolean {
  const tomorrow = getTomorrow();
  const tasksForTomorrow = tasks.filter(
    (task) => task.scheduled_date === tomorrow
  );
  return tasksForTomorrow.length === 0;
}

export function hasOverdueTask(tasks: TaskFull[]): boolean {
  const today = getToday();
  return tasks.some((task) => {
    if (!task.due_date || task.status === "done") return false;
    return task.due_date < today;
  });
}

export function getOverdueTask(tasks: TaskFull[]): TaskFull | null {
  const today = getToday();
  return (
    tasks.find((task) => {
      if (!task.due_date || task.status === "done") return false;
      return task.due_date < today;
    }) ?? null
  );
}

const FIXED_LINKS: QuickLink[] = [
  {
    id: "settings",
    title: "Configuracoes",
    description: "Ajustar preferencias",
    href: "/settings",
    icon: Settings,
    isFixed: true,
  },
  {
    id: "new-project",
    title: "Novo projeto",
    description: "Criar um projeto",
    href: "/projects?newProject=true",
    icon: FolderPlus,
    isFixed: true,
  },
];

export function getActiveQuickLinks(tasks: TaskFull[]): QuickLink[] {
  const dynamicLinks: QuickLink[] = [];

  const taskToExecute = getTaskToExecute(tasks);
  if (taskToExecute) {
    dynamicLinks.push({
      id: "task-to-execute",
      title: "Tarefa pra executar",
      description: taskToExecute.title,
      href: `/tasks/${taskToExecute.id}`,
      icon: Play,
      taskId: taskToExecute.id,
    });
  }

  const taskToReview = getTaskToReview(tasks);
  if (taskToReview) {
    dynamicLinks.push({
      id: "task-to-review",
      title: "Tarefa pra revisar",
      description: taskToReview.title,
      href: `/tasks/${taskToReview.id}`,
      icon: CheckSquare,
      taskId: taskToReview.id,
    });
  }

  if (hasTomorrowEmpty(tasks)) {
    dynamicLinks.push({
      id: "tomorrow-empty",
      title: "Agenda de amanha vazia",
      description: "Agende tarefas para amanha",
      href: "/agenda",
      icon: CalendarX,
    });
  }

  const overdueTask = getOverdueTask(tasks);
  if (overdueTask) {
    dynamicLinks.push({
      id: "overdue-task",
      title: "Task nao concluida",
      description: overdueTask.title,
      href: `/tasks/${overdueTask.id}`,
      icon: AlertTriangle,
      taskId: overdueTask.id,
    });
  }

  return [...dynamicLinks, ...FIXED_LINKS];
}

export function getDynamicQuickLinks(tasks: TaskFull[]): QuickLink[] {
  return getActiveQuickLinks(tasks).filter((link) => !link.isFixed);
}

export function getFixedQuickLinks(): QuickLink[] {
  return FIXED_LINKS;
}

export function getDynamicQuickLinksCount(tasks: TaskFull[]): number {
  return getDynamicQuickLinks(tasks).length;
}
