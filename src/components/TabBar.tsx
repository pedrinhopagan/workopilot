import { Link, useLocation } from "@tanstack/react-router"
import { Settings, X } from "lucide-react"
import { safeGetCurrentWindow, safeInvoke } from "../services/tauri"

const tabs = [
  { path: "/projects", label: "Projetos" },
  { path: "/tasks", label: "Tarefas" },
  { path: "/agenda", label: "Agenda" },
  { path: "/logs", label: "Logs" },
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

export function TabBar() {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav
      className="flex items-center border-b border-[#3d3a34] cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      role="banner"
    >
      <div className="px-3 py-2 flex items-center">
        <img
          src="/workopilot_logo.svg"
          alt="WorkOpilot"
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
            (currentPath === "/" && tab.path === "/projects")
              ? "px-4 py-2 text-sm transition-colors cursor-pointer bg-[#909d63] text-[#1c1c1c] font-medium"
              : "px-4 py-2 text-sm transition-colors cursor-pointer text-[#828282] hover:text-[#d6d6d6] hover:bg-[#333333]"
          }
        >
          {tab.label}
        </Link>
      ))}
      <div className="flex-1"></div>
      <Link
        to="/settings"
        className={
          currentPath === "/settings"
            ? "px-3 py-2 text-sm transition-colors cursor-pointer text-[#909d63]"
            : "px-3 py-2 text-sm transition-colors cursor-pointer text-[#636363] hover:text-[#d6d6d6]"
        }
        title="Configuracoes"
      >
        <Settings size={16} />
      </Link>
      <button
        onClick={hideWindow}
        className="px-3 py-2 text-sm transition-colors cursor-pointer text-[#636363] hover:text-[#bc5653]"
        title="Esconder"
      >
        <X size={16} />
      </button>
    </nav>
  )
}
