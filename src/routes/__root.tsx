import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { safeInvoke, safeGetCurrentWindow } from "../services/tauri";
import { useDialogStateStore } from "../stores/dialogState";
import { StructuringCompleteModal } from "../components/StructuringCompleteModal";
import { openCodeService } from "../services/opencode";
import {
  startPolling,
  stopPolling,
  checkForStructuringChanges,
  checkAllInProgressTasks,
} from "../services/structuringMonitor";
import { useDbChangedListener } from "../hooks/useDbChangedListener";

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

    startPolling(5000);

    const unsubscribeOpenCode = openCodeService.onSessionIdle(async () => {
      await checkForStructuringChanges();
    });

    const unsubscribeFileChange = openCodeService.onFileChange(async (filePath) => {
      if (filePath.includes("workopilot.db")) {
        await checkAllInProgressTasks();
      }
    });

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
          "1": "/projects",
          "2": "/tasks",
          "3": "/agenda",
          "4": "/logs",
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
    <div className="h-screen min-w-lg flex flex-col bg-[#1c1c1c] p-3">
      <Outlet />
      <StructuringCompleteModal />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
