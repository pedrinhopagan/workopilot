import type { Project, CreateProjectInput, UpdateProjectInput, ProjectStats } from '../../domain/entities/Project';

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  findAll(): Promise<Project[]>;
  getStats(projectId: string): Promise<ProjectStats>;
  getAllStats(): Promise<ProjectStats[]>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  updateOrder(orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
