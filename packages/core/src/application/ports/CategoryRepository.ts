import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../domain/entities/Category';

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  findByName(name: string): Promise<Category | null>;
  count(): Promise<number>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: UpdateCategoryInput): Promise<Category>;
  updateOrder(orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
