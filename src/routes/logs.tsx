import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { TabBar } from "../components/TabBar";
import { ActivityTimeline } from "../components/logs/ActivityTimeline";
import { LogFilters, type FilterState } from "../components/logs/LogFilters";
import { LogDetailDrawer } from "../components/logs/LogDetailDrawer";
import { LogsMetrics } from "../components/logs/LogsMetrics";
import { safeInvoke } from "../services/tauri";

interface ActivityLogWithContext {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  metadata: string | null;
  created_at: string;
  project_name: string | null;
  task_title: string | null;
}

interface SearchResult {
  logs: ActivityLogWithContext[];
  total: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface ActivityLogDocument {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  project_id: string;
  project_name: string;
  task_title: string;
  metadata: Record<string, unknown>;
  created_at: number;
  created_at_str: string;
}

function toActivityLogDocument(log: ActivityLogWithContext): ActivityLogDocument {
  let parsedMetadata: Record<string, unknown> = {};
  if (log.metadata) {
    try {
      parsedMetadata = JSON.parse(log.metadata);
    } catch {
      parsedMetadata = {};
    }
  }

  return {
    id: log.id,
    event_type: log.event_type,
    entity_type: log.entity_type || "unknown",
    entity_id: log.entity_id || "",
    project_id: log.project_id || "",
    project_name: log.project_name || "",
    task_title: log.task_title || (parsedMetadata.task_title as string) || "",
    metadata: parsedMetadata,
    created_at: Math.floor(new Date(log.created_at).getTime() / 1000),
    created_at_str: log.created_at,
  };
}

function LogsPage() {
  const [logs, setLogs] = useState<ActivityLogDocument[]>([]);
  const [selectedLog, setSelectedLog] = useState<ActivityLogDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const loadingRef = useRef(false);
  const filtersRef = useRef<FilterState>({
    query: "",
    eventTypes: [],
    projectId: null,
    fromDate: null,
    toDate: null,
  });
  const initialLoadDone = useRef(false);

  const loadLogs = useCallback(async (currentCursor: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const currentFilters = filtersRef.current;
    const isInitialLoad = currentCursor === null;
    
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await safeInvoke<SearchResult>("search_activity_logs", {
        query: currentFilters.query || null,
        eventTypes: currentFilters.eventTypes.length > 0 ? currentFilters.eventTypes : null,
        projectId: currentFilters.projectId || null,
        fromDate: currentFilters.fromDate || null,
        toDate: currentFilters.toDate || null,
        cursor: currentCursor,
        limit: 30,
      });

      const mappedLogs = result.logs.map(toActivityLogDocument);

      if (isInitialLoad) {
        setLogs(mappedLogs);
      } else {
        setLogs((prev) => [...prev, ...mappedLogs]);
      }
      setTotalLogs(result.total);
      setCursor(result.next_cursor);
      setHasMore(result.has_more);
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadLogs(null);
    }
  }, [loadLogs]);

  function handleFiltersChange(newFilters: FilterState) {
    filtersRef.current = newFilters;
    setCursor(null);
    setSelectedLog(null);
    loadLogs(null);
  }

  function handleLoadMore() {
    if (!isLoading && !isLoadingMore && hasMore && cursor !== null) {
      loadLogs(cursor);
    }
  }

  function handleSelectLog(log: ActivityLogDocument) {
    setSelectedLog(log);
  }

  function handleCloseDrawer() {
    setSelectedLog(null);
  }

  return (
    <>
      <TabBar />
      <main className="flex-1 flex flex-col overflow-hidden bg-[#1c1c1c]">
        <div className="border-b border-[#3d3a34] bg-[#232323]/50">
          <div className="max-w-5xl mx-auto">
            <LogFilters onFiltersChange={handleFiltersChange} totalLogs={totalLogs} />
          </div>
        </div>

        <div className="border-b border-[#3d3a34]">
          <div className="max-w-5xl mx-auto">
            <LogsMetrics
              logs={logs}
              fromDate={filtersRef.current.fromDate}
              toDate={filtersRef.current.toDate}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="max-w-5xl mx-auto h-full">
            <ActivityTimeline
              logs={logs}
              selectedLogId={selectedLog?.id || null}
              onSelectLog={handleSelectLog}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
            />
          </div>
        </div>
      </main>

      <LogDetailDrawer log={selectedLog} onClose={handleCloseDrawer} />
    </>
  );
}

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});
