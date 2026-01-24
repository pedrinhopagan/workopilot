import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
	ChevronRight,
	Loader2,
	FolderOpen,
} from "lucide-react";
import { trpc } from "@/services/trpc";
import { useSelectedProjectStore } from "@/stores/selectedProject";
import { useAgendaStore } from "@/stores/agenda";
import { DayDrawer } from "@/components/agenda";
import {
	getTaskProgressState,
	getTaskProgressStateLabel,
	getTaskProgressStateContainerClass,
	getTaskProgressStateBadgeVariant,
	getTaskProgressStateIndicator,
	getComplexityColor,
	getComplexityLabel,
} from "@/lib/constants/taskStatus";
import { cn } from "@/lib/utils";
import type { TaskFull, Project, Task } from "@/types";

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
					"needs-review": 2,
					"ready-to-start": 3,
					"started": 4,
				};

				const orderA = stateOrder[stateA] ?? 5;
				const orderB = stateOrder[stateB] ?? 5;

				if (orderA !== orderB) return orderA - orderB;
				return (a.priority || 3) - (b.priority || 3);
			});
	}, [tasksFullQuery.data]);

	return {
		tasks: inProgressTasks,
		isLoading: tasksFullQuery.isLoading,
		refetch: tasksFullQuery.refetch,
	};
}

function useTopProjects(limit = 3) {
	const projectsList = useSelectedProjectStore((s) => s.projectsList);

	const topProjects = useMemo(() => {
		return [...projectsList]
			.sort((a, b) => a.display_order - b.display_order)
			.slice(0, limit);
	}, [projectsList, limit]);

	return {
		projects: topProjects,
		hasProjects: projectsList.length > 0,
	};
}

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function getWeekDates(): { date: string; dayNumber: number; weekDay: string; isToday: boolean }[] {
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

	const year = firstDate ? Number.parseInt(firstDate.date.split("-")[0], 10) : new Date().getFullYear();
	const month = firstDate ? Number.parseInt(firstDate.date.split("-")[1], 10) : new Date().getMonth() + 1;

	const tasksQuery = trpc.tasks.listForMonth.useQuery(
		{ year, month },
		{ staleTime: 60_000 }
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

	return {
		weekDates,
		tasksByDate,
		isLoading: tasksQuery.isLoading,
		refetch: tasksQuery.refetch,
	};
}

function isTaskOverdue(task: Task): boolean {
	if (!task.due_date || task.status === "done") return false;
	const today = new Date().toISOString().split("T")[0];
	return task.due_date < today;
}

type WeekDayCardProps = {
	dayNumber: number;
	weekDay: string;
	isToday: boolean;
	tasks: Task[];
	onClick: () => void;
};

const WeekDayCard = memo(function WeekDayCard({ dayNumber, weekDay, isToday, tasks, onClick }: WeekDayCardProps) {
	const hasOverdue = tasks.some((t) => isTaskOverdue(t));
	const taskCount = tasks.length;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-col items-center p-2 min-h-[70px] border border-border transition-colors hover:bg-secondary cursor-pointer",
				isToday ? "bg-primary/10 border-primary" : "bg-card"
			)}
		>
			<span className={cn("text-xs text-muted-foreground", isToday && "text-primary font-medium")}>
				{weekDay}
			</span>
			<span className={cn("text-lg font-medium", isToday ? "text-primary" : "text-foreground")}>
				{dayNumber}
			</span>
			<div className="flex items-center gap-1 mt-1">
				{taskCount > 0 && (
					<span className="text-xs text-muted-foreground">
						{taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
					</span>
				)}
				{hasOverdue && <span className="text-destructive text-xs">!</span>}
			</div>
		</button>
	);
});

type ProjectItemProps = {
	project: Project;
	onClick: () => void;
};

const ProjectItem = memo(function ProjectItem({ project, onClick }: ProjectItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full text-left transition-colors hover:bg-secondary bg-background border border-border/50"
		>
			<FolderOpen size={14} className="text-muted-foreground shrink-0" />
			<span className="flex-1 text-foreground text-sm truncate">{project.name}</span>
			<ChevronRight size={14} className="text-muted-foreground shrink-0" />
		</button>
	);
});

type InProgressTaskItemProps = {
	task: TaskFull;
	onClick: () => void;
};

const InProgressTaskItem = memo(function InProgressTaskItem({ task, onClick }: InProgressTaskItemProps) {
	const progressLabel = getTaskProgressStateLabel(task);
	const containerClass = getTaskProgressStateContainerClass(task);
	const badgeVariant = getTaskProgressStateBadgeVariant(task);
	const indicator = getTaskProgressStateIndicator(task);

	const subtasks = task.subtasks ?? [];
	const doneSubtasks = subtasks.filter((s) => s.status === "done").length;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 px-3 py-2 cursor-pointer w-full text-left transition-colors",
				containerClass
			)}
		>
			{indicator === "spinner" ? (
				<Loader2
					size={14}
					className="text-chart-4 animate-spin shrink-0"
					aria-label="Carregando"
				/>
			) : (
				<span className="text-muted-foreground shrink-0">[ ]</span>
			)}

			<span className="flex-1 text-foreground text-sm truncate">{task.title}</span>

			{subtasks.length > 0 && (
				<span className="text-xs text-muted-foreground shrink-0">
					{doneSubtasks}/{subtasks.length}
				</span>
			)}

			{task.complexity && (
				<span className={cn("text-xs shrink-0", getComplexityColor(task.complexity))}>
					{getComplexityLabel(task.complexity)}
				</span>
			)}

			<Badge variant={badgeVariant} className="shrink-0">
				{progressLabel}
			</Badge>
		</button>
	);
});

function HomePage() {
	const navigate = useNavigate();
	const openDrawer = useAgendaStore((s) => s.openDrawer);
	const { tasks: inProgressTasks, isLoading: isLoadingTasks } = useInProgressTasks();
	const { projects: topProjects, hasProjects } = useTopProjects(3);
	const { weekDates, tasksByDate, isLoading: isLoadingWeek } = useWeekTasks();

	const handleTaskClick = useCallback((taskId: string) => {
		navigate({ to: "/tasks/$taskId", params: { taskId } });
	}, [navigate]);

	const handleProjectClick = useCallback((projectId: string) => {
		navigate({ to: "/projects" });
		useSelectedProjectStore.getState().setSelectedProjectId(projectId);
	}, [navigate]);

	const handleDayClick = useCallback((date: string) => {
		openDrawer(date);
	}, [openDrawer]);

	return (
		<>
		<div className="flex-1 overflow-y-auto p-4">
			<div className="space-y-4">
				<h1 className="text-xl text-foreground">Dashboard</h1>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between py-3">
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Tarefas em Andamento
						</CardTitle>
						<Link
							to="/tasks"
							className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
						>
							ver todas
							<ChevronRight className="size-3" />
						</Link>
					</CardHeader>
					<CardContent className="pt-0">
						{isLoadingTasks ? (
							<div className="flex items-center justify-center py-6 text-center">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Loader2 size={16} className="animate-spin" />
									<span className="text-sm">Carregando tarefas...</span>
								</div>
							</div>
						) : inProgressTasks.length === 0 ? (
							<div className="flex items-center justify-center py-6 text-center">
								<p className="text-muted-foreground text-sm">
									Nenhuma tarefa em andamento
								</p>
							</div>
						) : (
							<div className="space-y-1">
								{inProgressTasks.map((task) => (
									<InProgressTaskItem
										key={task.id}
										task={task}
										onClick={() => handleTaskClick(task.id)}
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between py-3">
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Seus Projetos
						</CardTitle>
						<Link
							to="/projects"
							className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
						>
							ver todos
							<ChevronRight className="size-3" />
						</Link>
					</CardHeader>
					<CardContent className="pt-0">
						{!hasProjects ? (
							<div className="flex items-center justify-center py-6 text-center">
								<p className="text-muted-foreground text-sm">
									Nenhum projeto cadastrado
								</p>
							</div>
						) : (
							<div className="space-y-1">
								{topProjects.map((project) => (
									<ProjectItem
										key={project.id}
										project={project}
										onClick={() => handleProjectClick(project.id)}
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between py-3">
						<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
							Minha Agenda
						</CardTitle>
						<Link
							to="/agenda"
							className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
						>
							ver agenda
							<ChevronRight className="size-3" />
						</Link>
					</CardHeader>
					<CardContent className="pt-0">
						{isLoadingWeek ? (
							<div className="flex items-center justify-center py-6 text-center">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Loader2 size={16} className="animate-spin" />
									<span className="text-sm">Carregando agenda...</span>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-7 gap-1">
								{weekDates.map((day) => (
									<WeekDayCard
										key={day.date}
										dayNumber={day.dayNumber}
										weekDay={day.weekDay}
										isToday={day.isToday}
										tasks={tasksByDate.get(day.date) ?? []}
										onClick={() => handleDayClick(day.date)}
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>

			</div>
		</div>
		<DayDrawer />
		</>
	);
}

export const Route = createFileRoute("/home/")({
	component: HomePage,
});
