import { memo } from "react";

import { cn } from "@/lib/utils";
import { TaskSummaryCard } from "./TaskSummaryCard";
import { DayTasksList } from "./DayTasksList";
import { QuickLinksSection } from "./QuickLinksSection";
import type { SuggestedAction } from "@/lib/constants/taskStatus";
import type { TaskFull } from "@/types";

type HomeSidebarProps = {
	selectedTask: TaskFull | null;
	tasks: TaskFull[];
	selectedDate: string;
	selectedTaskId: string | null;
	onTaskSelect: (taskId: string) => void;
	onStatusChange?: (taskId: string, currentStatus: string) => void;
	onActionClick: (action: SuggestedAction, task: TaskFull) => void;
	onNavigate: (taskId: string) => void;
	isActionLoading?: boolean;
	className?: string;
};

export const HomeSidebar = memo(function HomeSidebar({
	selectedTask,
	tasks,
	selectedDate,
	selectedTaskId,
	onTaskSelect,
	onStatusChange,
	onActionClick,
	onNavigate,
	isActionLoading,
	className,
}: HomeSidebarProps) {
	return (
		<aside
			className={cn(
				"relative flex flex-col h-full overflow-hidden",
				className
			)}
		>
			<div
				className="absolute top-0 left-0 right-0 h-32 pointer-events-none opacity-40"
				style={{
					background: "radial-gradient(ellipse at top center, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
				}}
			/>

		<div className="relative flex-1 overflow-y-auto space-y-5 p-5">
			<div className="min-h-[340px]">
				<TaskSummaryCard
					task={selectedTask}
					onActionClick={onActionClick}
					onNavigate={onNavigate}
					isLoading={isActionLoading}
				/>
			</div>

			<div className="border-t border-border/30" />

			<div className="min-h-[200px]">
				<DayTasksList
					tasks={tasks}
					selectedDate={selectedDate}
					selectedTaskId={selectedTaskId}
					onTaskSelect={onTaskSelect}
					onStatusChange={onStatusChange}
				/>
			</div>

			<div className="border-t border-border/30" />

			<div className="min-h-[200px]">
				<QuickLinksSection tasks={tasks} />
			</div>
		</div>
		</aside>
	);
});
