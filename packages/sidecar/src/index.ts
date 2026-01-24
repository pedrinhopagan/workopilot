#!/usr/bin/env bun
import { WorkoPilotSDK } from '@workopilot/sdk';
import { handleRequest, getAvailableMethods } from './handlers';
import type { JsonRpcRequest, JsonRpcResponse } from './types';
import { createErrorResponse, JSON_RPC_ERRORS } from './types';
import { startTrpcServer, type TrpcServer } from './trpc';

const LOG_PREFIX = '[SIDECAR]';
const TRPC_URL_PREFIX = 'TRPC_URL=';

function log(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

function sendResponse(response: JsonRpcResponse) {
  const json = JSON.stringify(response);
  process.stdout.write(json + '\n');
}

function emitTrpcUrl(url: string) {
  process.stdout.write(`${TRPC_URL_PREFIX}${url}\n`);
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
  let trpcServer: TrpcServer;
  
  try {
    sdk = await WorkoPilotSDK.create();
    log('SDK initialized, db path:', sdk.dbPath);
    log('Available JSON-RPC methods:', getAvailableMethods().length);
  } catch (error) {
    log('Failed to initialize SDK:', error);
    process.exit(1);
  }

  try {
    trpcServer = await startTrpcServer({ sdk });
    log('tRPC server started on:', trpcServer.url);
    emitTrpcUrl(trpcServer.url);
  } catch (error) {
    log('Failed to start tRPC server:', error);
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  log('Ready to receive JSON-RPC requests');

  const reader = Bun.stdin.stream().getReader();

  async function readLoop() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          log('stdin closed, continuing with tRPC server only');
          break;
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
    } catch (error) {
      log('stdin read error (non-fatal):', error);
    }
  }

  readLoop();

  process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down');
    trpcServer.stop();
    await sdk.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down');
    trpcServer.stop();
    await sdk.close();
    process.exit(0);
  });
}

main();
