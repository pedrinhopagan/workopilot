import { createTRPCReact, httpBatchLink } from "@trpc/react-query"
import { createTRPCClient } from "@trpc/client"
import { QueryClient } from "@tanstack/react-query"
import type { AppRouter } from "@workopilot/sidecar/trpc"
import { safeInvoke, isTauri } from "./tauri"

export const trpc = createTRPCReact<AppRouter>()

// Vanilla client for use outside React components (services, utilities)
let vanillaClient: ReturnType<typeof createTRPCClient<AppRouter>> | null = null

export async function getVanillaClient() {
	if (vanillaClient) return vanillaClient

	const url = await getTrpcUrl()
	vanillaClient = createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `${url}/trpc`,
			}),
		],
	})
	return vanillaClient
}

let cachedTrpcUrl: string | null = null

async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

async function testConnection(url: string): Promise<boolean> {
	try {
		const response = await fetch(`${url}/health`)
		return response.ok
	} catch {
		return false
	}
}

export async function getTrpcUrl(): Promise<string> {
	if (cachedTrpcUrl) {
		return cachedTrpcUrl
	}

	if (!isTauri()) {
		throw new Error("tRPC URL only available in Tauri environment")
	}

	const maxRetries = 15
	const retryDelay = 300

	for (let i = 0; i < maxRetries; i++) {
		try {
			const url = await safeInvoke<string>("get_trpc_url")
			console.log(`[TRPC] Got URL: ${url}, testing connection...`)
			
			const isConnected = await testConnection(url)
			if (isConnected) {
				console.log("[TRPC] Connection successful!")
				cachedTrpcUrl = url
				return cachedTrpcUrl
			}
			
			console.log(`[TRPC] Connection test failed, retrying...`)
		} catch (err) {
			console.log(`[TRPC] Attempt ${i + 1}/${maxRetries} failed:`, err)
		}
		
		if (i < maxRetries - 1) {
			await sleep(retryDelay)
		}
	}

	throw new Error("Failed to connect to tRPC server after retries")
}

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60,
				refetchOnWindowFocus: false,
			},
		},
	})
}

export function createTrpcClient(url: string) {
	return trpc.createClient({
		links: [
			httpBatchLink({
				url: `${url}/trpc`,
			}),
		],
	})
}
