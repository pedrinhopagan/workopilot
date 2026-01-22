import { describe, expect, it } from 'bun:test'
import type { Task } from '../../../../src/domain/entities/Task'
import type { TaskStatus } from '../../../../src/domain/value-objects/TaskStatus'

describe('Task Entity', () => {
  const createValidTask = (): Task => ({
    id: 'test-task-id',
    project_id: 'test-project-id',
    title: 'Test Task',
    description: 'Test description',
    status: 'pending' as TaskStatus,
    priority: 1,
    category: 'feature',
    complexity: 'simple',
    due_date: null,
    scheduled_date: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  })

  describe('Task creation', () => {
    it('should create a task with valid data', () => {
      const task = createValidTask()
      
      expect(task.id).toBe('test-task-id')
      expect(task.title).toBe('Test Task')
      expect(task.status).toBe('pending')
    })

    it('should have required fields', () => {
      const task = createValidTask()
      
      expect(task.id).toBeDefined()
      expect(task.project_id).toBeDefined()
      expect(task.title).toBeDefined()
      expect(task.status).toBeDefined()
    })
  })

  describe('Task status', () => {
    it('should have valid status values', () => {
      const validStatuses: TaskStatus[] = [
        'pending',
        'structuring',
        'structured',
        'working',
        'standby',
        'ready_to_review',
        'completed',
      ]
      
      const task = createValidTask()
      expect(validStatuses).toContain(task.status)
    })
  })

  describe('Task priority', () => {
    it('should accept valid priority values', () => {
      const task = createValidTask()
      expect(task.priority).toBeGreaterThanOrEqual(1)
      expect(task.priority).toBeLessThanOrEqual(5)
    })
  })
})
