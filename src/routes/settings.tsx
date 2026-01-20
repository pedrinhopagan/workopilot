import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { safeInvoke } from "../services/tauri";
import { TabBar } from "../components/TabBar";
import { useDialogStateStore } from "../stores/dialogState";

interface ShortcutConfig {
  modifier: string;
  key: string;
  display: string;
}

const modifiers = ["Alt", "Ctrl", "Shift", "Super"];
const keys = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "Space", "Escape",
];

function SettingsPage() {
  const openDialog = useDialogStateStore((s) => s.openDialog);
  const closeDialog = useDialogStateStore((s) => s.closeDialog);

  const [currentShortcut, setCurrentShortcut] = useState<ShortcutConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("Alt");
  const [selectedKey, setSelectedKey] = useState("P");

  const handleSelectFocus = () => openDialog();
  const handleSelectBlur = () => setTimeout(() => closeDialog(), 100);

  useEffect(() => {
    loadShortcut();
  }, []);

  async function loadShortcut() {
    try {
      const shortcut = await safeInvoke<ShortcutConfig>("get_shortcut");
      setCurrentShortcut(shortcut);
      if (shortcut) {
        setSelectedModifier(shortcut.modifier);
        setSelectedKey(shortcut.key);
      }
    } catch (e) {
      console.error("Failed to load shortcut:", e);
    }
  }

  async function saveShortcut() {
    setError("");
    setSuccess("");
    const shortcutStr = `${selectedModifier}+${selectedKey}`;

    try {
      const shortcut = await safeInvoke<ShortcutConfig>("set_shortcut", { shortcut: shortcutStr });
      setCurrentShortcut(shortcut);
      setSuccess("Atalho salvo com sucesso!");
      setIsEditing(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(String(e));
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setError("");
    if (currentShortcut) {
      setSelectedModifier(currentShortcut.modifier);
      setSelectedKey(currentShortcut.key);
    }
  }

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

            {!isEditing ? (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-xs text-[#636363]">Atalho atual:</span>
                  <div className="mt-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm inline-block">
                    {currentShortcut?.display || "Alt+P"}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] hover:border-[#636363] transition-colors"
                >
                  Alterar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-xs text-[#636363] mb-1">Modificador</label>
                    <select
                      value={selectedModifier}
                      onChange={(e) => setSelectedModifier(e.target.value)}
                      onFocus={handleSelectFocus}
                      onBlur={handleSelectBlur}
                      className="px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
                    >
                      {modifiers.map((mod) => (
                        <option key={mod} value={mod}>
                          {mod}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[#636363] mt-5">+</span>
                  <div>
                    <label className="block text-xs text-[#636363] mb-1">Tecla</label>
                    <select
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                      onFocus={handleSelectFocus}
                      onBlur={handleSelectBlur}
                      className="px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
                    >
                      {keys.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-sm text-[#828282]">
                  Preview: <span className="text-[#909d63]">{selectedModifier}+{selectedKey}</span>
                </div>

                {error && <div className="text-sm text-[#bc5653]">{error}</div>}

                <div className="flex gap-2">
                  <button
                    onClick={saveShortcut}
                    className="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] transition-colors"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {success && <div className="mt-3 text-sm text-[#909d63]">{success}</div>}
          </div>
        </div>
      </main>
    </>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
