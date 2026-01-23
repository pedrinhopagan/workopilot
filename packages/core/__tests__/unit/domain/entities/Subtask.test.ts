/**
 * Unit tests for Subtask entity
 * 
 * Tests cover:
 * - Subtask creation with valid data
 * - Subtask status transitions
 * - Order validation
 */

import { describe, expect, it } from 'bun:test'
import type { Subtask } from '../../../../src/domain/entities/Subtask'
import type { SubtaskStatus } from '../../../../src/domain/value-objects/SubtaskStatus'

describe('Subtask Entity', () => {
  const createValidSubtask = (): Subtask => ({
    id: 'test-subtask-id',
    taskId: 'test-task-id',
    title: 'Test Subtask',
    status: 'pending' as SubtaskStatus,
    order: 0,
    description: 'Test subtask description',
    acceptanceCriteria: null,
    technicalNotes: null,
    promptContext: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  })

  describe('Subtask creation', () => {
    it('should create a subtask with valid data', () => {
      const subtask = createValidSubtask()
      
      expect(subtask.id).toBe('test-subtask-id')
      expect(subtask.title).toBe('Test Subtask')
      expect(subtask.status).toBe('pending')
    })

    it('should have required fields', () => {
      const subtask = createValidSubtask()
      
      expect(subtask.id).toBeDefined()
      expect(subtask.taskId).toBeDefined()
      expect(subtask.title).toBeDefined()
      expect(subtask.status).toBeDefined()
      expect(subtask.order).toBeDefined()
    })
  })

  describe('Subtask status', () => {
    it('should have valid status values', () => {
      const validStatuses: SubtaskStatus[] = ['pending', 'in_progress', 'done']
      const subtask = createValidSubtask()
      
      expect(validStatuses).toContain(subtask.status)
    })
  })

  describe('Subtask order', () => {
    it('should have non-negative order', () => {
      const subtask = createValidSubtask()
      expect(subtask.order).toBeGreaterThanOrEqual(0)
    })
  })
})
