import { DayDrawer } from "@/components/agenda";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
	getComplexityColor,
	getComplexityLabel,
	getTaskProgressState,
	getTaskProgressStateBadgeVariant,
	getTaskProgressStateIndicator,
	getTaskProgressStateLabel,
	type SuggestedAction,
} from "@/lib/constants/taskStatus";
import { cn } from "@/lib/utils";
import { safeInvoke } from "@/services/tauri";
import { trpc } from "@/services/trpc";
import type { Task, TaskFull } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Activity,
	Calendar,
	CheckCircle2,
	ChevronRight,
	LayoutDashboard,
	Loader2,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { HomeSidebar } from "./-components/HomeSidebar";

function useInProgressTasks() {
	const tasksFullQuery = trpc.tasks.listFull.useQuery(undefined, {
		staleTime: 60_000,
	});

	const inProgressTasks = useMemo(() => {
		const tasks = tasksFullQuery.data ?? [];
		return tasks
			.filter((task) => {
				const state = getTaskProgressState(task);
				return state !== "idle" && state !== "done";
			})
			.sort((a, b) => {
				const stateA = getTaskProgressState(a);
				const stateB = getTaskProgressState(b);

				const stateOrder: Record<string, number> = {
					"ai-working": 0,
					"in-execution": 1,
					"ready-to-review": 2,
					"ready-to-start": 3,
					started: 4,
				};

				const orderA = stateOrder[stateA] ?? 5;
				const orderB = stateOrder[stateB] ?? 5;

				if (orderA !== orderB) return orderA - orderB;
				return (a.priority || 3) - (b.priority || 3);
			});
	}, [tasksFullQuery.data]);

	return {
		tasks: inProgressTasks,
		allTasks: tasksFullQuery.data ?? [],
		isLoading: tasksFullQuery.isLoading,
		refetch: tasksFullQuery.refetch,
	};
}

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function getWeekDates(): {
	date: string;
	dayNumber: number;
	weekDay: string;
	isToday: boolean;
}[] {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const sunday = new Date(today);
	sunday.setDate(today.getDate() - dayOfWeek);

	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

	return WEEK_DAYS.map((weekDay, index) => {
		const date = new Date(sunday);
		date.setDate(sunday.getDate() + index);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		return {
			date: dateStr,
			dayNumber: date.getDate(),
			weekDay,
			isToday: dateStr === todayStr,
		};
	});
}

const WEEK_DATES_CACHE = getWeekDates();

function useWeekTasks() {
	const weekDates = WEEK_DATES_CACHE;
	const firstDate = weekDates[0];

	const year = firstDate
		? Number.parseInt(firstDate.date.split("-")[0], 10)
		: new Date().getFullYear();
	const month = firstDate
		? Number.parseInt(firstDate.date.split("-")[1], 10)
		: new Date().getMonth() + 1;

	const tasksQuery = trpc.tasks.listForMonth.useQuery(
		{ year, month },
		{ staleTime: 60_000 },
	);

	const tasksByDate = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const { date } of weekDates) {
			map.set(date, []);
		}

		const tasks = tasksQuery.data ?? [];
		for (const task of tasks) {
			if (task.scheduled_date && map.has(task.scheduled_date)) {
				map.get(task.scheduled_date)?.push(task as Task);
			}
		}

		return map;
	}, [weekDates, tasksQuery.data]);

	const weekTaskCount = useMemo(() => {
		let count = 0;
		for (const tasks of tasksByDate.values()) {
			count += tasks.length;
		}
		return count;
	}, [tasksByDate]);

	return {
		weekDates,
		tasksByDate,
		weekTaskCount,
		isLoading: tasksQuery.isLoading,
		refetch: tasksQuery.refetch,
	};
}

function isTaskOverdue(task: Task): boolean {
	if (!task.due_date || task.status === "done") return false;
	const today = new Date().toISOString().split("T")[0];
	return task.due_date < today;
}

function getTodayString(): string {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

type SectionHeaderProps = {
	title: string;
	icon: React.ReactNode;
	linkTo: string;
	linkLabel: string;
	badge?: string | number;
	accentColor?: string;
};

const SectionHeader = memo(function SectionHeader({
	title,
	icon,
	linkTo,
	linkLabel,
	badge,
	accentColor = "hsl(var(--primary))",
}: SectionHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-4">
			<div className="flex items-center gap-2">
				<div
					className="p-1.5 transition-all duration-200"
					style={{
						background: `${accentColor}15`,
					}}
				>
					{icon}
				</div>
				<h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
					{title}
				</h2>
				{badge !== undefined && (
					<Badge variant="secondary" className="text-xs">
						{badge}
					</Badge>
				)}
			</div>
			<Link
				to={linkTo}
				className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
			>
				{linkLabel}
				<ChevronRight className="size-3" />
			</Link>
		</div>
	);
});

type WeekDayCardProps = {
	dayNumber: number;
	weekDay: string;
	isToday: boolean;
	tasks: Task[];
	isSelected: boolean;
	onClick: () => void;
};

const WeekDayCard = memo(function WeekDayCard({
	dayNumber,
	weekDay,
	isToday,
	tasks,
	isSelected,
	onClick,
}: WeekDayCardProps) {
	const hasOverdue = tasks.some((t) => isTaskOverdue(t));
	const taskCount = tasks.length;
	const hasTasks = taskCount > 0;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative flex flex-col items-center p-3 min-h-[90px]",
				"border border-border bg-card",
				"transition-colors duration-200 cursor-pointer",
				"hover:border-primary/40 hover:bg-secondary/30",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isToday && "ring-1 ring-primary/50 border-primary/30",
				isSelected && "border-chart-1/60 bg-chart-1/10",
			)}
		>
			{isToday && (
				<div
					className="absolute inset-0 opacity-30 pointer-events-none"
					style={{
						background:
							"radial-gradient(ellipse at center, hsl(var(--primary) / 0.2) 0%, transparent 70%)",
					}}
				/>
			)}

			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background:
						"radial-gradient(ellipse at top, hsl(var(--primary) / 0.08) 0%, transparent 60%)",
				}}
			/>

			<span
				className={cn(
					"text-xs text-muted-foreground transition-colors duration-200",
					isToday && "text-primary font-medium",
					isSelected && "text-chart-1 font-medium",
				)}
			>
				{weekDay}
			</span>

			<span
				className={cn(
					"text-xl font-semibold mt-1",
					isToday
						? "text-primary"
						: isSelected
							? "text-chart-1"
							: "text-foreground",
				)}
			>
				{dayNumber}
			</span>

			<div className="flex items-center gap-1.5 mt-2">
				{hasTasks && (
					<div className="flex items-center gap-1">
						<div
							className={cn(
								"w-1.5 h-1.5 rounded-full",
								hasOverdue ? "bg-destructive animate-pulse" : "bg-primary",
							)}
						/>
						<span
							className={cn(
								"text-xs transition-colors duration-200",
								hasOverdue
									? "text-destructive"
									: "text-muted-foreground group-hover:text-foreground",
							)}
						>
							{taskCount}
						</span>
					</div>
				)}
			</div>

			{(isToday || hasTasks || isSelected) && (
				<div
					className={cn(
						"absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-200",
						"opacity-0 group-hover:opacity-100",
						isSelected && "opacity-100",
					)}
					style={{
						background: isSelected
							? "hsl(var(--chart-1))"
							: isToday
								? "hsl(var(--primary))"
								: hasOverdue
									? "hsl(var(--destructive))"
									: "hsl(var(--primary) / 0.6)",
					}}
				/>
			)}
		</button>
	);
});

type InProgressTaskCardProps = {
	task: TaskFull;
	onClick: () => void;
	variant?: "default" | "compact";
	isSelected?: boolean;
};

const InProgressTaskCard = memo(function InProgressTaskCard({
	task,
	onClick,
	variant = "default",
	isSelected = false,
}: InProgressTaskCardProps) {
	const isCompact = variant === "compact";
	const progressLabel = getTaskProgressStateLabel(task);
	const badgeVariant = getTaskProgressStateBadgeVariant(task);
	const indicator = getTaskProgressStateIndicator(task);
	const progressState = getTaskProgressState(task);

	const subtasks = task.subtasks ?? [];
	const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
	const progressPercent =
		subtasks.length > 0
			? Math.round((doneSubtasks / subtasks.length) * 100)
			: 0;

	const accentColor =
		progressState === "ai-working"
			? "hsl(var(--chart-4))"
			: progressState === "ready-to-review"
				? "hsl(var(--chart-2))"
				: "hsl(var(--primary))";

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative w-full text-left",
				"border border-border bg-card",
				"transition-colors duration-200",
				"hover:border-primary/40 hover:bg-secondary/30",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isCompact ? "p-2.5" : "p-4",
				isSelected && "border-primary/60 bg-secondary/40",
			)}
		>
			<div
				className={cn(
					"absolute left-0 top-0 bottom-0 transition-all duration-300",
					isCompact ? "w-[2px]" : "w-[3px] group-hover:w-[4px]",
				)}
				style={{
					background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor} 50%, transparent 100%)`,
				}}
			/>

			{!isCompact && (
				<div
					className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
					style={{
						background: `radial-gradient(ellipse at top left, ${accentColor.replace(")", " / 0.1)")} 0%, transparent 60%)`,
					}}
				/>
			)}

			{progressState === "ai-working" && (
				<div
					className="absolute inset-0 animate-pulse pointer-events-none"
					style={{
						background: `radial-gradient(ellipse at center, ${accentColor.replace(")", " / 0.05)")} 0%, transparent 70%)`,
					}}
				/>
			)}

			{!isCompact && (
				<>
					<div
						className="absolute inset-0 transition-all duration-300 pointer-events-none"
						style={{
							boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
						}}
					/>
					<div
						className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
						style={{
							boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
						}}
					/>
				</>
			)}

			<div className={cn("relative", isCompact ? "pl-1.5" : "pl-2")}>
				<div className={cn("flex items-start gap-3", !isCompact && "mb-3")}>
					<div className="pt-0.5">
						{indicator === "spinner" ? (
							<div className="relative">
								<Loader2
									size={isCompact ? 14 : 16}
									className="text-chart-4 animate-spin"
									aria-label="IA trabalhando"
								/>
								{!isCompact && (
									<div
										className="absolute inset-0 animate-ping opacity-30"
										style={{ color: accentColor }}
									>
										<Loader2 size={16} />
									</div>
								)}
							</div>
						) : (
							<div
								className={cn(
									"border-2 transition-all duration-200",
									"group-hover:border-primary",
									isCompact ? "w-3.5 h-3.5" : "w-4 h-4",
								)}
								style={{ borderColor: `${accentColor}60` }}
							/>
						)}
					</div>

					<div className="flex-1 min-w-0">
						<h3
							className={cn(
								"font-medium text-foreground truncate transition-all duration-200 group-hover:text-primary",
								isCompact ? "text-xs" : "text-sm",
							)}
						>
							{task.title}
						</h3>

						{!isCompact && (
							<div className="flex items-center gap-2 mt-1.5">
								{task.complexity && (
									<span
										className={cn(
											"text-xs transition-colors duration-200",
											getComplexityColor(task.complexity),
										)}
									>
										{getComplexityLabel(task.complexity)}
									</span>
								)}
								{subtasks.length > 0 && (
									<span className="text-xs text-muted-foreground">
										{doneSubtasks}/{subtasks.length} subtarefas
									</span>
								)}
							</div>
						)}
					</div>

					{isCompact ? (
						subtasks.length > 0 && (
							<span className="text-xs text-muted-foreground shrink-0">
								{doneSubtasks}/{subtasks.length}
							</span>
						)
					) : (
						<Badge variant={badgeVariant} className="shrink-0">
							{progressLabel}
						</Badge>
					)}
				</div>

				{!isCompact && subtasks.length > 0 && (
					<div className="mt-2">
						<div className="h-1 bg-secondary/60 overflow-hidden">
							<div
								className="h-full transition-all duration-700 ease-out animate-progress-shine"
								style={{
									width: `${progressPercent}%`,
									background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor.replace(")", " / 0.8)")} 100%)`,
									boxShadow: `0 0 8px ${accentColor.replace(")", " / 0.4)")}`,
								}}
							/>
						</div>
					</div>
				)}
			</div>

			{!isCompact && (
				<ChevronRight
					size={14}
					className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-hover:text-primary transition-colors duration-200"
				/>
			)}
		</button>
	);
});

type EmptySectionProps = {
	icon: React.ReactNode;
	message: string;
	linkTo?: string;
	linkLabel?: string;
};

const EmptySection = memo(function EmptySection({
	icon,
	message,
	linkTo,
	linkLabel,
}: EmptySectionProps) {
	return (
		<div className="flex flex-col items-center justify-center py-8 text-center">
			<div className="p-3 bg-secondary/30 mb-3">{icon}</div>
			<p className="text-muted-foreground text-sm mb-2">{message}</p>
			{linkTo && linkLabel && (
				<Link
					to={linkTo}
					className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
				>
					{linkLabel}
					<ChevronRight className="size-3" />
				</Link>
			)}
		</div>
	);
});

const LoadingState = memo(function LoadingState() {
	return (
		<div className="flex items-center justify-center py-8">
			<div className="flex items-center gap-2 text-muted-foreground">
				<Loader2 size={16} className="animate-spin" />
				<span className="text-sm">Carregando...</span>
			</div>
		</div>
	);
});

interface TerminalActionParams {
	action:
		| "launch_project"
		| "focus"
		| "structure"
		| "execute_all"
		| "execute_subtask"
		| "review";
	projectId: string;
	taskId?: string;
	subtaskId?: string;
}

function useTerminalActionMutation() {
	return useMutation({
		mutationFn: async ({
			action,
			projectId,
			taskId,
			subtaskId,
		}: TerminalActionParams) => {
			await safeInvoke("terminal_action", {
				action,
				projectId,
				taskId,
				subtaskId,
			});
		},
	});
}

function HomePage() {
	const navigate = useNavigate();

	const {
		tasks: inProgressTasks,
		allTasks,
		isLoading: isLoadingTasks,
	} = useInProgressTasks();
	const {
		weekDates,
		tasksByDate,
		weekTaskCount,
		isLoading: isLoadingWeek,
	} = useWeekTasks();

	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
	const terminalActionMutation = useTerminalActionMutation();

	useEffect(() => {
		if (inProgressTasks.length > 0 && selectedTaskId === null) {
			setSelectedTaskId(inProgressTasks[0].id);
		}
	}, [inProgressTasks, selectedTaskId]);

	const selectedTask = useMemo(() => {
		if (!selectedTaskId) return null;
		return inProgressTasks.find((t) => t.id === selectedTaskId) ?? null;
	}, [inProgressTasks, selectedTaskId]);

	const handleTaskClick = useCallback(
		(taskId: string) => {
			if (selectedTaskId === taskId) {
				navigate({ to: "/tasks/$taskId", params: { taskId } });
			} else {
				setSelectedTaskId(taskId);
			}
		},
		[selectedTaskId, navigate],
	);

	const handleSidebarTaskSelect = useCallback((taskId: string) => {
		setSelectedTaskId(taskId);
	}, []);

	const handleActionClick = useCallback(
		(action: SuggestedAction, task: TaskFull) => {
			if (!action || !task.project_id) return;

			const hideWindowAfterDelay = () => {
				setTimeout(() => {
					safeInvoke("hide_window");
				}, 500);
			};

			switch (action) {
				case "structure":
					terminalActionMutation.mutate(
						{
							action: "structure",
							projectId: task.project_id,
							taskId: task.id,
						},
						{ onSuccess: hideWindowAfterDelay },
					);
					break;
				case "execute_all":
					terminalActionMutation.mutate(
						{
							action: "execute_all",
							projectId: task.project_id,
							taskId: task.id,
						},
						{ onSuccess: hideWindowAfterDelay },
					);
					break;
				case "execute_subtask": {
					const nextSubtask = task.subtasks?.find((s) => s.status !== "done");
					if (nextSubtask) {
						terminalActionMutation.mutate(
							{
								action: "execute_subtask",
								projectId: task.project_id,
								taskId: task.id,
								subtaskId: nextSubtask.id,
							},
							{ onSuccess: hideWindowAfterDelay },
						);
					}
					break;
				}
				case "review":
					terminalActionMutation.mutate(
						{ action: "review", projectId: task.project_id, taskId: task.id },
						{ onSuccess: hideWindowAfterDelay },
					);
					break;
				case "focus_terminal":
					terminalActionMutation.mutate({
						action: "focus",
						projectId: task.project_id,
						taskId: task.id,
					});
					break;
			}
		},
		[terminalActionMutation],
	);

	const handleNavigate = useCallback(
		(taskId: string) => {
			navigate({ to: "/tasks/$taskId", params: { taskId } });
		},
		[navigate],
	);

	const handleDayClick = useCallback((date: string) => {
		setSelectedDate(date);
	}, []);

	return (
		<>
			<div className="flex-1 flex overflow-hidden">
				<HomeSidebar
					selectedTask={selectedTask}
					tasks={allTasks as TaskFull[]}
					selectedDate={selectedDate}
					selectedTaskId={selectedTaskId}
					onTaskSelect={handleSidebarTaskSelect}
					onActionClick={handleActionClick}
					onNavigate={handleNavigate}
					isActionLoading={terminalActionMutation.isPending}
					className="w-[340px] min-w-[340px] shrink-0 border-r border-border bg-background"
				/>

				<main className="flex-1 overflow-y-auto p-6">
					<PageHeader
						title="Dashboard"
						subtitle="Seu painel de controle"
						icon={LayoutDashboard}
						accentColor="hsl(var(--primary))"
					/>

					<section className="mb-6">
						<SectionHeader
							title="Tarefas em Andamento"
							icon={<Activity size={14} className="text-chart-4" />}
							linkTo="/tasks"
							linkLabel="ver todas"
							badge={
								inProgressTasks.length > 0 ? inProgressTasks.length : undefined
							}
							accentColor="hsl(var(--chart-4))"
						/>

						<div className="space-y-2">
							{isLoadingTasks ? (
								<LoadingState />
							) : inProgressTasks.length === 0 ? (
								<EmptySection
									icon={
										<CheckCircle2 size={20} className="text-muted-foreground" />
									}
									message="Nenhuma tarefa em andamento"
									linkTo="/tasks"
									linkLabel="Criar nova tarefa"
								/>
							) : (
								inProgressTasks.map((task) => (
									<InProgressTaskCard
										key={task.id}
										task={task}
										onClick={() => handleTaskClick(task.id)}
										variant="compact"
										isSelected={selectedTaskId === task.id}
									/>
								))
							)}
						</div>
					</section>

					<section>
						<SectionHeader
							title="Minha Semana"
							icon={<Calendar size={14} className="text-chart-2" />}
							linkTo="/agenda"
							linkLabel="ver agenda"
							badge={weekTaskCount > 0 ? `${weekTaskCount} tarefas` : undefined}
							accentColor="hsl(var(--chart-2))"
						/>

						{isLoadingWeek ? (
							<LoadingState />
						) : (
							<div className="grid grid-cols-7 gap-2">
								{weekDates.map((day) => (
									<WeekDayCard
										key={day.date}
										dayNumber={day.dayNumber}
										weekDay={day.weekDay}
										isToday={day.isToday}
										tasks={tasksByDate.get(day.date) ?? []}
										isSelected={selectedDate === day.date}
										onClick={() => handleDayClick(day.date)}
									/>
								))}
							</div>
						)}
					</section>
				</main>
			</div>

			<DayDrawer />
		</>
	);
}

export const Route = createFileRoute("/home/")({
	component: HomePage,
});
