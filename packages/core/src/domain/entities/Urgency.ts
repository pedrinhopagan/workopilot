export interface Urgency {
  id: string;
  name: string;
  level: number;
  color: string;
  display_order: number;
  created_at: string;
}

export interface CreateUrgencyInput {
  name: string;
  level: number;
  color: string;
  display_order?: number;
}

export interface UpdateUrgencyInput {
  name?: string;
  level?: number;
  color?: string;
  display_order?: number;
}
