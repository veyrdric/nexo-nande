import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Toaster, toast } from 'sonner'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  HandHeart,
  Home,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import { renderMarkdownLite } from '../../../entities/message'
import { askGauchito, ChatRateLimitError, clearChatSession } from '../../../shared/api/chatApi.ts'
import { loginUser, registerUser, fetchCurrentUser, logoutUser } from '../../../shared/api/authApi.ts'
import { searchOpportunity } from '../../../shared/api/opportunitiesApi.ts'
import { getOrCreateSessionId, resetSessionId } from '../../../shared/lib/session.ts'
import { Brand, EASE, FOCUS, Field, LogoMate, Select } from '../../../shared/ui'
import {
  BOT_IMAGES,
  CHAT_ERROR,
  getNivel,
  LOCALIDADES,
  PERSONAS_A_CARGO,
  SITUACIONES,
  SUCCESS_MS,
  WELCOME_MESSAGE,
  type Ayudado,
  type AuthMode,
  type BotState,
  type ChatMessage,
  type NavItem,
  type Resultado,
  type Section,
  type User,
  type View,
} from '../model/data.ts'

export function NexoNandePage() {
  const [currentView, setCurrentView] = useState<View>('login')
  const [section, setSection] = useState<Section>('inicio')

  // Auth
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [user, setUser] = useState<User | null>(null)

  // Buscador
  const [consulta, setConsulta] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [situacion, setSituacion] = useState('')
  const [menores, setMenores] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<Resultado | null>(null)

  // Gamificación
  const [helpedCount, setHelpedCount] = useState(0)
  const [helpedList, setHelpedList] = useState<Ayudado[]>([])

  // Gauchito
  const [botState, setBotState] = useState<BotState>('idle')
  const [chatOpen, setChatOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  // Id de sesión opaco para que el backend recuerde la conversación (sin datos personales)
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId())

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Auto-login si ya existe token válido
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        setUser(u)
        setCurrentView('dashboard')
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!chatOpen) return
    chatInputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setChatOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chatOpen])

  /* ── Auth ── */
  const handleAuth = async () => {
    if (authLoading) return
    setAuthError(null)
    setAuthLoading(true)

    try {
      if (authMode === 'register') {
        const res = await registerUser(form.email, form.password, form.nombre)
        setUser(res.user)
      } else {
        const res = await loginUser(form.email, form.password)
        setUser(res.user)
      }
      setSection('inicio')
      setCurrentView('dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar'
      setAuthError(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    logoutUser()
    setUser(null)
    setChatOpen(false)
    setResult(null)
    setIsLoading(false)
    setBotState('idle')
    setHelpedCount(0)
    setHelpedList([])
    setForm({ nombre: '', email: '', password: '' })
    setAuthError(null)
    setCurrentView('login')
  }

  /* ── Buscador ── */
  const handleBuscar = async () => {
    setResult(null)
    setIsLoading(true)
    setBotState('loading')
    try {
      const data = await searchOpportunity({
        consulta: consulta.trim() || undefined,
        localidad: localidad || undefined,
        situacion: situacion || undefined,
        menores: menores || undefined,
      })
      setResult(data)
      setBotState('success')
      later(() => setBotState('idle'), SUCCESS_MS)
    } catch (err: unknown) {
      console.error('Error buscando oportunidad:', err)
      toast.error('No se pudo encontrar una oportunidad en este momento. Probá de nuevo.')
      setBotState('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const limpiarBusqueda = () => {
    setConsulta('')
    setLocalidad('')
    setSituacion('')
    setMenores('')
    setResult(null)
  }

  const handleAyudado = () => {
    if (!result) return
    const next = helpedCount + 1
    setHelpedCount(next)
    setHelpedList((list) => [
      {
        id: result.id,
        programa: result.titulo,
        localidad: localidad || 'Formosa',
        situacion: situacion || 'Sin especificar',
        hora: new Date().toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...list,
    ])
    const nivelNuevo = getNivel(next)
    const subioDeNivel = nivelNuevo.numero > getNivel(helpedCount).numero
    toast.success(subioDeNivel ? '¡Subiste de nivel! 🎉' : '¡Vecino ayudado! 🧉', {
      description: subioDeNivel
        ? `Ahora sos Nivel ${nivelNuevo.numero}: ${nivelNuevo.nombre}`
        : next === 1
          ? 'Sumaste tu primer vecino ayudado. ¡Así se empieza!'
          : `Ya van ${next} vecinos ayudados. ¡Sos un crack!`,
    })
    limpiarBusqueda()
  }

  /* ── Chat ── */
  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || isTyping) return
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: 'user', text }])
    setDraft('')
    setIsTyping(true)
    let botMessage: ChatMessage
    try {
      const { reply, sources } = await askGauchito(sessionId, text)
      botMessage = { id: crypto.randomUUID(), from: 'bot', text: reply, sources }
    } catch (error) {
      const reply = error instanceof ChatRateLimitError ? error.message : CHAT_ERROR
      botMessage = { id: crypto.randomUUID(), from: 'bot', text: reply }
    }
    setMessages((m) => [...m, botMessage])
    setIsTyping(false)
  }

  // "Borrar conversación" (privacidad): nueva sesión y se olvida la vieja en el backend
  const handleClearChat = () => {
    clearChatSession(sessionId)
    setSessionId(resetSessionId())
    setMessages([WELCOME_MESSAGE])
    setDraft('')
  }

  /* ═════════════════════════ VISTA 1: LOGIN ═════════════════════════ */
  if (currentView === 'login') {
    const isRegister = authMode === 'register'
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-24">
          {/* ───── Columna izquierda: marca, mensaje y Gauchito ───── */}
          <section>
            <div className="isolate flex flex-col gap-6">
              <Brand size="hero" />
              <h1 className="mt-4 font-sans text-4xl font-extrabold leading-[1.2] tracking-tight text-slate-900 lg:text-5xl">
                Convertite en el puente entre una necesidad y un{' '}
                <span className="text-[#077937]">derecho.</span>
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-slate-600">
                Ayudá a tus vecinos a encontrar becas y subsidios, con pasos simples y sin vueltas.
              </p>
            </div>

            <div className="mt-12 hidden items-end gap-4 lg:flex">
              <img
                src={BOT_IMAGES.idle}
                alt="El Gauchito invitándote a sumarte"
                className="animate-breathe h-44 w-44 shrink-0 origin-bottom object-contain object-bottom drop-shadow-xl"
              />
              <div className="relative mb-10 rounded-3xl bg-white px-6 py-4 text-base font-semibold leading-snug text-gray-800 shadow-lg shadow-celeste/20">
                <span
                  aria-hidden
                  className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 rounded-sm bg-white"
                />
                <span className="relative">
                  ¡Sumate, vecino!
                  <br />
                  Somos un montón 🧉
                </span>
              </div>
            </div>
          </section>

          {/* ───── Columna derecha: tarjeta del formulario ───── */}
          <section className="w-full">
            <div className="mx-auto w-full max-w-[480px] rounded-[2rem] bg-white p-10 shadow-2xl shadow-slate-200/60 sm:p-12">
              {/* Toggle */}
              <div
                role="tablist"
                aria-label="Tipo de acceso"
                className="relative flex rounded-2xl bg-slate-100 p-1.5"
              >
                <span
                  aria-hidden
                  className={`${EASE} absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-white shadow-sm ${
                    isRegister ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                {(
                  [
                    ['login', 'Iniciar Sesión'],
                    ['register', 'Crear Cuenta'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={authMode === mode}
                    onClick={() => {
                      setAuthMode(mode)
                      setAuthError(null)
                    }}
                    className={`${EASE} ${FOCUS} relative flex-1 rounded-xl py-2 text-sm font-semibold ${
                      authMode === mode ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isRegister ? 'Sumate a la red' : '¡Qué bueno verte!'}
                </h2>
                <p className="mt-2 text-gray-500">
                  {isRegister
                    ? 'Creá tu cuenta de Facilitador Solidario.'
                    : 'Entrá para seguir ayudando a tus vecinos.'}
                </p>
              </div>

              {authError && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 animate-in fade-in">
                  {authError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAuth()
                }}
                className="mt-8 flex flex-col gap-5"
              >
                {isRegister && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Field
                      label="Nombre"
                      type="text"
                      autoComplete="name"
                      placeholder="¿Cómo te llamás?"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    />
                  </div>
                )}
                <Field
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Field
                  label="Contraseña"
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />

                <button
                  type="submit"
                  disabled={authLoading}
                  className={`${EASE} ${FOCUS} mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-verde py-3.5 text-lg font-bold text-white shadow-md shadow-verde/20 hover:-translate-y-1 hover:bg-verde-dark hover:shadow-lg hover:shadow-verde/30 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80`}
                >
                  {authLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isRegister ? 'Crear mi cuenta' : 'Iniciar sesión'}{' '}
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-sm text-gray-400">Prototipo · no se guardan datos reales</p>
          </section>
        </div>
      </div>
    )
  }

  /* ═════════════════════════ VISTA 2: DASHBOARD ═════════════════════════ */
  if (!user) return null

  const initials = user.nombre
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const NAV: NavItem[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    {
      id: 'ayudados',
      label: 'Mis Vecinos Ayudados',
      icon: HandHeart,
      badge: helpedCount,
    },
  ]

  const nivel = getNivel(helpedCount)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-celeste/5 to-slate-100 text-gray-800">
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: '!rounded-2xl !border-verde/20 !bg-white !p-5 !shadow-xl !shadow-verde/10',
            title: '!text-base !font-bold !text-gray-900',
            description: '!text-gray-500',
            icon: '!text-verde',
          },
        }}
      />

      {/* ───────── Sidebar ───────── */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200/80 bg-slate-50/80 px-6 py-8 backdrop-blur-sm md:flex">
        <div className="flex items-center gap-3 px-2">
          <LogoMate className="h-12 w-12 shrink-0 drop-shadow-sm" />
          <span className="text-2xl font-black leading-none tracking-tight text-slate-900">
            Nexo <span className="text-verde">Ñandé</span>
          </span>
        </div>

        <nav className="mt-12 flex flex-col gap-2">
          {NAV.map(({ id, label, icon: Icon, badge }) => {
            const active = section === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={active ? 'page' : undefined}
                className={`${EASE} ${FOCUS} flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold ${
                  active
                    ? 'bg-verde text-white shadow-md shadow-verde/30'
                    : 'text-gray-500 hover:translate-x-1 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && (
                  <span
                    key={badge}
                    className={`animate-in zoom-in-50 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold duration-300 ${
                      badge > 0
                        ? 'bg-amarillo text-gray-900'
                        : active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/70 text-gray-500'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Tarjeta "Tu Impacto" */}
        <div className="flex flex-1 items-center py-8">
          <div className="w-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tu Impacto</p>
            <p
              key={nivel.numero}
              className="animate-in fade-in zoom-in-95 mt-2 text-lg font-extrabold text-slate-900 duration-500"
            >
              Nivel {nivel.numero}: {nivel.nombre}
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(nivel.progreso * 100)}
              aria-label="Progreso hacia el próximo nivel"
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-verde transition-all duration-700 ease-out"
                style={{ width: `${nivel.progreso * 100}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-snug text-slate-500">
              Ayudá a {nivel.faltan} {nivel.faltan === 1 ? 'vecino más' : 'vecinos más'} para subir de nivel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-celeste text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{user.nombre}</p>
            <p className="truncate text-xs text-gray-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className={`${EASE} ${FOCUS} rounded-xl p-2 text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-sm`}
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      {/* ───────── Contenido ───────── */}
      <main className="min-w-0 flex-1">
        {/* pb-64: deja lugar para que el contenido nunca quede debajo del Gauchito */}
        <div className="mx-auto max-w-5xl px-8 py-12 pb-64">
          <header className="flex items-center justify-between gap-4 md:justify-end">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="group relative">
              <span
                key={helpedCount}
                tabIndex={0}
                aria-describedby="badge-tip"
                className={`${EASE} animate-in zoom-in-90 flex cursor-default items-center gap-2.5 rounded-full border-2 border-amarillo/70 bg-white px-6 py-3 text-base font-extrabold text-gray-900 shadow-md shadow-amarillo/25 duration-300 outline-none group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-amarillo/40 focus-visible:ring-4 focus-visible:ring-amarillo/40`}
              >
                <span className="text-xl">🏆</span>
                {helpedCount} {helpedCount === 1 ? 'Vecino ayudado' : 'Vecinos ayudados'}
              </span>
              <div
                id="badge-tip"
                role="tooltip"
                className={`${EASE} pointer-events-none absolute right-0 top-full z-30 mt-3 w-64 translate-y-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium leading-snug text-white opacity-0 shadow-xl group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100`}
              >
                <span
                  aria-hidden
                  className="absolute -top-1.5 right-8 h-3 w-3 rotate-45 rounded-sm bg-slate-900"
                />
                ¡Suma puntos y subí de nivel con cada vecino que ayudes!
              </div>
            </div>
          </header>

          <div className="pt-10">
            {section === 'inicio' ? (
              <div className="animate-in fade-in duration-300 text-left">
                <h1 className="font-sans text-3xl font-extrabold leading-[1.2] tracking-tight text-slate-900 lg:text-4xl">
                  ¡Hola vecino! ¿A quién vamos a darle una mano hoy?
                </h1>
                <p className="mt-3 text-lg text-slate-500">
                  Cada oportunidad que conectás, es una familia que progresa.
                </p>

                {/* Tarjeta de búsqueda */}
                <div className="mt-10 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-celeste/10">
                  <div
                    className={`${EASE} flex gap-3 rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm focus-within:border-transparent focus-within:ring-2 focus-within:ring-celeste`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-celeste/15 text-celeste">
                      <WandSparkles className="h-5 w-5" />
                    </span>
                    <textarea
                      rows={3}
                      value={consulta}
                      onChange={(e) => setConsulta(e.target.value)}
                      placeholder="Contame en tus palabras la situación del vecino (ej: hace changas y tiene 2 hijos)..."
                      aria-label="Situación del vecino"
                      className="min-h-[96px] w-full resize-none bg-transparent pt-1.5 text-base leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Select
                      label="Localidad"
                      placeholder="Elegí una"
                      icon={MapPin}
                      value={localidad}
                      onValueChange={setLocalidad}
                      options={LOCALIDADES}
                    />
                    <Select
                      label="Situación laboral"
                      placeholder="Elegí una"
                      icon={Sparkles}
                      value={situacion}
                      onValueChange={setSituacion}
                      options={SITUACIONES}
                    />
                    <Select
                      label="Personas a cargo"
                      placeholder="¿Cuántas?"
                      icon={Users}
                      value={menores}
                      onValueChange={setMenores}
                      options={PERSONAS_A_CARGO}
                    />
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={handleBuscar}
                      disabled={isLoading}
                      className={`${FOCUS} group flex items-center gap-2 rounded-full bg-gradient-to-r from-verde to-[#0a9444] px-8 py-3 text-base font-bold text-white shadow-lg shadow-verde/30 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-verde/40 active:scale-95 disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> Buscando…
                        </>
                      ) : (
                        <>
                          Buscar Oportunidades
                          <Sparkles className="h-5 w-5 text-amarillo transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Resultado */}
                <section aria-live="polite" aria-busy={isLoading} className="mt-12">
                  {isLoading && (
                    <div className="animate-in fade-in animate-pulse rounded-3xl border border-slate-100 bg-white p-10 duration-300">
                      <div className="h-7 w-36 rounded-full bg-slate-200/80" />
                      <div className="mt-6 h-8 w-2/3 rounded-full bg-slate-200/80" />
                      <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
                      <div className="mt-3 h-4 w-4/5 rounded-full bg-slate-100" />
                      <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-slate-50 p-6">
                        {[0, 1, 2].map((n) => (
                          <div key={n} className="flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full bg-slate-200/80" />
                            <div className="h-4 flex-1 rounded-full bg-slate-200/60" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result && (
                    <article
                      key={result.id}
                      className={`${EASE} animate-in fade-in slide-in-from-bottom-5 animation-duration-500 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-celeste/10 md:p-10`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <span className="rounded-full bg-amarillo px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
                          {result.tag}
                        </span>
                        <button
                          type="button"
                          onClick={limpiarBusqueda}
                          aria-label="Descartar resultado"
                          className={`${EASE} ${FOCUS} rounded-full p-2 text-gray-300 hover:bg-slate-50 hover:text-gray-600`}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <h2 className="mt-6 text-2xl font-bold text-gray-900 md:text-3xl">{result.titulo}</h2>
                      <p className="mt-3 text-lg leading-relaxed text-gray-500">{result.descripcion}</p>

                      <div className="mt-8 rounded-2xl bg-slate-50 p-6 md:p-7">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-700">
                          Checklist Anti-Rebote
                        </p>
                        <ol className="mt-5 flex flex-col gap-4">
                          {result.checklist.map((item, n) => (
                            <li key={item} className="flex items-start gap-3 text-gray-700">
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-verde" />
                              <span>
                                <span className="font-semibold">{n + 1}.</span> {item}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="mt-8 flex flex-col gap-1.5 text-gray-700">
                        <p>
                          📍 <span className="font-semibold">Dónde ir:</span> {result.lugar}
                        </p>
                        <p className="flex items-center gap-2 pl-6 text-sm text-gray-400">
                          <Clock className="h-4 w-4" /> {result.horario}
                        </p>
                        {result.sourceUrl && (
                          <p className="mt-1 flex items-center gap-1.5 pl-6 text-sm">
                            <ExternalLink className="h-3.5 w-3.5 text-celeste" />
                            <a
                              href={result.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-celeste hover:underline"
                            >
                              Ver fuente oficial del programa ↗
                            </a>
                          </p>
                        )}
                      </div>

                      <div className="mt-10 flex flex-col-reverse gap-4 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setChatOpen(true)}
                          className={`${EASE} ${FOCUS} flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-gray-600 hover:bg-celeste/10 hover:text-gray-900`}
                        >
                          <MessageCircle className="h-4 w-4" /> Consultar al Gauchito
                        </button>
                        <button
                          type="button"
                          onClick={handleAyudado}
                          className={`${EASE} ${FOCUS} flex h-12 items-center justify-center gap-2 rounded-full bg-verde px-7 text-sm font-bold text-white shadow-lg shadow-verde/25 hover:-translate-y-0.5 hover:bg-verde-dark hover:shadow-xl active:scale-95`}
                        >
                          <HandHeart className="h-5 w-5" /> Marcar como Ayudado
                        </button>
                      </div>
                    </article>
                  )}
                </section>
              </div>
            ) : (
              /* ── Mis Vecinos Ayudados ── */
              <div className="animate-in fade-in duration-300">
                <h1 className="font-sans text-3xl font-extrabold leading-[1.2] tracking-tight text-slate-900 lg:text-4xl">
                  Mis Vecinos Ayudados
                </h1>
                <p className="mt-4 text-lg text-gray-500">
                  Cada vecino que ayudás es un derecho que se hace realidad.
                </p>

                {helpedList.length === 0 ? (
                  <div className="mt-12 flex flex-col items-center rounded-3xl border border-slate-100 bg-white px-8 py-16 text-center shadow-sm">
                    <img src={BOT_IMAGES.idle} alt="" className="animate-breathe h-36 w-36 object-contain" />
                    <h2 className="mt-6 text-xl font-bold text-gray-900">
                      Todavía no ayudaste a ningún vecino
                    </h2>
                    <p className="mt-2 max-w-sm text-gray-500">
                      Buscá una oportunidad y marcala como ayudada. ¡El primero siempre es el más lindo!
                    </p>
                    <button
                      type="button"
                      onClick={() => setSection('inicio')}
                      className={`${EASE} ${FOCUS} mt-8 flex h-12 items-center gap-2 rounded-full bg-verde px-7 text-sm font-bold text-white shadow-lg shadow-verde/25 hover:-translate-y-0.5 hover:bg-verde-dark hover:shadow-xl`}
                    >
                      Buscar Oportunidades ✨
                    </button>
                  </div>
                ) : (
                  <ul className="mt-12 flex flex-col gap-5">
                    {helpedList.map((h, i) => (
                      <li
                        key={h.id}
                        style={{ animationDelay: `${i * 80}ms` }}
                        className={`${EASE} animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-verde/10">
                          <HandHeart className="h-6 w-6 text-verde" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900">{h.programa}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {h.localidad} · {h.situacion}
                          </p>
                        </div>
                        <span className="text-sm text-gray-400">Hoy {h.hora}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ───────── Widget flotante del Gauchito ───────── */}
      <div
        className={`${EASE} fixed bottom-8 right-8 z-50 ${
          chatOpen ? 'pointer-events-none translate-y-4 opacity-0' : 'opacity-100'
        }`}
      >
        {/* Burbuja arriba del Gauchito: el widget ocupa solo su esquina */}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          tabIndex={-1}
          className="animate-float absolute bottom-full right-0 mb-4 w-64 rounded-2xl rounded-br-md bg-amarillo px-4 py-3 text-left text-sm font-semibold leading-snug text-gray-900 shadow-lg shadow-amarillo/40"
        >
          <span className="font-extrabold">¡Mba'éichapa!</span> Hola vecino, soy el Gauchito. Cualquier cosa
          haz click acá y charlamos.
        </button>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Abrir chat con el Gauchito"
          className={`${EASE} group relative block h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-celeste/25 shadow-2xl shadow-slate-900/25 hover:-translate-y-1 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-celeste/40`}
        >
          <img
            src={BOT_IMAGES[botState]}
            alt=""
            className={`${EASE} absolute -bottom-3 left-1/2 h-24 w-24 max-w-none -translate-x-1/2 object-contain group-hover:-bottom-1 ${
              botState === 'idle' ? 'animate-breathe' : ''
            }`}
          />
        </button>
      </div>

      {/* ───────── Drawer del chat ───────── */}
      <div
        aria-hidden
        onClick={() => setChatOpen(false)}
        className={`${EASE} fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm ${
          chatOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Charlá con el Gauchito"
        inert={!chatOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl shadow-slate-900/30 transition-transform duration-300 ease-in-out sm:w-[460px] ${
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-4 bg-celeste px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white/70 bg-white/90">
              <img src={BOT_IMAGES[botState]} alt="" className="h-full w-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Charlá con el Gauchito</h2>
              <p className="flex items-center gap-1.5 text-sm text-white/90">
                <span className="h-2 w-2 rounded-full bg-amarillo" />
                {isTyping ? 'Escribiendo…' : 'En línea'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              aria-label="Borrar conversación"
              title="Borrar conversación"
              className={`${EASE} rounded-full p-2 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Cerrar chat"
              className={`${EASE} rounded-full p-2 text-white hover:rotate-90 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        <p className="border-b border-slate-200 bg-slate-100 px-8 py-2.5 text-center text-xs font-medium text-gray-500">
          Servicio informativo, no oficial. Verificá siempre en el organismo oficial.
        </p>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-slate-50 px-8 py-8">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`animate-in fade-in duration-300 ${
                m.from === 'user'
                  ? 'slide-in-from-right-4 ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-verde px-5 py-4 text-white shadow-md shadow-verde/15'
                  : 'slide-in-from-left-4 mr-auto flex max-w-[85%] items-end gap-3'
              }`}
            >
              {m.from === 'bot' ? (
                <>
                  <img
                    src={BOT_IMAGES.idle}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full bg-celeste/20 object-contain"
                  />
                  <div className="rounded-3xl rounded-bl-md bg-white px-5 py-4 leading-relaxed text-gray-800 shadow-sm">
                    {renderMarkdownLite(m.text)}
                    {m.sources && m.sources.length > 0 && (
                      <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-gray-400">
                        Fuente:{' '}
                        {m.sources.map((source, i) => (
                          <span key={source.url + i}>
                            {i > 0 && ' · '}
                            {/^https?:\/\//.test(source.url) ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-celeste"
                              >
                                {source.title}
                              </a>
                            ) : (
                              // Fuentes sin URL real (datos de demostración): solo texto
                              <span>{source.title}</span>
                            )}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="leading-relaxed">{m.text}</p>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="animate-in fade-in slide-in-from-left-4 flex items-end gap-3 duration-300">
              <img
                src={BOT_IMAGES.loading}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full bg-celeste/20 object-contain"
              />
              <div className="flex items-center gap-3 rounded-3xl rounded-bl-md bg-white px-5 py-4 shadow-sm">
                <span className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      style={{ animationDelay: `${d}ms` }}
                      className="h-2 w-2 animate-bounce rounded-full bg-celeste"
                    />
                  ))}
                </span>
                <span className="text-sm text-gray-400">El Gauchito está escribiendo...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 border-t border-slate-100 bg-white px-6 py-5"
        >
          <input
            ref={chatInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribile al Gauchito…"
            aria-label="Mensaje"
            maxLength={1000}
            className={`${EASE} h-13 flex-1 rounded-full border border-slate-200/70 bg-slate-50 px-6 text-base text-gray-800 placeholder:text-gray-400 focus:border-celeste focus:bg-white focus:outline-none focus:ring-4 focus:ring-celeste/20`}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isTyping}
            aria-label="Enviar mensaje"
            className={`${EASE} ${FOCUS} flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-verde text-white shadow-lg shadow-verde/25 hover:scale-105 hover:bg-verde-dark active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none`}
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </form>
      </aside>
    </div>
  )
}
