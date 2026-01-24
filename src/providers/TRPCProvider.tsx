import { useState, useEffect, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { trpc, getTrpcUrl, createQueryClient, createTrpcClient } from "../services/trpc"
import { isTauri } from "../services/tauri"

interface TRPCProviderProps {
	children: ReactNode
}

export function TRPCProvider({ children }: TRPCProviderProps) {
	const [queryClient] = useState(() => createQueryClient())
	const [trpcClient, setTrpcClient] = useState<ReturnType<typeof createTrpcClient> | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!isTauri()) {
			setError("tRPC only available in Tauri")
			return
		}

		getTrpcUrl()
			.then((url) => {
				const client = createTrpcClient(url)
				setTrpcClient(client)
			})
			.catch((err) => {
				setError(err.message)
			})
	}, [])

	if (error) {
		return <div>tRPC Error: {error}</div>
	}

	if (!trpcClient) {
		return <div>Connecting to tRPC...</div>
	}

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	)
}
