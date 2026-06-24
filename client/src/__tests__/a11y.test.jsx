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
    const componentsPath = path.resolve(__dirname, '../styles/04-components.css')
    const css = fs.readFileSync(componentsPath, 'utf8')
    const lines = css.split('\n').filter(line => line.includes('!important'))
    const nonLeaflet = lines.filter(l => !l.includes('leaflet') && !l.includes('-webkit-'))
    expect(nonLeaflet.length).toBe(0)
  })
  
  it('should not have .dark class references in CSS', () => {
    const lightPath = path.resolve(__dirname, '../styles/05-light.css')
    const css = fs.readFileSync(lightPath, 'utf8')
    expect(css).not.toContain('.dark')
  })
})
