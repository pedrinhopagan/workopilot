import { useEffect } from "react";
import { useDialogStateStore } from "../stores/dialogState";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  const openDialog = useDialogStateStore((s) => s.openDialog);
  const closeDialog = useDialogStateStore((s) => s.closeDialog);

  useEffect(() => {
    if (isOpen) {
      openDialog();
      return () => closeDialog();
    }
  }, [isOpen, openDialog, closeDialog]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-[#232323] border border-[#3d3a34] p-4 max-w-md w-full mx-4">
        <h3 className="text-[#d6d6d6] text-lg mb-2">{title}</h3>
        <p className="text-[#828282] text-sm mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#2c2c2c] border border-[#3d3a34] text-[#828282] text-sm hover:text-[#d6d6d6] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm transition-colors ${
              danger
                ? "bg-[#bc5653] text-[#1c1c1c] hover:bg-[#cc6663]"
                : "bg-[#909d63] text-[#1c1c1c] hover:bg-[#a0ad73]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
