import { describe, expect, it } from 'bun:test'
import type { SubtaskStatus } from '../../../../src/domain/value-objects/SubtaskStatus'
import { isValidSubtaskStatus, SUBTASK_STATUSES } from '../../../../src/domain/value-objects/SubtaskStatus'

describe('SubtaskStatus Value Object', () => {
  describe('SUBTASK_STATUSES', () => {
    it('should contain all valid statuses', () => {
      expect(SUBTASK_STATUSES).toContain('pending')
      expect(SUBTASK_STATUSES).toContain('in_progress')
      expect(SUBTASK_STATUSES).toContain('done')
    })
  })

  describe('isValidSubtaskStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidSubtaskStatus('pending')).toBe(true)
      expect(isValidSubtaskStatus('in_progress')).toBe(true)
      expect(isValidSubtaskStatus('done')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isValidSubtaskStatus('invalid')).toBe(false)
      expect(isValidSubtaskStatus('')).toBe(false)
      expect(isValidSubtaskStatus('DONE')).toBe(false)
    })
  })
})
