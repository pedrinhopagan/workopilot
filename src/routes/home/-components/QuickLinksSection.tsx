import { Link } from "@tanstack/react-router";
import { ChevronRight, Zap } from "lucide-react";
import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";
import { getActiveQuickLinks, type QuickLink } from "@/lib/quickLinks";
import type { TaskFull } from "@/types";

const LINK_COLORS: Record<string, string> = {
	"task-to-execute": "hsl(var(--chart-1))",
	"task-to-review": "hsl(var(--chart-2))",
	"task-to-commit": "#6c5ce7",
	"tomorrow-empty": "hsl(var(--chart-3))",
	"overdue-task": "hsl(var(--destructive))",
	settings: "hsl(var(--muted-foreground))",
	"new-project": "hsl(var(--primary))",
};

type QuickLinkItemProps = {
	link: QuickLink;
};

const QuickLinkItem = memo(function QuickLinkItem({ link }: QuickLinkItemProps) {
	const Icon = link.icon;
	const accentColor = LINK_COLORS[link.id] || "hsl(var(--primary))";

	return (
		<Link
			to={link.to}
			search={link.search}
			className={cn(
				"group relative flex items-center gap-3 px-3 py-3",
				"bg-card border border-border",
				"transition-colors duration-200",
				"hover:border-primary/40 hover:bg-secondary/30",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			)}
		>
			<div
				className="absolute left-0 top-0 bottom-0 w-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-200"
				style={{
					background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}60 100%)`,
				}}
			/>

			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background: `radial-gradient(ellipse at left center, ${accentColor}08 0%, transparent 60%)`,
				}}
			/>

			<div
				className={cn(
					"relative p-2 bg-background/60 transition-colors duration-200",
					"group-hover:bg-background/80"
				)}
				style={{
					boxShadow: `inset 0 0 0 1px ${accentColor}25`,
				}}
			>
				<Icon
					size={14}
					style={{ color: accentColor }}
					className="transition-colors duration-200"
				/>
			</div>

			<div className="relative flex-1 min-w-0">
				<span
					className={cn(
						"text-sm text-foreground transition-colors duration-200",
						"group-hover:text-primary"
					)}
				>
					{link.title}
				</span>
				{link.description && (
					<p className="text-xs text-muted-foreground truncate mt-0.5 transition-colors duration-200">
						{link.description}
					</p>
				)}
			</div>

			<ChevronRight
				size={14}
				className="relative text-muted-foreground/50 group-hover:text-primary transition-colors duration-200"
			/>
		</Link>
	);
});

type QuickLinksSectionProps = {
	tasks: TaskFull[];
	className?: string;
};

export const QuickLinksSection = memo(function QuickLinksSection({
	tasks,
	className,
}: QuickLinksSectionProps) {
	const links = getActiveQuickLinks(tasks);

	const dynamicLinks = useMemo(() => links.filter(l => !l.isFixed), [links]);
	const fixedLinks = useMemo(() => links.filter(l => l.isFixed), [links]);

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center gap-2 mb-3">
				<div
					className="relative p-1.5 bg-primary/10"
					style={{
						boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.2)",
					}}
				>
					<Zap size={14} className="text-primary" />
					<div
						className="absolute inset-0 animate-glow-pulse opacity-50 pointer-events-none"
						style={{
							boxShadow: "0 0 15px hsl(var(--primary) / 0.3)",
						}}
					/>
				</div>
				<h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
					Atalhos
				</h3>
			</div>

			{dynamicLinks.length > 0 && (
				<div className="space-y-1.5">
					{dynamicLinks.map((link) => (
						<QuickLinkItem key={link.id} link={link} />
					))}
				</div>
			)}

			{dynamicLinks.length > 0 && fixedLinks.length > 0 && (
				<div className="border-t border-border/30 my-2" />
			)}

			{fixedLinks.length > 0 && (
				<div className="space-y-1.5">
					{fixedLinks.map((link) => (
						<QuickLinkItem key={link.id} link={link} />
					))}
				</div>
			)}
		</div>
	);
});
