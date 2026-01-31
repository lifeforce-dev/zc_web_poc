import { ref, onUnmounted } from 'vue'
import { buildWsUrl } from '../ws'
import type { ServerMessage, ClientMessage } from '../ws'
import { useGameStore, type ElementalType } from '../stores/game'

/**
 * Composable for matchmaking and game WebSocket connections.
 * Manages socket lifecycle and translates server messages into store state.
 * 
 * Should be instantiated once at app level (e.g., in App.vue) to avoid
 * multiple socket connections.
 */
export function useMatchmaking() {
  const store = useGameStore()
  
  let matchmakingSocket: WebSocket | null = null
  let gameSocket: WebSocket | null = null

  function closeSocket(ws: WebSocket | null): void {
    if (!ws) return
    try {
      ws.close()
    } catch {
      // Ignore close errors.
    }
  }

  function startMatchmaking(): void {
    if (!store.selectedElemental) {
      store.log('Cannot start matchmaking: no elemental selected', 'error')
      return
    }

    // Clean up any existing connections
    closeSocket(matchmakingSocket)
    closeSocket(gameSocket)
    matchmakingSocket = null
    gameSocket = null

    // Reset match state
    store.setPhase('matchmaking')
    store.clearMatch()

    const wsUrl = buildWsUrl('/ws/matchmaking', {
      name: store.playerName,
      elemental: store.selectedElemental
    })
    store.log(`Connecting: ${wsUrl}`, 'info')

    const ws = new WebSocket(wsUrl)
    matchmakingSocket = ws

    ws.onopen = () => store.log('Matchmaking socket opened', 'success')

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as ServerMessage

      if (msg.type === 'status') {
        store.log(`Status: ${msg.status} - ${msg.detail}`, 'info')
        return
      }

      if (msg.type === 'match_found') {
        store.log(`Match found: ${msg.match_id}`, 'success')
        store.setMatch(msg.match_id, msg.player_token)
        ws.close()
        connectGame()
        return
      }

      if (msg.type === 'error') {
        store.log(`Server error: ${msg.message}`, 'error')
        return
      }

      store.log(`Unknown message: ${msg.type}`, 'warn')
    }

    ws.onclose = () => {
      store.log('Matchmaking disconnected', 'warn')
      if (store.phase === 'matchmaking') {
        store.setPhase('disconnected')
      }
    }

    ws.onerror = () => store.log('Matchmaking socket error', 'error')
  }

  function connectGame(): void {
    if (!store.matchId || !store.playerToken) {
      store.log('Cannot connect game: missing match/token', 'error')
      return
    }

    const wsUrl = buildWsUrl(`/ws/game/${store.matchId}`, { token: store.playerToken })
    store.log(`Connecting game: ${wsUrl}`, 'info')

    const ws = new WebSocket(wsUrl)
    gameSocket = ws

    ws.onopen = () => store.log('Game socket opened', 'success')

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as ServerMessage

      if (msg.type === 'game_ready') {
        store.setOpponent(msg.opponent, msg.opponent_elemental as ElementalType)
        store.setPhase('vs-screen')
        store.log(`Game ready: you=${msg.you}, opponent=${msg.opponent} (${msg.opponent_elemental})`, 'success')
        return
      }

      if (msg.type === 'pinged') {
        store.log('Received ping from opponent', 'info')
        return
      }

      if (msg.type === 'opponent_disconnected') {
        store.log('Opponent disconnected', 'warn')
        store.setPhase('disconnected')
        return
      }

      if (msg.type === 'error') {
        store.log(`Server error: ${msg.message}`, 'error')
        return
      }

      store.log(`Unknown message: ${msg.type}`, 'warn')
    }

    ws.onclose = () => {
      store.log('Game socket closed', 'warn')
      if (store.phase === 'vs-screen' || store.phase === 'in-game') {
        store.setPhase('disconnected')
      }
    }

    ws.onerror = () => store.log('Game socket error', 'error')
  }

  function cancelMatchmaking(): void {
    if (matchmakingSocket) {
      store.log('Cancelling matchmaking', 'info')
      closeSocket(matchmakingSocket)
      matchmakingSocket = null
      store.setPhase('elemental-select')
    }
  }

  function sendPing(): void {
    if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) {
      store.log('Cannot send ping: not connected', 'error')
      return
    }

    const msg: ClientMessage = { type: 'ping' }
    gameSocket.send(JSON.stringify(msg))
    store.log('Sent ping to opponent', 'info')
  }

  function cleanup(): void {
    closeSocket(matchmakingSocket)
    closeSocket(gameSocket)
    matchmakingSocket = null
    gameSocket = null
  }

  // Cleanup on unmount (if used in a component)
  onUnmounted(() => {
    cleanup()
  })

  return {
    startMatchmaking,
    cancelMatchmaking,
    sendPing,
    cleanup,
  }
}
