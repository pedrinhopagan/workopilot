type SwitchProps = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
};

export function Switch({
	checked,
	onChange,
	disabled = false,
	className = "",
}: SwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`
				relative inline-flex h-5 w-9 shrink-0 cursor-pointer
				items-center rounded-full border-2 border-transparent
				transition-colors duration-200 ease-in-out
				focus:outline-none focus-visible:ring-2 focus-visible:ring-[#909d63] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1c1c]
				${checked ? "bg-[#909d63]" : "bg-[#3d3a34]"}
				${disabled ? "opacity-50 cursor-not-allowed" : ""}
				${className}
			`
				.trim()
				.replace(/\s+/g, " ")}
		>
			<span
				aria-hidden="true"
				className={`
					pointer-events-none inline-block h-4 w-4 rounded-full
					bg-[#d6d6d6] shadow-sm ring-0
					transition-transform duration-200 ease-in-out
					${checked ? "translate-x-4" : "translate-x-0"}
				`
					.trim()
					.replace(/\s+/g, " ")}
			/>
		</button>
	);
}

export type { SwitchProps };
