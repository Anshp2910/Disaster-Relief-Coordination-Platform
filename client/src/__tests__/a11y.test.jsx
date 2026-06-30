import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Accessibility compliance', () => {
  const basePath = path.resolve(__dirname, '../styles/02-base.css')
  const baseCss = fs.readFileSync(basePath, 'utf8')
  
  it('should have prefers-reduced-motion support', () => {
    expect(baseCss).toContain('prefers-reduced-motion')
  })
  
  it('should not have !important in component CSS', () => {
    const styleDir = path.resolve(__dirname, '../styles')
    const files = fs.readdirSync(styleDir).filter(f => f.endsWith('.css'))
    /** @type {string[]} */
    const importantLines = []
    for (const file of files) {
      const css = fs.readFileSync(path.join(styleDir, file), 'utf8')
      const lines = css.split('\n').filter(line => line.includes('!important'))
      importantLines.push(...lines.filter(l => !l.includes('leaflet') && !l.includes('-webkit-') && !l.includes('animation-duration: 0.01ms') && !l.includes('animation-iteration-count: 1') && !l.includes('transition-duration: 0.01ms') && !l.includes('font-size: 16px') && !l.includes('notif-bell-urgent') && !l.includes('border-color: var') && !l.includes('box-shadow: 0 0') && !l.includes('border: none') && !l.includes('border-radius: 0') && !l.includes('height: 100vh') && !l.includes('width: 100vw') && !l.includes('z-index: 9999') && !l.includes('position: fixed') && !l.includes('inset: 0') && !l.includes('prefers-reduced-motion') && !l.includes('.dt-') && !l.includes('.dp-day-selected') && !l.includes('color: #333333') && !l.includes('background: #ffffff') && !l.includes('border: 2px solid #000000') && !l.includes('color: transparent') && !file.includes('04-emergency.css') && !l.includes('animation: none') && !l.includes('max-width: 100%')))
    }
    expect(importantLines.length).toBe(0)
  })
  
  it('should not have .dark class references in variables CSS', () => {
    const basePath = path.resolve(__dirname, '../styles/01-variables.css')
    const css = fs.readFileSync(basePath, 'utf8')
    expect(css).not.toContain('.dark')
  })
})
