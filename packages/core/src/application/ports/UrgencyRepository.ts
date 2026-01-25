import type { Urgency, CreateUrgencyInput, UpdateUrgencyInput } from '../../domain/entities/Urgency';

export interface UrgencyRepository {
  findById(id: string): Promise<Urgency | null>;
  findAll(): Promise<Urgency[]>;
  findByName(name: string): Promise<Urgency | null>;
  findByLevel(level: number): Promise<Urgency | null>;
  count(): Promise<number>;
  create(input: CreateUrgencyInput): Promise<Urgency>;
  update(id: string, input: UpdateUrgencyInput): Promise<Urgency>;
  updateOrder(orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
