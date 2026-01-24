import { useState } from "react";
import { isTauri } from "../../../services/tauri";
import { trpc } from "../../../services/trpc";
import { useDialogStateStore } from "../../../stores/dialogState";
import { useSelectedProjectStore } from "../../../stores/selectedProject";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui";

type NewProjectFormProps = {
	onCancel: () => void;
	onCreated: () => void;
};

export function NewProjectForm({ onCancel, onCreated }: NewProjectFormProps) {
	const openDialog = useDialogStateStore((s) => s.openDialog);
	const closeDialog = useDialogStateStore((s) => s.closeDialog);
	const setSelectedProjectId = useSelectedProjectStore((s) => s.setSelectedProjectId);
	const setProjectsList = useSelectedProjectStore((s) => s.setProjectsList);

	const utils = trpc.useUtils();
	const createProjectMutation = trpc.projects.create.useMutation();

	const [newProjectName, setNewProjectName] = useState("");
	const [newProjectPath, setNewProjectPath] = useState("");
	const [newProjectDescription, setNewProjectDescription] = useState("");

	async function selectPath() {
		if (!isTauri()) return;
		openDialog();
		try {
			const { open } = await import("@tauri-apps/plugin-dialog");
			const selected = await open({ directory: true, multiple: false, title: "Selecionar diretorio do projeto" });
			if (selected && typeof selected === "string") {
				setNewProjectPath(selected);
				if (!newProjectName) {
					const parts = selected.split("/");
					setNewProjectName(parts[parts.length - 1] || "");
				}
			}
		} catch (e) {
			console.error("Failed to pick directory:", e);
		} finally {
			closeDialog();
		}
	}

	async function createProject() {
		if (!newProjectName.trim() || !newProjectPath.trim()) return;
		try {
			const id = await createProjectMutation.mutateAsync({
				name: newProjectName,
				path: newProjectPath,
				description: newProjectDescription.trim() || undefined,
			});
			await utils.projects.list.invalidate();
			const loaded = utils.projects.list.getData() ?? [];
			const projects = loaded.map(p => ({
				id: p.id,
				name: p.name,
				description: p.description ?? undefined,
				display_order: p.display_order,
				created_at: p.created_at,
				color: p.color ?? undefined,
			}));
			setProjectsList(projects);
			setSelectedProjectId(id);
			onCreated();
		} catch (e) {
			console.error("Failed to create project:", e);
		}
	}

	function handleCancel() {
		setNewProjectName("");
		setNewProjectPath("");
		setNewProjectDescription("");
		onCancel();
	}

	return (
		<Card className="max-w-xl">
			<CardHeader>
				<CardTitle>Novo Projeto</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="project-name">Nome</Label>
					<Input
						id="project-name"
						type="text"
						value={newProjectName}
						onChange={(e) => setNewProjectName(e.target.value)}
						placeholder="meu-projeto"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="project-path">Caminho</Label>
					<div className="flex gap-2">
						<Input
							id="project-path"
							type="text"
							value={newProjectPath}
							onChange={(e) => setNewProjectPath(e.target.value)}
							placeholder="/home/user/projects/..."
							className="flex-1"
						/>
						<Button variant="outline" onClick={selectPath}>
							...
						</Button>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="project-description">Descricao (opcional)</Label>
					<Textarea
						id="project-description"
						value={newProjectDescription}
						onChange={(e) => setNewProjectDescription(e.target.value)}
						placeholder="Breve descricao do projeto..."
						rows={3}
					/>
				</div>

				<div className="flex gap-2 pt-2">
					<Button onClick={createProject}>
						Criar
					</Button>
					<Button variant="outline" onClick={handleCancel}>
						Cancelar
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
