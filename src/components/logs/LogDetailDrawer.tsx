import { X, ExternalLink, Clock, Bot, User, CheckCircle2, Circle, Play } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import type { ActivityLogDocument } from "../../routes/logs";
import type { TaskFull, Subtask } from "../../types";
import { useEffect, useState } from "react";
import { safeInvoke } from "../../services/tauri";

type LogDetailDrawerProps = {
  log: ActivityLogDocument | null;
  onClose: () => void;
};

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  task_created: "Task criada",
  task_started: "Task iniciada",
  task_completed: "Task concluida",
  task_status_changed: "Status alterado",
  subtask_started: "Subtask iniciada",
  subtask_completed: "Subtask concluida",
  subtask_status_changed: "Subtask alterada",
  ai_session_start: "Sessao IA iniciada",
  ai_session_end: "Sessao IA finalizada",
  user_session_start: "App aberto",
  user_session_end: "App fechado",
};

const SUBTASK_STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  done: { icon: CheckCircle2, color: "text-[#909d63]" },
  in_progress: { icon: Play, color: "text-[#7daea3]" },
  pending: { icon: Circle, color: "text-[#636363]" },
};

export function LogDetailDrawer({ log, onClose }: LogDetailDrawerProps) {
  const navigate = useNavigate();
  const [taskData, setTaskData] = useState<TaskFull | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  useEffect(() => {
    if (!log) {
      setTaskData(null);
      return;
    }

    const isTaskEvent = log.event_type.startsWith("task_") || log.event_type.startsWith("subtask_");
    const taskId = log.entity_type === "task" ? log.entity_id : (log.metadata as Record<string, unknown>)?.task_id as string;

    if (isTaskEvent && taskId) {
      setLoadingTask(true);
      safeInvoke<TaskFull>("get_task_full", { projectPath: "", taskId })
        .then(setTaskData)
        .catch(() => setTaskData(null))
        .finally(() => setLoadingTask(false));
    } else {
      setTaskData(null);
    }
  }, [log]);

  if (!log) return null;

  const metadata = log.metadata as Record<string, unknown>;
  const eventLabel = EVENT_TYPE_LABELS[log.event_type] || log.event_type.replace(/_/g, " ");

  const isTaskEvent = log.event_type.startsWith("task_") || log.event_type.startsWith("subtask_");
  const isAISessionEvent = log.event_type.startsWith("ai_session_");
  const isUserSessionEvent = log.event_type.startsWith("user_session_");

  const tokensInput = typeof metadata?.tokens_input === "number" ? metadata.tokens_input : null;
  const tokensOutput = typeof metadata?.tokens_output === "number" ? metadata.tokens_output : null;
  const tokensTotal = typeof metadata?.tokens_total === "number" ? metadata.tokens_total : null;
  const sessionId = typeof metadata?.session_id === "string" ? metadata.session_id : null;
  const durationSeconds = typeof metadata?.duration_seconds === "number" ? metadata.duration_seconds : null;
  const appVersion = typeof metadata?.app_version === "string" ? metadata.app_version : null;
  const oldStatus = typeof metadata?.old_status === "string" ? metadata.old_status : null;
  const newStatus = typeof metadata?.new_status === "string" ? metadata.new_status : null;
  const subtaskId = typeof metadata?.subtask_id === "string" ? metadata.subtask_id : null;
  const subtaskTitle = typeof metadata?.subtask_title === "string" ? metadata.subtask_title : null;

  function handleNavigateToTask() {
    if (!log) return;
    const taskId = log.entity_type === "task" ? log.entity_id : (metadata?.task_id as string);
    if (taskId) {
      if (subtaskId) {
        navigate({ to: "/tasks/$taskId", params: { taskId }, search: { subtask: subtaskId } });
      } else {
        navigate({ to: "/tasks/$taskId", params: { taskId } });
      }
      onClose();
    }
  }

  function handleNavigateToSubtask(taskId: string, stId: string) {
    navigate({ to: "/tasks/$taskId", params: { taskId }, search: { subtask: stId } });
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Fechar drawer"
      />

      <div className="relative w-96 bg-[#1c1c1c] border-l border-[#3d3a34] flex flex-col animate-slide-in-right">
        <header className="flex items-center justify-between p-4 border-b border-[#3d3a34]">
          <div>
            <span className="px-2 py-0.5 bg-[#909d63]/20 text-[#909d63] text-xs uppercase">
              {eventLabel}
            </span>
            <p className="text-xs text-[#636363] mt-1">
              {formatTimestamp(log.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#2a2a2a] transition-colors"
            aria-label="Fechar"
          >
            <X size={18} className="text-[#828282]" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isTaskEvent && (
            <TaskEventDetails
              log={log}
              metadata={metadata}
              taskData={taskData}
              loadingTask={loadingTask}
              oldStatus={oldStatus}
              newStatus={newStatus}
              subtaskId={subtaskId}
              subtaskTitle={subtaskTitle}
              onNavigateToTask={handleNavigateToTask}
              onNavigateToSubtask={handleNavigateToSubtask}
            />
          )}

          {isAISessionEvent && (
            <AISessionDetails
              sessionId={sessionId}
              tokensInput={tokensInput}
              tokensOutput={tokensOutput}
              tokensTotal={tokensTotal}
              durationSeconds={durationSeconds}
              taskData={taskData}
              onNavigateToTask={handleNavigateToTask}
            />
          )}

          {isUserSessionEvent && (
            <UserSessionDetails
              durationSeconds={durationSeconds}
              appVersion={appVersion}
              metadata={metadata}
            />
          )}

          {log.project_name && (
            <div className="bg-[#232323] border border-[#3d3a34] p-3">
              <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
                Projeto
              </h3>
              <p className="text-sm text-[#7daea3]">{log.project_name}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

type TaskEventDetailsProps = {
  log: ActivityLogDocument;
  metadata: Record<string, unknown>;
  taskData: TaskFull | null;
  loadingTask: boolean;
  oldStatus: string | null;
  newStatus: string | null;
  subtaskId: string | null;
  subtaskTitle: string | null;
  onNavigateToTask: () => void;
  onNavigateToSubtask: (taskId: string, subtaskId: string) => void;
};

function TaskEventDetails({
  log,
  taskData,
  loadingTask,
  oldStatus,
  newStatus,
  subtaskId,
  subtaskTitle,
  onNavigateToTask,
  onNavigateToSubtask,
}: TaskEventDetailsProps) {
  const taskTitle = log.task_title || taskData?.title || "Task";

  return (
    <>
      <div className="bg-[#232323] border border-[#3d3a34] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
              Task
            </h3>
            <button
              type="button"
              onClick={onNavigateToTask}
              className="text-sm text-[#d6d6d6] hover:text-[#909d63] transition-colors flex items-center gap-1 group text-left"
            >
              <span className="truncate">{taskTitle}</span>
              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </button>
          </div>
          {taskData && (
            <span className={`px-2 py-0.5 text-xs uppercase ${getStatusColor(taskData.status)}`}>
              {taskData.status}
            </span>
          )}
        </div>
      </div>

      {oldStatus && newStatus && (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
            Mudanca de Status
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#bc5653]">{oldStatus}</span>
            <span className="text-[#636363]">→</span>
            <span className="text-[#909d63]">{newStatus}</span>
          </div>
        </div>
      )}

      {subtaskTitle && (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
            Subtask Relacionada
          </h3>
          <p className="text-sm text-[#d3869b]">{subtaskTitle}</p>
        </div>
      )}

      {loadingTask ? (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <p className="text-sm text-[#636363]">Carregando subtasks...</p>
        </div>
      ) : taskData && taskData.subtasks.length > 0 && (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
            Subtasks ({taskData.subtasks.filter(s => s.status === "done").length}/{taskData.subtasks.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {taskData.subtasks.map((st) => (
              <SubtaskItem
                key={st.id}
                subtask={st}
                isHighlighted={st.id === subtaskId}
                onClick={() => onNavigateToSubtask(taskData.id, st.id)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

type SubtaskItemProps = {
  subtask: Subtask;
  isHighlighted: boolean;
  onClick: () => void;
};

function SubtaskItem({ subtask, isHighlighted, onClick }: SubtaskItemProps) {
  const config = SUBTASK_STATUS_CONFIG[subtask.status] || SUBTASK_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 p-2 text-left text-sm transition-colors hover:bg-[#2a2a2a] ${
        isHighlighted ? "bg-[#909d63]/10 border border-[#909d63]/30" : ""
      }`}
    >
      <Icon size={14} className={config.color} />
      <span className={`truncate ${isHighlighted ? "text-[#909d63]" : "text-[#d6d6d6]"}`}>
        {subtask.title}
      </span>
    </button>
  );
}

type AISessionDetailsProps = {
  sessionId: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  tokensTotal: number | null;
  durationSeconds: number | null;
  taskData: TaskFull | null;
  onNavigateToTask: () => void;
};

function AISessionDetails({
  sessionId,
  tokensInput,
  tokensOutput,
  tokensTotal,
  durationSeconds,
  taskData,
  onNavigateToTask,
}: AISessionDetailsProps) {
  return (
    <>
      <div className="bg-[#232323] border border-[#3d3a34] p-3">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={16} className="text-[#d3869b]" />
          <h3 className="text-xs text-[#828282] uppercase tracking-wide">
            Sessao de IA
          </h3>
        </div>

        {sessionId && (
          <div className="mb-3">
            <span className="text-xs text-[#636363]">Session ID</span>
            <p className="text-xs font-mono text-[#828282] truncate">{sessionId}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {tokensInput !== null && (
            <div className="bg-[#1c1c1c] p-2">
              <span className="text-xs text-[#636363]">Entrada</span>
              <p className="text-sm text-[#d6d6d6]">{formatTokens(tokensInput)}</p>
            </div>
          )}
          {tokensOutput !== null && (
            <div className="bg-[#1c1c1c] p-2">
              <span className="text-xs text-[#636363]">Saida</span>
              <p className="text-sm text-[#d6d6d6]">{formatTokens(tokensOutput)}</p>
            </div>
          )}
          {tokensTotal !== null && (
            <div className="bg-[#1c1c1c] p-2">
              <span className="text-xs text-[#636363]">Total</span>
              <p className="text-sm text-[#d3869b] font-medium">{formatTokens(tokensTotal)}</p>
            </div>
          )}
        </div>
      </div>

      {durationSeconds !== null && (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#636363]" />
            <span className="text-xs text-[#636363]">Duracao</span>
          </div>
          <p className="text-sm text-[#d6d6d6] mt-1">{formatDuration(durationSeconds)}</p>
        </div>
      )}

      {taskData && (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
            Task Relacionada
          </h3>
          <button
            type="button"
            onClick={onNavigateToTask}
            className="text-sm text-[#d6d6d6] hover:text-[#909d63] transition-colors flex items-center gap-1 group"
          >
            <span className="truncate">{taskData.title}</span>
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      )}
    </>
  );
}

type UserSessionDetailsProps = {
  durationSeconds: number | null;
  appVersion: string | null;
  metadata: Record<string, unknown>;
};

function UserSessionDetails({
  durationSeconds,
  appVersion,
  metadata,
}: UserSessionDetailsProps) {
  const tasksCompleted = typeof metadata?.tasks_completed === "number" ? metadata.tasks_completed : null;
  const tokensUsed = typeof metadata?.tokens_used === "number" ? metadata.tokens_used : null;

  return (
    <>
      <div className="bg-[#232323] border border-[#3d3a34] p-3">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-[#83a598]" />
          <h3 className="text-xs text-[#828282] uppercase tracking-wide">
            Sessao do Usuario
          </h3>
        </div>

        {durationSeconds !== null && (
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-[#636363]" />
            <span className="text-sm text-[#d6d6d6]">{formatDuration(durationSeconds)}</span>
          </div>
        )}

        {appVersion && (
          <div className="text-xs text-[#636363]">
            Versao: <span className="text-[#828282]">{appVersion}</span>
          </div>
        )}
      </div>

      {(tasksCompleted !== null || tokensUsed !== null) && (
        <div className="bg-[#232323] border border-[#3d3a34] p-3">
          <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
            Resumo da Sessao
          </h3>
          <div className="space-y-2">
            {tasksCompleted !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#636363]">Tasks completadas</span>
                <span className="text-[#909d63]">{tasksCompleted}</span>
              </div>
            )}
            {tokensUsed !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#636363]">Tokens usados</span>
                <span className="text-[#d3869b]">{formatTokens(tokensUsed)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "done":
    case "completed":
      return "bg-[#909d63]/20 text-[#909d63]";
    case "in_progress":
      return "bg-[#7daea3]/20 text-[#7daea3]";
    case "pending":
      return "bg-[#636363]/20 text-[#636363]";
    case "awaiting_review":
      return "bg-[#ebc17a]/20 text-[#ebc17a]";
    default:
      return "bg-[#636363]/20 text-[#636363]";
  }
}
