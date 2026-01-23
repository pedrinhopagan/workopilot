import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLI_PATH = '/home/pedro/Documents/projects/workopilot/packages/cli';
const CLI_COMMAND = 'bun';
const CLI_ARGS = ['run', 'src/index.ts'];

const sessionState = new Map();
const SKILLS_DIR = path.join(os.homedir(), '.config/opencode/skills');

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

async function runCli(command, args = []) {
  return new Promise((resolve, reject) => {
    const fullArgs = [...CLI_ARGS, command, ...args];
    
    const proc = spawn(CLI_COMMAND, fullArgs, {
      cwd: CLI_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout);
        }
      } else {
        reject(new Error(`CLI exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
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
  return null;
}

function getSessionState(sessionID) {
  if (!sessionState.has(sessionID)) {
    sessionState.set(sessionID, {
      activeSkill: null,
      taskId: null,
      skillType: null,
      substatusUpdated: false
    });
  }
  return sessionState.get(sessionID);
}

export const WorkoPilotPlugin = async ({ client, directory }) => {
  return {
    "chat.message": async (input, output) => {
      const { sessionID } = input;
      const { parts } = output;
      
      const textParts = parts.filter(p => p.type === 'text');
      const fullText = textParts.map(p => p.text).join(' ');
      
      const taskId = extractTaskId(fullText);
      if (taskId) {
        const state = getSessionState(sessionID);
        state.taskId = taskId;
        console.log(`[WorkoPilot] Extracted taskId: ${taskId}`);
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
      state.substatusUpdated = false;
      
      console.log(`[WorkoPilot] Detected ${skillType} skill: ${skillName}`);
      
      if (state.taskId) {
        const substatus = skillType === 'structure' ? 'structuring' : 'executing';
        const updated = await updateTaskSubstatus(state.taskId, substatus);
        state.substatusUpdated = updated;
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
        if (!state?.activeSkill || !state?.substatusUpdated) return;
        
        console.log(`[WorkoPilot] Session idle after ${state.skillType} skill`);
        
        if (state.taskId) {
          const substatus = state.skillType === 'structure' ? 'awaiting_user' : 'awaiting_review';
          await updateTaskSubstatus(state.taskId, substatus);
        }
        
        state.activeSkill = null;
        state.skillType = null;
        state.substatusUpdated = false;
      }
      
      if (event.type === 'session.deleted') {
        const sessionID = event.properties?.info?.id;
        if (sessionID) sessionState.delete(sessionID);
      }
    }
  };
};
