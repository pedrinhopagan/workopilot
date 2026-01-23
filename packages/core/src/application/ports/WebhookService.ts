export type WebhookEventType = 
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.status_changed'
  | 'task.completed'
  | 'subtask.created'
  | 'subtask.updated'
  | 'subtask.status_changed'
  | 'subtask.completed'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted';

export interface WebhookPayload<T = unknown> {
  event: WebhookEventType;
  timestamp: string;
  data: T;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  deliveredAt: string;
}

export interface WebhookService {
  register(config: Omit<WebhookConfig, 'id' | 'createdAt'>): Promise<WebhookConfig>;
  unregister(webhookId: string): Promise<void>;
  update(webhookId: string, config: Partial<WebhookConfig>): Promise<WebhookConfig>;
  list(): Promise<WebhookConfig[]>;
  
  emit<T>(event: WebhookEventType, data: T): Promise<WebhookDeliveryResult[]>;
  
  getDeliveryHistory(webhookId: string, limit?: number): Promise<WebhookDeliveryResult[]>;
  
  isAvailable(): Promise<boolean>;
}
