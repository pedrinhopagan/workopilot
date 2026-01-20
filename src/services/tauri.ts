declare global {
	interface Window {
		__TAURI_INTERNALS__?: unknown
	}
}

export function isTauri() {
	return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__
}

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	if (!isTauri()) {
		return Promise.reject(new Error("TAURI_UNAVAILABLE"))
	}
	const { invoke } = await import("@tauri-apps/api/core")
	return invoke<T>(command, args)
}

export async function safeListen<T>(
	event: string,
	handler: (event: { payload: T }) => void
): Promise<() => void> {
	if (!isTauri()) {
		return () => {}
	}
	const { listen } = await import("@tauri-apps/api/event")
	return listen<T>(event, handler)
}

export async function safeGetCurrentWindow() {
	if (!isTauri()) {
		return null
	}
	const { getCurrentWindow } = await import("@tauri-apps/api/window")
	return getCurrentWindow()
}
