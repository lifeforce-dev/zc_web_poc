import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameData, ElementalId } from '../types/game-data'
import { fetchGameData } from '../api/game-data'

export type GamePhase = 'menu' | 'elemental-select' | 'matchmaking' | 'vs-screen' | 'in-game' | 'disconnected'

// Elemental ID type - string because backend is source of truth for valid values
export type ElementalType = ElementalId | null

export interface LogEntry {
  time: string
  text: string
  level: 'info' | 'success' | 'warn' | 'error'
}

/**
 * Game state store - pure state management.
 * WebSocket/transport logic is in composables/useMatchmaking.ts
 */
export const useGameStore = defineStore('game', () => {
  // Player identity
  const playerName = ref(`Player-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`)
  
  // Game phase
  const phase = ref<GamePhase>('menu')
  
  // Catalog data from backend
  const gameData = ref<GameData | null>(null)
  const gameDataLoading = ref(false)
  const gameDataError = ref<string | null>(null)
  
  // Selection state
  const selectedElemental = ref<ElementalType>(null)
  
  // Match state
  const matchId = ref<string | null>(null)
  const playerToken = ref<string | null>(null)
  const opponentName = ref<string>('')
  const opponentElemental = ref<ElementalType>(null)
  
  // UI state
  const logEntries = ref<LogEntry[]>([])
  // null = use default behavior (show when not on menu), true/false = user override
  const debugSidebarOverride = ref<boolean | null>(null)
  
  // Sidebar visibility: user override takes precedence, otherwise show when not on menu
  const showSidebar = computed(() => {
    if (debugSidebarOverride.value !== null) {
      return debugSidebarOverride.value
    }
    return false
  })

  // ============================================
  // ACTIONS - State mutations
  // ============================================

  function log(text: string, level: LogEntry['level'] = 'info'): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    logEntries.value.push({ time, text, level })
  }

  function setPhase(newPhase: GamePhase): void {
    phase.value = newPhase
  }

  function selectElemental(elemental: ElementalType): void {
    selectedElemental.value = elemental
  }

  function setMatch(id: string, token: string): void {
    matchId.value = id
    playerToken.value = token
  }

  function clearMatch(): void {
    matchId.value = null
    playerToken.value = null
    opponentName.value = ''
    opponentElemental.value = null
  }

  function setOpponent(name: string, elemental: ElementalType): void {
    opponentName.value = name
    opponentElemental.value = elemental
  }

  function toggleDebugSidebar(): void {
    // Toggle between: current visibility → opposite
    // If override is null, derive current from default, then flip
    const currentlyVisible = showSidebar.value
    debugSidebarOverride.value = !currentlyVisible
  }

  async function loadGameData(): Promise<void> {
    if (gameData.value) return
    
    gameDataLoading.value = true
    gameDataError.value = null
    
    try {
      gameData.value = await fetchGameData()
      log('Game data loaded', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      gameDataError.value = message
      log(`Failed to load game data: ${message}`, 'error')
    } finally {
      gameDataLoading.value = false
    }
  }

  return {
    // State
    playerName,
    phase,
    gameData,
    gameDataLoading,
    gameDataError,
    selectedElemental,
    opponentElemental,
    matchId,
    playerToken,
    opponentName,
    logEntries,
    showSidebar,
    
    // Actions
    log,
    setPhase,
    selectElemental,
    setMatch,
    clearMatch,
    setOpponent,
    toggleDebugSidebar,
    loadGameData,
  }
})
