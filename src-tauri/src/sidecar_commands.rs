use crate::AppState;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub fn sidecar_call(
    state: State<AppState>,
    method: String,
    params: Option<Value>,
) -> Result<Value, String> {
    let mut sidecar = state
        .sidecar
        .sidecar
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if !sidecar.is_running() {
        sidecar.start()?;
    }

    sidecar.call(&method, params)
}

#[tauri::command]
pub fn sidecar_status(state: State<AppState>) -> Result<Value, String> {
    let sidecar = state
        .sidecar
        .sidecar
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    Ok(serde_json::json!({
        "running": sidecar.is_running()
    }))
}

#[tauri::command]
pub fn sidecar_restart(state: State<AppState>) -> Result<(), String> {
    let mut sidecar = state
        .sidecar
        .sidecar
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    sidecar.stop();
    sidecar.start()
}
