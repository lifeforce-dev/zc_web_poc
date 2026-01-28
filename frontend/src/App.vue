<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue'
import type { ClientMessage, ServerMessage } from './ws'
import { buildWsUrl } from './ws'

type Phase = 'idle' | 'queueing' | 'matched' | 'ready' | 'disconnected'
type LogLevel = 'info' | 'success' | 'warn' | 'error'

interface LogEntry {
  time: string
  text: string
  level: LogLevel
}

const name = ref(`Player-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`)

const phase = ref<Phase>('idle')
const matchId = ref<string | null>(null)
const token = ref<string | null>(null)

const you = ref<string>('')
const opponent = ref<string>('')

const logEntries = ref<LogEntry[]>([])
const logContainer = ref<HTMLElement | null>(null)

let matchmakingSocket: WebSocket | null = null
let gameSocket: WebSocket | null = null

const phaseDisplay = computed(() => {
  const map: Record<Phase, { label: string; class: string }> = {
    idle: { label: 'IDLE', class: 'status-idle' },
    queueing: { label: 'QUEUEING', class: 'status-queueing' },
    matched: { label: 'MATCHED', class: 'status-matched' },
    ready: { label: 'READY', class: 'status-ready' },
    disconnected: { label: 'DISCONNECTED', class: 'status-disconnected' },
  }
  return map[phase.value]
})

function log(text: string, level: LogLevel = 'info'): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  logEntries.value = [...logEntries.value, { time, text, level }]
}

watch(logEntries, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

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
  log(`Connecting: ${wsUrl}`, 'info')

  const ws = new WebSocket(wsUrl)
  matchmakingSocket = ws

  ws.onopen = () => {
    log('Matchmaking socket opened', 'success')
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string) as ServerMessage

    if (msg.type === 'status') {
      log(`Status: ${msg.status} - ${msg.detail}`, 'info')
      phase.value = 'queueing'
      return
    }

    if (msg.type === 'match_found') {
      log(`Match found: ${msg.match_id}`, 'success')
      matchId.value = msg.match_id
      token.value = msg.player_token
      phase.value = 'matched'

      ws.close()
      connectGame()
      return
    }

    if (msg.type === 'error') {
      log(`Server error: ${msg.message}`, 'error')
      return
    }

    log(`Unknown message: ${msg.type}`, 'warn')
  }

  ws.onclose = () => {
    log('Matchmaking disconnected', 'warn')
    if (phase.value === 'queueing') {
      phase.value = 'disconnected'
    }
  }

  ws.onerror = () => {
    log('Matchmaking socket error', 'error')
  }
}

function connectGame(): void {
  if (!matchId.value || !token.value) {
    log('Cannot connect game: missing match/token', 'error')
    return
  }

  const wsUrl = buildWsUrl(`/ws/game/${matchId.value}`, { token: token.value })
  log(`Connecting game: ${wsUrl}`, 'info')

  const ws = new WebSocket(wsUrl)
  gameSocket = ws

  ws.onopen = () => {
    log('Game socket opened', 'success')
  }

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string) as ServerMessage

    if (msg.type === 'game_ready') {
      you.value = msg.you
      opponent.value = msg.opponent
      phase.value = 'ready'
      log(`Game ready: you=${msg.you}, opponent=${msg.opponent}`, 'success')
      return
    }

    if (msg.type === 'pinged') {
      log('Received ping from opponent', 'info')
      return
    }

    if (msg.type === 'opponent_disconnected') {
      log('Opponent disconnected', 'warn')
      phase.value = 'disconnected'
      return
    }

    if (msg.type === 'error') {
      log(`Server error: ${msg.message}`, 'error')
      return
    }

    log(`Unknown message: ${msg.type}`, 'warn')
  }

  ws.onclose = () => {
    log('Game socket closed', 'warn')
    if (phase.value === 'ready' || phase.value === 'matched') {
      phase.value = 'disconnected'
    }
  }

  ws.onerror = () => {
    log('Game socket error', 'error')
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

onMounted(() => {
  connectMatchmaking()
})

onBeforeUnmount(() => {
  closeSocket(matchmakingSocket)
  closeSocket(gameSocket)
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-title">
        <span class="logo">ZC</span>
        <h1>ZONECONTROL</h1>
        <span class="version">WEB POC v0.1</span>
      </div>
    </header>

    <main class="main">
      <section class="panel session-panel">
        <div class="panel-header">
          <span class="panel-title">// SESSION</span>
          <span :class="['status-pill', phaseDisplay.class]">{{ phaseDisplay.label }}</span>
        </div>

        <div class="session-grid">
          <div class="field">
            <label class="field-label">PLAYER NAME</label>
            <input v-model="name" class="field-input" spellcheck="false" />
          </div>

          <div class="field">
            <label class="field-label">MATCH ID</label>
            <div class="field-value mono">{{ matchId ?? '---' }}</div>
          </div>

          <div class="field">
            <label class="field-label">YOU</label>
            <div class="field-value">{{ you || '---' }}</div>
          </div>

          <div class="field">
            <label class="field-label">OPPONENT</label>
            <div class="field-value">{{ opponent || '---' }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" @click="connectMatchmaking">
            <span class="btn-icon">&#9654;</span> Find Match
          </button>
          <button class="btn btn-secondary" :disabled="phase !== 'ready'" @click="sendPing">
            <span class="btn-icon">&#8644;</span> Ping Opponent
          </button>
        </div>
      </section>

      <section class="panel log-panel">
        <div class="panel-header">
          <span class="panel-title">// EVENT LOG</span>
          <span class="log-count">{{ logEntries.length }} entries</span>
        </div>

        <div ref="logContainer" class="log-container">
          <div v-for="(entry, i) in logEntries" :key="i" :class="['log-entry', `log-${entry.level}`]">
            <span class="log-time">{{ entry.time }}</span>
            <span class="log-text">{{ entry.text }}</span>
          </div>
          <div v-if="logEntries.length === 0" class="log-empty">No events yet</div>
        </div>
      </section>

      <footer class="footer">
        <span class="hint">TIP: Add <code>?wsBase=ws://127.0.0.1:8000</code> for local backend</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.app {
  min-height: 100vh;
  background: linear-gradient(180deg, #0d1117 0%, #161b22 100%);
  color: #c9d1d9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.header {
  background: #010409;
  border-bottom: 1px solid #21262d;
  padding: 16px 24px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1000px;
  margin: 0 auto;
}

.logo {
  background: linear-gradient(135deg, #7ee787 0%, #56d364 100%);
  color: #0d1117;
  font-weight: 800;
  font-size: 14px;
  padding: 6px 10px;
  border-radius: 6px;
  letter-spacing: 1px;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  margin: 0;
  color: #f0f6fc;
}

.version {
  font-size: 11px;
  color: #484f58;
  font-weight: 500;
  letter-spacing: 1px;
  padding: 4px 8px;
  background: #21262d;
  border-radius: 4px;
}

.main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #8b949e;
}

.status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.status-idle {
  background: #21262d;
  color: #8b949e;
}

.status-queueing {
  background: #1f2937;
  color: #60a5fa;
  animation: pulse 2s infinite;
}

.status-matched {
  background: #1c2a1c;
  color: #7ee787;
}

.status-ready {
  background: #1c2a1c;
  color: #7ee787;
  box-shadow: 0 0 8px rgba(126, 231, 135, 0.3);
}

.status-disconnected {
  background: #2d1f1f;
  color: #f85149;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #8b949e;
  text-transform: uppercase;
}

.field-input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  color: #f0f6fc;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.field-value {
  font-size: 14px;
  color: #f0f6fc;
  padding: 10px 0;
}

.field-value.mono {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  color: #7ee787;
}

.actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #21262d;
  background: #0d1117;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-icon {
  font-size: 11px;
}

.btn-primary {
  background: linear-gradient(180deg, #238636 0%, #2ea043 100%);
  color: #fff;
  border-color: rgba(240, 246, 252, 0.1);
}

.btn-primary:hover {
  background: linear-gradient(180deg, #2ea043 0%, #3fb950 100%);
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border-color: #30363d;
}

.btn-secondary:hover:not(:disabled) {
  background: #30363d;
  border-color: #8b949e;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.log-count {
  font-size: 11px;
  color: #484f58;
}

.log-container {
  height: 280px;
  overflow-y: auto;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.log-entry:hover {
  background: #21262d;
}

.log-time {
  color: #484f58;
  flex-shrink: 0;
}

.log-text {
  word-break: break-word;
}

.log-info .log-text {
  color: #8b949e;
}

.log-success .log-text {
  color: #7ee787;
}

.log-warn .log-text {
  color: #d29922;
}

.log-error .log-text {
  color: #f85149;
}

.log-empty {
  color: #484f58;
  text-align: center;
  padding: 40px 0;
}

.footer {
  text-align: center;
  padding: 8px;
}

.hint {
  font-size: 12px;
  color: #484f58;
}

.hint code {
  background: #21262d;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  color: #8b949e;
}

/* Scrollbar styling */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #0d1117;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
