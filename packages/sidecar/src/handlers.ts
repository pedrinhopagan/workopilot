import { WorkoPilotSDK } from '@workopilot/sdk';
import type { JsonRpcRequest, JsonRpcResponse } from './types';
import { createSuccessResponse, createErrorResponse, JSON_RPC_ERRORS } from './types';

type HandlerFn = (sdk: WorkoPilotSDK, params: unknown) => Promise<unknown>;

const handlers: Record<string, HandlerFn> = {
  'tasks.get': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.tasks.get(id);
  },

  'tasks.getFull': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.tasks.getFull(id);
  },

  'tasks.list': async (sdk, params) => {
    const { projectId, ...rest } = (params ?? {}) as { projectId?: string } & Record<string, unknown>;
    const filters: Parameters<typeof sdk.tasks.list>[0] = {
      ...rest,
      project_id: projectId,
    };
    return sdk.tasks.list(filters);
  },

  'tasks.listFull': async (sdk, params) => {
    const { projectId, ...rest } = (params ?? {}) as { projectId?: string } & Record<string, unknown>;
    const filters: Parameters<typeof sdk.tasks.listFull>[0] = {
      ...rest,
      project_id: projectId,
    };
    return sdk.tasks.listFull(filters);
  },

  'tasks.listFullPaginated': async (sdk, params) => {
    const { projectId, ...rest } = (params ?? {}) as { projectId?: string } & Record<string, unknown>;
    const filters: Parameters<typeof sdk.tasks.listFullPaginated>[0] = {
      ...rest,
      project_id: projectId,
    };
    return sdk.tasks.listFullPaginated(filters);
  },

  'tasks.listUrgent': async (sdk) => {
    return sdk.tasks.listUrgent();
  },

  'tasks.listActive': async (sdk) => {
    return sdk.tasks.listActive();
  },

  'tasks.listForDate': async (sdk, params) => {
    const { date } = params as { date: string };
    return sdk.tasks.listForDate(date);
  },

  'tasks.listForMonth': async (sdk, params) => {
    const { year, month } = params as { year: number; month: number };
    return sdk.tasks.listForMonth(year, month);
  },

  'tasks.listUnscheduled': async (sdk, params) => {
    const { projectId } = (params as { projectId?: string }) ?? {};
    return sdk.tasks.listUnscheduled(projectId);
  },

  'tasks.create': async (sdk, params) => {
    const { projectId, project_id, ...rest } = params as { projectId?: string; project_id?: string } & Record<string, unknown>;
    return sdk.tasks.create({
      project_id: project_id ?? projectId ?? null,
      ...rest,
    } as Parameters<typeof sdk.tasks.create>[0]);
  },

  'tasks.update': async (sdk, params) => {
    const { id, ...input } = params as { id: string } & Record<string, unknown>;
    return sdk.tasks.update(id, input as Parameters<typeof sdk.tasks.update>[1]);
  },

  'tasks.updateStatus': async (sdk, params) => {
    const { id, status, modifiedBy } = params as { 
      id: string; 
      status: Parameters<typeof sdk.tasks.updateStatus>[1];
      modifiedBy?: 'user' | 'ai' | 'cli';
    };
    return sdk.tasks.updateStatus(id, status, modifiedBy);
  },

  'tasks.schedule': async (sdk, params) => {
    const { id, date } = params as { id: string; date: string };
    return sdk.tasks.schedule(id, date);
  },

  'tasks.unschedule': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.tasks.unschedule(id);
  },

  'tasks.saveFull': async (sdk, params) => {
    return sdk.tasks.saveFull(params as Parameters<typeof sdk.tasks.saveFull>[0]);
  },

  'tasks.delete': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.tasks.delete(id);
  },

  'subtasks.get': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.subtasks.get(id);
  },

  'subtasks.listByTaskId': async (sdk, params) => {
    const { taskId } = params as { taskId: string };
    return sdk.subtasks.listByTaskId(taskId);
  },

  'subtasks.create': async (sdk, params) => {
    return sdk.subtasks.create(params as Parameters<typeof sdk.subtasks.create>[0]);
  },

  'subtasks.update': async (sdk, params) => {
    const { id, ...input } = params as { id: string } & Record<string, unknown>;
    return sdk.subtasks.update(id, input as Parameters<typeof sdk.subtasks.update>[1]);
  },

  'subtasks.updateStatus': async (sdk, params) => {
    const { id, status } = params as { 
      id: string; 
      status: Parameters<typeof sdk.subtasks.updateStatus>[1];
    };
    return sdk.subtasks.updateStatus(id, status);
  },

  'subtasks.delete': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.subtasks.delete(id);
  },

  'subtasks.reorder': async (sdk, params) => {
    const { taskId, orderedIds } = params as { taskId: string; orderedIds: string[] };
    return sdk.subtasks.reorder(taskId, orderedIds);
  },

  'subtasks.deleteByTaskId': async (sdk, params) => {
    const { taskId } = params as { taskId: string };
    return sdk.subtasks.deleteByTaskId(taskId);
  },

  'projects.get': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.projects.get(id);
  },

  'projects.list': async (sdk) => {
    return sdk.projects.list();
  },

  'projects.create': async (sdk, params) => {
    return sdk.projects.create(params as Parameters<typeof sdk.projects.create>[0]);
  },

  'projects.update': async (sdk, params) => {
    const { id, ...input } = params as { id: string } & Record<string, unknown>;
    return sdk.projects.update(id, input as Parameters<typeof sdk.projects.update>[1]);
  },

  'projects.delete': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.projects.delete(id);
  },

  'projects.updateOrder': async (sdk, params) => {
    const { orderedIds } = params as { orderedIds: string[] };
    return sdk.projects.updateOrder(orderedIds);
  },

  'settings.get': async (sdk, params) => {
    const { key } = params as { key: string };
    return sdk.settings.get(key);
  },

  'settings.set': async (sdk, params) => {
    const { key, value } = params as { key: string; value: string };
    return sdk.settings.set(key, value);
  },

  'settings.getAll': async (sdk) => {
    return sdk.settings.getAll();
  },

  'settings.delete': async (sdk, params) => {
    const { key } = params as { key: string };
    return sdk.settings.delete(key);
  },

  'executions.start': async (sdk, params) => {
    return sdk.executions.start(params as Parameters<typeof sdk.executions.start>[0]);
  },

  'executions.end': async (sdk, params) => {
    const { taskId, errorMessage } = params as { 
      taskId: string; 
      errorMessage?: string | null;
    };
    return sdk.executions.end(taskId, errorMessage);
  },

  'executions.update': async (sdk, params) => {
    const { id, ...input } = params as { id: string } & Record<string, unknown>;
    return sdk.executions.update(id, input as Parameters<typeof sdk.executions.update>[1]);
  },

  'executions.getActiveForTask': async (sdk, params) => {
    const { taskId } = params as { taskId: string };
    return sdk.executions.getActiveForTask(taskId);
  },

  'executions.listAllActive': async (sdk) => {
    return sdk.executions.listAllActive();
  },

  'executions.cleanupStale': async (sdk, params) => {
    const { maxAgeMinutes } = params as { maxAgeMinutes?: number };
    return sdk.executions.cleanupStale(maxAgeMinutes);
  },

  'executions.get': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.executions.get(id);
  },

  'executions.getTerminalForTask': async (sdk, params) => {
    const { taskId } = params as { taskId: string };
    return sdk.executions.getTerminalForTask(taskId);
  },

  'executions.linkTerminal': async (sdk, params) => {
    return sdk.executions.linkTerminal(params as Parameters<typeof sdk.executions.linkTerminal>[0]);
  },

  'executions.unlinkTerminal': async (sdk, params) => {
    const { taskId } = params as { taskId: string };
    return sdk.executions.unlinkTerminal(taskId);
  },

  'executions.updateTerminalSubtask': async (sdk, params) => {
    const { taskId, subtaskId } = params as { taskId: string; subtaskId: string | null };
    return sdk.executions.updateTerminalSubtask(taskId, subtaskId);
  },

  'system.ping': async () => {
    return { pong: true, timestamp: new Date().toISOString() };
  },

  'system.version': async () => {
    return { version: '0.1.0', runtime: 'bun' };
  },
};

export async function handleRequest(
  sdk: WorkoPilotSDK,
  request: JsonRpcRequest
): Promise<JsonRpcResponse> {
  const handler = handlers[request.method];

  if (!handler) {
    return createErrorResponse(
      request.id,
      JSON_RPC_ERRORS.METHOD_NOT_FOUND,
      `Method not found: ${request.method}`
    );
  }

  try {
    const result = await handler(sdk, request.params);
    return createSuccessResponse(request.id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    return createErrorResponse(
      request.id,
      JSON_RPC_ERRORS.INTERNAL_ERROR,
      message,
      { stack }
    );
  }
}

export function getAvailableMethods(): string[] {
  return Object.keys(handlers);
}
