import { useNavigate } from "@tanstack/react-router";
import { Bot, ChevronLeft } from "lucide-react";
import { Select } from "../../../../components/Select";

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
		<div className="flex items-center gap-3 p-3 border-b border-[#3d3a34] bg-[#1c1c1c]">
			<button
				type="button"
				onClick={goBack}
				className="text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
				title="Voltar"
			>
				<ChevronLeft size={18} />
			</button>

			<input
				type="text"
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				onBlur={onTitleBlur}
				className="flex-1 bg-transparent text-[#d6d6d6] text-base font-medium focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors"
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

			{isSaving && <span className="text-xs text-[#636363]">Salvando...</span>}

			{aiUpdatedRecently && (
				<span className="text-xs text-[#909d63] flex items-center gap-1 animate-pulse">
					<Bot size={14} />
					IA atualizou
				</span>
			)}

			<span
				className={`w-2 h-2 rounded-full ${isOpenCodeConnected ? "bg-[#61afef]" : "bg-[#636363]"}`}
				title={
					isOpenCodeConnected
						? "OpenCode conectado - atualizações em tempo real"
						: "OpenCode desconectado"
				}
			/>
		</div>
	);
}
