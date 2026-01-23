import { createFileRoute, Outlet } from "@tanstack/react-router";

function LogsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/logs")({
  component: LogsLayout,
});
