import { useNavigate } from "@tanstack/react-router";
import { Bot, ChevronLeft } from "lucide-react";
import { Select } from "@/components/Select";

const CATEGORIES = ["feature", "bug", "refactor", "test", "docs"];

const PRIORITIES = [
	{ value: "1", label: "Alta" },
	{ value: "2", label: "Média" },
	{ value: "3", label: "Baixa" },
];

interface ManageTaskHeaderProps {
	title: string;
	category: string;
	priority: number;
	isSaving: boolean;
	aiUpdatedRecently: boolean;
	isOpenCodeConnected: boolean;
	onTitleChange: (title: string) => void;
	onTitleBlur: () => void;
	onCategoryChange: (category: string) => void;
	onPriorityChange: (priority: number) => void;
}

export function ManageTaskHeader({
	title,
	category,
	priority,
	isSaving,
	aiUpdatedRecently,
	isOpenCodeConnected,
	onTitleChange,
	onTitleBlur,
	onCategoryChange,
	onPriorityChange,
}: ManageTaskHeaderProps) {
	const navigate = useNavigate();

	function goBack() {
		navigate({ to: "/tasks" });
	}

	return (
		<div className="flex items-center gap-3 p-3 border-b border-border bg-background">
			<button
				type="button"
				onClick={goBack}
				className="text-muted-foreground hover:text-foreground transition-colors p-1"
				title="Voltar"
			>
				<ChevronLeft size={18} />
			</button>

			<input
				type="text"
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				onBlur={onTitleBlur}
				className="flex-1 bg-transparent text-foreground text-base font-medium focus:outline-none border-b border-transparent focus:border-primary transition-colors"
			/>

			<Select
				value={category}
				options={CATEGORIES.map((c) => ({ value: c, label: c }))}
				onChange={onCategoryChange}
			/>

			<Select
				value={String(priority)}
				options={PRIORITIES}
				onChange={(v) => onPriorityChange(Number.parseInt(v))}
			/>

			{isSaving && <span className="text-xs text-muted-foreground">Salvando...</span>}

			{aiUpdatedRecently && (
				<span className="text-xs text-primary flex items-center gap-1 animate-pulse">
					<Bot size={14} />
					IA atualizou
				</span>
			)}

			<span
				className={`w-2 h-2 rounded-full ${isOpenCodeConnected ? "bg-chart-4" : "bg-muted-foreground"}`}
				title={
					isOpenCodeConnected
						? "OpenCode conectado - atualizações em tempo real"
						: "OpenCode desconectado"
				}
			/>
		</div>
	);
}
