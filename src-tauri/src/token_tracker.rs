use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Token usage data from an OpenCode session
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TokenUsage {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
    pub cache_read_tokens: i64,
    pub cache_write_tokens: i64,
    pub session_id: String,
    pub model: Option<String>,
    pub message_count: i32,
}

#[derive(Debug, Deserialize)]
struct OpenCodeMessage {
    #[allow(dead_code)]
    id: String,
    #[allow(dead_code)]
    #[serde(rename = "sessionID")]
    session_id: String,
    role: String,
    #[serde(rename = "modelID")]
    model_id: Option<String>,
    tokens: Option<MessageTokens>,
}

#[derive(Debug, Deserialize)]
struct MessageTokens {
    input: Option<i64>,
    output: Option<i64>,
    #[allow(dead_code)]
    reasoning: Option<i64>,
    cache: Option<CacheTokens>,
}

#[derive(Debug, Deserialize)]
struct CacheTokens {
    read: Option<i64>,
    write: Option<i64>,
}

/// Get the OpenCode storage directory path
fn get_opencode_storage_path() -> Option<PathBuf> {
    dirs::data_local_dir().map(|p| p.join("opencode").join("storage"))
}

/// Parse all messages from an OpenCode session and calculate total token usage
pub fn parse_opencode_session_tokens(session_id: &str) -> Result<TokenUsage, String> {
    let storage_path = get_opencode_storage_path()
        .ok_or_else(|| "Could not find OpenCode storage directory".to_string())?;

    let session_dir = storage_path.join("message").join(session_id);

    if !session_dir.exists() {
        return Err(format!(
            "Session directory not found: {}",
            session_dir.display()
        ));
    }

    let mut usage = TokenUsage {
        session_id: session_id.to_string(),
        ..Default::default()
    };

    let entries = fs::read_dir(&session_dir)
        .map_err(|e| format!("Failed to read session directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }

        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(msg) = serde_json::from_str::<OpenCodeMessage>(&content) {
                // Only count assistant messages (they contain the actual token usage)
                if msg.role == "assistant" {
                    if let Some(tokens) = msg.tokens {
                        usage.input_tokens += tokens.input.unwrap_or(0);
                        usage.output_tokens += tokens.output.unwrap_or(0);

                        if let Some(cache) = tokens.cache {
                            usage.cache_read_tokens += cache.read.unwrap_or(0);
                            usage.cache_write_tokens += cache.write.unwrap_or(0);
                        }

                        usage.message_count += 1;

                        // Capture model from first message if not set
                        if usage.model.is_none() {
                            usage.model = msg.model_id;
                        }
                    }
                }
            }
        }
    }

    // Calculate total tokens (input + output + cache read, as cache read counts as input)
    usage.total_tokens = usage.input_tokens + usage.output_tokens + usage.cache_read_tokens;

    Ok(usage)
}

#[allow(dead_code)]
pub fn list_opencode_sessions() -> Result<Vec<String>, String> {
    let storage_path = get_opencode_storage_path()
        .ok_or_else(|| "Could not find OpenCode storage directory".to_string())?;

    let message_dir = storage_path.join("message");

    if !message_dir.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&message_dir)
        .map_err(|e| format!("Failed to read message directory: {}", e))?;

    let mut sessions = Vec::new();
    for entry in entries.flatten() {
        if entry.path().is_dir() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with("ses_") {
                    sessions.push(name.to_string());
                }
            }
        }
    }

    Ok(sessions)
}

#[allow(dead_code)]
pub fn session_exists(session_id: &str) -> bool {
    if let Some(storage_path) = get_opencode_storage_path() {
        let session_dir = storage_path.join("message").join(session_id);
        session_dir.exists()
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_usage_default() {
        let usage = TokenUsage::default();
        assert_eq!(usage.input_tokens, 0);
        assert_eq!(usage.output_tokens, 0);
        assert_eq!(usage.total_tokens, 0);
        assert!(usage.session_id.is_empty());
    }
}
