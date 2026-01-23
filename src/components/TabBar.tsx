import { Link, useLocation } from "@tanstack/react-router"
import { Settings, X } from "lucide-react"
import { safeGetCurrentWindow, safeInvoke } from "../services/tauri"

const tabs = [
  { path: "/home", label: "Home" },
  { path: "/projects", label: "Projetos" },
  { path: "/tasks", label: "Tarefas" },
  { path: "/agenda", label: "Agenda" },
]

async function handleMouseDown(e: React.MouseEvent) {
  if (
    e.button === 0 &&
    (e.target as HTMLElement).closest("nav") &&
    !(e.target as HTMLElement).closest("a") &&
    !(e.target as HTMLElement).closest("button")
  ) {
    const win = await safeGetCurrentWindow()
    win?.startDragging()
  }
}

function hideWindow() {
  safeInvoke("hide_window")
}

const isDev = import.meta.env.DEV

export function TabBar() {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav
      className="flex items-center border-b border-border cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      role="banner"
    >
      <div className="px-3 py-2 flex items-center">
        <img
          src="/workopilot_logo.svg"
          alt="WorkoPilot"
          className="w-5 h-5 opacity-60 pointer-events-none"
        />
      </div>
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={
            currentPath === tab.path ||
            currentPath.startsWith(tab.path + "/") ||
            (currentPath === "/" && tab.path === "/home")
              ? "px-4 py-2 text-sm transition-colors cursor-pointer bg-primary text-primary-foreground font-medium"
              : "px-4 py-2 text-sm transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary"
          }
        >
          {tab.label}
        </Link>
      ))}
      <div className="flex-1"></div>
      {isDev && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary border border-primary/50">
          DEV
        </span>
      )}
      <Link
        to="/settings"
        className={
          currentPath === "/settings"
            ? "px-3 py-2 text-sm transition-colors cursor-pointer text-primary"
            : "px-3 py-2 text-sm transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        }
        title="Configuracoes"
      >
        <Settings size={16} />
      </Link>
      <button
        onClick={hideWindow}
        className="px-3 py-2 text-sm transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
        title="Esconder"
      >
        <X size={16} />
      </button>
    </nav>
  )
}
