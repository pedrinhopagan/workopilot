import { memo } from "react";
import { cn } from "@/lib/utils";

export type ProgressCircleProps = {
	/** Progress value from 0 to 100 */
	progress: number;
	/** Size of the circle in pixels (default: 80) */
	size?: number;
	/** Stroke width in pixels (default: 6) */
	strokeWidth?: number;
	/** Show percentage label inside circle (default: true) */
	showLabel?: boolean;
	/** Secondary label below percentage (e.g., "3/7 subtarefas") */
	label?: string;
	/** Additional CSS class */
	className?: string;
};

export const ProgressCircle = memo(function ProgressCircle({
	progress,
	size = 80,
	strokeWidth = 6,
	showLabel = true,
	label,
	className,
}: ProgressCircleProps) {
	const clampedProgress = Math.min(100, Math.max(0, progress));
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset =
		circumference - (clampedProgress / 100) * circumference;
	const center = size / 2;

	return (
		<div
			className={cn("relative inline-flex flex-col items-center", className)}
			style={{ width: size, height: showLabel && label ? size + 20 : size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="transform -rotate-90"
				role="img"
				aria-labelledby="progress-circle-title"
			>
				<title id="progress-circle-title">
					Progresso: {Math.round(clampedProgress)}%
				</title>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					className="text-secondary"
				/>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					strokeLinecap="square"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					className="text-primary transition-[stroke-dashoffset] duration-300 ease-out"
				/>
			</svg>

			{showLabel && (
				<div
					className="absolute inset-0 flex flex-col items-center justify-center"
					style={{ width: size, height: size }}
				>
					<span className="text-lg font-semibold text-foreground leading-none">
						{Math.round(clampedProgress)}%
					</span>
				</div>
			)}

			{label && (
				<span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
					{label}
				</span>
			)}
		</div>
	);
});
