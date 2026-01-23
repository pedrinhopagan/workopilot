import { createOpencodeClient } from "@opencode-ai/sdk/client";

export interface TaskForDistribution {
  id: string;
  title: string;
  priority: number;
  category: string;
  complexity: string | null;
  due_date: string | null;
}

const CLI_PATH = "/home/pedro/Documents/projects/workopilot/packages/cli";

function buildDistributionPrompt(
  tasks: TaskForDistribution[],
  availableDates: string[]
): string {
  const tasksInfo = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    category: t.category,
    complexity: t.complexity || "medium",
    due_date: t.due_date,
  }));

  const sortedDates = [...availableDates].sort();

  return `You are a task scheduling assistant. Your job is to distribute the following tasks across the available dates using the WorkoPilot CLI.

## TASKS TO DISTRIBUTE:
${JSON.stringify(tasksInfo, null, 2)}

## AVAILABLE DATES (user selected these specific days):
${sortedDates.join(", ")}

## DISTRIBUTION RULES:
1. Consider task complexity: "complex" tasks need more time, schedule fewer per day
2. Consider priority: P1 (highest) should be scheduled earlier when possible
3. Consider due_date: Tasks with due dates should be scheduled before their due_date
4. Balance the workload across days - don't overload a single day
5. A "simple" task = 1 unit, "medium" = 2 units, "complex" = 3 units
6. Try to keep each day around 4-6 units total

## YOUR TASK:
For EACH task, run this command to schedule it:
\`\`\`bash
cd ${CLI_PATH} && bun run src/index.ts update-task {TASK_ID} --scheduled-date {YYYY-MM-DD}
\`\`\`

Execute ALL the commands now. Do NOT explain, just run the commands to schedule each task.

After scheduling all tasks, respond with a brief summary of what was scheduled.`;
}

export async function distributeTasksWithOpenCode(
  tasks: TaskForDistribution[],
  availableDates: string[]
): Promise<{ sessionId: string }> {
  if (tasks.length === 0) {
    throw new Error("Nenhuma tarefa selecionada");
  }

  if (availableDates.length === 0) {
    throw new Error("Nenhum dia selecionado");
  }

  const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
  });

  const prompt = buildDistributionPrompt(tasks, availableDates);

  const sessionResult = await client.session.create({
    body: {
      title: "Distribuição de Tarefas com IA",
    },
  });

  if (!sessionResult.data?.id) {
    throw new Error("Failed to create OpenCode session");
  }

  const sessionId = sessionResult.data.id;

  await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: prompt }],
    },
  });

  return { sessionId };
}

export async function checkSessionStatus(sessionId: string): Promise<"running" | "idle" | "error"> {
  const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
  });

  try {
    const statusResult = await client.session.status({});

    if (statusResult.data) {
      const sessionStatus = statusResult.data[sessionId];
      if (sessionStatus?.type === "idle") {
        return "idle";
      }
      if (sessionStatus?.type === "busy" || sessionStatus?.type === "retry") {
        return "running";
      }
    }
    return "idle";
  } catch {
    return "error";
  }
}
