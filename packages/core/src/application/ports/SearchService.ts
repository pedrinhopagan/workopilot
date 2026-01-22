import type { Task } from '../../domain/entities/Task';
import type { Project } from '../../domain/entities/Project';

export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchService {
  indexTask(task: Task): Promise<void>;
  indexProject(project: Project): Promise<void>;
  
  removeTask(taskId: string): Promise<void>;
  removeProject(projectId: string): Promise<void>;
  
  searchTasks(query: string, options?: SearchOptions): Promise<SearchResult<Task>[]>;
  searchProjects(query: string, options?: SearchOptions): Promise<SearchResult<Project>[]>;
  searchAll(query: string, options?: SearchOptions): Promise<{
    tasks: SearchResult<Task>[];
    projects: SearchResult<Project>[];
  }>;
  
  reindexAll(): Promise<void>;
  
  isAvailable(): Promise<boolean>;
}
