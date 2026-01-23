import { useEffect, useRef } from "react";
import { useDialogStateStore } from "../stores/dialogState";

type Option = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
};

export function Select({ value, onChange, options, placeholder, className = "" }: SelectProps) {
  const openDialog = useDialogStateStore((s) => s.openDialog);
  const closeDialog = useDialogStateStore((s) => s.closeDialog);
  const isOpenRef = useRef(false);

  useEffect(() => {
    return () => {
      if (isOpenRef.current) {
        closeDialog();
      }
    };
  }, [closeDialog]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value);
  }

  function handleMouseDown() {
    // Open dialog immediately on mousedown (before focus event)
    // This ensures dialogOpenRef is true before window focus changes
    if (!isOpenRef.current) {
      isOpenRef.current = true;
      openDialog();
    }
  }

  function handleBlur() {
    // Delay closing to allow for click selection within dropdown
    setTimeout(() => {
      if (isOpenRef.current) {
        isOpenRef.current = false;
        closeDialog();
      }
    }, 200);
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      onMouseDown={handleMouseDown}
      onBlur={handleBlur}
      className={`px-2 py-1 bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer ${className}`}
      style={{
        backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27hsl(130 3%25 52%25)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.5rem center",
        backgroundSize: "1em",
        paddingRight: "2rem",
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-background text-foreground">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
