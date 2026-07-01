import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number
}

interface ParticleMapOverlayProps {
  density?: number
  color?: string
  wind?: boolean
  speed?: number
  className?: string
}

export default function ParticleMapOverlay({ density = 40, color = 'rgba(255,255,255,0.3)', wind = true, speed = 0.3, className = '' }: ParticleMapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.offsetWidth
        canvas.height = parent.offsetHeight
      }
    }

    function initParticles(w: number, h: number) {
      const p: Particle[] = []
      for (let i = 0; i < density; i++) {
        p.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: wind ? (Math.random() - 0.5) * speed : 0,
          vy: (Math.random() - 0.5) * speed * 0.3,
          size: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
          life: 0, maxLife: Math.random() * 300 + 200,
        })
      }
      particlesRef.current = p
    }

    resize()
    initParticles(canvas.width, canvas.height)
    const ro = new ResizeObserver(() => { resize(); initParticles(canvas.width, canvas.height) })
    ro.observe(canvas.parentElement || canvas)

    function animate() {
      if (!canvas || !ctx) return
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)

      for (const p of particlesRef.current) {
        p.life++
        if (p.life > p.maxLife) {
          p.x = Math.random() * w; p.y = Math.random() * h
          p.life = 0; p.maxLife = Math.random() * 300 + 200
          p.vx = wind ? (Math.random() - 0.5) * speed : 0
          p.vy = (Math.random() - 0.5) * speed * 0.3
        }
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0

        const fade = p.life < 30 ? p.life / 30 : p.life > p.maxLife - 30 ? (p.maxLife - p.life) / 30 : 1
        ctx.globalAlpha = p.alpha * fade
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [density, color, wind, speed])

  return <canvas ref={canvasRef} className={`particle-overlay ${className}`} aria-hidden="true" />
}
