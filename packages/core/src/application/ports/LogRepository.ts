import type { 
  SessionLog, 
  ActivityLog, 
  UserSession, 
  OperationLog, 
  CreateActivityLogInput, 
  CreateOperationLogInput 
} from '../../domain/entities/Log';

export interface ActivityLogFilters {
  event_type?: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  limit?: number;
}

export interface LogRepository {
  findSessionLogs(projectId?: string, limit?: number): Promise<SessionLog[]>;
  
  findActivityLogs(filters?: ActivityLogFilters): Promise<ActivityLog[]>;
  searchActivityLogs(query: string, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(input: CreateActivityLogInput): Promise<ActivityLog>;
  
  findOperationLogs(entityType?: string, entityId?: string, limit?: number): Promise<OperationLog[]>;
  createOperationLog(input: CreateOperationLogInput): Promise<OperationLog>;
  
  findUserSessions(limit?: number): Promise<UserSession[]>;
  startUserSession(appVersion?: string): Promise<UserSession>;
  endUserSession(id: string): Promise<UserSession>;
}
