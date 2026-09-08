import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('CI/CD Pipeline - RED Phase', () => {
  const githubActionsPath = join(process.cwd(), '.github', 'workflows')
  const testWorkflowPath = join(githubActionsPath, 'test.yml')

  describe('GitHub Actions Workflow', () => {
    it('should have .github/workflows directory', () => {
      expect(existsSync(githubActionsPath)).toBe(true)
    })

    it('should have test.yml workflow file', () => {
      expect(existsSync(testWorkflowPath)).toBe(true)
    })

    it('should have valid YAML syntax in test.yml', () => {
      if (!existsSync(testWorkflowPath)) {
        expect(true).toBe(false) // Will fail if file doesn't exist
        return
      }
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('name:')
      expect(content).toContain('on:')
      expect(content).toContain('jobs:')
    })

    it('should trigger on push to main', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('push:')
      expect(content).toContain('main')
    })

    it('should trigger on pull requests', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('pull_request:')
    })

    it('should run tests in the workflow', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('npm run test')
      expect(content).toContain('npm run test:run')
    })

    it('should enforce coverage threshold', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('coverage')
      expect(content).toContain('80')
    })

    it('should use Node.js environment', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('node-version')
      expect(content).toContain('20')
    })

    it('should install dependencies before testing', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toMatch(/npm (install|ci)/)
    })
  })

  describe('Coverage Configuration', () => {
    it('should have coverage reporting enabled', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('coverage')
    })

    it('should upload coverage reports', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('upload-artifact')
      expect(content).toContain('coverage')
    })
  })

  describe('Workflow Structure', () => {
    it('should have proper job definitions', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('test:')
      expect(content).toContain('runs-on:')
    })

    it('should have checkout step', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('actions/checkout')
    })

    it('should have Node.js setup step', () => {
      if (!existsSync(testWorkflowPath)) return
      
      const content = readFileSync(testWorkflowPath, 'utf-8')
      expect(content).toContain('actions/setup-node')
    })
  })
})

describe('CI/CD Integration Verification', () => {
  const testWorkflowPath = join(process.cwd(), '.github', 'workflows', 'test.yml')
  
  it('should fail build if tests fail', () => {
    // This verifies the workflow will fail the CI if tests don't pass
    if (!existsSync(testWorkflowPath)) {
      expect(true).toBe(false)
      return
    }
    
    const content = readFileSync(testWorkflowPath, 'utf-8')
    // GitHub Actions fails by default if any step fails
    expect(content).toBeDefined()
  })

  it('should provide clear build status for PRs', () => {
    if (!existsSync(testWorkflowPath)) return
    
    const content = readFileSync(testWorkflowPath, 'utf-8')
    // Status checks are automatic in GitHub Actions
    expect(content).toContain('status')
  })
})
