use crate::window;
use crate::AppState;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const SHORTCUT_KEY: &str = "toggle_shortcut";
const DEFAULT_SHORTCUT: &str = "Alt+P";

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ShortcutConfig {
    pub modifier: String,
    pub key: String,
    pub display: String,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            modifier: "Alt".to_string(),
            key: "P".to_string(),
            display: DEFAULT_SHORTCUT.to_string(),
        }
    }
}

impl ShortcutConfig {
    pub fn from_string(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split('+').collect();
        if parts.len() != 2 {
            return None;
        }
        Some(Self {
            modifier: parts[0].trim().to_string(),
            key: parts[1].trim().to_string(),
            display: s.to_string(),
        })
    }

    pub fn to_shortcut(&self) -> Option<Shortcut> {
        let modifiers = match self.modifier.to_lowercase().as_str() {
            "alt" => Some(Modifiers::ALT),
            "ctrl" | "control" => Some(Modifiers::CONTROL),
            "shift" => Some(Modifiers::SHIFT),
            "super" | "meta" | "cmd" => Some(Modifiers::SUPER),
            _ => None,
        };

        let code = match self.key.to_uppercase().as_str() {
            "A" => Some(Code::KeyA),
            "B" => Some(Code::KeyB),
            "C" => Some(Code::KeyC),
            "D" => Some(Code::KeyD),
            "E" => Some(Code::KeyE),
            "F" => Some(Code::KeyF),
            "G" => Some(Code::KeyG),
            "H" => Some(Code::KeyH),
            "I" => Some(Code::KeyI),
            "J" => Some(Code::KeyJ),
            "K" => Some(Code::KeyK),
            "L" => Some(Code::KeyL),
            "M" => Some(Code::KeyM),
            "N" => Some(Code::KeyN),
            "O" => Some(Code::KeyO),
            "P" => Some(Code::KeyP),
            "Q" => Some(Code::KeyQ),
            "R" => Some(Code::KeyR),
            "S" => Some(Code::KeyS),
            "T" => Some(Code::KeyT),
            "U" => Some(Code::KeyU),
            "V" => Some(Code::KeyV),
            "W" => Some(Code::KeyW),
            "X" => Some(Code::KeyX),
            "Y" => Some(Code::KeyY),
            "Z" => Some(Code::KeyZ),
            "0" => Some(Code::Digit0),
            "1" => Some(Code::Digit1),
            "2" => Some(Code::Digit2),
            "3" => Some(Code::Digit3),
            "4" => Some(Code::Digit4),
            "5" => Some(Code::Digit5),
            "6" => Some(Code::Digit6),
            "7" => Some(Code::Digit7),
            "8" => Some(Code::Digit8),
            "9" => Some(Code::Digit9),
            "F1" => Some(Code::F1),
            "F2" => Some(Code::F2),
            "F3" => Some(Code::F3),
            "F4" => Some(Code::F4),
            "F5" => Some(Code::F5),
            "F6" => Some(Code::F6),
            "F7" => Some(Code::F7),
            "F8" => Some(Code::F8),
            "F9" => Some(Code::F9),
            "F10" => Some(Code::F10),
            "F11" => Some(Code::F11),
            "F12" => Some(Code::F12),
            "SPACE" => Some(Code::Space),
            "ESCAPE" | "ESC" => Some(Code::Escape),
            "BACKQUOTE" | "`" => Some(Code::Backquote),
            _ => None,
        };

        match (modifiers, code) {
            (Some(m), Some(c)) => Some(Shortcut::new(Some(m), c)),
            _ => None,
        }
    }
}

pub fn get_saved_shortcut(app: &AppHandle) -> ShortcutConfig {
    let state = app.state::<AppState>();
    let db = state.db.lock().unwrap();

    match db.get_setting(SHORTCUT_KEY) {
        Ok(Some(value)) => ShortcutConfig::from_string(&value).unwrap_or_default(),
        _ => ShortcutConfig::default(),
    }
}

pub fn save_shortcut(app: &AppHandle, config: &ShortcutConfig) -> Result<(), String> {
    let state = app.state::<AppState>();
    let db = state.db.lock().unwrap();

    db.set_setting(SHORTCUT_KEY, &config.display)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_shortcut(app: AppHandle) -> ShortcutConfig {
    get_saved_shortcut(&app)
}

#[tauri::command]
pub fn set_shortcut(app: AppHandle, shortcut: String) -> Result<ShortcutConfig, String> {
    let config = ShortcutConfig::from_string(&shortcut).ok_or_else(|| {
        "Invalid shortcut format. Use format: Modifier+Key (e.g., Alt+W)".to_string()
    })?;

    let new_shortcut = config
        .to_shortcut()
        .ok_or_else(|| "Invalid modifier or key".to_string())?;

    let old_config = get_saved_shortcut(&app);
    if let Some(old_shortcut) = old_config.to_shortcut() {
        let _ = app.global_shortcut().unregister(old_shortcut);
    }

    app.global_shortcut()
        .on_shortcut(new_shortcut, move |app, _shortcut, event| {
            if event.state == ShortcutState::Released {
                window::toggle(app);
            }
        })
        .map_err(|e| format!("Failed to register shortcut: {}", e))?;

    save_shortcut(&app, &config)?;

    eprintln!("[WORKOPILOT] Atalho alterado para: {}", config.display);

    Ok(config)
}

pub fn register_initial_shortcut(app: &AppHandle) -> Result<(), String> {
    let config = get_saved_shortcut(app);
    eprintln!(
        "[WORKOPILOT] Config carregada: modifier={}, key={}, display={}",
        config.modifier, config.key, config.display
    );

    let shortcut = config
        .to_shortcut()
        .ok_or_else(|| "Invalid saved shortcut configuration".to_string())?;

    eprintln!("[WORKOPILOT] Shortcut criado: {:?}", shortcut);

    app.global_shortcut()
        .on_shortcut(shortcut, move |app, _shortcut, event| {
            eprintln!("[WORKOPILOT] Shortcut event: {:?}", event.state);
            if event.state == ShortcutState::Pressed {
                window::toggle(app);
            }
        })
        .map_err(|e| format!("Failed to register shortcut: {}", e))?;

    eprintln!("[WORKOPILOT] Atalho registrado: {}", config.display);

    Ok(())
}
