import { useEffect, useRef, useCallback } from "react";
import type { ActivityLogDocument } from "../../routes/logs";
import { TimelineItem } from "./TimelineItem";
import { Activity } from "lucide-react";

type ActivityTimelineProps = {
  logs: ActivityLogDocument[];
  selectedLogId: string | null;
  onSelectLog: (log: ActivityLogDocument) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
};

export function ActivityTimeline({
  logs,
  selectedLogId,
  onSelectLog,
  onLoadMore,
  hasMore,
  isLoading,
  isLoadingMore,
}: ActivityTimelineProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore]
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

  if (logs.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#636363] p-8">
        <div className="w-16 h-16 rounded-full bg-[#232323] border border-[#3d3a34] flex items-center justify-center mb-4">
          <Activity size={24} className="text-[#636363]" />
        </div>
        <p className="text-sm mb-1">Nenhum evento encontrado</p>
        <p className="text-xs text-[#4a4a4a]">
          Os eventos aparecerao aqui conforme voce usar o WorkoPilot
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-2">
        {logs.map((log) => (
          <TimelineItem
            key={log.id}
            log={log}
            isSelected={selectedLogId === log.id}
            onClick={() => onSelectLog(log)}
          />
        ))}

        <div ref={observerRef} className="h-4" />

        {(isLoading || isLoadingMore) && (
          <div className="py-6 flex items-center justify-center gap-2 text-[#636363]">
            <div className="w-4 h-4 border-2 border-[#636363] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{isLoadingMore ? "Carregando mais..." : "Carregando..."}</span>
          </div>
        )}
      </div>
    </div>
  );
}
