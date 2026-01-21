import { useEffect, useRef, useCallback } from "react";
import type { ActivityLogDocument } from "../../services/typesense";
import { TimelineItem } from "./TimelineItem";

type ActivityTimelineProps = {
  logs: ActivityLogDocument[];
  selectedLogId: string | null;
  onSelectLog: (log: ActivityLogDocument) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
};

type GroupedLogs = {
  label: string;
  logs: ActivityLogDocument[];
};

function groupLogsByDate(logs: ActivityLogDocument[]): GroupedLogs[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: Record<string, ActivityLogDocument[]> = {
    Hoje: [],
    Ontem: [],
    "Esta semana": [],
    Anteriores: [],
  };

  for (const log of logs) {
    const logDate = new Date(log.created_at * 1000);
    const logDay = new Date(
      logDate.getFullYear(),
      logDate.getMonth(),
      logDate.getDate()
    );

    if (logDay.getTime() === today.getTime()) {
      groups["Hoje"].push(log);
    } else if (logDay.getTime() === yesterday.getTime()) {
      groups["Ontem"].push(log);
    } else if (logDay.getTime() >= weekAgo.getTime()) {
      groups["Esta semana"].push(log);
    } else {
      groups["Anteriores"].push(log);
    }
  }

  return Object.entries(groups)
    .filter(([, logs]) => logs.length > 0)
    .map(([label, logs]) => ({ label, logs }));
}

export function ActivityTimeline({
  logs,
  selectedLogId,
  onSelectLog,
  onLoadMore,
  hasMore,
  isLoading,
}: ActivityTimelineProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  const groupedLogs = groupLogsByDate(logs);

  if (logs.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#636363] text-sm p-4 text-center">
        Nenhum evento encontrado.
        <br />
        Os eventos aparecerao aqui conforme voce usar o WorkoPilot.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {groupedLogs.map((group) => (
        <div key={group.label}>
          <div className="sticky top-0 bg-[#232323] px-3 py-2 border-b border-[#3d3a34]">
            <span className="text-xs text-[#828282] uppercase tracking-wide">
              {group.label}
            </span>
          </div>
          {group.logs.map((log) => (
            <TimelineItem
              key={log.id}
              log={log}
              isSelected={selectedLogId === log.id}
              onClick={() => onSelectLog(log)}
            />
          ))}
        </div>
      ))}

      <div ref={observerRef} className="h-4" />

      {isLoading && (
        <div className="p-4 text-center text-[#636363] text-sm">
          Carregando...
        </div>
      )}
    </div>
  );
}
