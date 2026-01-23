import { useEffect, useRef } from "react";
import { safeListen } from "../services/tauri";
import {
  useDbRefetchStore,
  type DbChangedPayload,
} from "../stores/dbRefetch";

export function useDbChangedListener() {
  const triggerRefetch = useDbRefetchStore((s) => s.triggerRefetch);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    safeListen<DbChangedPayload>("db-changed", (event) => {
      triggerRefetch(event.payload);
    }).then((fn) => {
      unlistenRef.current = fn;
    });

    return () => {
      unlistenRef.current?.();
    };
  }, [triggerRefetch]);
}
