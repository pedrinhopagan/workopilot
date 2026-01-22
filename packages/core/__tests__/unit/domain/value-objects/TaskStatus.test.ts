import { describe, expect, it } from 'bun:test'
import type { TaskStatus } from '../../../../src/domain/value-objects/TaskStatus'
import { isValidTaskStatus, TASK_STATUSES } from '../../../../src/domain/value-objects/TaskStatus'

describe('TaskStatus Value Object', () => {
  describe('TASK_STATUSES', () => {
    it('should contain 7 valid statuses', () => {
      expect(TASK_STATUSES.length).toBe(7)
    })

    it('should include all workflow statuses', () => {
      expect(TASK_STATUSES).toContain('pending')
      expect(TASK_STATUSES).toContain('structuring')
      expect(TASK_STATUSES).toContain('structured')
      expect(TASK_STATUSES).toContain('working')
      expect(TASK_STATUSES).toContain('standby')
      expect(TASK_STATUSES).toContain('ready_to_review')
      expect(TASK_STATUSES).toContain('completed')
    })
  })

  describe('isValidTaskStatus', () => {
    it('should return true for valid statuses', () => {
      const validStatuses: TaskStatus[] = ['pending', 'structuring', 'structured', 'working', 'standby', 'ready_to_review', 'completed']
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
