'use client'

import { useMemo } from 'react'

interface ParticleConfig {
  id: number
  top: number
  left: number
  size: 'big' | 'normal' | 'small'
  duration: number
  delay: number
  anim: 0 | 1 | 2
  opacity: number
}

// Deterministic seed so SSR and client match
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export function Particles({ count = 18 }: { count?: number }) {
  const particles = useMemo<ParticleConfig[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const r1 = seededRand(i * 3)
      const r2 = seededRand(i * 3 + 1)
      const r3 = seededRand(i * 3 + 2)
      const r4 = seededRand(i * 3 + 3)
      const r5 = seededRand(i * 3 + 4)
      const sizeRoll = seededRand(i * 7)
      return {
        id: i,
        top: r1 * 100,
        left: r2 * 100,
        size: sizeRoll < 0.25 ? 'big' : sizeRoll < 0.5 ? 'small' : 'normal',
        duration: 5 + r3 * 5,
        delay: r4 * 5,
        anim: (i % 3) as 0 | 1 | 2,
        opacity: 0.4 + r5 * 0.6,
      }
    })
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <style>{`
        @keyframes _p0{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
        @keyframes _p1{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,20px)}}
        @keyframes _p2{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,25px)}}
      `}</style>
      {particles.map((p) => {
        const px = p.size === 'big' ? 6 : p.size === 'small' ? 2 : 4
        const color = p.size === 'small' ? '#6ee7b7' : '#34d399'
        const glow = p.size === 'small' ? 6 : 12
        return (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: px,
              height: px,
              background: color,
              borderRadius: '50%',
              boxShadow: `0 0 ${glow}px ${color}`,
              opacity: p.opacity,
              animation: `_p${p.anim} ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        )
      })}
    </div>
  )
}
