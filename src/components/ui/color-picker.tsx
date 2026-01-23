import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

// Cores predefinidas para projetos
const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#64748b", // slate
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string | undefined) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-background border border-border hover:border-primary/50 transition-colors"
      >
        <div
          className="w-5 h-5 border border-border"
          style={{ backgroundColor: value || "transparent" }}
        />
        <span className="text-sm text-foreground">
          {value ? value.toUpperCase() : "Sem cor"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 p-3 bg-card border border-border shadow-lg">
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-6 h-6 border-2 transition-all hover:scale-110",
                  value === color ? "border-foreground" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              className="w-full mt-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Remover cor
            </button>
          )}
        </div>
      )}
    </div>
  );
}
