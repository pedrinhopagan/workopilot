import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from '../../domain/entities/Subtask';
import type { SubtaskStatus } from '../../domain/value-objects/SubtaskStatus';

export interface SubtaskRepository {
  findById(id: string): Promise<Subtask | null>;
  findByTaskId(taskId: string): Promise<Subtask[]>;
  create(input: CreateSubtaskInput): Promise<Subtask>;
  update(id: string, input: UpdateSubtaskInput): Promise<Subtask>;
  updateStatus(id: string, status: SubtaskStatus): Promise<Subtask>;
  reorder(taskId: string, orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByTaskId(taskId: string): Promise<void>;
}
