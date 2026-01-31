import type { GameData } from '../types/game-data'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function fetchGameData(): Promise<GameData> {
  const [elementalsRes, abilitiesRes] = await Promise.all([
    fetch(`${API_BASE}/api/catalog/elementals`),
    fetch(`${API_BASE}/api/catalog/abilities`)
  ])
  
  if (!elementalsRes.ok) {
    throw new Error(`Failed to fetch elementals: ${elementalsRes.statusText}`)
  }
  if (!abilitiesRes.ok) {
    throw new Error(`Failed to fetch abilities: ${abilitiesRes.statusText}`)
  }
  
  const elementalsData = await elementalsRes.json()
  const abilitiesData = await abilitiesRes.json()
  
  const data: GameData = {
    elementals: elementalsData.elementals,
    abilities: abilitiesData.abilities
  }
  
  return data
}
