import { CheckCircle2, Clock, Bot, TrendingUp, Activity } from "lucide-react";
import type { ActivityLogDocument } from "../../routes/logs";

type LogsMetricsProps = {
  logs: ActivityLogDocument[];
  fromDate: string | null;
  toDate: string | null;
};

interface MetricsSummary {
  tasksCompleted: number;
  tasksStarted: number;
  completionRate: number;
  totalTokens: number;
  avgTokensPerSession: number;
  avgTaskDuration: number;
  aiSessionCount: number;
  mostActiveProject: string | null;
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function calculateMetrics(logs: ActivityLogDocument[]): MetricsSummary {
  let tasksCompleted = 0;
  let tasksStarted = 0;
  let totalTokens = 0;
  let aiSessionCount = 0;
  let totalTaskDuration = 0;
  let taskDurationCount = 0;
  const projectCounts = new Map<string, number>();

  for (const log of logs) {
    const metadata = log.metadata as Record<string, unknown>;

    switch (log.event_type) {
      case "task_completed":
        tasksCompleted++;
        if (typeof metadata?.duration_seconds === "number") {
          totalTaskDuration += metadata.duration_seconds;
          taskDurationCount++;
        }
        break;
      case "task_started":
        tasksStarted++;
        break;
      case "ai_session_end":
        aiSessionCount++;
        if (typeof metadata?.tokens_total === "number") {
          totalTokens += metadata.tokens_total;
        }
        break;
    }

    if (log.project_name) {
      projectCounts.set(
        log.project_name,
        (projectCounts.get(log.project_name) || 0) + 1
      );
    }
  }

  let mostActiveProject: string | null = null;
  let maxCount = 0;
  for (const [project, count] of projectCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveProject = project;
    }
  }

  const completionRate = tasksStarted > 0 ? (tasksCompleted / tasksStarted) * 100 : 0;
  const avgTokensPerSession = aiSessionCount > 0 ? totalTokens / aiSessionCount : 0;
  const avgTaskDuration = taskDurationCount > 0 ? totalTaskDuration / taskDurationCount : 0;

  return {
    tasksCompleted,
    tasksStarted,
    completionRate,
    totalTokens,
    avgTokensPerSession,
    avgTaskDuration,
    aiSessionCount,
    mostActiveProject,
  };
}

export function LogsMetrics({ logs, fromDate, toDate }: LogsMetricsProps) {
  const metrics = calculateMetrics(logs);

  const periodLabel = fromDate && toDate
    ? `${formatDate(fromDate)} - ${formatDate(toDate)}`
    : fromDate
    ? `Desde ${formatDate(fromDate)}`
    : toDate
    ? `Ate ${formatDate(toDate)}`
    : "Todos os tempos";

  return (
    <div className="p-4 border-b border-[#3d3a34] bg-[#1c1c1c]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-[#828282] uppercase tracking-wide">
          Metricas
        </h2>
        <span className="text-xs text-[#636363]">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={CheckCircle2}
          iconColor="text-[#909d63]"
          label="Tasks concluidas"
          value={metrics.tasksCompleted.toString()}
          subvalue={metrics.tasksStarted > 0 ? `de ${metrics.tasksStarted} iniciadas` : undefined}
        />

        <MetricCard
          icon={TrendingUp}
          iconColor="text-[#7daea3]"
          label="Taxa conclusao"
          value={`${Math.round(metrics.completionRate)}%`}
          subvalue={metrics.tasksStarted > 0 ? `${metrics.tasksCompleted}/${metrics.tasksStarted}` : undefined}
        />

        <MetricCard
          icon={Bot}
          iconColor="text-[#d3869b]"
          label="Tokens usados"
          value={formatTokens(metrics.totalTokens)}
          subvalue={metrics.aiSessionCount > 0 ? `${metrics.aiSessionCount} sessoes` : undefined}
        />

        <MetricCard
          icon={Clock}
          iconColor="text-[#ebc17a]"
          label="Tempo medio/task"
          value={metrics.avgTaskDuration > 0 ? formatDuration(metrics.avgTaskDuration) : "-"}
          subvalue={`${metrics.aiSessionCount} sessoes IA`}
        />
      </div>

      {metrics.mostActiveProject && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Activity size={12} className="text-[#636363]" />
          <span className="text-[#636363]">Projeto mais ativo:</span>
          <span className="text-[#7daea3]">{metrics.mostActiveProject}</span>
        </div>
      )}
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
