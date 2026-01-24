import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./routerConfig";
import { trpc, getTrpcUrl, createTrpcClient } from "./services/trpc";
import { isTauri } from "./services/tauri";
import "./app.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			refetchOnWindowFocus: false,
		},
	},
});

function App() {
	const [trpcClient, setTrpcClient] = useState<ReturnType<typeof createTrpcClient> | null>(null);
	const trpcClientRef = useRef<ReturnType<typeof createTrpcClient> | null>(null);
	const [clientReady, setClientReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		console.log("[APP] Starting, isTauri:", isTauri());
		
		if (!isTauri()) {
			setError("Not running in Tauri");
			return;
		}

		getTrpcUrl()
			.then((url) => {
				console.log("[APP] Got tRPC URL:", url);
				const client = createTrpcClient(url);
				console.log("[APP] Created tRPC client");
				trpcClientRef.current = client;
				setTrpcClient(client);
				setClientReady(true);
			})
			.catch((err) => {
				console.error("[APP] Failed to get tRPC URL:", err);
				setError(err.message || "Failed to connect to tRPC");
			});
	}, []);

	useEffect(() => {
		console.log("[APP] trpcClient state:", trpcClient ? "ready" : "null", "clientReady:", clientReady);
	}, [trpcClient, clientReady]);

	if (error) {
		return (
			<div style={{ padding: 20, color: "red" }}>
				<h2>tRPC Connection Error</h2>
				<p>{error}</p>
			</div>
		);
	}

	const activeClient = trpcClient ?? trpcClientRef.current;

	if (!activeClient) {
		return (
			<div style={{ 
				display: "flex", 
				justifyContent: "center", 
				alignItems: "center", 
				height: "100vh",
				background: "#1a1a1a",
				color: "#888"
			}}>
				<div style={{ textAlign: "center" }}>
					<div style={{ fontSize: 24, marginBottom: 8 }}>WorkoPilot</div>
					<div>Connecting to backend...</div>
					{clientReady && (
						<div style={{ fontSize: 12, marginTop: 8 }}>Client ready, waiting for render...</div>
					)}
				</div>
			</div>
		);
	}

	console.log("[APP] Rendering providers...");
	return (
		<trpc.Provider client={activeClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</trpc.Provider>
	);
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
