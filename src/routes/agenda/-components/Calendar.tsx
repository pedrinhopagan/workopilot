import { useImperativeHandle, forwardRef, useEffect } from "react";
import { trpc } from "../../../services/trpc";
import { useDbRefetchStore } from "../../../stores/dbRefetch";
import { CalendarDay } from "./CalendarDay";
import { useAgendaStore } from "../../../stores/agenda";

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type CalendarDayData = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function generateCalendarDays(year: number, month: number): CalendarDayData[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: CalendarDayData[] = [];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    days.push({
      date: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const remainingDays = 42 - days.length;

  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return days;
}

type CalendarProps = {
  projectId?: string | null;
  onTasksChanged?: () => void;
};

export type CalendarRef = {
  refresh: () => void;
};

export const Calendar = forwardRef<CalendarRef, CalendarProps>(function Calendar(
  { projectId = null, onTasksChanged },
  ref
) {
  const currentMonth = useAgendaStore((s) => s.currentMonth);
  const setCurrentMonth = useAgendaStore((s) => s.setCurrentMonth);
  const setDraggedTask = useAgendaStore((s) => s.setDraggedTask);
  const isDistributing = useAgendaStore((s) => s.isDistributing);
  const isDistributionMode = useAgendaStore((s) => s.isDistributionMode);
  const changeCounter = useDbRefetchStore((s) => s.changeCounter);

  const calendarDays = generateCalendarDays(currentMonth.year, currentMonth.month);
  const monthName = monthNames[currentMonth.month - 1];

  const utils = trpc.useUtils();

  const { data: tasks = [], refetch: refetchTasks } = trpc.tasks.listForMonth.useQuery(
    { year: currentMonth.year, month: currentMonth.month },
    { staleTime: 1000 * 60 }
  );

  const filteredTasks = projectId
    ? tasks.filter((t) => t.project_id === projectId)
    : tasks;

  function getTasksForDate(date: string) {
    return filteredTasks.filter((t) => t.scheduled_date === date);
  }

  const scheduleMutation = trpc.tasks.schedule.useMutation({
    onSuccess: () => {
      utils.tasks.listForMonth.invalidate();
      utils.tasks.listUnscheduled.invalidate();
      onTasksChanged?.();
    },
  });

  async function handleDrop(taskId: string, date: string) {
    try {
      await scheduleMutation.mutateAsync({ id: taskId, date });
    } catch (e) {
      console.error("Failed to schedule task:", e);
    }
    setDraggedTask(null);
  }

  function previousMonth() {
    if (currentMonth.month === 1) {
      setCurrentMonth({ year: currentMonth.year - 1, month: 12 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month - 1 });
    }
  }

  function nextMonth() {
    if (currentMonth.month === 12) {
      setCurrentMonth({ year: currentMonth.year + 1, month: 1 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month + 1 });
    }
  }

  function goToToday() {
    const today = new Date();
    setCurrentMonth({
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    });
  }

  useEffect(() => {
    if (changeCounter === 0) return;
    refetchTasks();
  }, [changeCounter, refetchTasks]);

  useImperativeHandle(ref, () => ({
    refresh: () => refetchTasks(),
  }));

  return (
    <div className="flex flex-col h-full relative">
      {isDistributing && (
        <div className="absolute inset-0 bg-background/80 z-10 flex flex-col items-center justify-center">
          <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-foreground font-medium">Distribuindo com IA...</p>
          <p className="text-muted-foreground text-sm mt-1">OpenCode está processando</p>
        </div>
      )}

      {isDistributionMode && !isDistributing && (
        <div className="absolute top-0 left-0 right-0 bg-primary/20 border-b border-primary px-4 py-2 z-10">
          <p className="text-primary text-sm font-medium text-center">
            Clique nos dias para selecionar onde distribuir as tarefas
          </p>
        </div>
      )}

      <div className={`flex items-center justify-between mb-4 ${isDistributionMode && !isDistributing ? "mt-10" : ""}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-lg font-medium text-foreground min-w-[180px] text-center">
            {monthName} {currentMonth.year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm bg-card text-foreground border border-border hover:bg-popover transition-colors"
        >
          Hoje
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1">
        {calendarDays.map((day) => (
          <CalendarDay
            key={day.date}
            date={day.date}
            dayNumber={day.dayNumber}
            isCurrentMonth={day.isCurrentMonth}
            isToday={day.isToday}
            tasks={getTasksForDate(day.date)}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
});
