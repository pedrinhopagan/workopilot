import { describe, expect, it } from 'bun:test'

describe('Application Helpers', () => {
  describe('UUID generation', () => {
    it('should generate unique UUIDs', () => {
      const uuid1 = crypto.randomUUID()
      const uuid2 = crypto.randomUUID()
      
      expect(uuid1).not.toBe(uuid2)
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe('Date formatting', () => {
    it('should format ISO dates correctly', () => {
      const date = new Date('2026-01-22T12:00:00Z')
      const isoString = date.toISOString()
      
      expect(isoString).toBe('2026-01-22T12:00:00.000Z')
    })
  })
})
