import { memo } from "react";
import { cn } from "@/lib/utils";

type ProjectCardSkeletonProps = {
	index: number;
};

export const ProjectCardSkeleton = memo(function ProjectCardSkeleton({
	index,
}: ProjectCardSkeletonProps) {
	return (
		<div
			className={cn(
				"relative w-full border border-border/50 bg-card/50",
				"animate-stagger-fade-in opacity-0"
			)}
			style={{
				animationDelay: `${index * 0.08}s`,
			}}
		>
			<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-secondary animate-skeleton" />

			<div className="relative p-5 pl-6">
				<div className="flex items-start gap-3 mb-4">
					<div className="p-2.5 bg-secondary animate-skeleton w-10 h-10" />
					<div className="flex-1 min-w-0 space-y-2">
						<div className="h-5 bg-secondary animate-skeleton w-3/4" />
						<div className="h-3 bg-secondary animate-skeleton w-full" />
					</div>
				</div>

				<div className="flex items-center gap-2 mb-4">
					<div className="h-6 bg-secondary animate-skeleton w-20" />
					<div className="h-6 bg-secondary animate-skeleton w-12" />
				</div>

				<div className="mb-4">
					<div className="h-1 bg-secondary animate-skeleton" />
				</div>

				<div className="flex items-center justify-between">
					<div className="h-3 bg-secondary animate-skeleton w-24" />
					<div className="w-2 h-2 bg-secondary animate-skeleton" />
				</div>
			</div>
		</div>
	);
});
