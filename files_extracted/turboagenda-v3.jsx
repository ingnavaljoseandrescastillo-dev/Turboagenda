import React, { useState, useMemo, createContext, useContext } from 'react';
import { Calendar, Clock, DollarSign, Users, Settings, Plus, Trash2, Edit, Check, X, TrendingUp, TrendingDown, CreditCard, Building2, Globe, Shield, BarChart3, Mail, MessageSquare, Filter, ChevronRight, Star, ArrowRight, ArrowUpRight, Sparkles, CheckCircle2, Bell, User, Phone, MapPin, ExternalLink, Copy, Link as LinkIcon, ChevronDown, Image as ImageIcon, Coffee, Scissors, Heart, Activity, GraduationCap, PawPrint, Briefcase, Camera, Lock, Crown, Send, Upload, MoreHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// ============== TRADUCCIONES ==============
const translations = {
  pt: {
    features: 'Funcionalidades', pricing: 'Preços', contact: 'Contacto',
    login: 'Iniciar sessão', tryFree: 'Experimentar grátis',
    heroBadge: '30 dias grátis · Sem cartão de crédito',
    heroTitle1: 'Agenda inteligente para', heroTitle2: 'o teu negócio.',
    heroDesc: 'Gere marcações, clientes e finanças num só lugar. Os teus clientes marcam online, tu focas-te no que importa.',
    startFree: 'Começar grátis', seeDemo: 'Ver demonstração',
    activeBusinesses: 'Negócios ativos', satisfaction: 'Satisfação', monthlyAppts: 'Marcações / mês',
    featuresLabel: 'Funcionalidades', featuresTitle: 'Tudo o que precisas.',
    pricingLabel: 'Preços', pricingTitle: 'Começa com 30 dias grátis.',
    pricingSubtitle: 'Sem cartão. Cancela quando quiseres.',
    monthly: 'Mensal', yearly: 'Anual', save2months: '-2 meses grátis',
    basic: 'Básico', plus: 'Plus', pro: 'PRO', perMonth: '/mês',
    mostPopular: 'MAIS POPULAR', comingSoon: 'EM BREVE',
    adminMaster: 'ADMIN MASTER',
    summary: 'Resumo', businesses: 'Negócios', subscriptions: 'Subscrições',
    users: 'Utilizadores', communication: 'Comunicação', config: 'Configuração',
    masterPanel: 'Painel master', masterDesc: 'Vista geral da plataforma',
    monthRevenue: 'Receita do mês', activeBiz: 'Negócios ativos',
    inTrial: 'Em teste', conversionRate: 'Taxa conversão',
    schedule: 'Agenda', services: 'Serviços', team: 'Equipa',
    clients: 'Clientes', finances: 'Finanças', myLink: 'Link público',
    reviews: 'Avaliações', gallery: 'Galeria', hours: 'Horários',
    settings: 'Definições',
    today: 'Terça, 28 de abril 2026',
    newAppt: 'Nova marcação',
    bookOnlineWith: 'Marca online com',
  },
  es: {
    features: 'Funcionalidades', pricing: 'Precios', contact: 'Contacto',
    login: 'Iniciar sesión', tryFree: 'Probar gratis',
    heroBadge: '30 días gratis · Sin tarjeta de crédito',
    heroTitle1: 'Agenda inteligente para', heroTitle2: 'tu negocio.',
    heroDesc: 'Gestiona citas, clientes y finanzas desde un solo lugar. Tus clientes reservan online, tú te enfocas en lo importante.',
    startFree: 'Empezar gratis', seeDemo: 'Ver demostración',
    activeBusinesses: 'Negocios activos', satisfaction: 'Satisfacción', monthlyAppts: 'Citas / mes',
    featuresLabel: 'Funcionalidades', featuresTitle: 'Todo lo que necesitas.',
    pricingLabel: 'Precios', pricingTitle: 'Empieza con 30 días gratis.',
    pricingSubtitle: 'Sin tarjeta. Cancela cuando quieras.',
    monthly: 'Mensual', yearly: 'Anual', save2months: '-2 meses gratis',
    basic: 'Básico', plus: 'Plus', pro: 'PRO', perMonth: '/mes',
    mostPopular: 'MÁS POPULAR', comingSoon: 'PRÓXIMAMENTE',
    adminMaster: 'ADMIN MAESTRO',
    summary: 'Resumen', businesses: 'Negocios', subscriptions: 'Suscripciones',
    users: 'Usuarios', communication: 'Comunicación', config: 'Configuración',
    masterPanel: 'Panel maestro', masterDesc: 'Vista general de la plataforma',
    monthRevenue: 'Ingresos del mes', activeBiz: 'Negocios activos',
    inTrial: 'En prueba', conversionRate: 'Tasa conversión',
    schedule: 'Agenda', services: 'Servicios', team: 'Equipo',
    clients: 'Clientes', finances: 'Finanzas', myLink: 'Link público',
    reviews: 'Reseñas', gallery: 'Galería', hours: 'Horarios',
    settings: 'Configuración',
    today: 'Martes, 28 de abril 2026',
    newAppt: 'Nueva cita',
    bookOnlineWith: 'Reserva online con',
  },
  en: {
    features: 'Features', pricing: 'Pricing', contact: 'Contact',
    login: 'Sign in', tryFree: 'Try for free',
    heroBadge: '30 days free · No credit card',
    heroTitle1: 'Smart scheduling for', heroTitle2: 'your business.',
    heroDesc: 'Manage appointments, clients and finances in one place. Your clients book online, you focus on what matters.',
    startFree: 'Start free', seeDemo: 'See demo',
    activeBusinesses: 'Active businesses', satisfaction: 'Satisfaction', monthlyAppts: 'Bookings / month',
    featuresLabel: 'Features', featuresTitle: 'Everything you need.',
    pricingLabel: 'Pricing', pricingTitle: 'Start with 30 days free.',
    pricingSubtitle: 'No credit card. Cancel anytime.',
    monthly: 'Monthly', yearly: 'Yearly', save2months: '-2 months free',
    basic: 'Basic', plus: 'Plus', pro: 'PRO', perMonth: '/month',
    mostPopular: 'MOST POPULAR', comingSoon: 'COMING SOON',
    adminMaster: 'MASTER ADMIN',
    summary: 'Overview', businesses: 'Businesses', subscriptions: 'Subscriptions',
    users: 'Users', communication: 'Comms', config: 'Settings',
    masterPanel: 'Master panel', masterDesc: 'Platform overview',
    monthRevenue: 'Monthly revenue', activeBiz: 'Active businesses',
    inTrial: 'In trial', conversionRate: 'Conversion',
    schedule: 'Schedule', services: 'Services', team: 'Team',
    clients: 'Clients', finances: 'Finances', myLink: 'Public link',
    reviews: 'Reviews', gallery: 'Gallery', hours: 'Hours',
    settings: 'Settings',
    today: 'Tuesday, April 28 2026',
    newAppt: 'New booking',
    bookOnlineWith: 'Book online with',
  }
};

const LangContext = createContext({ lang: 'pt', setLang: () => {}, t: translations.pt });

// ============== LOGO ==============
function Logo({ size = 'md' }) {
  const sizes = {
    sm: { box: 24, dot: 7, badge: 5, font: '0.75rem', radius: 7 },
    md: { box: 36, dot: 10, badge: 7, font: '1rem', radius: 10 },
    lg: { box: 56, dot: 16, badge: 10, font: '1.4rem', radius: 16 },
  };
  const s = sizes[size];
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: s.box, height: s.box, background: '#052e16', border: '2px solid #34d399', borderRadius: s.radius }}>
        <div style={{ width: s.dot, height: s.dot, background: '#34d399', borderRadius: '50%', boxShadow: `0 0 ${s.dot}px #34d399` }}></div>
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: s.badge, height: s.badge, background: '#6ee7b7', border: '2px solid #18181b', borderRadius: '50%' }}></div>
      </div>
      <div style={{ fontWeight: 700, fontSize: s.font, letterSpacing: '0.02em', color: '#fafafa', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
        Turbo<span style={{ color: '#34d399' }}>Agenda</span>
      </div>
    </div>
  );
}

// ============== PARTÍCULAS ==============
function Particles() {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 18; i++) {
      arr.push({
        id: i, top: Math.random() * 100, left: Math.random() * 100,
        size: Math.random() < 0.3 ? 'big' : Math.random() < 0.5 ? 'small' : 'normal',
        duration: 5 + Math.random() * 5, delay: Math.random() * 5, animType: i % 3,
      });
    }
    return arr;
  }, []);

  return (
    <>
      <style>{`
        @keyframes pfloat0 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px, -30px); } }
        @keyframes pfloat1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-25px, 20px); } }
        @keyframes pfloat2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(15px, 25px); } }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
        {particles.map(p => {
          const size = p.size === 'big' ? 6 : p.size === 'small' ? 2 : 4;
          const opacity = p.size === 'small' ? 0.4 : p.size === 'big' ? 0.9 : 0.7;
          const color = p.size === 'small' ? '#6ee7b7' : '#34d399';
          return (
            <div key={p.id} style={{
              position: 'absolute', top: `${p.top}%`, left: `${p.left}%`,
              width: size, height: size, background: color, borderRadius: '50%',
              boxShadow: `0 0 ${size * 2}px ${color}`, opacity,
              animation: `pfloat${p.animType} ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }} />
          );
        })}
      </div>
    </>
  );
}

// ============== LANG SWITCHER ==============
function LangSwitcher() {
  const { lang, setLang } = useContext(LangContext);
  const [open, setOpen] = useState(false);
  const langs = [{ code: 'pt', label: '🇵🇹 PT' }, { code: 'es', label: '🇪🇸 ES' }, { code: 'en', label: '🇬🇧 EN' }];
  const current = langs.find(l => l.code === lang);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 transition">
        {current.label}<ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl z-50 min-w-[100px]">
          {langs.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition ${lang === l.code ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-300'}`}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== MAIN ==============
export default function TurboAgenda() {
  const [view, setView] = useState('landing');
  const [lang, setLang] = useState('pt');
  const t = translations[lang];

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Outfit', -apple-system, sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:wght@600;700;800&display=swap" rel="stylesheet" />

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-full px-2 py-2 flex gap-1 shadow-2xl">
          {[{ k: 'landing', l: '🌐' }, { k: 'admin', l: '👑' }, { k: 'business', l: '🏢' }, { k: 'public', l: '📅' }].map(b => (
            <button key={b.k} onClick={() => setView(b.k)} className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${view === b.k ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>
              {b.l}
            </button>
          ))}
        </div>

        {view === 'landing' && <Landing />}
        {view === 'admin' && <AdminPanel />}
        {view === 'business' && <BusinessDashboard />}
        {view === 'public' && <PublicBooking />}
      </div>
    </LangContext.Provider>
  );
}

// ============== LANDING ==============
function Landing() {
  const { t } = useContext(LangContext);
  const [billing, setBilling] = useState('monthly');

  const businessTypes = [
    { icon: Scissors, label: 'Barbearia', es: 'Barbería', en: 'Barbershop' },
    { icon: Heart, label: 'Spa & Estética', es: 'Spa & Estética', en: 'Spa & Beauty' },
    { icon: Activity, label: 'Saúde & Clínicas', es: 'Salud & Clínicas', en: 'Health & Clinics' },
    { icon: Briefcase, label: 'Coaching & Fitness', es: 'Coaching & Fitness', en: 'Coaching & Fitness' },
    { icon: GraduationCap, label: 'Aulas & Tutorias', es: 'Clases & Tutorías', en: 'Classes & Tutoring' },
    { icon: PawPrint, label: 'Veterinárias', es: 'Veterinarias', en: 'Pet Services' },
  ];

  const yearlyDiscount = 0.833; // 10/12 = -2 months

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-[100px]"></div>
      <Particles />

      <div className="relative" style={{ zIndex: 2 }}>
        <nav className="px-5 py-5 flex items-center justify-between max-w-7xl mx-auto">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
            <a className="hover:text-white transition cursor-pointer">{t.features}</a>
            <a className="hover:text-white transition cursor-pointer">{t.pricing}</a>
            <a className="hover:text-white transition cursor-pointer">{t.contact}</a>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <button className="bg-emerald-500 text-zinc-950 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-400 transition">{t.tryFree}</button>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-5 pt-12 pb-20 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.heroBadge}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-5 leading-[1.05]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {t.heroTitle1}<br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 bg-clip-text text-transparent">{t.heroTitle2}</span>
          </h1>
          <p className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">{t.heroDesc}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="group bg-emerald-500 text-zinc-950 px-7 py-3.5 rounded-xl font-semibold hover:bg-emerald-400 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              {t.startFree}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
            <button className="text-zinc-300 hover:text-white px-7 py-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition">{t.seeDemo}</button>
          </div>
        </section>

        {/* Tipos de negocio */}
        <section className="px-5 pb-16 max-w-5xl mx-auto">
          <p className="text-center text-xs text-zinc-500 uppercase tracking-[0.2em] mb-6">— Para todo tipo de negócios —</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {businessTypes.map((bt, i) => (
              <div key={i} className="p-4 bg-zinc-900/40 backdrop-blur border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition text-center">
                <bt.icon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-[10px] sm:text-xs text-zinc-300 font-medium">{bt.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-16 max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-medium text-emerald-400 mb-3 tracking-[0.2em] uppercase">— {t.featuresLabel}</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{t.featuresTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Calendar, title: 'Agenda 24/7', desc: 'Os teus clientes marcam quando quiserem.' },
              { icon: MessageSquare, title: 'WhatsApp + Email', desc: 'Lembretes automáticos via API oficial.' },
              { icon: Users, title: 'Multi-equipa', desc: 'Até 5 profissionais com agendas separadas.' },
              { icon: Star, title: 'Avaliações', desc: 'Recolhe reseñas automaticamente após cada marcação.' },
              { icon: ImageIcon, title: 'Galeria de fotos', desc: 'Mostra o teu espaço e trabalhos.' },
              { icon: BarChart3, title: 'Finanças', desc: 'Receitas, despesas e relatórios.' },
            ].map((f, i) => (
              <div key={i} className="group p-6 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-2xl hover:border-emerald-500/40 transition-all">
                <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="px-5 py-16 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-medium text-emerald-400 mb-3 tracking-[0.2em] uppercase">— {t.pricingLabel}</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{t.pricingTitle}</h2>
            <p className="text-zinc-400 text-sm">{t.pricingSubtitle}</p>
          </div>

          {/* Toggle anual/mensual */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button onClick={() => setBilling('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billing === 'monthly' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
              {t.monthly}
            </button>
            <button onClick={() => setBilling('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${billing === 'yearly' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
              {t.yearly}
              <span className="text-[10px] bg-emerald-500 text-zinc-950 px-1.5 py-0.5 rounded font-bold">{t.save2months}</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* BÁSICO */}
            <div className="p-7 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-2xl">
              <div className="text-sm font-medium text-zinc-400 mb-2">{t.basic}</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {billing === 'monthly' ? '20,99€' : `${(20.99 * yearlyDiscount).toFixed(2).replace('.', ',')}€`}
                </span>
                <span className="text-zinc-500 text-xs">{t.perMonth}</span>
              </div>
              {billing === 'yearly' && <div className="text-[10px] text-emerald-400 mb-5">≈ 209,90€/ano</div>}
              {billing === 'monthly' && <div className="h-4 mb-5"></div>}
              <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold mb-6 transition text-sm">{t.startFree}</button>
              <ul className="space-y-2.5 text-xs">
                {['1 colaborador', 'Agenda online ilimitada', 'Lembretes por email', 'Galeria 5 fotos', 'Avaliações', 'Suporte por email'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* PLUS */}
            <div className="relative p-7 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-2 border-emerald-500/40 rounded-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">{t.mostPopular}</div>
              <div className="text-sm font-medium text-emerald-400 mb-2">{t.plus}</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {billing === 'monthly' ? '25,99€' : `${(25.99 * yearlyDiscount).toFixed(2).replace('.', ',')}€`}
                </span>
                <span className="text-zinc-500 text-xs">{t.perMonth}</span>
              </div>
              {billing === 'yearly' && <div className="text-[10px] text-emerald-400 mb-5">≈ 259,90€/ano</div>}
              {billing === 'monthly' && <div className="h-4 mb-5"></div>}
              <button className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold mb-6 transition text-sm">{t.startFree}</button>
              <ul className="space-y-2.5 text-xs">
                {['Até 5 colaboradores', 'Serviços ilimitados', 'WhatsApp 100 msg/mês', 'Galeria 20 fotos', 'Relatórios avançados', 'Suporte prioritário'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-200">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* PRO */}
            <div className="relative p-7 bg-zinc-900/30 backdrop-blur border border-zinc-800 rounded-2xl opacity-90">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-700 text-zinc-300 text-[10px] font-bold px-3 py-1 rounded-full tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3" />{t.comingSoon}
              </div>
              <div className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1.5">
                {t.pro}<Crown className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {billing === 'monthly' ? '39,99€' : `${(39.99 * yearlyDiscount).toFixed(2).replace('.', ',')}€`}
                </span>
                <span className="text-zinc-500 text-xs">{t.perMonth}</span>
              </div>
              {billing === 'yearly' && <div className="text-[10px] text-amber-400 mb-5">≈ 399,90€/ano</div>}
              {billing === 'monthly' && <div className="h-4 mb-5"></div>}
              <button disabled className="w-full py-2.5 bg-zinc-800 text-zinc-500 rounded-xl font-semibold mb-6 cursor-not-allowed text-sm flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" />Em breve
              </button>
              <ul className="space-y-2.5 text-xs">
                {['Colaboradores ilimitados', 'WhatsApp ilimitado', 'Chat 2-way WhatsApp', 'Galeria ilimitada', 'API + integrações', 'Suporte dedicado'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="border-t border-zinc-900 py-8 px-5 mt-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="ml-2 text-xs">© 2026 · turboagenda.pt</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ============== ADMIN ==============
function AdminPanel() {
  const { t } = useContext(LangContext);

  const businesses = [
    { name: 'Barbearia El Capitán', plan: 'Plus', status: 'active', revenue: 25.99, citas: 142, since: '15/08/25', type: 'barber' },
    { name: 'Clínica Sorriso', plan: 'Plus', status: 'active', revenue: 25.99, citas: 89, since: '02/09/25', type: 'health' },
    { name: 'Studio Yoga Aura', plan: 'Básico', status: 'trial', revenue: 0, citas: 23, since: '08/04/26', type: 'fitness' },
    { name: 'Cabeleireiro Glamour', plan: 'Básico', status: 'active', revenue: 20.99, citas: 67, since: '21/11/25', type: 'beauty' },
    { name: 'Spa Renascer', plan: 'Plus', status: 'active', revenue: 25.99, citas: 124, since: '10/07/25', type: 'beauty' },
  ];

  const monthlyData = [
    { mes: 'Nov', ingresos: 1250 }, { mes: 'Dez', ingresos: 1680 },
    { mes: 'Jan', ingresos: 2100 }, { mes: 'Fev', ingresos: 2540 },
    { mes: 'Mar', ingresos: 3120 }, { mes: 'Abr', ingresos: 3890 },
  ];

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
        <div className="mb-7 px-1">
          <Logo size="md" />
          <div className="text-[10px] text-emerald-400 font-bold tracking-[0.2em] mt-2">{t.adminMaster}</div>
        </div>

        <nav className="space-y-0.5 flex-1">
          {[
            { icon: BarChart3, label: t.summary, active: true },
            { icon: Building2, label: t.businesses },
            { icon: CreditCard, label: t.subscriptions },
            { icon: MessageSquare, label: 'WhatsApp API' },
            { icon: Mail, label: t.communication },
            { icon: Settings, label: t.config },
          ].map(item => (
            <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${item.active ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950 font-bold text-sm">A</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Owner</div>
              <div className="text-xs text-zinc-500 truncate">admin@turboagenda.pt</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <header className="border-b border-zinc-900 px-7 py-4 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-10">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{t.masterPanel}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{t.masterDesc}</p>
          </div>
          <div className="flex gap-2 items-center">
            <LangSwitcher />
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition"><Bell className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t.monthRevenue, value: '3.890€', change: '+24,7%', icon: DollarSign },
              { label: t.activeBiz, value: '127', change: '+19', icon: Building2 },
              { label: t.inTrial, value: '34', change: '+8', icon: Sparkles },
              { label: 'WhatsApp env.', value: '4.892', change: '+18%', icon: MessageSquare },
            ].map((kpi, i) => (
              <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <kpi.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />{kpi.change}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{kpi.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <h3 className="font-semibold mb-4 text-sm">Receita mensal</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="mes" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
                <Area type="monotone" dataKey="ingresos" stroke="#34d399" strokeWidth={2.5} fill="url(#colorIng)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-zinc-800">
              <div>
                <h3 className="font-semibold text-sm">{t.businesses}</h3>
              </div>
              <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 font-semibold">
                <Plus className="w-3 h-3" />Novo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Negócio</th>
                    <th className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium">Plano</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-left px-4 py-3 font-medium">€/mês</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b, i) => (
                    <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-emerald-400 font-bold">{b.name.charAt(0)}</div>
                          <div>
                            <div className="font-medium text-sm">{b.name}</div>
                            <div className="text-xs text-zinc-500">Desde {b.since}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-400 capitalize">{b.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${b.plan === 'Plus' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{b.plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs ${b.status === 'active' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'active' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                          {b.status === 'active' ? 'Ativo' : 'Teste'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{b.revenue > 0 ? `${b.revenue}€` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============== BUSINESS DASHBOARD ==============
function BusinessDashboard() {
  const { t } = useContext(LangContext);
  const [tab, setTab] = useState('agenda');

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
        <div className="mb-5 px-1"><Logo size="md" /></div>

        <div className="bg-zinc-800/50 rounded-xl p-3 mb-5">
          <div className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Negócio</div>
          <div className="font-semibold text-sm">Barbearia El Capitán</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-emerald-400 font-medium">Plano Plus</span>
          </div>
        </div>

        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {[
            { icon: Calendar, label: t.schedule, key: 'agenda' },
            { icon: Clock, label: t.hours, key: 'hours' },
            { icon: Users, label: t.team, key: 'team' },
            { icon: Settings, label: t.services, key: 'services' },
            { icon: ImageIcon, label: t.gallery, key: 'gallery' },
            { icon: Star, label: t.reviews, key: 'reviews' },
            { icon: MessageSquare, label: 'WhatsApp', key: 'whatsapp' },
            { icon: DollarSign, label: t.finances, key: 'finance' },
            { icon: LinkIcon, label: t.myLink, key: 'link' },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${tab === item.key ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-10">
          <div>
            <h1 className="text-xl font-bold capitalize" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {tab === 'agenda' && 'Agenda'}
              {tab === 'hours' && 'Horários e bloqueios'}
              {tab === 'team' && 'A minha equipa'}
              {tab === 'services' && 'Serviços'}
              {tab === 'gallery' && 'Galeria'}
              {tab === 'reviews' && 'Avaliações'}
              {tab === 'whatsapp' && 'WhatsApp Business'}
              {tab === 'finance' && 'Finanças'}
              {tab === 'link' && 'Link público'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">{t.today}</p>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher />
          </div>
        </header>

        <div className="p-6">
          {tab === 'agenda' && <AgendaView />}
          {tab === 'hours' && <HoursView />}
          {tab === 'team' && <TeamView />}
          {tab === 'gallery' && <GalleryView />}
          {tab === 'reviews' && <ReviewsView />}
          {tab === 'whatsapp' && <WhatsAppView />}
          {tab === 'services' && <ServicesView />}
          {tab === 'finance' && <FinanceView />}
          {tab === 'link' && <LinkView />}
        </div>
      </main>
    </div>
  );
}

// ============== VISTAS ==============

function AgendaView() {
  const employees = [
    { id: 'all', name: 'Toda a equipa', color: '#34d399' },
    { id: 'manuel', name: 'Manuel S.', color: '#34d399' },
    { id: 'pedro', name: 'Pedro M.', color: '#60a5fa' },
    { id: 'ana', name: 'Ana L.', color: '#f59e0b' },
  ];
  const [selectedEmp, setSelectedEmp] = useState('all');

  const appointments = [
    { client: 'Ricardo Almeida', service: 'Corte + barba', time: '09:00', status: 'pending', emp: 'Manuel S.', empColor: '#34d399' },
    { client: 'Ana Sousa', service: 'Tratamento capilar', time: '10:30', status: 'pending', emp: 'Ana L.', empColor: '#f59e0b' },
    { client: 'João Silva', service: 'Corte clássico', time: '12:00', status: 'completed', emp: 'Pedro M.', empColor: '#60a5fa' },
    { client: 'Pedro Costa', service: 'Só barba', time: '14:30', status: 'pending', emp: 'Manuel S.', empColor: '#34d399' },
    { client: 'Miguel Pereira', service: 'Corte + barba', time: '16:00', status: 'cancelled', emp: 'Pedro M.', empColor: '#60a5fa' },
  ];

  const filtered = selectedEmp === 'all' ? appointments : appointments.filter(a => {
    const empMap = { manuel: 'Manuel S.', pedro: 'Pedro M.', ana: 'Ana L.' };
    return a.emp === empMap[selectedEmp];
  });

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Marcações hoje', value: '5', icon: Calendar },
          { label: 'Pendentes', value: '3', icon: Clock },
          { label: 'Concluídas', value: '1', icon: CheckCircle2 },
          { label: 'Receita hoje', value: '18€', icon: DollarSign },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-500">{s.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtro empleados */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {employees.map(e => (
          <button key={e.id} onClick={() => setSelectedEmp(e.id)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-2 ${selectedEmp === e.id ? 'bg-zinc-800 text-white' : 'bg-zinc-900/50 text-zinc-400 hover:text-white'}`}>
            {e.id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ background: e.color }}></span>}
            {e.name}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="divide-y divide-zinc-800">
          {filtered.map((a, i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition">
              <div className="text-center min-w-[55px]">
                <div className="text-lg font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{a.time}</div>
              </div>
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-emerald-400 font-bold flex-shrink-0">
                {a.client.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{a.client}</div>
                <div className="text-xs text-zinc-400 truncate">{a.service}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.empColor }}></span>
                  <span className="text-[10px] text-zinc-500">{a.emp}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {a.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
                      <Check className="w-3 h-3" />
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {a.status === 'completed' && (
                  <span className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">✓ OK</span>
                )}
                {a.status === 'cancelled' && (
                  <span className="px-2.5 py-1.5 bg-zinc-800 text-zinc-500 rounded-lg text-xs font-semibold">Cancelada</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HoursView() {
  const days = [
    { name: 'Segunda', open: '09:00', close: '19:00', active: true },
    { name: 'Terça', open: '09:00', close: '19:00', active: true },
    { name: 'Quarta', open: '09:00', close: '19:00', active: true },
    { name: 'Quinta', open: '09:00', close: '20:00', active: true },
    { name: 'Sexta', open: '09:00', close: '20:00', active: true },
    { name: 'Sábado', open: '10:00', close: '18:00', active: true },
    { name: 'Domingo', open: '—', close: '—', active: false },
  ];

  const blocks = [
    { type: 'lunch', label: 'Almoço diário', time: '13:00 — 14:00', recurrent: true },
    { type: 'vacation', label: 'Férias de verão', time: '01 Ago — 15 Ago 2026', recurrent: false },
    { type: 'holiday', label: 'Feriado nacional', time: '01 Mai 2026', recurrent: false },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Horário semanal */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Horário semanal</h3>
          <button className="text-xs text-emerald-400">Editar</button>
        </div>
        <div className="space-y-2">
          {days.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-zinc-950/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${d.active ? 'bg-emerald-400' : 'bg-zinc-700'}`}></div>
                <span className="text-sm font-medium w-20">{d.name}</span>
              </div>
              <div className="text-sm text-zinc-400">
                {d.active ? `${d.open} — ${d.close}` : <span className="text-zinc-600">Fechado</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloqueos */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
          <div>
            <h3 className="font-semibold text-sm">Bloqueios e férias</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Períodos em que não aceitas marcações</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 font-semibold">
            <Plus className="w-3 h-3" />Adicionar
          </button>
        </div>
        <div className="divide-y divide-zinc-800">
          {blocks.map((b, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                b.type === 'lunch' ? 'bg-amber-500/10 text-amber-400' :
                b.type === 'vacation' ? 'bg-blue-500/10 text-blue-400' :
                'bg-purple-500/10 text-purple-400'
              }`}>
                {b.type === 'lunch' ? <Coffee className="w-4 h-4" /> :
                 b.type === 'vacation' ? <Sparkles className="w-4 h-4" /> :
                 <Calendar className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{b.label}</div>
                <div className="text-xs text-zinc-500">{b.time}{b.recurrent && ' · recorrente'}</div>
              </div>
              <button className="text-zinc-500 hover:text-white p-1"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamView() {
  const team = [
    { name: 'Manuel S.', role: 'Owner', services: 4, appts: 142, rating: 4.9, color: '#34d399', avatar: 'M' },
    { name: 'Pedro M.', role: 'Barbeiro', services: 3, appts: 89, rating: 4.8, color: '#60a5fa', avatar: 'P' },
    { name: 'Ana L.', role: 'Cabeleireira', services: 2, appts: 67, rating: 5.0, color: '#f59e0b', avatar: 'A' },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Plano Plus: até 5 colaboradores</div>
          <div className="text-xs text-zinc-400">3 de 5 utilizados — podes adicionar mais 2</div>
        </div>
        <button className="flex items-center gap-1.5 bg-emerald-500 text-zinc-950 px-3 py-2 rounded-lg font-semibold text-xs flex-shrink-0">
          <Plus className="w-3.5 h-3.5" />Adicionar
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {team.map((m, i) => (
          <div key={i} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: m.color + '30', color: m.color }}>
                {m.avatar}
              </div>
              <button className="text-zinc-500 hover:text-white p-1"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="font-semibold mb-0.5">{m.name}</div>
            <div className="text-xs text-zinc-500 mb-4">{m.role}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-base font-bold">{m.services}</div>
                <div className="text-[10px] text-zinc-500">Serviços</div>
              </div>
              <div>
                <div className="text-base font-bold">{m.appts}</div>
                <div className="text-[10px] text-zinc-500">Marcações</div>
              </div>
              <div>
                <div className="text-base font-bold flex items-center justify-center gap-0.5">
                  {m.rating}<Star className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                </div>
                <div className="text-[10px] text-zinc-500">Rating</div>
              </div>
            </div>
            <button className="w-full mt-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition">Ver agenda</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryView() {
  const photos = [
    { url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400', cap: 'Espaço principal' },
    { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400', cap: 'Cadeira clássica' },
    { url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400', cap: 'Trabalho realizado' },
    { url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400', cap: 'Detalhe do corte' },
    { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400', cap: 'Bancada de trabalho' },
    { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400', cap: 'Antes e depois' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <ImageIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Plano Plus: 20 fotos disponíveis</div>
          <div className="text-xs text-zinc-400">{photos.length} de 20 utilizadas</div>
        </div>
        <button className="flex items-center gap-1.5 bg-emerald-500 text-zinc-950 px-3 py-2 rounded-lg font-semibold text-xs flex-shrink-0">
          <Upload className="w-3.5 h-3.5" />Carregar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            <img src={p.url} alt={p.cap} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-3">
              <div className="flex justify-end">
                <button className="bg-red-500/90 text-white p-1.5 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-white font-medium">{p.cap}</div>
            </div>
          </div>
        ))}
        <button className="aspect-square border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-emerald-400 transition">
          <Plus className="w-6 h-6" />
          <span className="text-xs font-medium">Adicionar foto</span>
        </button>
      </div>
    </div>
  );
}

function ReviewsView() {
  const reviews = [
    { client: 'João Silva', rating: 5, text: 'Excelente serviço! O Manuel é um profissional de topo, recomendo a todos.', date: 'Há 2 dias', service: 'Corte + barba' },
    { client: 'Maria Costa', rating: 5, text: 'Ambiente muito acolhedor, voltarei sem dúvida. Atendimento 5 estrelas.', date: 'Há 5 dias', service: 'Corte clássico' },
    { client: 'André Pinto', rating: 4, text: 'Bom serviço, gostei do resultado. Talvez um pouco de espera.', date: 'Há 1 semana', service: 'Só barba' },
    { client: 'Sofia Martins', rating: 5, text: 'Ana é incrível! Tratamento capilar fez maravilhas no meu cabelo.', date: 'Há 1 semana', service: 'Tratamento capilar' },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl">
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Média</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>4,9</span>
            <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </div>
          <div className="text-xs text-zinc-500 mt-1">218 avaliações</div>
        </div>
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Este mês</div>
          <div className="text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>+12</div>
          <div className="text-xs text-emerald-400 mt-1">+33% vs anterior</div>
        </div>
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Resposta</div>
          <div className="text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>87%</div>
          <div className="text-xs text-zinc-500 mt-1">Taxa avaliação</div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Últimas avaliações</h3>
          <button className="text-xs text-emerald-400 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />Ver públicas
          </button>
        </div>
        <div className="divide-y divide-zinc-800">
          {reviews.map((r, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                  {r.client.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{r.client}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'text-emerald-400 fill-emerald-400' : 'text-zinc-700'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 mb-2 leading-relaxed">{r.text}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{r.service}</span>·<span>{r.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppView() {
  const messages = [
    { type: 'sent', client: 'Ricardo Almeida', msg: 'Olá Ricardo! 👋 A confirmar a tua marcação amanhã às 09:00.', time: '14:32', status: 'delivered' },
    { type: 'sent', client: 'Ana Sousa', msg: 'Olá Ana! Lembrete: Tratamento capilar amanhã às 10:30.', time: '14:30', status: 'read' },
    { type: 'sent', client: 'João Silva', msg: 'Obrigado pela tua visita! Como classificas o serviço? ⭐', time: 'Ontem 18:15', status: 'read' },
    { type: 'failed', client: 'Pedro Costa', msg: 'Lembrete: marcação amanhã às 14:30.', time: 'Ontem 16:00', status: 'failed' },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Quota WhatsApp */}
      <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">WhatsApp Business API</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">PLANO PLUS</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>47</span>
          <span className="text-zinc-500 text-sm">/ 100 mensagens este mês</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: '47%' }}></div>
        </div>
        <p className="text-xs text-zinc-400">Renova-se em 13 dias · <span className="text-amber-400 cursor-pointer hover:underline">Atualizar para PRO (ilimitado)</span></p>
      </div>

      {/* Plantillas automáticas */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-sm">Lembretes automáticos</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Mensagens enviadas automaticamente</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {[
            { name: 'Confirmação de marcação', when: 'Após reservar', active: true },
            { name: 'Lembrete 24h antes', when: 'Dia anterior às 18:00', active: true },
            { name: 'Lembrete 1h antes', when: '1 hora antes da marcação', active: true },
            { name: 'Pedido de avaliação', when: '2h após a marcação', active: false },
          ].map((p, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-zinc-500">{p.when}</div>
              </div>
              <div className={`w-9 h-5 rounded-full relative cursor-pointer ${p.active ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${p.active ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Histórico de mensagens</h3>
          <button className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
            <Filter className="w-3 h-3" />Filtrar
          </button>
        </div>
        <div className="divide-y divide-zinc-800">
          {messages.map((m, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                m.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                <Send className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{m.client}</span>
                  <span className="text-[10px] text-zinc-500">{m.time}</span>
                </div>
                <p className="text-xs text-zinc-400 mb-1.5">{m.msg}</p>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  m.status === 'read' ? 'text-emerald-400' :
                  m.status === 'delivered' ? 'text-blue-400' :
                  'text-red-400'
                }`}>
                  {m.status === 'read' ? '✓✓ Lida' : m.status === 'delivered' ? '✓ Entregue' : '✗ Falhou'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesView() {
  const services = [
    { name: 'Corte clássico', duration: 30, price: 18 },
    { name: 'Corte + barba', duration: 45, price: 28 },
    { name: 'Só barba', duration: 20, price: 12 },
    { name: 'Tratamento capilar', duration: 60, price: 35 },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Plano Plus: serviços ilimitados</div>
          <div className="text-xs text-zinc-400">{services.length} configurados</div>
        </div>
        <button className="flex items-center gap-1.5 bg-emerald-500 text-zinc-950 px-3 py-2 rounded-lg font-semibold text-xs flex-shrink-0">
          <Plus className="w-3.5 h-3.5" />Adicionar
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {services.map((s, i) => (
          <div key={i} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold mb-1 text-sm">{s.name}</h4>
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration} min</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{s.price}€</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400"><Edit className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 hover:bg-zinc-800 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceView() {
  const finances = [
    { mes: 'Nov', ingresos: 2840, gastos: 950 }, { mes: 'Dez', ingresos: 3210, gastos: 1100 },
    { mes: 'Jan', ingresos: 2980, gastos: 890 }, { mes: 'Fev', ingresos: 3450, gastos: 1020 },
    { mes: 'Mar', ingresos: 3890, gastos: 1180 }, { mes: 'Abr', ingresos: 4120, gastos: 950 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-500">Receita abril</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>4.120€</div>
          <div className="text-xs text-zinc-500 mt-1">+5,9% vs março</div>
        </div>
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-zinc-500">Despesas abril</span>
          </div>
          <div className="text-3xl font-bold text-red-400" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>950€</div>
          <div className="text-xs text-zinc-500 mt-1">−19,5% vs março</div>
        </div>
        <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Saldo abril</span>
          </div>
          <div className="text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>3.170€</div>
          <div className="text-xs text-zinc-500 mt-1">Lucro líquido</div>
        </div>
      </div>

      <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-sm">Evolução últimos 6 meses</h3>
          </div>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            <Plus className="w-3 h-3" />Despesa
          </button>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={finances}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="#71717a" fontSize={11} />
            <YAxis stroke="#71717a" fontSize={11} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
            <Bar dataKey="ingresos" fill="#34d399" radius={[6, 6, 0, 0]} />
            <Bar dataKey="gastos" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LinkView() {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">A tua agenda online</h3>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 font-mono text-xs sm:text-sm overflow-x-auto whitespace-nowrap">
            turboagenda.pt/<span className="text-emerald-400">barbearia-el-capitan</span>
          </div>
          <button className="px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold flex items-center gap-1.5 text-xs flex-shrink-0">
            <Copy className="w-3.5 h-3.5" />Copiar
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {[
          { val: '847', label: 'Visitas/mês' },
          { val: '142', label: 'Reservas/mês' },
          { val: '16,8%', label: 'Conversão', highlight: true },
        ].map((s, i) => (
          <div key={i} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className={`text-2xl font-bold ${s.highlight ? 'text-emerald-400' : ''}`} style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.val}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== PUBLIC BOOKING ==============
function PublicBooking() {
  const { t } = useContext(LangContext);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [tab, setTab] = useState('book'); // book | gallery | reviews

  const services = [
    { id: 1, name: 'Corte clássico', duration: 30, price: 18, desc: 'Corte tradicional com tesoura e máquina' },
    { id: 2, name: 'Corte + barba', duration: 45, price: 28, desc: 'Serviço completo com arranjo de barba' },
    { id: 3, name: 'Só barba', duration: 20, price: 12, desc: 'Arranjo e contorno de barba' },
    { id: 4, name: 'Tratamento capilar', duration: 60, price: 35, desc: 'Hidratação profunda e massagem' },
  ];

  const employees = [
    { id: 1, name: 'Manuel S.', role: 'Owner', rating: 4.9, color: '#34d399', avatar: 'M' },
    { id: 2, name: 'Pedro M.', role: 'Barbeiro', rating: 4.8, color: '#60a5fa', avatar: 'P' },
    { id: 3, name: 'Ana L.', role: 'Cabeleireira', rating: 5.0, color: '#f59e0b', avatar: 'A' },
  ];

  const dates = [
    { day: 'Ter', num: '28', month: 'Abr', available: true },
    { day: 'Qua', num: '29', month: 'Abr', available: true },
    { day: 'Qui', num: '30', month: 'Abr', available: false },
    { day: 'Sex', num: '01', month: 'Mai', available: true },
    { day: 'Sáb', num: '02', month: 'Mai', available: true },
    { day: 'Dom', num: '03', month: 'Mai', available: false },
    { day: 'Seg', num: '04', month: 'Mai', available: true },
  ];

  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];

  const photos = [
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
  ];

  const reviews = [
    { client: 'João Silva', rating: 5, text: 'Excelente serviço! Recomendo a todos.', date: 'Há 2 dias' },
    { client: 'Maria Costa', rating: 5, text: 'Ambiente acolhedor, voltarei.', date: 'Há 5 dias' },
    { client: 'André Pinto', rating: 4, text: 'Bom serviço, gostei do resultado.', date: 'Há 1 semana' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 relative">
      <Particles />

      <div className="relative" style={{ zIndex: 2 }}>
        {/* Header */}
        <header className="bg-gradient-to-b from-zinc-900/80 to-zinc-950/40 backdrop-blur border-b border-zinc-800">
          <div className="max-w-3xl mx-auto px-5 py-6">
            <div className="flex items-center justify-between mb-5">
              <Logo size="sm" />
              <LangSwitcher />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-300 to-emerald-600 rounded-2xl flex items-center justify-center text-zinc-950 text-2xl font-black flex-shrink-0">B</div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Barbearia El Capitán</h1>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Lisboa, PT</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />4,9 (218)</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-5 bg-zinc-900/60 p-1 rounded-xl">
              {[
                { k: 'book', l: 'Marcar' },
                { k: 'gallery', l: 'Galeria' },
                { k: 'reviews', l: 'Avaliações' },
              ].map(tb => (
                <button key={tb.k} onClick={() => setTab(tb.k)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${tab === tb.k ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>
                  {tb.l}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* GALLERY TAB */}
        {tab === 'gallery' && (
          <div className="max-w-3xl mx-auto px-5 py-7 pb-24">
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Galeria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                  <img src={p} alt="" className="w-full h-full object-cover hover:scale-105 transition" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVIEWS TAB */}
        {tab === 'reviews' && (
          <div className="max-w-3xl mx-auto px-5 py-7 pb-24">
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-2xl p-5 mb-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>4,9</span>
                <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              </div>
              <div className="text-xs text-zinc-400">Baseado em 218 avaliações</div>
            </div>
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">{r.client.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{r.client}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'text-emerald-400 fill-emerald-400' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300 mb-1.5 leading-relaxed">{r.text}</p>
                      <div className="text-xs text-zinc-500">{r.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOOK TAB */}
        {tab === 'book' && (
          <>
            <div className="max-w-3xl mx-auto px-5 pt-7">
              <div className="flex items-center justify-between mb-7">
                {[1,2,3,4,5].map((n, i, arr) => (
                  <React.Fragment key={n}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition flex-shrink-0 ${step >= n ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
                      {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                    </div>
                    {i < arr.length - 1 && <div className={`flex-1 h-px mx-1.5 ${step > n ? 'bg-emerald-500' : 'bg-zinc-800'}`}></div>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-5 pb-32">
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Escolhe um serviço</h2>
                  <p className="text-sm text-zinc-500 mb-5">Seleciona o que precisas</p>
                  <div className="space-y-3">
                    {services.map(s => (
                      <button key={s.id} onClick={() => { setSelectedService(s); setStep(2); }}
                        className="w-full p-4 bg-zinc-900/60 backdrop-blur border border-zinc-800 hover:border-emerald-500/50 rounded-2xl text-left transition group flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold mb-1 text-sm">{s.name}</div>
                          <div className="text-xs text-zinc-400 mb-1.5">{s.desc}</div>
                          <span className="flex items-center gap-1 text-xs text-zinc-500"><Clock className="w-3 h-3" />{s.duration} min</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-xl font-bold text-emerald-400" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.price}€</div>
                          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <button onClick={() => setStep(1)} className="text-xs text-zinc-500 hover:text-white mb-5">← Mudar serviço</button>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Escolhe o profissional</h2>
                  <p className="text-sm text-zinc-500 mb-5">Quem queres que te atenda?</p>
                  <div className="space-y-3">
                    <button onClick={() => { setSelectedEmployee({ id: 0, name: 'Qualquer profissional' }); setStep(3); }}
                      className="w-full p-4 bg-zinc-900/60 backdrop-blur border border-zinc-800 hover:border-emerald-500/50 rounded-2xl text-left transition group flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-zinc-950 font-bold flex-shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">Qualquer profissional</div>
                        <div className="text-xs text-zinc-400">Mais flexibilidade de horário</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition" />
                    </button>
                    {employees.map(e => (
                      <button key={e.id} onClick={() => { setSelectedEmployee(e); setStep(3); }}
                        className="w-full p-4 bg-zinc-900/60 backdrop-blur border border-zinc-800 hover:border-emerald-500/50 rounded-2xl text-left transition group flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ background: e.color + '30', color: e.color }}>
                          {e.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{e.name}</div>
                          <div className="text-xs text-zinc-400 flex items-center gap-2">
                            {e.role}
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />{e.rating}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <button onClick={() => setStep(2)} className="text-xs text-zinc-500 hover:text-white mb-5">← Mudar profissional</button>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Data e hora</h2>
                  <p className="text-sm text-zinc-500 mb-5">{selectedService?.name} · {selectedEmployee?.name}</p>

                  <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Dia</h3>
                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {dates.map((d, i) => (
                      <button key={i} disabled={!d.available} onClick={() => setSelectedDate(d)}
                        className={`p-2 rounded-xl text-center border transition ${
                          !d.available ? 'border-zinc-900 text-zinc-700 cursor-not-allowed' :
                          selectedDate?.num === d.num ? 'bg-emerald-500 border-emerald-500 text-zinc-950' :
                          'border-zinc-800 hover:border-emerald-500/50 text-zinc-300'
                        }`}>
                        <div className="text-[10px] uppercase">{d.day}</div>
                        <div className="text-base font-bold mt-0.5">{d.num}</div>
                        <div className="text-[10px]">{d.month}</div>
                      </button>
                    ))}
                  </div>

                  {selectedDate && (
                    <>
                      <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Hora</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {times.map(time => (
                          <button key={time} onClick={() => setSelectedTime(time)}
                            className={`py-2.5 rounded-xl border transition font-medium text-sm ${
                              selectedTime === time ? 'bg-emerald-500 border-emerald-500 text-zinc-950' :
                              'border-zinc-800 hover:border-emerald-500/50 text-zinc-300'
                            }`}>{time}</button>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedTime && (
                    <button onClick={() => setStep(4)} className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold flex items-center justify-center gap-2">
                      Continuar <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <button onClick={() => setStep(3)} className="text-xs text-zinc-500 hover:text-white mb-5">← Mudar horário</button>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Os teus dados</h2>
                  <p className="text-sm text-zinc-500 mb-5">Para confirmar a marcação</p>

                  <div className="space-y-3 mb-5">
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-3 text-sm focus:border-emerald-500 focus:outline-none" placeholder="Nome completo" defaultValue="Carlos Rodríguez" />
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-3 text-sm focus:border-emerald-500 focus:outline-none" placeholder="email@email.pt" defaultValue="carlos@email.pt" />
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-3 text-sm focus:border-emerald-500 focus:outline-none" placeholder="+351 ..." defaultValue="+351 912 345 678" />
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-5">
                    <div className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider">Resumo</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-zinc-400">Serviço</span><span>{selectedService?.name}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-400">Profissional</span><span>{selectedEmployee?.name}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-400">Data</span><span>{selectedDate?.day} {selectedDate?.num} {selectedDate?.month}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-400">Hora</span><span>{selectedTime}</span></div>
                      <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between font-semibold">
                        <span>Total</span><span className="text-emerald-400">{selectedService?.price}€</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setStep(5)} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold flex items-center justify-center gap-2">
                    Confirmar marcação <Check className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-zinc-500 text-center mt-3 flex items-center justify-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                    Receberás lembretes por WhatsApp e email.
                  </p>
                </div>
              )}

              {step === 5 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-300 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/40">
                    <Check className="w-10 h-10 text-zinc-950" strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Marcação confirmada!</h2>
                  <p className="text-zinc-400 mb-7 text-sm">Detalhes enviados por WhatsApp e email.</p>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 max-w-md mx-auto text-left">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-zinc-500">Negócio</span><span className="font-medium">Barbearia El Capitán</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Serviço</span><span className="font-medium">{selectedService?.name}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Profissional</span><span className="font-medium">{selectedEmployee?.name}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Data</span><span className="font-medium">{selectedDate?.day} {selectedDate?.num} {selectedDate?.month}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Hora</span><span className="font-medium">{selectedTime}</span></div>
                      <div className="border-t border-zinc-800 pt-2 flex justify-between">
                        <span className="text-zinc-500">Valor</span>
                        <span className="font-bold text-emerald-400">{selectedService?.price}€</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => { setStep(1); setSelectedService(null); setSelectedEmployee(null); setSelectedDate(null); setSelectedTime(null); }}
                    className="mt-6 text-sm text-emerald-400 hover:text-emerald-300">Marcar outra</button>
                </div>
              )}
            </div>
          </>
        )}

        <footer className="border-t border-zinc-900 py-5 px-5 text-center text-xs text-zinc-600">
          {t.bookOnlineWith} <span className="text-emerald-400 font-semibold">TurboAgenda</span>
        </footer>
      </div>
    </div>
  );
}
