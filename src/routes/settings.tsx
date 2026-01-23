import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { safeInvoke } from "../services/tauri";
import { TabBar } from "../components/TabBar";
import { HotkeyInput, type HotkeyValue } from "../components/HotkeyInput";
import { Switch } from "@/components/ui/switch";

interface ShortcutConfig {
  modifier: string;
  key: string;
  display: string;
}

function SettingsPage() {
  const [currentShortcut, setCurrentShortcut] = useState<ShortcutConfig | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingSkills, setIsSyncingSkills] = useState(false);
  const [skillsMessage, setSkillsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pinnedWindow, setPinnedWindow] = useState(false);

  const loadShortcut = useCallback(async () => {
    try {
      const shortcut = await safeInvoke<ShortcutConfig>("get_shortcut");
      setCurrentShortcut(shortcut);
    } catch (e) {
      console.error("Failed to load shortcut:", e);
    }
  }, []);

  const loadPinnedWindow = useCallback(async () => {
    try {
      const value = await safeInvoke<string | null>("get_setting", { key: "pinned_window" });
      setPinnedWindow(value === "true");
    } catch (e) {
      console.error("Failed to load pinned_window setting:", e);
    }
  }, []);

  useEffect(() => {
    loadShortcut();
    loadPinnedWindow();
  }, [loadShortcut, loadPinnedWindow]);

  async function handlePinnedWindowChange(checked: boolean) {
    try {
      await safeInvoke("set_setting", { key: "pinned_window", value: checked ? "true" : "false" });
      setPinnedWindow(checked);
    } catch (e) {
      console.error("Failed to save pinned_window setting:", e);
    }
  }

  async function handleShortcutChange(newShortcut: { modifier: string; key: string }) {
    setError("");
    setSuccess("");
    setIsSaving(true);
    const shortcutStr = `${newShortcut.modifier}+${newShortcut.key}`;

    try {
      const shortcut = await safeInvoke<ShortcutConfig>("set_shortcut", { shortcut: shortcutStr });
      setCurrentShortcut(shortcut);
      setSuccess("Atalho salvo com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSaving(false);
    }
  }

  const hotkeyValue: HotkeyValue = currentShortcut
    ? { modifier: currentShortcut.modifier, key: currentShortcut.key }
    : null;

  async function handleSyncSkills() {
    setIsSyncingSkills(true);
    setSkillsMessage(null);
    try {
      const count = await safeInvoke<number>("sync_skills");
      setSkillsMessage({ type: "success", text: `${count} skills sincronizadas com sucesso!` });
      setTimeout(() => setSkillsMessage(null), 3000);
    } catch (e) {
      setSkillsMessage({ type: "error", text: String(e) });
    } finally {
      setIsSyncingSkills(false);
    }
  }

  return (
    <>
      <TabBar />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-xl">
          <div className="mb-6">
            <h1 className="text-xl text-foreground mb-1">Configuracoes</h1>
            <p className="text-sm text-muted-foreground">Configuracoes globais da aplicacao</p>
          </div>

          <div className="bg-card border border-border p-4">
            <h2 className="text-sm text-muted-foreground uppercase tracking-wide mb-4">Comportamento da Janela</h2>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="block text-sm text-foreground">Janela fixa</span>
                <span className="block text-xs text-muted-foreground">
                  Mantem a janela sempre visivel, ignorando o atalho de esconder
                </span>
              </div>
              <Switch
                checked={pinnedWindow}
                onCheckedChange={handlePinnedWindowChange}
              />
            </div>
          </div>

          <div className="bg-card border border-border p-4 mt-4">
            <h2 className="text-sm text-muted-foreground uppercase tracking-wide mb-4">Atalho Global</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Define o atalho de teclado para abrir/fechar o WorkoPilot de qualquer lugar.
            </p>

            <div className="space-y-3">
              <div>
                <span className="block text-xs text-muted-foreground mb-2">Clique para alterar o atalho</span>
                <HotkeyInput
                  value={hotkeyValue}
                  onChange={handleShortcutChange}
                  disabled={isSaving}
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}
              {success && <div className="text-sm text-primary">{success}</div>}
            </div>
          </div>

          <div className="bg-card border border-border p-4 mt-4">
            <h2 className="text-sm text-muted-foreground uppercase tracking-wide mb-4">Skills do OpenCode</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Sincroniza as skills do WorkoPilot para o OpenCode. As skills sao atualizadas automaticamente ao iniciar a aplicacao.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSyncSkills}
                disabled={isSyncingSkills}
                className="px-3 py-1.5 text-sm bg-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-foreground transition-colors"
              >
                {isSyncingSkills ? "Sincronizando..." : "Sincronizar Skills"}
              </button>

              {skillsMessage && (
                <div className={`text-sm ${skillsMessage.type === "success" ? "text-primary" : "text-destructive"}`}>
                  {skillsMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
