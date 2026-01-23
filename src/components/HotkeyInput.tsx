import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogStateStore } from "../stores/dialogState";

type HotkeyValue = {
	modifier: string;
	key: string;
} | null;

type HotkeyInputProps = {
	value: HotkeyValue;
	onChange: (shortcut: { modifier: string; key: string }) => void;
	disabled?: boolean;
	className?: string;
};

const VALID_MODIFIERS = ["Alt", "Ctrl", "Shift", "Super"] as const;
const VALID_KEYS = [
	...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
	...Array.from({ length: 10 }, (_, i) => String(i)),
	...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
	"Space",
	"Escape",
] as const;

type ValidModifier = (typeof VALID_MODIFIERS)[number];
type ValidKey = (typeof VALID_KEYS)[number];

function isValidKey(key: string): key is ValidKey {
	return VALID_KEYS.includes(key as ValidKey);
}

function normalizeKey(e: KeyboardEvent): string | null {
	const { key, code } = e;

	if (code.startsWith("Key") && code.length === 4) {
		return code.slice(3).toUpperCase();
	}

	if (code.startsWith("Digit") && code.length === 6) {
		return code.slice(5);
	}

	if (code.startsWith("F") && !Number.isNaN(Number(code.slice(1)))) {
		const fNum = Number(code.slice(1));
		if (fNum >= 1 && fNum <= 12) return code;
	}

	if (code === "Space") return "Space";
	if (key === "Escape") return "Escape";

	return null;
}

function getActiveModifiers(e: KeyboardEvent): ValidModifier | null {
	const modifiers: ValidModifier[] = [];

	if (e.altKey) modifiers.push("Alt");
	if (e.ctrlKey) modifiers.push("Ctrl");
	if (e.shiftKey) modifiers.push("Shift");
	if (e.metaKey) modifiers.push("Super");

	if (modifiers.length === 1) return modifiers[0];
	if (modifiers.length > 1) return modifiers.join("+") as ValidModifier;

	return null;
}

function formatDisplay(value: HotkeyValue): string {
	if (!value) return "";
	return `${value.modifier} + ${value.key}`;
}

export function HotkeyInput({
	value,
	onChange,
	disabled = false,
	className = "",
}: HotkeyInputProps) {
	const [isListening, setIsListening] = useState(false);
	const [currentModifier, setCurrentModifier] = useState<string | null>(null);
	const [currentKey, setCurrentKey] = useState<string | null>(null);
	const containerRef = useRef<HTMLButtonElement>(null);
	const previousValueRef = useRef<HotkeyValue>(value);

	const openDialog = useDialogStateStore((s) => s.openDialog);
	const closeDialog = useDialogStateStore((s) => s.closeDialog);

	const startListening = useCallback(() => {
		if (disabled) return;
		previousValueRef.current = value;
		setIsListening(true);
		setCurrentModifier(null);
		setCurrentKey(null);
		openDialog();
	}, [disabled, value, openDialog]);

	const stopListening = useCallback(
		(commit: boolean) => {
			if (commit && currentModifier && currentKey) {
				onChange({ modifier: currentModifier, key: currentKey });
			}
			setIsListening(false);
			setCurrentModifier(null);
			setCurrentKey(null);
			setTimeout(() => closeDialog(), 100);
		},
		[currentModifier, currentKey, onChange, closeDialog],
	);

	const cancelListening = useCallback(() => {
		stopListening(false);
	}, [stopListening]);

	useEffect(() => {
		if (!isListening) return;

		function handleKeyDown(e: KeyboardEvent) {
			e.preventDefault();
			e.stopPropagation();

			if (
				e.key === "Escape" &&
				!e.altKey &&
				!e.ctrlKey &&
				!e.shiftKey &&
				!e.metaKey
			) {
				cancelListening();
				return;
			}

			const modifier = getActiveModifiers(e);
			const key = normalizeKey(e);

			if (modifier) {
				setCurrentModifier(modifier);
			}

			if (modifier && key && isValidKey(key) && key !== "Escape") {
				setCurrentKey(key);
				setTimeout(() => {
					onChange({ modifier, key });
					setIsListening(false);
					setCurrentModifier(null);
					setCurrentKey(null);
					setTimeout(() => closeDialog(), 100);
				}, 150);
			}
		}

		function handleKeyUp(e: KeyboardEvent) {
			e.preventDefault();
			e.stopPropagation();

			if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
				setCurrentModifier(null);
				setCurrentKey(null);
			}
		}

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);

		return () => {
			window.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
		};
	}, [isListening, cancelListening, onChange, closeDialog]);

	useEffect(() => {
		if (!isListening) return;

		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				cancelListening();
			}
		}

		const timeoutId = setTimeout(() => {
			document.addEventListener("mousedown", handleClickOutside);
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isListening, cancelListening]);

	function handleClick() {
		if (!isListening) {
			startListening();
		}
	}

	function handleKeyDownContainer(e: React.KeyboardEvent) {
		if (!isListening && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault();
			startListening();
		}
	}

	let displayText: string;
	let displayClass: string;

	if (isListening) {
		if (currentModifier && currentKey) {
			displayText = `${currentModifier} + ${currentKey}`;
			displayClass = "text-primary";
		} else if (currentModifier) {
			displayText = `${currentModifier} + ...`;
			displayClass = "text-primary";
		} else {
			displayText = "Press keys...";
			displayClass = "text-muted-foreground italic";
		}
	} else {
		displayText = value ? formatDisplay(value) : "Click to set";
		displayClass = value ? "text-foreground" : "text-muted-foreground";
	}

	return (
		<button
			ref={containerRef}
			type="button"
			disabled={disabled}
			onClick={handleClick}
			onKeyDown={handleKeyDownContainer}
			className={`
        relative px-3 py-1.5 min-w-[140px]
        bg-background border text-sm text-left
        transition-all duration-200 ease-out
        select-none cursor-pointer
        focus:outline-none
        ${
					isListening
						? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_0_12px_hsl(var(--primary)/0.15)]"
						: "border-border hover:border-secondary focus:border-primary"
				}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `
				.trim()
				.replace(/\s+/g, " ")}
			aria-label={
				isListening
					? "Listening for keyboard shortcut"
					: `Keyboard shortcut: ${value ? formatDisplay(value) : "not set"}`
			}
		>
			{isListening && (
				<span
					className="absolute inset-0 border border-primary rounded-[inherit] animate-pulse opacity-50"
					style={{ animationDuration: "1.5s" }}
				/>
			)}

			<span
				className={`relative z-10 ${displayClass} transition-colors duration-150`}
			>
				{displayText}
			</span>

			<span className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke={isListening ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="transition-colors duration-150"
					aria-hidden="true"
				>
					<rect x="2" y="4" width="20" height="16" rx="2" />
					<path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
				</svg>
			</span>
		</button>
	);
}

export type { HotkeyValue, HotkeyInputProps };
