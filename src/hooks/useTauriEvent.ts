import { useEffect, useRef } from "react"
import { safeListen } from "../services/tauri"

export function useTauriEvent<T>(eventName: string, callback: (payload: T) => void) {
	const unlistenRef = useRef<(() => void) | null>(null)

	useEffect(() => {
		safeListen<T>(eventName, (event) => callback(event.payload)).then((fn) => {
			unlistenRef.current = fn
		})

		return () => {
			unlistenRef.current?.()
		}
	}, [eventName, callback])

	return () => unlistenRef.current?.()
}
