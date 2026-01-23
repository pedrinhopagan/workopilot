export type NotificationType = 
  | 'task_reminder'
  | 'task_due'
  | 'task_overdue'
  | 'subtask_completed'
  | 'all_subtasks_completed'
  | 'ai_action_required'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  taskId?: string;
  subtaskId?: string;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  taskReminders: boolean;
  subtaskUpdates: boolean;
  aiNotifications: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface NotificationService {
  send(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification>;
  
  list(options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  delete(notificationId: string): Promise<void>;
  
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  
  scheduleReminder(taskId: string, remindAt: string): Promise<void>;
  cancelReminder(taskId: string): Promise<void>;
  
  isAvailable(): Promise<boolean>;
}
