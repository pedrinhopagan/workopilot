import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart"
import type { TaskFull } from "@/types"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { memo, useMemo } from "react"

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const

const chartConfig = {
	created: {
		label: "Criadas",
		color: "var(--chart-1)",
	},
	completed: {
		label: "Concluídas",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig

type TaskActivityChartProps = {
	tasks: TaskFull[]
}

function getLast7Days(): { datePrefix: string; dayLabel: string }[] {
	const days: { datePrefix: string; dayLabel: string }[] = []
	const today = new Date()

	for (let i = 6; i >= 0; i--) {
		const date = new Date(today)
		date.setDate(today.getDate() - i)
		const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
		const dayLabel = WEEK_DAYS[date.getDay()]
		days.push({ datePrefix, dayLabel })
	}

	return days
}

const TaskActivityChart = memo(function TaskActivityChart({
	tasks,
}: TaskActivityChartProps) {
	const chartData = useMemo(() => {
		const days = getLast7Days()

		return days.map(({ datePrefix, dayLabel }) => {
			const created = tasks.filter((t) =>
				t.timestamps.created_at?.startsWith(datePrefix),
			).length

			const completed = tasks.filter((t) =>
				t.timestamps.completed_at?.startsWith(datePrefix),
			).length

			return { day: dayLabel, created, completed }
		})
	}, [tasks])

	return (
		<ChartContainer config={chartConfig} className="h-[220px] w-full">
			<LineChart
				data={chartData}
				margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
			>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical={false}
					className="stroke-border/30"
				/>
				<XAxis
					dataKey="day"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					className="text-xs"
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tickMargin={4}
					allowDecimals={false}
					className="text-xs"
				/>
				<ChartTooltip
					content={<ChartTooltipContent />}
					cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
				/>
				<Line
					type="monotone"
					dataKey="created"
					stroke="var(--color-created)"
					strokeWidth={2}
					dot={{ r: 3, fill: "var(--color-created)" }}
					activeDot={{ r: 5 }}
				/>
				<Line
					type="monotone"
					dataKey="completed"
					stroke="var(--color-completed)"
					strokeWidth={2}
					dot={{ r: 3, fill: "var(--color-completed)" }}
					activeDot={{ r: 5 }}
				/>
			</LineChart>
		</ChartContainer>
	)
})

export { TaskActivityChart }
