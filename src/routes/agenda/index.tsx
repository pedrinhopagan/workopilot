import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { agendaSearchSchema } from "../../lib/searchSchemas";
import { safeInvoke } from "../../services/tauri";
import type { Project } from "../../types";
import { TabBar } from "../../components/TabBar";
import { DayDrawer } from "../../components/agenda";
import { Calendar, type CalendarRef, UnscheduledPanel, type UnscheduledPanelRef } from "./-components";

function AgendaPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const calendarRef = useRef<CalendarRef>(null);
  const panelRef = useRef<UnscheduledPanelRef>(null);

  async function loadProjects() {
    const result = await safeInvoke<Project[]>("get_projects").catch((e) => {
      console.error("Failed to load projects:", e);
      return [];
    });
    setProjects(result);
  }

  function handleTaskScheduled() {
    calendarRef.current?.refresh();
    panelRef.current?.refresh();
  }

  function handleTaskChange() {
    calendarRef.current?.refresh();
    panelRef.current?.refresh();
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <>
      <TabBar />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/3 min-w-[280px] max-w-[360px]">
          <UnscheduledPanel
            ref={panelRef}
            projects={projects}
            onTaskScheduled={handleTaskScheduled}
          />
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <Calendar ref={calendarRef} onTasksChanged={handleTaskScheduled} />
        </div>

        <DayDrawer onTaskChange={handleTaskChange} />
      </main>
    </>
  );
}

export const Route = createFileRoute("/agenda/")({
  component: AgendaPage,
  validateSearch: (search) => agendaSearchSchema.parse(search),
});
