import { CHAT_API_URL } from '../config/env.ts'
import type { Resultado } from '../../pages/nexo-nande/model/data.ts'

export interface SearchOpportunityParams {
  consulta?: string
  localidad?: string
  situacion?: string
  menores?: string
}

export async function searchOpportunity(params: SearchOpportunityParams): Promise<Resultado> {
  const response = await fetch(`${CHAT_API_URL}/api/opportunities/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`El servidor respondió con código ${response.status}`)
  }

  return (await response.json()) as Resultado
}
