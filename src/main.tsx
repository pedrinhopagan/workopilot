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
	const trpcClientRef = useRef<ReturnType<typeof createTrpcClient> | null>(null);
	const [clientReady, setClientReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isTauri()) {
			setError("Not running in Tauri");
			return;
		}

		getTrpcUrl()
			.then((url) => {
				const client = createTrpcClient(url);
				trpcClientRef.current = client;
				setClientReady(true);
			})
			.catch((err) => {
				setError(err.message || "Failed to connect to tRPC");
			});
	}, []);

	if (error) {
		return (
			<div style={{ padding: 20, color: "red" }}>
				<h2>tRPC Connection Error</h2>
				<p>{error}</p>
			</div>
		);
	}

	const activeClient = trpcClientRef.current;

	if (!clientReady || !activeClient) {
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
				</div>
			</div>
		);
	}
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
