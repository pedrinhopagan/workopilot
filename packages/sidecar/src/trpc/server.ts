import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { WorkoPilotSDK } from '@workopilot/sdk';
import { appRouter } from './router';
import { createContext } from './context';

const LOG_PREFIX = '[TRPC]';

function log(...args: unknown[]) {
  console.error(LOG_PREFIX, ...args);
}

export interface TrpcServerConfig {
  sdk: WorkoPilotSDK;
  port?: number;
}

export interface TrpcServer {
  url: string;
  port: number;
  stop: () => void;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function startTrpcServer(config: TrpcServerConfig): Promise<TrpcServer> {
  const { sdk, port = 0 } = config;

  const server = Bun.serve({
    port,
    fetch(request) {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }

      if (url.pathname === '/health') {
        return Response.json(
          { ok: true, timestamp: new Date().toISOString() },
          { headers: corsHeaders() }
        );
      }

      if (url.pathname.startsWith('/trpc')) {
        return fetchRequestHandler({
          endpoint: '/trpc',
          req: request,
          router: appRouter,
          createContext: () => createContext(sdk),
          onError({ error, path }) {
            log(`Error in ${path}:`, error.message);
          },
        }).then((response) => {
          const headers = new Headers(response.headers);
          headers.set('Access-Control-Allow-Origin', '*');
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  const actualPort = server.port;
  const url = `http://localhost:${actualPort}`;

  log(`Server started on ${url}`);

  return {
    url,
    port: actualPort,
    stop: () => server.stop(),
  };
}
