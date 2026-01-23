import { describe, expect, it } from 'bun:test'
import type { TaskStatus } from '../../../../src/domain/value-objects/TaskStatus'
import { isValidTaskStatus, TASK_STATUSES } from '../../../../src/domain/value-objects/TaskStatus'

describe('TaskStatus Value Object', () => {
  describe('TASK_STATUSES', () => {
    it('should contain 3 valid statuses', () => {
      expect(TASK_STATUSES.length).toBe(3)
    })

    it('should include all workflow statuses', () => {
      expect(TASK_STATUSES).toContain('pending')
      expect(TASK_STATUSES).toContain('in_progress')
      expect(TASK_STATUSES).toContain('done')
    })
  })

  describe('isValidTaskStatus', () => {
    it('should return true for valid statuses', () => {
      const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'done']
      for (const status of validStatuses) {
        expect(isValidTaskStatus(status)).toBe(true)
      }
    })

    it('should return false for invalid statuses', () => {
      expect(isValidTaskStatus('invalid')).toBe(false)
      expect(isValidTaskStatus('')).toBe(false)
      expect(isValidTaskStatus('PENDING')).toBe(false)
    })
  })
})
