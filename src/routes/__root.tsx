import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Toaster } from "../components/ui/sonner";
import { useDbChangedListener } from "../hooks/useDbChangedListener";
import { openCodeService } from "../services/opencode";
import {
	checkAllInProgressTasks,
	checkForStructuringChanges,
	startPolling,
	stopPolling,
} from "../services/structuringMonitor";
import { safeGetCurrentWindow, safeInvoke } from "../services/tauri";
import { useDialogStateStore } from "../stores/dialogState";

function RootLayout() {
	const navigate = useNavigate();
	const openDialogCount = useDialogStateStore((s) => s.openDialogCount);
	const dialogOpenRef = useRef(openDialogCount > 0);

	useDbChangedListener();

	useEffect(() => {
		dialogOpenRef.current = openDialogCount > 0;
	}, [openDialogCount]);

	useEffect(() => {
		let unlisten: (() => void) | undefined;
		let hideTimeout: ReturnType<typeof setTimeout> | null = null;

		startPolling(30000);

		const unsubscribeOpenCode = openCodeService.onSessionIdle(async () => {
			await checkForStructuringChanges();
		});

		const unsubscribeFileChange = openCodeService.onFileChange(
			async (filePath) => {
				if (filePath.includes("workopilot.db")) {
					await checkAllInProgressTasks();
				}
			},
		);

		safeGetCurrentWindow().then((win) => {
			if (!win) return;
			win
				.onFocusChanged(({ payload: focused }: { payload: boolean }) => {
					if (hideTimeout) {
						clearTimeout(hideTimeout);
						hideTimeout = null;
					}

					if (!focused && !dialogOpenRef.current) {
						hideTimeout = setTimeout(async () => {
							const currentWin = await safeGetCurrentWindow();
							if (!currentWin) return;
							const isFocused = await currentWin.isFocused();
							if (!isFocused && !dialogOpenRef.current) {
								safeInvoke("hide_window");
							}
						}, 150);
					}
				})
				.then((fn: () => void) => {
					unlisten = fn;
				});
		});

		return () => {
			if (hideTimeout) clearTimeout(hideTimeout);
			unlisten?.();
			unsubscribeOpenCode();
			unsubscribeFileChange();
			stopPolling();
		};
	}, []);

	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.altKey && e.key >= "0" && e.key <= "9") {
				e.preventDefault();
				const tabMap: Record<string, string> = {
					"1": "/home",
					"2": "/projects",
					"3": "/tasks",
					"4": "/agenda",
					"0": "/settings",
				};
				const path = tabMap[e.key];
				if (path) {
					navigate({ to: path });
				}
			}
		};

		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [navigate]);

	return (
		<div className="h-screen min-w-lg flex flex-col bg-background border-4 border-[#141414]">
			<Outlet />
			<Toaster position="bottom-right" />
		</div>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
