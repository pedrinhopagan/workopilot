import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLI_PATH = '/home/pedro/Documents/projects/workopilot/packages/cli';
const CLI_COMMAND = 'bun';
const CLI_ARGS = ['run', 'src/index.ts'];

const sessionState = new Map();
const SKILLS_DIR = path.join(os.homedir(), '.config/opencode/skills');

// Clawdbot webhook config
const CLAWDBOT_HOOK_URL = 'http://localhost:18789/hooks/wake';
const CLAWDBOT_HOOK_TOKEN = '539bf0efc71913491769c63c17cf2c79';

function isWorkopilotSkill(skillName) {
  if (!skillName) return false;
  const name = skillName.replace(/^(project:|superpowers:)/, '');
  return name.startsWith('workopilot-');
}

function normalizeSkillName(skillName) {
  if (skillName && skillName.startsWith('superpowers:workopilot-')) {
    return skillName.replace('superpowers:', '');
  }
  return skillName;
}

function skillExistsInUserConfig(skillName) {
  const name = skillName.replace(/^(project:|superpowers:)/, '');
  const skillFile = path.join(SKILLS_DIR, name, 'SKILL.md');
  return fs.existsSync(skillFile);
}

function syncSkills() {
  try {
    const result = spawnSync(CLI_COMMAND, [...CLI_ARGS, 'sync-skills'], {
      cwd: CLI_PATH,
      timeout: 15000,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    if (result.status === 0) {
      console.log('[WorkoPilot] Skills synced successfully');
      return true;
    }
    console.error('[WorkoPilot] Failed to sync skills:', result.stderr);
    return false;
  } catch (err) {
    console.error('[WorkoPilot] Error syncing skills:', err.message);
    return false;
  }
}

const TASK_ID_PATTERNS = [
  /task\s+(?:de\s+)?id[:\s]+([a-f0-9-]{36})/i,
  /task[:\s]+([a-f0-9-]{36})/i,
  /subtask[:\s]+([a-f0-9-]{36})/i,
  /([a-f0-9-]{36})/
];

function extractTaskId(text) {
  if (!text) return null;
  for (const pattern of TASK_ID_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Detect workopilot-related content in text
const WORKOPILOT_KEYWORDS = [
  'workopilot', 'workopilot-', 'wop ', 'subtask', 'update-task',
  'update-subtask', 'get-task', 'acceptance_criteria',
  'workopilot-structure', 'workopilot-execute', 'workopilot-review',
  'workopilot-quickfix', 'workopilot-commit'
];

function hasWorkopilotContent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return WORKOPILOT_KEYWORDS.some(kw => lower.includes(kw));
}

async function runCli(command, args = []) {
  return new Promise((resolve, reject) => {
    const fullArgs = [...CLI_ARGS, command, ...args];
    const proc = spawn(CLI_COMMAND, fullArgs, {
      cwd: CLI_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        try { resolve(JSON.parse(stdout)); }
        catch { resolve(stdout); }
      } else {
        reject(new Error(`CLI exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => { reject(err); });
  });
}

async function updateTaskSubstatus(taskId, substatus) {
  try {
    await runCli('update-task', [taskId, '--substatus', substatus]);
    console.log(`[WorkoPilot] Updated task ${taskId} substatus to ${substatus}`);
    return true;
  } catch (err) {
    console.error(`[WorkoPilot] Failed to update substatus:`, err.message);
    return false;
  }
}

function detectSkillType(skillName) {
  if (!skillName) return null;
  const lowerName = skillName.toLowerCase();
  if (lowerName.includes('workopilot-structure')) return 'structure';
  if (lowerName.includes('workopilot-execute')) return 'execute';
  if (lowerName.includes('workopilot-review')) return 'review';
  if (lowerName.includes('workopilot-quickfix')) return 'quickfix';
  if (lowerName.includes('workopilot-commit')) return 'commit';
  return null;
}

function getSessionState(sessionID) {
  if (!sessionState.has(sessionID)) {
    sessionState.set(sessionID, {
      activeSkill: null,
      taskId: null,
      skillType: null,
      hasActivity: false,
      lastAssistantText: ''
    });
  }
  return sessionState.get(sessionID);
}

const ACTION_LABELS = {
  'structure': 'Estruturação',
  'execute': 'Execução',
  'review': 'Revisão',
  'quickfix': 'Quickfix',
  'commit': 'Commit'
};

async function notifyClawdbot(sessionID, state, directory) {
  try {
    // Use stored assistant text (captured in chat.message) — NOT client.session.messages()
    let lastMessageText = state.lastAssistantText || '(sem mensagem de texto disponivel)';

    // Get task title
    let taskTitle = 'Tarefa desconhecida';
    if (state.taskId) {
      try {
        const taskData = await runCli('get-task', [state.taskId]);
        if (taskData?.title) taskTitle = taskData.title;
      } catch {}
    }

    const actionLabel = ACTION_LABELS[state.skillType] || 'Ação';

    // Truncate: keep the last 2500 chars (most relevant part)
    const maxLen = 2500;
    let msgBody = lastMessageText;
    if (msgBody.length > maxLen) {
      msgBody = '...\n' + msgBody.substring(msgBody.length - maxLen);
    }

    const text = [
      `[OpenCode] ${actionLabel} finalizada — aguardando input`,
      `Tarefa: ${taskTitle}`,
      `TaskID: ${state.taskId}`,
      `SessionID: ${sessionID}`,
      `Diretório: ${directory}`,
      ``,
      `--- Última mensagem do OpenCode ---`,
      msgBody
    ].join('\n');

    const response = await fetch(CLAWDBOT_HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLAWDBOT_HOOK_TOKEN}`
      },
      body: JSON.stringify({ text, mode: 'now' })
    });

    if (response.ok) {
      console.log(`[WorkoPilot] Clawdbot notified — session ${sessionID}`);
    } else {
      console.error(`[WorkoPilot] Clawdbot webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[WorkoPilot] Failed to notify Clawdbot:`, err.message);
  }
}

export const WorkoPilotPlugin = async ({ client, directory }) => {
  return {
    "chat.message": async (input, output) => {
      const { sessionID } = input;
      const { parts } = output;

      // Capture assistant text directly here (NOT via client.session.messages later)
      const textParts = parts.filter(p => p.type === 'text');
      const fullText = textParts.map(p => p.text).join('\n');

      if (fullText) {
        const state = getSessionState(sessionID);

        // Store latest assistant text
        state.lastAssistantText = fullText;
        console.log(`[WorkoPilot] Captured assistant text (${fullText.length} chars)`);

        // Extract taskId from assistant output
        const taskId = extractTaskId(fullText);
        if (taskId) {
          state.taskId = taskId;
          console.log(`[WorkoPilot] Extracted taskId: ${taskId}`);
        }

        // Detect workopilot content in assistant response
        if (hasWorkopilotContent(fullText)) {
          state.hasActivity = true;
          console.log(`[WorkoPilot] Detected workopilot content in assistant`);
        }
      }
    },

    "tool.execute.before": async (input, output) => {
      const { tool, sessionID } = input;
      const { args } = output;

      if (tool !== 'use_skill') return;

      let skillName = args?.skill_name;

      if (isWorkopilotSkill(skillName)) {
        const normalizedName = normalizeSkillName(skillName);
        if (normalizedName !== skillName) {
          output.args.skill_name = normalizedName;
          skillName = normalizedName;
          console.log(`[WorkoPilot] Normalized skill name to: ${skillName}`);
        }

        if (!skillExistsInUserConfig(skillName)) {
          console.log(`[WorkoPilot] Skill ${skillName} not found, syncing...`);
          syncSkills();
        }
      }

      const skillType = detectSkillType(skillName);
      if (!skillType) return;

      const state = getSessionState(sessionID);
      state.activeSkill = skillName;
      state.skillType = skillType;
      state.hasActivity = true;

      console.log(`[WorkoPilot] Detected ${skillType} skill: ${skillName}`);

      // Substatus update is best-effort — doesn't gate the webhook
      if (state.taskId) {
        const substatus = skillType === 'structure' ? 'structuring' : 'executing';
        await updateTaskSubstatus(state.taskId, substatus);
      }
    },

    "tool.execute.after": async (input, output) => {
      const { tool, sessionID } = input;

      if (tool !== 'use_skill') return;

      const state = getSessionState(sessionID);
      if (!state.activeSkill) return;

      console.log(`[WorkoPilot] Skill ${state.activeSkill} loaded`);
    },

    event: async ({ event }) => {
      if (event.type === 'session.idle') {
        const sessionID = event.properties?.sessionID;
        if (!sessionID) return;

        const state = sessionState.get(sessionID);
        // Gate on hasActivity — fires regardless of substatus update success
        if (!state?.hasActivity) return;

        console.log(`[WorkoPilot] Session idle with workopilot activity (${state.skillType || 'content'})`);

        // Best-effort substatus update on idle
        if (state.taskId) {
          const substatus = state.skillType === 'structure' ? 'awaiting_user' : 'awaiting_review';
          await updateTaskSubstatus(state.taskId, substatus);
        }

        // Notify Clawdbot via webhook — uses stored assistant text, NOT client.session.messages()
        await notifyClawdbot(sessionID, state, directory);

        // Reset state
        state.activeSkill = null;
        state.skillType = null;
        state.hasActivity = false;
        state.lastAssistantText = '';
      }

      if (event.type === 'session.deleted') {
        const sessionID = event.properties?.info?.id;
        if (sessionID) sessionState.delete(sessionID);
      }
    }
  };
};
