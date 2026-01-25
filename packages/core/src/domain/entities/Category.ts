export interface Category {
  id: string;
  name: string;
  color: string | null;
  display_order: number;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  color?: string | null;
  display_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string | null;
  display_order?: number;
}
