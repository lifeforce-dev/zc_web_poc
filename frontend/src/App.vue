<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ClientMessage, ServerMessage } from './ws'
import { buildWsUrl } from './ws'

const name = ref(`Player-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`)

const phase = ref<'idle' | 'queueing' | 'matched' | 'ready' | 'disconnected'>('idle')
const matchId = ref<string | null>(null)
const token = ref<string | null>(null)

const you = ref<string>('')
const opponent = ref<string>('')

const logLines = ref<string[]>([])

let matchmakingSocket: WebSocket | null = null
let gameSocket: WebSocket | null = null

function log(line: string): void {
  logLines.value = [...logLines.value, `[${new Date().toLocaleTimeString()}] ${line}`]
}

function closeSocket(ws: WebSocket | null): void {
  if (!ws) return
  try {
    ws.close()
  } catch {
    // ignore
  }
}

function connectMatchmaking(): void {
  closeSocket(matchmakingSocket)
  closeSocket(gameSocket)
  matchmakingSocket = null
  gameSocket = null

  phase.value = 'queueing'
  matchId.value = null
  token.value = null
  you.value = ''
  opponent.value = ''

  const wsUrl = buildWsUrl('/ws/matchmaking', { name: name.value })
  log(`Connecting matchmaking: ${wsUrl}`)

  const ws = new WebSocket(wsUrl)
  matchmakingSocket = ws

  ws.onopen = () => {
    log('Matchmaking connected')
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string) as ServerMessage

    if (msg.type === 'status') {
      log(`Status: ${msg.status} (${msg.detail})`)
      phase.value = 'queueing'
      return
    }

    if (msg.type === 'match_found') {
      log(`Match found: ${msg.match_id}`)
      matchId.value = msg.match_id
      token.value = msg.player_token
      phase.value = 'matched'

      ws.close()
      connectGame()
      return
    }

    if (msg.type === 'error') {
      log(`Error: ${msg.message}`)
      return
    }

    log(`Unhandled matchmaking message: ${msg.type}`)
  }

  ws.onclose = () => {
    log('Matchmaking disconnected')
    if (phase.value === 'queueing') {
      phase.value = 'disconnected'
    }
  }

  ws.onerror = () => {
    log('Matchmaking socket error')
  }
}

function connectGame(): void {
  if (!matchId.value || !token.value) {
    log('Cannot connect game: missing match/token')
    return
  }

  const wsUrl = buildWsUrl(`/ws/game/${matchId.value}`, { token: token.value })
  log(`Connecting game: ${wsUrl}`)

  const ws = new WebSocket(wsUrl)
  gameSocket = ws

  ws.onopen = () => {
    log('Game connected')
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string) as ServerMessage

    if (msg.type === 'game_ready') {
      you.value = msg.you
      opponent.value = msg.opponent
      phase.value = 'ready'
      log(`Ready: you=${msg.you}, opponent=${msg.opponent}`)
      return
    }

    if (msg.type === 'pinged') {
      log('Got pinged by opponent')
      return
    }

    if (msg.type === 'opponent_disconnected') {
      log('Opponent disconnected')
      phase.value = 'disconnected'
      return
    }

    if (msg.type === 'error') {
      log(`Error: ${msg.message}`)
      return
    }

    log(`Unhandled game message: ${msg.type}`)
  }

  ws.onclose = () => {
    log('Game disconnected')
    if (phase.value === 'ready' || phase.value === 'matched') {
      phase.value = 'disconnected'
    }
  }

  ws.onerror = () => {
    log('Game socket error')
  }
}

function sendPing(): void {
  if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) {
    log('Cannot ping: game socket not open')
    return
  }

  const msg: ClientMessage = { type: 'ping' }
  gameSocket.send(JSON.stringify(msg))
  log('Sent ping')
}

onMounted(() => {
  connectMatchmaking()
})

onBeforeUnmount(() => {
  closeSocket(matchmakingSocket)
  closeSocket(gameSocket)
})
</script>

<template>
  <div class="page">
    <h1>ZoneControl Web POC</h1>

    <div class="row">
      <label>
        Name
        <input v-model="name" class="input" />
      </label>

      <button class="btn" @click="connectMatchmaking">Find Match</button>
      <button class="btn" :disabled="phase !== 'ready'" @click="sendPing">Ping Opponent</button>
    </div>

    <div class="card">
      <div><strong>Phase:</strong> {{ phase }}</div>
      <div><strong>Match:</strong> {{ matchId ?? '-' }}</div>
      <div><strong>You:</strong> {{ you || '-' }}</div>
      <div><strong>Opponent:</strong> {{ opponent || '-' }}</div>

      <div class="hint">
        Override backend: add <code>?wsBase=ws://127.0.0.1:8000</code> (or <code>wss://...</code>).
      </div>
    </div>

    <div class="card">
      <div class="log">
        <div v-for="(line, i) in logLines" :key="i" class="log-line">{{ line }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.row {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
  margin: 12px 0 20px;
}

.input {
  display: block;
  width: 240px;
  padding: 8px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 6px;
}

.btn {
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card {
  border: 1px solid #e2e2e2;
  border-radius: 10px;
  padding: 12px;
  margin: 12px 0;
}

.hint {
  margin-top: 10px;
  color: #666;
}

.log {
  height: 260px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
}

.log-line {
  padding: 2px 0;
}
</style>
