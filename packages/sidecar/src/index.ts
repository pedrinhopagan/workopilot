#!/usr/bin/env bun
import { WorkoPilotSDK } from '@workopilot/sdk';
import { handleRequest, getAvailableMethods } from './handlers';
import type { JsonRpcRequest, JsonRpcResponse } from './types';
import { createErrorResponse, JSON_RPC_ERRORS } from './types';

const LOG_PREFIX = '[SIDECAR]';

function log(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

function sendResponse(response: JsonRpcResponse) {
  const json = JSON.stringify(response);
  process.stdout.write(json + '\n');
}

function parseRequest(line: string): JsonRpcRequest | null {
  try {
    const parsed = JSON.parse(line);
    if (
      parsed.jsonrpc === '2.0' &&
      typeof parsed.method === 'string' &&
      (typeof parsed.id === 'string' || typeof parsed.id === 'number')
    ) {
      return parsed as JsonRpcRequest;
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  log('Starting WorkoPilot sidecar...');
  
  let sdk: WorkoPilotSDK;
  
  try {
    sdk = await WorkoPilotSDK.create();
    log('SDK initialized, db path:', sdk.dbPath);
    log('Available methods:', getAvailableMethods().length);
  } catch (error) {
    log('Failed to initialize SDK:', error);
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  log('Ready to receive requests');

  const reader = Bun.stdin.stream().getReader();

  async function readLoop() {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        log('stdin closed, shutting down');
        await sdk.close();
        process.exit(0);
      }

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const request = parseRequest(line);
        
        if (!request) {
          sendResponse(
            createErrorResponse(
              null,
              JSON_RPC_ERRORS.PARSE_ERROR,
              'Invalid JSON-RPC request'
            )
          );
          continue;
        }

        log('Request:', request.method, request.id);
        
        const response = await handleRequest(sdk, request);
        sendResponse(response);
        
        log('Response sent for:', request.id);
      }
    }
  }

  readLoop().catch((error) => {
    log('Fatal error:', error);
    process.exit(1);
  });
}

main();
