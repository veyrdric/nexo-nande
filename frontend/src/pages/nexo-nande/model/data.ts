import type { LucideIcon } from 'lucide-react'
import type { ChatSource } from '../../../shared/api/chatApi.ts'

/* ─────────────────────────── Tipos ─────────────────────────── */

export type View = 'login' | 'dashboard'
export type Section = 'inicio' | 'ayudados'
export type AuthMode = 'login' | 'register'
export type AuthProvider = 'email'
export type BotState = keyof typeof BOT_IMAGES

export interface User {
  nombre: string
  email: string
}

export interface Oportunidad {
  tag: string
  titulo: string
  descripcion: string
  checklist: string[]
  lugar: string
  horario: string
  sourceUrl?: string
}

export type Resultado = Oportunidad & { id: number }

export interface Ayudado {
  id: number
  programa: string
  localidad: string
  situacion: string
  hora: string
}

export interface ChatMessage {
  id: string
  from: 'user' | 'bot'
  text: string
  // Páginas de donde salió la respuesta (RAG)
  sources?: ChatSource[]
}

export interface NavItem {
  id: Section
  label: string
  icon: LucideIcon
  badge?: number
}

/* ─────────────────────────── Opciones de búsqueda ─────────────────────────── */

export const LOCALIDADES = ['Formosa Capital', 'Clorinda', 'Pirané', 'Lomitas'] as const
export const SITUACIONES = ['Changas/Informal', 'Desempleado', 'Trabajo Fijo'] as const
export const PERSONAS_A_CARGO = ['Ninguna', '1', '2', '3', '4 o más'] as const

// Gamificación: cada nivel son 4 pasos; crear la cuenta ya cuenta como el primero
export const PASOS_POR_NIVEL = 4
export const NIVELES = ['Semilla 🌱', 'Brote 🌿', 'Algarrobo 🌳', 'Quebracho 💪']
export const getNivel = (helped: number) => {
  const pasos = helped + 1
  const idx = Math.floor(pasos / PASOS_POR_NIVEL)
  const enNivel = pasos % PASOS_POR_NIVEL
  return {
    numero: idx + 1,
    nombre: NIVELES[Math.min(idx, NIVELES.length - 1)],
    progreso: enNivel / PASOS_POR_NIVEL,
    faltan: PASOS_POR_NIVEL - enNivel,
  }
}

export const BOT_IMAGES = {
  idle: '/gauchito-idle.png',
  loading: '/gauchito-loading.png',
  success: '/gauchito-success.png',
}

export const SEARCH_MS = 1500
export const SUCCESS_MS = 2500

export const CHAT_ERROR = 'Uy, no me pude conectar 😕. Revisá tu conexión y probá de nuevo en un ratito.'

export const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  from: 'bot',
  text: '¡Buenas buenas! 🧉 Soy el Gauchito. Contame en qué andás y te ayudo a encontrar el programa justo para tu vecino.',
}
