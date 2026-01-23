import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Select } from "../../../components/Select";
import { useCreateTask } from "../../../hooks/useUpdateTask";
import { getCategoryOptions, getPriorityOptions } from "../-utils/useGetTaskQuery";

type TasksNewTaskProps = {
	projectId: string;
	projectPath: string;
	onClose: () => void;
	onCreated: () => void;
};

export function TasksNewTask({ projectId, projectPath, onClose, onCreated }: TasksNewTaskProps) {
	const [title, setTitle] = useState("");
	const [priority, setPriority] = useState(2);
	const [category, setCategory] = useState("feature");
	const inputRef = useRef<HTMLInputElement>(null);

	const createTask = useCreateTask();

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim()) return;

		await createTask.mutateAsync({
			projectId,
			projectPath,
			title: title.trim(),
			priority,
			category,
		});

		onCreated();
	}

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-start justify-center pt-24">
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
				aria-label="Fechar dialog"
			/>

			<div className="relative w-full max-w-lg bg-[#1c1c1c] border border-[#3d3a34] shadow-xl animate-fade-in">
				<header className="flex items-center justify-between p-4 border-b border-[#3d3a34]">
					<h2 className="text-sm font-medium text-[#d6d6d6]">Nova Tarefa</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 hover:bg-[#2a2a2a] transition-colors"
						aria-label="Fechar"
					>
						<X size={16} className="text-[#828282]" />
					</button>
				</header>

				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					<div>
						<input
							ref={inputRef}
							type="text"
							placeholder="Título da tarefa..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none"
						/>
					</div>

					<div className="flex items-center gap-3">
						<div className="flex-1">
							<span className="block text-xs text-[#636363] mb-1">Categoria</span>
							<Select
								value={category}
								onChange={(v) => setCategory(v)}
								options={getCategoryOptions()}
								className="w-full"
							/>
						</div>
						<div className="flex-1">
							<span className="block text-xs text-[#636363] mb-1">Prioridade</span>
							<Select
								value={String(priority)}
								onChange={(v) => setPriority(parseInt(v))}
								options={getPriorityOptions()}
								className="w-full"
							/>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm text-[#636363] hover:text-[#d6d6d6] transition-colors"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={!title.trim() || createTask.isPending}
							className="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{createTask.isPending ? "Criando..." : "Criar Tarefa"}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
}
