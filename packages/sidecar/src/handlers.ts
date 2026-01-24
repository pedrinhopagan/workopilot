/**
 * @deprecated JSON-RPC handlers are legacy. Use tRPC for new integrations.
 * These handlers are still used by Rust sidecar calls (terminal.rs, commands.rs).
 * Plan: Migrate Rust to use tRPC HTTP calls, then remove this file.
 */
import { WorkoPilotSDK } from '@workopilot/sdk';
import type { JsonRpcRequest, JsonRpcResponse } from './types';
import { createSuccessResponse, createErrorResponse, JSON_RPC_ERRORS } from './types';

type HandlerFn = (sdk: WorkoPilotSDK, params: unknown) => Promise<unknown>;

const handlers: Record<string, HandlerFn> = {
  'projects.get': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.projects.get(id);
  },

  'tasks.getFull': async (sdk, params) => {
    const { id } = params as { id: string };
    return sdk.tasks.getFull(id);
  },

  'tasks.updateStatus': async (sdk, params) => {
    const { id, status, modifiedBy } = params as { 
      id: string; 
      status: Parameters<typeof sdk.tasks.updateStatus>[1];
      modifiedBy?: 'user' | 'ai' | 'cli';
    };
    return sdk.tasks.updateStatus(id, status, modifiedBy);
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
