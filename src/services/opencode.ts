import { createOpencodeClient, type OpencodeClient, type GlobalEvent, type Event } from "@opencode-ai/sdk/client";

export type OpenCodeEventType =
  | "session.updated"
  | "message.updated"
  | "file.edited"
  | "session.error"
  | "file.watcher.updated"
  | "session.idle";

type EventCallback = (event: Event, directory: string) => void;
type ConnectionCallback = (connected: boolean) => void;
type ErrorCallback = (error: string | null) => void;

class OpenCodeService {
  private client: OpencodeClient | null = null;
  private abortController: AbortController | null = null;
  private isListening = false;
  private eventCallbacks: Map<string, Set<EventCallback>> = new Map();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async init(): Promise<boolean> {
    try {
      this.client = createOpencodeClient({
        baseUrl: "http://localhost:4096",
      });

      this.notifyConnection(true);
      this.notifyError(null);
      this.reconnectAttempts = 0;

      console.log("[OpenCode] Client initialized successfully");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[OpenCode] Failed to initialize client:", message);
      this.notifyConnection(false);
      this.notifyError(message);
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening || !this.client) {
      console.log("[OpenCode] Already listening or client not initialized");
      return;
    }

    this.isListening = true;
    this.abortController = new AbortController();
    console.log("[OpenCode] Starting event listener...");

    try {
      const result = await this.client.global.event({
        signal: this.abortController.signal,
      });

      for await (const globalEvent of result.stream) {
        const typedEvent = globalEvent as GlobalEvent;
        this.handleEvent(typedEvent.payload, typedEvent.directory);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      if (message.includes("abort") || this.abortController?.signal.aborted) {
        console.log("[OpenCode] Stream aborted");
        return;
      }

      console.error("[OpenCode] Stream error:", message);
      this.notifyConnection(false);
      this.notifyError(message);

      this.attemptReconnect();
    } finally {
      this.isListening = false;
    }
  }

  private handleEvent(event: Event, directory: string): void {
    console.log("[OpenCode] Event received:", event.type, "from", directory);

    const typeCallbacks = this.eventCallbacks.get(event.type);
    if (typeCallbacks) {
      typeCallbacks.forEach((callback) => {
        try {
          callback(event, directory);
        } catch (error) {
          console.error("[OpenCode] Callback error:", error);
        }
      });
    }

    const wildcardCallbacks = this.eventCallbacks.get("*");
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach((callback) => {
        try {
          callback(event, directory);
        } catch (error) {
          console.error("[OpenCode] Wildcard callback error:", error);
        }
      });
    }
  }

  on(eventType: OpenCodeEventType | "*", callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }

    this.eventCallbacks.get(eventType)!.add(callback);

    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  onFileChange(callback: (filePath: string, directory: string) => void): () => void {
    return this.on("file.edited", (event, directory) => {
      if (event.type === "file.edited") {
        callback(event.properties.file, directory);
      }
    });
  }

  onSessionUpdate(callback: (sessionId: string, directory: string) => void): () => void {
    return this.on("session.updated", (event, directory) => {
      if (event.type === "session.updated") {
        callback(event.properties.info.id, directory);
      }
    });
  }

  onSessionIdle(callback: (sessionId: string, directory: string) => void): () => void {
    return this.on("session.idle", (event, directory) => {
      if (event.type === "session.idle") {
        callback(event.properties.sessionID, directory);
      }
    });
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => cb(connected));
  }

  private notifyError(error: string | null): void {
    this.errorCallbacks.forEach((cb) => cb(error));
  }

  stopListening(): void {
    if (this.abortController) {
      console.log("[OpenCode] Stopping event listener...");
      this.abortController.abort();
      this.abortController = null;
    }
    this.isListening = false;
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[OpenCode] Max reconnection attempts reached");
      this.notifyError("Connection lost. Max reconnection attempts reached.");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[OpenCode] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    const success = await this.init();
    if (success) {
      this.startListening();
    }
  }

  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch("http://localhost:4096/health", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  get connected(): boolean {
    return this.isListening;
  }

  destroy(): void {
    this.stopListening();
    this.eventCallbacks.clear();
    this.connectionCallbacks.clear();
    this.errorCallbacks.clear();
    this.client = null;
    this.notifyConnection(false);
  }
}

export const openCodeService = new OpenCodeService();

if (typeof window !== "undefined") {
  setTimeout(async () => {
    const available = await openCodeService.isServerAvailable();
    if (available) {
      await openCodeService.init();
      openCodeService.startListening();
    } else {
      console.log("[OpenCode] Server not available, will retry on demand");
    }
  }, 1000);
}
