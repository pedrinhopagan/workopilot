import { useState, useEffect } from "react";
import { Search, X, Calendar, Filter } from "lucide-react";
import type { Project } from "../../types";
import { safeInvoke } from "../../services/tauri";
import { getLogFacets } from "../../services/typesenseSync";

type LogFiltersProps = {
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
};

export type FilterState = {
  query: string;
  eventTypes: string[];
  projectId: string | null;
  fromDate: string | null;
  toDate: string | null;
};

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

export function LogFilters({ onFiltersChange, initialFilters }: LogFiltersProps) {
  const [query, setQuery] = useState(initialFilters?.query || "");
  const [eventTypes, setEventTypes] = useState<string[]>(initialFilters?.eventTypes || []);
  const [projectId, setProjectId] = useState<string | null>(initialFilters?.projectId || null);
  const [fromDate, setFromDate] = useState<string | null>(initialFilters?.fromDate || null);
  const [toDate, setToDate] = useState<string | null>(initialFilters?.toDate || null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);

  useEffect(() => {
    async function init() {
      const projectsResult = await safeInvoke<Project[]>("get_projects").catch(() => []);
      setProjects(projectsResult);

      const facets = await getLogFacets().catch(() => ({
        event_types: [],
        entity_types: [],
        projects: [],
      }));
      setAvailableEventTypes(facets.event_types.map((f) => f.value));
    }
    init();
  }, []);

  useEffect(() => {
    const filters: FilterState = {
      query,
      eventTypes,
      projectId,
      fromDate,
      toDate,
    };
    onFiltersChange(filters);
  }, [query, eventTypes, projectId, fromDate, toDate, onFiltersChange]);

  function toggleEventType(eventType: string) {
    setEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((t) => t !== eventType)
        : [...prev, eventType]
    );
  }

  function clearFilters() {
    setQuery("");
    setEventTypes([]);
    setProjectId(null);
    setFromDate(null);
    setToDate(null);
  }

  const hasActiveFilters = query || eventTypes.length > 0 || projectId || fromDate || toDate;

  return (
    <div className="p-3 border-b border-[#3d3a34] space-y-3">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#636363]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar eventos..."
          className="w-full pl-8 pr-3 py-1.5 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] placeholder-[#636363] focus:outline-none focus:border-[#909d63]"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Calendar
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#636363] pointer-events-none"
          />
          <input
            type="date"
            value={fromDate || ""}
            onChange={(e) => setFromDate(e.target.value || null)}
            className="w-full pl-8 pr-2 py-1.5 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] focus:outline-none focus:border-[#909d63] [color-scheme:dark]"
          />
        </div>
        <span className="text-[#636363] text-sm self-center">ate</span>
        <div className="flex-1">
          <input
            type="date"
            value={toDate || ""}
            onChange={(e) => setToDate(e.target.value || null)}
            className="w-full px-2 py-1.5 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] focus:outline-none focus:border-[#909d63] [color-scheme:dark]"
          />
        </div>
      </div>

      <select
        value={projectId || ""}
        onChange={(e) => setProjectId(e.target.value || null)}
        className="w-full px-2 py-1.5 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-[#d6d6d6] focus:outline-none focus:border-[#909d63]"
      >
        <option value="">Todos os projetos</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}
          className="w-full px-2 py-1.5 bg-[#2a2a2a] border border-[#3d3a34] text-sm text-left flex items-center gap-2 hover:border-[#909d63] transition-colors"
        >
          <Filter size={14} className="text-[#636363]" />
          <span className={eventTypes.length > 0 ? "text-[#d6d6d6]" : "text-[#636363]"}>
            {eventTypes.length > 0
              ? `${eventTypes.length} tipo${eventTypes.length > 1 ? "s" : ""} selecionado${eventTypes.length > 1 ? "s" : ""}`
              : "Filtrar por tipo de evento"}
          </span>
        </button>

        {showEventTypeDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#232323] border border-[#3d3a34] z-10 max-h-60 overflow-y-auto">
            {(availableEventTypes.length > 0
              ? availableEventTypes
              : Object.keys(EVENT_TYPE_LABELS)
            ).map((eventType) => (
              <button
                key={eventType}
                type="button"
                onClick={() => toggleEventType(eventType)}
                className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[#2a2a2a] ${
                  eventTypes.includes(eventType) ? "bg-[#909d63]/10" : ""
                }`}
              >
                <span
                  className={`w-4 h-4 border flex items-center justify-center ${
                    eventTypes.includes(eventType)
                      ? "border-[#909d63] bg-[#909d63]"
                      : "border-[#636363]"
                  }`}
                >
                  {eventTypes.includes(eventType) && (
                    <span className="text-[#1c1c1c] text-xs">✓</span>
                  )}
                </span>
                <span className="text-[#d6d6d6]">
                  {EVENT_TYPE_LABELS[eventType] || eventType}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {eventTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {eventTypes.map((eventType) => (
            <span
              key={eventType}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#909d63]/20 text-[#909d63] text-xs"
            >
              {EVENT_TYPE_LABELS[eventType] || eventType}
              <button
                type="button"
                onClick={() => toggleEventType(eventType)}
                className="hover:text-[#d6d6d6]"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full py-1.5 text-sm text-[#bc5653] hover:text-[#d6d6d6] hover:bg-[#bc5653]/10 transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
