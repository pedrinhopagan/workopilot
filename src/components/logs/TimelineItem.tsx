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
  ChevronRight,
  Folder,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLogDocument } from "../../routes/logs";

type TimelineItemProps = {
  log: ActivityLogDocument;
  isSelected: boolean;
  onClick: () => void;
};

const EVENT_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bgColor: string; borderColor: string; label: string }
> = {
  task_created: {
    icon: Plus,
    color: "text-[#909d63]",
    bgColor: "bg-[#909d63]/10",
    borderColor: "border-[#909d63]/30",
    label: "Task criada",
  },
  task_started: {
    icon: Play,
    color: "text-[#7daea3]",
    bgColor: "bg-[#7daea3]/10",
    borderColor: "border-[#7daea3]/30",
    label: "Task iniciada",
  },
  task_completed: {
    icon: CheckCircle2,
    color: "text-[#909d63]",
    bgColor: "bg-[#909d63]/10",
    borderColor: "border-[#909d63]/30",
    label: "Task concluida",
  },
  task_status_changed: {
    icon: Circle,
    color: "text-[#ebc17a]",
    bgColor: "bg-[#ebc17a]/10",
    borderColor: "border-[#ebc17a]/30",
    label: "Status alterado",
  },
  subtask_started: {
    icon: Play,
    color: "text-[#7daea3]",
    bgColor: "bg-[#7daea3]/10",
    borderColor: "border-[#7daea3]/30",
    label: "Subtask iniciada",
  },
  subtask_completed: {
    icon: CheckCircle2,
    color: "text-[#909d63]",
    bgColor: "bg-[#909d63]/10",
    borderColor: "border-[#909d63]/30",
    label: "Subtask concluida",
  },
  subtask_status_changed: {
    icon: Circle,
    color: "text-[#ebc17a]",
    bgColor: "bg-[#ebc17a]/10",
    borderColor: "border-[#ebc17a]/30",
    label: "Subtask alterada",
  },
  ai_session_start: {
    icon: Bot,
    color: "text-[#d3869b]",
    bgColor: "bg-[#d3869b]/10",
    borderColor: "border-[#d3869b]/30",
    label: "Sessao IA iniciada",
  },
  ai_session_end: {
    icon: BotOff,
    color: "text-[#d3869b]",
    bgColor: "bg-[#d3869b]/10",
    borderColor: "border-[#d3869b]/30",
    label: "Sessao IA finalizada",
  },
  user_session_start: {
    icon: Power,
    color: "text-[#83a598]",
    bgColor: "bg-[#83a598]/10",
    borderColor: "border-[#83a598]/30",
    label: "App aberto",
  },
  user_session_end: {
    icon: PowerOff,
    color: "text-[#83a598]",
    bgColor: "bg-[#83a598]/10",
    borderColor: "border-[#83a598]/30",
    label: "App fechado",
  },
};

const DEFAULT_CONFIG = {
  icon: Clock,
  color: "text-[#636363]",
  bgColor: "bg-[#636363]/10",
  borderColor: "border-[#636363]/30",
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
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "ontem";
  if (days < 7) return `${days}d`;

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
  const tokensTotal = typeof metadata?.tokens_total === "number" ? metadata.tokens_total : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-4 text-left transition-all duration-200 rounded-sm border ${
        isSelected
          ? "bg-[#909d63]/15 border-[#909d63]/50 shadow-[0_0_0_1px_rgba(144,157,99,0.2)]"
          : "bg-[#232323] border-[#3d3a34] hover:border-[#4d4a44] hover:bg-[#282828]"
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center border transition-colors ${
          isSelected
            ? "bg-[#909d63]/20 border-[#909d63]/40"
            : `${config.bgColor} ${config.borderColor}`
        }`}
      >
        <Icon
          size={18}
          className={isSelected ? "text-[#909d63]" : config.color}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-xs font-medium uppercase tracking-wide ${
              isSelected ? "text-[#909d63]" : config.color
            }`}
          >
            {config.label}
          </span>
          {tokensTotal !== null && (
            <span className="text-xs text-[#d3869b]/80 bg-[#d3869b]/10 px-1.5 py-0.5 rounded-sm">
              {tokensTotal.toLocaleString()} tokens
            </span>
          )}
        </div>
        <p
          className={`text-sm font-medium truncate mb-1 ${
            isSelected ? "text-[#d6d6d6]" : "text-[#d6d6d6]"
          }`}
        >
          {title}
        </p>
        <div className="flex items-center gap-2 text-xs text-[#636363]">
          <span>{relativeTime}</span>
          {log.project_name && (
            <>
              <span className="text-[#4d4a44]">·</span>
              <span className="flex items-center gap-1 text-[#7daea3]/70">
                <Folder size={10} />
                {log.project_name}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight
        size={16}
        className={`flex-shrink-0 transition-all duration-200 ${
          isSelected
            ? "text-[#909d63] opacity-100"
            : "text-[#636363] opacity-0 group-hover:opacity-100"
        }`}
      />
    </button>
  );
}
