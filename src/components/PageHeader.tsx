import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";

export type PageHeaderProps = {
	title: string;
	subtitle?: string;
	icon?: LucideIcon;
	action?: ReactNode;
	accentColor?: string;
	className?: string;
};

export const PageHeader = memo(function PageHeader({
	title,
	subtitle,
	icon: Icon,
	action,
	accentColor,
	className,
}: PageHeaderProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between mb-6",
				className,
			)}
		>
			<div className="flex items-center gap-3">
				{Icon && (
					<div
						className={cn(
							"p-2 rounded-md transition-colors",
							accentColor
								? "bg-[var(--header-icon-bg)]"
								: "bg-primary/10",
						)}
						style={
							accentColor
								? ({
										"--header-icon-bg": `${accentColor}15`,
									} as React.CSSProperties)
								: undefined
						}
					>
						<Icon
							size={20}
							className="transition-colors"
							style={accentColor ? { color: accentColor } : undefined}
						/>
					</div>
				)}
				<div>
					<h1 className="text-xl text-foreground font-medium">{title}</h1>
					{subtitle && (
						<p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
					)}
				</div>
			</div>

			{action && <div className="flex items-center gap-2">{action}</div>}
		</div>
	);
});

export default PageHeader;
