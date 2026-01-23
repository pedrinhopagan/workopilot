import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import type { TaskFull } from "../../../../types";

interface ManageTaskMetadataProps {
	taskFull: TaskFull;
}

export function ManageTaskMetadata({ taskFull }: ManageTaskMetadataProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const metadata = {
		id: taskFull.id,
		created_at: taskFull.timestamps.created_at,
		started_at: taskFull.timestamps.started_at,
		completed_at: taskFull.timestamps.completed_at,
		modified_at: taskFull.modified_at,
		ai_metadata: taskFull.ai_metadata,
		subtasks: taskFull.subtasks.map((s) => ({
			id: s.id,
			title: s.title,
			status: s.status,
			order: s.order,
			created_at: s.created_at,
			completed_at: s.completed_at,
		})),
	};

	const metadataJson = JSON.stringify(metadata, null, 2);

	async function handleCopy() {
		await navigator.clipboard.writeText(metadataJson);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<section className="border border-[#3d3a34] rounded-lg overflow-hidden">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between px-4 py-3 bg-[#1c1c1c] hover:bg-[#232323] transition-colors"
			>
				<div className="flex items-center gap-2">
					{isOpen ? (
						<ChevronDown size={16} className="text-[#636363]" />
					) : (
						<ChevronRight size={16} className="text-[#636363]" />
					)}
					<span className="text-xs text-[#828282] uppercase tracking-wide">
						Metadados
					</span>
				</div>
				<span className="text-xs text-[#636363] font-mono">{taskFull.id.slice(0, 8)}...</span>
			</button>

			{isOpen && (
				<div className="relative border-t border-[#3d3a34]">
					<button
						type="button"
						onClick={handleCopy}
						className="absolute top-2 right-2 p-1.5 text-[#636363] hover:text-[#d6d6d6] hover:bg-[#2a2a2a] rounded transition-colors"
						title="Copiar JSON"
					>
						{copied ? <Check size={14} className="text-[#909d63]" /> : <Copy size={14} />}
					</button>
					<pre className="p-4 bg-[#0d0d0d] text-[#d6d6d6] text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
						<code>{metadataJson}</code>
					</pre>
				</div>
			)}
		</section>
	);
}
