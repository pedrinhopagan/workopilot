import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { safeInvoke } from "../services/tauri";
import { TabBar } from "../components/TabBar";
import { HotkeyInput, type HotkeyValue } from "../components/HotkeyInput";

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

  const loadShortcut = useCallback(async () => {
    try {
      const shortcut = await safeInvoke<ShortcutConfig>("get_shortcut");
      setCurrentShortcut(shortcut);
    } catch (e) {
      console.error("Failed to load shortcut:", e);
    }
  }, []);

  useEffect(() => {
    loadShortcut();
  }, [loadShortcut]);

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

  return (
    <>
      <TabBar />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-xl">
          <div className="mb-6">
            <h1 className="text-xl text-[#d6d6d6] mb-1">Configuracoes</h1>
            <p className="text-sm text-[#636363]">Configuracoes globais da aplicacao</p>
          </div>

          <div className="bg-[#232323] border border-[#3d3a34] p-4">
            <h2 className="text-sm text-[#828282] uppercase tracking-wide mb-4">Atalho Global</h2>
            <p className="text-xs text-[#636363] mb-4">
              Define o atalho de teclado para abrir/fechar o WorkoPilot de qualquer lugar.
            </p>

            <div className="space-y-3">
              <div>
                <span className="block text-xs text-[#636363] mb-2">Clique para alterar o atalho</span>
                <HotkeyInput
                  value={hotkeyValue}
                  onChange={handleShortcutChange}
                  disabled={isSaving}
                />
              </div>

              {error && <div className="text-sm text-[#bc5653]">{error}</div>}
              {success && <div className="text-sm text-[#909d63]">{success}</div>}
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
