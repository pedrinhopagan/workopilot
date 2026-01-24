import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { agendaSearchSchema } from "../../lib/searchSchemas";
import { trpc } from "../../services/trpc";
import { TabBar } from "../../components/TabBar";
import { DayDrawer } from "../../components/agenda";
import { Calendar, type CalendarRef, UnscheduledPanel, type UnscheduledPanelRef } from "./-components";

function AgendaPage() {
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const calendarRef = useRef<CalendarRef>(null);
  const panelRef = useRef<UnscheduledPanelRef>(null);

  function handleTaskScheduled() {
    calendarRef.current?.refresh();
    panelRef.current?.refresh();
  }

  function handleTaskChange() {
    calendarRef.current?.refresh();
    panelRef.current?.refresh();
  }

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
