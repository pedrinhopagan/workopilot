import { useState } from "react";
import { Search, X, Calendar, Filter } from "lucide-react";
import { ProjectSelect } from "../ProjectSelect";

type LogFiltersProps = {
  onFiltersChange: (filters: FilterState) => void;
  totalLogs?: number;
};

export type FilterState = {
  query: string;
  eventTypes: string[];
  projectId: string | null;
  fromDate: string | null;
  toDate: string | null;
};

const EVENT_TYPE_OPTIONS = [
  { value: "task_created", label: "Task criada" },
  { value: "task_started", label: "Task iniciada" },
  { value: "task_completed", label: "Task concluida" },
  { value: "task_status_changed", label: "Status alterado" },
  { value: "subtask_started", label: "Subtask iniciada" },
  { value: "subtask_completed", label: "Subtask concluida" },
  { value: "subtask_status_changed", label: "Subtask alterada" },
  { value: "ai_session_start", label: "Sessao IA iniciada" },
  { value: "ai_session_end", label: "Sessao IA finalizada" },
  { value: "user_session_start", label: "App aberto" },
  { value: "user_session_end", label: "App fechado" },
];

const EVENT_TYPE_LABELS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export function LogFilters({ onFiltersChange, totalLogs }: LogFiltersProps) {
  const [query, setQuery] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);

  function emitChange(updates: Partial<FilterState>) {
    const newFilters: FilterState = {
      query: updates.query ?? query,
      eventTypes: updates.eventTypes ?? eventTypes,
      projectId: updates.projectId ?? projectId,
      fromDate: updates.fromDate ?? fromDate,
      toDate: updates.toDate ?? toDate,
    };
    onFiltersChange(newFilters);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  function handleQueryKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      emitChange({ query });
    }
  }

  function handleEventTypesChange(eventType: string) {
    const newTypes = eventTypes.includes(eventType)
      ? eventTypes.filter((t) => t !== eventType)
      : [...eventTypes, eventType];
    setEventTypes(newTypes);
    emitChange({ eventTypes: newTypes });
  }

  function handleProjectChange(value: string | null) {
    setProjectId(value);
    emitChange({ projectId: value });
  }

  function handleFromDateChange(value: string | null) {
    setFromDate(value);
    emitChange({ fromDate: value });
  }

  function handleToDateChange(value: string | null) {
    setToDate(value);
    emitChange({ toDate: value });
  }

  function clearFilters() {
    setQuery("");
    setEventTypes([]);
    setProjectId(null);
    setFromDate(null);
    setToDate(null);
    onFiltersChange({
      query: "",
      eventTypes: [],
      projectId: null,
      fromDate: null,
      toDate: null,
    });
  }

  const hasActiveFilters = query || eventTypes.length > 0 || projectId || fromDate || toDate;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#636363]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="Buscar eventos... (Enter para buscar)"
            className="w-full pl-9 pr-3 py-2 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] placeholder-[#636363] focus:outline-none focus:border-[#909d63] rounded-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#636363] pointer-events-none"
            />
            <input
              type="date"
              value={fromDate || ""}
              onChange={(e) => handleFromDateChange(e.target.value || null)}
              className="w-32 pl-8 pr-2 py-2 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] focus:outline-none focus:border-[#909d63] [color-scheme:dark] rounded-sm"
            />
          </div>
          <span className="text-[#636363] text-xs">ate</span>
          <input
            type="date"
            value={toDate || ""}
            onChange={(e) => handleToDateChange(e.target.value || null)}
            className="w-32 px-2 py-2 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] focus:outline-none focus:border-[#909d63] [color-scheme:dark] rounded-sm"
          />
        </div>

        <ProjectSelect
          value={projectId}
          onChange={handleProjectChange}
          showAllOption={true}
          allOptionLabel="Todos os projetos"
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}
            className="px-3 py-2 bg-[#2a2a2a] border border-[#3d3a34] text-sm flex items-center gap-2 hover:border-[#909d63] transition-colors rounded-sm"
          >
            <Filter size={14} className={eventTypes.length > 0 ? "text-[#909d63]" : "text-[#636363]"} />
            <span className={eventTypes.length > 0 ? "text-[#909d63]" : "text-[#636363]"}>
              {eventTypes.length > 0 ? eventTypes.length : "Tipo"}
            </span>
          </button>

          {showEventTypeDropdown && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-[#232323] border border-[#3d3a34] z-20 max-h-72 overflow-y-auto rounded-sm shadow-xl">
              {EVENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleEventTypesChange(option.value)}
                  className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors ${
                    eventTypes.includes(option.value) ? "bg-[#909d63]/10" : ""
                  }`}
                >
                  <span
                    className={`w-4 h-4 border flex items-center justify-center rounded-sm ${
                      eventTypes.includes(option.value)
                        ? "border-[#909d63] bg-[#909d63]"
                        : "border-[#636363]"
                    }`}
                  >
                    {eventTypes.includes(option.value) && (
                      <span className="text-[#1c1c1c] text-xs">✓</span>
                    )}
                  </span>
                  <span className="text-[#d6d6d6]">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="p-2 text-[#bc5653] hover:bg-[#bc5653]/10 transition-colors rounded-sm"
            title="Limpar filtros"
          >
            <X size={16} />
          </button>
        )}

        {totalLogs !== undefined && (
          <span className="text-xs text-[#636363] whitespace-nowrap">
            {totalLogs} evento{totalLogs !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {eventTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {eventTypes.map((eventType) => (
            <span
              key={eventType}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#909d63]/15 text-[#909d63] text-xs rounded-sm border border-[#909d63]/30"
            >
              {EVENT_TYPE_LABELS[eventType] || eventType}
              <button
                type="button"
                onClick={() => handleEventTypesChange(eventType)}
                className="hover:text-[#d6d6d6] transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
