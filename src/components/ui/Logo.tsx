interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { box: 24, dot: 7, badge: 5, font: '0.75rem', radius: 7 },
  md: { box: 36, dot: 10, badge: 7, font: '1rem', radius: 10 },
  lg: { box: 56, dot: 16, badge: 10, font: '1.4rem', radius: 16 },
}

export function Logo({ size = 'md' }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: s.box, height: s.box, background: '#052e16', border: '2px solid #34d399', borderRadius: s.radius }}
      >
        <div style={{ width: s.dot, height: s.dot, background: '#34d399', borderRadius: '50%', boxShadow: `0 0 ${s.dot}px #34d399` }} />
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: s.badge, height: s.badge, background: '#6ee7b7', border: '2px solid #18181b', borderRadius: '50%' }} />
      </div>
      <div style={{ fontWeight: 700, fontSize: s.font, letterSpacing: '0.02em', color: '#fafafa', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
        Turbo<span style={{ color: '#34d399' }}>Agenda</span>
      </div>
    </div>
  )
}
