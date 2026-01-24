use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

#[derive(Debug, Serialize)]
struct JsonRpcRequest {
    jsonrpc: &'static str,
    id: u64,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse {
    #[allow(dead_code)]
    jsonrpc: String,
    #[allow(dead_code)]
    id: Option<u64>,
    result: Option<serde_json::Value>,
    error: Option<JsonRpcError>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcError {
    code: i32,
    message: String,
    #[allow(dead_code)]
    data: Option<serde_json::Value>,
}

const TRPC_URL_PREFIX: &str = "TRPC_URL=";

pub struct Sidecar {
    process: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout_reader: Option<BufReader<ChildStdout>>,
    request_id: AtomicU64,
    trpc_url: Option<String>,
}

impl Sidecar {
    pub fn new() -> Self {
        Self {
            process: None,
            stdin: None,
            stdout_reader: None,
            request_id: AtomicU64::new(1),
            trpc_url: None,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        if self.process.is_some() {
            return Ok(());
        }

        let sidecar_info = get_sidecar_path()?;

        let mut child = if sidecar_info.is_compiled {
            eprintln!("[SIDECAR] Starting compiled sidecar: {}", sidecar_info.path);
            Command::new(&sidecar_info.path)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .map_err(|e| format!("Failed to spawn sidecar: {}", e))?
        } else {
            let bun_path = which::which("bun").map_err(|e| format!("Bun not found: {}", e))?;
            eprintln!(
                "[SIDECAR] Starting sidecar via bun: {} run {}",
                bun_path.display(),
                sidecar_info.path
            );
            Command::new(bun_path)
                .arg("run")
                .arg(&sidecar_info.path)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .map_err(|e| format!("Failed to spawn sidecar: {}", e))?
        };

        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        let stdout_reader = BufReader::new(stdout);

        self.process = Some(child);
        self.stdin = Some(stdin);
        self.stdout_reader = Some(stdout_reader);

        self.wait_for_trpc_url()?;

        eprintln!("[SIDECAR] Sidecar started successfully");
        Ok(())
    }

    fn wait_for_trpc_url(&mut self) -> Result<(), String> {
        let reader = self
            .stdout_reader
            .as_mut()
            .ok_or("No stdout reader available")?;

        let mut line = String::new();
        reader
            .read_line(&mut line)
            .map_err(|e| format!("Read error waiting for tRPC URL: {}", e))?;

        if line.starts_with(TRPC_URL_PREFIX) {
            let url = line.trim_start_matches(TRPC_URL_PREFIX).trim().to_string();
            eprintln!("[SIDECAR] tRPC URL captured: {}", url);
            self.trpc_url = Some(url);
            Ok(())
        } else {
            Err(format!("Expected tRPC URL, got: {}", line.trim()))
        }
    }

    pub fn get_trpc_url(&self) -> Option<&str> {
        self.trpc_url.as_deref()
    }

    pub fn stop(&mut self) {
        self.stdin = None;
        self.stdout_reader = None;
        self.trpc_url = None;

        if let Some(mut child) = self.process.take() {
            let _ = child.kill();
            let _ = child.wait();
            eprintln!("[SIDECAR] Sidecar stopped");
        }
    }

    pub fn call(
        &mut self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        if self.process.is_none() {
            self.start()?;
        }

        let id = self.request_id.fetch_add(1, Ordering::SeqCst);

        let request = JsonRpcRequest {
            jsonrpc: "2.0",
            id,
            method: method.to_string(),
            params,
        };

        let request_json =
            serde_json::to_string(&request).map_err(|e| format!("Serialize error: {}", e))?;

        let stdin = self.stdin.as_mut().ok_or("No stdin available")?;
        writeln!(stdin, "{}", request_json).map_err(|e| format!("Write error: {}", e))?;
        stdin.flush().map_err(|e| format!("Flush error: {}", e))?;

        let reader = self
            .stdout_reader
            .as_mut()
            .ok_or("No stdout reader available")?;
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .map_err(|e| format!("Read error: {}", e))?;

        if line.is_empty() {
            return Err("Sidecar closed connection".to_string());
        }

        let response: JsonRpcResponse = serde_json::from_str(&line)
            .map_err(|e| format!("Parse error: {} - line: {}", e, line.trim()))?;

        if let Some(error) = response.error {
            return Err(format!("[{}] {}", error.code, error.message));
        }

        response
            .result
            .ok_or_else(|| "No result in response".to_string())
    }

    pub fn is_running(&self) -> bool {
        self.process.is_some()
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        self.stop();
    }
}

struct SidecarInfo {
    path: String,
    is_compiled: bool,
}

fn get_sidecar_path() -> Result<SidecarInfo, String> {
    if cfg!(debug_assertions) {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
        if !manifest_dir.is_empty() {
            let path = std::path::Path::new(&manifest_dir)
                .parent()
                .unwrap()
                .join("packages/sidecar/src/index.ts");
            if path.exists() {
                return Ok(SidecarInfo {
                    path: path.to_string_lossy().to_string(),
                    is_compiled: false,
                });
            }
        }

        let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
        let dev_path = cwd.join("packages/sidecar/src/index.ts");
        if dev_path.exists() {
            return Ok(SidecarInfo {
                path: dev_path.to_string_lossy().to_string(),
                is_compiled: false,
            });
        }

        let tauri_dev_path = cwd
            .parent()
            .map(|p| p.join("packages/sidecar/src/index.ts"));
        if let Some(path) = tauri_dev_path {
            if path.exists() {
                return Ok(SidecarInfo {
                    path: path.to_string_lossy().to_string(),
                    is_compiled: false,
                });
            }
        }
    }

    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("No exe dir")?;

    let sidecar_name = if cfg!(target_os = "windows") {
        "workopilot-sidecar.exe"
    } else {
        "workopilot-sidecar"
    };

    let prod_path = exe_dir.join(sidecar_name);
    if prod_path.exists() {
        return Ok(SidecarInfo {
            path: prod_path.to_string_lossy().to_string(),
            is_compiled: true,
        });
    }

    Err("Sidecar not found".to_string())
}

pub struct SidecarState {
    pub sidecar: Mutex<Sidecar>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            sidecar: Mutex::new(Sidecar::new()),
        }
    }
}
