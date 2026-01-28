import { computed, onBeforeUnmount, ref } from 'vue'
import type { ClientMessage, ServerMessage } from '../ws'
import { buildWsUrl } from '../ws'

export type Phase = 'idle' | 'queueing' | 'matched' | 'ready' | 'disconnected'
export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export interface LogEntry {
  time: string
  text: string
  level: LogLevel
}

export interface MatchState {
  phase: Phase
  matchId: string | null
  playerToken: string | null
  you: string
  opponent: string
}

export function useMatchmaking() {
  const playerName = ref(generatePlayerName())

  const state = ref<MatchState>({
    phase: 'idle',
    matchId: null,
    playerToken: null,
    you: '',
    opponent: '',
  })

  const logEntries = ref<LogEntry[]>([])

  let matchmakingSocket: WebSocket | null = null
  let gameSocket: WebSocket | null = null

  const phaseDisplay = computed(() => {
    const map: Record<Phase, { label: string; variant: string }> = {
      idle: { label: 'IDLE', variant: 'idle' },
      queueing: { label: 'QUEUEING', variant: 'queueing' },
      matched: { label: 'MATCHED', variant: 'matched' },
      ready: { label: 'READY', variant: 'ready' },
      disconnected: { label: 'DISCONNECTED', variant: 'disconnected' },
    }
    return map[state.value.phase]
  })

  const canPing = computed(() => state.value.phase === 'ready')

  function log(text: string, level: LogLevel = 'info'): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    logEntries.value = [...logEntries.value, { time, text, level }]
  }

  function closeSocket(ws: WebSocket | null): void {
    if (!ws) return
    try {
      ws.close()
    } catch {
      // Ignore close errors.
    }
  }

  function resetState(): void {
    state.value = {
      phase: 'idle',
      matchId: null,
      playerToken: null,
      you: '',
      opponent: '',
    }
  }

  function findMatch(): void {
    closeSocket(matchmakingSocket)
    closeSocket(gameSocket)
    matchmakingSocket = null
    gameSocket = null

    resetState()
    state.value.phase = 'queueing'

    const wsUrl = buildWsUrl('/ws/matchmaking', { name: playerName.value })
    log(`Connecting: ${wsUrl}`, 'info')

    const ws = new WebSocket(wsUrl)
    matchmakingSocket = ws

    ws.onopen = () => log('Matchmaking socket opened', 'success')
    ws.onclose = () => handleMatchmakingClose()
    ws.onerror = () => log('Matchmaking socket error', 'error')
    ws.onmessage = (ev) => handleMatchmakingMessage(ev)
  }

  function handleMatchmakingClose(): void {
    log('Matchmaking disconnected', 'warn')
    if (state.value.phase === 'queueing') {
      state.value.phase = 'disconnected'
    }
  }

  function handleMatchmakingMessage(ev: MessageEvent): void {
    const msg = JSON.parse(ev.data as string) as ServerMessage

    switch (msg.type) {
      case 'status':
        log(`Status: ${msg.status} - ${msg.detail}`, 'info')
        break

      case 'match_found':
        log(`Match found: ${msg.match_id}`, 'success')
        state.value.matchId = msg.match_id
        state.value.playerToken = msg.player_token
        state.value.phase = 'matched'
        matchmakingSocket?.close()
        connectGame()
        break

      case 'error':
        log(`Server error: ${msg.message}`, 'error')
        break

      default:
        log(`Unknown message: ${(msg as ServerMessage).type}`, 'warn')
    }
  }

  function connectGame(): void {
    const { matchId, playerToken } = state.value
    if (!matchId || !playerToken) {
      log('Cannot connect game: missing match/token', 'error')
      return
    }

    const wsUrl = buildWsUrl(`/ws/game/${matchId}`, { token: playerToken })
    log(`Connecting game: ${wsUrl}`, 'info')

    const ws = new WebSocket(wsUrl)
    gameSocket = ws

    ws.onopen = () => log('Game socket opened', 'success')
    ws.onclose = () => handleGameClose()
    ws.onerror = () => log('Game socket error', 'error')
    ws.onmessage = (ev) => handleGameMessage(ev)
  }

  function handleGameClose(): void {
    log('Game socket closed', 'warn')
    if (state.value.phase === 'ready' || state.value.phase === 'matched') {
      state.value.phase = 'disconnected'
    }
  }

  function handleGameMessage(ev: MessageEvent): void {
    const msg = JSON.parse(ev.data as string) as ServerMessage

    switch (msg.type) {
      case 'game_ready':
        state.value.you = msg.you
        state.value.opponent = msg.opponent
        state.value.phase = 'ready'
        log(`Game ready: you=${msg.you}, opponent=${msg.opponent}`, 'success')
        break

      case 'pinged':
        log('Received ping from opponent', 'info')
        break

      case 'opponent_disconnected':
        log('Opponent disconnected', 'warn')
        state.value.phase = 'disconnected'
        break

      case 'error':
        log(`Server error: ${msg.message}`, 'error')
        break

      default:
        log(`Unknown message: ${(msg as ServerMessage).type}`, 'warn')
    }
  }

  function sendPing(): void {
    if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) {
      log('Cannot ping: game socket not open', 'error')
      return
    }

    const msg: ClientMessage = { type: 'ping' }
    gameSocket.send(JSON.stringify(msg))
    log('Sent ping to opponent', 'info')
  }

  function cleanup(): void {
    closeSocket(matchmakingSocket)
    closeSocket(gameSocket)
  }

  onBeforeUnmount(cleanup)

  return {
    playerName,
    state,
    logEntries,
    phaseDisplay,
    canPing,
    findMatch,
    sendPing,
  }
}

function generatePlayerName(): string {
  const id = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `Player-${id}`
}
