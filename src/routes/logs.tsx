import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { safeInvoke } from "../services/tauri";
import { TabBar } from "../components/TabBar";
import type { SessionLog } from "../types";

function LogsPage() {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [dailyTokens, setDailyTokens] = useState(0);
  const tokenGoal = 100000;

  const tokenPercentage = Math.min((dailyTokens / tokenGoal) * 100, 100);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const data = await safeInvoke<SessionLog[]>("get_session_logs");
      setLogs(data);
      setDailyTokens(data.reduce((sum, log) => sum + log.tokens_total, 0));
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTokens(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }

  return (
    <>
      <TabBar />
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-[#3d3a34] flex flex-col bg-[#232323]">
          <div className="p-3 border-b border-[#3d3a34]">
            <div className="text-xs text-[#828282] uppercase tracking-wide mb-2">Tokens Hoje</div>
            <div className="h-1.5 bg-[#2c2c2c] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#909d63] to-[#c67b5c] transition-all"
                style={{ width: `${tokenPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-[#636363]">
              <span>{formatTokens(dailyTokens)}</span>
              <span>Meta: {formatTokens(tokenGoal)}</span>
            </div>
          </div>

          <div className="p-3 border-b border-[#3d3a34]">
            <span className="text-xs text-[#828282] uppercase tracking-wide">Sessions</span>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {logs.map((log) => (
              <li key={log.id}>
                <button
                  className={`w-full px-3 py-2 text-left transition-colors border-b border-[#2d2a24] ${
                    selectedLog?.id === log.id
                      ? "bg-[#909d63] text-[#1c1c1c]"
                      : "hover:bg-[#333333]"
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div
                    className={`text-sm ${
                      selectedLog?.id === log.id ? "text-[#1c1c1c]" : "text-[#d6d6d6]"
                    }`}
                  >
                    {log.project_name}
                  </div>
                  <div
                    className={`flex justify-between text-xs ${
                      selectedLog?.id === log.id
                        ? "text-[#1c1c1c] opacity-70"
                        : "text-[#636363]"
                    }`}
                  >
                    <span>{formatDate(log.created_at)}</span>
                    <span>{formatTokens(log.tokens_total)} tokens</span>
                  </div>
                </button>
              </li>
            ))}

            {logs.length === 0 && (
              <li className="px-3 py-4 text-[#636363] text-sm text-center">
                Nenhum log encontrado.
                <br />
                Use /log-session no opencode.
              </li>
            )}
          </ul>
        </aside>

        <section className="flex-1 overflow-y-auto p-4">
          {selectedLog ? (
            <div className="max-w-2xl">
              <div className="mb-4">
                <h2 className="text-xl text-[#d6d6d6]">{selectedLog.project_name}</h2>
                <p className="text-sm text-[#636363]">
                  {formatDate(selectedLog.created_at)} • {formatTokens(selectedLog.tokens_total)}{" "}
                  tokens
                </p>
              </div>

              <div className="bg-[#232323] border border-[#3d3a34] p-4 mb-4">
                <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">Resumo</h3>
                <p className="text-sm text-[#d6d6d6]">{selectedLog.summary}</p>
              </div>

              <div className="bg-[#232323] border border-[#3d3a34] p-4">
                <h3 className="text-xs text-[#828282] uppercase tracking-wide mb-2">
                  Arquivos Modificados
                </h3>
                <ul className="space-y-1">
                  {selectedLog.files_modified.map((file, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span
                        className={`w-5 h-5 flex items-center justify-center text-xs ${
                          file.action === "created"
                            ? "bg-[#909d63] text-[#1c1c1c]"
                            : file.action === "deleted"
                              ? "bg-[#bc5653] text-[#1c1c1c]"
                              : "bg-[#ebc17a] text-[#1c1c1c]"
                        }`}
                      >
                        {file.action === "created" ? "+" : file.action === "deleted" ? "-" : "~"}
                      </span>
                      <code className="text-[#828282]">{file.path}</code>
                    </li>
                  ))}

                  {selectedLog.files_modified.length === 0 && (
                    <li className="text-[#636363] text-sm">Nenhum arquivo modificado registrado</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#828282]">
              Selecione um log para ver os detalhes
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});
