import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { TabBar } from "../components/TabBar";
import { ActivityTimeline } from "../components/logs/ActivityTimeline";
import { LogFilters, type FilterState } from "../components/logs/LogFilters";
import type { ActivityLogDocument, ActivityLogSearchResult } from "../services/typesense";
import { searchLogs, startTypesenseSync, stopTypesenseSync } from "../services/typesenseSync";

function LogsPage() {
  const [logs, setLogs] = useState<ActivityLogDocument[]>([]);
  const [selectedLog, setSelectedLog] = useState<ActivityLogDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    eventTypes: [],
    projectId: null,
    fromDate: null,
    toDate: null,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);

  const loadLogs = useCallback(async (currentFilters: FilterState, currentPage: number, append = false) => {
    setIsLoading(true);
    try {
      const result: ActivityLogSearchResult = await searchLogs({
        query: currentFilters.query || undefined,
        event_type: currentFilters.eventTypes.length > 0 ? currentFilters.eventTypes : undefined,
        project_id: currentFilters.projectId || undefined,
        from_date: currentFilters.fromDate || undefined,
        to_date: currentFilters.toDate || undefined,
        limit: 50,
        page: currentPage,
      });

      if (append) {
        setLogs((prev) => [...prev, ...result.logs]);
      } else {
        setLogs(result.logs);
      }
      setTotalLogs(result.total);
      setHasMore(currentPage < result.total_pages);
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTypesenseSync(30000);
    return () => stopTypesenseSync();
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedLog(null);
    loadLogs(filters, 1, false);
  }, [filters, loadLogs]);

  function handleFiltersChange(newFilters: FilterState) {
    setFilters(newFilters);
  }

  function handleLoadMore() {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadLogs(filters, nextPage, true);
    }
  }

  function handleSelectLog(log: ActivityLogDocument) {
    setSelectedLog(log);
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTokens(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }

  return (
    <>
      <TabBar />
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-[#3d3a34] flex flex-col bg-[#232323]">
          <div className="p-3 border-b border-[#3d3a34] flex items-center justify-between">
            <span className="text-xs text-[#828282] uppercase tracking-wide">
              Timeline de Eventos
            </span>
            <span className="text-xs text-[#636363]">
              {totalLogs} evento{totalLogs !== 1 ? "s" : ""}
            </span>
          </div>

          <LogFilters onFiltersChange={handleFiltersChange} />

          <ActivityTimeline
            logs={logs}
            selectedLogId={selectedLog?.id || null}
            onSelectLog={handleSelectLog}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
          />
        </aside>

        <section className="flex-1 overflow-y-auto p-4">
          {selectedLog ? (
            <LogDetail
              log={selectedLog}
              formatTimestamp={formatTimestamp}
              formatTokens={formatTokens}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#828282]">
              Selecione um evento da timeline para ver os detalhes
            </div>
          )}
        </section>
      </main>
    </>
  );
}

type LogDetailProps = {
  log: ActivityLogDocument;
  formatTimestamp: (timestamp: number) => string;
  formatTokens: (n: number) => string;
};

function LogDetail({ log, formatTimestamp, formatTokens }: LogDetailProps) {
  const metadata = log.metadata as Record<string, unknown>;

  const oldStatus = typeof metadata?.old_status === "string" ? metadata.old_status : null;
  const newStatus = typeof metadata?.new_status === "string" ? metadata.new_status : null;
  const tokensInput = typeof metadata?.tokens_input === "number" ? metadata.tokens_input : null;
  const tokensOutput = typeof metadata?.tokens_output === "number" ? metadata.tokens_output : null;
  const tokensTotal = typeof metadata?.tokens_total === "number" ? metadata.tokens_total : null;
  const sessionId = typeof metadata?.session_id === "string" ? metadata.session_id : null;
  const subtaskTitle = typeof metadata?.subtask_title === "string" ? metadata.subtask_title : null;
  const durationSeconds = typeof metadata?.duration_seconds === "number" ? metadata.duration_seconds : null;
  const appVersion = typeof metadata?.app_version === "string" ? metadata.app_version : null;
  const taskTitle = typeof metadata?.task_title === "string" ? metadata.task_title : null;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 bg-[#909d63]/20 text-[#909d63] text-xs uppercase">
            {log.event_type.replace(/_/g, " ")}
          </span>
          {log.project_name && (
            <span className="px-2 py-0.5 bg-[#7daea3]/20 text-[#7daea3] text-xs">
              {log.project_name}
            </span>
          )}
        </div>
        <h2 className="text-xl text-[#d6d6d6]">
          {log.task_title || taskTitle || log.event_type.replace(/_/g, " ")}
        </h2>
        <p className="text-sm text-[#636363]">
          {formatTimestamp(log.created_at)}
        </p>
      </div>

      {metadata && Object.keys(metadata).length > 0 && (
        <div className="bg-[#232323] border border-[#3d3a34] p-4 mb-4">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-3">
            Detalhes
          </h3>
          <dl className="space-y-2">
            {oldStatus && newStatus && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Status:</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-[#bc5653]">{oldStatus}</span>
                  <span className="text-[#636363]">→</span>
                  <span className="text-[#909d63]">{newStatus}</span>
                </dd>
              </div>
            )}

            {tokensInput !== null && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Tokens entrada:</dt>
                <dd className="text-[#d6d6d6]">
                  {formatTokens(tokensInput)}
                </dd>
              </div>
            )}

            {tokensOutput !== null && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Tokens saida:</dt>
                <dd className="text-[#d6d6d6]">
                  {formatTokens(tokensOutput)}
                </dd>
              </div>
            )}

            {tokensTotal !== null && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Tokens total:</dt>
                <dd className="text-[#d3869b] font-medium">
                  {formatTokens(tokensTotal)}
                </dd>
              </div>
            )}

            {sessionId && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Session ID:</dt>
                <dd className="text-[#d6d6d6] font-mono text-xs">
                  {sessionId}
                </dd>
              </div>
            )}

            {subtaskTitle && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Subtask:</dt>
                <dd className="text-[#d6d6d6]">{subtaskTitle}</dd>
              </div>
            )}

            {durationSeconds !== null && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Duracao:</dt>
                <dd className="text-[#d6d6d6]">
                  {formatDuration(durationSeconds)}
                </dd>
              </div>
            )}

            {appVersion && (
              <div className="flex items-center gap-2 text-sm">
                <dt className="text-[#636363]">Versao app:</dt>
                <dd className="text-[#d6d6d6]">{appVersion}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {log.entity_id && (
        <div className="bg-[#232323] border border-[#3d3a34] p-4">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-3">
            Referencia
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#636363]">Tipo:</span>
              <span className="text-[#d6d6d6]">{log.entity_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#636363]">ID:</span>
              <code className="text-[#828282] font-mono text-xs bg-[#1c1c1c] px-1.5 py-0.5">
                {log.entity_id}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});
