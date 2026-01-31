<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, nextTick, ref, watch, inject } from 'vue'
import { matchmakingKey } from '../injection-keys'

const gameStore = useGameStore()

// Get elemental data for badge display
const playerElementalData = computed(() => {
  if (!gameStore.selectedElemental || !gameStore.gameData) return null
  return gameStore.gameData.elementals.find(e => e.id === gameStore.selectedElemental)
})

const opponentElementalData = computed(() => {
  if (!gameStore.opponentElemental || !gameStore.gameData) return null
  return gameStore.gameData.elementals.find(e => e.id === gameStore.opponentElemental)
})
const _matchmaking = inject(matchmakingKey)

if (!_matchmaking) {
  throw new Error('Matchmaking context not provided. Ensure App.vue provides matchmakingKey.')
}

const matchmaking = _matchmaking

const logContainer = ref<HTMLElement | null>(null)

watch(() => gameStore.logEntries.length, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

const phaseDisplay = computed(() => {
  const map: Record<typeof gameStore.phase, { label: string; variant: string }> = {
    'menu': { label: 'MENU', variant: 'idle' },
    'elemental-select': { label: 'SELECT', variant: 'idle' },
    'matchmaking': { label: 'QUEUEING', variant: 'queueing' },
    'vs-screen': { label: 'MATCHED', variant: 'matched' },
    'in-game': { label: 'PLAYING', variant: 'ready' },
    'disconnected': { label: 'DISCONNECTED', variant: 'disconnected' },
  }
  return map[gameStore.phase]
})

const canPing = computed(() => gameStore.phase === 'in-game')

function handlePing(): void {
  matchmaking.sendPing()
}
</script>

<template>
  <aside class="session-sidebar">
    <div class="section">
      <div class="section-header">
        <span class="section-title">// SESSION</span>
        <span
          class="status-pill"
          :class="`status-${phaseDisplay.variant}`"
        >
          {{ phaseDisplay.label }}
        </span>
      </div>

      <div class="session-details">
        <div class="detail-row">
          <span class="label">PLAYER NAME</span>
          <input
            v-model="gameStore.playerName"
            class="player-name-input"
            :disabled="gameStore.phase !== 'menu' && gameStore.phase !== 'elemental-select'"
          >
        </div>

        <div class="detail-row">
          <span class="label">MATCH ID</span>
          <span class="value">{{ gameStore.matchId || '---' }}</span>
        </div>

        <div class="detail-row">
          <span class="label">YOU</span>
          <div class="elemental-badge" v-if="playerElementalData">
            <div
              class="badge-icon-box"
              :style="{ backgroundColor: playerElementalData.color }"
            >
              <img
                class="badge-icon"
                :src="playerElementalData.display_data.icon_url"
                :alt="playerElementalData.name"
              />
            </div>
            <span class="badge-label">{{ gameStore.playerName }}</span>
          </div>
          <span v-else class="value">---</span>
        </div>

        <div class="detail-row">
          <span class="label">OPPONENT</span>
          <div class="elemental-badge" v-if="opponentElementalData">
            <div
              class="badge-icon-box"
              :style="{ backgroundColor: opponentElementalData.color }"
            >
              <img
                class="badge-icon"
                :src="opponentElementalData.display_data.icon_url"
                :alt="opponentElementalData.name"
              />
            </div>
            <span class="badge-label">{{ gameStore.opponentName || opponentElementalData.name }}</span>
          </div>
          <span v-else class="value">{{ gameStore.opponentName || '---' }}</span>
        </div>
      </div>
    </div>

    <div class="section section-debug">
      <div class="section-header">
        <span class="section-title">// DEBUG ACTIONS</span>
      </div>

      <div class="debug-actions">
        <button
          class="btn-debug"
          :disabled="!canPing"
          @click="handlePing"
        >
          Ping Opponent
        </button>
      </div>
    </div>

    <div class="section section-log">
      <div class="section-header">
        <span class="section-title">// EVENT LOG</span>
        <span class="entry-count">{{ gameStore.logEntries.length }} entries</span>
      </div>

      <div ref="logContainer" class="log-container">
        <div
          v-for="(entry, index) in gameStore.logEntries"
          :key="index"
          class="log-entry"
          :class="`log-${entry.level}`"
        >
          <span class="log-time">{{ entry.time }}</span>
          <span class="log-text">{{ entry.text }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.session-sidebar {
  width: 400px;
  height: 100vh;
  background: var(--palette-background-default);
  border-right: 1px solid var(--palette-divider);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-bottom: 1px solid var(--palette-background-muted);
}

.section-log {
  flex: 1;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--palette-error-main);
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.status-pill {
  padding: 4px 12px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: 12px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.status-idle {
  background: var(--palette-background-muted);
  color: var(--palette-text-secondary);
}

.status-queueing {
  background: rgba(88, 166, 255, 0.15);
  color: var(--palette-primary-main);
}

.status-matched {
  background: rgba(63, 185, 80, 0.15);
  color: var(--palette-success-main);
}

.status-ready {
  background: rgba(163, 113, 247, 0.15);
  color: var(--palette-info-main);
}

.status-disconnected {
  background: rgba(248, 81, 73, 0.15);
  color: var(--palette-error-main);
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--palette-text-disabled);
  text-transform: uppercase;
}

.value {
  font-size: 14px;
  color: var(--palette-text-primary);
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.player-name-input {
  padding: 8px 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  color: var(--palette-text-primary);
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
}

.player-name-input:focus {
  border-color: var(--palette-primary-main);
}

.player-name-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.elemental-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-icon-box {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.badge-label {
  font-size: 14px;
  color: var(--palette-text-primary);
}

.section-debug {
  padding: 16px 20px;
}

.debug-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-debug {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--palette-text-primary);
  background: var(--palette-background-muted);
  border: 1px solid var(--palette-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-debug:hover:not(:disabled) {
  background: var(--palette-divider);
  border-color: var(--palette-primary-main);
}

.btn-debug:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.entry-count {
  font-size: 11px;
  color: var(--palette-text-disabled);
}

.log-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.5;
}

.log-time {
  color: var(--palette-text-disabled);
  flex-shrink: 0;
}

.log-text {
  color: var(--palette-text-secondary);
}

.log-entry.log-success .log-text {
  color: var(--palette-success-main);
}

.log-entry.log-warn .log-text {
  color: var(--palette-warning-main);
}

.log-entry.log-error .log-text {
  color: var(--palette-error-main);
}

.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: var(--palette-background-paper);
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--palette-divider);
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: var(--palette-text-disabled);
}
</style>
