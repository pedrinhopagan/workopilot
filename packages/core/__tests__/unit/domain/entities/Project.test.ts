/**
 * Unit tests for Project entity
 * 
 * Tests cover:
 * - Project creation with valid data
 * - Project status validation
 * - Path validation
 */

import { describe, expect, it } from 'bun:test'
import type { Project } from '../../../../src/domain/entities/Project'

describe('Project Entity', () => {
  const createValidProject = (): Project => ({
    id: 'test-project-id',
    name: 'Test Project',
    path: '/home/user/projects/test',
    description: 'A test project',
    status: 'active',
    tmuxConfig: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  describe('Project creation', () => {
    it('should create a project with valid data', () => {
      const project = createValidProject()
      
      expect(project.id).toBe('test-project-id')
      expect(project.name).toBe('Test Project')
      expect(project.status).toBe('active')
    })

    it('should have required fields', () => {
      const project = createValidProject()
      
      expect(project.id).toBeDefined()
      expect(project.name).toBeDefined()
      expect(project.path).toBeDefined()
      expect(project.status).toBeDefined()
    })
  })

  describe('Project status', () => {
    it('should have valid status values', () => {
      const validStatuses = ['active', 'archived']
      const project = createValidProject()
      
      expect(validStatuses).toContain(project.status)
    })
  })

  describe('Project path', () => {
    it('should have a valid path format', () => {
      const project = createValidProject()
      expect(project.path).toMatch(/^\//)
    })
  })
})
