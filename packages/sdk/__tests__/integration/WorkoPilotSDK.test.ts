import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { WorkoPilotSDK } from '../../src/WorkoPilotSDK'

describe('WorkoPilotSDK Integration', () => {
  let sdk: WorkoPilotSDK
  let tempDir: string

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'workopilot-sdk-test-'))
    const dbPath = join(tempDir, 'test.db')
    sdk = await WorkoPilotSDK.create({ dbPath, autoMigrate: true })
  })

  afterAll(async () => {
    await sdk.close()
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Cleanup errors can be ignored safely in test teardown
    }
  })

  describe('initialization', () => {
    it('should create SDK with test database', () => {
      expect(sdk).toBeDefined()
      expect(sdk.dbPath).toContain('test.db')
    })

    it('should expose all modules', () => {
      expect(sdk.tasks).toBeDefined()
      expect(sdk.projects).toBeDefined()
      expect(sdk.subtasks).toBeDefined()
      expect(sdk.settings).toBeDefined()
      expect(sdk.executions).toBeDefined()
    })
  })

  describe('full workflow', () => {
    let projectId: string
    let taskId: string

    it('should create a project', async () => {
      const project = await sdk.projects.create({
        name: 'Test Project',
        path: '/tmp/test',
      })
      
      expect(project.id).toBeDefined()
      expect(project.name).toBe('Test Project')
      projectId = project.id
    })

    it('should create a task in the project', async () => {
      const task = await sdk.tasks.create({
        project_id: projectId,
        title: 'Test Task',
        description: 'Test description',
      })
      
      expect(task.id).toBeDefined()
      expect(task.title).toBe('Test Task')
      expect(task.status).toBe('pending')
      taskId = task.id
    })

    it('should list tasks for project', async () => {
      const tasks = await sdk.tasks.list({ project_id: projectId })
      
      expect(tasks.length).toBeGreaterThanOrEqual(1)
      expect(tasks.some(t => t.id === taskId)).toBe(true)
    })

    it('should update task status', async () => {
      const task = await sdk.tasks.updateStatus(taskId, 'working')
      
      expect(task.status).toBe('working')
    })

    it('should create subtask for task', async () => {
      const subtask = await sdk.subtasks.create({
        task_id: taskId,
        title: 'Test Subtask',
      })
      
      expect(subtask.id).toBeDefined()
      expect(subtask.status).toBe('pending')
    })
  })
})
