import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import type { Subtask, TaskFull } from "../../../../types";
import { type TaskEditFormSchema, taskEditFormSchema } from "./taskSchema";
import { useUpdateTaskFullMutation } from "./useTaskMutations";

interface UseTaskFormOptions {
	taskFull: TaskFull | null;
	projectPath: string | null;
}

interface UseTaskFormReturn {
	form: UseFormReturn<TaskEditFormSchema>;
	isDirty: boolean;
	isSaving: boolean;
	lastKnownModifiedAt: string | null;
	aiUpdatedRecently: boolean;
	conflictWarning: boolean;
	dismissConflictWarning: () => void;
	saveField: (field: keyof TaskEditFormSchema, value: unknown) => void;
	saveContextField: <K extends keyof TaskEditFormSchema["context"]>(
		field: K,
		value: TaskEditFormSchema["context"][K],
	) => void;
	addBusinessRule: (rule: string) => void;
	removeBusinessRule: (index: number) => void;
	addAcceptanceCriteria: (criteria: string) => void;
	removeAcceptanceCriteria: (index: number) => void;
	addSubtask: (title: string) => void;
	toggleSubtask: (id: string) => void;
	removeSubtask: (id: string) => void;
	updateSubtask: (id: string, field: keyof Subtask, value: unknown) => void;
	reorderSubtasks: (newSubtasks: Subtask[]) => void;
}

function taskFullToFormValues(taskFull: TaskFull): TaskEditFormSchema {
	return {
		title: taskFull.title,
		status: taskFull.status,
		priority: taskFull.priority,
		category: taskFull.category as TaskEditFormSchema["category"],
		complexity: taskFull.complexity,
		context: {
			description: taskFull.context.description,
			business_rules: taskFull.context.business_rules,
			technical_notes: taskFull.context.technical_notes,
			acceptance_criteria: taskFull.context.acceptance_criteria,
		},
		subtasks: taskFull.subtasks,
		initialized: taskFull.initialized ?? false,
	};
}

export function useTaskForm({
	taskFull,
	projectPath,
}: UseTaskFormOptions): UseTaskFormReturn {
	const [lastKnownModifiedAt, setLastKnownModifiedAt] = useState<string | null>(
		null,
	);
	const [aiUpdatedRecently, setAiUpdatedRecently] = useState(false);
	const [conflictWarning, setConflictWarning] = useState(false);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const updateMutation = useUpdateTaskFullMutation();

	const form = useForm<TaskEditFormSchema>({
		resolver: zodResolver(taskEditFormSchema),
		defaultValues: taskFull ? taskFullToFormValues(taskFull) : undefined,
		mode: "onBlur",
	});

	useEffect(() => {
		if (taskFull) {
			form.reset(taskFullToFormValues(taskFull));
			setLastKnownModifiedAt(taskFull.modified_at ?? null);

			if (taskFull.modified_by === "ai") {
				setAiUpdatedRecently(true);
				const timeout = setTimeout(() => setAiUpdatedRecently(false), 5000);
				return () => clearTimeout(timeout);
			}
		}
	}, [taskFull, form]);

	const saveTask = useCallback(
		(values: TaskEditFormSchema) => {
			if (!taskFull || !projectPath) return;

			if (lastKnownModifiedAt && taskFull.modified_at !== lastKnownModifiedAt) {
				if (taskFull.modified_by === "ai") {
					setConflictWarning(true);
					setTimeout(() => setConflictWarning(false), 8000);
				}
			}

			const updatedTask: TaskFull = {
				...taskFull,
				...values,
				context: values.context,
				subtasks: values.subtasks,
			};

			updateMutation.mutate(
				{ projectPath, task: updatedTask },
				{
					onSuccess: (savedTask) => {
						setLastKnownModifiedAt(savedTask.modified_at ?? null);
					},
				},
			);
		},
		[taskFull, projectPath, lastKnownModifiedAt, updateMutation],
	);

	const debouncedSave = useCallback(
		(values: TaskEditFormSchema) => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			saveTimeoutRef.current = setTimeout(() => {
				saveTask(values);
			}, 500);
		},
		[saveTask],
	);

	const saveField = useCallback(
		(field: keyof TaskEditFormSchema, value: unknown) => {
			form.setValue(field, value as never);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const saveContextField = useCallback(
		<K extends keyof TaskEditFormSchema["context"]>(
			field: K,
			value: TaskEditFormSchema["context"][K],
		) => {
			const currentContext = form.getValues("context");
			form.setValue("context", { ...currentContext, [field]: value });
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const addBusinessRule = useCallback(
		(rule: string) => {
			if (!rule.trim()) return;
			const currentRules = form.getValues("context.business_rules");
			form.setValue("context.business_rules", [...currentRules, rule.trim()]);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const removeBusinessRule = useCallback(
		(index: number) => {
			const currentRules = form.getValues("context.business_rules");
			form.setValue(
				"context.business_rules",
				currentRules.filter((_, i) => i !== index),
			);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const addAcceptanceCriteria = useCallback(
		(criteria: string) => {
			if (!criteria.trim()) return;
			const currentCriteria =
				form.getValues("context.acceptance_criteria") ?? [];
			form.setValue("context.acceptance_criteria", [
				...currentCriteria,
				criteria.trim(),
			]);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const removeAcceptanceCriteria = useCallback(
		(index: number) => {
			const currentCriteria =
				form.getValues("context.acceptance_criteria") ?? [];
			const newCriteria = currentCriteria.filter((_, i) => i !== index);
			form.setValue(
				"context.acceptance_criteria",
				newCriteria.length > 0 ? newCriteria : null,
			);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const addSubtask = useCallback(
		(title: string) => {
			if (!title.trim()) return;
			const currentSubtasks = form.getValues("subtasks");
			const nextOrder =
				currentSubtasks.length > 0
					? Math.max(...currentSubtasks.map((s) => s.order)) + 1
					: 0;

			const newSubtask: Subtask = {
				id: crypto.randomUUID(),
				title: title.trim(),
				status: "pending",
				order: nextOrder,
				description: null,
				acceptance_criteria: null,
				technical_notes: null,
				prompt_context: null,
				created_at: new Date().toISOString(),
				completed_at: null,
			};

			form.setValue("subtasks", [...currentSubtasks, newSubtask]);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const toggleSubtask = useCallback(
		(id: string) => {
			const currentSubtasks = form.getValues("subtasks");
			const updatedSubtasks = currentSubtasks.map((s) => {
				if (s.id === id) {
					const newStatus = s.status === "done" ? "pending" : "done";
					return {
						...s,
						status: newStatus,
						completed_at:
							newStatus === "done" ? new Date().toISOString() : null,
					};
				}
				return s;
			});

			form.setValue("subtasks", updatedSubtasks);

			const allDone = updatedSubtasks.every((s) => s.status === "done");
			if (allDone && updatedSubtasks.length > 0) {
				form.setValue("status", "awaiting_review");
			}

			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const removeSubtask = useCallback(
		(id: string) => {
			const currentSubtasks = form.getValues("subtasks");
			const filteredSubtasks = currentSubtasks.filter((s) => s.id !== id);
			const reorderedSubtasks = filteredSubtasks.map((s, i) => ({
				...s,
				order: i,
			}));

			form.setValue("subtasks", reorderedSubtasks);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const updateSubtask = useCallback(
		(id: string, field: keyof Subtask, value: unknown) => {
			const currentSubtasks = form.getValues("subtasks");
			const updatedSubtasks = currentSubtasks.map((s) =>
				s.id === id ? { ...s, [field]: value } : s,
			);

			form.setValue("subtasks", updatedSubtasks);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const reorderSubtasks = useCallback(
		(newSubtasks: Subtask[]) => {
			form.setValue("subtasks", newSubtasks);
			const values = form.getValues();
			debouncedSave(values);
		},
		[form, debouncedSave],
	);

	const dismissConflictWarning = useCallback(() => {
		setConflictWarning(false);
	}, []);

	const isDirty = useMemo(
		() => form.formState.isDirty,
		[form.formState.isDirty],
	);
	const isSaving = updateMutation.isPending;

	return {
		form,
		isDirty,
		isSaving,
		lastKnownModifiedAt,
		aiUpdatedRecently,
		conflictWarning,
		dismissConflictWarning,
		saveField,
		saveContextField,
		addBusinessRule,
		removeBusinessRule,
		addAcceptanceCriteria,
		removeAcceptanceCriteria,
		addSubtask,
		toggleSubtask,
		removeSubtask,
		updateSubtask,
		reorderSubtasks,
	};
}
