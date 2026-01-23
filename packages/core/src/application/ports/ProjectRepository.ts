import type { Project, CreateProjectInput, UpdateProjectInput } from '../../domain/entities/Project';

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  findAll(): Promise<Project[]>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  updateOrder(orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
