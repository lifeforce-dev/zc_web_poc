export type ServerStatus = {
  type: 'status'
  status: 'queueing' | 'matched'
  detail: string
}

export type ServerMatchFound = {
  type: 'match_found'
  match_id: string
  player_token: string
}

export type ServerGameReady = {
  type: 'game_ready'
  match_id: string
  you: string
  opponent: string
}

export type ServerPinged = {
  type: 'pinged'
}

export type ServerOpponentDisconnected = {
  type: 'opponent_disconnected'
}

export type ServerError = {
  type: 'error'
  message: string
}

export type ServerMessage =
  | ServerStatus
  | ServerMatchFound
  | ServerGameReady
  | ServerPinged
  | ServerOpponentDisconnected
  | ServerError

export type ClientPing = { type: 'ping' }

export type ClientMessage = ClientPing

export function getWsBaseUrl(): string {
  const url = new URL(window.location.href)

  const override = url.searchParams.get('wsBase')
  if (override && override.trim().length > 0) {
    return override.trim().replace(/\/$/, '')
  }

  const envBase = import.meta.env.VITE_WS_BASE_URL
  if (envBase && envBase.trim().length > 0) {
    return envBase.trim().replace(/\/$/, '')
  }

  return 'ws://127.0.0.1:8000'
}

export function buildWsUrl(path: string, params?: Record<string, string>): string {
  const base = getWsBaseUrl()
  const wsUrl = new URL(path, base)

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      wsUrl.searchParams.set(k, v)
    }
  }

  return wsUrl.toString()
}
