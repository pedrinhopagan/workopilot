import { connect, type Socket } from "node:net";

const SOCKET_PATH = "/tmp/workopilot.sock";

export interface NotifyPayload {
  entity_type: "task" | "subtask" | "execution" | "terminal";
  entity_id: string;
  operation: "create" | "update" | "delete";
}

export async function notifyApp(
  entityType: NotifyPayload["entity_type"],
  entityId: string,
  operation: NotifyPayload["operation"]
): Promise<void> {
  const payload: NotifyPayload = {
    entity_type: entityType,
    entity_id: entityId,
    operation,
  };

  return new Promise((resolve) => {
    const client: Socket = connect(SOCKET_PATH, () => {
      try {
        client.write(JSON.stringify(payload));
        client.end();
      } catch {
        resolve();
      }
    });

    client.on("error", () => {
      resolve();
    });

    client.on("close", () => {
      resolve();
    });

    const SOCKET_TIMEOUT_MS = 500;
    setTimeout(() => {
      try {
        client.destroy();
      } catch {}
      resolve();
    }, SOCKET_TIMEOUT_MS);
  });
}
