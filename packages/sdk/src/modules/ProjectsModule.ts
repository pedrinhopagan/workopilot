import type { Core } from '@workopilot/core';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStats,
} from '@workopilot/core';

export class ProjectsModule {
  constructor(private core: Core) {}

  async get(id: string): Promise<Project | null> {
    return this.core.projects.findById(id);
  }

  async list(): Promise<Project[]> {
    return this.core.projects.findAll();
  }

  async getStats(projectId: string): Promise<ProjectStats> {
    return this.core.projects.getStats(projectId);
  }

  async getAllStats(): Promise<ProjectStats[]> {
    return this.core.projects.getAllStats();
  }

  async create(input: CreateProjectInput): Promise<Project> {
    return this.core.projects.create(input);
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    return this.core.projects.update(id, input);
  }

  async updateOrder(orderedIds: string[]): Promise<void> {
    return this.core.projects.updateOrder(orderedIds);
  }

  async delete(id: string): Promise<void> {
    return this.core.projects.delete(id);
  }
}
