import { useState, useRef, useEffect } from "react";
import { useDialogStateStore } from "../../stores/dialogState";
import {
  type FullStatus,
  statusColors,
  statusLabels,
} from "../../lib/constants/taskStatus";

type StatusSelectProps = {
  value: FullStatus;
  onChange: (status: FullStatus) => void;
  disabled?: boolean;
};

const allStatuses: FullStatus[] = [
  "pending",
  "structuring",
  "executing",
  "awaiting_user",
  "awaiting_review",
  "done",
];

function StatusChip({
  status,
  size = "md",
}: {
  status: FullStatus;
  size?: "sm" | "md";
}) {
  const color = statusColors[status];
  const label = statusLabels[status];

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium transition-all duration-150 ${sizeClasses}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function StatusSelect({ value, onChange, disabled = false }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openDialog = useDialogStateStore((s) => s.openDialog);
  const closeDialog = useDialogStateStore((s) => s.closeDialog);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        closeDialog();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, closeDialog]);

  function handleToggle() {
    if (disabled) return;
    
    if (isOpen) {
      setIsOpen(false);
      closeDialog();
    } else {
      setIsOpen(true);
      openDialog();
    }
  }

  function handleSelect(status: FullStatus) {
    onChange(status);
    setIsOpen(false);
    closeDialog();
  }

  const currentColor = statusColors[value];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 
          bg-[#1c1c1c] border border-[#3d3a34] rounded-lg
          transition-all duration-200 ease-out
          ${disabled 
            ? "opacity-50 cursor-not-allowed" 
            : "hover:border-[#636363] hover:bg-[#232323] cursor-pointer"
          }
          ${isOpen ? "border-[#636363] bg-[#232323]" : ""}
        `}
        style={{
          boxShadow: isOpen ? `0 0 0 1px ${currentColor}30` : undefined,
        }}
      >
        <StatusChip status={value} />
        
        <svg
          aria-hidden="true"
          className={`w-4 h-4 text-[#636363] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-2 min-w-[200px]
            bg-[#232323] border border-[#3d3a34] rounded-lg
            shadow-xl z-50 overflow-hidden
            animate-fade-in
          "
          style={{
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(61, 58, 52, 0.5)",
          }}
        >
          <div className="py-1">
            {allStatuses.map((status) => {
              const isSelected = status === value;
              const color = statusColors[status];

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelect(status)}
                  className={`
                    w-full px-3 py-2 flex items-center gap-2
                    transition-all duration-150 ease-out
                    ${isSelected 
                      ? "bg-[#2a2a2a]" 
                      : "hover:bg-[#2a2a2a]"
                    }
                  `}
                  style={{
                    borderLeft: isSelected ? `2px solid ${color}` : "2px solid transparent",
                  }}
                >
                  <StatusChip status={status} />
                  
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 ml-auto flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
