import {
  CheckCircle2,
  Circle,
  Clock,
  Play,
  Plus,
  Power,
  PowerOff,
  Bot,
  BotOff,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLogDocument } from "../../services/typesense";

type TimelineItemProps = {
  log: ActivityLogDocument;
  isSelected: boolean;
  onClick: () => void;
};

const EVENT_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bgColor: string; label: string }
> = {
  task_created: {
    icon: Plus,
    color: "text-[#909d63]",
    bgColor: "bg-[#909d63]/20",
    label: "Task criada",
  },
  task_started: {
    icon: Play,
    color: "text-[#7daea3]",
    bgColor: "bg-[#7daea3]/20",
    label: "Task iniciada",
  },
  task_completed: {
    icon: CheckCircle2,
    color: "text-[#909d63]",
    bgColor: "bg-[#909d63]/20",
    label: "Task concluida",
  },
  task_status_changed: {
    icon: Circle,
    color: "text-[#ebc17a]",
    bgColor: "bg-[#ebc17a]/20",
    label: "Status alterado",
  },
  subtask_started: {
    icon: Play,
    color: "text-[#7daea3]",
    bgColor: "bg-[#7daea3]/20",
    label: "Subtask iniciada",
  },
  subtask_completed: {
    icon: CheckCircle2,
    color: "text-[#909d63]",
    bgColor: "bg-[#909d63]/20",
    label: "Subtask concluida",
  },
  subtask_status_changed: {
    icon: Circle,
    color: "text-[#ebc17a]",
    bgColor: "bg-[#ebc17a]/20",
    label: "Subtask alterada",
  },
  ai_session_start: {
    icon: Bot,
    color: "text-[#d3869b]",
    bgColor: "bg-[#d3869b]/20",
    label: "Sessao IA iniciada",
  },
  ai_session_end: {
    icon: BotOff,
    color: "text-[#d3869b]",
    bgColor: "bg-[#d3869b]/20",
    label: "Sessao IA finalizada",
  },
  user_session_start: {
    icon: Power,
    color: "text-[#83a598]",
    bgColor: "bg-[#83a598]/20",
    label: "App aberto",
  },
  user_session_end: {
    icon: PowerOff,
    color: "text-[#83a598]",
    bgColor: "bg-[#83a598]/20",
    label: "App fechado",
  },
};

const DEFAULT_CONFIG = {
  icon: Clock,
  color: "text-[#636363]",
  bgColor: "bg-[#636363]/20",
  label: "Evento",
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "agora";
  if (minutes < 60) return `ha ${minutes}min`;
  if (hours < 24) return `ha ${hours}h`;
  if (days === 1) return "ontem";
  if (days < 7) return `ha ${days} dias`;

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getEventTitle(log: ActivityLogDocument): string {
  const metadata = log.metadata as Record<string, unknown>;

  if (log.task_title) {
    return log.task_title;
  }

  if (metadata?.task_title) {
    return metadata.task_title as string;
  }

  if (metadata?.subtask_title) {
    return metadata.subtask_title as string;
  }

  if (log.event_type === "user_session_start") {
    return "Usuario iniciou o app";
  }

  if (log.event_type === "user_session_end") {
    return "Usuario fechou o app";
  }

  return log.project_name || "Evento";
}

export function TimelineItem({ log, isSelected, onClick }: TimelineItemProps) {
  const config = EVENT_CONFIG[log.event_type] || DEFAULT_CONFIG;
  const Icon = config.icon;
  const title = getEventTitle(log);
  const relativeTime = formatRelativeTime(log.created_at);
  const metadata = log.metadata as Record<string, unknown>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-[#2d2a24] ${
        isSelected
          ? "bg-[#909d63] text-[#1c1c1c]"
          : "hover:bg-[#2a2a2a]"
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isSelected ? "bg-[#1c1c1c]/20" : config.bgColor
        }`}
      >
        <Icon
          size={16}
          className={isSelected ? "text-[#1c1c1c]" : config.color}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isSelected ? "text-[#1c1c1c]/70" : "text-[#636363]"
            }`}
          >
            {config.label}
          </span>
          {metadata?.tokens_total && (
            <span
              className={`text-xs ${
                isSelected ? "text-[#1c1c1c]/60" : "text-[#d3869b]"
              }`}
            >
              {(metadata.tokens_total as number).toLocaleString()} tokens
            </span>
          )}
        </div>
        <p
          className={`text-sm truncate ${
            isSelected ? "text-[#1c1c1c]" : "text-[#d6d6d6]"
          }`}
        >
          {title}
        </p>
        <span
          className={`text-xs ${
            isSelected ? "text-[#1c1c1c]/60" : "text-[#636363]"
          }`}
        >
          {relativeTime}
        </span>
      </div>
    </button>
  );
}
