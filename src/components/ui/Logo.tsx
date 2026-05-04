interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  accentColor?: string
  textColor?: string
}

const sizes = {
  sm: { box: 24, dot: 7, badge: 5, font: '0.75rem', radius: 7 },
  md: { box: 36, dot: 10, badge: 7, font: '1rem', radius: 10 },
  lg: { box: 56, dot: 16, badge: 10, font: '1.4rem', radius: 16 },
}

export function Logo({ size = 'md', accentColor = '#34d399', textColor = '#fafafa' }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{
          width: s.box,
          height: s.box,
          background: `${accentColor}26`,
          border: `2px solid ${accentColor}`,
          borderRadius: s.radius,
        }}
      >
        <div style={{ width: s.dot, height: s.dot, background: accentColor, borderRadius: '50%', boxShadow: `0 0 ${s.dot}px ${accentColor}` }} />
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: s.badge, height: s.badge, background: accentColor, border: '2px solid #18181b', borderRadius: '50%' }} />
      </div>
      <div style={{ fontWeight: 700, fontSize: s.font, letterSpacing: '0.02em', color: textColor, textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
        Turbo<span style={{ color: accentColor }}>Agenda</span>
      </div>
    </div>
  )
}
