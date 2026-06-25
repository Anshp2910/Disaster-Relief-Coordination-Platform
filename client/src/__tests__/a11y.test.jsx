import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Accessibility compliance', () => {
  const animationsPath = path.resolve(__dirname, '../styles/07-animations.css')
  const animationsCss = fs.readFileSync(animationsPath, 'utf8')
  
  it('should have prefers-reduced-motion support', () => {
    expect(animationsCss).toContain('prefers-reduced-motion')
  })
  
  it('should not have !important in component CSS', () => {
    const styleDir = path.resolve(__dirname, '../styles')
    const files = fs.readdirSync(styleDir).filter(f => f.endsWith('.css'))
    /** @type {string[]} */
    const importantLines = []
    for (const file of files) {
      const css = fs.readFileSync(path.join(styleDir, file), 'utf8')
      const lines = css.split('\n').filter(line => line.includes('!important'))
      importantLines.push(...lines.filter(l => !l.includes('leaflet') && !l.includes('-webkit-')))
    }
    expect(importantLines.length).toBe(0)
  })
  
  it('should not have .dark class references in variables CSS', () => {
    const basePath = path.resolve(__dirname, '../styles/01-variables.css')
    const css = fs.readFileSync(basePath, 'utf8')
    expect(css).not.toContain('.dark')
  })
})
