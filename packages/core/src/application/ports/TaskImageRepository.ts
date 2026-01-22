import type { TaskImage, TaskImageMeta, CreateTaskImageInput } from '../../domain/entities/TaskImage';

export interface TaskImageRepository {
  findById(id: string): Promise<TaskImage | null>;
  findMetaById(id: string): Promise<TaskImageMeta | null>;
  findByTaskId(taskId: string): Promise<TaskImageMeta[]>;
  create(input: CreateTaskImageInput): Promise<TaskImageMeta>;
  delete(id: string): Promise<void>;
  deleteByTaskId(taskId: string): Promise<void>;
}
