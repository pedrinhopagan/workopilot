import type { WorkoPilotSDK } from '@workopilot/sdk';

export interface Context {
  sdk: WorkoPilotSDK;
}

export function createContext(sdk: WorkoPilotSDK): Context {
  return { sdk };
}
