import { CheckCircle2, Clock, PlayCircle, Timer } from "lucide-react";
import type { ActivityLogDocument } from "../../routes/logs";

type LogsMetricsProps = {
  logs: ActivityLogDocument[];
  fromDate: string | null;
  toDate: string | null;
};

interface TodayMetrics {
  tasksStarted: number;
  tasksCompleted: number;
  avgTaskDuration: number;
  totalWorked: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function isToday(timestamp: number): boolean {
  const logDate = new Date(timestamp * 1000);
  const today = new Date();
  return (
    logDate.getFullYear() === today.getFullYear() &&
    logDate.getMonth() === today.getMonth() &&
    logDate.getDate() === today.getDate()
  );
}

function calculateTodayMetrics(logs: ActivityLogDocument[]): TodayMetrics {
  let tasksStarted = 0;
  let tasksCompleted = 0;
  let totalTaskDuration = 0;
  let taskDurationCount = 0;

  const todayLogs = logs.filter((log) => isToday(log.created_at));

  for (const log of todayLogs) {
    const metadata = log.metadata as Record<string, unknown>;

    switch (log.event_type) {
      case "task_started":
        tasksStarted++;
        break;
      case "task_completed":
        tasksCompleted++;
        if (typeof metadata?.duration_seconds === "number") {
          totalTaskDuration += metadata.duration_seconds;
          taskDurationCount++;
        }
        break;
    }
  }

  const avgTaskDuration = taskDurationCount > 0 ? totalTaskDuration / taskDurationCount : 0;

  return {
    tasksStarted,
    tasksCompleted,
    avgTaskDuration,
    totalWorked: totalTaskDuration,
  };
}

export function LogsMetrics({ logs }: LogsMetricsProps) {
  const metrics = calculateTodayMetrics(logs);

  const today = new Date();
  const todayLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="p-4 border-b border-[#3d3a34] bg-[#1c1c1c]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-[#828282] uppercase tracking-wide">
          Metricas de Hoje
        </h2>
        <span className="text-xs text-[#636363] capitalize">{todayLabel}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={PlayCircle}
          iconColor="text-[#7daea3]"
          label="Tarefas iniciadas"
          value={metrics.tasksStarted.toString()}
        />

        <MetricCard
          icon={CheckCircle2}
          iconColor="text-[#909d63]"
          label="Tarefas concluidas"
          value={metrics.tasksCompleted.toString()}
        />

        <MetricCard
          icon={Clock}
          iconColor="text-[#ebc17a]"
          label="Tempo medio/task"
          value={metrics.avgTaskDuration > 0 ? formatDuration(metrics.avgTaskDuration) : "-"}
        />

        <MetricCard
          icon={Timer}
          iconColor="text-[#d3869b]"
          label="Total trabalhado"
          value={metrics.totalWorked > 0 ? formatDuration(metrics.totalWorked) : "-"}
        />
      </div>
    </div>
  );
}

type MetricCardProps = {
  icon: typeof CheckCircle2;
  iconColor: string;
  label: string;
  value: string;
  subvalue?: string;
  progress?: number;
};

function MetricCard({ icon: Icon, iconColor, label, value, subvalue, progress }: MetricCardProps) {
  return (
    <div className="bg-[#232323] border border-[#3d3a34] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={iconColor} />
        <span className="text-xs text-[#636363]">{label}</span>
      </div>
      <p className="text-lg text-[#d6d6d6] font-medium">{value}</p>
      {subvalue && (
        <p className="text-xs text-[#636363] mt-0.5">{subvalue}</p>
      )}
      {progress !== undefined && (
        <div className="mt-2 h-1 bg-[#3d3a34] overflow-hidden">
          <div
            className="h-full bg-[#d3869b] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}


