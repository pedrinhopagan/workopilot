import { createFileRoute, Outlet } from "@tanstack/react-router";

function AgendaLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/agenda")({
  component: AgendaLayout,
});
